'use client'

import { useEffect, useState } from 'react'

export type CampaignPopupTrigger =
  | 'immediate'
  | 'timer'
  | 'scroll'
  | 'exit_intent'

export interface ActiveCampaignPopup {
  enabled: true
  title: string
  body: string
  cta: string
  imageUrl: string | null
  imageAlt: string
  trigger: CampaignPopupTrigger
  delaySeconds: number
  scrollPct: number
  showOnPages: string[]
}

export interface ActiveCampaign {
  active: true
  slug: string
  themeColor: string
  textColor: string
  accentColor: string
  accentTextColor: string
  ctaHref: string | null
  autoApplyViaUrl: boolean
  showCodeInPopup: boolean
  code: string | null
  codeIsActive: boolean
  codeDiscount: { type: 'percentage' | 'fixed'; value: number } | null
  popup: ActiveCampaignPopup | null
}

export interface InactiveCampaign {
  active: false
}

export type ActiveCampaignResponse = ActiveCampaign | InactiveCampaign

const ENDPOINT = '/api/marketing-campaign/active'

interface CacheEntry {
  promise: Promise<ActiveCampaignResponse>
  fetchedAt: number
}

const CACHE: Record<string, CacheEntry | undefined> = {}
const TTL_MS = 30_000

function fetchOnce(locale: string): Promise<ActiveCampaignResponse> {
  const now = Date.now()
  const cached = CACHE[locale]
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.promise
  }
  const promise = fetch(`${ENDPOINT}?locale=${locale}`, {
    credentials: 'same-origin',
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Status ${res.status}`)
      return res.json() as Promise<ActiveCampaignResponse>
    })
    .catch((err) => {
      console.error('[campaign] fetch error:', err)
      return { active: false } as InactiveCampaign
    })
  CACHE[locale] = { promise, fetchedAt: now }
  return promise
}

/**
 * Client hook used by every popup wrapper to know whether a campaign
 * popup is active. Returns a tri-state:
 *   - undefined: still loading (don't render fallback popups yet)
 *   - {active: false}: no campaign — fallback popups may render
 *   - {active: true, popup: …}: campaign owns the popup slot
 */
export function useActiveCampaignClient(locale: string): ActiveCampaignResponse | undefined {
  const [data, setData] = useState<ActiveCampaignResponse | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchOnce(locale).then((res) => {
      if (!cancelled) setData(res)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  return data
}

/**
 * True if a campaign with an enabled popup is currently active. Used by
 * Newsletter / Survey wrappers to suppress themselves so we never stack
 * three popups on a King's Day visit.
 */
export function isCampaignPopupActive(data: ActiveCampaignResponse | undefined): boolean {
  if (!data || !data.active) return false
  return Boolean(data.popup?.enabled)
}
