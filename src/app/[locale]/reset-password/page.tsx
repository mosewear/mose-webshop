'use client'

import { publicError } from '@/lib/public-errors'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { createPasswordRecoveryClient } from '@/lib/supabase/password-recovery'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

export default function ResetPasswordPage() {
  const router = useRouter()
  const t = useTranslations('auth.resetPassword')
  const tErrors = useTranslations('auth.errors')
  const locale = useLocale()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const recoveryClient = useRef<ReturnType<typeof createPasswordRecoveryClient> | null>(null)
  const [link, setLink] = useState<'checking' | 'otp' | 'legacy' | 'invalid'>('checking')

  useEffect(() => {
    const url = new URL(window.location.href)
    const fragment = new URLSearchParams(url.hash.slice(1))
    if (url.searchParams.get('herstel') === '1') {
      setLink('otp')
      return
    }

    // Previously issued emails can still finish in the requesting browser.
    // A regular signed-in session by itself is not a recovery link.
    if (!url.searchParams.has('code') && fragment.get('type') !== 'recovery') {
      setLink('invalid')
      return
    }
    let active = true
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) setLink('legacy')
      else if (event === 'INITIAL_SESSION') setLink(current => current === 'legacy' ? current : 'invalid')
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || success || (link !== 'otp' && link !== 'legacy')) return
    setLoading(true)
    setError('')

    // Validation
    if (password.length < 6) {
      setError(tErrors('passwordMinLength'))
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(tErrors('passwordMismatch'))
      setLoading(false)
      return
    }

    try {
      let client = recoveryClient.current
      if (link === 'otp' && !client) {
        const pendingClient = createPasswordRecoveryClient()
        const { data, error: verifyError } = await pendingClient.auth.verifyOtp({
          type: 'recovery', email: email.trim().toLowerCase(), token: code.trim(),
        })
        if (verifyError?.code === 'otp_expired' || verifyError?.status === 403) {
          setError(t('invalidCode'))
          return
        }
        if (verifyError) throw verifyError
        if (!data.session) { setError(t('invalidCode')); return }
        setVerified(true)
        setCode('')
        recoveryClient.current = client = pendingClient
      }
      const { error: updateError } = await (client ?? createClient()).auth.updateUser({ password })

      if (updateError) {
        setError(publicError(updateError, locale, tErrors('somethingWrong')))
        setLoading(false)
        return
      }

      recoveryClient.current = null
      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?password_reset=success')
      }, 3000)
    } catch (err: unknown) {
      setError(publicError(err, locale, tErrors('somethingWrong')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <LocaleLink href="/" className="inline-block">
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={180}
              height={60}
              className="h-12 md:h-14 w-auto mx-auto"
              priority
            />
          </LocaleLink>
        </div>

        {/* Card */}
        <div className="bg-white border-2 border-black p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-display mb-2">{t('title')}</h1>
          <p className="text-gray-600 mb-6">
            {t('description')}
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-600 text-green-800">
              <strong>{t('success')}</strong> {t('successMessage')}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-800">
              {error}
            </div>
          )}

          {link === 'checking' && <p role="status">{t('checkingLink')}</p>}
          {link === 'invalid' && (
            <div role="alert" className="space-y-2">
              <p>{t('invalidLink')}</p>
              <LocaleLink href="/forgot-password" className="font-semibold underline">{t('requestNewLink')}</LocaleLink>
            </div>
          )}
          {(link === 'otp' || link === 'legacy') && <form onSubmit={handleSubmit} className="space-y-4">
            {link === 'otp' && !verified && (
              <div className="space-y-4">
                <p>{t('codeInstructions')}</p>
                <div>
                  <label htmlFor="recovery-email" className="block text-sm font-bold mb-2">{t('emailLabel')}</label>
                  <input id="recovery-email" type="email" autoComplete="email" value={email}
                    onChange={event => setEmail(event.target.value)} required disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-300" />
                </div>
                <div>
                  <label htmlFor="recovery-code" className="block text-sm font-bold mb-2">{t('codeLabel')}</label>
                  <input id="recovery-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={event => setCode(event.target.value)}
                    required disabled={loading} className="w-full px-4 py-3 border-2 border-gray-300" />
                </div>
                <LocaleLink href="/forgot-password" className="text-sm underline">{t('requestNewLink')}</LocaleLink>
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2">
                {t('passwordLabel')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={t('placeholder.password')}
                disabled={loading || success}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">
                {t('confirmPasswordLabel')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={t('placeholder.confirmPassword')}
                disabled={loading || success}
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="mose-button mose-button--primary w-full disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>}

          <div className="mt-6 text-center">
            <LocaleLink
              href="/login"
              className="text-brand-primary hover:underline font-semibold"
            >
              {t('backToLogin')}
            </LocaleLink>
          </div>
        </div>
      </div>
    </div>
  )
}
