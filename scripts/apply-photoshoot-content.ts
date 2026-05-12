/**
 * Apply the photoshoot-2026 v2 content to the live database.
 *
 * Idempotent steps:
 *  1. Verify the homepage_settings.hero_image_url_mobile column exists
 *     (added by an earlier migration).
 *  2. Update homepage_settings (hero desktop+mobile + story image).
 *  3. Update categories.image_url for Hoodies / Sweaters / T-Shirts.
 *  4. Wipe + reseed lookbook chapters with the 4 new editorial chapters
 *     and link each chapter to its products.
 *  5. Wipe non-video product_images on the 3 active products and seed
 *     the new photoshoot images, preserving existing video media.
 *  6. Update about_settings hero (desktop + mobile) + alt + focal point.
 *     The accompanying SQL migration in supabase/migrations covers the
 *     fresh-DB case; this UPDATE keeps a live DB in sync without
 *     requiring a redeploy.
 *  7. Link blog_posts.featured_image_url to the photoshoot URLs for all
 *     existing posts AND upsert the "Lente-Garderobe" post (May 4 2026)
 *     so a single run of this script primes blog content too.
 *
 * Run with:  npx tsx scripts/apply-photoshoot-content.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import path from 'node:path'

dotenv.config({ path: '.env.local' })

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
// 1. Migration sanity check
// ---------------------------------------------------------------------------

async function ensureMobileHeroColumn() {
  console.log('1. Ensuring homepage_settings.hero_image_url_mobile column …')
  const probe = await supabase.from('homepage_settings').select('hero_image_url_mobile').limit(1)
  if (probe.error && probe.error.message.includes('hero_image_url_mobile')) {
    console.log('   Column missing: please run: npx supabase db push')
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

  const slugs = ['mose-essential-hoodie', 'mose-classic-sweater', 'mose-tee']
  const productsRes = await supabase.from('products').select('id, slug').in('slug', slugs)
  if (productsRes.error || !productsRes.data) {
    throw new Error(`Products lookup failed: ${productsRes.error?.message}`)
  }
  const productIdBySlug = Object.fromEntries(productsRes.data.map((p) => [p.slug, p.id]))

  const del = await supabase
    .from('lookbook_chapters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (del.error) throw new Error(`Chapter wipe: ${del.error.message}`)
  console.log('   · wiped existing chapters')

  // CHAPTER 01: City (Hoodie)
  const ch1 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 10,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'GRONINGEN, GEWOON.',
      title_en: 'GRONINGEN. STRAIGHT UP.',
      caption_nl:
        'We fotograferen niet in een witte studio. Deze beelden staan waar MOSE vandaan komt: tussen baksteen, beton en kleur in de stad. Dat is de plek voor onze hoodie.',
      caption_en:
        'We do not shoot in a white box. These frames are where MOSE comes from: brick, concrete and paint in the city. That is the right backdrop for the hoodie.',
      hero_image_url: url('lookbook.01.city'),
      image_focal_x: 50,
      image_focal_y: 45,
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

  // CHAPTER 02: Spring (Tee)
  const ch2 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 20,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'LENTE OP DE GRACHT.',
      title_en: 'SPRING BY THE CANAL.',
      caption_nl:
        '240 gsm jersey: stevig genoeg om mooi te vallen, licht genoeg voor warmere dagen. Deze tee hoort bij wandelen langs water en bloesem, niet bij een moodboard.',
      caption_en:
        '240 gsm jersey with enough body to drape well, light enough for warmer days. This tee belongs by water and blossom, not on a moodboard.',
      hero_image_url: url('lookbook.02.spring'),
      image_focal_x: 50,
      image_focal_y: 35,
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

  // CHAPTER 03: Stone & Steel (Sweater)
  const ch3 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 30,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'STEEN & STAAL.',
      title_en: 'STONE & STEEL.',
      caption_nl:
        'De Classic Sweater is onze rustige basis: strak logo, zachte fleece aan de binnenkant, en een pasvorm die op straat net zo makkelijk draagt als binnen. We hoeven er geen extra verhaal omheen te maken.',
      caption_en:
        'The Classic Sweater is our quiet base: clean logo, soft fleece inside, and a fit that works on the street and indoors. No extra story required.',
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

  // CHAPTER 04: Closing (couple, dark layout, no products)
  const ch4 = await supabase
    .from('lookbook_chapters')
    .insert({
      sort_order: 40,
      eyebrow_nl: null,
      eyebrow_en: null,
      title_nl: 'SAMEN OP DE TRAP.',
      title_en: 'TOGETHER ON THE STEPS.',
      caption_nl:
        'Geen one-liner nodig: dit zijn wij, in Groningen, in de kleding die we zelf maken. Als het hier goed voelt, voelt het in de rest van de week ook thuis.',
      caption_en:
        'No punchline needed: this is us, in Groningen, in clothes we make ourselves. If it feels right here, it will feel right the rest of the week too.',
      hero_image_url: url('lookbook.03.closing'),
      image_focal_x: 50,
      image_focal_y: 30,
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
  console.log(`   ✓ inserted 4 chapters (Groningen, Lente gracht, Steen & staal, Samen op de trap) and ${links.length} product links`)
}

// ---------------------------------------------------------------------------
// 5. Product images: wipe non-video shots, seed photoshoot 2026 v2
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
  // ============================ MOSE Essential Hoodie ============================
  // Bruin
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.hero'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, leunend tegen graffiti-paal in Groningen', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.hero-graffiti-smile'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, frontale glimlach voor groen-gele graffiti', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.hero-pink-hood-pull'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, hood-up gebaar voor roze graffiti', position: 2 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.lifestyle-pink-hood'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, lifestyle, hood-up, blik opzij bij pink graffiti', position: 3 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.hero-concrete'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, hood-up tegen rauwe betonwand', position: 4 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.lifestyle-concrete-side'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, zijaanzicht profiel tegen betonwand', position: 5 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.detail-drape'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, detail van pasvorm en drape', position: 6 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.bruin.detail-back'), color: 'Bruin', alt: 'MOSE Essential Hoodie Bruin, back-view, hood drape', position: 7 },
  // Zwart
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.hero'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart, glimlach tegen baksteen + graffiti muur', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.hero-drape'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart, leunend tegen baksteen, mouw rollend', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.hero-concrete'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart, clean editorial tegen betonwand', position: 2 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.lifestyle-concrete-arm'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart, arm tegen wand, peinzende lifestyle pose', position: 3 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.zwart.detail-back'), color: 'Zwart', alt: 'MOSE Essential Hoodie Zwart, back-view, hood drape', position: 4 },
  // Groen
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.hero'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, lachend in stadsdecor', position: 0, is_primary: true },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.hero-arms-cross'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, armen gekruist, graffiti achtergrond', position: 1 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.lifestyle-lean-smile'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, leunend voor graffiti, glimlach', position: 2 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.lifestyle-sleeve-look'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, kijkt naar mouw, hood-up moment', position: 3 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.hero-concrete-front'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, clean front tegen betonwand', position: 4 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.lifestyle-concrete-hand'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, hand op betonwand, zijprofile', position: 5 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.detail-puff-logo'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, borst-puff-logo close-up', position: 6 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.detail-puff-close'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, extreme close-up van het 3D puff-logo', position: 7 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.groen.detail-back'), color: 'Groen', alt: 'MOSE Essential Hoodie Olive Groen, back-view, hood drape', position: 8 },
  // Multi (kleur=null)
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.lineup-crop'), color: null, alt: 'MOSE Essential Hoodie, colorway lineup (chest-logo crop)', position: 10 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.trio-smile-line'), color: null, alt: 'MOSE Essential Hoodie, trio Bruin / Zwart / Olive, complete colorway, glimlachend', position: 11 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.trio-laughing-landscape'), color: null, alt: 'MOSE Essential Hoodie, trio voor kleurrijke graffiti, vol lachend', position: 12 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.duo-walk-grass'), color: null, alt: 'MOSE Essential Hoodie, duo Zwart + Olive Groen wandelen door gras', position: 13 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.duo-pink-walk'), color: null, alt: 'MOSE Essential Hoodie, duo Bruin + Olive voor roze graffiti', position: 14 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.duo-laughing-arm-rest'), color: null, alt: 'MOSE Essential Hoodie, duo Zwart + Olive lachend, arm op schouder', position: 15 },
  { productSlug: 'mose-essential-hoodie', url: url('product.hoodie.multi.duo-mmx-smile'), color: null, alt: 'MOSE Essential Hoodie, duo Bruin + Olive voor MMX XVI graffiti, landscape', position: 16 },

  // ============================ MOSE Classic Sweater ============================
  // Off White
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.hero'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White, frontale glimlach voor monumentale Groningse gevel', position: 0, is_primary: true },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.lifestyle-arch-smile'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White, lifestyle, arm rollend voor Groningse arch-gevel', position: 1 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.lifestyle-arch-lean'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White, leunend tegen monumentale Groningse boog', position: 2 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.detail-puff-close'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White, extreme close-up van het 3D puff-logo', position: 3 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.offwhite.detail-puff-roll'), color: 'Off White', alt: 'MOSE Classic Sweater Off-White, chest-detail met logo en mouwroll', position: 4 },
  // Zwart
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.quartet-arches'), color: 'Zwart', alt: 'MOSE Classic Sweater Zwart, viergroep colorways voor monumentale gevel', position: 0, is_primary: true },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.quartet-poised'), color: 'Zwart', alt: 'MOSE Classic Sweater Zwart, viergroep colorways, posed editorial', position: 1 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.zwart.detail-chest-hand'), color: 'Zwart', alt: 'MOSE Classic Sweater Zwart, detail met embroidered MOSE chest-logo', position: 2 },
  // Multi (kleur=null)
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.quartet-arches'), color: null, alt: 'MOSE Classic Sweater, quartet colorways voor monumentale Groningse gevel', position: 10 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.detail-arms-shoulder'), color: null, alt: 'MOSE Classic Sweater, Off-White centraal met zwarte armen op de schouders', position: 11 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.couple-walk'), color: null, alt: 'MOSE Classic Sweater, couple wandelt monumentale stenen trappen af', position: 12 },
  { productSlug: 'mose-classic-sweater', url: url('product.sweater.multi.couple-lean'), color: null, alt: 'MOSE Classic Sweater, couple leunt op stenen trappen, Groningen', position: 13 },

  // ============================ MOSE Tee ============================
  // Beige (Sand)
  { productSlug: 'mose-tee', url: url('product.tee.beige.hero'), color: 'Beige', alt: 'MOSE Tee Beige, hero shot in zonnige Groningse straat', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.beige.detail'), color: 'Beige', alt: 'MOSE Tee Beige, borduurde MOSE chest-logo close-up', position: 1 },
  // Wit
  { productSlug: 'mose-tee', url: url('product.tee.wit.hero'), color: 'Wit', alt: 'MOSE Tee Wit, editorial back-view bij de gracht met blossoms', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.wit.lifestyle-canal-sleeve'), color: 'Wit', alt: 'MOSE Tee Wit, lifestyle aan de gracht, mouw rollend', position: 1 },
  { productSlug: 'mose-tee', url: url('product.tee.wit.detail-puff'), color: 'Wit', alt: 'MOSE Tee Wit, 3D puff-logo close-up detail', position: 2 },
  { productSlug: 'mose-tee', url: url('product.tee.wit.detail-chest-arms'), color: 'Wit', alt: 'MOSE Tee Wit, detail close-up van chest-logo met onderarm-tattoo', position: 3 },
  // Zwart
  { productSlug: 'mose-tee', url: url('product.tee.zwart.hero'), color: 'Zwart', alt: 'MOSE Tee Zwart, voor de Noorderhaven met lente-bloesems', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.zwart.lifestyle-look-down'), color: 'Zwart', alt: 'MOSE Tee Zwart, kijkt naar beneden, gracht en blossoms achter', position: 1 },
  // Groen (Olive)
  { productSlug: 'mose-tee', url: url('product.tee.groen.hero'), color: 'Groen', alt: 'MOSE Tee Olive Groen, hero shot aan de gracht in lentezon', position: 0, is_primary: true },
  { productSlug: 'mose-tee', url: url('product.tee.groen.lifestyle-back-walk'), color: 'Groen', alt: 'MOSE Tee Olive Groen, lifestyle, back-view aan de gracht', position: 1 },
  // Multi (kleur=null)
  { productSlug: 'mose-tee', url: url('product.tee.multi.duo-canal'), color: null, alt: 'MOSE Tee, duo Beige + Zwart aan de Noorderhaven, landscape', position: 10 },
  { productSlug: 'mose-tee', url: url('product.tee.multi.couple-blossoms'), color: null, alt: 'MOSE Tee, couple Beige + Zwart bij de gracht met blossoms', position: 11 },
]

async function reseedProductImages() {
  console.log('\n5. Replacing product_images with photoshoot 2026 v2 …')

  const slugs = [...new Set(PRODUCT_IMAGES.map((p) => p.productSlug))]
  const res = await supabase.from('products').select('id, slug').in('slug', slugs)
  if (res.error || !res.data) throw new Error(`Products lookup: ${res.error?.message}`)
  const productIdBySlug = Object.fromEntries(res.data.map((p) => [p.slug, p.id]))

  // Wipe existing non-video product_images for the 3 products. The
  // `or` filter keeps any rows where `media_type` is e.g. 'video' so
  // existing PDP videos stay live across the rebuild.
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

  const chunkSize = 25
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const ins = await supabase.from('product_images').insert(chunk)
    if (ins.error) throw new Error(`Insert imgs ${i}: ${ins.error.message}`)
  }
  console.log(`   ✓ inserted ${rows.length} new product images`)
}

// ---------------------------------------------------------------------------
// 6. About settings: keep live row in sync with v2 hero
// ---------------------------------------------------------------------------

async function updateAboutSettings() {
  console.log('\n6. Updating about_settings hero …')
  const heroDesktop = url('about.hero')
  const heroMobile = url('about.hero', 'mobile')

  const row = await supabase.from('about_settings').select('id').limit(1).single()
  if (row.error || !row.data) {
    // No row yet (fresh DB). The migration handles that case; nothing
    // to update here.
    console.log('   · no about_settings row yet: skip (migration will seed)')
    return
  }

  const upd = await supabase
    .from('about_settings')
    .update({
      hero_image_url: heroDesktop,
      hero_image_url_mobile: heroMobile,
      image_focal_x: 50,
      image_focal_y: 35,
      hero_alt_nl: 'Irma en Rick (MOSE), oprichters, op de monumentale stenen trappen in Groningen',
      hero_alt_en: 'Irma and Rick (MOSE), founders, on the monumental stone steps in Groningen',
    })
    .eq('id', row.data.id)
  if (upd.error) throw new Error(`About update: ${upd.error.message}`)
  console.log('   ✓ hero (desktop + mobile) + alt + focal updated')
}

// ---------------------------------------------------------------------------
// 7. Blog posts: featured image link + new "Lente-Garderobe" upsert
// ---------------------------------------------------------------------------

interface BlogLink {
  slug: string
  /** URL-map tag (always 'blog.<slug>'). */
  tag: string
}

