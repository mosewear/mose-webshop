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
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-desktop.webp'
const DEFAULT_HERO_MOBILE =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-mobile.webp'

function fallback(locale: Locale): AboutSettings {
  if (locale === 'en') {
    return {
      hero_image_url: DEFAULT_HERO_DESKTOP,
      hero_image_url_mobile: DEFAULT_HERO_MOBILE,
      image_focal_x: 50,
      image_focal_y: 30,
      hero_alt: 'MOSE — worn in real life, made in Groningen',
      hero_title: 'ABOUT MOSE',
      hero_subtitle: 'No nonsense. Pure character.',
      story_title: 'OUR STORY',
      story_paragraph1:
        "MOSE was born from frustration. Frustration about fast fashion, throwaway clothing, and brands that make big promises but don't deliver. We believe clothing should simply be good. Period.",
      story_paragraph2:
        "That's why we create premium basics built to last. Clothing without compromises, without nonsense. Rugged, modern, and full of character. Built to stay.",
      local_title: 'LOCALLY MADE IN GRONINGEN',
      local_text:
        "All our products are locally made in Groningen. Not because it's trendy, but because we want to know exactly where our clothing comes from and how it's made. Honest, transparent, and with respect for everyone involved in the process.",
      values_title: 'OUR VALUES',
      value_quality_title: 'Premium quality',
      value_quality_text:
        'Only the finest materials and perfect finishing. Clothing that lasts for years.',
      value_local_made_title: 'Locally made',
      value_local_made_text:
        '100% produced in Groningen. We know everyone who works on your clothing.',
      value_fair_pricing_title: 'Fair pricing',
      value_fair_pricing_text:
        'No inflated prices or fake sales. Just honest pricing for what you get.',
      value_no_hassle_title: 'No hassle',
      value_no_hassle_text:
        '{days} days return policy, free shipping from €{threshold}, and fast customer service. Simple.',
      why_title: 'WHY MOSE?',
      why_sustainable_title: 'Sustainable without the BS',
      why_sustainable_text:
        "We make clothing that lasts. That's the best sustainability.",
      why_stylish_title: 'Rugged yet stylish',
      why_stylish_text:
        'Basics with character. For modern men who know what they want.',
      why_local_title: 'Proudly local',
      why_local_text: 'Made in Groningen, worn throughout the Netherlands.',
      cta_text: 'Discover the collection',
    }
  }

  return {
    hero_image_url: DEFAULT_HERO_DESKTOP,
    hero_image_url_mobile: DEFAULT_HERO_MOBILE,
    image_focal_x: 50,
    image_focal_y: 30,
    hero_alt: 'MOSE — gedragen in het echte leven, gemaakt in Groningen',
    hero_title: 'OVER MOSE',
    hero_subtitle: 'Geen poespas. Wel karakter.',
    story_title: 'ONS VERHAAL',
    story_paragraph1:
      'MOSE is geboren uit frustratie. Frustratie over fast fashion, over wegwerpkleding, over merken die grote beloftes maken maar niet nakomen. Wij geloven dat kleding gewoon goed moet zijn. Punt.',
    story_paragraph2:
      'Daarom maken we premium basics die lang meegaan. Kleding zonder concessies, zonder poespas. Stoer, modern, en met karakter. Gebouwd om te blijven.',
    local_title: 'LOKAAL GEMAAKT IN GRONINGEN',
    local_text:
      'Al onze producten worden lokaal gemaakt in Groningen. Niet omdat het hip is, maar omdat we precies willen weten waar onze kleding vandaan komt en hoe het gemaakt wordt. Eerlijk, transparant, en met respect voor iedereen die eraan werkt.',
    values_title: 'ONZE WAARDEN',
    value_quality_title: 'Premium kwaliteit',
    value_quality_text:
      'Alleen de beste materialen en perfecte afwerking. Kleding die jarenlang meegaat.',
    value_local_made_title: 'Lokaal gemaakt',
    value_local_made_text:
      '100% geproduceerd in Groningen. We kennen iedereen die aan je kleding werkt.',
    value_fair_pricing_title: 'Eerlijke prijzen',
    value_fair_pricing_text:
      'Geen opgeblazen prijzen of fake sales. Gewoon eerlijk geprijsd voor wat je krijgt.',
    value_no_hassle_title: 'Geen gedoe',
    value_no_hassle_text:
      '{days} dagen retour, gratis verzending vanaf €{threshold}, en snelle klantenservice. Simpel.',
    why_title: 'WAAROM MOSE?',
    why_sustainable_title: 'Duurzaam zonder bullshit',
    why_sustainable_text:
      'We maken kleding die lang meegaat. Dat is de beste sustainability.',
    why_stylish_title: 'Stoer maar stijlvol',
    why_stylish_text:
      'Basics met karakter. Voor moderne mannen die weten wat ze willen.',
    why_local_title: 'Trots lokaal',
    why_local_text: 'Gemaakt in Groningen, gedragen door heel Nederland.',
    cta_text: 'Ontdek de collectie',
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
        ? 'MOSE — worn in real life, made in Groningen'
        : 'MOSE — gedragen in het echte leven, gemaakt in Groningen'

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

/** Substitute {days} and {threshold} into the no-hassle copy. */
export function renderNoHassleText(
  template: string,
  days: number,
  threshold: number,
): string {
  return template
    .replaceAll('{days}', String(days))
    .replaceAll('{threshold}', String(threshold))
}
