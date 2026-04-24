'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import toast from 'react-hot-toast'
import { Gift, Mail, Calendar, Sparkles, Check } from 'lucide-react'
import { useCart, type GiftCardRecipient } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'

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

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string, values?: Record<string, any>): string {
  try {
    const v = values ? (t as any)(key, values) : t(key)
    // next-intl returns key path when missing in production; treat that as missing.
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
  const addItem = useCart((s) => s.addItem)
  const openDrawer = useCartDrawer((s) => s.openDrawer)

  const displayName = locale === 'en' && product.name_en ? product.name_en : product.name
  const displayDescription =
    locale === 'en' && product.description_en ? product.description_en : product.description
  const categoryName =
    locale === 'en' && product.categories?.name_en
      ? product.categories?.name_en
      : product.categories?.name

  // Denominations are stored as product_variants where `size` is the label
  // (e.g. "€50") and the amount = base_price + price_adjustment. Only
  // available variants are shown.
  const denominations = useMemo(() => {
    return [...(product.product_variants || [])]
      .filter((v) => v.is_available)
      .sort((a, b) => a.display_order - b.display_order || a.price_adjustment - b.price_adjustment)
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

  const activeDenomination = denominations.find((d) => d.variantId === selectedVariantId)
  const customAmount = parseAmount(customAmountText)

  const resolvedAmount =
    mode === 'preset' ? activeDenomination?.amount ?? 0 : customAmount
  const resolvedVariantId =
    mode === 'preset'
      ? activeDenomination?.variantId ?? null
      : denominations[0]?.variantId ?? null // fall back to any variant for FK

  const validCustom =
    mode === 'custom'
      ? customAmount >= minCustom && customAmount <= maxCustom
      : true
  const hasAmount = resolvedAmount > 0
  const recipientValid =
    !isGift ||
    (recipientEmail.trim().length > 3 &&
      /.+@.+\..+/.test(recipientEmail.trim()) &&
      recipientName.trim().length > 0)
  const scheduleValid =
    !isGift || !scheduleEnabled || (!!scheduleDate && new Date(scheduleDate).getTime() > Date.now())

  const canAdd = hasAmount && validCustom && recipientValid && scheduleValid

  const primaryImage =
    product.product_images.find((i) => i.is_primary) || product.product_images[0]
  const imageUrl = primaryImage?.url || '/placeholder-product.svg'

  const validityMonths = product.gift_card_default_validity_months

  function handleAdd() {
    if (!canAdd || !resolvedVariantId) return

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

    // Build a deterministic variantId so identical lines merge, but unique
    // recipient/schedule/message/custom amount always stay separate.
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
        ? (globalThis as any).btoa(unescape(encodeURIComponent(uniquenessKey))).replace(/=+$/, '')
        : uniquenessKey
    const syntheticVariantId = `giftcard:${product.id}:${uniqueHash.slice(0, 48)}`

    addItem({
      productId: product.id,
      variantId: syntheticVariantId,
      slug: product.slug,
      name: displayName,
      size: mode === 'preset' ? activeDenomination?.label || '' : formatPrice(resolvedAmount),
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

    toast.success(safeT(t, 'addedToCart', locale === 'en' ? 'Gift card added' : 'Cadeaubon toegevoegd'))
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
    openDrawer()
  }

  // Strings
  const sBadge = safeT(t, 'badge', locale === 'en' ? 'Gift card' : 'Cadeaubon')
  const sCategory = categoryName || safeT(t, 'category', locale === 'en' ? 'Gift card' : 'Cadeaubon')
  const sChooseAmount = safeT(t, 'chooseAmount', locale === 'en' ? 'Choose an amount' : 'Kies een bedrag')
  const sCustomAmount = safeT(t, 'customAmount', locale === 'en' ? 'Custom' : 'Eigen bedrag')
  const sCustomLabel = safeT(t, 'customAmountLabel', locale === 'en' ? `Choose between €${minCustom} and €${maxCustom}` : `Zelf kiezen tussen €${minCustom} en €${maxCustom}`, { min: minCustom, max: maxCustom })
  const sCustomInvalid = safeT(t, 'customAmountInvalid', locale === 'en' ? `Amount must be between €${minCustom} and €${maxCustom}` : `Bedrag moet tussen €${minCustom} en €${maxCustom} liggen`, { min: minCustom, max: maxCustom })
  const sValue = safeT(t, 'valueLabel', locale === 'en' ? 'Value' : 'Waarde')
  const sValidity = validityMonths
    ? safeT(t, 'validityNote', locale === 'en' ? `Valid for ${validityMonths} months` : `Geldig ${validityMonths} maanden`, { months: validityMonths })
    : null
  const sSendAsGift = safeT(t, 'sendAsGift', locale === 'en' ? 'Send as a gift to someone' : 'Verstuur als cadeau naar iemand anders')
  const sSendAsGiftHelp = safeT(t, 'sendAsGiftHelp', locale === 'en'
    ? 'The code is emailed directly to the recipient with your personal message.'
    : 'De code wordt rechtstreeks naar de ontvanger gemaild, met jouw persoonlijke bericht.')
  const sRecipientName = safeT(t, 'recipientName', locale === 'en' ? 'Recipient name' : 'Naam ontvanger')
  const sRecipientEmail = safeT(t, 'recipientEmail', locale === 'en' ? 'Recipient email' : 'E-mail ontvanger')
  const sSenderName = safeT(t, 'senderName', locale === 'en' ? 'From' : 'Van')
  const sMessage = safeT(t, 'message', locale === 'en' ? 'Personal message' : 'Persoonlijk bericht')
  const sSchedule = safeT(t, 'scheduleDelivery', locale === 'en' ? 'Send on a specific date' : 'Verstuur op een specifieke datum')
  const sScheduleInvalid = safeT(t, 'scheduleInvalid', locale === 'en' ? 'Pick a date and time in the future.' : 'Kies een datum en tijd in de toekomst.')
  const sAddToCart = safeT(t, 'addToCart', locale === 'en' ? 'Add to cart' : 'Toevoegen aan winkelmand')
  const sAdded = safeT(t, 'addedToCart', locale === 'en' ? 'Added' : 'Toegevoegd')
  const sPerkDigital = safeT(t, 'perkDigital', locale === 'en' ? 'Delivered instantly by email' : 'Direct per e-mail bezorgd')
  const sPerkCombine = safeT(t, 'perkCombine', locale === 'en' ? 'Works on sale items too' : 'Ook te gebruiken op afgeprijsde items')
  const sPerkValidity = validityMonths
    ? safeT(t, 'perkValidity', locale === 'en' ? `Valid for ${validityMonths} months` : `${validityMonths} maanden geldig`, { months: validityMonths })
    : safeT(t, 'perkValidityFallback', locale === 'en' ? 'Balance stays on the card' : 'Saldo blijft op de bon')

  return (
    <div className="min-h-screen px-4 pb-24 md:pb-16 bg-[#f4f1ea]/40">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 md:mb-8 text-xs md:text-sm">
          <LocaleLink href="/" className="text-gray-600 hover:text-brand-primary transition-colors">
            {safeT(tCommon, 'breadcrumb.home', locale === 'en' ? 'Home' : 'Home')}
          </LocaleLink>
          <span className="mx-2 text-gray-400">/</span>
          <LocaleLink href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
            {safeT(tCommon, 'breadcrumb.shop', locale === 'en' ? 'Shop' : 'Shop')}
          </LocaleLink>
          {categoryName ? (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <LocaleLink
                href={`/shop?category=${product.categories?.slug || ''}`}
                className="text-gray-600 hover:text-brand-primary transition-colors"
              >
                {categoryName}
              </LocaleLink>
            </>
          ) : null}
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-black">{displayName}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-12 lg:gap-16 items-start">
          {/* Visual */}
          <div className="relative aspect-square w-full bg-gradient-to-br from-black to-neutral-900 overflow-hidden border-2 border-black">
            <Image
              src={imageUrl}
              alt={primaryImage?.alt_text || displayName}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 bg-brand-primary text-white text-[10px] md:text-[11px] font-bold tracking-[0.25em] uppercase px-3 py-2 flex items-center gap-2 shadow-lg">
              <Gift className="h-3.5 w-3.5" strokeWidth={2.5} />
              {sBadge}
            </div>
            {hasAmount ? (
              <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto bg-black text-white px-4 py-3 md:px-5 md:py-4 border-2 border-white/20">
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold">
                  {sValue}
                </div>
                <div className="font-display text-3xl md:text-4xl mt-1 leading-none">
                  {formatPrice(resolvedAmount)}
                </div>
              </div>
            ) : null}
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5 md:gap-6">
            <div>
              <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-gray-500 mb-2 font-bold">
                {sCategory}
              </div>
              <h1 className="font-display text-3xl md:text-5xl lg:text-6xl tracking-tight uppercase leading-[0.95]">
                {displayName}
              </h1>
              {displayDescription ? (
                <p className="mt-4 text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {displayDescription}
                </p>
              ) : null}
            </div>

            {/* Amount selector */}
            <div className="border-2 border-black p-4 md:p-5 bg-white">
              <div className="text-[11px] md:text-xs tracking-[0.25em] uppercase font-bold mb-3 md:mb-4 flex items-center justify-between">
                <span>{sChooseAmount}</span>
                {sValidity ? (
                  <span className="hidden md:inline text-[10px] text-gray-500 tracking-[0.15em]">
                    {sValidity}
                  </span>
                ) : null}
              </div>

              {denominations.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {denominations.map((d) => (
                    <button
                      key={d.variantId}
                      type="button"
                      onClick={() => {
                        setMode('preset')
                        setSelectedVariantId(d.variantId)
                      }}
                      className={`py-3 md:py-4 px-2 text-sm md:text-base font-bold border-2 transition-all active:scale-95 ${
                        mode === 'preset' && selectedVariantId === d.variantId
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-black bg-white'
                      }`}
                    >
                      {d.label || formatPrice(d.amount)}
                    </button>
                  ))}
                  {allowCustom ? (
                    <button
                      type="button"
                      onClick={() => setMode('custom')}
                      className={`py-3 md:py-4 px-2 text-xs md:text-sm font-bold uppercase tracking-wider border-2 transition-all active:scale-95 ${
                        mode === 'custom'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-black bg-white'
                      }`}
                    >
                      {sCustomAmount}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {mode === 'custom' && allowCustom ? (
                <div className="mt-4">
                  <label className="text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-gray-700 font-bold block mb-2">
                    {sCustomLabel}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customAmountText}
                      onChange={(e) => setCustomAmountText(e.target.value)}
                      placeholder="50.00"
                      className="w-full border-2 border-gray-200 pl-7 pr-3 py-2.5 md:py-3 text-base font-bold focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                  {!validCustom && customAmountText.length > 0 ? (
                    <p className="text-xs text-red-600 mt-2 font-semibold">
                      {sCustomInvalid}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {sValidity ? (
                <div className="md:hidden mt-3 text-[10px] text-gray-500 tracking-[0.15em] uppercase font-semibold">
                  {sValidity}
                </div>
              ) : null}
            </div>

            {/* Gift toggle */}
            <div className="border-2 border-black p-4 md:p-5 bg-white">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-brand-primary"
                />
                <div>
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
                        className="w-full border-2 border-gray-200 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
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
                        className="w-full border-2 border-gray-200 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
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
                      className="w-full border-2 border-gray-200 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
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
                      className="w-full border-2 border-gray-200 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors resize-none"
                    />
                    <div className="text-[10px] text-gray-500 mt-1 text-right font-medium">
                      {message.length}/500
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm md:text-base font-semibold cursor-pointer pt-2">
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
                        className="w-full border-2 border-gray-200 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:border-brand-primary transition-colors"
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

            {/* Quantity + CTA (brutalist MOSE style) */}
            <div className="flex gap-2 md:gap-3">
              <div className="flex border-2 border-black">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-bold text-xl transition-colors ${
                    quantity <= 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                  aria-label="decrease"
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
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                  aria-label="increase"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd || justAdded}
                className={`flex-1 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  justAdded
                    ? 'bg-black text-white cursor-default'
                    : canAdd
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4 md:h-5 md:w-5" strokeWidth={3} />
                    {sAdded}
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2.5} />
                    <span className="truncate">
                      {sAddToCart}
                      {hasAmount ? ` · ${formatPrice(resolvedAmount * quantity)}` : ''}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t-2 border-black/10 text-xs md:text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-brand-primary shrink-0" strokeWidth={2.5} />
                <span className="text-gray-700 font-medium">{sPerkDigital}</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5 text-brand-primary shrink-0" strokeWidth={2.5} />
                <span className="text-gray-700 font-medium">{sPerkCombine}</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-brand-primary shrink-0" strokeWidth={2.5} />
                <span className="text-gray-700 font-medium">{sPerkValidity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
