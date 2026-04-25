/**
 * Apply the photoshoot-2026 content to the live database.
 *
 * Steps (idempotent):
 *  1. Run the new homepage_hero_mobile migration (column add) via raw SQL.
 *  2. Update homepage_settings — hero (desktop+mobile) + story image.
 *  3. Update categories.image_url for Hoodies / Sweaters / T-Shirts.
 *  4. Replace lookbook chapters with the 3 new editorial chapters and link
 *     each chapter to its products.
 *  5. Wipe the AI-generated product images on the 3 active products and seed
 *     in the new photoshoot images, preserving any existing video media.
 *
 * Run with:  npx tsx scripts/apply-photoshoot-content.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const URL_MAP: Record<string, Record<string, string>> = JSON.parse(
  readFileSync(path.resolve(__dirname, 'photoshoot-urls.json'), 'utf-8'),
)

function url(tag: string, variant: string = 'desktop'): string {
  const v = URL_MAP[tag]?.[variant]
  if (!v) throw new Error(`Missing URL for ${tag}/${variant}`)
  return v
}

// ---------------------------------------------------------------------------
// 1. Migration: hero_image_url_mobile column
// ---------------------------------------------------------------------------

async function ensureMobileHeroColumn() {
  console.log('1. Ensuring homepage_settings.hero_image_url_mobile column …')
  // Cheapest test: try to select it. If the column is missing the call errors.
  const probe = await supabase.from('homepage_settings').select('hero_image_url_mobile').limit(1)
  if (probe.error && probe.error.message.includes('hero_image_url_mobile')) {
    console.log("   Column missing — please run: npx supabase db push")
    console.log('   Halting; rerun me after the migration is applied.')
    process.exit(1)
  }
  console.log('   ✓ column present')
}

// ---------------------------------------------------------------------------
// 2. Homepage settings
// ---------------------------------------------------------------------------

async function updateHomepageSettings() {
  console.log('\n2. Updating homepage_settings (hero + story) …')
  const heroDesktop = url('homepage.hero.desktop')
  const heroMobile = url('homepage.hero.mobile', 'mobile')
  const storyDesktop = url('homepage.story')

  const row = await supabase.from('homepage_settings').select('id').limit(1).single()
  if (row.error || !row.data) throw new Error(`No homepage_settings row: ${row.error?.message}`)

  const upd = await supabase
    .from('homepage_settings')
    .update({
      hero_image_url: heroDesktop,
      hero_image_url_mobile: heroMobile,
      story_image_url: storyDesktop,
    })
    .eq('id', row.data.id)
  if (upd.error) throw new Error(`Homepage update: ${upd.error.message}`)
  console.log('   ✓ hero (desktop + mobile) + story updated')
}

// ---------------------------------------------------------------------------
// 3. Category images
// ---------------------------------------------------------------------------

async function updateCategoryImages() {
  console.log('\n3. Updating category images …')
  const updates: Array<[string, string]> = [
    ['hoodies', url('category.hoodies')],
    ['sweaters', url('category.sweaters')],
    ['t-shirts', url('category.tees')],
  ]
  for (const [slug, image] of updates) {
    const r = await supabase.from('categories').update({ image_url: image }).eq('slug', slug)
    if (r.error) throw new Error(`Category ${slug}: ${r.error.message}`)
    console.log(`   ✓ ${slug}`)
  }
}

// ---------------------------------------------------------------------------
// 4. Lookbook chapters
// ---------------------------------------------------------------------------

async function reseedLookbookChapters() {
  console.log('\n4. Reseeding lookbook chapters …')

  // Fetch product IDs by slug
  const slugs = ['mose-essential-hoodie', 'mose-classic-sweater', 'mose-tee']
  const productsRes = await supabase
    .from('products')
    .select('id, slug')
    .in('slug', slugs)
  if (productsRes.error || !productsRes.data) {
    throw new Error(`Products lookup failed: ${productsRes.error?.message}`)
  }
  const productIdBySlug = Object.fromEntries(productsRes.data.map((p) => [p.slug, p.id]))

  // Wipe existing chapters (cascade clears chapter_products)
  const del = await supabase.from('lookbook_chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (del.error) throw new Error(`Chapter wipe: ${del.error.message}`)
  console.log('   · wiped existing chapters')

  // CHAPTER 01 — City (Hoodie)
  const ch1 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 10,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'STAD ALS ATELIER.',
      title_en: 'THE CITY AS ATELIER.',
      caption_nl:
        'Geen studio, geen filters. We dragen onze hoodies waar ze gemaakt zijn — tussen de bakstenen, beton en spuitbussen van Groningen.',
      caption_en:
        'No studio, no filters. We wear our hoodies where they were built — among the bricks, concrete and spray cans of Groningen.',
      hero_image_url: url('lookbook.01.city'),
      image_focal_x: 50,
      image_focal_y: 30,
      layout_variant: 'wide',
      meta: [
        { label_nl: 'MATERIAAL', label_en: 'MATERIAL', value_nl: '300 GSM OEKO-Tex joggingfleece katoen', value_en: '300 GSM OEKO-Tex jogging fleece cotton' },
        { label_nl: 'PASVORM', label_en: 'FIT', value_nl: 'Regular fit', value_en: 'Regular fit' },
        { label_nl: 'GEMAAKT IN', label_en: 'MADE IN', value_nl: 'Groningen, NL', value_en: 'Groningen, NL' },
      ],
      is_active: true,
    })
    .select('id')
    .single()
  if (ch1.error || !ch1.data) throw new Error(`Chapter 1: ${ch1.error?.message}`)

  // CHAPTER 02 — Spring (Tee)
  const ch2 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 20,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'LICHT ALS LENTE.',
      title_en: 'LIGHT AS SPRING.',
      caption_nl:
        'Een tee die verdwijnt op je huid. Soepel, zacht, gewichtloos. Voor lentewandelingen langs de gracht en zomers in de stad.',
      caption_en:
        'A tee that disappears on your skin. Soft, fluid, weightless. For spring walks along the canal and summers in the city.',
      hero_image_url: url('lookbook.02.spring'),
      image_focal_x: 50,
      image_focal_y: 40,
      layout_variant: 'split-right',
      meta: [
        { label_nl: 'MATERIAAL', label_en: 'MATERIAL', value_nl: '240 GSM OEKO-Tex jersey', value_en: '240 GSM OEKO-Tex jersey' },
        { label_nl: 'PASVORM', label_en: 'FIT', value_nl: 'Regular fit', value_en: 'Regular fit' },
        { label_nl: 'GEMAAKT IN', label_en: 'MADE IN', value_nl: 'Groningen, NL', value_en: 'Groningen, NL' },
      ],
      is_active: true,
    })
    .select('id')
    .single()
  if (ch2.error || !ch2.data) throw new Error(`Chapter 2: ${ch2.error?.message}`)

  // CHAPTER 03 — Stone & Steel (Sweater + closing)
  const ch3 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 30,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'STEEN & STAAL.',
      title_en: 'STONE & STEEL.',
      caption_nl:
        'De Classic Sweater bouwt door waar de hoodie ophield. Strak, schoon, klaar voor de stad. Zacht aan de binnenkant, sterk aan de buitenkant.',
      caption_en:
        'The Classic Sweater picks up where the hoodie left off. Crisp, clean, made for the city. Soft inside, structured outside.',
      hero_image_url: url('lookbook.03.stone'),
      image_focal_x: 50,
      image_focal_y: 50,
      layout_variant: 'wide',
      meta: [
        { label_nl: 'MATERIAAL', label_en: 'MATERIAL', value_nl: '300 GSM OEKO-Tex joggingfleece katoen', value_en: '300 GSM OEKO-Tex jogging fleece cotton' },
        { label_nl: 'PASVORM', label_en: 'FIT', value_nl: 'Regular fit', value_en: 'Regular fit' },
        { label_nl: 'GEMAAKT IN', label_en: 'MADE IN', value_nl: 'Groningen, NL', value_en: 'Groningen, NL' },
      ],
      is_active: true,
    })
    .select('id')
    .single()
  if (ch3.error || !ch3.data) throw new Error(`Chapter 3: ${ch3.error?.message}`)

  // CHAPTER 04 — Closing (couple, dark, no products → empty-state)
  const ch4 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 40,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'GEDRAGEN, NIET GEPOSEERD.',
      title_en: 'WORN, NOT POSED.',
      caption_nl:
        'MOSE is geen merk, maar een uniform voor het echte leven. Voor wie ergens tegenaan loopt en gewoon door wil.',
      caption_en:
        'MOSE isn\'t a brand — it\'s a uniform for real life. For the ones who keep moving when things get hard.',
      hero_image_url: url('lookbook.03.closing'),
      image_focal_x: 50,
      image_focal_y: 35,
      layout_variant: 'dark',
      meta: [],
      is_active: true,
    })
    .select('id')
    .single()
  if (ch4.error || !ch4.data) throw new Error(`Chapter 4: ${ch4.error?.message}`)

  // Link products
  const links = [
    { chapter_id: ch1.data.id, product_id: productIdBySlug['mose-essential-hoodie'], sort_order: 0 },
    { chapter_id: ch2.data.id, product_id: productIdBySlug['mose-tee'], sort_order: 0 },
    { chapter_id: ch3.data.id, product_id: productIdBySlug['mose-classic-sweater'], sort_order: 0 },
  ].filter((l) => l.product_id)

  if (links.length > 0) {
    const linkRes = await supabase.from('lookbook_chapter_products').insert(links)
    if (linkRes.error) throw new Error(`Chapter products: ${linkRes.error.message}`)
  }
  console.log(`   ✓ inserted 4 chapters (City, Spring, Stone & Steel, Closing) and ${links.length} product links`)
}

// ---------------------------------------------------------------------------
// 5. Product images — wipe AI shots, seed photoshoot
// ---------------------------------------------------------------------------

interface ImageSeed {
  productSlug: string
  url: string
  color: string | null
  alt: string
  position: number
  is_primary?: boolean
}

const PRODUCT_IMAGES: ImageSeed[] = [
  // ---- MOSE Essential Hoodie ----
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.hero'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin — leunend tegen graffiti-paal in Groningen', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.detail'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin — detail / pasvorm', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.hero'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart — leunend tegen baksteenmuur', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.lifestyle.pair'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart — duo lifestyle', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.hero'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen — lachend in stadsdecor', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.detail'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen — borst-puff-logo close-up', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.lineup'), color: null, alt: 'MOSE Essential Hoodie — colorway lineup', position: 10 },

  // ---- MOSE Classic Sweater ----
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.hero'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White — voor monumentale Groningse gevel', position: 0, is_primary: true },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.quartet'), color: 'Off White', alt: 'MOSE Classic Sweater — viergroep colorways', position: 1 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.couple-walk'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White — lifestyle stenen trappen', position: 2 },
  // For Zwart variant we reuse the quartet shot (2 black sweaters visible) as primary lifestyle.
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.quartet'), color: 'Zwart', alt: 'MOSE Classic Sweater Zwart — viergroep colorways', position: 0, is_primary: true },

  // ---- MOSE Tee ----
  { productSlug: 'mose-tee', url: url('product.tee.zwart.hero'), color: 'Zwart', alt: 'MOSE Tee Zwart — voor de Noorderhaven, lentebloesems', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.wit.editorial'), color: 'Wit', alt: 'MOSE Tee Wit — editorial back-view bij de gracht', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.wit.detail'), color: 'Wit', alt: 'MOSE Tee Wit — 3D puff-logo detail', position: 1 },
  { productSlug: 'mose-tee', url: url('product.tee.beige.lifestyle'), color: 'Beige', alt: 'MOSE Tee Beige — zonnige lifestyle in Groningse straat', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.beige.detail'), color: 'Beige', alt: 'MOSE Tee Beige — borduurde MOSE chest-logo', position: 1 },
]

async function reseedProductImages() {
  console.log('\n5. Replacing product_images with photoshoot 2026 …')

  const slugs = [...new Set(PRODUCT_IMAGES.map((p) => p.productSlug))]
  const res = await supabase.from('products').select('id, slug').in('slug', slugs)
  if (res.error || !res.data) throw new Error(`Products lookup: ${res.error?.message}`)
  const productIdBySlug = Object.fromEntries(res.data.map((p) => [p.slug, p.id]))

  // Delete existing non-video product_images for the 3 products
  for (const slug of slugs) {
    const pid = productIdBySlug[slug]
    if (!pid) continue
    const del = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', pid)
      .or('media_type.is.null,media_type.eq.image')
    if (del.error) throw new Error(`Delete imgs ${slug}: ${del.error.message}`)
    console.log(`   · cleared image rows for ${slug}`)
  }

  // Insert new ones
  const rows = PRODUCT_IMAGES.map((p) => ({
    product_id: productIdBySlug[p.productSlug],
    url: p.url,
    color: p.color,
    alt_text: p.alt,
    position: p.position,
    is_primary: !!p.is_primary,
    media_type: 'image' as const,
  })).filter((r) => r.product_id)

  if (rows.length === 0) {
    console.log('   ! no rows to insert; check product slugs')
    return
  }

  // Insert in chunks of 25
  const chunkSize = 25
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const ins = await supabase.from('product_images').insert(chunk)
    if (ins.error) throw new Error(`Insert imgs ${i}: ${ins.error.message}`)
  }
  console.log(`   ✓ inserted ${rows.length} new product images`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureMobileHeroColumn()
  await updateHomepageSettings()
  await updateCategoryImages()
  await reseedLookbookChapters()
  await reseedProductImages()
  console.log('\n✓ All photoshoot content applied.')
}

main().catch((err) => {
  console.error('\n✗ apply-photoshoot-content failed:', err)
  process.exit(1)
})
