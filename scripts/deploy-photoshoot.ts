/**
 * Deploy MOSE photoshoot 2026 v2 to Supabase Storage + /public.
 *
 * - Resizes each renamed source JPG into web-optimised variants (WebP +
 *   JPEG OG cards) using `sharp`.
 * - The new `xl` variant (3600px WebP Q88) ships exclusively to
 *   `product-images/`-bucket assets; the PDP lightbox loads it via
 *   suffix-swap so pinch-zoom on retina screens stays razor-sharp.
 * - Optional `crop.focalY` per asset lets us extract a landscape (or
 *   square) crop from a portrait source without `attention`-mode
 *   guessing where the face is. The focal Y is interpreted as the
 *   normalised vertical centre of the crop (0 = top, 1 = bottom). When
 *   present, only `og`/`square` (height-bound) variants honour it; the
 *   width-bound `desktop` / `mobile` / `xl` variants keep the source
 *   aspect ratio intact and rely on storefront `object-position` for
 *   any cropping.
 * - Uploads idempotently (upsert: true) so re-runs simply overwrite.
 * - Writes `scripts/photoshoot-urls.json` so the DB-update step can
 *   reuse the URLs.
 * - Refreshes the static `/public/` fallbacks (og-default.jpg,
 *   hero-desktop.webp, hero-mobile.webp).
 *
 * Run with:  npx tsx scripts/deploy-photoshoot.ts
 *
 * Reads from photoshoot-2026/*.jpg (semantic-named source files).
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

dotenv.config({ path: '.env.local' })

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

type VariantId = 'desktop' | 'mobile' | 'og' | 'square' | 'xl'

interface VariantSpec {
  width: number
  height?: number
  format: 'webp' | 'jpeg'
  quality: number
  fit?: 'cover' | 'inside'
  suffix: string
}

const VARIANTS: Record<VariantId, VariantSpec> = {
  // PDP-zoom variant: 3600px on the long side, WebP Q88. Roughly 2.5x
  // the desktop variant in pixel area; only generated for product-image
  // assets to keep storage + bandwidth in check.
  xl: { width: 3600, format: 'webp', quality: 88, fit: 'inside', suffix: 'xl' },
  desktop: { width: 2400, format: 'webp', quality: 82, fit: 'inside', suffix: 'desktop' },
  mobile: { width: 1200, format: 'webp', quality: 80, fit: 'inside', suffix: 'mobile' },
  og: { width: 1200, height: 630, format: 'jpeg', quality: 85, fit: 'cover', suffix: 'og' },
  square: { width: 1200, height: 1200, format: 'jpeg', quality: 85, fit: 'cover', suffix: 'square' },
}

interface Asset {
  /** URL-map key consumed by apply-photoshoot-content.ts. */
  tag: string
  /** Filename inside `photoshoot-2026/` (semantic-named). */
  source: string
  /** Bucket: public `images` (everything but products) or
   *  `product-images` (PDP gallery + multi/lifestyle for products). */
  bucket: 'images' | 'product-images'
  /** Storage path WITHOUT extension; variant suffix and ext are appended. */
  storageKey: string
  /** Variants to generate. `xl` should only be set for `product-images`
   *  assets so the lightbox suffix-swap finds the file. */
  variants: VariantId[]
  /** Focal point hint for `cover`-fit variants (og/square). Lets us pull
   *  a landscape OG card from a portrait source without losing faces. */
  crop?: { focalX?: number; focalY?: number }
}

// ---------------------------------------------------------------------------
// ASSETS — Photoshoot 2026 v2
// ---------------------------------------------------------------------------

