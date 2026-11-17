'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@/i18n/routing'
import { activeSeasonalOffer, SEASONAL_OFFERS } from '@/lib/seasonal-offers'

export function useSeasonalOffer(enabled = true) {
  const [now, setNow] = useState<number>()
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      clearTimeout(timer)
      const timestamp = Date.now()
      setNow(timestamp)
      const next = SEASONAL_OFFERS.flatMap(offer => [offer.startsAt, offer.endsAt])
        .map(value => Date.parse(value)).find(value => value > timestamp)
      if (next) timer = setTimeout(update, Math.min(next - timestamp + 10, 60_000))
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update) }
  }, [enabled])
  return !enabled || now === undefined ? undefined : activeSeasonalOffer(now)
}

export default function SeasonalOfferBanner({ locale, enabled, children }: {
  locale: string; enabled: boolean; children: ReactNode
}) {
  const offer = useSeasonalOffer(enabled)
  const en = locale === 'en'
  if (!offer) return children
  return (
    <Link href="/shop" id="announcement-banner" className="fixed inset-x-0 top-0 z-50 block text-white"
      style={{ backgroundColor: offer.color }}>
      <div className="mx-auto grid min-h-9 max-w-7xl grid-cols-[1fr_auto] items-center gap-2 px-3 py-1.5 sm:min-h-12 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <span className="hidden text-[10px] font-semibold tracking-[0.24em] sm:block" aria-hidden="true" style={{ color: offer.accent }}>MOSE / {en ? 'THE EDIT' : 'DE COLLECTIE'}</span>
        <span className="text-center text-[11px] font-bold uppercase leading-tight tracking-wider sm:text-sm">
          {offer.title[en ? 'en' : 'nl']} <span className="mx-1" aria-hidden="true" style={{ color: offer.accent }}>·</span>
          {en ? 'The MOSE edit' : 'De MOSE-edit'}
        </span>
        <span className="justify-self-end whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider sm:text-xs">
          {en ? 'Shop now' : 'Shop nu'} <span aria-hidden="true" style={{ color: offer.accent }}>→</span>
        </span>
      </div>
    </Link>
  )
}
