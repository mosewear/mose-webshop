import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/settings'

// Runtime config for streaming
export const runtime = 'edge'

// Initialize OpenAI (will use OPENAI_API_KEY env variable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

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
- Push NOOIT producten (no sales pitch)
- Focus op helpen, niet verkopen
- Gebruik emoji's spaarzaam (alleen als relevant)

WANNEER DOORVERWIJZEN NAAR TEAM MOSE:
- Complexe kwesties (beschadigde order, ruilen, retouren met problemen)
- Persoonlijke situaties (custom requests, special orders)
- Als klant expliciet om mens vraagt
- Order status vragen (kan je niet zelf opzoeken)
- Klachten of problemen

VERZENDING & RETOUR INFO:
- Verzendkosten: €6.95
- Gratis verzending vanaf: €150
- Levertijd: 1-3 werkdagen (Nederland)
- Retourbeleid: 30 dagen
- Retourkosten: €6.95

CONTACT INFO (voor doorverwijzing):
- WhatsApp: +31 50 211 1931 (ma-vr 10-18u)
- Email: info@mosewear.com (24u response)
`

// Function to get product details from database
async function getProductDetails(productSlug: string) {
  const supabase = await createClient()
  
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (
        id,
        size,
        color,
        color_hex,
        stock,
        is_available
      )
    `)
    .eq('slug', productSlug)
    .single()

  if (error || !product) {
    return { error: 'Product niet gevonden' }
  }

  return {
    name: product.name,
    price: `€${product.price}`,
    description: product.description,
    material: product.material || 'Premium katoen',
    fit: product.fit || 'Oversized fit',
    category: product.category,
    sizes: [...new Set(product.product_variants?.map((v: any) => v.size))],
    colors: [...new Set(product.product_variants?.map((v: any) => v.color))],
    stock: product.product_variants?.reduce((acc: any, v: any) => {
      acc[`${v.color}-${v.size}`] = v.stock
      return acc
    }, {}),
    care_instructions: product.care_instructions,
    size_guide: product.size_guide
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

// Available functions for AI to call
const functions = [
  {
    name: 'get_product_details',
    description: 'Haal gedetailleerde productinformatie op uit de database, inclusief materiaal, fit, maten, kleuren, voorraad en maattabel',
    parameters: {
      type: 'object',
      properties: {
        product_slug: {
          type: 'string',
          description: 'De slug van het product (bijv. "hoodie-black")',
        },
      },
      required: ['product_slug'],
    },
  },
  {
    name: 'calculate_shipping',
    description: 'Bereken verzendkosten op basis van winkelwagen totaal',
    parameters: {
      type: 'object',
      properties: {
        cart_total: {
          type: 'number',
          description: 'Het totaalbedrag in de winkelwagen in euros',
        },
      },
      required: ['cart_total'],
    },
  },
]

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key is niet geconfigureerd. Voeg OPENAI_API_KEY toe aan .env.local' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware system message
    let contextPrompt = MOSE_SYSTEM_PROMPT

    if (context?.product) {
      contextPrompt += `\n\nCONTEXT: De klant bekijkt momenteel: ${context.product.name}`
      if (context.product.slug) {
        contextPrompt += `\nProduct slug: ${context.product.slug}`
      }
    }

    if (context?.cart && context.cart.total > 0) {
      contextPrompt += `\n\nWINKELWAGEN: €${context.cart.total} (${context.cart.items} items)`
    }

    if (context?.locale) {
      contextPrompt += `\n\nTAAL: ${context.locale === 'nl' ? 'Nederlands' : 'Engels'}`
    }

    // Call OpenAI with streaming
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: contextPrompt },
        ...messages,
      ],
      functions,
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    })

    // Handle function calls
    const stream = OpenAIStream(response, {
      async experimental_onFunctionCall({ name, arguments: args }) {
        if (name === 'get_product_details') {
          const result = await getProductDetails(args.product_slug)
          return result
        }
        
        if (name === 'calculate_shipping') {
          const result = await calculateShipping(args.cart_total)
          return result
        }
      },
    })

    return new StreamingTextResponse(stream)
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

