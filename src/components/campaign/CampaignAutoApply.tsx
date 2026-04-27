'use client'

import { useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { useActiveCampaignClient } from './useActiveCampaignClient'

const SUPPRESSED_PATH_PREFIXES = [
  '/admin',
  '/api',
]
const SUPPRESSED_PATH_FRAGMENTS = [
  '/checkout',
  '/order-confirmation',
  '/account',
  '/login',
  '/register',
]

function isSuppressedPath(path: string): boolean {
  if (SUPPRESSED_PATH_PREFIXES.some((p) => path.startsWith(p))) return true
  if (SUPPRESSED_PATH_FRAGMENTS.some((f) => path.includes(f))) return true
  return false
}

export default function CampaignAutoApply() {
  const locale = useLocale()
  const t = useTranslations('campaignAutoApply')
  const data = useActiveCampaignClient(locale)
  const appliedRef = useRef(false)

  useEffect(() => {
    if (appliedRef.current) return
    if (typeof window === 'undefined') return
    if (isSuppressedPath(window.location.pathname)) return

    const params = new URLSearchParams(window.location.search)
    const campaignSlug = params.get('campaign')
    const directCode = params.get('code')

    if (!campaignSlug && !directCode) return
    if (!data) return // Wait for campaign data to load.

    let codeToApply: string | null = null
    let discountType: 'percentage' | 'fixed' | null = null
    let discountValue: number | null = null

    if (
      data.active &&
      campaignSlug &&
      data.slug === campaignSlug &&
      data.autoApplyViaUrl &&
      data.code &&
      data.codeIsActive
    ) {
      codeToApply = data.code
      discountType = data.codeDiscount?.type ?? null
      discountValue = data.codeDiscount?.value ?? null
    } else if (directCode) {
      // Bare ?code= without a campaign — let the cart drawer revalidate
      // server-side; we just stash it.
      codeToApply = directCode.toUpperCase().slice(0, 50)
    }

    appliedRef.current = true

    // Strip the params from the URL whether or not we applied, to keep
    // the address bar clean and prevent re-triggering on refresh.
    params.delete('campaign')
    params.delete('code')
    const cleanQuery = params.toString()
    const cleanUrl =
      window.location.pathname +
      (cleanQuery ? `?${cleanQuery}` : '') +
      window.location.hash
    window.history.replaceState(null, '', cleanUrl)

    if (!codeToApply) return

    try {
      const previous = localStorage.getItem('mose_promo_code')
      localStorage.setItem('mose_promo_code', codeToApply)
      if (discountType && discountValue != null) {
        localStorage.setItem('mose_promo_type', discountType)
        localStorage.setItem('mose_promo_value', String(discountValue))
        // Cart drawer will recalculate the actual amount on open.
        localStorage.setItem('mose_promo_discount', '0')
      }

      if (previous && previous !== codeToApply) {
        toast.success(t('replacedToast', { code: codeToApply, previous }), {
          duration: 4500,
        })
      } else {
        toast.success(t('appliedToast', { code: codeToApply }), {
          duration: 4500,
        })
      }
    } catch (err) {
      console.error('[campaign-auto-apply] localStorage error', err)
    }
  }, [data, t])

  return null
}
