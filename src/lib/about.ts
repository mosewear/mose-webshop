import { createAnonClient } from '@/lib/supabase/server'

/**
 * Locale-resolved settings powering the public /over-mose page.
 *
 * Source of truth lives in the `about_settings` table (single row).
 * Editors manage everything from /admin/about; this helper reads the
 * row and resolves all text fields to a single locale (Dutch by
 * default, English with NL fallback).
 *
 * If the row cannot be loaded (e.g. fresh install before the migration
 * runs in this environment) we fall back to a hard-coded copy block so
 * the page never crashes.
 */
export interface AboutSettings {
  // Hero
  hero_image_url: string
  hero_image_url_mobile: string | null
  image_focal_x: number
  image_focal_y: number
  hero_alt: string
  hero_title: string
  hero_subtitle: string
  // Story
  story_title: string
  story_paragraph1: string
  story_paragraph2: string
  // Local
  local_title: string
  local_text: string
  // Values
  values_title: string
  value_quality_title: string
  value_quality_text: string
  value_local_made_title: string
  value_local_made_text: string
  value_fair_pricing_title: string
  value_fair_pricing_text: string
  value_no_hassle_title: string
  /** May contain {days} and {threshold} placeholders. */
  value_no_hassle_text: string
  // Why
  why_title: string
  why_sustainable_title: string
  why_sustainable_text: string
  why_stylish_title: string
  why_stylish_text: string
  why_local_title: string
  why_local_text: string
  // CTA
  cta_text: string
}

type Locale = 'nl' | 'en'

const pick = <T,>(en: T | null | undefined, nl: T, locale: Locale): T => {
  if (locale !== 'en') return nl
  if (en === null || en === undefined) return nl
  if (typeof en === 'string' && en.trim() === '') return nl
  return en
}

const DEFAULT_HERO_DESKTOP =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp'

function fallback(locale: Locale): AboutSettings {
  return locale === 'en'
    ? {
    "hero_image_url": "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp",
    "hero_image_url_mobile": "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp",
    "image_focal_x": 50,
    "image_focal_y": 45,
    "hero_alt": "Two men wearing MOSE hoodies",
    "hero_title": "ABOUT MOSE",
    "hero_subtitle": "No nonsense. Pure character.",
    "story_title": "GOOD CLOTHES. EVERY DAY.",
    "story_paragraph1": "MOSE makes clothes for men who appreciate a substantial hoodie, a good T-shirt and comfortable trousers. Clear shapes, understated colours and considered details. Clothes that are easy to combine and easy to reach for.",
    "story_paragraph2": "It starts with the fit and feel. Room where you need it, a substantial fabric and a logo that does not demand attention. From a simple Tee to a boxy hoodie or barrel jeans, each style has its own shape and character.",
    "local_title": "NO NONSENSE. PURE CHARACTER.",
    "local_text": "A good outfit comes down to how you put it together. A favourite shirt and jeans. A hoodie for heading out. A sweater you can pull on and go. MOSE gives you the foundation; you make it your own.",
    "values_title": "WHAT WE LOOK FOR",
    "value_quality_title": "The fabric",
    "value_quality_text": "The feel and drape of a fabric matter. Each product lists its composition and material details.",
    "value_local_made_title": "The fit",
    "value_local_made_text": "From regular to boxy and relaxed. The shape should suit the garment. Use the size chart to find your fit.",
    "value_fair_pricing_title": "The details",
    "value_fair_pricing_text": "Understated colours, subtle logos and considered finishing. Enough to give each piece its own character.",
    "value_no_hassle_title": "Straightforward service",
    "value_no_hassle_text": "Need help with a size or an order? Get in touch. You have {days} days to register your return.",
    "why_title": "THIS IS MOSE",
    "why_sustainable_title": "For every day",
    "why_sustainable_text": "Clothes for the days when you want to look good without overthinking it.",
    "why_stylish_title": "Easy to combine",
    "why_stylish_text": "Hoodies, shirts, sweaters and trousers that work together and with the clothes you already wear.",
    "why_local_title": "A character of its own",
    "why_local_text": "Strong shapes and understated details. A rugged look without the noise.",
    "cta_text": "Explore the collection"
}
    : {
    "hero_image_url": "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp",
    "hero_image_url_mobile": "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp",
    "image_focal_x": 50,
    "image_focal_y": 45,
    "hero_alt": "Twee mannen in MOSE hoodies",
    "hero_title": "OVER MOSE",
    "hero_subtitle": "Geen poespas. Wel karakter.",
    "story_title": "GOEDE KLEDING. ELKE DAG.",
    "story_paragraph1": "MOSE maakt kleding voor mannen die houden van een stevige hoodie, een goed T-shirt en een broek die lekker zit. Duidelijke vormen, rustige kleuren en details die het verschil maken. Kleding die je makkelijk combineert en graag uit je kast pakt.",
    "story_paragraph2": "Het begint bij hoe iets valt en aanvoelt. Een ruime pasvorm waar dat past, een stevige stof en een logo dat niet alle aandacht opeist. Van een eenvoudige Tee tot een boxy hoodie of barrel jeans: elk model heeft zijn eigen vorm en karakter.",
    "local_title": "GEEN POESPAS. WEL KARAKTER.",
    "local_text": "Voor ons zit een sterke outfit in de combinatie. Een goed shirt op je favoriete jeans. Een hoodie voor onderweg. Een sweater die je zo aantrekt. MOSE geeft je de basis; jij maakt er je eigen outfit van.",
    "values_title": "WAAR WE OP LETTEN",
    "value_quality_title": "De stof",
    "value_quality_text": "Hoe een stof aanvoelt en valt, bepaalt veel. Bij elk artikel vind je de samenstelling en de details van het materiaal.",
    "value_local_made_title": "De pasvorm",
    "value_local_made_text": "Van regular tot boxy en ruimvallend. We kiezen de vorm die bij het kledingstuk past. De maattabel helpt je kiezen.",
    "value_fair_pricing_title": "De details",
    "value_fair_pricing_text": "Rustige kleuren, subtiele logo’s en een verzorgde afwerking. Precies genoeg om het kledingstuk eigen te maken.",
    "value_no_hassle_title": "Duidelijk geregeld",
    "value_no_hassle_text": "Hulp nodig met je maat of bestelling? Neem contact met ons op. Je hebt {days} dagen om je retour aan te melden.",
    "why_title": "DIT IS MOSE",
    "why_sustainable_title": "Voor elke dag",
    "why_sustainable_text": "Kleding voor de dagen waarop je iets goeds aan wilt trekken zonder er lang over na te denken.",
    "why_stylish_title": "Makkelijk te combineren",
    "why_stylish_text": "Hoodies, shirts, sweaters en broeken die samen werken, maar ook bij wat je al draagt.",
    "why_local_title": "Een eigen karakter",
    "why_local_text": "Stevige vormen en ingetogen details. Een stoere uitstraling, zonder dat het schreeuwerig wordt.",
    "cta_text": "Bekijk de collectie"
}
}

