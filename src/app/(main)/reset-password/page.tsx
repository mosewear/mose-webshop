'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
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
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 karakters lang zijn')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
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
      setError(err.message || 'Er ging iets mis')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={180}
              height={60}
              className="h-12 md:h-14 w-auto mx-auto"
              priority
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border-2 border-black p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">NIEUW WACHTWOORD</h1>
          <p className="text-gray-600 mb-6">
            Stel een nieuw wachtwoord in voor je account.
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-600 text-green-800">
              <strong>Wachtwoord bijgewerkt!</strong> Je wordt doorgestuurd naar de login pagina...
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
                Nieuw wachtwoord
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Minimaal 6 karakters"
                disabled={loading || success}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">
                Bevestig wachtwoord
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Herhaal je wachtwoord"
                disabled={loading || success}
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'OPSLAAN...' : 'WACHTWOORD OPSLAAN'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-brand-primary hover:underline font-semibold"
            >
              ← Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

