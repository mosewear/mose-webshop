/**
 * Shared types and helpers for the lookbook system.
 *
 * The public lookbook page (server-rendered) and the admin page (client
 * CRUD) both import from this module to keep the schema in lock-step
 * with the database. Fetch helpers are defined in server/client pairs
 * so we can share types without forcing 'server-only' into browser
 * bundles.
 */

// -- Core types ---------------------------------------------------------

export type LookbookLayoutVariant =
  | 'wide'
  | 'split-right'
  | 'split-left'
  | 'dark'

export const LAYOUT_VARIANT_OPTIONS: {
  value: LookbookLayoutVariant
  labelNl: string
  labelEn: string
  descriptionNl: string
}[] = [
  {
    value: 'wide',
    labelNl: 'Breed',
    labelEn: 'Wide',
    descriptionNl: 'Volledig beeld breed, caption eronder',
  },
  {
    value: 'split-right',
    labelNl: 'Beeld links / Tekst rechts',
    labelEn: 'Image left / Text right',
    descriptionNl: 'Asymmetrisch 7:5 grid',
  },
  {
    value: 'split-left',
    labelNl: 'Tekst links / Beeld rechts',
    labelEn: 'Text left / Image right',
    descriptionNl: 'Asymmetrisch 5:7 grid (gespiegeld)',
  },
  {
    value: 'dark',
    labelNl: 'Donker (zwart)',
    labelEn: 'Dark (black)',
    descriptionNl: 'Geïnverteerde kleurvariant, voor drama',
  },
]

/**
 * A single editorial meta row, shown in the `THE PIECE` shop-module
 * variant. Admin UI caps at 3 rows per chapter.
 */
export interface ChapterMeta {
  label_nl: string
  label_en: string
  value_nl: string
  value_en: string
}

/**
 * A lookbook chapter as stored in the database.
 */
export interface LookbookChapter {
  id: string
  sort_order: number
  eyebrow_nl: string | null
  eyebrow_en: string | null
  title_nl: string
  title_en: string | null
  caption_nl: string | null
  caption_en: string | null
  hero_image_url: string
  image_focal_x: number
  image_focal_y: number
  layout_variant: LookbookLayoutVariant
  ticker_text_nl: string | null
  ticker_text_en: string | null
  meta: ChapterMeta[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * A minimal product snapshot included with a chapter, enough to render
 * any of the three shop-module variants without further round-trips.
 */
export interface ChapterProduct {
  id: string
  slug: string
  name: string
  name_en: string | null
  base_price: number
  sale_price: number | null
  primary_image_url: string | null
  secondary_image_url: string | null
  variant_colors: { color: string; color_hex: string | null }[]
  sort_order: number
  is_active: boolean
  status: string
}

/**
 * A chapter with its linked products, already ordered and filtered.
 */
export interface LookbookChapterWithProducts extends LookbookChapter {
  products: ChapterProduct[]
}

// -- Shop-module variant classifier ------------------------------------

export type ShopModuleVariant = 'none' | 'piece' | 'outfit' | 'look'

/**
 * Picks the right shop-module variant based on how many products a
 * chapter has linked. This is the single source of truth used by both
 * the public renderer and the admin preview badge.
 */
export function resolveShopModuleVariant(count: number): ShopModuleVariant {
  if (count <= 0) return 'none'
  if (count === 1) return 'piece'
  if (count <= 3) return 'outfit'
  return 'look'
}

export function shopModuleVariantLabel(
  variant: ShopModuleVariant,
  locale: 'nl' | 'en' = 'nl',
): string {
  const map = {
    none: { nl: 'Geen producten gekoppeld', en: 'No products linked' },
    piece: { nl: 'THE PIECE', en: 'THE PIECE' },
    outfit: { nl: 'THE OUTFIT', en: 'THE OUTFIT' },
    look: { nl: 'SHOP THE LOOK', en: 'SHOP THE LOOK' },
  }
  return map[variant][locale]
}

// -- Locale helpers ----------------------------------------------------

export function pickLocalized(
  nl: string | null | undefined,
  en: string | null | undefined,
  locale: 'nl' | 'en',
): string {
  if (locale === 'en') {
    const trimmed = (en ?? '').trim()
    if (trimmed.length > 0) return trimmed
  }
  return (nl ?? '').trim()
}
