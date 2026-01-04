'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
          throw new Error('Wachtwoorden komen niet overeen')
        }

        if (form.password.length < 6) {
          throw new Error('Wachtwoord moet minimaal 6 karakters zijn')
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
        alert('Account aangemaakt! Check je email voor verificatie.')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Er is iets misgegaan')
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
            {isLogin ? 'INLOGGEN' : 'ACCOUNT AANMAKEN'}
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Welkom terug!' : 'Word onderdeel van MOSE'}
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
                  Naam *
                </label>
                <input
                  type="text"
                  id="name"
                  required={!isLogin}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Je naam"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-2">
                E-mail *
              </label>
              <input
                type="email"
                id="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2">
                Wachtwoord *
              </label>
              <input
                type="password"
                id="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Minimaal 6 karakters"
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">
                  Bevestig wachtwoord *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  required={!isLogin}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Herhaal je wachtwoord"
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'BEZIG...' : isLogin ? 'INLOGGEN' : 'ACCOUNT AANMAKEN'}
            </button>
          </form>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-brand-primary hover:underline font-semibold text-sm"
              >
                Wachtwoord vergeten?
              </Link>
            </div>
          )}

          {/* Toggle */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 text-center">
            <p className="text-gray-600">
              {isLogin ? 'Nog geen account?' : 'Al een account?'}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setForm({ email: '', password: '', confirmPassword: '', name: '' })
              }}
              className="text-brand-primary hover:underline font-bold mt-2"
            >
              {isLogin ? 'Account aanmaken' : 'Inloggen'}
            </button>
          </div>
        </div>

        {/* Back to shop */}
        <div className="mt-6 text-center">
          <Link href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
            ← Terug naar shop
          </Link>
        </div>
      </div>
    </div>
  )
}


