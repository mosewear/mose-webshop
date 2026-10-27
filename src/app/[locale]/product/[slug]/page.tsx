import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCommercePromises } from '@/lib/settings-server'
import { isTapstitchProduct } from '@/lib/tapstitch-products'
import { getCatalogProduct } from '@/lib/catalog-server'
import ProductPageClient from './ProductPageClient'
import PdpInstagramFetcher from '@/components/product/PdpInstagramFetcher'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { mapLocalizedProduct } from '@/lib/i18n-db'
import { notFound } from 'next/navigation'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  const product = await getCatalogProduct(slug)

  if (!product) {
    return {
      title: `${t('product.notFound')} - MOSE`,
      description: t('product.notFoundDesc'),
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  // Map localized fields
  const localizedProduct = mapLocalizedProduct(product, locale)
  // Categories is now a LEFT join — gift cards & uncategorised items
  // come back with `null` here, so we always treat it optionally.
  const category = product.categories as any as
    | { name: string; name_en?: string; slug: string }
    | null
  const localizedCategory = category
    ? { ...category, name: locale === 'en' && category.name_en ? category.name_en : category.name }
    : null

  // Get primary image or first image
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
  const imageUrl = primaryImage?.url || 'https://www.mosewear.com/logomose.png'

  // Use custom meta or generate from product data. We avoid appending
  // "- MOSE" when the localized name already starts with the brand
  // (e.g. "MOSE Giftcard") to prevent ugly "MOSE Giftcard - MOSE" titles.
  const localizedName = localizedProduct.name as string | undefined
  const fallbackTitle = localizedName
    ? localizedName.toLowerCase().startsWith('mose')
      ? localizedName
      : `${localizedName} | MOSE`
    : 'MOSE'
  // Engelse meta per product. Die bestond niet: de Engelse pagina's kregen de
  // Nederlandse zoekresultaattekst, of een afgekapte productbeschrijving.
  const isEn = locale === "en"
  const title =
    (isEn ? product.meta_title_en || product.meta_title : product.meta_title) ||
    fallbackTitle
  const description =
    (isEn
      ? product.meta_description_en || product.meta_description
      : product.meta_description) ||
    `${localizedProduct.description?.substring(0, 155) ?? ''}${(localizedProduct.description?.length ?? 0) > 155 ? '...' : ''}`
  
  return {
    title,
    description,
    keywords: [localizedProduct.name, 'MOSE', localizedCategory?.name, 'mannenkleding', 'premium basics', ...(isTapstitchProduct(product) ? [] : ['Groningen', 'lokaal gemaakt'])].filter(Boolean) as string[],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.mosewear.com/${locale}/product/${slug}`,
      images: [
        {
          url: imageUrl.startsWith('http') ? imageUrl : `https://www.mosewear.com${imageUrl}`,
          width: 1200,
          height: 1200,
          alt: primaryImage?.alt_text || localizedProduct.name,
        },
      ],
      siteName: 'MOSE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl.startsWith('http') ? imageUrl : `https://www.mosewear.com${imageUrl}`],
    },
    alternates: {
      canonical: `/${locale}/product/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  // This will be handled dynamically, but we need to return locale structure
  return []
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale: localeParam } = await params
  setRequestLocale(localeParam)
  const [product, initialSettings] = await Promise.all([getCatalogProduct(slug), getCommercePromises()])

  if (!product) {
    notFound()
  }

  // Generate structured data for SEO
  let structuredData = null
  if (product) {
    // Map localized fields
    const localizedProduct = mapLocalizedProduct(product, localeParam)
    // Categories is now LEFT-joined; gift cards & uncategorised products
    // arrive without one. Treat it as optional for breadcrumbs / schema.
    const category = product.categories as any as
      | { name: string; name_en?: string; slug: string }
      | null
    const localizedCategory = category
      ? { ...category, name: localeParam === 'en' && category.name_en ? category.name_en : category.name }
      : null
    
    const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
    const imageUrl = primaryImage?.url || 'https://www.mosewear.com/logomose.png'
    const price = product.sale_price || product.base_price
    
    // Check if product is in stock
    const inStock = product.product_variants?.some((v: any) => v.is_available && v.stock_quantity > 0)

    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: localizedProduct.name,
      description: localizedProduct.description,
      image: imageUrl.startsWith('http') ? imageUrl : `https://www.mosewear.com${imageUrl}`,
      brand: {
        '@type': 'Brand',
        name: 'MOSE',
      },
      offers: {
        '@type': 'Offer',
        url: `https://www.mosewear.com/${localeParam}/product/${slug}`,
        priceCurrency: 'EUR',
        price: price,
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        // Dit is een server
        // component: hij rendert één keer per request, er is geen re-render
        // waarbij deze waarde kan verschuiven. priceValidUntil hoort juist
        // relatief aan het moment van uitleveren te zijn.
        // eslint-disable-next-line react-hooks/purity
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        seller: {
          '@type': 'Organization',
          name: 'MOSE',
        },
      },
      category: category?.name,
    }

    // Add breadcrumbs — only emit a category step if the product
    // actually has one (gift cards & uncategorised products skip it
    // instead of pointing at a broken `/shop/` URL).
    const crumbs: Array<{ '@type': 'ListItem'; position: number; name: string; item: string }> = [
      {
        '@type': 'ListItem',
        position: 1,
        name: localeParam === 'en' ? 'Home' : 'Home',
        item: `https://www.mosewear.com/${localeParam}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: `https://www.mosewear.com/${localeParam}/shop`,
      },
    ]
    if (localizedCategory && category?.slug) {
      crumbs.push({
        '@type': 'ListItem',
        position: crumbs.length + 1,
        name: localizedCategory.name,
        // /shop/{slug} bestaat niet als route: filteren gebeurt client-side via
        // searchparams. Een breadcrumb-item dat naar een 404 wijst maakt het
        // hele BreadcrumbList-schema ongeldig, dus we verwijzen naar de
        // gefilterde shop-URL die wel bestaat.
        item: `https://www.mosewear.com/${localeParam}/shop?category=${category.slug}`,
      })
    }
    crumbs.push({
      '@type': 'ListItem',
      position: crumbs.length + 1,
      name: localizedProduct.name as string,
      item: `https://www.mosewear.com/${localeParam}/product/${slug}`,
    })

    const breadcrumbStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs,
    }

    structuredData = [structuredData, breadcrumbStructuredData]
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      {/* Product and presentation settings arrive with the server HTML.
          The client isolates URL-only colour selection in its own boundary. */}
      <Suspense fallback={null}>
        <ProductPageClient
          key={slug}
          initialProduct={product}
          initialSettings={initialSettings}
          params={Promise.resolve({ slug, locale: localeParam })}
          instagramSlot={
            // Server-component variant van de homepage Instagram-feed,
            // tussen reviews en FAQ gerenderd. In Suspense zodat een
            // trage IG-fetch (ge-cached, max 300s) nooit de PDP zelf
            // blokkeert. Rendert null wanneer de feed uit staat.
            <Suspense fallback={null}>
              <PdpInstagramFetcher />
            </Suspense>
          }
        />
      </Suspense>
      {/* Sticky brand-discovery pill bottom-left. Server-fetcht IG-feed
          + about-content + admin-toggle; rendert null als één daarvan
          afwezig is. In Suspense gewikkeld zodat een trage IG-fetch
          nooit het hoofd-content render blokkeert (LCP-veilig). */}
      <Suspense fallback={null}>
        {/* De zwevende "WIE ZIJN WIJ?"-balk is hier weg. Hij stond links
            onderin als tweede vast element naast de koopbalk, schoof alleen
            omhoog in plaats van te verdwijnen, en lag daardoor over de
            vertrouwensregels en de producttekst heen. Van de zeven onderzochte
            productpagina's (Asket, Norse Projects, Carhartt WIP, Les Deux,
            Colorful Standard, Pockies, Suitsupply) heeft er geen enkele twee
            zwevende elementen: op een productpagina is het koopmoment het enige
            dat mag blijven staan.

            Het merkverhaal is niet verdwenen: "MADE IN GRONINGEN" staat als
            label onder de prijs, de vertrouwensregels onder de koopknop noemen
            het atelier, en de veelgestelde vragen beantwoorden "Is dit echt in
            Groningen gemaakt?". */}
      </Suspense>
    </>
  )
}
