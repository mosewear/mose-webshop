'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Lock, ArrowLeft, ShoppingBag } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button, buttonVariants } from '@/components/ui/Button'
import { useCart, useCartGehydrateerd } from '@/store/cart'
import { formatBedrag } from '@/lib/format-price'
import {
  canRotateCheckoutAttempt, checkoutRedirectUrl, createShopifyCartSnapshot, getCheckoutAttempt,
  SHOPIFY_ATTEMPT_STORAGE_KEY, type CheckoutAttempt,
} from '@/lib/shopify-cart'

const copy = {
  nl: {
    title: 'Veilig afrekenen', intro: 'Je rekent alle artikelen samen af in één betaling.',
    back: 'Terug naar je winkelmand', empty: 'Je winkelmand is nog leeg.', shop: 'Bekijk de collectie',
    subtotal: 'Artikelen, vóór korting en verzending', final: 'De definitieve prijs, korting en verzendkosten zie je vóór je betaalt.',
    delivery: 'Bezorgland: Nederland', deliveryNote: 'Bezorging is momenteel alleen mogelijk in Nederland.',
    parcels: 'Je bestelling kan in meerdere pakketten worden geleverd.',
    button: 'Veilig verder naar betalen', loading: 'Je bestelling voorbereiden…', hydrated: 'Je winkelmand laden…',
    preserved: 'Je winkelmand blijft bewaard.', retry: 'Afrekenen lukt nu niet. Probeer het opnieuw; je winkelmand is behouden.',
    pending: 'Je eerdere betaalpoging wordt nog gecontroleerd. Je winkelmand blijft bewaard. Probeer het later opnieuw.',
    review: 'Je eerdere betaalpoging moet eerst worden gecontroleerd. Neem contact met ons op voordat je opnieuw betaalt.',
    changed: 'Je winkelmand, prijs of beschikbaarheid is gewijzigd. Controleer je artikelen en probeer het opnieuw.',
    gift: 'Afrekenen met cadeaubonnen is via deze route nog niet beschikbaar. Je winkelmand is behouden. Neem contact met ons op voor hulp.',
    invalid: 'We kunnen deze winkelmand nog niet verwerken. Controleer de aantallen in je winkelmand.',
    contact: 'Neem contact op', quantity: 'Aantal',
  },
  en: {
    title: 'Secure checkout', intro: 'Pay for all your items together in one payment.',
    back: 'Back to your bag', empty: 'Your bag is empty.', shop: 'Shop the collection',
    subtotal: 'Items, before discounts and shipping', final: 'You will see the final price, discounts and shipping costs before you pay.',
    delivery: 'Delivery country: Netherlands', deliveryNote: 'Delivery is currently available in the Netherlands only.',
    parcels: 'Your order may arrive in separate parcels.',
    button: 'Continue to secure payment', loading: 'Preparing your order…', hydrated: 'Loading your bag…',
    preserved: 'Your bag will be saved.', retry: 'Checkout is currently unavailable. Please try again; your bag has been saved.',
    pending: 'Your earlier checkout is still being checked. Your bag has been saved. Please try again later.',
    review: 'Your earlier checkout needs to be checked first. Please contact us before making another payment.',
    changed: 'Your bag, price or availability has changed. Check your items and try again.',
    gift: 'Gift card checkout is not available on this route yet. Your bag has been saved. Contact us for help.',
    invalid: 'We cannot process this bag yet. Please check the quantities in your bag.',
    contact: 'Contact us', quantity: 'Quantity',
  },
}

