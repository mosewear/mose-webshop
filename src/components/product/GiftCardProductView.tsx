'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import toast from 'react-hot-toast'
import {
  Gift,
  Mail,
  Calendar,
  Sparkles,
  Check,
  ShoppingCart,
  ChevronDown,
} from 'lucide-react'
import { useCart, type GiftCardRecipient } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'
import TrustpilotWidget from '@/components/TrustpilotWidget'

interface GiftCardProductImage {
  id: string
  url: string
  alt_text: string
  position: number
  is_primary: boolean
}

export interface GiftCardProductViewProps {
  product: {
    id: string
    name: string
    name_en?: string | null
    slug: string
    description?: string | null
    description_en?: string | null
    base_price: number
    sale_price: number | null
    allows_custom_amount: boolean
    gift_card_min_amount: number | null
    gift_card_max_amount: number | null
    gift_card_default_validity_months: number | null
    product_images: GiftCardProductImage[]
    product_variants: Array<{
      id: string
      size: string
      color: string
      color_hex: string | null
      sku: string
      price_adjustment: number
      is_available: boolean
      display_order: number
    }>
    categories: { name: string; name_en?: string | null; slug: string } | null
  }
}

function parseAmount(value: string): number {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

// Inline `**bold**` → <strong>, line breaks → <br>. Matches the
// rendering on the regular product page (`formatBoldText` there) so
// merchant-authored copy looks identical across product types.
function formatBoldText(text: string): (string | ReactElement)[] {
  const lines = text.split('\n')
  return lines.flatMap((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const elements = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`${lineIndex}-${i}`} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
    if (lineIndex < lines.length - 1) {
      return [...elements, <br key={`br-${lineIndex}`} />]
    }
    return elements
  })
}

function safeT(
  t: ReturnType<typeof useTranslations>,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
): string {
  try {
    const v = values ? t(key, values) : t(key)
    if (!v || v === key || v.endsWith(`.${key}`)) return fallback
    return v as string
  } catch {
    return fallback
  }
}

