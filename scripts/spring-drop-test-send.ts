/**
 * Test-send 1 mail per Spring Drop template to a single inbox.
 *
 * Mirrors the data-loading logic of
 * /api/admin/campaigns/spring-drop/send (testEmail mode) without needing
 * an admin browser session.
 *
 * Usage:
 *   npx tsx scripts/spring-drop-test-send.ts            # sends all 3
 *   npx tsx scripts/spring-drop-test-send.ts 1          # sends only mail 1
 *   TO=foo@bar.nl npx tsx scripts/spring-drop-test-send.ts
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TO = process.env.TO || 'h.schlimback@gmail.com'

async function main() {
  const onlyMail = process.argv[2] ? Number(process.argv[2]) : null
  const mailsToSend: Array<1 | 2 | 3> =
    onlyMail === 1 || onlyMail === 2 || onlyMail === 3
      ? [onlyMail]
      : [1, 2, 3]

  // Lazy-load AFTER dotenv so RESEND_API_KEY etc. are available
  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const {
    sendSpringDrop1LaunchEmail,
    sendSpringDrop2TeeEmail,
    sendSpringDrop3FoundersEmail,
  } = await import('@/lib/email')

  const sb = createServiceRoleClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

  function appendUtm(baseUrl: string, mail: 1 | 2 | 3, content?: string) {
    const params = new URLSearchParams({
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'spring-drop-2026',
      utm_content: `mail-${mail}${content ? `-${content}` : ''}`,
    })
    const sep = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${sep}${params.toString()}`
  }

  const LOOKBOOK_HERO = {
    chapter1:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp',
    chapter2:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/02-spring-desktop.webp',
  }

  /** Zelfde als campaign send route: duo Beige+Zwart, zwart naar camera (couple-blossoms). */
  const SPRING_MAIL1_TEE_GRID_IMAGE =
    'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/photoshoot-2026/tee/multi/couple-blossoms-desktop.webp'

  function eur(value: number) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    })
      .format(value)
      .replace('\u00A0', ' ')
  }

  // ----- shared product fetch -----
  const slugs = [
    'mose-tee',
    'mose-essential-hoodie',
    'mose-classic-sweater',
  ]

  const { data: products, error: pErr } = await sb
    .from('products')
    .select(
      'id, slug, name, base_price, sale_price, product_images(url, is_primary, position, media_type, color)'
    )
    .in('slug', slugs)

  if (pErr || !products) throw pErr || new Error('No products')

  const bySlug = new Map(products.map((p: any) => [p.slug, p]))
  function pickFirstImage(p: any): string {
    const imgs: any[] = p.product_images || []
    return (
      imgs.find(
        (i) => i.media_type === 'image' && i.is_primary && !i.color
      ) ||
      imgs.find((i) => i.media_type === 'image' && i.is_primary) ||
      imgs.find((i) => i.media_type === 'image')
    )?.url || ''
  }

  type Resolved = {
    slug: string
    name: string
    basePrice: number
    salePrice: number | null
    primaryImageUrl: string
  }
  const productMap = new Map<string, Resolved>()
  for (const slug of slugs) {
    const p: any = bySlug.get(slug)
    if (!p) continue
    productMap.set(slug, {
      slug: p.slug,
      name: p.name,
      basePrice: Number(p.base_price),
      salePrice: p.sale_price != null ? Number(p.sale_price) : null,
      primaryImageUrl: pickFirstImage(p),
    })
  }

  // ----- sweater stock -----
  let sweaterStock = 0
  {
    const sweater = productMap.get('mose-classic-sweater')
    if (sweater) {
      const { data: variants } = await sb
        .from('product_variants')
        .select('stock_quantity, is_available, product_id')
        .eq('is_available', true)
      const sweaterId = (bySlug.get('mose-classic-sweater') as any).id
      sweaterStock = (variants || [])
        .filter((v: any) => v.product_id === sweaterId)
        .reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0)
    }
  }

  console.log(`Test-target: ${TO}`)
  console.log(`Mails te versturen: ${mailsToSend.join(', ')}`)
  console.log(`Sweater stock (live): ${sweaterStock}`)

  for (const mail of mailsToSend) {
    console.log(`\n--- Mail ${mail} ---`)
    try {
      if (mail === 1) {
        const tee = productMap.get('mose-tee')!
        const hoodie = productMap.get('mose-essential-hoodie')!
        const sweater = productMap.get('mose-classic-sweater')!

        const result = await sendSpringDrop1LaunchEmail({
          email: TO,
          locale: 'nl',
          heroImageUrl: LOOKBOOK_HERO.chapter1,
          heroAlt: 'MOSE in Groningen, lente 2026',
          storyUrl: appendUtm(`${siteUrl}/nl/spring-drop-verhaal`, 1, 'verhaal'),
          shopUrl: appendUtm(`${siteUrl}/nl/shop`, 1, 'all'),
          products: [
            {
              name: tee.name,
              priceLabel: eur(tee.salePrice ?? tee.basePrice),
              badge: 'Vanaf €44,95 bij 3 stuks',
              badgeTone: 'staffel',
              imageUrl: SPRING_MAIL1_TEE_GRID_IMAGE,
              url: appendUtm(`${siteUrl}/nl/product/${tee.slug}`, 1, 'tee'),
            },
            {
              name: hoodie.name,
              priceLabel:
                hoodie.salePrice != null
                  ? `${eur(hoodie.salePrice)}  ${eur(hoodie.basePrice)}`
                  : eur(hoodie.basePrice),
              badge: '-17% lente-prijs',
              badgeTone: 'sale',
              imageUrl: hoodie.primaryImageUrl,
              url: appendUtm(
                `${siteUrl}/nl/product/${hoodie.slug}`,
                1,
                'hoodie'
              ),
            },
            {
              name: sweater.name,
              priceLabel:
                sweater.salePrice != null
                  ? `${eur(sweater.salePrice)}  ${eur(sweater.basePrice)}`
                  : eur(sweater.basePrice),
              badge: `-18%, nog ${sweaterStock} stuks`,
              badgeTone: 'scarcity',
              imageUrl: sweater.primaryImageUrl,
              url: appendUtm(
                `${siteUrl}/nl/product/${sweater.slug}`,
                1,
                'sweater'
              ),
            },
          ],
        })
        console.log(
          'Mail 1:',
          result.success
            ? `OK id=${(result.data as any)?.id}`
            : `FAIL ${JSON.stringify(result.error)}`
        )
      } else if (mail === 2) {
        // ----- tee colors + stock -----
        const tee: any = bySlug.get('mose-tee')
        const { data: images } = await sb
          .from('product_images')
          .select('url, color, is_primary, position')
          .eq('product_id', tee.id)
          .eq('media_type', 'image')

        const { data: teeVariants } = await sb
          .from('product_variants')
          .select('color, size, stock_quantity, is_available')
          .eq('product_id', tee.id)

        const colorOrder = ['Wit', 'Groen', 'Beige', 'Zwart']
        const colors = colorOrder
          .map((colorName) => {
            const img =
              (images || []).find(
                (i: any) => i.color === colorName && i.is_primary
              ) || (images || []).find((i: any) => i.color === colorName)
            if (!img) return null
            const v = (teeVariants || []).filter(
              (vv: any) => vv.color === colorName && vv.is_available
            )
            const totalStock = v.reduce(
              (sum: number, vv: any) => sum + (vv.stock_quantity || 0),
              0
            )
            return {
              name: colorName,
              imageUrl: img.url,
              url: appendUtm(
                `${siteUrl}/nl/product/mose-tee?color=${encodeURIComponent(colorName)}`,
                2,
                `tee-${colorName.toLowerCase()}`
              ),
              stockNote:
                totalStock === 0
                  ? 'Uitverkocht'
                  : totalStock <= 5
                    ? `Nog ${totalStock} stuks`
                    : undefined,
              soldOut: totalStock === 0,
              sizeStocks: Object.fromEntries(
                v.map((vv: any) => [vv.size, vv.stock_quantity || 0])
              ),
            }
          })
          .filter(Boolean) as any[]

        const someSizesSoldOut = colors.some((c) =>
          Object.values(c.sizeStocks).some((s) => (s as number) === 0)
        )

        const result = await sendSpringDrop2TeeEmail({
          email: TO,
          locale: 'nl',
          heroImageUrl: LOOKBOOK_HERO.chapter2,
          heroAlt: 'MOSE Tee aan de gracht in Groningen, lente 2026',
          teeUrl: appendUtm(`${siteUrl}/nl/product/mose-tee`, 2, 'tee'),
          shopUrl: appendUtm(`${siteUrl}/nl/shop`, 2, 'shop'),
          someSizesSoldOut,
          colors: colors.map(({ sizeStocks: _, ...rest }) => rest),
          staffel: [
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
          ],
        })
        console.log(
          'Mail 2:',
          result.success
            ? `OK id=${(result.data as any)?.id}`
            : `FAIL ${JSON.stringify(result.error)}`
        )
      } else if (mail === 3) {
        // Try to fetch a personal code if the test address is a real subscriber
        const { data: existing } = await sb
          .from('newsletter_subscribers')
          .select('id, email, locale')
          .ilike('email', TO)
          .maybeSingle()

        let promoCode = 'SPRING10'
        if (existing) {
          const { data: code } = await sb
            .from('promo_codes')
            .select('code, expires_at, is_active')
            .eq('subscriber_id', (existing as any).id)
            .ilike('code', 'WELCOME10-%')
            .eq('is_active', true)
            .maybeSingle()
          if (code) promoCode = (code as any).code
        }

        const result = await sendSpringDrop3FoundersEmail({
          email: TO,
          locale: 'nl',
          promoCode,
          promoExpiryLabel: '15 juni 2026',
          ctaUrl: appendUtm(
            `${siteUrl}/nl/product/mose-tee`,
            3,
            'tee-cta'
          ),
          shippedOrders: 33,
        })
        console.log(
          'Mail 3:',
          result.success
            ? `OK id=${(result.data as any)?.id}, code=${promoCode}`
            : `FAIL ${JSON.stringify(result.error)}`
        )
      }
    } catch (err: any) {
      console.error(`Mail ${mail}: FATAL`, err?.message || err)
    }

    if (mail !== mailsToSend[mailsToSend.length - 1]) {
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
