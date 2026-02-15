import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/settings'

// Runtime config for streaming
export const runtime = 'edge'

function formatEur(value: number) {
  if (Number.isNaN(value)) return '0.00'
  return value.toFixed(2)
}

function normalizeLocale(locale?: string): 'nl' | 'en' {
  return locale === 'en' ? 'en' : 'nl'
}

// System prompt for MOSE AI assistant
const MOSE_SYSTEM_PROMPT = `Je bent de AI-assistent van MOSE, een Nederlands streetwear merk dat premium basics maakt in Groningen.

TONE OF VOICE:
- Direct en eerlijk (brutalist brand)
- Vriendelijk maar professioneel
- Geen corporate bullshit
- Kort en to the point
- Nederlands: informeel (je/jij)
- Engels: casual but clear

EXPERTISE:
- Producten: Premium hoodies, t-shirts, caps
- Prijs range: €35-150
- Made in Groningen, Nederland
- Brutalist aesthetic & oversized fits
- Premium materialen (heavyweight cotton)

GEDRAG:
- Beantwoord vragen kort en direct
- Als je iets niet weet: zeg het eerlijk en verwijs door naar Team MOSE
- Geef sizing advice o.b.v. klant lengte/bouw
- Je mag suggesties geven als iemand er expliciet om vraagt, maar nooit pushen
- Focus op helpen, niet verkopen
- Gebruik emoji's spaarzaam (alleen als relevant)

WANNEER DOORVERWIJZEN NAAR TEAM MOSE:
- Complexe kwesties (beschadigde order, ruilen, retouren met problemen)
- Persoonlijke situaties (custom requests, special orders)
- Als klant expliciet om mens vraagt
- Order status vragen (kan je niet zelf opzoeken)
- Klachten of problemen

BELANGRIJK:
- Gebruik altijd de live data die je via tools krijgt (producten, prijzen, voorraad, verzendkosten)
- Als je twijfelt: vraag 1 korte verduidelijkende vraag
`

