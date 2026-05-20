/**
 * Publish an approved AI creative variant to Meta as a new AdCreative.
 *
 * POST body: { variant_id: string, headline?: string, message?: string, link_override?: string, attach_to_adset_id?: string }
 *
 * Flow:
 *   1. Validate the variant (status=approved, no existing meta_creative_id).
 *   2. Download the output image and upload it to /act_<id>/adimages.
 *   3. Build a link_data spec using the brand-guide tagline + product slug.
 *   4. Create the AdCreative; (optionally) attach as a paused Ad to a
 *      target ad set so the admin can A/B in Meta Ads Manager.
 *   5. Update variant: status='published', meta_creative_id, published_to_meta_at.
 *
 * Errors are surfaced verbatim so the admin can fix Meta-side config.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { MetaMarketingClient } from '@/lib/meta/marketing-api'
import { downloadToBuffer } from '@/lib/ai/image-utils'
import { getPricingContext, type PricingContext } from '@/lib/ai/pricing-context'

interface PublishBody {
  variant_id?: string
  headline?: string
  message?: string
  description?: string
  link_override?: string
  attach_to_adset_id?: string
  call_to_action?: string
  /** Force NL copy ('nl') or EN copy ('en'); defaults to 'nl'. */
  locale?: 'nl' | 'en'
}

interface BrandGuide {
  tagline?: string
  voice?: { tone?: string }
}

interface VariantRow {
  id: string
  run_id: string
  output_url: string
  status: string
  meta_creative_id: string | null
}

interface RunRow {
  source_product_id: string
}

interface ProductRow {
  name: string
  slug: string
  description: string | null
}

