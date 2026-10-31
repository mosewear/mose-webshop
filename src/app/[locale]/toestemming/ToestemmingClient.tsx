'use client'

/**
 * Bevestigen of afmelden voor de toestemmingsronde.
 *
 * De mail linkt hierheen met een token. Er gebeurt pas iets als de bezoeker
 * op de knop drukt: scanners en linkvoorvertoningen openen de pagina wel,
 * maar drukken nooit op een knop. Zo blijft "bevestigd" ook echt bevestigd.
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

type Stand = 'vraag' | 'bezig' | 'bevestigd' | 'afgemeld' | 'fout'

const KNOP =
  'mose-button w-full sm:w-auto'

export default function ToestemmingClient() {
  const t = useTranslations('toestemming')
  const params = useSearchParams()
  const token = params.get('t') || ''
  const geldig = /^[0-9a-f]{36}$/.test(token)
  const [afmelden, setAfmelden] = useState(params.get('actie') === 'afmelden')
  const [stand, setStand] = useState<Stand>(geldig ? 'vraag' : 'fout')
  const [melding, setMelding] = useState<string | null>(null)

  async function stuur(pad: string, gelukt: Stand) {
    setStand('bezig')
    setMelding(null)
    try {
      const res = await fetch(pad, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.status === 404 || res.status === 400) return setStand('fout')
      if (!res.ok) throw new Error(String(res.status))
      setStand(gelukt)
    } catch {
      setStand('vraag')
      setMelding(t('netwerkFout'))
    }
  }

  const bevestig = () => stuur('/api/toestemming/bevestig', 'bevestigd')
  const meldAf = () => stuur('/api/toestemming/afmelden', 'afgemeld')

  let titel: string
  let tekst: string
  let acties: React.ReactNode = null

  if (stand === 'fout') {
    titel = t('titel')
    tekst = t('fout')
  } else if (stand === 'bevestigd') {
    titel = t('klaarTitel')
    tekst = t('klaarTekst')
    acties = (
      <Link href="/shop" className={`${KNOP} border-black bg-black text-white hover:bg-gray-900`}>
        {t('naarShop')}
      </Link>
    )
  } else if (stand === 'afgemeld') {
    titel = t('afgemeldTitel')
    tekst = t('afgemeldTekst')
    acties = (
      <button type="button" onClick={bevestig} className={`${KNOP} border-black bg-white text-black hover:bg-black hover:text-white`}>
        {t('knop')}
      </button>
    )
  } else if (afmelden) {
    titel = t('afmeldTitel')
    tekst = t('afmeldTekst')
    acties = (
      <>
        <button type="button" onClick={meldAf} disabled={stand === 'bezig'} className={`${KNOP} border-black bg-black text-white hover:bg-gray-900`}>
          {stand === 'bezig' ? t('bezig') : t('afmeldKnop')}
        </button>
        <button type="button" onClick={() => setAfmelden(false)} className="min-h-[44px] text-[14px] font-semibold text-gray-700 underline underline-offset-4 hover:text-black">
          {t('tochBlijven')}
        </button>
      </>
    )
  } else {
    titel = t('titel')
    tekst = t('tekst')
    acties = (
      <>
        <button type="button" onClick={bevestig} disabled={stand === 'bezig'} className={`${KNOP} mose-button--primary`}>
          {stand === 'bezig' ? t('bezig') : t('knop')}
        </button>
        <button type="button" onClick={() => setAfmelden(true)} className="min-h-[44px] text-[14px] font-semibold text-gray-700 underline underline-offset-4 hover:text-black">
          {t('afmeldTitel')}
        </button>
      </>
    )
  }

  return (
    <section className="bg-[#F5F4F1]">
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-4 py-16 md:py-24">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tight text-black md:text-5xl" style={{ textWrap: 'balance' }}>
          {titel}
        </h1>
        <p className="mt-4 max-w-prose text-[16px] leading-relaxed text-gray-700" aria-live="polite">
          {tekst}
        </p>
        {melding && (
          <p role="alert" className="mt-3 text-[14px] font-semibold text-red-700">
            {melding}
          </p>
        )}
        {acties && <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">{acties}</div>}
      </div>
    </section>
  )
}