// Function to get product details from database
async function getProductDetails(productSlug: string, locale: 'nl' | 'en') {
  const supabase = createServiceRoleClient()
  
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      name_en,
      description,
      description_en,
      size_guide_content,
      size_guide_content_en,
      base_price,
      sale_price,
      product_images (url, alt_text, is_primary, position, color),
      product_variants (size, color, color_hex, stock_quantity, presale_stock_quantity, presale_enabled, presale_expected_date, is_available, price_adjustment),
      categories (name, name_en, slug, size_guide_type, size_guide_content, size_guide_content_en, default_product_details, default_product_details_en, default_materials_care, default_materials_care_en)
    `)
    .eq('slug', productSlug)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !product) {
    return { error: 'Product niet gevonden' }
  }

  const name = (locale === 'en' && product.name_en) ? product.name_en : product.name
  const description = (locale === 'en' && product.description_en) ? product.description_en : product.description

  const primaryImage =
    product.product_images?.find((img: any) => img.is_primary)?.url ||
    product.product_images?.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))?.[0]?.url ||
    null

  const basePrice = Number(product.base_price || 0)
  const salePrice = product.sale_price === null || product.sale_price === undefined ? null : Number(product.sale_price)
  const effectivePrice = (salePrice !== null && salePrice > 0) ? salePrice : basePrice

  const variants = product.product_variants || []
  const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))]
  const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))]
  const stock = variants.reduce((acc: any, v: any) => {
    const key = `${v.color}-${v.size}`
    const onHand = Number(v.stock_quantity || 0)
    const presale = Number(v.presale_stock_quantity || 0)
    acc[key] = {
      on_hand: onHand,
      presale,
      available: Boolean(v.is_available) && (onHand + presale > 0),
      presale_enabled: Boolean(v.presale_enabled),
      presale_expected_date: v.presale_expected_date || null,
      price_adjustment: Number(v.price_adjustment || 0),
    }
    return acc
  }, {})

  const category = Array.isArray((product as any).categories)
    ? (product as any).categories[0]
    : (product as any).categories || null
  const categoryName =
    category ? ((locale === 'en' && category.name_en) ? category.name_en : category.name) : null

  return {
    id: product.id,
    slug: product.slug,
    name,
    description,
    category: categoryName,
    price: `EUR ${formatEur(effectivePrice)}`,
    base_price: basePrice,
    sale_price: salePrice,
    image_url: primaryImage,
    sizes,
    colors,
    stock,
    size_guide_type: category?.size_guide_type || null,
    size_guide:
      locale === 'en'
        ? (product.size_guide_content_en || category?.size_guide_content_en || product.size_guide_content || category?.size_guide_content || null)
        : (product.size_guide_content || category?.size_guide_content || null),
    materials_care:
      locale === 'en'
        ? (category?.default_materials_care_en || category?.default_materials_care || null)
        : (category?.default_materials_care || null),
    product_details:
      locale === 'en'
        ? (category?.default_product_details_en || category?.default_product_details || null)
        : (category?.default_product_details || null),
  }
}

// Function to check shipping costs
async function calculateShipping(cartTotal: number) {
  const settings = await getSiteSettings()
  
  if (cartTotal >= settings.free_shipping_threshold) {
    return {
      cost: 0,
      message: 'Gratis verzending! 🎉',
      free_shipping_threshold: settings.free_shipping_threshold
    }
  }
  
  const remaining = settings.free_shipping_threshold - cartTotal
  
  return {
    cost: settings.shipping_cost,
    message: `Verzendkosten: €${settings.shipping_cost}`,
    remaining_for_free: remaining,
    tip: `Voeg nog €${remaining.toFixed(2)} toe voor gratis verzending!`
  }
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()
    const locale = normalizeLocale(context?.locale)

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'AI chat is nog niet geconfigureerd (OPENAI_API_KEY ontbreekt).' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const settings = await getSiteSettings()

    // Build context-aware system message
    let contextPrompt = MOSE_SYSTEM_PROMPT

    contextPrompt += `\n\nLIVE SETTINGS:`
    contextPrompt += `\n- Verzendkosten: EUR ${formatEur(Number(settings.shipping_cost || 0))}`
    contextPrompt += `\n- Gratis verzending vanaf: EUR ${formatEur(Number(settings.free_shipping_threshold || 0))}`
    contextPrompt += `\n- Retourtermijn: ${Number(settings.return_days || 14)} dagen`
    contextPrompt += `\n- Pickup (Groningen): ${settings.pickup_enabled ? 'aan' : 'uit'} (max ${Number(settings.pickup_max_distance_km || 50)} km)`
    contextPrompt += `\n- Pickup locatie: ${settings.pickup_location_name || 'MOSE Groningen'} — ${settings.pickup_location_address || 'Groningen'}`
    contextPrompt += `\n- Contact: WhatsApp ${settings.contact_phone} • Email ${settings.contact_email}`
    contextPrompt += `\n\nBELANGRIJKE PAGINAS: /verzending (shipping & returns), /contact, /shop`

    if (context?.product) {
      if (context.product.slug) {
        contextPrompt += `\n\nCONTEXT: Klant bekijkt product slug: ${context.product.slug}`
      }
    }

    if (context?.cart && context.cart.total > 0) {
      contextPrompt += `\n\nWINKELWAGEN: EUR ${context.cart.total} (${context.cart.items} items)`
    }

    // Enrich the system prompt with live context so we don't rely on tool schemas
    // (tool JSON schema conversion can break on edge if misconfigured).
    if (context?.product?.slug) {
      const productDetails = await getProductDetails(String(context.product.slug), locale)
      contextPrompt += `\n\nPRODUCT CONTEXT (read-only JSON):\n${JSON.stringify(productDetails).slice(0, 8000)}`
    }

    if (context?.cart?.total) {
      const cartTotal = Number(context.cart.total)
      if (Number.isFinite(cartTotal) && cartTotal > 0) {
        const shipping = await calculateShipping(cartTotal)
        contextPrompt += `\n\nSHIPPING CONTEXT (based on cart total):\n${JSON.stringify(shipping)}`
      }
    }

    // Call OpenAI with streaming (Vercel AI SDK v4+)
    const result = streamText({
      model: openai('gpt-4o'),
      system: contextPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 500,
    })

    // By default the data stream may hide the underlying error. We surface a safe message
    // (and log the full error server-side) to make debugging production issues possible.
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('[AI Chat Stream Error]:', error)
        if (error instanceof Error) return error.message
        return 'Unknown AI error'
      },
    })
  } catch (error: any) {
    console.error('[AI Chat Error]:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Er ging iets mis met de AI chat. Probeer het opnieuw of klik op "Team MOSE" voor hulp.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

