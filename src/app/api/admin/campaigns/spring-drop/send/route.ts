import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  sendSpringDrop1LaunchEmail,
  sendSpringDrop2TeeEmail,
  sendSpringDrop3FoundersEmail,
} from '@/lib/email'
import type { SpringDropProduct } from '@/emails/SpringDrop1Launch'
import type {
  SpringDrop2TeeColor,
  SpringDrop2TeeStaffelTier,
} from '@/emails/SpringDrop2Tee'

export const runtime = 'nodejs'
export const maxDuration = 300

// =====================================================
// Spring Drop 2026 — admin send endpoint
//
// POST { mail: 1 | 2 | 3, dryRun?: boolean, testEmail?: string }
//
// - mail = 1: launch + 4-product grid
// - mail = 2: Tee-focus + colors + staffel
// - mail = 3: founders note + WELCOME10 (or SPRING10 fallback)
//
// dryRun=true        → builds payload + counts recipients, sends NOTHING
// testEmail=<addr>   → sends ONE mail to <addr> (subscriber data lookup
//                      first; falls back to a test envelope if unknown)
// neither            → sends to all active subscribers, batched 25,
//                      with dedup against `order_emails` audit-log so
//                      the same subscriber is never double-mailed for
//                      the same template_key.
// =====================================================

const TEMPLATE_KEYS = {
  1: 'spring_drop_1_launch',
  2: 'spring_drop_2_tee',
  3: 'spring_drop_3_founders',
} as const

const FALLBACK_PROMO_CODE = 'SPRING10'
const PROMO_EXPIRY_LABEL_NL = '15 juni 2026'
const PROMO_EXPIRY_LABEL_EN = '15 June 2026'
const SHIPPED_ORDERS = 33 // expliciet, want we willen niet per send een query doen

const BATCH_SIZE = 25
const BATCH_PAUSE_MS = 1000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
}

function utm(mailNumber: 1 | 2 | 3, content?: string) {
  const params = new URLSearchParams({
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'spring-drop-2026',
    utm_content: `mail-${mailNumber}${content ? `-${content}` : ''}`,
  })
  return params.toString()
}

