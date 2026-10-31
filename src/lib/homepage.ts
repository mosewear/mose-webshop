import { createAnonClient } from '@/lib/supabase/server'

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
  hero_image_url_mobile: string | null
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
  const supabase = createAnonClient()
  
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
        hero_image_url_mobile: data.hero_image_url_mobile ?? null,
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
        hero_badge_text: "MENSWEAR WITH CHARACTER",
        hero_title_line1: 'NO NONSENSE.',
        hero_title_line2: 'PURE CHARACTER.',
        hero_subtitle: "Substantial hoodies, good shirts and trousers with a distinctive fit.",
        hero_cta1_text: 'Shop MOSE',
        hero_cta1_link: '/shop',
        hero_cta2_text: 'View Lookbook',
        hero_cta2_link: '/lookbook',
        hero_image_url: '/campaign/mose-hero-desktop-2026-10.webp',
        hero_image_url_mobile: "/campaign/mose-hero-mobile-2026-10.webp",
        stats_1_number: '100%',
        stats_1_text: "Your own style",
        stats_2_text: 'Days return',
        stats_3_number: '∞',
        stats_3_text: 'Premium quality',
        stats_3_icon: 'Star',
        trust_badge_1: "Clothes with character",
        trust_badge_2_prefix: 'Free shipping from',
        trust_badge_3_suffix: 'days return',
        trust_badge_4: 'Secure payment',
        featured_label: 'Bestsellers',
        featured_title: "FIND YOUR FAVOURITE",
        featured_description: "Good basics and distinctive fits. Explore the MOSE collection.",
        featured_product_1_id: null,
        featured_product_2_id: null,
        featured_product_3_id: null,
        categories_title: 'SHOP BY CATEGORY',
        categories_description: 'Discover our collection',
        category_1_id: null,
        category_2_id: null,
        category_3_id: null,
        category_4_id: null,
        story_badge: "This is MOSE",
        story_title_line1: "GOOD CLOTHES.",
        story_title_line2: "DISTINCT CHARACTER.",
        story_paragraph1: "MOSE is for men who appreciate good clothes. From a substantial T-shirt and a comfortable hoodie to trousers with a relaxed fit. Understated colours, strong shapes.",
        story_paragraph2: "We look at the fit, the feel of the fabric and how the pieces work together. A collection you can make your own.",
        story_stat1_label: "Fit",
        story_stat1_sublabel: "Room to move",
        story_stat2_label: "Details",
        story_stat2_sublabel: "Subtle and considered",
        story_stat3_label: "Character",
        story_stat3_sublabel: "Your way",
        story_cta_text: "More about MOSE",
        story_cta_link: '/over-mose',
        story_image_url: "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp",
        story_founded_year: '2020',
        newsletter_title: "NEWS FROM MOSE",
        newsletter_description1: "New clothes, restocked sizes and inspiration from the collection.",
        newsletter_description2: "An occasional email from us. Unsubscribe at any time.",
        newsletter_input_placeholder: 'Your email address',
        newsletter_button_text: "Sign up",
        newsletter_trust_text: 'We respect your privacy. No spam, unsubscribe anytime.',
      }
    }
    
    // Return Dutch defaults
    return {
      hero_badge_text: "MANNENKLEDING MET KARAKTER",
      hero_title_line1: 'GEEN POESPAS.',
      hero_title_line2: 'WEL KARAKTER.',
      hero_subtitle: "Stevige hoodies, goede shirts en broeken met een eigen pasvorm.",
      hero_cta1_text: 'Shop MOSE',
      hero_cta1_link: '/shop',
      hero_cta2_text: 'Bekijk Lookbook',
      hero_cta2_link: '/lookbook',
      hero_image_url: '/campaign/mose-hero-desktop-2026-10.webp',
      hero_image_url_mobile: "/campaign/mose-hero-mobile-2026-10.webp",
      stats_1_number: '100%',
      stats_1_text: "Eigen stijl",
      stats_2_text: 'Dagen retourrecht',
      stats_3_number: '∞',
      stats_3_text: 'Premium kwaliteit',
      stats_3_icon: 'Star',
      trust_badge_1: "Kleding met karakter",
      trust_badge_2_prefix: 'Gratis verzending vanaf',
      trust_badge_3_suffix: 'dagen retour',
      trust_badge_4: 'Veilig betalen',
      featured_label: 'Bestsellers',
      featured_title: "VIND JOUW FAVORIET",
      featured_description: "Goede basics en uitgesproken pasvormen. Ontdek de collectie van MOSE.",
      featured_product_1_id: null,
      featured_product_2_id: null,
      featured_product_3_id: null,
      categories_title: 'SHOP OP CATEGORIE',
      categories_description: 'Ontdek onze collectie',
      category_1_id: null,
      category_2_id: null,
      category_3_id: null,
      category_4_id: null,
      story_badge: "Dit is MOSE",
      story_title_line1: "GOEDE KLEDING.",
      story_title_line2: "EIGEN KARAKTER.",
      story_paragraph1: "MOSE is er voor mannen die houden van goede kleding. Van een stevig T-shirt en een comfortabele hoodie tot een broek met een ruimere pasvorm. Rustig in kleur, sterk in vorm.",
      story_paragraph2: "We letten op hoe iets zit, hoe de stof aanvoelt en hoe je het combineert. Zo ontstaat een collectie die je makkelijk naar je eigen hand zet.",
      story_stat1_label: "Pasvorm",
      story_stat1_sublabel: "Ruimte om te bewegen",
      story_stat2_label: "Details",
      story_stat2_sublabel: "Subtiel en verzorgd",
      story_stat3_label: "Karakter",
      story_stat3_sublabel: "Op jouw manier",
      story_cta_text: "Meer over MOSE",
      story_cta_link: '/over-mose',
      story_image_url: "https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp",
      story_founded_year: '2020',
      newsletter_title: "NIEUWS VAN MOSE",
      newsletter_description1: "Nieuwe kleding, aangevulde maten en inspiratie uit de collectie.",
      newsletter_description2: "Af en toe een mail van ons. Uitschrijven kan altijd.",
      newsletter_input_placeholder: 'Jouw e-mailadres',
      newsletter_button_text: "Aanmelden",
      newsletter_trust_text: 'We respecteren je privacy. Geen spam, afmelden kan altijd.',
    }
  }
}

