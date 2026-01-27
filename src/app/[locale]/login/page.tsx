'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const locale = useLocale()
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const localeLink = (path: string) => `/${locale}${path}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })

        if (error) throw error

        // Redirect to account page
        router.push('/account')
      } else {
        // Register
        if (form.password !== form.confirmPassword) {
          throw new Error(t('errors.passwordMismatch'))
        }

        if (form.password.length < 6) {
          throw new Error(t('errors.passwordTooShort'))
        }

        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
            },
          },
        })

        if (error) throw error

        // Show success message
        toast.success(t('register.success'))
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display mb-4">
            {isLogin ? t('login.title') : t('register.title')}
          </h1>
          <p className="text-gray-600">
            {isLogin ? t('login.welcome') : t('register.welcome')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-bold mb-2">
                  {t('register.nameLabel')}
                </label>
                <input
                  type="text"
                  id="name"
                  required={!isLogin}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder={t('register.placeholder.name')}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-2">
                {t('login.emailLabel')}
              </label>
              <input
                type="email"
                id="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={t('login.placeholder.email')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2">
                {t('login.passwordLabel')}
              </label>
              <input
                type="password"
                id="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={t('login.placeholder.password')}
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">
                  {t('register.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  required={!isLogin}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder={t('register.placeholder.confirmPassword')}
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (isLogin ? t('login.submitting') : t('register.submitting')) : (isLogin ? t('login.submit') : t('register.submit'))}
            </button>
          </form>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="mt-4 text-center">
              <LocaleLink
                href="/forgot-password"
                className="text-brand-primary hover:underline font-semibold text-sm"
              >
                {t('login.forgot')}
              </LocaleLink>
            </div>
          )}

          {/* Toggle */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 text-center">
            <p className="text-gray-600">
              {isLogin ? t('login.noAccount') : t('login.hasAccount')}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setForm({ email: '', password: '', confirmPassword: '', name: '' })
              }}
              className="text-brand-primary hover:underline font-bold mt-2"
            >
              {isLogin ? t('login.register') : t('login.titleAlt')}
            </button>
          </div>
        </div>

        {/* Back to shop */}
        <div className="mt-6 text-center">
          <LocaleLink href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
            {t('login.backToShop')}
          </LocaleLink>
        </div>
      </div>
    </div>
  )
}