function appendUtm(baseUrl: string, mailNumber: 1 | 2 | 3, content?: string) {
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}${utm(mailNumber, content)}`
}

// Reusable lookbook + product image URLs. We hardcode them here on purpose:
// the photoshoot v2 pipeline guarantees these exact filenames in Supabase
// Storage and the campaign needs to render the SAME hero whether the user
// later re-shoots a chapter or not. Cheaper than another DB hop too.
const LOOKBOOK_HERO = {
  chapter1:
    'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp',
  chapter2:
    'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/02-spring-desktop.webp',
}

interface ResolvedProduct {
  slug: string
  name: string
  basePrice: number
  salePrice: number | null
  primaryImageUrl: string
}

async function loadProducts(
  sb: ReturnType<typeof createServiceRoleClient>
): Promise<ResolvedProduct[]> {
  // Spring Drop promoot bewust alleen de drie kledingstukken (Tee,
  // Hoodie, Sweater). Het horloge is een ander prijspunt en wordt in
  // deze campagne overgeslagen.
  const slugs = [
    'mose-tee',
    'mose-essential-hoodie',
    'mose-classic-sweater',
  ]

  const { data: products, error } = await sb
    .from('products')
    .select(
      `id, slug, name, base_price, sale_price, product_images(url, is_primary, position, media_type, color)`
    )
    .in('slug', slugs)

  if (error) throw error
  if (!products) throw new Error('No products')

  const bySlug = new Map(products.map((p: any) => [p.slug, p]))

  return slugs
    .map((slug) => {
      const p: any = bySlug.get(slug)
      if (!p) return null
      // Pick a static image: prefer hero-desktop primary; for the watch the
      // primary is a video so we deliberately scan for the first IMAGE row.
      const images: any[] = p.product_images || []
      const firstImage =
        images.find(
          (i) => i.media_type === 'image' && i.is_primary && !i.color
        ) ||
        images.find((i) => i.media_type === 'image' && i.is_primary) ||
        images.find((i) => i.media_type === 'image')
      return {
        slug: p.slug as string,
        name: p.name as string,
        basePrice: Number(p.base_price),
        salePrice: p.sale_price != null ? Number(p.sale_price) : null,
        primaryImageUrl: firstImage?.url || '',
      } as ResolvedProduct
    })
    .filter(Boolean) as ResolvedProduct[]
}

function eur(value: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
    .format(value)
    .replace('\u00A0', ' ')
}

interface BuildMail1Params {
  products: ResolvedProduct[]
  sweaterStock: number
}
function priceWithStrike(salePrice: number | null, basePrice: number) {
  if (salePrice == null) return eur(basePrice)
  return `${eur(salePrice)}&nbsp;&nbsp;<span style="color:#999;text-decoration:line-through;font-weight:600">${eur(basePrice)}</span>`
}

function buildMail1Payload({ products, sweaterStock }: BuildMail1Params) {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const tee = bySlug.get('mose-tee')
  const hoodie = bySlug.get('mose-essential-hoodie')
  const sweater = bySlug.get('mose-classic-sweater')

  if (!tee || !hoodie || !sweater) {
    throw new Error('Missing products for Spring Drop mail 1')
  }

  const productCells: SpringDropProduct[] = [
    {
      name: tee.name,
      priceLabel: eur(tee.salePrice ?? tee.basePrice),
      subtitle: '240 gsm jersey, vier kleuren.',
      badge: 'Vanaf €44,95 bij 3 stuks',
      badgeTone: 'staffel',
      imageUrl: tee.primaryImageUrl,
      url: appendUtm(`${siteUrl()}/nl/product/${tee.slug}`, 1, 'tee'),
    },
    {
      name: hoodie.name,
      priceLabel: priceWithStrike(hoodie.salePrice, hoodie.basePrice),
      subtitle: 'Zware sweat, geborsteld van binnen.',
      badge: 'Lente: -17%',
      badgeTone: 'sale',
      imageUrl: hoodie.primaryImageUrl,
      url: appendUtm(`${siteUrl()}/nl/product/${hoodie.slug}`, 1, 'hoodie'),
    },
    {
      name: sweater.name,
      priceLabel: priceWithStrike(sweater.salePrice, sweater.basePrice),
      subtitle: `Lente-sale, nog ${sweaterStock} stuks beschikbaar.`,
      badge: `Nog ${sweaterStock} stuks`,
      badgeTone: 'scarcity',
      imageUrl: sweater.primaryImageUrl,
      url: appendUtm(`${siteUrl()}/nl/product/${sweater.slug}`, 1, 'sweater'),
    },
  ]

  return {
    products: productCells,
    shopUrl: appendUtm(`${siteUrl()}/nl/shop`, 1, 'all'),
    heroImageUrl: LOOKBOOK_HERO.chapter1,
    heroAlt: 'MOSE in Groningen, lente 2026',
  }
}

interface TeeColorRow {
  name: string
  imageUrl: string
  url: string
  totalStock: number
  sizeStocks: Record<string, number>
}

async function loadTeeColors(
  sb: ReturnType<typeof createServiceRoleClient>
): Promise<TeeColorRow[]> {
  // Tee primary images are stored per color with is_primary=true. Stock
  // info comes from product_variants (per size).
  const { data: tee } = await sb
    .from('products')
    .select('id, slug')
    .eq('slug', 'mose-tee')
    .single()

  if (!tee) throw new Error('Tee product not found')

  const { data: images } = await sb
    .from('product_images')
    .select('url, color, is_primary, position')
    .eq('product_id', tee.id)
    .eq('media_type', 'image')

  const { data: variants } = await sb
    .from('product_variants')
    .select('color, size, stock_quantity, is_available')
    .eq('product_id', tee.id)

  const colorOrder = ['Wit', 'Groen', 'Beige', 'Zwart']
  const rows: TeeColorRow[] = []
  for (const colorName of colorOrder) {
    const img =
      (images || []).find((i: any) => i.color === colorName && i.is_primary) ||
      (images || []).find((i: any) => i.color === colorName)
    if (!img) continue
    const v = (variants || []).filter(
      (vv: any) => vv.color === colorName && vv.is_available
    )
    const totalStock = v.reduce(
      (sum: number, vv: any) => sum + (vv.stock_quantity || 0),
      0
    )
    const sizeStocks: Record<string, number> = {}
    for (const vv of v as any[]) {
      sizeStocks[vv.size] = vv.stock_quantity || 0
    }
    rows.push({
      name: colorName,
      imageUrl: img.url,
      url: appendUtm(
        `${siteUrl()}/nl/product/${tee.slug}?color=${encodeURIComponent(colorName)}`,
        2,
        `tee-${colorName.toLowerCase()}`
      ),
      totalStock,
      sizeStocks,
    })
  }
  return rows
}

function buildMail2Payload(colors: TeeColorRow[]) {
  const colorsForMail: SpringDrop2TeeColor[] = colors.map((c) => ({
    name: c.name,
    imageUrl: c.imageUrl,
    url: c.url,
    stockNote:
      c.totalStock === 0
        ? 'Uitverkocht'
        : c.totalStock <= 5
          ? `Nog ${c.totalStock} stuks`
          : undefined,
    soldOut: c.totalStock === 0,
  }))

  const someSizesSoldOut = colors.some((c) =>
    Object.values(c.sizeStocks).some((s) => s === 0)
  )

  const staffel: SpringDrop2TeeStaffelTier[] = [
    {
      qtyLabel: 'Koop 1',
      pricePerPiece: '€49,95 / stuk',
      totalLabel: 'Totaal €49,95',
    },
    {
      qtyLabel: 'Koop 2',
      pricePerPiece: '€47,45 / stuk',
      totalLabel: 'Totaal €94,90',
    },
    {
      qtyLabel: 'Koop 3+',
      pricePerPiece: '€44,95 / stuk',
      totalLabel: 'Totaal €134,85',
      highlight: true,
    },
  ]

  return {
    colors: colorsForMail,
    staffel,
    heroImageUrl: LOOKBOOK_HERO.chapter2,
    teeUrl: appendUtm(`${siteUrl()}/nl/product/mose-tee`, 2, 'tee'),
    shopUrl: appendUtm(`${siteUrl()}/nl/shop`, 2, 'shop'),
    heroAlt: 'MOSE Tee aan de gracht in Groningen, lente 2026',
    someSizesSoldOut,
  }
}

interface SubscriberRow {
  id: string
  email: string
  locale: string | null
}

async function loadActiveSubscribers(
  sb: ReturnType<typeof createServiceRoleClient>
): Promise<SubscriberRow[]> {
  const { data, error } = await sb
    .from('newsletter_subscribers')
    .select('id, email, locale, status')
    .eq('status', 'active')
    .order('subscribed_at', { ascending: true })

  if (error) throw error
  return (data || []).map((s: any) => ({
    id: s.id,
    email: s.email,
    locale: s.locale,
  }))
}

async function loadAlreadySentEmails(
  sb: ReturnType<typeof createServiceRoleClient>,
  templateKey: string
): Promise<Set<string>> {
  // Audit log is the source of truth. Anything successfully sent earlier
  // for this template_key skips this run, regardless of admin button
  // panic-clicking.
  const { data, error } = await sb
    .from('order_emails')
    .select('recipient_email')
    .eq('template_key', templateKey)
    .eq('status', 'sent')

  if (error) {
    console.warn('[spring-drop] could not load order_emails dedup', error.message)
    return new Set()
  }
  return new Set((data || []).map((r: any) => (r.recipient_email || '').toLowerCase()))
}

async function loadPersonalCodesBySubscriberId(
  sb: ReturnType<typeof createServiceRoleClient>
): Promise<Map<string, { code: string; expiresAt: string }>> {
  const { data, error } = await sb
    .from('promo_codes')
    .select('subscriber_id, code, expires_at, is_active')
    .not('subscriber_id', 'is', null)
    .ilike('code', 'WELCOME10-%')
    .eq('is_active', true)

  if (error) throw error
  const map = new Map<string, { code: string; expiresAt: string }>()
  for (const row of (data as any[]) || []) {
    map.set(row.subscriber_id, {
      code: row.code,
      expiresAt: row.expires_at,
    })
  }
  return map
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const {
      data: { user },
    } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const mail = Number(body?.mail) as 1 | 2 | 3
    const dryRun = !!body?.dryRun
    const testEmail =
      typeof body?.testEmail === 'string' && body.testEmail.trim()
        ? String(body.testEmail).trim()
        : null

    if (![1, 2, 3].includes(mail)) {
      return NextResponse.json(
        { error: 'mail must be 1, 2 or 3' },
        { status: 400 }
      )
    }

    const sb = createServiceRoleClient()
    const templateKey = TEMPLATE_KEYS[mail]

    // Load shared data once per request
    const products = await loadProducts(sb)

    // Sweater scarcity number for mail 1 — pull live so the mail is honest
    let sweaterStock = 0
    {
      const { data: sweater } = await sb
        .from('products')
        .select('id')
        .eq('slug', 'mose-classic-sweater')
        .single()
      if (sweater) {
        const { data: variants } = await sb
          .from('product_variants')
          .select('stock_quantity, is_available')
          .eq('product_id', sweater.id)
          .eq('is_available', true)
        sweaterStock = (variants || []).reduce(
          (sum: number, v: any) => sum + (v.stock_quantity || 0),
          0
        )
      }
    }

    const teeColors = mail === 2 ? await loadTeeColors(sb) : []

    // Determine recipients
    let subscribers: SubscriberRow[] = []
    if (testEmail) {
      const { data: existing } = await sb
        .from('newsletter_subscribers')
        .select('id, email, locale')
        .ilike('email', testEmail)
        .single()
      if (existing) {
        subscribers = [
          {
            id: (existing as any).id,
            email: (existing as any).email,
            locale: (existing as any).locale,
          },
        ]
      } else {
        // Synthetic subscriber so we can still render+send to a test addr
        subscribers = [{ id: `test-${Date.now()}`, email: testEmail, locale: 'nl' }]
      }
    } else {
      const all = await loadActiveSubscribers(sb)
      const alreadySent = await loadAlreadySentEmails(sb, templateKey)
      subscribers = all.filter((s) => !alreadySent.has(s.email.toLowerCase()))
    }

    // Personal codes only matter for mail 3
    const personalCodes =
      mail === 3 ? await loadPersonalCodesBySubscriberId(sb) : new Map()

    if (dryRun) {
      const previewSlug =
        mail === 1
          ? 'spring-drop-1-launch'
          : mail === 2
            ? 'spring-drop-2-tee'
            : 'spring-drop-3-founders'
      return NextResponse.json({
        success: true,
        dryRun: true,
        mail,
        templateKey,
        recipients: subscribers.length,
        previewUrl: `${siteUrl()}/api/email-preview?type=${previewSlug}&locale=nl`,
        sweaterStock,
        teeColors: teeColors.map((c) => ({
          name: c.name,
          totalStock: c.totalStock,
        })),
        sample: subscribers.slice(0, 3).map((s) => s.email),
        sampleProductUrl:
          products.find((p) => p.slug === 'mose-tee')?.primaryImageUrl,
        promoCodeCoverage:
          mail === 3
            ? {
                personal: subscribers.filter((s) => personalCodes.has(s.id))
                  .length,
                fallback: subscribers.filter((s) => !personalCodes.has(s.id))
                  .length,
                fallbackCode: FALLBACK_PROMO_CODE,
              }
            : null,
      })
    }

    // Pre-build payloads (per-mail; per-recipient for mail 3 because of
    // the personal code).
    const mail1Payload = mail === 1 ? buildMail1Payload({ products, sweaterStock }) : null
    const mail2Payload = mail === 2 ? buildMail2Payload(teeColors) : null

    let sentCount = 0
    let failCount = 0
    const errors: string[] = []

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE)

      // Send sequentially in a batch to avoid hammering Resend; small
      // population so this is fine.
      for (const subscriber of batch) {
        const locale = subscriber.locale === 'en' ? 'en' : 'nl'
        try {
          let result: any = null

          if (mail === 1 && mail1Payload) {
            result = await sendSpringDrop1LaunchEmail({
              email: subscriber.email,
              locale,
              ...mail1Payload,
            })
          } else if (mail === 2 && mail2Payload) {
            result = await sendSpringDrop2TeeEmail({
              email: subscriber.email,
              locale,
              ...mail2Payload,
            })
          } else if (mail === 3) {
            const personal = personalCodes.get(subscriber.id)
            const code = personal?.code || FALLBACK_PROMO_CODE
            const expiryLabel =
              locale === 'en' ? PROMO_EXPIRY_LABEL_EN : PROMO_EXPIRY_LABEL_NL
            result = await sendSpringDrop3FoundersEmail({
              email: subscriber.email,
              locale,
              promoCode: code,
              promoExpiryLabel: expiryLabel,
              ctaUrl: appendUtm(
                `${siteUrl()}/${locale}/product/mose-tee`,
                3,
                'tee-cta'
              ),
              shippedOrders: SHIPPED_ORDERS,
            })
          }

          if (result?.success) {
            sentCount++
          } else {
            failCount++
            const errMsg =
              (result?.error as any)?.message ||
              JSON.stringify(result?.error || 'Unknown error')
            errors.push(`${subscriber.email}: ${errMsg}`)
          }
        } catch (err: any) {
          failCount++
          errors.push(`${subscriber.email}: ${err?.message || 'Unknown error'}`)
          console.error('[spring-drop] send failed for', subscriber.email, err)
        }
      }

      // Pause between batches (skip after last batch)
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS))
      }
    }

    return NextResponse.json({
      success: true,
      mail,
      templateKey,
      total: subscribers.length,
      sent: sentCount,
      failed: failCount,
      errors: errors.slice(0, 20),
    })
  } catch (err: any) {
    console.error('[spring-drop/send] fatal', err)
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    )
  }
}