export function ShopifyCheckoutHandoff() {
  const locale = useLocale()
  const text = copy[locale === 'en' ? 'en' : 'nl']
  const items = useCart(state => state.items)
  const hydrated = useCartGehydrateerd()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const attempt = useRef<CheckoutAttempt | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function proceed() {
    if (!hydrated || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    const abort = new AbortController()
    controller.current = abort
    const timeout = setTimeout(() => abort.abort(), 20_000)
    try {
      const snapshot = createShopifyCartSnapshot(useCart.getState().items, locale)
      // Acknowledge the HttpOnly ownership cookie before any cart mutation.
      // If this response is lost, retrying only creates/reuses a session, never
      // a second Shopify cart whose owner cannot be recovered.
      const sessionResponse = await fetch('/api/shopify/session', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: abort.signal,
      })
      if (!sessionResponse.ok) throw new Error('CHECKOUT_UNAVAILABLE')
      const session: unknown = await sessionResponse.json()
      if (!session || typeof session !== 'object' || (session as { ready?: unknown }).ready !== true) {
        throw new Error('CHECKOUT_UNAVAILABLE')
      }
      if (JSON.stringify(createShopifyCartSnapshot(useCart.getState().items, locale)) !== JSON.stringify(snapshot)) {
        throw new Error('CART_CHANGED')
      }
      let stored: unknown = attempt.current
      if (!stored) {
        try { stored = JSON.parse(sessionStorage.getItem(SHOPIFY_ATTEMPT_STORAGE_KEY) || 'null') } catch { /* Storage is optional. */ }
      }
      attempt.current = getCheckoutAttempt(snapshot, stored, () => crypto.randomUUID())
      try { sessionStorage.setItem(SHOPIFY_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt.current)) } catch { /* Keep the in-memory attempt for retries. */ }
      const response = await fetch('/api/shopify/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ ...snapshot, attemptId: attempt.current.attemptId }), signal: abort.signal,
      })
      if (!response.ok) {
        const failure: unknown = await response.json().catch(() => null)
        const code = failure && typeof failure === 'object' ? (failure as { code?: unknown }).code : undefined
        if (canRotateCheckoutAttempt(failure)) {
          // Acknowledged failure before checkout issuance: prepare a fresh
          // attempt for the user's next click, never automatically resubmit.
          attempt.current = getCheckoutAttempt(snapshot, null, () => crypto.randomUUID())
          try { sessionStorage.setItem(SHOPIFY_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt.current)) } catch { /* In-memory retry remains safe. */ }
        } else if (code === 'ATTEMPT_PENDING') {
          throw new Error('ATTEMPT_PENDING')
        } else if (['ATTEMPT_EXPIRED', 'ATTEMPT_FAILED', 'INPUT_CHANGED', 'ATTEMPT_CONFLICT'].includes(String(code))) {
          throw new Error('ATTEMPT_REVIEW_REQUIRED')
        }
        throw new Error(code === 'CART_CHANGED' || code === 'VARIANT_NOT_RELEASED' ? 'CART_CHANGED' : 'CHECKOUT_UNAVAILABLE')
      }
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') throw new Error('INVALID_RESPONSE')
      const data = result as { checkoutUrl?: unknown; attemptId?: unknown }
      if (data.attemptId !== attempt.current.attemptId) throw new Error('INVALID_RESPONSE')
      // Another tab can change the bag while the server prepares checkout.
      if (JSON.stringify(createShopifyCartSnapshot(useCart.getState().items, locale)) !== attempt.current.snapshot) {
        throw new Error('CART_CHANGED')
      }
      const url = checkoutRedirectUrl(data.checkoutUrl, process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_HOST)
      // Creating a checkout is not payment. Never clear or alter cart contents here.
      window.location.assign(url)
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : ''
      setError(code === 'ATTEMPT_PENDING' ? text.pending : code === 'ATTEMPT_REVIEW_REQUIRED' ? text.review : code === 'CART_CHANGED' ? text.changed : code === 'UNSUPPORTED_CART' ? text.gift : code === 'INVALID_CART' ? text.invalid : text.retry)
    } finally {
      clearTimeout(timeout)
      controller.current = null
      inFlight.current = false
      setBusy(false)
    }
  }

  if (!hydrated) return <p role="status" className="mx-auto max-w-5xl px-4 py-16">{text.hydrated}</p>
  if (!items.length) return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <ShoppingBag className="mx-auto mb-5 h-10 w-10" aria-hidden="true" />
      <h1 className="mb-6 font-display text-3xl uppercase">{text.empty}</h1>
      <Link href="/shop" className={buttonVariants({ variant: 'secondary' })}>{text.shop}</Link>
    </section>
  )
  const unsupported = items.some(item => item.isGiftCard)
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <Link href="/cart" className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold uppercase tracking-wide underline underline-offset-4">
        <ArrowLeft size={16} aria-hidden="true" />{text.back}
      </Link>
      <h1 className="font-display text-4xl uppercase md:text-5xl">{text.title}</h1>
      <p className="mt-3 mb-8 text-gray-700">{text.intro}</p>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_340px]">
        <ul aria-label={locale === 'en' ? 'Your items' : 'Je artikelen'} className="border-t-2 border-black">
          {items.map(item => (
            <li key={item.variantId} className="flex gap-4 border-b border-gray-200 py-5">
              {item.image && <div className="relative h-28 w-20 shrink-0 bg-gray-100"><Image src={item.image} alt={item.name} fill sizes="80px" className="object-contain" /></div>}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl uppercase">{item.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{[item.color, item.size].filter(Boolean).join(' · ')}</p>
                <p className="mt-2 text-sm">{text.quantity}: {item.quantity}</p>
                <p className="mt-2 font-semibold tabular-nums">{formatBedrag(item.price * item.quantity, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
        <section aria-label={locale === 'en' ? 'Order summary' : 'Besteloverzicht'} className="self-start border-2 border-black p-5 md:sticky md:top-6">
          <p className="text-sm text-gray-600">{text.subtotal}</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{formatBedrag(items.reduce((sum, item) => sum + item.price * item.quantity, 0), locale)}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">{text.final}</p>
          <div className="my-5 space-y-2 border-y border-gray-200 py-4 text-sm">
            <p className="font-semibold">{text.delivery}</p>
            <p className="text-gray-600">{text.deliveryNote}</p>
            <p>{text.parcels}</p>
          </div>
          {unsupported && <p className="mb-4 text-sm leading-relaxed text-red-800">{text.gift} <Link href="/contact" className="underline underline-offset-4">{text.contact}</Link></p>}
          {error && <p role="alert" className="mb-4 border-l-2 border-red-700 pl-3 text-sm leading-relaxed text-red-800">{error}{error === text.review && <> <Link href="/contact" className="underline underline-offset-4">{text.contact}</Link></>}</p>}
          <Button fullWidth isLoading={busy} loadingLabel={text.loading} disabled={unsupported} onClick={proceed}
            className="text-black hover:text-black focus-visible:ring-black">
            <Lock size={17} aria-hidden="true" />{text.button}
          </Button>
          <p aria-live="polite" className="mt-3 text-center text-xs text-gray-600">{busy ? text.loading : text.preserved}</p>
        </section>
      </div>
    </div>
  )
}
