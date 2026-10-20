'use client'

/**
 * Honest "live" activity strip:
 *   * pulses a heartbeat every 30s so the server can count distinct visitors
 *   * polls the activity endpoint every 60s for fresh counts
 *   * thresholds: only show "X people viewing" when >= 4, so the strip never
 *     says something embarrassing or fake
 *
 * Verkoop: altijd een echt getal, nooit opgehoogd. Wel kiezen we de periode
 * die het sterkste ware getal geeft. "2 keer in 24 uur" overtuigt niemand,
 * "6 keer in de afgelopen 7 dagen" over dezelfde hoodie wel, en het klopt
 * allebei. Een verzonnen getal is in de EU een oneerlijke handelspraktijk
 * en de ACM handhaaft daar actief op.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface ProductActivityStripProps {
  productId: string
}

const HEARTBEAT_INTERVAL_MS = 30_000
const POLL_INTERVAL_MS = 60_000
const SESSION_KEY = 'mose:product-activity:session'

const VIEWER_THRESHOLD = 4

interface ActivityData {
  activeViewers: number
  sold24h: number
  sold7d: number
  sold30d: number
}

type Verkoopsleutel = 'sold24h' | 'sold7d' | 'sold30d'

/**
 * Kortste periode eerst: die klinkt het meest actueel. Een periode telt pas
 * mee boven de drempel, zodat er nooit "1 keer in 30 dagen" staat. De drempel
 * voor 30 dagen is hoger omdat een lang venster met een laag getal juist
 * stilte uitstraalt.
 */
const VERKOOPVENSTERS: { sleutel: Verkoopsleutel; drempel: number }[] = [
  { sleutel: 'sold24h', drempel: 3 },
  { sleutel: 'sold7d', drempel: 3 },
  { sleutel: 'sold30d', drempel: 5 },
]

const LEEG: ActivityData = { activeViewers: 0, sold24h: 0, sold7d: 0, sold30d: 0 }

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing && existing.length >= 8) return existing
    const fresh =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    window.sessionStorage.setItem(SESSION_KEY, fresh)
    return fresh
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }
}

export default function ProductActivityStrip({ productId }: ProductActivityStripProps) {
  const t = useTranslations('product.activity')
  const [data, setData] = useState<ActivityData>(LEEG)
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId()
    if (!sessionIdRef.current) return

    let cancelled = false

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/products/${productId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
          keepalive: true,
        })
      } catch {
        // ignore - fire and forget
      }
    }

    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/activity`, {
          method: 'GET',
        })
        if (!res.ok) return
        const json = (await res.json()) as ActivityData
        if (cancelled) return
        setData({
          activeViewers: Number(json.activeViewers) || 0,
          sold24h: Number(json.sold24h) || 0,
          sold7d: Number(json.sold7d) || 0,
          sold30d: Number(json.sold30d) || 0,
        })
      } catch {
        // ignore
      }
    }

    sendHeartbeat()
    fetchActivity()

    const beatId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    const pollId = window.setInterval(fetchActivity, POLL_INTERVAL_MS)

    // Final beat on unmount so the count drops faster after navigation.
    return () => {
      cancelled = true
      window.clearInterval(beatId)
      window.clearInterval(pollId)
    }
  }, [productId])

  const showViewers = data.activeViewers >= VIEWER_THRESHOLD
  const venster = VERKOOPVENSTERS.find((v) => data[v.sleutel] >= v.drempel)
  const showSold = Boolean(venster)

  if (!showViewers && !showSold) return null

  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] md:text-sm text-gray-800"
      aria-live="polite"
    >
      {showViewers && (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {t('viewing', { count: data.activeViewers })}
        </span>
      )}
      {showSold && (
        <span className="inline-flex items-center gap-2 font-semibold">
          <svg
            className="w-4 h-4 shrink-0 text-brand-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 005.414 17H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {venster && t(venster.sleutel, { count: data[venster.sleutel] })}
        </span>
      )}
    </div>
  )
}