const BLOG_LINKS: BlogLink[] = [
  { slug: 'waarom-fast-fashion-kapot-is', tag: 'blog.waarom-fast-fashion-kapot-is' },
  { slug: 'de-perfecte-winter-hoodie-koopgids', tag: 'blog.de-perfecte-winter-hoodie-koopgids' },
  { slug: 'capsule-wardrobe-mannen-minder-kleding-meer-stijl', tag: 'blog.capsule-wardrobe-mannen-minder-kleding-meer-stijl' },
  { slug: 'lokaal-produceren-waarom-mose-kiest-voor-groningen', tag: 'blog.lokaal-produceren-waarom-mose-kiest-voor-groningen' },
  { slug: 'kwaliteit-vs-kwantiteit-echte-kosten-kleding', tag: 'blog.kwaliteit-vs-kwantiteit-echte-kosten-kleding' },
  { slug: '5-tijdloze-basics-die-iedereen-nodig-heeft', tag: 'blog.5-tijdloze-basics-die-iedereen-nodig-heeft' },
  { slug: 'van-schets-tot-product-hoe-een-mose-hoodie-ontstaat', tag: 'blog.van-schets-tot-product-hoe-een-mose-hoodie-ontstaat' },
  { slug: 'streetwear-trends-2026-wat-blijft-wat-verdwijnt', tag: 'blog.streetwear-trends-2026-wat-blijft-wat-verdwijnt' },
  { slug: 'duurzame-mode-hoeft-niet-duur-te-zijn', tag: 'blog.duurzame-mode-hoeft-niet-duur-te-zijn' },
  { slug: 'groningse-streetwear-scene-van-underground-tot-mainstream', tag: 'blog.groningse-streetwear-scene-van-underground-tot-mainstream' },
]

