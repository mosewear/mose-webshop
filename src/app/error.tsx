'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
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

        {/* Error Message */}
        <div className="bg-white border-2 border-black p-8 md:p-10">
          <h1 className="text-4xl md:text-5xl font-display mb-4">
            Oeps!
          </h1>
          <p className="text-gray-700 mb-6 text-lg">
            Er is iets misgegaan. Geen zorgen, we zijn er mee bezig.
          </p>

          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-left">
              <p className="text-sm font-mono text-red-800 break-words">
                {error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              Probeer opnieuw
            </button>
            <Link
              href="/"
              className="block w-full py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Naar home
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-sm text-gray-600">
          Blijft dit probleem bestaan?{' '}
          <Link href="/contact" className="text-brand-primary hover:underline font-semibold">
            Neem contact op
          </Link>
        </p>
      </div>
    </div>
  )
}


