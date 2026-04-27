'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { Link } from '@/i18n/routing'
import type { ActiveCampaign } from './useActiveCampaignClient'

interface CampaignPopupProps {
  campaign: ActiveCampaign
}

const CURRENT_PATH_PAGES = (path: string): string => {
  if (path === '/' || /^\/(nl|en)\/?$/.test(path)) return 'home'
  if (path.includes('/shop')) return 'shop'
  if (path.includes('/product/')) return 'product'
  if (path.includes('/blog')) return 'blog'
  if (path.includes('/about')) return 'about'
  return 'other'
}

function renderInlineBold(text: string): React.ReactNode {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

export default function CampaignPopup({ campaign }: CampaignPopupProps) {
  const t = useTranslations('campaignPopup')
  const popup = campaign.popup!
  const sessionKey = `mose_campaign_popup_session:${campaign.slug}`
  const persistKey = `mose_campaign_popup_dismissed:${campaign.slug}`

  const [isVisible, setIsVisible] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const handleSessionDismiss = useCallback(() => {
    setIsVisible(false)
    try {
      sessionStorage.setItem(sessionKey, '1')
    } catch {
      /* ignore */
    }
    lastFocusedRef.current?.focus?.()
  }, [sessionKey])

  const handlePersistDismiss = useCallback(() => {
    setIsVisible(false)
    try {
      localStorage.setItem(persistKey, '1')
    } catch {
      /* ignore */
    }
    lastFocusedRef.current?.focus?.()
  }, [persistKey])

  const shouldShow = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    if (hasOpened) return false

    try {
      if (sessionStorage.getItem(sessionKey)) return false
      if (localStorage.getItem(persistKey)) return false
    } catch {
      /* storage unavailable */
    }

    if (popup.showOnPages.length > 0) {
      const page = CURRENT_PATH_PAGES(window.location.pathname)
      // Never show in admin/checkout/order-confirmation flows.
      if (
        window.location.pathname.startsWith('/admin') ||
        window.location.pathname.includes('/checkout') ||
        window.location.pathname.includes('/order-confirmation') ||
        window.location.pathname.includes('/account')
      ) {
        return false
      }
      if (!popup.showOnPages.includes(page)) return false
    }

    return true
  }, [hasOpened, sessionKey, persistKey, popup.showOnPages])

  // Trigger logic
  useEffect(() => {
    if (!shouldShow()) return

    const open = () => {
      lastFocusedRef.current = document.activeElement as HTMLElement | null
      setIsVisible(true)
      setHasOpened(true)
    }

    if (popup.trigger === 'immediate') {
      open()
      return
    }
    if (popup.trigger === 'timer') {
      const id = window.setTimeout(open, popup.delaySeconds * 1000)
      return () => window.clearTimeout(id)
    }
    if (popup.trigger === 'scroll') {
      const handler = () => {
        const total =
          document.documentElement.scrollHeight - window.innerHeight
        const pct = total > 0 ? (window.scrollY / total) * 100 : 0
        if (pct >= popup.scrollPct) {
          window.removeEventListener('scroll', handler)
          open()
        }
      }
      window.addEventListener('scroll', handler, { passive: true })
      return () => window.removeEventListener('scroll', handler)
    }
    if (popup.trigger === 'exit_intent') {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          document.removeEventListener('mouseleave', handler)
          open()
        }
      }
      document.addEventListener('mouseleave', handler)
      return () => document.removeEventListener('mouseleave', handler)
    }
    return
  }, [popup.trigger, popup.delaySeconds, popup.scrollPct, shouldShow])

  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSessionDismiss()
    }
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => dialogRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [isVisible, handleSessionDismiss])

  const handleCopyCode = async () => {
    if (!campaign.code) return
    try {
      await navigator.clipboard.writeText(campaign.code)
      setCopied(true)
      toast.success(t('codeCopied', { code: campaign.code }))
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error(t('codeCopyFailed'))
    }
  }

  if (!isVisible) return null

  const showCode =
    campaign.showCodeInPopup &&
    Boolean(campaign.code) &&
    campaign.codeIsActive

  const codeAriaLabel = campaign.code
    ? t('codeChipAria', { code: campaign.code })
    : ''

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fadeIn"
        onClick={handleSessionDismiss}
        aria-hidden
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-popup-title"
          className="bg-white border-4 border-black max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-slideUp focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <button
              type="button"
              onClick={handleSessionDismiss}
              aria-label={t('closeAria')}
              className="absolute top-3 right-3 z-10 p-1.5 bg-white/90 hover:bg-white border border-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {popup.imageUrl ? (
              <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                <Image
                  src={popup.imageUrl}
                  alt={popup.imageAlt || popup.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 480px"
                  priority
                />
              </div>
            ) : (
              <div
                className="w-full aspect-[4/3] flex items-center justify-center px-6"
                style={{ backgroundColor: campaign.themeColor, color: campaign.textColor }}
              >
                <span className="font-display text-3xl md:text-4xl tracking-tight text-center leading-tight">
                  {popup.title}
                </span>
              </div>
            )}
            <div
              className="h-1.5"
              style={{ backgroundColor: campaign.themeColor }}
              aria-hidden
            />
          </div>

          <div className="p-6 md:p-7 space-y-4">
            <h2
              id="campaign-popup-title"
              className="font-display text-2xl md:text-3xl leading-tight"
            >
              {popup.title}
            </h2>

            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              {renderInlineBold(popup.body)}
            </p>

            {showCode && campaign.code ? (
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label={codeAriaLabel}
                className="w-full border-4 border-black px-3 py-2.5 flex items-center justify-between gap-3 transition-transform active:scale-[0.99]"
                style={{ backgroundColor: campaign.themeColor, color: campaign.textColor }}
              >
                <span className="text-[10px] tracking-[0.25em] font-bold uppercase">
                  {t('codeLabel')}
                </span>
                <span className="font-mono font-bold text-base md:text-lg tracking-[0.2em] truncate">
                  {campaign.code}
                </span>
                {copied ? (
                  <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
                ) : (
                  <Copy className="w-4 h-4 shrink-0" />
                )}
              </button>
            ) : null}

            {popup.cta ? (
              campaign.ctaHref ? (
                <Link
                  href={campaign.ctaHref}
                  onClick={handleSessionDismiss}
                  className="block w-full text-center py-3 font-bold uppercase tracking-wider text-sm transition-colors hover:opacity-90 active:scale-[0.99]"
                  style={{
                    backgroundColor: campaign.accentColor,
                    color: campaign.accentTextColor,
                  }}
                >
                  {popup.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSessionDismiss}
                  className="block w-full text-center py-3 font-bold uppercase tracking-wider text-sm transition-colors hover:opacity-90 active:scale-[0.99]"
                  style={{
                    backgroundColor: campaign.accentColor,
                    color: campaign.accentTextColor,
                  }}
                >
                  {popup.cta}
                </button>
              )
            ) : null}

            <button
              type="button"
              onClick={handlePersistDismiss}
              className="block w-full text-center text-xs text-gray-500 hover:text-gray-700 transition-colors underline-offset-4 hover:underline"
            >
              {t('dontShowAgain')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
