/**
 * Deploy MOSE photoshoot 2026 — BATCH 2.
 *
 * One-off, idempotent script for the second drop of editorial / variant
 * photography (24 new sources next to the existing 20 in
 * `photoshoot-2026/`). Walks each new source, resizes to a single web-
 * optimised WebP `desktop` variant, uploads to Supabase Storage in the
 * `product-images` bucket under a structured path, then ADDS (does NOT
 * replace) `product_images` rows linked to the right product + color
 * variant.
 *
 * Why a separate script and not extending `apply-photoshoot-content.ts`:
 *   * The existing `reseedProductImages` step there is destructive — it
 *     deletes ALL non-video product_images rows for the three apparel
 *     SKUs before re-inserting. Running it now would wipe perfectly
 *     valid live rows. This batch script is purely additive and only
 *     skips rows that are already present (matched by URL).
 *
 * Run with:  npx tsx scripts/deploy-photoshoot-batch2.ts
 *
 * Re-runs are safe: storage uploads use upsert and the DB inserts are
 * guarded by an existing-URL check.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ROOT = path.resolve(__dirname, '..')
const PHOTOSHOOT_DIR = path.join(ROOT, 'photoshoot-2026')
const BUCKET = 'product-images'

interface BatchAsset {
  /** Source filename inside photoshoot-2026/. */
  source: string
  /** Storage path WITHOUT extension; `-desktop.webp` is appended. */
  storageKey: string
  /** Slug of the product the new image belongs to. */
  productSlug: 'mose-essential-hoodie' | 'mose-classic-sweater' | 'mose-tee'
  /** Variant color this image is shown for. `null` = global / multi. */
  color: string | null
  /** Position in the gallery. Pick a value that doesn't clash with the
   *  rows already in product_images (videos sit on fixed positions like
   *  3/5/6/7/9 today, so we slot photos around them). */
  position: number
  /** Whether this becomes the variant's hero / primary image.
   *  Only set true for variants that currently have no primary. */
  isPrimary?: boolean
  /** Localized alt text for accessibility + SEO. */
  alt: string
}

// ---------------------------------------------------------------------------
// Mapping — source filename → storage key + DB row metadata.
//
// Naming-conventie in storage volgt de eerste batch:
//   product-images/photoshoot-2026/<garment>/<color-slug>/<short>-desktop.webp
//   met `<color-slug>` = 'multi' voor groepsfoto's zonder enkele kleur.
// ---------------------------------------------------------------------------

