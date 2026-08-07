'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useCart, type CartItem } from '@/store/cart'

/**
 * Meta Commerce Manager checkout URL target (client cart bridge).
 *
 * Prefer configuring this base URL in Commerce Manager:
 *   https://www.mosewear.com/api/meta-checkout
 * (API 302s here with the same query string.)
 *
 * Also works directly:
 *   https://www.mosewear.com/nl/meta-checkout
 *
 * Meta appends ?products=CONTENT_ID:QTY&coupon=…&cart_origin=instagram
 */
function MetaCheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const locale = useLocale()
  const setItems = useCart((s) => s.setItems)
  const [message, setMessage] = useState('Winkelwagen laden…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const products = searchParams.get('products') || searchParams.get('product')
      const coupon = searchParams.get('coupon')
      const cartOrigin = searchParams.get('cart_origin')

      if (!products) {
        // Meta validation sometimes hits the bare URL first.
        setMessage('Doorsturen naar checkout…')
        router.replace('/checkout')
        return
      }

      try {
        const qs = new URLSearchParams()
        qs.set('products', products)
        qs.set('format', 'json')
        if (coupon) qs.set('coupon', coupon)
        if (cartOrigin) qs.set('cart_origin', cartOrigin)

        const res = await fetch(`/api/meta-checkout?${qs.toString()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        const data = (await res.json()) as {
          items?: CartItem[]
          unresolved?: string[]
          coupon?: string | null
          error?: string
        }

        if (cancelled) return

        if (!res.ok || !data.items?.length) {
          setMessage(
            data.error ||
              'Producten uit Meta Shop konden niet worden geladen. Je wordt doorgestuurd…',
          )
          window.setTimeout(() => router.replace('/shop'), 1800)
          return
        }

        setItems(data.items)

        if (data.coupon) {
          try {
            localStorage.setItem('mose_promo_code', data.coupon)
          } catch {
            // ignore quota / private mode
          }
        }

        if (cartOrigin) {
          try {
            sessionStorage.setItem('mose_cart_origin', cartOrigin)
          } catch {
            // ignore
          }
        }

        setMessage('Doorsturen naar afrekenen…')
        router.replace('/checkout')
      } catch {
        if (cancelled) return
        setMessage('Er ging iets mis. Je wordt doorgestuurd naar de shop…')
        window.setTimeout(() => router.replace('/shop'), 1800)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [searchParams, router, setItems, locale])

  return (
    <main className="min-h-[50vh] flex items-center justify-center px-6">
      <p className="text-sm tracking-wide text-neutral-600">{message}</p>
    </main>
  )
}

export default function MetaCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[50vh] flex items-center justify-center px-6">
          <p className="text-sm tracking-wide text-neutral-600">Winkelwagen laden…</p>
        </main>
      }
    >
      <MetaCheckoutInner />
    </Suspense>
  )
}
