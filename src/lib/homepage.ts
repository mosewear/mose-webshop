import { createClient } from '@/lib/supabase/client'

export interface HomepageSettings {
  // Hero
  hero_badge_text: string
  hero_title_line1: string
  hero_title_line2: string
  hero_subtitle: string
  hero_cta1_text: string
  hero_cta1_link: string
  hero_cta2_text: string
  hero_cta2_link: string
  hero_image_url: string
  // Stats
  stats_1_number: string
  stats_1_text: string
  stats_2_text: string
  stats_3_number: string
  stats_3_text: string
  // Trust Badges
  trust_badge_1: string
  trust_badge_2_prefix: string
  trust_badge_3_suffix: string
  trust_badge_4: string
  // Featured Products
  featured_label: string
  featured_title: string
  featured_description: string
  featured_product_1_id: string | null
  featured_product_2_id: string | null
  featured_product_3_id: string | null
  // Categories
  categories_title: string
  categories_description: string
  category_1_id: string | null
  category_2_id: string | null
  category_3_id: string | null
  category_4_id: string | null
  // Story
  story_badge: string
  story_title_line1: string
  story_title_line2: string
  story_paragraph1: string
  story_paragraph2: string
  story_stat1_label: string
  story_stat1_sublabel: string
  story_stat2_label: string
  story_stat2_sublabel: string
  story_stat3_label: string
  story_stat3_sublabel: string
  story_cta_text: string
  story_cta_link: string
  story_image_url: string
  story_founded_year: string
  // Newsletter
  newsletter_title: string
  newsletter_description1: string
  newsletter_description2: string
  newsletter_input_placeholder: string
  newsletter_button_text: string
  newsletter_trust_text: string
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('*')
      .single()

    if (error) throw error
    return data as HomepageSettings
  } catch (error) {
    console.error('Error fetching homepage settings:', error)
    // Return defaults if fetch fails
    return {
      hero_badge_text: 'Gemaakt in Groningen',
      hero_title_line1: 'GEEN POESPAS.',
      hero_title_line2: 'WEL KARAKTER.',
      hero_subtitle: 'Lokaal gemaakt. Kwaliteit die blijft.',
      hero_cta1_text: 'Shop MOSE',
      hero_cta1_link: '/shop',
      hero_cta2_text: 'Bekijk Lookbook',
      hero_cta2_link: '/lookbook',
      hero_image_url: '/hero_mose.png',
      stats_1_number: '100%',
      stats_1_text: 'Lokaal geproduceerd',
      stats_2_text: 'Dagen retourrecht',
      stats_3_number: '∞',
      stats_3_text: 'Premium kwaliteit',
      trust_badge_1: 'Lokaal gemaakt',
      trust_badge_2_prefix: 'Gratis verzending vanaf',
      trust_badge_3_suffix: 'dagen retour',
      trust_badge_4: 'Veilig betalen',
      featured_label: 'Bestsellers',
      featured_title: 'ESSENTIALS DIE BLIJVEN',
      featured_description: 'No-nonsense basics die jarenlang meegaan',
      featured_product_1_id: null,
      featured_product_2_id: null,
      featured_product_3_id: null,
      categories_title: 'SHOP OP CATEGORIE',
      categories_description: 'Ontdek onze collectie',
      category_1_id: null,
      category_2_id: null,
      category_3_id: null,
      category_4_id: null,
      story_badge: 'Ons Verhaal',
      story_title_line1: 'GEMAAKT IN',
      story_title_line2: 'GRONINGEN',
      story_paragraph1: 'Geen poespas. Alleen karakter. We maken kleding die lang meegaat, lokaal geproduceerd zonder compromissen op kwaliteit.',
      story_paragraph2: 'Premium basics met een ziel. Gebouwd voor het echte leven.',
      story_stat1_label: '100% Lokaal',
      story_stat1_sublabel: 'Made in NL',
      story_stat2_label: '14 Dagen',
      story_stat2_sublabel: 'Retourrecht',
      story_stat3_label: 'Premium',
      story_stat3_sublabel: 'Materialen',
      story_cta_text: 'Lees ons verhaal',
      story_cta_link: '/over-mose',
      story_image_url: '/hoodieblack.png',
      story_founded_year: '2020',
      newsletter_title: 'JOIN THE PACK',
      newsletter_description1: 'Nieuws over drops, restocks en het atelier.',
      newsletter_description2: 'Geen spam — alleen MOSE.',
      newsletter_input_placeholder: 'Jouw e-mailadres',
      newsletter_button_text: 'Join nu',
      newsletter_trust_text: 'We respecteren je privacy. Geen spam, afmelden kan altijd.',
    }
  }
}

export async function getFeaturedProducts(productIds: (string | null)[]) {
  const supabase = createClient()
  
  const validIds = productIds.filter((id): id is string => id !== null)
  
  if (validIds.length === 0) return []
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        base_price,
        product_images!inner(url, is_primary)
      `)
      .in('id', validIds)
      .eq('product_images.is_primary', true)

    if (error) throw error
    
    // Maintain order based on input
    return validIds.map(id => data?.find(p => p.id === id)).filter(Boolean)
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
}

export async function getCategoryData(categoryIds: (string | null)[]) {
  const supabase = createClient()
  
  const validIds = categoryIds.filter((id): id is string => id !== null)
  
  if (validIds.length === 0) return []
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .in('id', validIds)

    if (error) throw error
    
    // Maintain order based on input
    return validIds.map(id => data?.find(c => c.id === id)).filter(Boolean)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

