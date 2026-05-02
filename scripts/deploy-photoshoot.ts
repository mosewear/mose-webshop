/**
 * Deploy MOSE photoshoot 2026 to Supabase Storage + /public.
 *
 * - Resizes each source JPG into web-optimised WebP (desktop + mobile + optional og)
 * - Uploads each variant to the right bucket / path (idempotent: upsert)
 * - Writes scripts/photoshoot-urls.json so the DB-update step can reuse the URLs
 * - Optionally writes the static-public fallbacks (/public/og-default.jpg etc.)
 *
 * Run with:  npx tsx scripts/deploy-photoshoot.ts
 *
 * Reads from photoshoot-2026/*.jpg (renamed source files).
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ROOT = path.resolve(__dirname, '..')
const PHOTOSHOOT_DIR = path.join(ROOT, 'photoshoot-2026')
const PUBLIC_DIR = path.join(ROOT, 'public')

type VariantId = 'desktop' | 'mobile' | 'og' | 'square'

const VARIANTS: Record<
  VariantId,
  { width: number; height?: number; format: 'webp' | 'jpeg'; quality: number; fit?: 'cover' | 'inside'; suffix: string }
> = {
  desktop: { width: 2400, format: 'webp', quality: 82, fit: 'inside', suffix: 'desktop' },
  mobile: { width: 1200, format: 'webp', quality: 80, fit: 'inside', suffix: 'mobile' },
  // OG (Twitter / Facebook): hard 1200x630 cover. JPG for maximum compatibility.
  og: { width: 1200, height: 630, format: 'jpeg', quality: 85, fit: 'cover', suffix: 'og' },
  // Square (1:1) for OG fallback / icon-style usage. JPG for compat.
  square: { width: 1200, height: 1200, format: 'jpeg', quality: 85, fit: 'cover', suffix: 'square' },
}

interface Asset {
  /** Source filename inside photoshoot-2026/ (renamed source) */
  source: string
  /** Bucket to upload to (`images` or `product-images`) */
  bucket: 'images' | 'product-images'
  /** Storage path WITHOUT extension; variant suffix and ext are appended */
  storageKey: string
  /** Variants to generate */
  variants: VariantId[]
  /** Tag for the URL map (key in photoshoot-urls.json) */
  tag: string
}