const ASSETS: Asset[] = [
  // ============================ Homepage ============================
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
    source: 'couple_sweater-cream-hoodie-black_steps-hug-laugh_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/homepage/story',
    variants: ['desktop', 'mobile'],
  },

  // ============================ Categories ============================
  // Category tiles render at ~3:4 (portrait); a portrait or near-square
  // hero crop both render fine.
  {
    tag: 'category.hoodies',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/categories/hoodies',
    variants: ['desktop'],
  },
  {
    tag: 'category.sweaters',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
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

  // ============================ Lookbook ============================
  // 01 (City, wide layout, 16:9 / 21:10): native landscape duo shot so
  //    the wide-bleed crop keeps both faces in frame.
  {
    tag: 'lookbook.01.city',
    source: 'lifestyle_hoodies_brown-olive_graffiti-mmx-smile_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/01-city',
    variants: ['desktop'],
  },
  // 02 (Spring, split-right layout, 3:4 portrait): editorial back-view
  //    with blossoms — perfectly portrait already.
  {
    tag: 'lookbook.02.spring',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/02-spring',
    variants: ['desktop'],
  },
  // 03 (Stone & Steel, wide): native landscape quartet on the
  //    monumental façade.
  {
    tag: 'lookbook.03.stone',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/03-stone',
    variants: ['desktop'],
  },
  // 04 (Closing, dark layout, 4:5 / 16:9): couple walking the steps —
  //    portrait, but storefront uses object-cover with a tuned focal
  //    point so the heads stay in frame on landscape viewports.
  {
    tag: 'lookbook.03.closing',
    source: 'couple_sweater-cream-hoodie-black_steps-walk_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/lookbook/03-closing',
    variants: ['desktop'],
  },

  // ============================ About / Over MOSE ============================
  // Same iconic couple as homepage story → cohesive brand narrative on
  // landing-pages. Both desktop (3:2) and mobile (4:5) use cover-crop
  // with focal-y biased high so both faces stay above the fold.
  {
    tag: 'about.hero',
    source: 'couple_sweater-cream-hoodie-black_steps-hug-laugh_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/about/hero',
    variants: ['desktop', 'mobile'],
  },
  {
    tag: 'about.story',
    source: 'couple_sweater-cream-hoodie-black_steps-walk_portrait.jpg',
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

  // ============================ OG default ============================
  // The OG variant is also written to /public/og-default.jpg below for
  // SEO crawler reliability. Square (1200x1200) is generated for
  // platforms that prefer 1:1.
  {
    tag: 'og.default',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/og/default',
    variants: ['og', 'square', 'desktop'],
    crop: { focalY: 0.4 },
  },

  // ============================ Product: MOSE Essential Hoodie ============================
  // Bruin
  {
    tag: 'product.hoodie.bruin.hero',
    source: 'hero_hoodie_brown_graffiti-pole_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.detail-drape',
    source: 'detail_hoodie_brown_drape-pose_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/detail-drape',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.hero-pink-hood-pull',
    source: 'hero_hoodie_brown_graffiti-pink-hood-pull_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-pink-hood-pull',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.lifestyle-pink-hood',
    source: 'lifestyle_hoodie_brown_graffiti-pink-hood-look_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/lifestyle-pink-hood',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.hero-graffiti-smile',
    source: 'hero_hoodie_brown_graffiti-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-graffiti-smile',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.hero-concrete',
    source: 'hero_hoodie_brown_concrete-hood-up_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/hero-concrete',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.lifestyle-concrete-side',
    source: 'lifestyle_hoodie_brown_concrete-side-profile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/lifestyle-concrete-side',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.bruin.detail-back',
    source: 'detail_hoodie_brown_back-view_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/bruin/detail-back',
    variants: ['desktop', 'xl'],
  },
  // Zwart
  {
    tag: 'product.hoodie.zwart.hero',
    source: 'hero_hoodie_black_brick-graffiti-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.zwart.hero-drape',
    source: 'hero_hoodie_black_brick-graffiti-drape_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/hero-drape',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.zwart.hero-concrete',
    source: 'hero_hoodie_black_concrete-look-side_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/hero-concrete',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.zwart.lifestyle-concrete-arm',
    source: 'lifestyle_hoodie_black_concrete-arm-up_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/lifestyle-concrete-arm',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.zwart.detail-back',
    source: 'detail_hoodie_black_back-view_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/zwart/detail-back',
    variants: ['desktop', 'xl'],
  },
  // Groen (Olive)
  {
    tag: 'product.hoodie.groen.hero',
    source: 'hero_hoodie_olive_graffiti-laugh_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.hero-arms-cross',
    source: 'hero_hoodie_olive_graffiti-arms-cross_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/hero-arms-cross',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.lifestyle-lean-smile',
    source: 'lifestyle_hoodie_olive_graffiti-lean-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/lifestyle-lean-smile',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.lifestyle-sleeve-look',
    source: 'lifestyle_hoodie_olive_graffiti-sleeve-look_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/lifestyle-sleeve-look',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.hero-concrete-front',
    source: 'hero_hoodie_olive_concrete-front_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/hero-concrete-front',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.lifestyle-concrete-hand',
    source: 'lifestyle_hoodie_olive_concrete-hand-wall_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/lifestyle-concrete-hand',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.detail-puff-logo',
    source: 'detail_hoodie_olive_chest-puff-logo_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/detail-puff-logo',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.detail-puff-close',
    source: 'detail_hoodie_olive_chest-puff-close_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/detail-puff-close',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.groen.detail-back',
    source: 'detail_hoodie_olive_back-view_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/groen/detail-back',
    variants: ['desktop', 'xl'],
  },
  // Multi (kleur=null shots — combined-colorway lifestyle/lineup)
  {
    tag: 'product.hoodie.multi.lineup-crop',
    source: 'crop_hoodies_trio-brown-black-olive_graffiti-chest-logos_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/lineup-crop',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.trio-smile-line',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/trio-smile-line',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.trio-laughing-landscape',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/trio-laughing-landscape',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.duo-walk-grass',
    source: 'lifestyle_hoodies_black-olive_graffiti-walk-grass_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-walk-grass',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.duo-pink-walk',
    source: 'lifestyle_hoodies_brown-olive_graffiti-pink-walk_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-pink-walk',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.duo-laughing-arm-rest',
    source: 'group_hoodies_black-olive_graffiti-laughing-arm-rest_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-laughing-arm-rest',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.hoodie.multi.duo-mmx-smile',
    source: 'lifestyle_hoodies_brown-olive_graffiti-mmx-smile_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/hoodie/multi/duo-mmx-smile',
    variants: ['desktop', 'xl'],
  },

  // ============================ Product: MOSE Classic Sweater ============================
  // Off-White
  {
    tag: 'product.sweater.offwhite.hero',
    source: 'hero_sweater_cream_facade-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.offwhite.lifestyle-arch-smile',
    source: 'lifestyle_sweater_cream_facade-arch-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/lifestyle-arch-smile',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.offwhite.lifestyle-arch-lean',
    source: 'lifestyle_sweater_cream_facade-arch-lean_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/lifestyle-arch-lean',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.offwhite.detail-puff-close',
    source: 'detail_sweater_cream_chest-puff-logo_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/detail-puff-close',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.offwhite.detail-puff-roll',
    source: 'detail_sweater_cream_chest-puff-roll_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/off-white/detail-puff-roll',
    variants: ['desktop', 'xl'],
  },
  // Zwart (sweater)
  {
    tag: 'product.sweater.zwart.detail-chest-hand',
    source: 'detail_sweater_black_chest-logo-hand_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/zwart/detail-chest-hand',
    variants: ['desktop', 'xl'],
  },
  // Multi (kleur=null shots)
  {
    tag: 'product.sweater.multi.quartet-arches',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/quartet-arches',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.multi.quartet-poised',
    source: 'group_sweater_quartet-white-black_facade-poised_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/quartet-poised',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.multi.detail-arms-shoulder',
    source: 'detail_sweater_cream-mid-black-sides_facade-arms-shoulder_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/detail-arms-shoulder',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.multi.couple-walk',
    source: 'couple_sweater-cream-hoodie-black_steps-walk_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/couple-walk',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.sweater.multi.couple-lean',
    source: 'couple_sweater-cream-hoodie-black_steps-lean_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/sweater/multi/couple-lean',
    variants: ['desktop', 'xl'],
  },

  // ============================ Product: MOSE Tee ============================
  // Beige (Sand)
  {
    tag: 'product.tee.beige.hero',
    source: 'lifestyle_tee_sand_canal-street-smile_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/beige/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.beige.detail',
    source: 'detail_tee_sand_chest-logo_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/beige/detail',
    variants: ['desktop', 'xl'],
  },
  // Wit
  {
    tag: 'product.tee.wit.hero',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.wit.lifestyle-canal-sleeve',
    source: 'lifestyle_tee_white_canal-sleeve-roll_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/lifestyle-canal-sleeve',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.wit.detail-puff',
    source: 'detail_tee_white_chest-puff-logo_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/detail-puff',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.wit.detail-chest-arms',
    source: 'detail_tee_white_chest-logo-arms_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/wit/detail-chest-arms',
    variants: ['desktop', 'xl'],
  },
  // Zwart
  {
    tag: 'product.tee.zwart.hero',
    source: 'hero_tee_black_canal-blossoms-look-side_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/zwart/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.zwart.lifestyle-look-down',
    source: 'hero_tee_black_canal-blossoms-look-down_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/zwart/lifestyle-look-down',
    variants: ['desktop', 'xl'],
  },
  // Groen (Olive) — eerste echte tee groen-foto's
  {
    tag: 'product.tee.groen.hero',
    source: 'hero_tee_olive_canal-pose_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/groen/hero',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.groen.lifestyle-back-walk',
    source: 'lifestyle_tee_olive_canal-back-walk_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/groen/lifestyle-back-walk',
    variants: ['desktop', 'xl'],
  },
  // Tee multi
  {
    tag: 'product.tee.multi.couple-blossoms',
    source: 'lifestyle_tees_sand-back-black-front_canal-blossoms_portrait.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/multi/couple-blossoms',
    variants: ['desktop', 'xl'],
  },
  {
    tag: 'product.tee.multi.duo-canal',
    source: 'lifestyle_tees_sand-front-black-back_canal_landscape.jpg',
    bucket: 'product-images',
    storageKey: 'photoshoot-2026/tee/multi/duo-canal',
    variants: ['desktop', 'xl'],
  },

  // ============================ Blog featured ============================
  {
    tag: 'blog.waarom-fast-fashion-kapot-is',
    source: 'lifestyle_hoodies_brown-olive_graffiti-pink-walk_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/waarom-fast-fashion-kapot-is',
    variants: ['desktop'],
  },
  {
    tag: 'blog.de-perfecte-winter-hoodie-koopgids',
    source: 'hero_hoodie_brown_concrete-hood-up_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/de-perfecte-winter-hoodie-koopgids',
    variants: ['desktop'],
  },
  {
    tag: 'blog.capsule-wardrobe-mannen-minder-kleding-meer-stijl',
    source: 'crop_hoodies_trio-brown-black-olive_graffiti-chest-logos_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/capsule-wardrobe-mannen-minder-kleding-meer-stijl',
    variants: ['desktop'],
  },
  {
    tag: 'blog.lokaal-produceren-waarom-mose-kiest-voor-groningen',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/lokaal-produceren-waarom-mose-kiest-voor-groningen',
    variants: ['desktop'],
  },
  {
    tag: 'blog.kwaliteit-vs-kwantiteit-echte-kosten-kleding',
    source: 'detail_sweater_cream_chest-puff-logo_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/kwaliteit-vs-kwantiteit-echte-kosten-kleding',
    variants: ['desktop'],
  },
  {
    tag: 'blog.5-tijdloze-basics-die-iedereen-nodig-heeft',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/5-tijdloze-basics-die-iedereen-nodig-heeft',
    variants: ['desktop'],
  },
  {
    tag: 'blog.van-schets-tot-product-hoe-een-mose-hoodie-ontstaat',
    source: 'detail_sweater_black_chest-logo-hand_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/van-schets-tot-product-hoe-een-mose-hoodie-ontstaat',
    variants: ['desktop'],
  },
  {
    tag: 'blog.streetwear-trends-2026-wat-blijft-wat-verdwijnt',
    source: 'hero_hoodie_brown_graffiti-pink-hood-pull_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/streetwear-trends-2026-wat-blijft-wat-verdwijnt',
    variants: ['desktop'],
  },
  {
    tag: 'blog.duurzame-mode-hoeft-niet-duur-te-zijn',
    source: 'lifestyle_tee_sand_canal-street-smile_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/duurzame-mode-hoeft-niet-duur-te-zijn',
    variants: ['desktop'],
  },
  {
    tag: 'blog.groningse-streetwear-scene-van-underground-tot-mainstream',
    source: 'hero_tee_black_canal-blossoms-look-side_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/groningse-streetwear-scene-van-underground-tot-mainstream',
    variants: ['desktop'],
  },
  {
    tag: 'blog.de-perfecte-lente-garderobe-7-stukken-die-werken',
    source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
    bucket: 'images',
    storageKey: 'photoshoot-2026/blog/de-perfecte-lente-garderobe-7-stukken-die-werken',
    variants: ['desktop'],
  },
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
  crop?: Asset['crop'],
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const v = VARIANTS[variant]
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate() // honour EXIF orientation

  if (v.height) {
    // Cover-fit crop. If a focal-Y/focal-X hint is provided we force the
    // resize position to that exact normalised point; otherwise sharp's
    // `attention` heuristic picks the salient region.
    const hasFocal = crop?.focalX !== undefined || crop?.focalY !== undefined
    const position: number | string = hasFocal
      ? sharpFocalPosition(crop!.focalX ?? 0.5, crop!.focalY ?? 0.5)
      : 'attention'
    pipeline = pipeline.resize({
      width: v.width,
      height: v.height,
      fit: v.fit ?? 'cover',
      position,
    })
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

/**
 * Translate a normalised (focalX, focalY) into a sharp `position` token.
 * Sharp accepts either compass strings (e.g. `north`, `east`) or
 * `centre`. For fine-grained vertical control we approximate by
 * binning into the 9-region grid. This is a deliberate simplification:
 * sharp's resize/cover doesn't accept arbitrary x/y offsets without
 * dropping into manual `extract`, which adds two more passes for
 * marginal gain. The 9-region quantisation is good enough to keep
 * faces on screen in landscape OG cards.
 */
function sharpFocalPosition(focalX: number, focalY: number): string {
  const x = focalX < 0.34 ? 'west' : focalX > 0.66 ? 'east' : ''
  const y = focalY < 0.34 ? 'north' : focalY > 0.66 ? 'south' : ''
  if (!x && !y) return 'centre'
  if (!x) return y
  if (!y) return x
  return `${y}${x}`
}

function publicUrl(bucket: string, key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`
}

async function uploadAsset(asset: Asset): Promise<UrlMap[string]> {
  const sourcePath = path.join(PHOTOSHOOT_DIR, asset.source)
  const inputBuffer = await fs.readFile(sourcePath)
  const result: UrlMap[string] = {}

  for (const variant of asset.variants) {
    const { buffer, contentType, ext } = await processVariant(inputBuffer, variant, asset.crop)
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

async function writeStaticPublic(): Promise<void> {
  // Refresh the static fallbacks that live on /public/ for SSR + SEO:
  //   * /og-default.jpg     — guaranteed-reachable OG image
  //   * /hero-desktop.webp  — SSR placeholder for homepage hero
  //   * /hero-mobile.webp   — same, mobile breakpoint
  const heroLandscape = await fs.readFile(
    path.join(PHOTOSHOOT_DIR, 'group_hoodies_trio-brown-black-olive_graffiti-laughing_landscape.jpg'),
  )

  const og = await processVariant(heroLandscape, 'og', { focalY: 0.4 })
  await fs.writeFile(path.join(PUBLIC_DIR, 'og-default.jpg'), og.buffer)
  console.log(`  · /public/og-default.jpg (${(og.buffer.length / 1024).toFixed(0)} KB)`)

  const heroDesktop = await processVariant(heroLandscape, 'desktop')
  await fs.writeFile(path.join(PUBLIC_DIR, 'hero-desktop.webp'), heroDesktop.buffer)
  console.log(`  · /public/hero-desktop.webp (${(heroDesktop.buffer.length / 1024).toFixed(0)} KB)`)

  const heroMobileBuf = await fs.readFile(
    path.join(PHOTOSHOOT_DIR, 'hero_hoodie_olive-front-trio_graffiti-formation_portrait.jpg'),
  )
  const heroMobile = await processVariant(heroMobileBuf, 'mobile')
  await fs.writeFile(path.join(PUBLIC_DIR, 'hero-mobile.webp'), heroMobile.buffer)
  console.log(`  · /public/hero-mobile.webp (${(heroMobile.buffer.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  console.log(`Deploying ${ASSETS.length} assets …\n`)
  const urlMap: UrlMap = {}
  for (const asset of ASSETS) {
    console.log(`▶ ${asset.tag}  (${asset.source})`)
    urlMap[asset.tag] = await uploadAsset(asset)
  }
  console.log('\nWriting /public fallbacks …')
  await writeStaticPublic()

  const outputJson = path.join(__dirname, 'photoshoot-urls.json')
  await fs.writeFile(outputJson, JSON.stringify(urlMap, null, 2))
  console.log(`\n✓ Wrote ${outputJson}`)
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\n✗ deploy-photoshoot failed:', err)
  process.exit(1)
})
