'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import toast from 'react-hot-toast'
import { Gift, Mail, Calendar, Sparkles } from 'lucide-react'
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

  const basePrice = product.sale_price ?? product.base_price

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

    toast.success(t('addedToCart') || 'Cadeaubon toegevoegd')
    openDrawer()
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 px-4 pb-24 md:pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 md:mb-8 text-sm">
          <LocaleLink href="/" className="text-gray-600 hover:text-brand-primary transition-colors">
            {tCommon('breadcrumb.home') || 'Home'}
          </LocaleLink>
          <span className="mx-2 text-gray-400">/</span>
          <LocaleLink href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
            {tCommon('breadcrumb.shop') || 'Shop'}
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

        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
          {/* Visual */}
          <div className="relative aspect-square w-full bg-[#f4f1ea] overflow-hidden border border-black/10">
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
            <div className="absolute top-4 left-4 bg-black text-white text-[11px] tracking-[0.2em] uppercase px-3 py-1.5 flex items-center gap-2">
              <Gift className="h-3.5 w-3.5" />
              {t('badge') || 'Cadeaubon'}
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs tracking-[0.25em] uppercase text-gray-500 mb-2">
                {categoryName || (t('category') || 'Cadeaubon')}
              </div>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight uppercase leading-[0.95]">
                {displayName}
              </h1>
              {displayDescription ? (
                <p className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {displayDescription}
                </p>
              ) : null}
            </div>

            {/* Amount selector */}
            <div className="border border-black/10 p-5 bg-white">
              <div className="text-[11px] tracking-[0.25em] uppercase font-semibold mb-3">
                {t('chooseAmount') || 'Kies een bedrag'}
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
                      className={`py-3 px-2 text-sm border transition-colors ${
                        mode === 'preset' && selectedVariantId === d.variantId
                          ? 'border-black bg-black text-white'
                          : 'border-black/15 hover:border-black/40'
                      }`}
                    >
                      <div className="font-medium">{d.label || formatPrice(d.amount)}</div>
                    </button>
                  ))}
                  {allowCustom ? (
                    <button
                      type="button"
                      onClick={() => setMode('custom')}
                      className={`py-3 px-2 text-sm border transition-colors ${
                        mode === 'custom'
                          ? 'border-black bg-black text-white'
                          : 'border-black/15 hover:border-black/40'
                      }`}
                    >
                      {t('customAmount') || 'Eigen bedrag'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {mode === 'custom' && allowCustom ? (
                <div className="mt-4">
                  <label className="text-[11px] tracking-[0.2em] uppercase text-gray-600 block mb-2">
                    {t('customAmountLabel', { min: minCustom, max: maxCustom }) ||
                      `Bedrag (€${minCustom}–€${maxCustom})`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customAmountText}
                      onChange={(e) => setCustomAmountText(e.target.value)}
                      placeholder="50.00"
                      className="w-full border border-black/15 pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  {!validCustom && customAmountText.length > 0 ? (
                    <p className="text-xs text-red-600 mt-2">
                      {t('customAmountInvalid', { min: minCustom, max: maxCustom }) ||
                        `Kies een bedrag tussen €${minCustom} en €${maxCustom}.`}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-gray-500">
                    {t('valueLabel') || 'Waarde'}
                  </div>
                  <div className="font-display text-3xl">
                    {hasAmount ? formatPrice(resolvedAmount) : '—'}
                  </div>
                </div>
                {product.gift_card_default_validity_months ? (
                  <div className="text-xs text-gray-600 max-w-[180px] text-right">
                    {t('validityNote', { months: product.gift_card_default_validity_months }) ||
                      `Geldig ${product.gift_card_default_validity_months} maanden na uitgifte.`}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Gift toggle */}
            <div className="border border-black/10 p-5 bg-white">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('sendAsGift') || 'Verstuur als cadeau naar iemand anders'}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('sendAsGiftHelp') ||
                      'We sturen de code per e-mail naar de ontvanger. Laat leeg om de code zelf te ontvangen.'}
                  </p>
                </div>
              </label>

              {isGift ? (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] tracking-[0.2em] uppercase text-gray-600 block mb-1.5">
                        {t('recipientName') || 'Naam ontvanger'} *
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] tracking-[0.2em] uppercase text-gray-600 block mb-1.5">
                        {t('recipientEmail') || 'E-mail ontvanger'} *
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.2em] uppercase text-gray-600 block mb-1.5">
                      {t('senderName') || 'Van'}
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.2em] uppercase text-gray-600 block mb-1.5">
                      {t('message') || 'Persoonlijk bericht'}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
                    />
                    <div className="text-[10px] text-gray-500 mt-1 text-right">
                      {message.length}/500
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="h-4 w-4 accent-black"
                    />
                    <Calendar className="h-4 w-4" />
                    {t('scheduleDelivery') || 'Verstuur op een specifieke datum'}
                  </label>
                  {scheduleEnabled ? (
                    <div>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
                      />
                      {!scheduleValid ? (
                        <p className="text-xs text-red-600 mt-2">
                          {t('scheduleInvalid') || 'Kies een datum en tijd in de toekomst.'}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Quantity + CTA */}
            <div className="flex items-stretch gap-3">
              <div className="flex items-center border border-black/15">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 h-full hover:bg-black/5"
                  aria-label="decrease"
                >
                  −
                </button>
                <span className="px-4 text-sm min-w-[2ch] text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  className="px-3 h-full hover:bg-black/5"
                  aria-label="increase"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="flex-1 bg-black text-white font-medium text-sm tracking-[0.15em] uppercase py-3 px-5 hover:bg-gray-900 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Gift className="h-4 w-4" />
                {t('addToCart') || 'Voeg toe aan winkelmand'}
                {hasAmount ? ` · ${formatPrice(resolvedAmount * quantity)}` : ''}
              </button>
            </div>

            {/* Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5" />
                <span>{t('perkDigital') || 'Direct per e-mail bezorgd'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5" />
                <span>{t('perkCombine') || 'Ook te gebruiken op afgeprijsde items'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5" />
                <span>
                  {product.gift_card_default_validity_months
                    ? t('perkValidity', { months: product.gift_card_default_validity_months }) ||
                      `${product.gift_card_default_validity_months} maanden geldig`
                    : t('perkValidityFallback') || 'Saldo blijft op de bon'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