const ASSETS: Asset[] = [
  // ---------------- Homepage ----------------
  {
    tag: 'homepage.hero.desktop',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/homepage/hero-desktop',
    variants: ['desktop'],
  },
  {
    tag: 'homepage.hero.mobile',
    source: 'hero_hoodie_olive-front-trio_graffiti-formation_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/homepage/hero-mobile',
    variants: ['mobile', 'desktop'],
  },
  {
    tag: 'homepage.story',
    source: 'couple_sweater-white-hoodie-black_steps-hug_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/homepage/story',
    variants: ['desktop', 'mobile'],
  },
  // ---------------- Categories ----------------
  {
    tag: 'category.hoodies',
    source: 'crop_hoodies_trio-brown-black-olive_graffiti_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/categories/hoodies',
    variants: ['desktop'],
  },
  {
    tag: 'category.sweaters',
    source: 'group_sweater_quartet-white-black_facade-poised_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/categories/sweaters',
    variants: ['desktop'],
  },
  {
    tag: 'category.tees',
    source: 'lifestyle_tee_sand_canal-street-smile_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/categories/tees',
    variants: ['desktop'],
  },
  // ---------------- Lookbook ----------------
  {
    tag: 'lookbook.01.city',
    source: 'hero_hoodie_olive-front-trio_graffiti-formation_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/01-city',
    variants: ['desktop'],
  },
  {
    tag: 'lookbook.02.spring',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/02-spring',
    variants: ['desktop'],
  },
  {
    tag: 'lookbook.03.stone',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/03-stone',
    variants: ['desktop'],
  },
  {
    tag: 'lookbook.03.closing',
    source: 'couple_sweater-white-hoodie-black_steps-hug_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/03-closing',
    variants: ['desktop'],
  },
  // ---------------- About / Over MOSE ----------------
  {
    tag: 'about.hero',
    source: 'couple_sweater-white-hoodie-black_steps-walk_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/about/hero',
    variants: ['desktop', 'mobile'],
  },
  {
    tag: 'about.story',
    source: 'couple_sweater-white-hoodie-black_steps-lean_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/about/story',
    variants: ['desktop'],
  },
  {
    tag: 'about.groningen',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/about/groningen',
    variants: ['desktop'],
  },
  // ---------------- OG / static fallbacks ----------------
  // The OG variant is also written to /public/og-default.jpg below.
  {
    tag: 'og.default',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/og/default',
    variants: ['og', 'desktop'],
  },
  // ---------------- Product: MOSE Essential Hoodie ----------------
  // We DON'T overwrite individual existing product images — we ADD photoshoot images
  // to product_images via DB updates in a follow-up script. Files land in product-images.
  {
    tag: 'product.hoodie.bruin.hero',
    source: 'hero_hoodie_brown_graffiti-pole_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.bruin.detail',
    source: 'detail_hoodie_brown_drape-pose_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/detail',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.zwart.hero',
    source: 'hero_hoodie_black_brick-graffiti_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/hero',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.groen.hero',
    source: 'hero_hoodie_olive_graffiti-laugh_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/hero',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.groen.detail',
    source: 'detail_hoodie_olive_chest-puff-logo_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/detail',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.lifestyle.pair',
    source: 'lifestyle_hoodies_brown-olive_graffiti-laugh_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/lifestyle-pair',
    variants: ['desktop'],
  },
  {
    tag: 'product.hoodie.lineup',
    source: 'crop_hoodies_trio-brown-black-olive_graffiti_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/lineup',
    variants: ['desktop'],
  },
  // ---------------- Product: MOSE Classic Sweater ----------------
  {
    tag: 'product.sweater.offwhite.hero',
    source: 'hero_sweater_cream_facade-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/hero',
    variants: ['desktop'],
  },
  {
    tag: 'product.sweater.quartet',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/quartet',
    variants: ['desktop'],
  },
  {
    tag: 'product.sweater.couple-walk',
    source: 'couple_sweater-white-hoodie-black_steps-walk_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/couple-walk',
    variants: ['desktop'],
  },
  // ---------------- Product: MOSE Tee ----------------
  {
    tag: 'product.tee.zwart.hero',
    source: 'hero_tee_black_canal-spring_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/zwart/hero',
    variants: ['desktop'],
  },
  {
    tag: 'product.tee.wit.editorial',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/editorial',
    variants: ['desktop'],
  },
  {
    tag: 'product.tee.wit.detail',
    source: 'detail_tee_white_chest-puff-logo_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/detail',
    variants: ['desktop'],
  },
  {
    tag: 'product.tee.beige.lifestyle',
    source: 'lifestyle_tee_sand_canal-street-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/beige/lifestyle',
    variants: ['desktop'],
  },
  {
    tag: 'product.tee.beige.detail',
    source: 'detail_tee_sand_chest-logo_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/beige/detail',
    variants: ['desktop'],
  },
  // ---------------- Batch 2 (mei 2026) — extra editorial + variant shots ---
  // Dit blok werd toegevoegd nadat een tweede dropdown van 24 foto's binnen
  // kwam. De source filenames zitten ook in `photoshoot-2026/`. Storage paths
  // wijken iets af van batch 1 (suffix in de key) zodat we niet over de
  // bestaande hero/detail-bestanden heen schrijven.
  // Hoodie · Bruin
  { tag: 'product.hoodie.bruin.hero-hood-up-smile', source: 'hero_hoodie_brown_graffiti-hood-up-smile_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/bruin/hero-hood-up-smile', variants: ['desktop'] },
  { tag: 'product.hoodie.bruin.hero-concrete', source: 'hero_hoodie_brown_concrete-hood-up_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/bruin/hero-concrete', variants: ['desktop'] },
  { tag: 'product.hoodie.bruin.hero-pink-hood-pull', source: 'hero_hoodie_brown_graffiti-pink-hood-pull_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/bruin/hero-pink-hood-pull', variants: ['desktop'] },
  { tag: 'product.hoodie.bruin.lifestyle-pink-hood', source: 'lifestyle_hoodie_brown_graffiti-pink-hood-look_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/bruin/lifestyle-pink-hood', variants: ['desktop'] },
  // Hoodie · Zwart
  { tag: 'product.hoodie.zwart.lifestyle-brick-sleeve', source: 'lifestyle_hoodie_black_brick-graffiti-sleeve_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/zwart/lifestyle-brick-sleeve', variants: ['desktop'] },
  // Hoodie · Groen (Olive)
  { tag: 'product.hoodie.groen.hero-lean-smile', source: 'hero_hoodie_olive_graffiti-lean-smile_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/groen/hero-lean-smile', variants: ['desktop'] },
  { tag: 'product.hoodie.groen.hero-arms-cross', source: 'hero_hoodie_olive_graffiti-arms-cross_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/groen/hero-arms-cross', variants: ['desktop'] },
  { tag: 'product.hoodie.groen.lifestyle-sleeve-look', source: 'lifestyle_hoodie_olive_graffiti-sleeve-look_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/groen/lifestyle-sleeve-look', variants: ['desktop'] },
  { tag: 'product.hoodie.groen.crop-hood-up', source: 'crop_hoodie_olive_graffiti-hood-up_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/groen/crop-hood-up', variants: ['desktop'] },
  // Hoodie · multi
  { tag: 'product.hoodie.multi.couple-grass', source: 'couple_hoodies_black-olive_graffiti-walk-grass_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/multi/couple-grass', variants: ['desktop'] },
  { tag: 'product.hoodie.multi.duo-pink-walk', source: 'lifestyle_hoodies_brown-olive_graffiti-pink-walk_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/multi/duo-pink-walk', variants: ['desktop'] },
  { tag: 'product.hoodie.multi.duo-walk-forward', source: 'lifestyle_hoodies_brown-olive_graffiti-walk-forward_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/multi/duo-walk-forward', variants: ['desktop'] },
  { tag: 'product.hoodie.multi.duo-laughing-arm-rest', source: 'group_hoodies_black-olive_graffiti-laughing-arm-rest_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/multi/duo-laughing-arm-rest', variants: ['desktop'] },
  { tag: 'product.hoodie.multi.trio-smile-line', source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/hoodie/multi/trio-smile-line', variants: ['desktop'] },
  // Sweater · Off White
  { tag: 'product.sweater.offwhite.hero-arch-lean', source: 'hero_sweater_cream_facade-arch-lean_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/sweater/off-white/hero-arch-lean', variants: ['desktop'] },
  { tag: 'product.sweater.offwhite.lifestyle-arch-smile', source: 'lifestyle_sweater_cream_facade-arch-smile_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/sweater/off-white/lifestyle-arch-smile', variants: ['desktop'] },
  { tag: 'product.sweater.offwhite.detail-puff-logo', source: 'detail_sweater_cream_chest-puff-logo_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/sweater/off-white/detail-puff-logo', variants: ['desktop'] },
  // Sweater · Zwart
  { tag: 'product.sweater.zwart.detail-chest-hand', source: 'detail_sweater_black_chest-logo-hand_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/sweater/zwart/detail-chest-hand', variants: ['desktop'] },
  // Tee · Wit
  { tag: 'product.tee.wit.lifestyle-canal-sleeve', source: 'lifestyle_tee_white_canal-sleeve-roll_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/wit/lifestyle-canal-sleeve', variants: ['desktop'] },
  { tag: 'product.tee.wit.detail-chest-arms', source: 'detail_tee_white_chest-logo-arms_landscape.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/wit/detail-chest-arms', variants: ['desktop'] },
  // Tee · Zwart
  { tag: 'product.tee.zwart.lifestyle-canal-pockets', source: 'lifestyle_tee_black_canal-pockets_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/zwart/lifestyle-canal-pockets', variants: ['desktop'] },
  { tag: 'product.tee.zwart.detail-chest', source: 'detail_tee_black_chest-logo-pockets_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/zwart/detail-chest', variants: ['desktop'] },
  // Tee · Groen (eerste shots ooit voor deze variant)
  { tag: 'product.tee.groen.hero-canal-pose', source: 'hero_tee_olive_canal-pose_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/groen/hero-canal-pose', variants: ['desktop'] },
  { tag: 'product.tee.groen.lifestyle-back-walk', source: 'lifestyle_tee_olive_canal-back-walk_portrait.jpg', bucket: 'product-images', storageKey: 'photoshoot-2026/tee/groen/lifestyle-back-walk', variants: ['desktop'] },
]

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

interface UrlMap {
  [tag: string]: { [variant in VariantId]?: string }
}

async function processVariant(
  inputBuffer: Buffer,
  variant: VariantId,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const v = VARIANTS[variant]
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate() // honour EXIF orientation

  if (v.height) {
    pipeline = pipeline.resize({ width: v.width, height: v.height, fit: v.fit ?? 'cover', position: 'attention' })
  } else {
    pipeline = pipeline.resize({ width: v.width, withoutEnlargement: true })
  }

  if (v.format === 'webp') {
    pipeline = pipeline.webp({ quality: v.quality, effort: 5 })
    return { buffer: await pipeline.toBuffer(), contentType: 'image/webp', ext: 'webp' }
  }
  pipeline = pipeline.jpeg({ quality: v.quality, mozjpeg: true })
  return { buffer: await pipeline.toBuffer(), contentType: 'image/jpeg', ext: 'jpg' }
}

function publicUrl(bucket: string, key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`
}

async function uploadAsset(asset: Asset): Promise<UrlMap[string]> {
  const sourcePath = path.join(PHOTOSHOOT_DIR, asset.source)
  const inputBuffer = await fs.readFile(sourcePath)
  const result: UrlMap[string] = {}

  for (const variant of asset.variants) {
    const { buffer, contentType, ext } = await processVariant(inputBuffer, variant)
    const key = `${asset.storageKey}-${VARIANTS[variant].suffix}.${ext}`
    const sizeKb = (buffer.length / 1024).toFixed(0)
    process.stdout.write(`  · ${variant.padEnd(7)} → ${asset.bucket}/${key} (${sizeKb} KB) ... `)

    const { error } = await supabase.storage.from(asset.bucket).upload(key, buffer, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) {
      console.log('FAIL')
      throw new Error(`upload ${asset.tag}/${variant}: ${error.message}`)
    }
    console.log('ok')
    result[variant] = publicUrl(asset.bucket, key)
  }

  return result
}

async function writeStaticPublic(urlMap: UrlMap): Promise<void> {
  // Only the OG default needs to live on /public/ for guaranteed SEO crawler access.
  // Everything else stays on Supabase Storage.
  const ogSourceTag = 'og.default'
  const buf = await fs.readFile(
    path.join(PHOTOSHOOT_DIR, 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg'),
  )
  const og = await processVariant(buf, 'og')
  const target = path.join(PUBLIC_DIR, 'og-default.jpg')
  await fs.writeFile(target, og.buffer)
  const sizeKb = (og.buffer.length / 1024).toFixed(0)
  console.log(`  · /public/og-default.jpg (${sizeKb} KB)`)

  // Static homepage hero fallback (used as SSR placeholder when DB is unreachable)
  const heroBuf = await fs.readFile(
    path.join(PHOTOSHOOT_DIR, 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg'),
  )
  const heroDesktop = await processVariant(heroBuf, 'desktop')
  await fs.writeFile(path.join(PUBLIC_DIR, 'hero-desktop.webp'), heroDesktop.buffer)
  console.log(`  · /public/hero-desktop.webp (${(heroDesktop.buffer.length / 1024).toFixed(0)} KB)`)

  const heroMobileBuf = await fs.readFile(
    path.join(PHOTOSHOOT_DIR, 'hero_hoodie_olive-front-trio_graffiti-formation_portrait.jpg'),
  )
  const heroMobile = await processVariant(heroMobileBuf, 'mobile')
  await fs.writeFile(path.join(PUBLIC_DIR, 'hero-mobile.webp'), heroMobile.buffer)
  console.log(`  · /public/hero-mobile.webp (${(heroMobile.buffer.length / 1024).toFixed(0)} KB)`)

  void urlMap
}

async function main() {
  console.log(`Deploying ${ASSETS.length} assets …\n`)
  const urlMap: UrlMap = {}
  for (const asset of ASSETS) {
    console.log(`▶ ${asset.tag}  (${asset.source})`)
    urlMap[asset.tag] = await uploadAsset(asset)
  }
  console.log('\nWriting /public fallbacks …')
  await writeStaticPublic(urlMap)

  const outputJson = path.join(__dirname, 'photoshoot-urls.json')
  await fs.writeFile(outputJson, JSON.stringify(urlMap, null, 2))
  console.log(`\n✓ Wrote ${outputJson}`)
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\n✗ deploy-photoshoot failed:', err)
  process.exit(1)
})