const NEW_BLOG_POST = {
  slug: 'de-perfecte-lente-garderobe-7-stukken-die-werken',
  title_nl: 'De Perfecte Lente-Garderobe: 7 Stukken Die Voor Alles Werken',
  title_en: 'The Perfect Spring Wardrobe: 7 Pieces That Work for Everything',
  excerpt_nl:
    'De Nederlandse lente is grillig. Vandaag zon, morgen regen. Dit zijn de 7 stukken die je door elk weertype én elke gelegenheid heen helpen, zonder dat je kast uit zijn voegen barst.',
  excerpt_en:
    'Dutch spring is unpredictable. Sun today, rain tomorrow. These are the 7 pieces that get you through any weather and any occasion without overflowing your closet.',
  category: 'style',
  tags: ['lente', 'garderobe', 'capsule', 'styling', 'basics', 'seizoen'],
  author: 'MOSE',
  reading_time: 6,
  status: 'published' as const,
  published_at: '2026-05-04T08:00:00Z',
  seo_title_nl: 'De Perfecte Lente-Garderobe in 7 Stukken | MOSE Blog',
  seo_title_en: 'The Perfect Spring Wardrobe in 7 Pieces | MOSE Blog',
  seo_description_nl:
    'Bouw een lente-garderobe die door alle Nederlandse weertypes heen werkt. 7 essentiële stukken, eindeloos te combineren, zonder fast-fashion-stress.',
  seo_description_en:
    'Build a spring wardrobe that handles all Dutch weather types. 7 essential pieces, endlessly combinable, without fast-fashion stress.',
  content_nl: `De Nederlandse lente is een sport. 's Ochtends jas aan, 's middags T-shirt, 's avonds weer een vest erover. Eén regenbui en je hele outfit ligt aan flarden. Geen wonder dat veel mensen hun garderobe in deze periode het meest stressvol vinden.

De oplossing is niet meer kleding. De oplossing is slimmer kiezen. Met 7 goed gekozen stukken kom je door elk lentescenario heen, van koffiedate in de zon tot fietsen door een plotselinge bui.

## 1. De middel-zware sweater

Niet zo dik als een winterhoodie, niet zo dun als een T-shirt. De middel-zware sweater (250-320 GSM) is je belangrijkste lente-stuk. Hij werkt op koele ochtenden, onder een lichte jas op gure dagen, en als enige laag op zonnige middagen.

**Waar je op let:**
- Gebreid katoen of katoen-modal blend
- Crewneck of half-zip, minder bulky dan een hoodie
- Neutrale kleur die met alles combineert (off-white, beige, grijs)

## 2. Twee kwalitatieve T-shirts

Begin niet met tien. Begin met twee. Een wit en een zwart, allebei van minimaal 200 GSM stof. Deze gaan je hele lente en zomer mee.

**Waarom 200+ GSM:** Dunne T-shirts (zoals fast-fashion-basics van 140 GSM) verliezen na drie wasbeurten hun vorm en worden doorschijnend. Een goede tee blijft jaren liggen.

## 3. De donkere jeans (slim of straight)

Jeans is jeans, denk je? Niet helemaal. Voor de lente kies je een donkere wash in slim of straight fit. Donker oogt formeler, vergeeft vlekken (denk: cappuccino-ongelukje), en combineert met letterlijk alles in je kast.

Wat je vermijdt: distressed jeans, light wash, en super skinny modellen. Die voelen verouderd in 2026.

## 4. De chino of canvas-broek

Voor warmere dagen, of als de jeans-look te casual is. Een chino in beige, olijfgroen of donkerblauw geeft direct een opgeruimder beeld zonder pak-en-das vibes. Canvas-werkbroeken doen hetzelfde maar met meer karakter.

**De pasvorm:** Niet te wijd (workwear-trend van 2024 is voorbij), niet te smal. Een tapered cut die op je schoen rust is de zweet-spot.

## 5. De lichtgewicht jas

Eén jas voor alles. Geen winterjas, geen regenjas, geen blazer, gewoon één goede tussenseizoens-jas die je tussen 5°C en 18°C aankunt.

**Wat werkt:**
- Werkjacket (Carhartt-stijl) in canvas
- Coach jacket in nylon of katoen
- Overshirt in zware twill
- Ongevoerde denim jacket

Allemaal water-afstotend genoeg voor een onverwachte miezerbui, ademend genoeg om niet in te zweten.

## 6. Schone sneakers

Een paar schone, eenvoudige sneakers in wit, off-white, of grijs. Geen knal-kleuren, geen extreme silhouetten, geen logo's die schreeuwen. Ze moeten passen bij elke broek én bij elke bovenkleding-keuze.

Tip: koop ze net iets duurder dan je eerste instinct. Een goed paar schone sneakers gaat 2-3 lentes mee, een goedkoop paar één seizoen.

## 7. De cap

Onmisbaar voor zonnige dagen, slechte-haardagen, en regenbuien. Een ongestructureerde cap in zwart of beige verandert direct elke outfit van "casual" naar "casual met intentie."

Vergeet trucker-caps met grote logo's of fluo-kleuren. Tijdloze cap = tijdloze look.

## Hoe combineer je deze 7 stukken?

Wiskundig: 2 T-shirts × 2 broeken × 2 sweaters/jassen-combinaties × 1 cap = 16+ unieke outfits zonder dat iemand merkt dat je dezelfde stukken steeds hergebruikt.

Praktisch:

- **Zonnige zaterdag:** wit T-shirt + chino + sneakers + cap
- **Frisse vrijdag:** zwart T-shirt + sweater + jeans + jasje
- **Regenachtige dinsdag:** sweater + jeans + jas + cap
- **Late-avond afspraak:** wit T-shirt + sweater + chino + sneakers

Geen ochtendstress, geen "ik heb niets om aan te trekken" paradox, geen impulsaankoop op weg naar je werk.

## De MOSE-bijdrage

Drie van deze 7 stukken kun je van ons krijgen: de classic sweater, de tee, en (binnenkort) een lente-cap. Ontworpen om elkaar te dragen, lokaal gemaakt in Groningen, en gemaakt om te blijven.

De rest haal je waar je wilt. Een kwaliteits-jeans bij een vakzaak. Een goede chino bij een Europees workwear-merk. Schone sneakers bij iemand die nog z'n eigen modellen ontwerpt. Het punt is niet om alles bij MOSE te kopen. Het punt is om bewust te kopen, periode.

Lente is een nieuwe start. Begin niet met meer kleding. Begin met betere kleding.`,
  content_en: `Dutch spring is a sport. Coat in the morning, T-shirt in the afternoon, sweater again at night. One rain shower and your whole outfit is shot. No wonder many people find their wardrobe most stressful in this period.

The solution isn't more clothing. The solution is choosing smarter. With 7 well-chosen pieces, you get through any spring scenario, from a coffee date in the sun to biking through a sudden shower.

## 1. The Mid-Weight Sweater

Not as thick as a winter hoodie, not as thin as a T-shirt. The mid-weight sweater (250-320 GSM) is your most important spring piece. It works on cool mornings, under a light jacket on dreary days, and as the only layer on sunny afternoons.

**What to look for:**
- Knitted cotton or cotton-modal blend
- Crewneck or half-zip, less bulky than a hoodie
- Neutral color that combines with everything (off-white, beige, grey)

## 2. Two Quality T-shirts

Don't start with ten. Start with two. One white, one black, both in fabric of at least 200 GSM. These will last all spring and summer.

**Why 200+ GSM:** Thin T-shirts (fast-fashion basics at 140 GSM) lose their shape after three washes and become see-through. A good tee lasts years.

## 3. Dark Jeans (Slim or Straight)

Jeans is jeans, you think? Not entirely. For spring, choose a dark wash in slim or straight fit. Dark looks more formal, hides stains (think: cappuccino accident), and combines with literally everything.

Avoid: distressed jeans, light wash, and super skinny models. They feel dated in 2026.

## 4. The Chino or Canvas Pant

For warmer days, or when jeans feel too casual. A chino in beige, olive, or dark blue immediately gives a tidier look without suit-and-tie vibes.

**The fit:** Not too wide (workwear trend of 2024 is over), not too narrow. A tapered cut resting on your shoe is the sweet spot.

## 5. The Lightweight Jacket

One jacket for everything. Not a winter coat, not a rain jacket, not a blazer, just one good transitional jacket that handles 5°C to 18°C.

**What works:** Workwear jacket in canvas, coach jacket in nylon or cotton, heavy twill overshirt, unlined denim jacket. All water-resistant enough for an unexpected drizzle, breathable enough not to sweat in.

## 6. Clean Sneakers

A pair of clean, simple sneakers in white, off-white, or grey. No bold colors, no extreme silhouettes, no shouting logos. They must match every pant and every top choice.

Tip: spend slightly more than your first instinct. A good clean sneaker lasts 2-3 springs, a cheap pair lasts one season.

## 7. The Cap

Essential for sunny days, bad-hair days, and rain showers. An unstructured cap in black or beige instantly changes any outfit from "casual" to "casual with intention."

Forget trucker caps with big logos or neon colors. Timeless cap = timeless look.

## How to Combine These 7 Pieces?

Mathematically: 2 T-shirts × 2 pants × 2 sweater/jacket combinations × 1 cap = 16+ unique outfits without anyone noticing you reuse the same pieces.

Practically:
- **Sunny Saturday:** white T-shirt + chino + sneakers + cap
- **Crisp Friday:** black T-shirt + sweater + jeans + jacket
- **Rainy Tuesday:** sweater + jeans + jacket + cap
- **Late-evening date:** white T-shirt + sweater + chino + sneakers

No morning stress, no "I have nothing to wear" paradox, no impulse purchase on your way to work.

## The MOSE Contribution

Three of these 7 pieces you can get from us: the classic sweater, the tee, and (soon) a spring cap. Designed to wear together, made locally in Groningen, made to last.

The rest you get wherever you like. A quality jeans at a specialist. A good chino at a European workwear brand. Clean sneakers from someone still designing their own models. The point isn't to buy everything at MOSE. The point is to buy consciously, period.

Spring is a fresh start. Don't start with more clothing. Start with better clothing.`,
}

