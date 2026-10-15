'use client'

import { use, useState, useEffect, useRef, useCallback, ReactElement } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { useWishlist } from '@/store/wishlist'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/ProductReviews'
import StickyVariantPicker from '@/components/product/StickyVariantPicker'
import PdpTrustStrip from '@/components/product/PdpTrustStrip'
import KlarnaInstallmentLine from '@/components/product/KlarnaInstallmentLine'
import ProductReviewSnippet from '@/components/product/ProductReviewSnippet'
import ProductActivityStrip from '@/components/product/ProductActivityStrip'
import ModelFitInfo from '@/components/product/ModelFitInfo'
import PdpFaq from '@/components/product/PdpFaq'
import WatchSpecsModal from '@/components/WatchSpecsModal'
import DynamicSizeGuideModal from '@/components/DynamicSizeGuideModal'
import RecentlyViewed from '@/components/RecentlyViewed'
import PdpGalleryLightbox from '@/components/product/PdpGalleryLightbox'
import PdpImageLightbox from '@/components/product/PdpImageLightbox'
import { prefetchPdpLightboxXl } from '@/lib/pdp-lightbox-image'
import { Truck, RotateCcw, MapPin, Video, Shield, Package, Lock, AlertCircle, Plus } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { catalogContentId } from '@/lib/catalog-ids'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { trackProductView, trackAddToCart } from '@/lib/analytics'
import { addToRecentlyViewed } from '@/lib/recentlyViewed'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'
import GiftCardProductView from '@/components/product/GiftCardProductView'
import { vertaalKleur } from '@/lib/kleurnaam'

const supabase = createClient()

interface Product {
  id: string
  name: string
  name_en?: string
  slug: string
  description: string
  description_en?: string
  base_price: number
  sale_price: number | null
  category_id: string
  meta_title: string
  meta_description: string
  size_guide_content?: any | null
  size_guide_content_en?: any | null
  is_gift_card?: boolean
  allows_custom_amount?: boolean
  gift_card_min_amount?: number | null
  gift_card_max_amount?: number | null
  gift_card_default_validity_months?: number | null
  // Pasvorm-referentie: helpt klanten hun eigen maat kiezen op basis
  // van het model in de productfoto's. Alle velden zijn optioneel.
  // model_name wordt gebruikt voor een persoonlijke overlay-zin
  // ("TYLER IS …"); zonder naam valt 'ie terug op "MODEL IS …".
  model_name?: string | null
  model_height?: string | null
  model_build?: string | null
  model_build_en?: string | null
  model_size_worn?: string | null
  // Visuele stijl van de color-picker op deze productpagina:
  //   * 'swatch' (default) — klassieke gekleurde vierkantjes per kleur
  //   * 'image'            — mini productfoto-tegels met swatch-puntje
  pdp_color_picker_style?: 'swatch' | 'image' | null
  product_images: ProductImage[]
  product_variants: ProductVariant[]
  product_quantity_discounts?: { id: string; min_quantity: number; discount_type: string; discount_value: number; is_active: boolean }[]
  categories: {
    name: string
    name_en?: string
    slug: string
    size_guide_type?: string | null
    size_guide_content?: any | null
    size_guide_content_en?: any | null
    default_product_details?: string | null
    default_product_details_en?: string | null
    default_materials_care?: string | null
    default_materials_care_en?: string | null
    pdp_signature_specs?: string | null
    pdp_signature_specs_en?: string | null
  }
}

interface ProductImage {
  id: string
  url: string
  alt_text: string | null
  position: number
  is_primary: boolean
  color: string | null
  media_type: 'image' | 'video'
  video_thumbnail_url?: string | null
  video_duration?: number | null
  /** Per-foto modelinfo; overschrijft productniveau als lengte + maat zijn ingevuld. */
  model_name?: string | null
  model_height?: string | null
  model_build?: string | null
  model_build_en?: string | null
  model_size_worn?: string | null
}

interface ProductVariant {
  id: string
  size: string
  color: string
  color_hex: string
  sku: string
  stock_quantity: number
  presale_stock_quantity: number
  presale_enabled: boolean
  presale_expected_date: string | null
  presale_expected_date_en: string | null
  price_adjustment: number
  is_available: boolean
  display_order: number
}

// Helper functie om ** te vervangen door <strong> tags (met <p> wrapper voor accordions)
function formatTemplateText(text: string): ReactElement[] {
  const lines = text.split('\n')
  return lines.map((line, index) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={index}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>
          }
          return part
        })}
      </p>
    )
  })
}

// XSS-safe: eerst alle HTML escapen, dan alleen onze eigen <strong> en <br> injecteren.
// Zo is DOMPurify niet nodig (SSR-veilig, geen jsdom-bundle issues).
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHTMLContent(html: string): ReactElement {
  const processedHTML = escapeHtml(html)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
  return <div dangerouslySetInnerHTML={{ __html: processedHTML }} />
}

