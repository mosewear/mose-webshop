import { createClient } from '@/lib/supabase/server'

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
  stats_3_icon: string
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

export async function getHomepageSettings(locale: string = 'nl'): Promise<HomepageSettings> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('*')
      .single()

    if (error) throw error
    
    // If English locale, use _en fields when available, fallback to Dutch
    if (locale === 'en' && data) {
      return {
        hero_badge_text: data.hero_badge_text_en || data.hero_badge_text,
        hero_title_line1: data.hero_title_line1_en || data.hero_title_line1,
        hero_title_line2: data.hero_title_line2_en || data.hero_title_line2,
        hero_subtitle: data.hero_subtitle_en || data.hero_subtitle,
        hero_cta1_text: data.hero_cta1_text_en || data.hero_cta1_text,
        hero_cta1_link: data.hero_cta1_link,
        hero_cta2_text: data.hero_cta2_text_en || data.hero_cta2_text,
        hero_cta2_link: data.hero_cta2_link,
        hero_image_url: data.hero_image_url,
        stats_1_number: data.stats_1_number,
        stats_1_text: data.stats_1_text_en || data.stats_1_text,
        stats_2_text: data.stats_2_text_en || data.stats_2_text,
        stats_3_number: data.stats_3_number,
        stats_3_text: data.stats_3_text_en || data.stats_3_text,
        stats_3_icon: data.stats_3_icon,
        trust_badge_1: data.trust_badge_1_en || data.trust_badge_1,
        trust_badge_2_prefix: data.trust_badge_2_prefix_en || data.trust_badge_2_prefix,
        trust_badge_3_suffix: data.trust_badge_3_suffix_en || data.trust_badge_3_suffix,
        trust_badge_4: data.trust_badge_4_en || data.trust_badge_4,
        featured_label: data.featured_label_en || data.featured_label,
        featured_title: data.featured_title_en || data.featured_title,
        featured_description: data.featured_description_en || data.featured_description,
        featured_product_1_id: data.featured_product_1_id,
        featured_product_2_id: data.featured_product_2_id,
        featured_product_3_id: data.featured_product_3_id,
        categories_title: data.categories_title_en || data.categories_title,
        categories_description: data.categories_description_en || data.categories_description,
        category_1_id: data.category_1_id,
        category_2_id: data.category_2_id,
        category_3_id: data.category_3_id,
        category_4_id: data.category_4_id,
        story_badge: data.story_badge_en || data.story_badge,
        story_title_line1: data.story_title_line1_en || data.story_title_line1,
        story_title_line2: data.story_title_line2_en || data.story_title_line2,
        story_paragraph1: data.story_paragraph1_en || data.story_paragraph1,
        story_paragraph2: data.story_paragraph2_en || data.story_paragraph2,
        story_stat1_label: data.story_stat1_label_en || data.story_stat1_label,
        story_stat1_sublabel: data.story_stat1_sublabel_en || data.story_stat1_sublabel,
        story_stat2_label: data.story_stat2_label_en || data.story_stat2_label,
        story_stat2_sublabel: data.story_stat2_sublabel_en || data.story_stat2_sublabel,
        story_stat3_label: data.story_stat3_label_en || data.story_stat3_label,
        story_stat3_sublabel: data.story_stat3_sublabel_en || data.story_stat3_sublabel,
        story_cta_text: data.story_cta_text_en || data.story_cta_text,
        story_cta_link: data.story_cta_link,
        story_image_url: data.story_image_url,
        story_founded_year: data.story_founded_year,
        newsletter_title: data.newsletter_title_en || data.newsletter_title,
        newsletter_description1: data.newsletter_description1_en || data.newsletter_description1,
        newsletter_description2: data.newsletter_description2_en || data.newsletter_description2,
        newsletter_input_placeholder: data.newsletter_input_placeholder_en || data.newsletter_input_placeholder,
        newsletter_button_text: data.newsletter_button_text_en || data.newsletter_button_text,
        newsletter_trust_text: data.newsletter_trust_text_en || data.newsletter_trust_text,
      } as HomepageSettings
    }
    
    return data as HomepageSettings
  } catch (error) {
    console.error('Error fetching homepage settings:', error)
    // Return locale-specific defaults if fetch fails
    if (locale === 'en') {
      return {
        hero_badge_text: 'Made in Groningen',
        hero_title_line1: 'NO NONSENSE.',
        hero_title_line2: 'PURE CHARACTER.',
        hero_subtitle: 'Locally made. Quality that lasts.',
        hero_cta1_text: 'Shop MOSE',
        hero_cta1_link: '/shop',
        hero_cta2_text: 'View Lookbook',
        hero_cta2_link: '/lookbook',
        hero_image_url: '/hero_mose.png',
        stats_1_number: '100%',
        stats_1_text: 'Locally produced',
        stats_2_text: 'Days return',
        stats_3_number: '∞',
        stats_3_text: 'Premium quality',
        stats_3_icon: 'Star',
        trust_badge_1: 'Locally made',
        trust_badge_2_prefix: 'Free shipping from',
        trust_badge_3_suffix: 'days return',
        trust_badge_4: 'Secure payment',
        featured_label: 'Bestsellers',
        featured_title: 'ESSENTIALS THAT LAST',
        featured_description: 'No-nonsense basics that last for years',
        featured_product_1_id: null,
        featured_product_2_id: null,
        featured_product_3_id: null,
        categories_title: 'SHOP BY CATEGORY',
        categories_description: 'Discover our collection',
        category_1_id: null,
        category_2_id: null,
        category_3_id: null,
        category_4_id: null,
        story_badge: 'Our Story',
        story_title_line1: 'MADE IN',
        story_title_line2: 'GRONINGEN',
        story_paragraph1: 'No nonsense. Just character. We make clothing that lasts, locally produced without compromising on quality.',
        story_paragraph2: 'Premium basics with soul. Built for real life.',
        story_stat1_label: '100% Local',
        story_stat1_sublabel: 'Made in NL',
        story_stat2_label: '14 Days',
        story_stat2_sublabel: 'Returns',
        story_stat3_label: 'Premium',
        story_stat3_sublabel: 'Materials',
        story_cta_text: 'Read our story',
        story_cta_link: '/over-mose',
        story_image_url: '/hoodieblack.png',
        story_founded_year: '2020',
        newsletter_title: 'JOIN THE PACK',
        newsletter_description1: 'News about drops, restocks and the workshop.',
        newsletter_description2: 'No spam — just MOSE.',
        newsletter_input_placeholder: 'Your email address',
        newsletter_button_text: 'Join now',
        newsletter_trust_text: 'We respect your privacy. No spam, unsubscribe anytime.',
      }
    }
    
    // Return Dutch defaults
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
      stats_3_icon: 'Star',
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

export async function getFeaturedProducts(productIds: (string | null)[], locale: string = 'nl') {
  const supabase = await createClient()
  
  const validIds = productIds.filter((id): id is string => id !== null)
  
  if (validIds.length === 0) {
    return []
  }
  
  try {
    // ✅ PARALLEL QUERIES - 3x faster!
    const [
      { data: productsData, error: productsError },
      { data: imagesData, error: imagesError },
      { data: variantsData, error: variantsError }
    ] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, name_en, slug, base_price, sale_price')
        .in('id', validIds),
      supabase
        .from('product_images')
        .select('product_id, url, is_primary')
        .in('product_id', validIds),
      supabase
        .from('product_variants')
        .select('product_id, size, color, stock_quantity')
        .in('product_id', validIds)
    ])

    if (productsError) {
      console.error('Products query error:', productsError)
      throw productsError
    }
    
    if (!productsData || productsData.length === 0) {
      return []
    }

    if (imagesError) {
      console.error('Images query error:', imagesError)
    }

    if (variantsError) {
      console.error('Variants query error:', variantsError)
    }
    
    // Combine the data
    const products = productsData.map(p => {
      const productImages = imagesData?.filter(img => img.product_id === p.id) || []
      const productVariants = variantsData?.filter(v => v.product_id === p.id) || []
      const primaryImage = productImages.find(img => img.is_primary)
      
      // Calculate total stock from variants
      const totalStock = productVariants.reduce((sum, variant) => sum + (variant.stock_quantity || 0), 0)
      
      return {
        id: p.id,
        name: locale === 'en' && p.name_en ? p.name_en : p.name,
        slug: p.slug,
        price: p.base_price,
        sale_price: p.sale_price,
        stock_quantity: totalStock, // Calculated from variants
        image_url: primaryImage?.url || productImages[0]?.url || '/placeholder.png',
        images: productImages,
        variants: productVariants,
      }
    })
    
    // Maintain order based on input
    return validIds.map(id => products.find(p => p.id === id)).filter(Boolean)
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
}

export async function getCategoryData(categoryIds: (string | null)[], locale: string = 'nl') {
  const supabase = await createClient()
  
  const validIds = categoryIds.filter((id): id is string => id !== null)
  
  if (validIds.length === 0) return []
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, name_en, slug, image_url, description, description_en')
      .in('id', validIds)

    if (error) throw error
    
    // Map to localized data
    const localizedData = data?.map(c => ({
      id: c.id,
      name: locale === 'en' && c.name_en ? c.name_en : c.name,
      slug: c.slug,
      image_url: c.image_url,
      description: locale === 'en' && c.description_en ? c.description_en : c.description,
    }))
    
    // Maintain order based on input
    return validIds.map(id => localizedData?.find(c => c.id === id)).filter(Boolean)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

