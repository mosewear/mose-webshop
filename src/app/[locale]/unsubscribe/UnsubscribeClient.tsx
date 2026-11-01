'use client'

import { publicError } from '@/lib/public-errors'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { CheckCircle, XCircle, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UnsubscribeClient() {
  const t = useTranslations('unsubscribe')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  
  const [loading, setLoading] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(false)
  const [error, setError] = useState('')

  const handleUnsubscribe = async () => {
    if (!email || loading) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(publicError(data, locale, t('errorRetry')))
        toast.error(publicError(data, locale, t('error')))
        setLoading(false)
        return
      }

      setUnsubscribed(true)
      toast.success(t('successToast'))
    } catch (err) {
      console.error('Unsubscribe error:', err)
      setError(t('errorRetry'))
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <h1 className="text-3xl font-display mb-4">{t('invalidTitle')}</h1>
          <p className="text-gray-600 mb-8">
            {t('invalidText')}
          </p>
          <Link
            href="/"
            className="mose-button mose-button--primary"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    )
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-display mb-4">{t('doneTitle')}</h1>
          <p className="text-gray-600 mb-4">
            {t('doneText')}
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {t('doneHint')}
          </p>
          <Link
            href="/"
            className="mose-button mose-button--primary"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="bg-white border-4 border-black p-8 text-center">
          <Mail className="w-16 h-16 text-brand-primary mx-auto mb-6" />
          <h1 className="text-3xl font-display mb-4">{t('title')}</h1>
          <p className="text-gray-600 mb-2">
            {t('confirmText')}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {t('emailLabel')} <span className="font-semibold">{email}</span>
          </p>

          {error && (
            <div className="bg-red-50 border-2 border-red-600 text-red-900 px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="w-full px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('busy')}
                </span>
              ) : (
                t('confirmButton')
              )}
            </button>
            <Link
              href="/"
              className="w-full px-8 py-4 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors text-center"
            >
              {t('keepButton')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