export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: PublishBody
  try {
    body = (await req.json()) as PublishBody
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  if (!body.variant_id) return NextResponse.json({ error: 'variant_id verplicht' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: variantData, error: variantErr } = await supabase
    .from('ai_creative_variants')
    .select('id, run_id, output_url, status, meta_creative_id')
    .eq('id', body.variant_id)
    .maybeSingle()
  if (variantErr) return NextResponse.json({ error: variantErr.message }, { status: 500 })
  if (!variantData) return NextResponse.json({ error: 'Variant niet gevonden' }, { status: 404 })
  const variant = variantData as VariantRow
  if (variant.status !== 'approved') {
    return NextResponse.json(
      { error: `Variant status is "${variant.status}" — eerst goedkeuren voordat je publiceert.` },
      { status: 400 },
    )
  }
  if (variant.meta_creative_id) {
    return NextResponse.json(
      { error: `Variant is al gepubliceerd (creative ${variant.meta_creative_id}).` },
      { status: 400 },
    )
  }

  const { data: runRow, error: runErr } = await supabase
    .from('ai_creative_runs')
    .select('source_product_id')
    .eq('id', variant.run_id)
    .maybeSingle()
  if (runErr || !runRow) {
    return NextResponse.json({ error: 'Bijbehorende run niet gevonden' }, { status: 500 })
  }
  const run = runRow as RunRow
  const { data: productRow } = await supabase
    .from('products')
    .select('name, slug, description')
    .eq('id', run.source_product_id)
    .maybeSingle()
  if (!productRow) return NextResponse.json({ error: 'Product niet gevonden' }, { status: 500 })
  const product = productRow as ProductRow

  const { data: brandRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_brand_guide')
    .maybeSingle()
  const brand = (brandRow as { value?: BrandGuide } | null)?.value ?? {}

  let client: MetaMarketingClient
  try {
    client = await MetaMarketingClient.fromDb({ envFallback: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
  if (!client.pageId) {
    return NextResponse.json(
      { error: 'page_id ontbreekt — zet die op /admin/ai-campaigns/config voordat je publiceert.' },
      { status: 400 },
    )
  }

  // Pricing & offer context drives auto copy. Loaded fresh per publish so
  // a sale that ends between Replicate run and Meta publish is reflected
  // in the ad — we never broadcast a stale price.
  let pricing: PricingContext
  try {
    pricing = await getPricingContext(run.source_product_id)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const locale: 'nl' | 'en' = body.locale === 'en' ? 'en' : 'nl'
  const offerLine = locale === 'en' ? pricing.offer_copy_en : pricing.offer_copy_nl

  // Build link + copy
  const link = body.link_override?.trim()
    || client.linkTemplate.replace('{{slug}}', encodeURIComponent(product.slug))

  const autoHeadline = composeHeadline({ product, pricing, locale })
  const headline = body.headline?.trim() || autoHeadline.slice(0, 60)

  const autoDescription = composeDescription({ product, pricing, brand, locale })
  const description = body.description?.trim() || autoDescription.slice(0, 160)

  const autoMessage = composeMessage({ product, pricing, brand, offerLine, locale })
  const message = body.message?.trim() || autoMessage.slice(0, 1500)

  // Upload image
  let imageHash: string
  try {
    const buffer = await downloadToBuffer(variant.output_url)
    const upload = await client.uploadAdImage(buffer)
    imageHash = upload.hash
  } catch (e) {
    return NextResponse.json({ error: `Image upload faalde: ${(e as Error).message}` }, { status: 502 })
  }

  // Create AdCreative
  let creativeId: string
  try {
    const created = await client.createLinkAdCreative({
      name: `MOSE/${product.slug}/v${variant.id.slice(0, 8)}`,
      link,
      message,
      image_hash: imageHash,
      headline,
      description,
      call_to_action: body.call_to_action,
    })
    creativeId = created.id
  } catch (e) {
    return NextResponse.json({ error: `AdCreative create faalde: ${(e as Error).message}` }, { status: 502 })
  }

  // Optional: attach as PAUSED ad to an existing ad set.
  let adId: string | null = null
  if (body.attach_to_adset_id) {
    try {
      const ad = await client.createAd({
        name: `MOSE-AI/${product.slug}/v${variant.id.slice(0, 8)}`,
        adset_id: body.attach_to_adset_id,
        creative_id: creativeId,
        status: 'PAUSED',
      })
      adId = ad.id
    } catch (e) {
      // Don't roll back the creative — surface a warning so the admin
      // can attach manually in Meta Ads Manager.
      return NextResponse.json(
        {
          ok: true,
          creative_id: creativeId,
          ad_id: null,
          warning: `Creative aangemaakt maar kon niet worden gekoppeld aan ad set ${body.attach_to_adset_id}: ${(e as Error).message}`,
        },
        { status: 207 },
      )
    }
  }

  await supabase
    .from('ai_creative_variants')
    .update({
      status: 'published',
      meta_creative_id: creativeId,
      published_to_meta_at: new Date().toISOString(),
      reviewed_by: adminUser?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', variant.id)

  return NextResponse.json({
    ok: true,
    creative_id: creativeId,
    ad_id: adId,
    used_copy: { headline, message, description, locale, offer_line: offerLine },
  })
}

// -------------------------------------------------------------------------
// Copy composition
// -------------------------------------------------------------------------

interface ComposeArgs {
  product: ProductRow
  pricing: PricingContext
  brand?: BrandGuide
  locale: 'nl' | 'en'
  offerLine?: string
}

function composeHeadline({ product, pricing, locale }: ComposeArgs): string {
  // Headline = short. Lead with the deal if present, else just product.
  if (pricing.has_active_sale) {
    return locale === 'nl'
      ? `${product.name} — nu -${pricing.sale_off_pct}%`
      : `${product.name} — now -${pricing.sale_off_pct}%`
  }
  if (pricing.has_active_staffel) {
    const deepest = pricing.staffel_tiers[pricing.staffel_tiers.length - 1]
    if (deepest) {
      return locale === 'nl'
        ? `${product.name} — ${deepest.label_nl}`
        : `${product.name} — ${deepest.label_en}`
    }
  }
  if (pricing.has_active_promo && pricing.active_promo_codes[0]) {
    const p = pricing.active_promo_codes[0]
    const disc =
      p.discount_type === 'percentage' ? `${p.discount_value}%` : `€${p.discount_value.toFixed(2)}`
    return locale === 'nl'
      ? `${product.name} — code ${p.code} voor ${disc} korting`
      : `${product.name} — code ${p.code} for ${disc} off`
  }
  return product.name
}

function composeMessage({ product, pricing, brand, offerLine, locale }: ComposeArgs): string {
  const tagline = brand?.tagline?.trim()
  const intro = product.description?.split(/[.!?]\s/).slice(0, 1).join('. ').slice(0, 220) || ''
  const parts: string[] = []
  parts.push(product.name)
  if (intro) parts.push(intro)
  if (offerLine) parts.push(offerLine)
  else if (pricing.effective_price != null) {
    parts.push(
      locale === 'nl'
        ? `Nu €${pricing.effective_price.toFixed(2).replace('.', ',')}`
        : `Now €${pricing.effective_price.toFixed(2)}`,
    )
  }
  if (tagline) parts.push(tagline)
  parts.push(
    locale === 'nl'
      ? 'Shop nu op MOSE — gratis verzending vanaf €75.'
      : 'Shop now at MOSE — free shipping from €75.',
  )
  return parts.filter(Boolean).join(' · ')
}

function composeDescription({ product, pricing, brand, locale }: ComposeArgs): string {
  if (product.description) {
    const trimmed = product.description.slice(0, 120)
    if (pricing.effective_price != null) {
      const priceStr = locale === 'nl'
        ? `€${pricing.effective_price.toFixed(2).replace('.', ',')}`
        : `€${pricing.effective_price.toFixed(2)}`
      return `${trimmed} · ${priceStr}`
    }
    return trimmed
  }
  if (brand?.voice?.tone) return brand.voice.tone.slice(0, 160)
  if (pricing.effective_price != null) {
    return locale === 'nl'
      ? `Vanaf €${pricing.effective_price.toFixed(2).replace('.', ',')}`
      : `From €${pricing.effective_price.toFixed(2)}`
  }
  return ''
}