export async function getFeaturedProducts(productIds: (string | null)[], locale: string = 'nl') {
  const supabase = createAnonClient()
  
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
        .in('id', validIds)
        // Een uitgelicht product dat later op concept gaat, verdwijnt zo
        // vanzelf van de homepage in plaats van naar een dode pagina te linken.
        .eq('is_active', true)
        .eq('status', 'active'),
      supabase
        .from('product_images')
        .select('product_id, url, is_primary, media_type')
        .in('product_id', validIds),
      supabase
        .from('product_variants')
        .select('product_id, size, color, stock_quantity, presale_stock_quantity')
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
      const allImages = imagesData?.filter(img => img.product_id === p.id) || []
      const productImages = allImages.filter(img => img.media_type !== 'video')
      const productVariants = variantsData?.filter(v => v.product_id === p.id) || []
      const primaryImage = productImages.find(img => img.is_primary)
      
      // Calculate total stock from variants (regular + presale)
      const totalStock = productVariants.reduce((sum, variant) => sum + (variant.stock_quantity || 0), 0)
      const totalPresaleStock = productVariants.reduce((sum, variant) => sum + (variant.presale_stock_quantity || 0), 0)
      
      return {
        id: p.id,
        name: locale === 'en' && p.name_en ? p.name_en : p.name,
        slug: p.slug,
        price: p.base_price,
        sale_price: p.sale_price,
        stock_quantity: totalStock, // Regular stock
        presale_stock_quantity: totalPresaleStock, // Presale stock
        image_url: primaryImage?.url || productImages[0]?.url || '/placeholder-product.svg',
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
  const supabase = createAnonClient()
  
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

