'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Login failed')
      }

      // Check if user is an admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (adminError || !adminUser) {
        await supabase.auth.signOut()
        throw new Error('Je hebt geen admin toegang')
      }

      // Redirect to admin dashboard
      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Login mislukt. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logomose.png"
            alt="MOSE"
            width={180}
            height={60}
            className="h-14 w-auto mx-auto filter invert mb-4"
          />
          <h1 className="text-2xl font-display text-white uppercase tracking-tight">
            Admin Login
          </h1>
          <p className="text-gray-400 mt-2">Log in met je admin account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/20 border-2 border-red-600 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 text-white focus:outline-none focus:border-brand-primary transition-colors"
              placeholder="admin@mosewear.nl"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 text-white focus:outline-none focus:border-brand-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Bezig met inloggen...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Inloggen
              </>
            )}
          </button>
        </form>

        {/* Back to Site */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Terug naar website
          </a>
        </div>
      </div>
    </div>
  )
}