const ASSETS: BatchAsset[] = [
  // ----------------------------------------------------------- Hoodie · BRUIN
  {
    source: 'hero_hoodie_brown_graffiti-hood-up-smile_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-hood-up-smile',
    productSlug: 'mose-essential-hoodie',
    color: 'Bruin',
    position: 2,
    alt: 'MOSE Essential Hoodie Bruin — hood up, lachend voor groene graffiti',
  },
  {
    source: 'hero_hoodie_brown_concrete-hood-up_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-concrete',
    productSlug: 'mose-essential-hoodie',
    color: 'Bruin',
    position: 3,
    alt: 'MOSE Essential Hoodie Bruin — hood up tegen rauwe betonwand',
  },
  {
    source: 'hero_hoodie_brown_graffiti-pink-hood-pull_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-pink-hood-pull',
    productSlug: 'mose-essential-hoodie',
    color: 'Bruin',
    position: 4,
    alt: 'MOSE Essential Hoodie Bruin — hood-up gebaar voor roze graffiti',
  },
  {
    source: 'lifestyle_hoodie_brown_graffiti-pink-hood-look_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/bruin/lifestyle-pink-hood',
    productSlug: 'mose-essential-hoodie',
    color: 'Bruin',
    position: 5,
    alt: 'MOSE Essential Hoodie Bruin — lifestyle, hood-up, blik opzij',
  },
  // ----------------------------------------------------------- Hoodie · ZWART
  {
    source: 'lifestyle_hoodie_black_brick-graffiti-sleeve_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/zwart/lifestyle-brick-sleeve',
    productSlug: 'mose-essential-hoodie',
    color: 'Zwart',
    position: 2,
    alt: 'MOSE Essential Hoodie Zwart — lifestyle, leunend tegen baksteen',
  },
  // ----------------------------------------------------------- Hoodie · GROEN
  {
    source: 'hero_hoodie_olive_graffiti-lean-smile_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/groen/hero-lean-smile',
    productSlug: 'mose-essential-hoodie',
    color: 'Groen',
    position: 2,
    alt: 'MOSE Essential Hoodie Olive Groen — leunend voor graffiti, glimlach',
  },
  {
    source: 'hero_hoodie_olive_graffiti-arms-cross_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/groen/hero-arms-cross',
    productSlug: 'mose-essential-hoodie',
    color: 'Groen',
    position: 3,
    alt: 'MOSE Essential Hoodie Olive Groen — armen gekruist, graffiti achtergrond',
  },
  {
    source: 'lifestyle_hoodie_olive_graffiti-sleeve-look_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/groen/lifestyle-sleeve-look',
    productSlug: 'mose-essential-hoodie',
    color: 'Groen',
    position: 4,
    alt: 'MOSE Essential Hoodie Olive Groen — kijkt naar mouw, hood-up moment',
  },
  {
    source: 'crop_hoodie_olive_graffiti-hood-up_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/groen/crop-hood-up',
    productSlug: 'mose-essential-hoodie',
    color: 'Groen',
    position: 5,
    alt: 'MOSE Essential Hoodie Olive Groen — torso crop met hood-up',
  },
  // ---------------------------------------------- Hoodie · MULTI (geen kleur)
  {
    source: 'couple_hoodies_black-olive_graffiti-walk-grass_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/multi/couple-grass',
    productSlug: 'mose-essential-hoodie',
    color: null,
    position: 11,
    alt: 'MOSE Essential Hoodie — duo Zwart + Olive Groen wandelen door gras',
  },
  {
    source: 'lifestyle_hoodies_brown-olive_graffiti-pink-walk_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-pink-walk',
    productSlug: 'mose-essential-hoodie',
    color: null,
    position: 12,
    alt: 'MOSE Essential Hoodie — duo Bruin + Olive voor roze graffiti',
  },
  {
    source: 'lifestyle_hoodies_brown-olive_graffiti-walk-forward_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-walk-forward',
    productSlug: 'mose-essential-hoodie',
    color: null,
    position: 13,
    alt: 'MOSE Essential Hoodie — duo Bruin + Olive lopen frontaal in beeld',
  },
  {
    source: 'group_hoodies_black-olive_graffiti-laughing-arm-rest_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-laughing-arm-rest',
    productSlug: 'mose-essential-hoodie',
    color: null,
    position: 14,
    alt: 'MOSE Essential Hoodie — duo Zwart + Olive lachend, arm op schouder',
  },
  {
    source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg',
    storageKey: 'photoshoot-2026/hoodie/multi/trio-smile-line',
    productSlug: 'mose-essential-hoodie',
    color: null,
    position: 15,
    alt: 'MOSE Essential Hoodie — trio Bruin / Zwart / Olive, complete colorway',
  },
  // ----------------------------------------------------- Sweater · OFF WHITE
  {
    source: 'hero_sweater_cream_facade-arch-lean_portrait.jpg',
    storageKey: 'photoshoot-2026/sweater/off-white/hero-arch-lean',
    productSlug: 'mose-classic-sweater',
    color: 'Off White',
    position: 3,
    alt: 'MOSE Classic Sweater Off-White — leunend tegen monumentale Groningse boog',
  },
  {
    source: 'lifestyle_sweater_cream_facade-arch-smile_portrait.jpg',
    storageKey: 'photoshoot-2026/sweater/off-white/lifestyle-arch-smile',
    productSlug: 'mose-classic-sweater',
    color: 'Off White',
    position: 4,
    alt: 'MOSE Classic Sweater Off-White — lifestyle voor monumentale gevel',
  },
  {
    source: 'detail_sweater_cream_chest-puff-logo_portrait.jpg',
    storageKey: 'photoshoot-2026/sweater/off-white/detail-puff-logo',
    productSlug: 'mose-classic-sweater',
    color: 'Off White',
    position: 5,
    alt: 'MOSE Classic Sweater Off-White — close-up van het 3D puff-logo',
  },
  // -------------------------------------------------------- Sweater · ZWART
  {
    source: 'detail_sweater_black_chest-logo-hand_portrait.jpg',
    storageKey: 'photoshoot-2026/sweater/zwart/detail-chest-hand',
    productSlug: 'mose-classic-sweater',
    color: 'Zwart',
    position: 1,
    alt: 'MOSE Classic Sweater Zwart — detail met embroidered MOSE chest-logo',
  },
  // ------------------------------------------------------------ Tee · WIT
  {
    source: 'lifestyle_tee_white_canal-sleeve-roll_portrait.jpg',
    storageKey: 'photoshoot-2026/tee/wit/lifestyle-canal-sleeve',
    productSlug: 'mose-tee',
    color: 'Wit',
    position: 2,
    alt: 'MOSE Tee Wit — lifestyle aan de gracht, mouw rollend',
  },
  {
    source: 'detail_tee_white_chest-logo-arms_landscape.jpg',
    storageKey: 'photoshoot-2026/tee/wit/detail-chest-arms',
    productSlug: 'mose-tee',
    color: 'Wit',
    position: 4,
    alt: 'MOSE Tee Wit — detail close-up van chest-logo met onderarm-tattoo',
  },
  // ----------------------------------------------------------- Tee · ZWART
  {
    source: 'lifestyle_tee_black_canal-pockets_portrait.jpg',
    storageKey: 'photoshoot-2026/tee/zwart/lifestyle-canal-pockets',
    productSlug: 'mose-tee',
    color: 'Zwart',
    position: 1,
    alt: 'MOSE Tee Zwart — lifestyle aan de gracht, handen in zakken',
  },
  {
    source: 'detail_tee_black_chest-logo-pockets_portrait.jpg',
    storageKey: 'photoshoot-2026/tee/zwart/detail-chest',
    productSlug: 'mose-tee',
    color: 'Zwart',
    position: 2,
    alt: 'MOSE Tee Zwart — detail close-up van het reliëf MOSE chest-logo',
  },
  // ----------------------------------------------------------- Tee · GROEN
  {
    source: 'hero_tee_olive_canal-pose_portrait.jpg',
    storageKey: 'photoshoot-2026/tee/groen/hero-canal-pose',
    productSlug: 'mose-tee',
    color: 'Groen',
    position: 0,
    isPrimary: true,
    alt: 'MOSE Tee Olive Groen — hero shot aan de gracht in lentezon',
  },
  {
    source: 'lifestyle_tee_olive_canal-back-walk_portrait.jpg',
    storageKey: 'photoshoot-2026/tee/groen/lifestyle-back-walk',
    productSlug: 'mose-tee',
    color: 'Groen',
    position: 1,
    alt: 'MOSE Tee Olive Groen — lifestyle, back-view aan de gracht',
  },
]

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