export default function GiftCardProductView({ product }: GiftCardProductViewProps) {
  const locale = useLocale()
  const t = useTranslations('giftCard')
  const tCommon = useTranslations('common')
  const tProduct = useTranslations('product')
  const addItem = useCart((s) => s.addItem)
  const openDrawer = useCartDrawer((s) => s.openDrawer)
  const isCartDrawerOpen = useCartDrawer((s) => s.isOpen)

  const displayName = locale === 'en' && product.name_en ? product.name_en : product.name
  const displayDescription =
    locale === 'en' && product.description_en
      ? product.description_en
      : product.description ?? ''
  const categoryName =
    locale === 'en' && product.categories?.name_en
      ? product.categories?.name_en
      : product.categories?.name

  // Denominations are stored as `product_variants` where `size` is the
  // label (e.g. "€50") and the displayed amount = base_price + price_adjustment.
  const denominations = useMemo(() => {
    return [...(product.product_variants || [])]
      .filter((v) => v.is_available)
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.price_adjustment - b.price_adjustment
      )
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        label: v.size,
        amount: Math.round(((product.base_price || 0) + (v.price_adjustment || 0)) * 100) / 100,
      }))
      .filter((d) => d.amount > 0)
  }, [product])

  const allowCustom = !!product.allows_custom_amount
  const minCustom = product.gift_card_min_amount ?? 10
  const maxCustom = product.gift_card_max_amount ?? 500
  const validityMonths = product.gift_card_default_validity_months

  const [mode, setMode] = useState<'preset' | 'custom'>(
    denominations.length > 0 ? 'preset' : 'custom'
  )
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    denominations[0]?.variantId ?? null
  )
  const [customAmountText, setCustomAmountText] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isGift, setIsGift] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [justAdded, setJustAdded] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [openMobilePanel, setOpenMobilePanel] = useState<
    'description' | 'how' | 'faq' | ''
  >('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [stickyVisible, setStickyVisible] = useState(false)

  // Sticky mobile CTA mirrors the StickyBuyNow component on regular
  // PDPs — visible <768px, hidden when the cart drawer is open or on
  // cart/checkout routes.
  useEffect(() => {
    const onResize = () => setStickyVisible(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    if (path.includes('/cart') || path.includes('/checkout')) setStickyVisible(false)
  }, [])

  const activeDenomination = denominations.find((d) => d.variantId === selectedVariantId)
  const customAmount = parseAmount(customAmountText)

  const resolvedAmount =
    mode === 'preset' ? activeDenomination?.amount ?? 0 : customAmount

  const validCustom =
    mode === 'custom' ? customAmount >= minCustom && customAmount <= maxCustom : true
  const hasAmount = resolvedAmount > 0
  // Gift cards never reference a real product_variants row server-side
  // (checkout forces order_items.variant_id to NULL), so we only need
  // a denomination row picked when the user is actually on the preset
  // tab — custom mode is amount-only.
  const presetSelected = mode !== 'preset' || !!activeDenomination
  const recipientValid =
    !isGift ||
    (recipientEmail.trim().length > 3 &&
      /.+@.+\..+/.test(recipientEmail.trim()) &&
      recipientName.trim().length > 0)
  const scheduleValid =
    !isGift ||
    !scheduleEnabled ||
    (!!scheduleDate && new Date(scheduleDate).getTime() > Date.now())

  const canAdd = hasAmount && validCustom && presetSelected && recipientValid && scheduleValid

  const primaryImage =
    product.product_images.find((i) => i.is_primary) || product.product_images[0]
  const imageUrl = primaryImage?.url || '/placeholder-product.svg'

  // Strings (with safe NL/EN fallbacks)
  const sBadge = safeT(t, 'badge', locale === 'en' ? 'Gift card' : 'Cadeaubon')
  const sChooseAmount = safeT(
    t,
    'chooseAmount',
    locale === 'en' ? 'Choose an amount' : 'Kies een bedrag'
  )
  const sAmountLabel = safeT(t, 'amountLabel', locale === 'en' ? 'Amount' : 'Bedrag')
  const sAmountCustom = safeT(
    t,
    'amountCustom',
    locale === 'en' ? 'Custom' : 'Eigen bedrag'
  )
  const sCustomLabel = safeT(
    t,
    'customAmountLabel',
    locale === 'en'
      ? `Choose between €${minCustom} and €${maxCustom}`
      : `Zelf kiezen tussen €${minCustom} en €${maxCustom}`,
    { min: minCustom, max: maxCustom }
  )
  const sCustomInvalid = safeT(
    t,
    'customAmountInvalid',
    locale === 'en'
      ? `Amount must be between €${minCustom} and €${maxCustom}`
      : `Bedrag moet tussen €${minCustom} en €${maxCustom} liggen`,
    { min: minCustom, max: maxCustom }
  )
  const sPriceFrom = safeT(
    t,
    'priceFromLabel',
    locale === 'en' ? `From ${formatPrice(minCustom)}` : `Vanaf ${formatPrice(minCustom)}`,
    { amount: formatPrice(minCustom) }
  )
  const sValidity = validityMonths
    ? safeT(
        t,
        'validityNote',
        locale === 'en'
          ? `Valid for ${validityMonths} months`
          : `Geldig ${validityMonths} maanden`,
        { months: validityMonths }
      )
    : null
  const sSendAsGift = safeT(
    t,
    'sendAsGift',
    locale === 'en'
      ? 'Send as a gift to someone'
      : 'Verstuur als cadeau naar iemand anders'
  )
  const sSendAsGiftHelp = safeT(
    t,
    'sendAsGiftHelp',
    locale === 'en'
      ? 'The code is emailed directly to the recipient with your personal message.'
      : 'De code wordt rechtstreeks naar de ontvanger gestuurd met jouw persoonlijke bericht.'
  )
  const sRecipientName = safeT(
    t,
    'recipientName',
    locale === 'en' ? 'Recipient name' : 'Naam ontvanger'
  )
  const sRecipientEmail = safeT(
    t,
    'recipientEmail',
    locale === 'en' ? 'Recipient email' : 'E-mail ontvanger'
  )
  const sSenderName = safeT(t, 'senderName', locale === 'en' ? 'From' : 'Van')
  const sMessage = safeT(
    t,
    'message',
    locale === 'en' ? 'Personal message' : 'Persoonlijk bericht'
  )
  const sSchedule = safeT(
    t,
    'scheduleDelivery',
    locale === 'en' ? 'Send on a specific date' : 'Verstuur op een specifieke datum'
  )
  const sScheduleInvalid = safeT(
    t,
    'scheduleInvalid',
    locale === 'en'
      ? 'Pick a date and time in the future.'
      : 'Kies een datum en tijd in de toekomst.'
  )
  const sAddToCart = safeT(
    t,
    'addToCart',
    locale === 'en' ? 'Add to cart' : 'Voeg toe aan winkelmand'
  )
  const sAdded = safeT(t, 'added', locale === 'en' ? 'Added' : 'Toegevoegd')
  const sStickyAddToCart = safeT(
    t,
    'stickyAddToCart',
    locale === 'en' ? 'Add gift card' : 'Voeg cadeaubon toe'
  )
  const sStickyChoose = safeT(
    t,
    'stickyChooseAmount',
    locale === 'en' ? 'Pick an amount first' : 'Kies eerst een bedrag'
  )
  const sStickyRecipient = safeT(
    t,
    'stickyFillRecipient',
    locale === 'en' ? 'Fill in recipient details' : 'Vul de ontvangergegevens in'
  )
  const sTrustDelivery = safeT(
    t,
    'trustDelivery',
    locale === 'en' ? 'Instant delivery' : 'Direct geleverd'
  )
  const sTrustValidity = validityMonths
    ? safeT(
        t,
        'trustValidity',
        locale === 'en' ? `${validityMonths} mo valid` : `${validityMonths} mnd geldig`,
        { months: validityMonths }
      )
    : safeT(
        t,
        'trustValidityFallback',
        locale === 'en' ? 'Spend whenever' : 'Op alles in te wisselen'
      )
  const sTrustCombine = safeT(
    t,
    'trustCombine',
    locale === 'en' ? 'Also on sale items' : 'Ook op sale items'
  )
  const sHowTitle = safeT(
    t,
    'howItWorksTitle',
    locale === 'en' ? 'How it works' : 'Zo werkt het'
  )
  const sStep1Title = safeT(
    t,
    'howItWorksStep1Title',
    locale === 'en' ? 'Pick an amount' : 'Kies een bedrag'
  )
  const sStep1Desc = safeT(
    t,
    'howItWorksStep1Desc',
    locale === 'en'
      ? `Grab a fixed amount or set your own — from €${minCustom} to €${maxCustom}.`
      : `Pak een vast bedrag of bepaal zelf het exacte bedrag — van €${minCustom} tot €${maxCustom}.`,
    { min: minCustom, max: maxCustom }
  )
  const sStep2Title = safeT(
    t,
    'howItWorksStep2Title',
    locale === 'en' ? 'Make it personal' : 'Maak het persoonlijk'
  )
  const sStep2Desc = safeT(
    t,
    'howItWorksStep2Desc',
    locale === 'en'
      ? 'Send it straight to the recipient with your own message, or schedule delivery for a specific date.'
      : "Verstuur 'm direct naar de ontvanger met een eigen bericht, of plan de bezorging op een specifieke datum."
  )
  const sStep3Title = safeT(
    t,
    'howItWorksStep3Title',
    locale === 'en' ? 'Straight to the inbox' : 'Direct in de mailbox'
  )
  const sStep3Desc = safeT(
    t,
    'howItWorksStep3Desc',
    locale === 'en'
      ? 'Once paid, the unique code lands by email — ready to spend on anything in the collection.'
      : 'Na betaling komt de unieke code per mail binnen — klaar om te besteden op alles in de collectie.'
  )
  const sFaqTitle = safeT(
    t,
    'faqTitle',
    locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'
  )

  type FaqItem = { q: string; a: string }
  const faqItems: FaqItem[] = [
    {
      q: safeT(
        t,
        'faq1Q',
        locale === 'en' ? 'What can I spend it on?' : 'Waar kan ik de bon besteden?'
      ),
      a: safeT(
        t,
        'faq1A',
        locale === 'en'
          ? 'Anything on mosewear.com — basics, hoodies, tees and sweaters. Sale items included.'
          : 'Op alles op mosewear.com — basics, hoodies, tees en sweaters. Ook op afgeprijsde items.'
      ),
    },
    {
      q: safeT(
        t,
        'faq2Q',
        locale === 'en' ? 'How long is the card valid?' : 'Hoe lang is de bon geldig?'
      ),
      a: validityMonths
        ? safeT(
            t,
            'faq2A',
            locale === 'en'
              ? `${validityMonths} months after purchase. Any unspent balance stays on the card until that date.`
              : `${validityMonths} maanden na aankoop. Saldo dat je niet besteedt blijft tot die datum op de bon staan.`,
            { months: validityMonths }
          )
        : safeT(
            t,
            'faq2AFallback',
            locale === 'en'
              ? "Any unspent balance stays on the card until you've used it up."
              : 'Het saldo blijft op de bon staan tot het volledig is besteed.'
          ),
    },
    {
      q: safeT(
        t,
        'faq3Q',
        locale === 'en' ? 'Can I split it across orders?' : 'Kan ik de bon in delen besteden?'
      ),
      a: safeT(
        t,
        'faq3A',
        locale === 'en'
          ? "Yes — the balance can be spent across multiple orders until it's used up."
          : 'Ja, je kunt de bon over meerdere bestellingen verdelen tot het saldo op is.'
      ),
    },
    {
      q: safeT(
        t,
        'faq4Q',
        locale === 'en'
          ? 'Does it stack with discount codes?'
          : 'Werkt de bon samen met kortingscodes?'
      ),
      a: safeT(
        t,
        'faq4A',
        locale === 'en'
          ? "The card always works on sale prices. Stacking with promo codes depends on the campaign — you'll see it during checkout."
          : 'De bon is altijd geldig op sale prijzen. Combineren met losse kortingscodes is afhankelijk van de actie — dat zie je tijdens het afrekenen.'
      ),
    },
  ]

  // Compact reason for why the CTA is disabled (used by the sticky bar
  // so the user gets a one-line explanation instead of a dead button).
  const ctaDisabledReason = (() => {
    if (canAdd) return ''
    if (!hasAmount || !validCustom || !presetSelected) return sStickyChoose
    if (!recipientValid || !scheduleValid) return sStickyRecipient
    return sStickyChoose
  })()

  function handleAdd() {
    if (!canAdd) return

    const recipient: GiftCardRecipient | null = isGift
      ? {
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
          senderName: senderName.trim() || undefined,
          personalMessage: message.trim() || undefined,
          scheduledSendAt:
            scheduleEnabled && scheduleDate
              ? new Date(scheduleDate).toISOString()
              : undefined,
        }
      : null

    // Deterministic synthetic variantId so identical lines merge while
    // unique recipient/schedule/message/custom amount stay separate.
    const uniquenessKey = [
      resolvedAmount.toFixed(2),
      isGift ? recipient?.recipientEmail || '' : '',
      isGift ? recipient?.recipientName || '' : '',
      isGift ? recipient?.senderName || '' : '',
      isGift ? recipient?.personalMessage || '' : '',
      isGift && recipient?.scheduledSendAt ? recipient.scheduledSendAt : '',
    ].join('|')
    const uniqueHash =
      typeof globalThis !== 'undefined' && 'btoa' in globalThis
        ? (globalThis as unknown as { btoa: (s: string) => string })
            .btoa(unescape(encodeURIComponent(uniquenessKey)))
            .replace(/=+$/, '')
        : uniquenessKey
    const syntheticVariantId = `giftcard:${product.id}:${uniqueHash.slice(0, 48)}`

    addItem({
      productId: product.id,
      variantId: syntheticVariantId,
      slug: product.slug,
      name: displayName,
      size:
        mode === 'preset'
          ? activeDenomination?.label || ''
          : formatPrice(resolvedAmount),
      color: '',
      colorHex: '',
      price: resolvedAmount,
      quantity,
      image: imageUrl,
      sku: activeDenomination?.sku || `GIFTCARD-${Math.round(resolvedAmount)}`,
      stock: 9999,
      isGiftCard: true,
      giftCardAmount: resolvedAmount,
      giftCardRecipient: recipient,
    })

    toast.success(
      safeT(t, 'addedToCart', locale === 'en' ? 'Gift card added' : 'Cadeaubon toegevoegd')
    )
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
    openDrawer()
  }

  // Reusable renderers
  const renderAmountSelector = () => (
    <div>
      <label className="block text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">
        {sAmountLabel}:{' '}
        <span className="text-brand-primary font-bold">
          {hasAmount
            ? mode === 'preset'
              ? activeDenomination?.label || formatPrice(resolvedAmount)
              : formatPrice(resolvedAmount)
            : sChooseAmount}
        </span>
      </label>

      {denominations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {denominations.map((d) => {
            const selected = mode === 'preset' && selectedVariantId === d.variantId
            return (
              <button
                key={d.variantId}
                type="button"
                onClick={() => {
                  setMode('preset')
                  setSelectedVariantId(d.variantId)
                }}
                className={`px-4 md:px-5 py-2 border-2 font-bold uppercase tracking-wider transition-all text-sm ${
                  selected
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-black hover:bg-black hover:text-white'
                }`}
              >
                {d.label || formatPrice(d.amount)}
              </button>
            )
          })}
          {allowCustom ? (
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`px-4 md:px-5 py-2 border-2 font-bold uppercase tracking-wider transition-all text-sm ${
                mode === 'custom'
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-black hover:bg-black hover:text-white'
              }`}
            >
              {sAmountCustom}
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === 'custom' && allowCustom ? (
        <div className={denominations.length > 0 ? 'mt-3' : ''}>
          <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-2">
            {sCustomLabel}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base pointer-events-none">
              €
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={customAmountText}
              onChange={(e) => setCustomAmountText(e.target.value)}
              placeholder="50,00"
              aria-label={sCustomLabel}
              className="w-full border-2 border-gray-300 pl-7 pr-3 py-2.5 md:py-3 text-base font-bold focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>
          {!validCustom && customAmountText.length > 0 ? (
            <p className="text-xs text-red-600 mt-2 font-semibold">{sCustomInvalid}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const renderGiftToggle = () => (
    <div className="border-2 border-black p-4 md:p-5">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isGift}
          onChange={(e) => setIsGift(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm md:text-base font-bold uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-primary" strokeWidth={2.5} />
            {sSendAsGift}
          </div>
          <p className="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
            {sSendAsGiftHelp}
          </p>
        </div>
      </label>

      {isGift ? (
        <div className="mt-5 space-y-4 pt-5 border-t-2 border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-1.5">
                {sRecipientName} *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-1.5">
                {sRecipientEmail} *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
                className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-1.5">
              {sSenderName}
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={locale === 'en' ? 'Your name' : 'Jouw naam'}
              className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-1.5">
              {sMessage}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors resize-none"
            />
            <div className="text-[10px] text-gray-500 mt-1 text-right font-medium">
              {message.length}/500
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm md:text-base font-semibold cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="h-4 w-4 accent-brand-primary"
            />
            <Calendar className="h-4 w-4 text-brand-primary" strokeWidth={2.5} />
            {sSchedule}
          </label>
          {scheduleEnabled ? (
            <div>
              <input
                type="datetime-local"
                value={scheduleDate}
                min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
              />
              {!scheduleValid ? (
                <p className="text-xs text-red-600 mt-2 font-semibold">
                  {sScheduleInvalid}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const renderPrimaryCta = () => (
    <div className="flex gap-2 md:gap-3">
      <div className="flex border-2 border-black">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-bold text-xl transition-colors ${
            quantity <= 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
          aria-label={locale === 'en' ? 'Decrease quantity' : 'Aantal verlagen'}
        >
          −
        </button>
        <div className="w-10 h-12 md:w-12 md:h-14 flex items-center justify-center border-x-2 border-black bg-white font-bold text-base md:text-lg">
          {quantity}
        </div>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(50, q + 1))}
          disabled={quantity >= 50}
          className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-bold text-xl transition-colors ${
            quantity >= 50
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
          aria-label={locale === 'en' ? 'Increase quantity' : 'Aantal verhogen'}
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd || justAdded}
        className={`flex-1 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
          justAdded
            ? 'bg-black text-white cursor-default'
            : canAdd
              ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {justAdded ? (
          <>
            <Check className="h-5 w-5" strokeWidth={3} />
            <span className="truncate">{sAdded}</span>
          </>
        ) : (
          <>
            <Gift className="h-5 w-5" strokeWidth={2.5} />
            <span className="truncate">
              {sAddToCart}
              {hasAmount ? ` · ${formatPrice(resolvedAmount * quantity)}` : ''}
            </span>
          </>
        )}
      </button>
    </div>
  )

  return (
    <>
      <div className="min-h-screen px-4 pb-24 md:pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb — identical to regular PDP */}
          <div className="mb-6 md:mb-8 text-sm">
            <LocaleLink
              href="/"
              className="text-gray-600 hover:text-brand-primary transition-colors"
            >
              {safeT(tCommon, 'breadcrumb.home', locale === 'en' ? 'Home' : 'Home')}
            </LocaleLink>
            <span className="mx-2 text-gray-400">/</span>
            <LocaleLink
              href="/shop"
              className="text-gray-600 hover:text-brand-primary transition-colors"
            >
              {safeT(tCommon, 'breadcrumb.shop', locale === 'en' ? 'Shop' : 'Shop')}
            </LocaleLink>
            {categoryName && product.categories?.slug ? (
              <>
                <span className="mx-2 text-gray-400">/</span>
                <LocaleLink
                  href={`/shop?category=${product.categories.slug}`}
                  className="text-gray-600 hover:text-brand-primary transition-colors"
                >
                  {categoryName}
                </LocaleLink>
              </>
            ) : null}
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-black font-semibold">{displayName}</span>
          </div>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-12">
            {/* LEFT: visual */}
            <div className="space-y-4">
              <div className="relative aspect-[3/4] md:aspect-[3/3] bg-gray-100 border-2 border-black overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={primaryImage?.alt_text || displayName}
                  fill
                  sizes="(max-width: 768px) 100vw, 55vw"
                  className="object-cover object-center"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  priority
                />
                <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-brand-primary text-white text-[10px] md:text-[11px] font-bold tracking-[0.25em] uppercase px-3 py-1.5 flex items-center gap-2 shadow-md">
                  <Gift className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {sBadge}
                </div>
                {hasAmount ? (
                  <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-auto bg-black text-white px-4 py-2.5 md:px-5 md:py-3 border-2 border-white/20 inline-flex items-center gap-3">
                    <div>
                      <div className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold leading-none">
                        {locale === 'en' ? 'Value' : 'Waarde'}
                      </div>
                      <div className="font-display text-2xl md:text-3xl mt-1 leading-none">
                        {formatPrice(resolvedAmount)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Trust block — desktop only, same brutalist column as regular PDP */}
              <div className="mt-4 border-2 border-black hidden md:block">
                <div className="p-3 border-b-2 border-black">
                  <div className="flex items-start gap-2">
                    <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">
                        {sTrustDelivery}
                      </p>
                      <p className="text-gray-700">
                        {locale === 'en'
                          ? 'The unique code is emailed instantly after payment.'
                          : 'De unieke code komt direct na betaling per e-mail binnen.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-b-2 border-black">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">
                        {sTrustValidity}
                      </p>
                      <p className="text-gray-700">
                        {validityMonths
                          ? locale === 'en'
                            ? `Valid for ${validityMonths} months from purchase. Unspent balance stays on the card.`
                            : `Geldig ${validityMonths} maanden vanaf aankoop. Saldo dat je niet besteedt blijft op de bon staan.`
                          : locale === 'en'
                            ? "Spend whenever — the balance stays on the card until it's used up."
                            : 'Het saldo blijft op de bon staan totdat je het volledig hebt besteed.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">
                        {sTrustCombine}
                      </p>
                      <p className="text-gray-700">
                        {locale === 'en'
                          ? 'Use it across multiple orders and on sale prices — the balance keeps until empty.'
                          : 'Inzetbaar over meerdere bestellingen en op sale prijzen — saldo blijft staan tot op.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: info column (sticky on desktop) */}
            <div className="space-y-4 md:sticky md:top-24 md:self-start">
              <div>
                <div className="mb-1 md:mb-2">
                  <TrustpilotWidget variant="product" />
                </div>
                <h1 className="text-2xl md:text-3xl font-display mb-2 md:mb-3">
                  {displayName}
                </h1>

                {/* Price block — mirrors PDP price block */}
                <div className="mb-3 md:mb-4">
                  {hasAmount ? (
                    <p className="text-xl md:text-2xl font-bold text-brand-primary">
                      {formatPrice(resolvedAmount)}
                    </p>
                  ) : (
                    <p className="text-xl md:text-2xl font-bold">{sPriceFrom}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {safeT(
                      tProduct,
                      'inclVat',
                      locale === 'en' ? 'Incl. VAT' : 'incl. btw'
                    )}
                  </p>
                </div>
              </div>

              {/* Description (desktop inline brief) */}
              {displayDescription ? (
                <div className="hidden md:block border-t border-b border-gray-200 py-3">
                  <div
                    className={`text-sm text-gray-700 leading-relaxed ${
                      descExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {formatBoldText(displayDescription)}
                  </div>
                  {displayDescription.length > 200 ? (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="text-xs text-brand-primary hover:underline font-semibold mt-2 inline-flex items-center gap-1"
                    >
                      {descExpanded
                        ? safeT(
                            tProduct,
                            'showLess',
                            locale === 'en' ? 'Show less' : 'Toon minder'
                          )
                        : safeT(
                            tProduct,
                            'showMore',
                            locale === 'en' ? 'Show more' : 'Toon meer'
                          )}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          descExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Compact trust strip — desktop, in flow */}
              <div className="hidden md:block border-2 border-black">
                <div className="px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-primary" />
                    {sTrustDelivery}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    {sTrustValidity}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                    {sTrustCombine}
                  </span>
                </div>
              </div>

              {/* Amount selector */}
              {renderAmountSelector()}

              {/* Gift toggle box */}
              {renderGiftToggle()}

              {/* Quantity stepper + primary CTA */}
              {renderPrimaryCta()}

              {/* Compact trust strip — mobile, below CTA */}
              <div className="md:hidden border-2 border-black">
                <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-brand-primary" />
                    {sTrustDelivery}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-brand-primary" />
                    {sTrustValidity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-primary" />
                    {sTrustCombine}
                  </span>
                </div>
              </div>

              {sValidity ? (
                <p className="text-xs text-gray-500 md:hidden">{sValidity}</p>
              ) : null}

              {/* Mobile accordion: description + how + faq */}
              <div className="md:hidden border-t-2 border-gray-200 pt-6 space-y-4">
                {displayDescription ? (
                  <div className="border-2 border-black">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMobilePanel((p) => (p === 'description' ? '' : 'description'))
                      }
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                      aria-expanded={openMobilePanel === 'description'}
                    >
                      <span>
                        {safeT(
                          tProduct,
                          'tabs.description',
                          locale === 'en' ? 'Description' : 'Omschrijving'
                        )}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          openMobilePanel === 'description' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openMobilePanel === 'description' ? (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50">
                        <div className="text-gray-700 leading-relaxed text-sm">
                          {formatBoldText(displayDescription)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="border-2 border-black">
                  <button
                    type="button"
                    onClick={() => setOpenMobilePanel((p) => (p === 'how' ? '' : 'how'))}
                    className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    aria-expanded={openMobilePanel === 'how'}
                  >
                    <span>{sHowTitle}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        openMobilePanel === 'how' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openMobilePanel === 'how' ? (
                    <ol className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-4 text-sm">
                      {[
                        { i: '01', t: sStep1Title, d: sStep1Desc },
                        { i: '02', t: sStep2Title, d: sStep2Desc },
                        { i: '03', t: sStep3Title, d: sStep3Desc },
                      ].map((s) => (
                        <li key={s.i} className="flex gap-3">
                          <span className="font-display text-2xl text-brand-primary leading-none w-8 shrink-0">
                            {s.i}
                          </span>
                          <div>
                            <p className="font-bold uppercase tracking-wide mb-1">
                              {s.t}
                            </p>
                            <p className="text-gray-700 leading-relaxed">{s.d}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>

                <div className="border-2 border-black">
                  <button
                    type="button"
                    onClick={() => setOpenMobilePanel((p) => (p === 'faq' ? '' : 'faq'))}
                    className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    aria-expanded={openMobilePanel === 'faq'}
                  >
                    <span>{sFaqTitle}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        openMobilePanel === 'faq' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openMobilePanel === 'faq' ? (
                    <div className="px-4 py-2 border-t-2 border-black bg-gray-50">
                      {faqItems.map((item, idx) => {
                        const open = openFaqIndex === idx
                        return (
                          <div
                            key={idx}
                            className={
                              idx < faqItems.length - 1 ? 'border-b border-gray-300' : ''
                            }
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaqIndex(open ? null : idx)}
                              className="w-full py-3 flex items-center justify-between text-left text-sm font-semibold gap-3"
                              aria-expanded={open}
                            >
                              <span>{item.q}</span>
                              <ChevronDown
                                className={`w-4 h-4 shrink-0 transition-transform ${
                                  open ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {open ? (
                              <p className="pb-4 text-sm text-gray-700 leading-relaxed">
                                {item.a}
                              </p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop wide content — How it works + FAQ. Mirrors the
              "below the fold" recently-viewed/related rhythm of the
              regular PDP, with brand-typical brutalist headers. */}
          <div className="hidden md:block mt-16 md:mt-24 border-t-2 border-gray-200 pt-12 md:pt-16">
            <h2 className="text-3xl md:text-4xl font-display uppercase tracking-wide mb-10 text-center">
              {sHowTitle}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { i: '01', t: sStep1Title, d: sStep1Desc, Icon: Gift },
                { i: '02', t: sStep2Title, d: sStep2Desc, Icon: Sparkles },
                { i: '03', t: sStep3Title, d: sStep3Desc, Icon: Mail },
              ].map((s) => (
                <div
                  key={s.i}
                  className="border-2 border-black bg-white p-6 flex flex-col gap-3 hover:shadow-2xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl text-brand-primary leading-none">
                      {s.i}
                    </span>
                    <s.Icon className="w-5 h-5 text-black" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-base">
                    {s.t}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-16">
              <h2 className="text-3xl md:text-4xl font-display uppercase tracking-wide mb-8 text-center">
                {sFaqTitle}
              </h2>
              <div className="max-w-3xl mx-auto border-2 border-black">
                {faqItems.map((item, idx) => {
                  const open = openFaqIndex === idx
                  return (
                    <div
                      key={idx}
                      className={
                        idx < faqItems.length - 1 ? 'border-b-2 border-black' : ''
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(open ? null : idx)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left font-bold gap-3 hover:bg-gray-50 transition-colors"
                        aria-expanded={open}
                      >
                        <span className="text-base">{item.q}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {open ? (
                        <p className="px-5 pb-5 text-sm md:text-base text-gray-700 leading-relaxed">
                          {item.a}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile bottom CTA — mirrors StickyBuyNow on regular PDPs */}
      {stickyVisible && !isCartDrawerOpen ? (
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-white z-40 shadow-2xl md:hidden">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd || justAdded}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 font-bold uppercase tracking-wide text-sm transition-colors ${
                justAdded
                  ? 'bg-white text-black border-white'
                  : canAdd
                    ? 'bg-brand-primary border-brand-primary text-white hover:bg-brand-primary-hover hover:border-brand-primary-hover'
                    : 'bg-gray-700 border-gray-700 text-gray-300 cursor-not-allowed'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-5 h-5" strokeWidth={3} />
                  <span>{sAdded}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span className="truncate">
                    {canAdd
                      ? `${sStickyAddToCart}${
                          hasAmount
                            ? ` · ${formatPrice(resolvedAmount * quantity)}`
                            : ''
                        }`
                      : ctaDisabledReason || sStickyChoose}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