export async function getAboutSettings(
  locale: string = 'nl',
): Promise<AboutSettings> {
  const lang: Locale = locale === 'en' ? 'en' : 'nl'

  try {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('about_settings')
      .select('*')
      .limit(1)
      .single()

    if (error || !data) throw error ?? new Error('No about_settings row')

    // Keep an absolute fallback for hero_alt — it's nullable in the schema
    // for editors who haven't filled it yet, but the public <Image> still
    // needs a string for a11y.
    const altFallback =
      lang === 'en'
        ? 'Two men wearing MOSE hoodies'
        : 'Twee mannen in MOSE hoodies'

    return {
      hero_image_url: data.hero_image_url || DEFAULT_HERO_DESKTOP,
      hero_image_url_mobile: data.hero_image_url_mobile ?? null,
      image_focal_x: typeof data.image_focal_x === 'number' ? data.image_focal_x : 50,
      image_focal_y: typeof data.image_focal_y === 'number' ? data.image_focal_y : 30,
      hero_alt: pick(data.hero_alt_en, data.hero_alt_nl ?? altFallback, lang),
      hero_title: pick(data.hero_title_en, data.hero_title_nl, lang),
      hero_subtitle: pick(data.hero_subtitle_en, data.hero_subtitle_nl, lang),
      story_title: pick(data.story_title_en, data.story_title_nl, lang),
      story_paragraph1: pick(data.story_paragraph1_en, data.story_paragraph1_nl, lang),
      story_paragraph2: pick(data.story_paragraph2_en, data.story_paragraph2_nl, lang),
      local_title: pick(data.local_title_en, data.local_title_nl, lang),
      local_text: pick(data.local_text_en, data.local_text_nl, lang),
      values_title: pick(data.values_title_en, data.values_title_nl, lang),
      value_quality_title: pick(data.value_quality_title_en, data.value_quality_title_nl, lang),
      value_quality_text: pick(data.value_quality_text_en, data.value_quality_text_nl, lang),
      value_local_made_title: pick(data.value_local_made_title_en, data.value_local_made_title_nl, lang),
      value_local_made_text: pick(data.value_local_made_text_en, data.value_local_made_text_nl, lang),
      value_fair_pricing_title: pick(data.value_fair_pricing_title_en, data.value_fair_pricing_title_nl, lang),
      value_fair_pricing_text: pick(data.value_fair_pricing_text_en, data.value_fair_pricing_text_nl, lang),
      value_no_hassle_title: pick(data.value_no_hassle_title_en, data.value_no_hassle_title_nl, lang),
      value_no_hassle_text: pick(data.value_no_hassle_text_en, data.value_no_hassle_text_nl, lang),
      why_title: pick(data.why_title_en, data.why_title_nl, lang),
      why_sustainable_title: pick(data.why_sustainable_title_en, data.why_sustainable_title_nl, lang),
      why_sustainable_text: pick(data.why_sustainable_text_en, data.why_sustainable_text_nl, lang),
      why_stylish_title: pick(data.why_stylish_title_en, data.why_stylish_title_nl, lang),
      why_stylish_text: pick(data.why_stylish_text_en, data.why_stylish_text_nl, lang),
      why_local_title: pick(data.why_local_title_en, data.why_local_title_nl, lang),
      why_local_text: pick(data.why_local_text_en, data.why_local_text_nl, lang),
      cta_text: pick(data.cta_text_en, data.cta_text_nl, lang),
    }
  } catch (err) {
    console.error('Error loading about_settings, using fallback:', err)
    return fallback(lang)
  }
}

/**
 * Vult {days} en {threshold} in de no-hassle tekst.
 *
 * Is verzending altijd gratis, dan vervalt de drempel helemaal. "Gratis
 * verzending vanaf €0" is geen belofte maar een rekenfout, dus die zinsnede
 * wordt dan herschreven in plaats van gevuld.
 */
export function renderNoHassleText(
  template: string,
  days: number,
  threshold: number,
  shippingCost = 0,
): string {
  const altijdGratis = (threshold ?? 0) <= 0 && (shippingCost ?? 0) <= 0
  const basis = altijdGratis
    ? template
        .replace(/gratis verzending vanaf €?\{threshold\}/gi, 'altijd gratis verzending')
        .replace(/free shipping from €?\{threshold\}/gi, 'free shipping, always')
        .replaceAll('{threshold}', String(threshold))
    : template.replaceAll('{threshold}', String(threshold))
  return basis.replaceAll('{days}', String(days))
}