interface ProcessedVariant {
  buffer: Buffer
  contentType: string
  ext: string
}

async function processDesktopVariant(input: Buffer): Promise<ProcessedVariant> {
  // Same pipeline as the original deploy-photoshoot.ts `desktop` variant:
  // 2400px on the long edge, WebP @ Q82, EXIF-honoured rotation.
  const buffer = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  return { buffer, contentType: 'image/webp', ext: 'webp' }
}

function publicUrl(key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`
}

async function uploadAsset(asset: BatchAsset): Promise<string> {
  const sourcePath = path.join(PHOTOSHOOT_DIR, asset.source)
  const inputBuffer = await fs.readFile(sourcePath)
  const { buffer, contentType, ext } = await processDesktopVariant(inputBuffer)
  const key = `${asset.storageKey}-desktop.${ext}`
  const sizeKb = (buffer.length / 1024).toFixed(0)
  process.stdout.write(`  · upload ${BUCKET}/${key} (${sizeKb} KB) ... `)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: true, cacheControl: '31536000' })
  if (error) {
    console.log('FAIL')
    throw new Error(`upload ${asset.source}: ${error.message}`)
  }
  console.log('ok')
  return publicUrl(key)
}

async function loadProductIdMap(): Promise<Record<string, string>> {
  const slugs = [...new Set(ASSETS.map((a) => a.productSlug))]
  const res = await supabase.from('products').select('id, slug').in('slug', slugs)
  if (res.error || !res.data) {
    throw new Error(`Products lookup failed: ${res.error?.message}`)
  }
  return Object.fromEntries(res.data.map((p) => [p.slug, p.id]))
}

async function ensureProductImageRow(asset: BatchAsset, productId: string, url: string) {
  // Skip if a row with this exact URL already exists (idempotent re-runs).
  const existing = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', productId)
    .eq('url', url)
    .maybeSingle()
  if (existing.error) {
    throw new Error(`Existing-row check ${asset.source}: ${existing.error.message}`)
  }
  if (existing.data) {
    console.log(`  · skip insert (already linked): ${asset.source}`)
    return
  }
  const ins = await supabase.from('product_images').insert({
    product_id: productId,
    url,
    color: asset.color,
    alt_text: asset.alt,
    position: asset.position,
    is_primary: !!asset.isPrimary,
    media_type: 'image' as const,
  })
  if (ins.error) {
    throw new Error(`Insert row ${asset.source}: ${ins.error.message}`)
  }
  console.log(
    `  · linked ${asset.productSlug}/${asset.color ?? 'multi'} pos=${asset.position}${asset.isPrimary ? ' [PRIMARY]' : ''}`,
  )
}

async function main() {
  console.log(`Uploading + linking ${ASSETS.length} new product photos …\n`)
  const productIdBySlug = await loadProductIdMap()
  for (const asset of ASSETS) {
    const productId = productIdBySlug[asset.productSlug]
    if (!productId) {
      console.warn(`  ! skip — unknown product slug: ${asset.productSlug}`)
      continue
    }
    console.log(`▶ ${asset.source}`)
    const url = await uploadAsset(asset)
    await ensureProductImageRow(asset, productId, url)
  }
  console.log('\n✓ Batch 2 deployed.')
}

main().catch((err) => {
  console.error('\n✗ deploy-photoshoot-batch2 failed:', err)
  process.exit(1)
})