// Helper functie om ** te vervangen door <strong> tags (inline, voor description)
function formatBoldText(text: string): (string | ReactElement)[] {
  const lines = text.split('\n')
  return lines.flatMap((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const elements = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${lineIndex}-${i}`} className="font-bold">{part.slice(2, -2)}</strong>
      }
      return part
    })
    // Add line break between lines (except for the last one)
    if (lineIndex < lines.length - 1) {
      return [...elements, <br key={`br-${lineIndex}`} />]
    }
    return elements
  })
}

// Main Video Component met autoplay (voor grote display)
function MainVideo({ 
  videoUrl, 
  posterUrl 
}: { 
  videoUrl: string
  posterUrl?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => {})
          } else {
            video.pause()
            setIsPlaying(false)
          }
        })
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    
    return () => observer.disconnect()
  }, [videoUrl])

  // Toggle play/pause on click
  const handleVideoClick = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleVideoClick}>
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        muted
        loop
        className="w-full h-full object-contain bg-gray-100"
        poster={posterUrl || undefined}
        preload="metadata"
      />
      {/* Optional: Show pause icon overlay when paused (fades out quickly) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-black/60 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

// Video Thumbnail Component ZONDER autoplay (alleen statische poster)
function VideoThumbnail({ 
  videoUrl, 
  posterUrl, 
  isSelected, 
  onClick 
}: { 
  videoUrl: string
  posterUrl?: string | null
  isSelected: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-brand-primary scale-95'
          : 'border-gray-300 hover:border-black'
      }`}
    >
      {/* Video first frame as thumbnail OR saved poster image */}
      {posterUrl ? (
        // Use saved poster/thumbnail if available
        <Image
          src={posterUrl}
          alt="Video thumbnail"
          fill
          className="object-cover object-center"
        />
      ) : (
        // Use first frame of video as thumbnail
        <video
          src={videoUrl}
          preload="metadata"
          className="w-full h-full object-cover object-center"
          playsInline
          muted
        />
      )}
      {/* Play icon overlay - always visible */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <svg 
          className="w-12 h-12 text-white/90" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  )
}

interface ProductPageProps {
  params: Promise<{ slug: string; locale: string }>
  /** Server-rendered Instagram-feed sectie. Komt vanuit de bovenliggende
   *  page.tsx (server-component) zodat we Instagram-data niet hoeven te
   *  her-fetchen vanuit een client component. Wanneer de admin de feed
   *  niet aan heeft staan, levert page.tsx hier `null` aan en rendert
   *  de PDP gewoon zonder Instagram-blok. */
  instagramSlot?: React.ReactNode
}

export default function ProductPage({ params, instagramSlot }: ProductPageProps) {
  const t = useTranslations('product')
  const tShipping = useTranslations('shipping')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { slug } = use(params)
  // ?color=<exact-or-case-insensitive-color> opens the PDP with that
  // color preselected. Shop color-split tiles + transactional email
  // links rely on this — see src/lib/product-display.ts buildPdpHref()
  // and src/app/api/admin/campaigns/spring-drop/send/route.ts.
  const searchParams = useSearchParams()
  const requestedColorParam = searchParams.get('color')
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  // Helper to get localized product fields
  const getLocalizedName = (product: Product) => 
    locale === 'en' && product.name_en ? product.name_en : product.name
  const getLocalizedDescription = (product: Product) => 
    locale === 'en' && product.description_en ? product.description_en : product.description
  const getLocalizedCategoryName = (product: Product) => 
    locale === 'en' && product.categories.name_en ? product.categories.name_en : product.categories.name
  
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')

  // Heeft de bezoeker maat en kleur zelf aangetikt, of staat er nog wat wij
  // hebben voorgeselecteerd?
  //
  // De pagina kiest bij binnenkomst zelf de eerste leverbare variant. Iemand die
  // vanuit een advertentie binnenkomt en meteen op de vaste koopbalk drukt, legt
  // dus onze voorselectie in de mand zonder er iets aan te doen. Dat ziet er in
  // de cijfers precies hetzelfde uit als een bewuste keuze voor dezelfde maat.
  // Met deze twee vlaggen erbij is het verschil achteraf wél te zien.
  const maatZelfGekozen = useRef(false)
  const kleurZelfGekozen = useRef(false)
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  // Brutalist "BEKIJK ALLES" overlay: opent een fullscreen grid met
  // ALLE product-media, ongeacht hoeveel het er zijn. Wordt geactiveerd
  // door de zwarte "+N MEER"-tegel in de thumbnail-row OF (toekomstig)
  // door een knop boven de gallerij.
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'trust' | 'details' | 'materials' | 'shipping'>('description')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [mobileDescriptionExpanded, setMobileDescriptionExpanded] = useState(false)

  // Handle tab change with perfect scroll positioning (no visible scroll animation)
  const handleTabChange = (newTab: 'description' | 'trust' | 'details' | 'materials' | 'shipping' | '') => {
    // If closing a tab, just close it
    if (!newTab) {
      setActiveTab('' as any)
      return
    }

    // Get the button element that was clicked
    const buttonMap: Record<string, string> = {
      description: '[data-tab="description"]',
      trust: '[data-tab="trust"]',
      details: '[data-tab="details"]',
      materials: '[data-tab="materials"]',
      shipping: '[data-tab="shipping"]',
    }

    const buttonSelector = buttonMap[newTab]
    const buttonElement = buttonSelector ? document.querySelector(buttonSelector) as HTMLElement : null

    if (!buttonElement) {
      setActiveTab(newTab as any)
      return
    }

    // Save button position relative to viewport BEFORE state change
    const buttonRectBefore = buttonElement.getBoundingClientRect()
    const buttonTopBefore = buttonRectBefore.top // Position relative to viewport top
    const scrollYBefore = window.scrollY

    // Update tab state
    setActiveTab(newTab as any)

    // After DOM updates, instantly adjust scroll to compensate for content collapsing/expanding
    // Use double requestAnimationFrame for perfect timing (no setTimeout delay)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (buttonElement) {
          const buttonRectAfter = buttonElement.getBoundingClientRect()
          const buttonTopAfter = buttonRectAfter.top
          
          // Calculate how much the button moved due to content collapsing above it
          const buttonMovement = buttonTopAfter - buttonTopBefore
          
          // Instantly adjust scroll position to keep button at same visual position
          // Use 'auto' behavior for instant scroll (no visible animation)
          // Only adjust if movement is significant (more than 1px for precision)
          if (Math.abs(buttonMovement) > 1) {
            const newScrollY = scrollYBefore + buttonMovement
            
            // Instant scroll - no animation, completely invisible to user
            window.scrollTo({
              top: Math.max(0, newScrollY),
              behavior: 'auto' // Instant, no smooth animation
            })
          }
        }
      })
    })
  }
  const [settings, setSettings] = useState<{
    free_shipping_threshold: number
    return_days: number
    shipping_cost: number
    show_preview_images_notice: boolean
    pdp_sticky_picker_enabled: boolean
    return_label_cost_incl_btw: number
  } | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Ref for scroll container (CSS scroll-snap)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  // Ref for the main Add-to-Cart button - StickyVariantPicker observes
  // this so the sticky strip only appears once the in-page button has
  // scrolled out of view.
  const mainAtcRef = useRef<HTMLButtonElement | null>(null)

  const addItem = useCart((state) => state.addItem)
  const { openDrawer } = useCartDrawer()
  const { addToWishlist, removeFromWishlist, isInWishlist, loadWishlist } = useWishlist()
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    loadWishlist()
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const siteSettings = await getSiteSettings()
      setSettings({
        free_shipping_threshold: siteSettings.free_shipping_threshold,
        return_days: siteSettings.return_days,
        shipping_cost: siteSettings.shipping_cost,
        show_preview_images_notice: siteSettings.show_preview_images_notice || false,
        // Default true: alleen wanneer admin de toggle expliciet uitzet
        // wordt de sticky balk verborgen op de PDP.
        pdp_sticky_picker_enabled:
          siteSettings.pdp_sticky_picker_enabled !== false,
        return_label_cost_incl_btw: siteSettings.return_label_cost_incl_btw,
      })
      setSettingsLoading(false)
    } catch (error) {
      console.error('Error loading settings:', error)
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [slug])

  /**
   * Sync `selectedColor` with `?color=` when the URL param changes on
   * an *already-loaded* product (SPA navigation between two color
   * tiles of the same slug). The initial-load case is already handled
   * inside `fetchProduct` so this effect intentionally skips when the
   * product hasn't loaded yet. Matching is case-insensitive to honour
   * email links / arbitrary user-typed URLs while we still set the
   * canonical (case-preserved) string from the DB row.
   */
  useEffect(() => {
    if (!product || !requestedColorParam) return
    const target = requestedColorParam.toLowerCase()
    const matchVariant = product.product_variants.find(
      (v) => v.color?.toLowerCase() === target,
    )
    if (!matchVariant) return
    if (matchVariant.color === selectedColor) return
    setSelectedColor(matchVariant.color)
    // Snap the size to one with stock in the requested color so the
    // ATC button keeps working without an extra click — matches the
    // initial-load behaviour inside fetchProduct.
    const sameColor = product.product_variants.filter(
      (v) => v.color === matchVariant.color,
    )
    const sized =
      sameColor.find(
        (v) =>
          v.is_available &&
          v.stock_quantity + (v.presale_stock_quantity || 0) > 0,
      ) || sameColor[0]
    if (sized) setSelectedSize(sized.size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedColorParam, product])

  useEffect(() => {
    if (product) {
      setIsWishlisted(isInWishlist(product.id))
      
      // Add to recently viewed
      addToRecentlyViewed(product.id, product.slug)
      
      // Track product view in custom analytics
      trackProductView({
        id: product.id,
        name: product.name,
        category: product.categories?.name || 'uncategorized',
        price: product.sale_price || product.base_price,
      })
    }
  }, [product, isInWishlist])

  // Size guide modal: body scroll lock & ESC key
  useEffect(() => {
    if (showSizeGuide) {
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      
      // ESC key handler
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowSizeGuide(false)
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [showSizeGuide])

  async function fetchProduct() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        name_en,
        description_en,
        size_guide_content_en,
        product_images(*),
        product_variants(
          id,
          product_id,
          size,
          color,
          color_hex,
          sku,
          stock_quantity,
          presale_stock_quantity,
          presale_enabled,
          presale_expected_date,
          presale_expected_date_en,
          price_adjustment,
          is_available,
          display_order,
          created_at
        ),
        categories(name, name_en, slug, size_guide_type, size_guide_content, size_guide_content_en, default_product_details, default_product_details_en, default_materials_care, default_materials_care_en, pdp_signature_specs, pdp_signature_specs_en),
        product_quantity_discounts(id, min_quantity, discount_type, discount_value, is_active)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching product:', error)
      setLoading(false)
      return
    }

    if (data) {
      data.product_images.sort((a: ProductImage, b: ProductImage) => a.position - b.position)
      data.product_variants.sort((a: ProductVariant, b: ProductVariant) => a.display_order - b.display_order)
      setProduct(data)

      // Set page title
      document.title = `${data.name} - MOSE`

      // Track Facebook Pixel ViewContent. content_ids must match the
      // shopping feed / Meta catalogue (UUID, or UUID:colorSlug when
      // the URL already selects a color on a multi-color product).
      const price = data.sale_price || data.base_price
      const uniqueColors: string[] = Array.from(
        new Set(
          (data.product_variants || [])
            .map((v: ProductVariant) => (v.color || '').trim())
            .filter((c: string): c is string => Boolean(c)),
        ),
      )
      // Match feed rows (`UUID:colorSlug`). Prefer ?color=, else first color.
      const resolvedViewColor =
        uniqueColors.find(
          (c) => c.toLowerCase() === (requestedColorParam || '').toLowerCase(),
        ) || uniqueColors[0] || null
      const viewContentId = catalogContentId(data.id, resolvedViewColor)
      trackPixelEvent('ViewContent', {
        content_ids: [viewContentId],
        contents: [{ id: viewContentId, quantity: 1, item_price: price }],
        content_name: data.name,
        content_type: 'product',
        content_category: data.categories?.name,
        value: price,
        currency: 'EUR'
      })

      // Auto-select variant. If the URL came in with ?color=<x> we
      // prefer that color (resolving case-insensitively so email links
      // and color-split shop tiles both work), picking the first size
      // of that color that has stock or presale. Without a match we
      // fall back to "first available across the whole product".
      if (data.product_variants.length > 0) {
        const hasStock = (v: ProductVariant) =>
          v.is_available &&
          v.stock_quantity + (v.presale_stock_quantity || 0) > 0

        let chosen: ProductVariant | undefined
        if (requestedColorParam) {
          const target = requestedColorParam.toLowerCase()
          const colorVariants = data.product_variants.filter(
            (v: ProductVariant) => v.color?.toLowerCase() === target,
          )
          // Within the requested color: prefer a size with stock, then
          // any size at all so the PDP still opens on that color even
          // when the entire color is sold out (admin can still see it
          // and visitors get a "binnenkort terug"-style empty state).
          chosen =
            colorVariants.find(hasStock) ||
            colorVariants.find((v: ProductVariant) => v.is_available) ||
            colorVariants[0]
        }
        if (!chosen) {
          chosen = data.product_variants.find(hasStock)
        }
        if (chosen) {
          setSelectedSize(chosen.size)
          setSelectedColor(chosen.color)
        }
      }

      // Fetch related products from same category
      const { data: related } = await supabase
        .from('products')
        .select(`
          *,
          name_en,
          product_images(*),
          product_variants(
            id,
            product_id,
            size,
            color,
            color_hex,
            sku,
            stock_quantity,
            presale_stock_quantity,
            presale_enabled,
            presale_expected_date,
            presale_expected_date_en,
            price_adjustment,
            is_available,
            display_order,
            created_at
          ),
          categories(name, name_en, slug)
        `)
        // GEEN filter op category_id meer. Dat stond er wel, en daardoor heeft
        // dit blok nooit iets getoond: MOSE heeft vier categorieën met elk
        // precies één product, dus "andere producten in dezelfde categorie"
        // leverde altijd nul rijen op. Het blok was er, de query vond niets.
        .eq('is_active', true)
        .eq('status', 'active')
        .neq('id', data.id)
        .order('base_price', { ascending: true })
        .limit(6)

      if (related) {
        // Niets tonen dat meer dan het dubbele kost van wat iemand nu bekijkt.
        // Een man die een shirt van €50 bekijkt, legt daar geen horloge van
        // €199,95 bij; andersom werkt het wel. Op de horlogepagina vallen alle
        // kledingstukken dus binnen de grens, op een shirtpagina het horloge
        // niet.
        const huidigePrijs = Number(data.sale_price ?? data.base_price ?? 0)
        const plafond = huidigePrijs > 0 ? huidigePrijs * 2 : Infinity

        const productsWithSortedImages = (related as any[])
          .filter((p) => Number(p.sale_price ?? p.base_price ?? 0) <= plafond)
          .slice(0, 4)
          .map((p: any) => ({
            ...p,
            product_images: p.product_images.sort((a: ProductImage, b: ProductImage) => a.position - b.position)
          }))
        setRelatedProducts(productsWithSortedImages)
      }
    }
    setLoading(false)
  }

  /**
   * De kleur in de taal van de bezoeker, in hoofdletters zoals de koptekst
   * hem toont. De omzettabel stond hier en nog een keer in de winkelmandla,
   * met verschillende uitkomsten. Nu staat hij in src/lib/kleurnaam.ts.
   */
  const getTranslatedColor = (color: string) => vertaalKleur(color, locale).toUpperCase()

  const selectedVariant = product?.product_variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )

  // Calculate final price with sale price support
  const finalPrice = product 
    ? (product.sale_price || product.base_price) + (selectedVariant?.price_adjustment || 0) 
    : 0

  // Smart size sorting: XS, S, M, L, XL, XXL, XXXL, etc.
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
  const availableSizes = product 
    ? [...new Set(product.product_variants.map((v) => v.size))].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a.toUpperCase())
        const indexB = sizeOrder.indexOf(b.toUpperCase())
        
        // Both sizes in predefined order - sort by index
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        
        // Only A is in predefined order - A comes first
        if (indexA !== -1) return -1
        
        // Only B is in predefined order - B comes first
        if (indexB !== -1) return 1
        
        // Neither in predefined order - sort alphabetically
        return a.localeCompare(b)
      })
    : []
  const availableColors = product
    ? product.product_variants
        .filter((v) => v.size === selectedSize)
        .map((v) => ({ color: v.color, hex: v.color_hex }))
    : []

  // Get images for selected color (with fallback to general images)
  const getDisplayImages = () => {
    if (!product) return []
    
    // Get color-specific images
    const colorImages = product.product_images.filter(img => img.color === selectedColor)
    
    // Get general images/videos (no color assigned) - these should ALWAYS show
    const generalImages = product.product_images.filter(img => !img.color)
    
    // If we have color-specific images, combine them with general media
    if (colorImages.length > 0) {
      // Merge: general media first (like videos), then color-specific images
      return [...generalImages, ...colorImages].sort((a, b) => a.position - b.position)
    }
    
    // Otherwise, just show general images
    return generalImages.sort((a, b) => a.position - b.position)
  }
  
  const displayImages = getDisplayImages()

  /**
   * Pasvormtag bij de getoonde foto.
   *
   * UITSLUITEND uit de rij van de foto zelf. De terugval op de productvelden
   * is eruit gehaald, want die vertelde op elke foto zonder eigen gegevens het
   * verhaal van iemand anders: op de groene hoodie stond op foto 1 "Marlon is
   * 1,88 m en draagt maat L" en op foto 2 "Model is 1,86, normaal, draagt maat
   * M", terwijl op beide foto's dezelfde man staat. Eén productveld kan ook
   * niet kloppen voor een shoot waarin elke kleur door een ander model wordt
   * gedragen.
   *
   * Geen gegevens op de rij betekent dus geen tag. Op groepsfoto's, waar twee
   * of meer modellen staan, laten we de velden daarom bewust leeg: één naam
   * en één maat zeggen daar niets.
   */
  const modelOverlayProps = (() => {
    if (!product || displayImages.length === 0) return null
    const media = displayImages[selectedImage]
    if (!media) return null

    if (!media.model_height?.trim() || !media.model_size_worn?.trim()) return null

    const build =
      locale === 'en'
        ? media.model_build_en?.trim() || media.model_build?.trim() || null
        : media.model_build?.trim() || null

    return {
      name: media.model_name?.trim() || null,
      height: media.model_height.trim(),
      sizeWorn: media.model_size_worn.trim(),
      build,
    }
  })()

  // Warm XL lightbox assets (CDN) for current + adjacent slides before tap.
  useEffect(() => {
    if (!product) return
    const indices = [selectedImage - 1, selectedImage, selectedImage + 1].filter(
      (i) => i >= 0 && i < displayImages.length,
    )
    for (const i of indices) {
      const m = displayImages[i]
      if (m?.media_type === 'image' && m.url) prefetchPdpLightboxXl(m.url)
    }
  }, [product, selectedImage, selectedColor, selectedSize])

  const scrollToImage = (index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    // Check viewport: mobile uses scroll-snap, desktop uses state
    const isMobile = window.innerWidth < 768
    
    if (isMobile) {
      // Mobile: Scroll to image (triggers scroll event → updates state)
      const imageWidth = container.clientWidth
      container.scrollTo({
        left: index * imageWidth,
        behavior: 'smooth'
      })
    } else {
      // Desktop: Direct state update (instant feedback, no scroll)
      setSelectedImage(index)
    }
  }

  /**
   * Houdt bij naar welke foto je gescrold hebt.
   *
   * Dit stond in een useEffect met `[displayImages.length, selectedImage]` als
   * afhankelijkheden, en dat werkte nooit. Het effect liep twee keer: één keer
   * zonder foto's en één keer met zestien foto's, maar op dat tweede moment
   * stond de galerij nog niet in de DOM, want de pagina toonde toen nog het
   * laadscherm. Toen de galerij er even later wél stond, veranderde geen van de
   * twee afhankelijkheden, dus liep het effect niet opnieuw en werd de
   * luisteraar nooit opgehangen.
   *
   * Gevolg voor elke bezoeker op een telefoon: je kon vegen door alle foto's,
   * maar de teller, de actieve miniatuur en de pasvormtag bleven op foto 1
   * staan, en een foto aantikken opende de vergroting niet, want dat is
   * afgeschermd met `index === selectedImage`.
   *
   * Een ref met een functie lost dat op: die draait precies op het moment dat
   * het element in de DOM komt en opnieuw als het eruit gaat.
   */
  const aantalFotosRef = useRef(0)
  aantalFotosRef.current = displayImages.length
  const losScrollLuisteraar = useRef<(() => void) | null>(null)

  const galerijRef = useCallback((node: HTMLDivElement | null) => {
    losScrollLuisteraar.current?.()
    losScrollLuisteraar.current = null
    scrollContainerRef.current = node
    if (!node) return

    const bijScroll = () => {
      const breedte = node.clientWidth
      if (breedte === 0) return
      const laatste = aantalFotosRef.current - 1
      if (laatste < 0) return
      const nieuw = Math.min(Math.max(Math.round(node.scrollLeft / breedte), 0), laatste)
      setSelectedImage((huidig) => (huidig === nieuw ? huidig : nieuw))
    }

    node.addEventListener('scroll', bijScroll, { passive: true })
    losScrollLuisteraar.current = () => node.removeEventListener('scroll', bijScroll)
  }, [])

  const handleVariantRequired = () => {
    // Scroll to variant selector
    const variantSection = document.querySelector('[data-variant-section]')
    if (variantSection) {
      variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Add pulse animation
      variantSection.classList.add('animate-pulse')
      setTimeout(() => {
        variantSection.classList.remove('animate-pulse')
      }, 2000)
    }
    
    toast.error(t('selectVariantFirst'))
  }

  const handleAddToCart = async (herkomst: 'hoofdknop' | 'vaste_balk' = 'hoofdknop') => {
    if (!product || !selectedVariant) return

    // Get first IMAGE (not video) for cart thumbnail
    const firstImage = displayImages.find(img => img.media_type === 'image')
    const cartImage = firstImage?.url || displayImages[0]?.url || '/placeholder-product.svg'

    const isPresaleItem = selectedVariant.presale_enabled && selectedVariant.presale_stock_quantity > 0
    
    const cartItem = {
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      size: selectedVariant.size,
      color: selectedVariant.color,
      colorHex: selectedVariant.color_hex,
      price: finalPrice,
      quantity: quantity,
      image: cartImage,
      sku: selectedVariant.sku,
      stock: selectedVariant.stock_quantity,
      // PRESALE INFO: Detect if item is from presale stock
      isPresale: isPresaleItem,
      presaleExpectedDate: selectedVariant.presale_enabled ? (selectedVariant.presale_expected_date ?? undefined) : undefined,
      presaleStock: selectedVariant.presale_stock_quantity,  // Pass presale stock for quantity limits
    }

    addItem(cartItem)
    
    // Reset quantity to 1 after successful add
    setQuantity(1)

    // Track Facebook Pixel AddToCart event with user data if logged in.
    //
    // Eén aanroep, niet twee. Hier stond de volledige aanroep in zowel het
    // try- als het catch-blok, met dezelfde parameters. Zolang alleen
    // `getUser()` kon falen ging dat goed, maar elke regel die er later
    // tussen zou komen maakte een dubbele AddToCart mogelijk: één verzonden,
    // dan een fout, dan nog een. Bij een telling die bij Meta al niet
    // overeenkwam met de onze is dat precies het soort fout dat je niet wilt
    // laten liggen. Nu kan alleen het opzoeken van de gebruiker mislukken, en
    // dan gaat de gebeurtenis zonder klantgegevens de deur uit.
    let klantgegevens: { email?: string; firstName?: string; lastName?: string; phone?: string } | undefined
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        klantgegevens = {
          email: user.email || undefined,
          firstName: user.user_metadata?.first_name || undefined,
          lastName: user.user_metadata?.last_name || undefined,
          phone: user.phone || undefined,
        }
      }
    } catch {
      // Niet ingelogd of sessie niet op te halen: dan meten we zonder.
    }

    // Catalog id must match feed g:id (UUID:colorSlug).
    const contentId = catalogContentId(product.id, selectedVariant.color)
    trackPixelEvent(
      'AddToCart',
      {
        content_ids: [contentId],
        contents: [{ id: contentId, quantity, item_price: finalPrice }],
        content_name: `${getLocalizedName(product)} - ${selectedVariant.size} - ${selectedVariant.color}`,
        content_type: 'product',
        content_category: product.categories?.name,
        value: finalPrice * quantity,
        currency: 'EUR',
        num_items: quantity,
      },
      klantgegevens
    )
    
    // Track custom analytics AddToCart event
    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.categories?.name || 'uncategorized',
      price: finalPrice,
      quantity: quantity,
      color: selectedVariant.color,
      size: selectedVariant.size,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      source: 'pdp',
      button: herkomst,
      sizeChosenByUser: maatZelfGekozen.current,
      colorChosenByUser: kleurZelfGekozen.current,
      colorFromUrl: Boolean(requestedColorParam),
    })

    // Open cart drawer immediately
    openDrawer()
  }

  const handleNotifyMe = async () => {
    if (!notifyEmail || !product || !selectedVariant) return

    try {
      const response = await fetch('/api/back-in-stock/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: notifyEmail,
          productId: product.id,
          variantId: selectedVariant.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || t('notify.error'))
        return
      }

      toast.success(t('notify.subscribed'))
      setNotifySubmitted(true)
      setTimeout(() => {
        setNotifySubmitted(false)
        setNotifyEmail('')
      }, 5000)
    } catch (error) {
      console.error('Error notifying:', error)
      toast.error(t('notify.error'))
    }
  }

  if (loading) {
    // Raster, gaps, padding en beeldverhouding staan hier bewust exact gelijk
    // aan de echte layout verderop. Ze liepen uiteen (md:grid-cols-2 tegen
    // [1.2fr_1fr], gap-16 tegen gap-12, aspect-[3/4] tegen md:aspect-[3/3],
    // plus een pt die daar niet bestaat), waardoor de pagina zichtbaar
    // verschoof zodra de data binnenkwam. Wijzig je het een, wijzig het ander mee.
    return (
      <div className="min-h-screen px-4 pb-24 md:pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-12">
            <div className="space-y-4">
              <div className="aspect-[3/4] md:aspect-[3/3] bg-gray-100 animate-pulse"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-12 bg-gray-100 animate-pulse w-3/4"></div>
              <div className="h-8 bg-gray-100 animate-pulse w-1/4"></div>
              <div className="h-24 bg-gray-100 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-6 md:pt-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-display mb-6">{t('notFound')}</h1>
          <LocaleLink
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            {t('backToShop')}
          </LocaleLink>
        </div>
      </div>
    )
  }

  if (product.is_gift_card) {
    return (
      <GiftCardProductView
        product={{
          id: product.id,
          name: product.name,
          name_en: product.name_en ?? null,
          slug: product.slug,
          description: product.description,
          description_en: product.description_en ?? null,
          base_price: product.base_price,
          sale_price: product.sale_price,
          allows_custom_amount: !!product.allows_custom_amount,
          gift_card_min_amount: product.gift_card_min_amount ?? null,
          gift_card_max_amount: product.gift_card_max_amount ?? null,
          gift_card_default_validity_months:
            product.gift_card_default_validity_months ?? null,
          product_images: product.product_images,
          product_variants: product.product_variants.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            color_hex: v.color_hex ?? null,
            sku: v.sku,
            price_adjustment: v.price_adjustment || 0,
            is_available: v.is_available,
            display_order: v.display_order,
          })),
          categories: product.categories
            ? {
                name: product.categories.name,
                name_en: product.categories.name_en ?? null,
                slug: product.categories.slug,
              }
            : null,
        }}
      />
    )
  }

  // Don't render settings-dependent content until settings are loaded
  if (settingsLoading || !settings) {
    return (
      <div className="min-h-screen pt-6 md:pt-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-gray-600">{tCommon('loading')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const inStock = selectedVariant ? selectedVariant.stock_quantity > 0 : false
  const lowStock = selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 5
  const isPresale = selectedVariant && selectedVariant.presale_enabled && selectedVariant.stock_quantity === 0 && selectedVariant.presale_stock_quantity > 0
  const totalStock = selectedVariant ? selectedVariant.stock_quantity + selectedVariant.presale_stock_quantity : 0
  const hasAnyStock = totalStock > 0

  return (
    <>
      <div className="min-h-screen px-4 pb-24 md:pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Sentinel for the mobile sticky variant-picker. Sits at the very
              top of the layout grid so the sticky strip only kicks in once
              the user has scrolled past the hero gallery. */}
          <div data-sticky-picker-sentinel aria-hidden className="h-px w-full" />

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-12">
            {/* LEFT: Image Gallery (55% width) */}
            <div className="space-y-4">
              {/* Main Media Display - Native CSS Scroll-Snap Gallery */}
              {/* De uitloop over de schermbreedte zit op DEZE wrapper, niet op
                  de scroller eronder. Alles wat vast over het beeld moet staan
                  (pasvormtag, stippen, uitverkocht-waas) hangt hieraan vast.
                  Stond dat binnen de scroller, dan schoof het bij de eerste
                  veegbeweging mee naar links het beeld uit: op foto 2 was de
                  tag weg en waren de stippen weg, terwijl ze op desktop bleven
                  staan omdat daar niet horizontaal gescrold wordt. */}
              <div className="relative -mx-4 md:mx-0">
                {/* Scroll Container with CSS Scroll-Snap */}
                <div
                  ref={galerijRef}
                  // Op mobiel over de volle breedte, zonder kader. Hij was 354
                  // van de 390px breed met een rand eromheen en was daarmee de
                  // enige galerij van de acht onderzochte winkels die niet de
                  // volle breedte pakt; dat kost presentiekracht precies waar
                  // beeld het meeste werk doet. De verhouding gaat van 3:4 naar
                  // 4:5 zodat hij breder wordt zonder ook hoger te worden en de
                  // productnaam dus niet verder naar beneden schuift. Op desktop
                  // blijft het kader staan, daar past hij naast de koopdoos.
                  className="relative aspect-[4/5] bg-gray-100 border-y-2 border-black overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide group md:aspect-[3/3] md:border-2 md:overflow-hidden"
                  style={{
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {/* Images Container */}
                  <div className="flex h-full md:block md:relative">
                    {displayImages.map((media, index) => (
                      <div
                        key={media.id}
                        className={`relative w-full h-full flex-shrink-0 snap-start snap-always md:absolute md:inset-0 md:transition-opacity md:duration-300 ${
                          index === selectedImage
                            ? 'md:opacity-100 md:pointer-events-auto'
                            : 'md:opacity-0 md:pointer-events-none'
                        }`}
                      >
                        {media.media_type === 'video' ? (
                          <MainVideo 
                            videoUrl={media.url}
                            posterUrl={media.video_thumbnail_url}
                          />
                        ) : (
                          <div
                            onClick={() => index === selectedImage && setShowLightbox(true)}
                            onPointerEnter={() => {
                              if (media.media_type === 'image' && media.url) prefetchPdpLightboxXl(media.url)
                            }}
                            className={`relative w-full h-full ${index === selectedImage ? 'cursor-zoom-in' : ''}`}
                          >
                            <Image
                              src={media.url || '/placeholder-product.svg'}
                              alt={media.alt_text || product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-contain object-center"
                              priority={index === 0}
                              placeholder="blur"
                              blurDataURL={BLUR_DATA_URL}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Zoom hint - only for images, desktop only */}
                  {displayImages[selectedImage]?.media_type === 'image' && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity hidden md:block pointer-events-none z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  )}

                </div>

                {/* Out of Stock OR Presale Overlay */}
                {!hasAnyStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-white text-2xl md:text-4xl font-display">{t('stock.outOfStock').toUpperCase()}</span>
                  </div>
                )}

                {/* Pasvorm-referentie tag — linksonder op het beeld.
                    Vervangt de oude bulk-card onder de maatkiezer.
                    Renders alleen als zowel lengte als gedragen maat
                    ingevuld zijn in de admin (dus geen lege tag). */}
                {modelOverlayProps ? (
                  <ModelFitInfo
                    name={modelOverlayProps.name}
                    height={modelOverlayProps.height}
                    build={modelOverlayProps.build}
                    sizeWorn={modelOverlayProps.sizeWorn}
                  />
                ) : null}

                {/* Tellertje rechtsboven in plaats van stippen onderin.
                    De stippen stonden onder aan het beeld en vielen daarmee
                    achter de vaste koopbalk. Bovendien werden negen stippen van
                    anderhalve pixel een streepje: je zag niet waar je was en al
                    helemaal niet hoeveel er nog kwamen. Een teller zegt beide,
                    blijft leesbaar bij elk aantal en botst niet met de
                    pasvormtag linksboven. */}
                {displayImages.length > 1 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-3 z-10 bg-black/70 px-2 py-1 text-[11px] font-bold tabular-nums leading-none text-white backdrop-blur-sm md:hidden"
                  >
                    {selectedImage + 1} / {displayImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnails — gecapt op MAX 4 tegels (1 rij op elke device).
                  Bij >4 media: toon de eerste 3 + een zwarte "+N MEER"-tegel
                  die de fullscreen gallery-lightbox opent. Bij ≤4 media:
                  toon ze allemaal zonder overflow-tegel. Dit voorkomt dat
                  de thumbnails wrappen naar 2 rijen en de PDP onnodig
                  hoog wordt — ongeacht hoeveel foto's een variant heeft. */}
              {displayImages.length > 1 && (() => {
                const MAX_VISIBLE_THUMBS = 4
                const hasOverflow = displayImages.length > MAX_VISIBLE_THUMBS
                // Bij overflow houden we 1 slot vrij voor de "+N"-tegel,
                // dus de zichtbare thumbnails worden 3 (i.p.v. 4).
                const visibleCount = hasOverflow
                  ? MAX_VISIBLE_THUMBS - 1
                  : displayImages.length
                const visibleThumbs = displayImages.slice(0, visibleCount)
                // Foto die als "ghost"-achtergrond in de +N tegel komt:
                // bij voorkeur de eerstvolgende verborgen image (positie
                // 3). Voor video's pakken we de poster zodat we altijd
                // een statische preview hebben.
                const overflowAnchor = displayImages[visibleCount]
                const overflowAnchorSrc = overflowAnchor
                  ? overflowAnchor.media_type === 'video'
                    ? overflowAnchor.video_thumbnail_url ?? null
                    : overflowAnchor.url
                  : null
                const hiddenCount = displayImages.length - visibleCount

                return (
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {visibleThumbs.map((media, index) => (
                      media.media_type === 'video' ? (
                        <VideoThumbnail
                          key={media.id}
                          videoUrl={media.url}
                          posterUrl={media.video_thumbnail_url}
                          isSelected={selectedImage === index}
                          onClick={() => scrollToImage(index)}
                        />
                      ) : (
                        <button
                          key={media.id}
                          type="button"
                          onClick={() => scrollToImage(index)}
                          onPointerEnter={() => prefetchPdpLightboxXl(media.url)}
                          className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
                            selectedImage === index
                              ? 'border-brand-primary scale-95'
                              : 'border-gray-300 hover:border-black'
                          }`}
                        >
                          <Image
                            src={media.url}
                            alt={media.alt_text || product.name}
                            fill
                            sizes="(max-width: 768px) 25vw, 12vw"
                            className="object-cover object-center"
                          />
                        </button>
                      )
                    ))}

                    {hasOverflow && (
                      <button
                        type="button"
                        onClick={() => setShowAllPhotos(true)}
                        aria-label={t('gallery.viewAllAria', { count: displayImages.length })}
                        aria-haspopup="dialog"
                        className="group relative aspect-[3/4] border-2 border-black overflow-hidden bg-black text-white transition-all hover:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
                      >
                        {overflowAnchorSrc && (
                          <Image
                            src={overflowAnchorSrc}
                            alt=""
                            aria-hidden="true"
                            fill
                            sizes="(max-width: 768px) 25vw, 12vw"
                            className="object-cover object-center opacity-30 group-hover:opacity-40 transition-opacity"
                          />
                        )}
                        {/* Donkere lift bovenop de ghost-image zorgt
                            dat de "+N"-typografie altijd leesbaar is,
                            ongeacht de helderheid van de achtergrond. */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1.5 leading-none">
                          <span className="font-display text-2xl md:text-3xl tracking-tight flex items-baseline">
                            <Plus
                              size={14}
                              strokeWidth={3}
                              className="mr-0.5 self-center"
                              aria-hidden="true"
                            />
                            {hiddenCount}
                          </span>
                          <span className="mt-1 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.18em] text-white/85 whitespace-nowrap">
                            {t('gallery.viewAllShort')}
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Preview Images Notice - Only show if setting is enabled */}
              {settings?.show_preview_images_notice && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 md:p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-700">
                      {t('presale.previewNotice')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Product Info (45% width, sticky) */}
            <div className="space-y-4 md:sticky md:top-24 md:self-start">
              {/* Subtiele breadcrumb — verplaatst van boven de gallery
                  naar hier zodat 'ie op mobiel direct onder de hoofd-
                  productafbeelding verschijnt en op desktop bovenaan de
                  rechter kolom (visueel net onder de top van het beeld).
                  Klein, lichtgrijs en uppercase-vrij zodat 'ie geen
                  aandacht trekt van de titel + prijs eronder. */}
              <nav
                aria-label={t('breadcrumb.home', { ns: 'common' })}
                className="text-[11px] md:text-xs text-gray-400 leading-tight"
              >
                <LocaleLink
                  href="/"
                  className="hover:text-brand-primary transition-colors"
                >
                  {t('breadcrumb.home', { ns: 'common' })}
                </LocaleLink>
                <span aria-hidden="true" className="mx-1.5 text-gray-300">/</span>
                <LocaleLink
                  href="/shop"
                  className="hover:text-brand-primary transition-colors"
                >
                  {t('breadcrumb.shop', { ns: 'common' })}
                </LocaleLink>
                <span aria-hidden="true" className="mx-1.5 text-gray-300">/</span>
                <LocaleLink
                  href={`/shop?category=${product.categories.slug}`}
                  className="hover:text-brand-primary transition-colors"
                >
                  {product.categories.name}
                </LocaleLink>
                <span aria-hidden="true" className="mx-1.5 text-gray-300">/</span>
                <span className="text-gray-700 font-medium">
                  {product && getLocalizedName(product)}
                </span>
              </nav>

              {/* Title & social proof */}
              <div>
                {/* Review snippet replaces the (often invisible) Trustpilot
                    widget so first-time visitors always see something
                    above the title. Falls back to a brand line when no
                    reviews exist yet. */}
                <div className="mb-1 md:mb-2">
                  <ProductReviewSnippet productId={product.id} />
                </div>
                <div className="flex items-start justify-between gap-3 mb-2 md:mb-3">
                  <h1 className="text-2xl md:text-3xl font-display transition-all duration-300">
                    {product && getLocalizedName(product)}
                    {selectedVariant && selectedColor && (
                      <span className="text-brand-primary"> - {getTranslatedColor(selectedColor)}</span>
                    )}
                  </h1>
                  <span className="hidden md:inline-flex shrink-0 items-center px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">
                    {t('madeInGroningenBadge')}
                  </span>
                </div>
                
                {/* Price Display met Korting */}
                <div className="mb-2">
                  {(() => {
                    const basePrice = product.base_price + (selectedVariant?.price_adjustment || 0)
                    const salePrice = product.sale_price ? product.sale_price + (selectedVariant?.price_adjustment || 0) : null
                    const hasDiscount = salePrice && salePrice < basePrice
                    const discountPercentage = hasDiscount 
                      ? Math.round(((basePrice - salePrice) / basePrice) * 100) 
                      : 0

                    if (hasDiscount) {
                      return (
                        <>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-xl md:text-2xl font-bold text-brand-primary">
                              {formatPrice(salePrice, locale)}
                            </p>
                            <span className="inline-flex items-center px-3 py-1 text-sm font-bold bg-black text-white border-2 border-black">
                              -{discountPercentage}% KORTING
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-base text-gray-500 line-through">
                              {formatPrice(basePrice, locale)}
                            </p>
                            <p className="text-sm text-brand-primary font-semibold">
                              Je bespaart {formatPrice(basePrice - salePrice, locale)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{t('inclVat')}</p>
                          <KlarnaInstallmentLine price={salePrice} />
                        </>
                      )
                    }

                    return (
                      <>
                        <p className="text-xl md:text-2xl font-bold">{formatPrice(basePrice, locale)}</p>
                        <p className="text-xs text-gray-500">{t('inclVat')}</p>
                        <KlarnaInstallmentLine price={basePrice} />
                      </>
                    )
                  })()}
                </div>
                {/* Mobile-only Made-in-Groningen badge sits beneath the price
                    so the title row stays uncluttered on narrow screens. */}
                <span className="md:hidden inline-flex items-center px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                  {t('madeInGroningenBadge')}
                </span>

                {/* Staffelkorting badge */}
                {product.product_quantity_discounts && product.product_quantity_discounts.length > 0
                  && !(product.sale_price && product.sale_price < product.base_price) && (() => {
                  const activeTiers = product.product_quantity_discounts!
                    .filter(t => t.is_active)
                    .sort((a, b) => a.min_quantity - b.min_quantity)
                  if (activeTiers.length === 0) return null
                  const base = product.base_price + (selectedVariant?.price_adjustment || 0)
                  return (
                    <div className="border-2 border-black mt-3">
                      <div className="px-3 md:px-4 py-2 bg-black text-white">
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                          {t('quantityDiscount.title')}
                        </p>
                      </div>
                      <div className="divide-y-2 divide-black">
                        {activeTiers.map((tier) => {
                          const discount = tier.discount_type === 'percentage'
                            ? base * (tier.discount_value / 100)
                            : Math.min(tier.discount_value, base)
                          const finalPrice = base - discount
                          return (
                            <div key={tier.id} className="px-3 md:px-4 py-2 flex items-center justify-between">
                              <span className="text-xs md:text-sm font-bold uppercase tracking-wider">
                                {t('quantityDiscount.tier', { count: tier.min_quantity })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs md:text-sm font-bold">
                                  {t('quantityDiscount.perPiece', { price: formatPrice(finalPrice, locale) })}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-wide">
                                  {tier.discount_type === 'percentage'
                                    ? `-${tier.discount_value}%`
                                    : `-${formatPrice(tier.discount_value, locale)}`}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* PRESALE CARD */}
              {isPresale && selectedVariant && (
                <div className="border-2 border-black p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-bold text-black uppercase tracking-[0.15em]">
                      {t('presale.available', { ns: 'product' })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>{t('presale.expected', { ns: 'product' })}:</strong> {(locale === 'en' ? selectedVariant.presale_expected_date_en : selectedVariant.presale_expected_date) || t('presale.comingSoon', { ns: 'product' })} · {t('presale.limitedEdition', { ns: 'product' })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('presale.payNowReceiveLater', { ns: 'product' })}  ·  {t('presale.shippedImmediately', { ns: 'product' })}
                  </p>
                </div>
              )}

              {/* Description - Desktop: Expandable with line-clamp */}
              <div className="hidden md:block border-t border-b border-gray-200 py-3">
                <div className={`text-sm text-gray-700 leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {formatBoldText(getLocalizedDescription(product))}
                </div>
                {/* Only show button if text is actually clamped (more than 3 lines worth of text) */}
                {getLocalizedDescription(product) && getLocalizedDescription(product).split('\n').length > 3 && (
                  <button 
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-xs text-brand-primary hover:underline font-semibold mt-2 inline-flex items-center gap-1"
                  >
                    {descriptionExpanded ? t('showLess') : t('showMore')}
                    <svg 
                      className={`w-3 h-3 transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* AVAILABILITY & TRUST - Desktop */}
              {selectedVariant && !isPresale && (
                <div className="hidden md:block border-2 border-black">
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    inStock 
                      ? lowStock ? 'bg-white' : 'bg-black text-white'
                      : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      {inStock ? (
                        lowStock ? (
                          <>
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-bold uppercase tracking-wider">
                              {t('stock.lowStock', { count: selectedVariant.stock_quantity })}
                            </p>
                          </>
                        ) : (
                          <>
                            <Package className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-bold uppercase tracking-wider">
                              {t('stock.inStock')}
                            </p>
                          </>
                        )
                      ) : (
                        <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
                          {t('outOfStock')}
                        </p>
                      )}
                    </div>
                  </div>
                  {inStock && (
                    <div className="px-4 py-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold uppercase tracking-wider border-t-2 border-black">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        {t('trust.returns', { days: settings.return_days })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        {settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                          ? tShipping('alwaysFreeShipping')
                          : t('trust.freeShipping', { threshold: settings.free_shipping_threshold })
                        }
                      </span>
                      {product.categories.size_guide_type === 'watch' && (
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          {t('trust.warranty')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Color Selector — twee modes, per product instelbaar in
                  de admin via products.pdp_color_picker_style:
                    * 'swatch' (default): klassieke kleurvierkantjes
                    * 'image':            mini productfoto-tegels per
                                          variant met een kleinen swatch-
                                          puntje rechtsboven, zodat ook
                                          op witte/lichte producten de
                                          kleur direct herkenbaar blijft
                  Beide modes delen exact dezelfde state, hover/disabled
                  en a11y-attributen — alleen de visuele tile verschilt. */}
              {availableColors.length > 0 && (() => {
                const pickerStyle: 'swatch' | 'image' =
                  product.pdp_color_picker_style === 'image' ? 'image' : 'swatch'

                // Beste afbeelding voor een kleurvariant met graceful
                // fallback-keten: primary van die kleur > eerste van die
                // kleur > algemene primary > allereerste image.
                const getImageForColor = (color: string) => {
                  return (
                    product.product_images.find(
                      (img) => img.color === color && img.is_primary
                    ) ||
                    product.product_images
                      .filter((img) => img.color === color)
                      .sort((a, b) => a.position - b.position)[0] ||
                    product.product_images.find((img) => img.is_primary) ||
                    product.product_images[0] ||
                    null
                  )
                }

                return (
                  <div data-color-section>
                    <label className="block text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">
                      {t('color')}: <span className="text-brand-primary font-bold">{getTranslatedColor(selectedColor)}</span>
                    </label>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {availableColors.map(({ color, hex }) => {
                        // Color availability is GLOBAL per color: a colour
                        // counts as available as long as *any* of its sizes
                        // still has stock. This matches the size-picker's
                        // logic below (a size is enabled when any colour
                        // has it). Previously this read selectedSize + color
                        // stock, which produced the confusing UX where
                        // selecting "M" crossed out perfectly valid colours
                        // that simply lacked M — even though those colours
                        // had S/L/XL ready to ship. See
                        // StickyVariantPicker.tsx#colorAvailability for the
                        // same model on the floating bar.
                        const hasStockInColor = product.product_variants.some(
                          (v) => {
                            if (v.color !== color) return false
                            const total =
                              v.stock_quantity + (v.presale_stock_quantity || 0)
                            return v.is_available && total > 0
                          },
                        )
                        const colorAvailable = hasStockInColor
                        const isSelected = selectedColor === color
                        const onPick = () => {
                          kleurZelfGekozen.current = true
                          setSelectedColor(color)
                          setSelectedImage(0)
                          setQuantity(1)
                          // Auto-fallback the size if the currently selected
                          // size is not available in the new colour. The
                          // alternative — keeping a now-invalid size — leaves
                          // the customer staring at a struck-through size
                          // button and a disabled Add-to-cart with no hint of
                          // what to do. We pick the first available size in
                          // canonical XS→XXXL order (availableSizes is
                          // already sorted) so the behaviour is deterministic.
                          const currentSizeAvailableInNewColor =
                            product.product_variants.some((v) => {
                              if (v.color !== color || v.size !== selectedSize) return false
                              const total =
                                v.stock_quantity + (v.presale_stock_quantity || 0)
                              return v.is_available && total > 0
                            })
                          if (!currentSizeAvailableInNewColor) {
                            const fallbackSize = availableSizes.find((size) =>
                              product.product_variants.some((v) => {
                                if (v.color !== color || v.size !== size) return false
                                const total =
                                  v.stock_quantity +
                                  (v.presale_stock_quantity || 0)
                                return v.is_available && total > 0
                              }),
                            )
                            if (fallbackSize) {
                              setSelectedSize(fallbackSize)
                            }
                          }
                        }

                        if (pickerStyle === 'image') {
                          const tileImage = getImageForColor(color)
                          return (
                            <button
                              key={color}
                              onClick={onPick}
                              disabled={!colorAvailable}
                              className={`relative overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'w-14 h-[72px] md:w-16 md:h-20 border-brand-primary ring-2 ring-brand-primary/30'
                                  : 'w-14 h-[72px] md:w-16 md:h-20'
                              } ${
                                colorAvailable
                                  ? isSelected
                                    ? ''
                                    : 'border-gray-300 hover:border-black'
                                  : 'border-gray-300 cursor-not-allowed'
                              }`}
                              aria-label={t('selectColor', { color })}
                              aria-pressed={isSelected}
                            >
                              {tileImage ? (
                                <Image
                                  src={tileImage.url}
                                  alt={getTranslatedColor(color)}
                                  fill
                                  sizes="64px"
                                  className="object-cover object-center"
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="block w-full h-full"
                                  style={{ backgroundColor: hex }}
                                />
                              )}
                              {/* Mini hex-puntje rechtsboven zodat de
                                  klant de kleur ook ziet als de foto er
                                  niks van verraadt (witte stof, ver
                                  uitgezoomd). 2px witte border tegen
                                  donkere foto's. */}
                              <span
                                aria-hidden="true"
                                className="absolute top-1 right-1 w-3 h-3 border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                                style={{ backgroundColor: hex }}
                              />
                              {!colorAvailable && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-0 bg-white/55"
                                  />
                                  <svg
                                    aria-hidden="true"
                                    className="absolute inset-0 w-full h-full text-gray-700/80"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                  >
                                    <line
                                      x1="0"
                                      y1="100"
                                      x2="100"
                                      y2="0"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                    />
                                  </svg>
                                </>
                              )}
                            </button>
                          )
                        }

                        // Default 'swatch'-mode (huidig gedrag, ongewijzigd
                        // op één refactor-detail na: gedeelde onClick).
                        return (
                          <button
                            key={color}
                            onClick={onPick}
                            disabled={!colorAvailable}
                            className={`relative border-2 transition-all ${
                              isSelected
                                ? 'w-14 h-14 md:w-16 md:h-16 border-4 border-brand-primary'
                                : 'w-10 h-10 md:w-12 md:h-12'
                            } ${
                              colorAvailable
                                ? 'border-gray-400 hover:border-black'
                                : 'border-gray-300 cursor-not-allowed opacity-50'
                            }`}
                            aria-label={t('selectColor', { color })}
                          >
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: hex }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                </svg>
                              </div>
                            )}
                            {!colorAvailable && (
                              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                <span className="text-red-600 text-2xl font-bold">✕</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Size Selector with Size Guide */}
              {availableSizes.length > 0 && (
                <div data-variant-section>
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <label className="block text-xs md:text-sm font-bold uppercase tracking-wider">
                      {t('size')}: {selectedSize}
                    </label>
                    {/* Dynamic Size Guide Button - only show if not 'none' */}
                    {product.categories.size_guide_type !== 'none' && (
                      <button
                        onClick={() => setShowSizeGuide(true)}
                        className="text-xs text-brand-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {product.categories.size_guide_type === 'watch' ? t('sizeGuide.specs') : 
                         product.categories.size_guide_type === 'accessory' ? t('sizeGuide.info') :
                         product.categories.size_guide_type === 'shoes' ? t('sizeGuide.shoes') :
                         product.categories.size_guide_type === 'jewelry' ? t('sizeGuide.jewelry') :
                         t('sizeGuide.default')}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => {
                      const sizeVariants = product.product_variants.filter((v) => v.size === size)
                      const sizeAvailable = sizeVariants.some((v) => {
                        const totalStock = v.stock_quantity + (v.presale_stock_quantity || 0)
                        return v.is_available && totalStock > 0
                      })
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            maatZelfGekozen.current = true
                            setSelectedSize(size)
                            setQuantity(1) // Reset quantity when changing size
                            // Optie 1: Behoud kleurkeuze, laat beschikbaarheid zien
                            // Geen automatische kleurwijziging meer
                          }}
                          disabled={!sizeAvailable}
                          className={`px-4 md:px-5 py-2 border-2 font-bold uppercase tracking-wider transition-all text-sm ${
                            selectedSize === size
                              ? 'border-brand-primary bg-brand-primary text-white'
                              : sizeAvailable
                              ? 'border-black hover:bg-black hover:text-white'
                              : 'border-gray-300 text-gray-400 cursor-not-allowed line-through'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>

                  {/* Pasvorm-referentie verhuisd naar een compacte
                      overlay-tag linksonder op de hoofd-product-
                      afbeelding (zie gallery hierboven). Geeft hetzelfde
                      signaal aan de klant zonder verticale ruimte op te
                      eten. Zie ModelFitInfo voor de render-regels. */}
                </div>
              )}

              {/* Add to Cart row — direct onder de sizepicker zodat de
                  klant z'n maat kiest en meteen kan kopen zonder te scrollen.
                  PdpTrustStrip + ProductActivityStrip volgen ERONDER als
                  post-decision reassurance + sociale bewijsvoering. */}
              <div className="flex gap-2 md:gap-3">
                {/* De aantalkiezer stond hier, naast de koopknop, en is weg.
                    Geen van de zeven onderzochte concurrenten (Asket, Norse
                    Projects, Carhartt WIP, Les Deux, Colorful Standard,
                    Pockies, Suitsupply) zet er een boven de vouw. Het is een
                    extra beslissing op het moment dat je er geen wilt, en het
                    at de halve breedte van de koopknop op. Meer dan één stuk
                    stel je in de winkelwagen in. */}
                {/* IN WINKELMAND button - primary action.
                    data-pdp-main-atc: door BrandDiscoveryWidget gequery'd
                    via DOM zodat de widget weet wanneer de sticky variant-
                    picker actief wordt en zichzelf moet verbergen. */}
                <button
                  ref={mainAtcRef}
                  data-pdp-main-atc
                  onClick={() => handleAddToCart('hoofdknop')}
                  disabled={!hasAnyStock || !selectedVariant || addedToCart}
                  className={`flex-1 min-w-0 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-wider transition-all ${
                    addedToCart
                      ? 'bg-black text-white cursor-default animate-success'
                      : hasAnyStock && selectedVariant
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {addedToCart ? t('added') : hasAnyStock ? t('addToCartCTA') : t('outOfStock')}
                </button>

                {/* Wishlist button - secondary - MOSE Brutalist - Hidden on mobile */}
                <button
                  onClick={async () => {
                    if (!product) return
                    const wasWishlisted = isInWishlist(product.id)

                    if (wasWishlisted) {
                      await removeFromWishlist(product.id)
                    } else {
                      await addToWishlist(product.id)
                    }

                    const nowWishlisted = isInWishlist(product.id)
                    setIsWishlisted(nowWishlisted)

                    if (!wasWishlisted && nowWishlisted) {
                      toast.success(t('wishlist.added'))
                    } else if (wasWishlisted && !nowWishlisted) {
                      toast.success(t('wishlist.removed'))
                    }
                  }}
                  className={`hidden md:flex md:w-auto md:p-4 border-2 border-black transition-all items-center justify-center ${
                    isWishlisted
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-white text-black hover:bg-brand-primary hover:text-white'
                  }`}
                  title={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
                  aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Back in Stock Notification — alternatief CTA wanneer de
                  ATC-knop disabled is. Staat direct onder de disabled knop
                  zodat de klant meteen z'n e-mailadres kan achterlaten. */}
              {!hasAnyStock && selectedVariant && (
                <div className="bg-gray-50 border-2 border-gray-300 p-4 rounded">
                  <h3 className="font-bold mb-2">{t('notify.title')}</h3>
                  <p className="text-sm text-gray-600 mb-3">{t('notify.description')}</p>
                  {notifySubmitted ? (
                    <div className="text-black font-bold flex items-center gap-2 animate-fadeIn">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('notify.success')}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder={t('placeholder.email', { ns: 'checkout' })}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                      <button
                        onClick={handleNotifyMe}
                        className="px-6 py-2 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                      >
                        {t('notify.submit')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Trust + fit anchor — vier conversie-blokkers in 4 regels.
                  Staat onder de ATC als post-decision reassurance: de
                  klant kiest maat, koopt, en ziet dan direct waarom dat
                  een veilige beslissing is (verzending, retour, herkomst,
                  betaalopties). */}
              {hasAnyStock && (
                <div className="border-2 border-black p-3 md:p-4">
                  <PdpTrustStrip
                    freeShippingThreshold={settings.free_shipping_threshold}
                    signatureSpecs={
                      locale === 'en'
                        ? product.categories.pdp_signature_specs_en || product.categories.pdp_signature_specs || null
                        : product.categories.pdp_signature_specs || null
                    }
                  />
                </div>
              )}

              {/* Productbeschrijving op mobiel, NIET meer in een uitklapper.
                  De oude tekst was 145 woorden en moest wel dichtgeklapt, anders
                  duwde hij de hele pagina weg; je zag hem pas op 2,1 scherm en
                  alleen na een tik. De nieuwe tekst is 71 tot 83 woorden en past
                  hier gewoon, direct onder de koopknop en de vertrouwensregels.
                  Op desktop staat hij al in de koopdoos naast de foto's. */}
              <div className="md:hidden border-2 border-black p-4">
                <div className="text-sm leading-relaxed text-gray-800">
                  {formatBoldText(getLocalizedDescription(product))}
                </div>
              </div>

              {/* Live activity - only renders when thresholds are met */}
              {hasAnyStock && <ProductActivityStrip productId={product.id} />}

              {/* Product Tabs / Accordion */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="space-y-4">
                  {/* Trust Badges Tab - Mobile only */}
                  <div className="md:hidden border-2 border-black">
                    <button
                      data-tab="trust"
                      onClick={() => handleTabChange(activeTab === 'trust' ? '' : 'trust')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.shippingReturns')}</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'trust' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'trust' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-3">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">
                            {settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                              ? tShipping('alwaysFreeShipping')
                              : t('trust.freeShipping', { threshold: settings.free_shipping_threshold })
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <RotateCcw className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{t('returns.info', { days: settings.return_days })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{t('madeLocally')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details Tab */}
                  <div className="border-2 border-black">
                    <button
                      data-tab="details"
                      onClick={() => handleTabChange(activeTab === 'details' ? '' : 'details')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.details')}</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'details' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'details' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        {product.categories?.default_product_details || product.categories?.default_product_details_en ? (
                          renderHTMLContent(
                            locale === 'en' && product.categories?.default_product_details_en 
                              ? product.categories.default_product_details_en 
                              : product.categories?.default_product_details || ''
                          )
                        ) : (
                          <>
                            <p><span className="font-semibold">{locale === 'en' ? 'Premium quality:' : 'Premium kwaliteit:'}</span> {locale === 'en' ? 'High-quality materials that last' : 'Hoogwaardige materialen die lang meegaan'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Perfect fit:' : 'Perfect fit:'}</span> {locale === 'en' ? 'Designed for comfort and style' : 'Ontworpen voor comfort en stijl'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Locally made:' : 'Lokaal gemaakt:'}</span> {locale === 'en' ? 'Produced with love in Groningen' : 'Met liefde geproduceerd in Groningen'}</p>
                          </>
                        )}
                        
                        {/* Preview Images Notice - Only show if setting is enabled */}
                        {settings?.show_preview_images_notice && (
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <p>{t('presale.previewNotice')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Materials Tab */}
                  <div className="border-2 border-black">
                    <button
                      data-tab="materials"
                      onClick={() => handleTabChange(activeTab === 'materials' ? '' : 'materials')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.materials')}</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'materials' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'materials' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        {product.categories?.default_materials_care || product.categories?.default_materials_care_en ? (
                          renderHTMLContent(
                            locale === 'en' && product.categories?.default_materials_care_en 
                              ? product.categories.default_materials_care_en 
                              : product.categories?.default_materials_care || ''
                          )
                        ) : (
                          <>
                            <p><span className="font-semibold">{locale === 'en' ? 'Material:' : 'Materiaal:'}</span> {locale === 'en' ? 'OEKO-Tex certified cotton, regular fit' : 'OEKO-Tex gecertificeerd katoen, regular fit'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Washing instructions:' : 'Was instructies:'}</span> {locale === 'en' ? 'Machine washable at 30°C, inside out' : 'Machinewasbaar op 30°C, binnenstebuiten'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Ironing:' : 'Strijken:'}</span> {locale === 'en' ? 'Low temperature, inside out' : 'Op lage temperatuur, binnenstebuiten'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Drying:' : 'Drogen:'}</span> {locale === 'en' ? 'Do not tumble dry, hang to dry' : 'Niet in de droger, ophangen'}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shipping Tab - Desktop only (mobile has it in Trust tab) */}
                  <div className="hidden md:block border-2 border-black">
                    <button
                      data-tab="shipping"
                      onClick={() => handleTabChange(activeTab === 'shipping' ? '' : 'shipping')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.shippingReturns')}</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'shipping' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'shipping' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        <p><span className="font-semibold">{t('shipping.label')}:</span> {
                          settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                            ? tShipping('alwaysFreeShipping')
                            : t('trust.freeShipping', { threshold: settings.free_shipping_threshold })
                        }</p>
                        <p><span className="font-semibold">{t('shipping.deliveryTime')}:</span> {t('shipping.deliveryTimeValue')}</p>
                        <p><span className="font-semibold">{t('returns.label')}:</span> {t('returns.info', { days: settings.return_days })}</p>
                        <p><span className="font-semibold">{t('returns.cost')}:</span> {t('returns.costValue', { cost: settings.return_label_cost_incl_btw.toFixed(2).replace('.', ',') })}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products (Feature 4) */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 md:mt-24 border-t-2 border-gray-200 pt-16">
              <h2 className="text-3xl md:text-4xl font-display mb-8 text-center">{t('related.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((relProd) => {
                  const primaryImage = relProd.product_images.find((img: ProductImage) => img.is_primary) || relProd.product_images[0]
                  const hasStock = relProd.product_variants.some((v: ProductVariant) => v.stock_quantity > 0)
                  
                  return (
                    <LocaleLink
                      key={relProd.id}
                      href={`/product/${relProd.slug}`}
                      className="group block"
                    >
                      <div className="bg-white border-2 border-black overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                        <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                          {primaryImage && (
                            <Image
                              src={primaryImage.url}
                              alt={relProd.name}
                              fill
                              sizes="(max-width: 640px) 50vw, 25vw"
                              className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                            />
                          )}
                          {!hasStock && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold uppercase">
                              {t('outOfStock')}
                            </div>
                          )}
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{relProd.name}</h3>
                          {(() => {
                            const hasDiscount = relProd.sale_price && relProd.sale_price < relProd.base_price
                            if (hasDiscount && relProd.sale_price) {
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-lg font-bold text-brand-primary">{formatPrice(relProd.sale_price, locale)}</p>
                                  <p className="text-sm text-gray-500 line-through">{formatPrice(relProd.base_price, locale)}</p>
                                </div>
                              )
                            }
                            return <p className="text-lg font-bold">{formatPrice(relProd.base_price, locale)}</p>
                          })()}
                        </div>
                      </div>
                    </LocaleLink>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recently Viewed Products */}
          <RecentlyViewed currentProductId={product.id} />

          {/* Product Reviews */}
          <ProductReviews productId={product.id} />

          {/* De veelgestelde vragen staan nu BOVEN het Instagram-blok.
              Ze beantwoorden de vijf dingen waarop mensen afhaken (maat,
              levertijd, ruilen, herkomst, betalen) en stonden op 5,2 scherm,
              ná een blok dat niets verkoopt. Geen van de zeven onderzochte
              concurrenten heeft zo'n product-FAQ; het is iets wat MOSE beter
              doet, en dan moet het niet onderaan staan. */}
          <PdpFaq
            freeShippingThreshold={settings.free_shipping_threshold}
            shippingCost={settings.shipping_cost}
            returnDays={settings.return_days}
            locale={locale}
          />

          {/* Instagram als laatste blok: visuele afsluiter, geen koopmoment.
              Rendert niets als de admin de feed uit heeft staan. */}
          {instagramSlot}
        </div>
      </div>

      {/* Brutalist fullscreen GALLERY-lightbox: toont alle product-media
          in een verticaal grid. Geactiveerd door de "+N MEER"-tegel in
          de thumbnail-row (of toekomstige andere triggers). Klikken op
          een tegel navigeert de hero-viewer naar die index en sluit. */}
      {showAllPhotos && (
        <PdpGalleryLightbox
          items={displayImages.map((m) => ({
            id: m.id,
            url: m.url,
            alt_text: m.alt_text,
            media_type: m.media_type,
            video_thumbnail_url: m.video_thumbnail_url,
          }))}
          selectedIndex={selectedImage}
          productName={product.name}
          onSelect={(idx) => scrollToImage(idx)}
          onClose={() => setShowAllPhotos(false)}
        />
      )}

      {/* Fullscreen image lightbox.
          Bevat ALLEEN de image-media (videos slaan we over: die spelen
          al in de hero-viewer en zouden in een swipe-strip rare
          autoplay-keuzes triggeren). De index die we doorgeven wordt
          gemapt van `selectedImage` (positie in displayImages) naar de
          positie in de gefilterde imageOnlyMedia-lijst. Bij swipe in
          de lightbox mappen we andersom terug zodat de hero-viewer
          dezelfde foto toont na sluiten. */}
      {showLightbox && displayImages[selectedImage]?.media_type === 'image' && (() => {
        const imageOnlyMedia = displayImages
          .map((m, originalIdx) => ({ media: m, originalIdx }))
          .filter(({ media }) => media.media_type === 'image')

        // Map selected hero-index -> index binnen image-only lijst.
        const initialLightboxIndex = Math.max(
          0,
          imageOnlyMedia.findIndex(({ originalIdx }) => originalIdx === selectedImage),
        )

        return (
          <PdpImageLightbox
            items={imageOnlyMedia.map(({ media }) => ({
              id: media.id,
              url: media.url,
              alt_text: media.alt_text,
            }))}
            initialIndex={initialLightboxIndex}
            productName={product.name}
            onClose={() => setShowLightbox(false)}
            onIndexChange={(idx) => {
              const original = imageOnlyMedia[idx]?.originalIdx
              if (typeof original === 'number') {
                scrollToImage(original)
              }
            }}
          />
        )
      })()}

      {/* Hybrid Size Guide Modal: Product Override OR Category Template */}
      {showSizeGuide && (() => {
        // Priority 1: Product-specific content (override)
        // Select locale-specific content: EN if locale is 'en', otherwise NL
        const sizeGuideContent = locale === 'en' 
          ? (product.size_guide_content_en || product.categories.size_guide_content_en || product.size_guide_content || product.categories.size_guide_content)
          : (product.size_guide_content || product.categories.size_guide_content)
        
        // If we have JSON content, use DynamicSizeGuideModal
        if (sizeGuideContent) {
          return (
            <DynamicSizeGuideModal
              content={sizeGuideContent}
              onClose={() => setShowSizeGuide(false)}
            />
          )
        }
        
        // Fallback: Hardcoded modals for backward compatibility
        if (product.categories.size_guide_type === 'watch') {
          return <WatchSpecsModal onClose={() => setShowSizeGuide(false)} />
        }
        
        // Fallback: Default clothing size guide
        return (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
            onClick={() => setShowSizeGuide(false)}
            aria-label={t('sizeGuide.close')}
          >
            <div 
              className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">{t('sizeGuide.title')}</h2>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label={t('sizeGuide.close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="sm:hidden mb-2 text-xs text-gray-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Swipe naar links voor meer →</span>
              </div>
              
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full border-2 border-black min-w-[500px]">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Maat</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Borst (cm)</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Lengte (cm)</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Schouders (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm">
                    <tr className="border-b-2 border-black">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">S</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">88-96</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">68-70</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">44-46</td>
                    </tr>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">M</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">96-104</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">70-72</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">46-48</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">L</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">104-112</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">72-74</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">48-50</td>
                    </tr>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XL</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">112-120</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">74-76</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">50-52</td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XXL</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">120-128</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">76-78</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">52-54</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 sm:mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
                <h3 className="font-bold text-sm sm:text-base">Hoe meet je?</h3>
                <p><span className="font-semibold">Borst:</span> Meet rond de breedste punt van je borst</p>
                <p><span className="font-semibold">Lengte:</span> Meet vanaf de halsnaad tot aan de onderkant</p>
                <p><span className="font-semibold">Schouders:</span> Meet van schouder tot schouder over de rug</p>
              </div>

              <button
                onClick={() => setShowSizeGuide(false)}
                className="mt-4 sm:mt-6 w-full py-3 sm:py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-sm sm:text-base"
              >
                Sluiten
              </button>
            </div>
          </div>
        )
      })()}

      {/* Smart hybrid sticky variant-picker
          Shares the same selectedColor/selectedSize/handleAddToCart state
          as the in-page surface so picking a colour or size from the
          sticky strip mirrors the rest of the PDP and vice-versa.
          Admin kan dit globaal uitzetten via /admin/settings. We wachten
          tot settings geladen zijn voordat we renderen om geen flits van
          de sticky balk te krijgen wanneer deze uit hoort te staan. */}
      {product && !settingsLoading && settings?.pdp_sticky_picker_enabled && (
        <StickyVariantPicker
          productId={product.id}
          availableColors={availableColors}
          availableSizes={availableSizes}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          onSelectColor={(color) => {
            kleurZelfGekozen.current = true
            setSelectedColor(color)
            setSelectedImage(0)
            setQuantity(1)
          }}
          onSelectSize={(size) => {
            maatZelfGekozen.current = true
            setSelectedSize(size)
            setQuantity(1)
          }}
          variants={product.product_variants}
          finalPrice={finalPrice}
          basePrice={product.base_price + (selectedVariant?.price_adjustment || 0)}
          hasDiscount={Boolean(
            product.sale_price &&
              product.sale_price < product.base_price
          )}
          hasAnyStock={hasAnyStock}
          isAdding={addedToCart}
          hasVariantSelected={Boolean(selectedVariant)}
          onAddToCart={() => handleAddToCart('vaste_balk')}
          mainAtcRef={mainAtcRef}
          translateColor={getTranslatedColor}
        />
      )}
    </>
  )
}
