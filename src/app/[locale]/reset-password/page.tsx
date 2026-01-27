'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const t = useTranslations('auth.resetPassword')
  const tErrors = useTranslations('auth.errors')
  const locale = useLocale()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if user has a valid session (from password reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Redirect to login if no session
        router.push('/login?error=invalid_session')
      }
    }
    checkSession()
  }, [router, supabase, locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?password_reset=success')
      }, 3000)
    } catch (err: any) {
      setError(err.message || tErrors('somethingWrong'))
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
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{t('title')}</h1>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2">
                {t('passwordLabel')}
              </label>
              <input
                type="password"
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
              className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

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
