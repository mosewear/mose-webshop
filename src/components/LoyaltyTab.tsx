'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LOYALTY_CONFIG, type LoyaltyTier } from '@/lib/loyalty'

interface LoyaltyData {
  points_balance: number
  lifetime_points: number
  tier: LoyaltyTier
  progress: {
    currentTier: LoyaltyTier
    nextTier: LoyaltyTier | null
    progress: number
    pointsNeeded: number
  }
}

interface Transaction {
  id: string
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired'
  points: number
  description: string | null
  order_id: string | null
  created_at: string
}

const tierColors: Record<LoyaltyTier, { bg: string; text: string; border: string; accent: string }> = {
  bronze: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', accent: 'bg-amber-500' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400', accent: 'bg-gray-400' },
  gold: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-400', accent: 'bg-yellow-500' },
}

const tierBenefitKeys: Record<string, string> = {
  discount_5_percent: 'benefitDiscount5',
  discount_10_percent: 'benefitDiscount10',
}

export default function LoyaltyTab() {
  const t = useTranslations('loyalty')
  const locale = useLocale()
  const numberLocale = locale === 'en' ? 'en-GB' : 'nl-NL'
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)

  useEffect(() => {
    fetchLoyaltyData()
  }, [])

  async function fetchLoyaltyData() {
    try {
      const res = await fetch('/api/loyalty')
      const json = await res.json()
      if (res.ok) {
        setData(json)
        fetchTransactions()
      }
    } catch (err) {
      console.error('Error fetching loyalty data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTransactions() {
    setTxLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) return

      const { data: txData } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(20)

      setTransactions(txData || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setTxLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{t('tab.loading')}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 p-8 text-center">
        <p className="text-gray-600">{t('tab.loadFailed')}</p>
      </div>
    )
  }

  const colors = tierColors[data.tier]
  const tierConfig = LOYALTY_CONFIG.tiers[data.tier]
  const benefits = tierConfig.benefits as readonly string[]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-display mb-6">{t('tab.title')}</h2>

      {/* Tier Badge & Points */}
      <div className={`border-2 ${colors.border} ${colors.bg} p-6 md:p-8`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-4 py-2 font-bold uppercase text-sm tracking-wider border-2 ${colors.border} ${colors.text}`}>
                {data.tier}
              </span>
              <span className="text-sm text-gray-600">{t('tab.member')}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {t('tab.lifetimePoints', { points: data.lifetime_points.toLocaleString(numberLocale) })}
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-4xl md:text-5xl font-display">{data.points_balance.toLocaleString(numberLocale)}</div>
            <div className="text-sm text-gray-600 font-bold uppercase tracking-wide">{t('tab.availablePoints')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {data.progress.nextTier && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold uppercase">{data.tier}</span>
              <span className="font-bold uppercase">{data.progress.nextTier}</span>
            </div>
            <div className="w-full h-3 bg-white border border-gray-300 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.accent} transition-all duration-500 rounded-full`}
                style={{ width: `${data.progress.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {t.rich('tab.pointsToNext', {
                points: data.progress.pointsNeeded,
                tier: data.progress.nextTier,
                b: (chunks) => <span className="font-bold">{chunks}</span>,
                tierWrap: (chunks) => <span className="font-bold capitalize">{chunks}</span>,
              })}
            </p>
          </div>
        )}
      </div>

      {/* Tier Benefits */}
      <div className="bg-white border-2 border-black p-6 md:p-8">
        <h3 className="text-xl font-display mb-4">{t('tab.yourBenefits')}</h3>
        {benefits.length > 0 ? (
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">{tierBenefitKeys[benefit] ? t(`tab.${tierBenefitKeys[benefit]}`) : benefit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">
            {t('tab.noBenefits')}
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-bold text-sm uppercase tracking-wider text-gray-600 mb-3">{t('tab.allTiers')}</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className={`p-3 border-2 ${data.tier === 'bronze' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
              <div className="font-bold text-sm">{t('bronze')}</div>
              <div className="text-xs text-gray-500">0 - 499</div>
            </div>
            <div className={`p-3 border-2 ${data.tier === 'silver' ? 'border-gray-400 bg-gray-100' : 'border-gray-200'}`}>
              <div className="font-bold text-sm">{t('silver')}</div>
              <div className="text-xs text-gray-500">500 - 999</div>
            </div>
            <div className={`p-3 border-2 ${data.tier === 'gold' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
              <div className="font-bold text-sm">{t('gold')}</div>
              <div className="text-xs text-gray-500">1000+</div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-brand-primary/5 border-2 border-brand-primary/20 p-6 md:p-8">
        <h3 className="text-xl font-display mb-3">{t('tab.howItWorks')}</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="font-bold text-brand-primary mt-0.5">1.</span>
            <span>{t.rich('tab.step1', { strong: (chunks) => <strong>{chunks}</strong> })}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-brand-primary mt-0.5">2.</span>
            <span>{t.rich('tab.step2', { strong: (chunks) => <strong>{chunks}</strong> })}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-brand-primary mt-0.5">3.</span>
            <span>
              {t.rich('tab.step3', { strong: (chunks) => <strong>{chunks}</strong> })}
            </span>
          </li>
        </ul>
      </div>

      {/* Transaction History */}
      <div className="bg-white border-2 border-black p-6 md:p-8">
        <h3 className="text-xl font-display mb-4">{t('tab.history')}</h3>
        {txLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-gray-600 text-center py-4">{t('tab.noTransactions')}</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase border ${
                      tx.type === 'earned' ? 'bg-green-50 text-green-700 border-green-200' :
                      tx.type === 'redeemed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      tx.type === 'adjusted' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {tx.type === 'earned' ? t('earned') :
                       tx.type === 'redeemed' ? t('redeemed') :
                       tx.type === 'adjusted' ? t('adjusted') :
                       t('tab.expired')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString(numberLocale, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{tx.description || '—'}</p>
                </div>
                <div className={`text-right ml-4 font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center py-4">
        <p className="text-lg font-display mb-2">{t('earnPoints')}</p>
        <p className="text-sm text-gray-600">
          {t('tab.ctaText')}
        </p>
      </div>
    </div>
  )
}