async function applyBlogPosts() {
  console.log('\n7. Linking blog featured images …')

  for (const link of BLOG_LINKS) {
    const featured = url(link.tag)
    const upd = await supabase
      .from('blog_posts')
      .update({ featured_image_url: featured })
      .eq('slug', link.slug)
      .select('id, slug')
      .maybeSingle()
    if (upd.error) {
      throw new Error(`Update blog ${link.slug}: ${upd.error.message}`)
    }
    if (!upd.data) {
      console.log(`   · ! no blog row found for slug ${link.slug} (skipping)`)
    } else {
      console.log(`   · ${link.slug}`)
    }
  }

  console.log('\n8. Upserting "Lente-Garderobe" blog post …')
  const newFeatured = url('blog.de-perfecte-lente-garderobe-7-stukken-die-werken')
  const fullRow = { ...NEW_BLOG_POST, featured_image_url: newFeatured }
  const ins = await supabase
    .from('blog_posts')
    .upsert(fullRow, { onConflict: 'slug' })
    .select('id, slug, title_nl, published_at')
    .single()
  if (ins.error) throw new Error(`Upsert lente-garderobe: ${ins.error.message}`)
  console.log(`   ✓ ${ins.data.title_nl} (${ins.data.published_at})`)
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
  await updateAboutSettings()
  await applyBlogPosts()
  console.log('\n✓ All photoshoot v2 content applied.')
}

main().catch((err) => {
  console.error('\n✗ apply-photoshoot-content failed:', err)
  process.exit(1)
})
