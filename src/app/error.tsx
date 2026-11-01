'use client'

import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] === 'en' ? 'en' : 'nl'
  const en = locale === 'en'
  useEffect(() => {
    // Log error to console for debugging
    console.error('Application error:', error)
  }, [error])

  return (
    <html lang={locale}><body>
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Link href={`/${locale}`} className="inline-block">
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
            {en ? 'Something went wrong' : 'Er ging iets mis'}
          </h1>
          <p className="text-gray-700 mb-6 text-lg">
            {en ? 'Please try again. If the problem continues, contact Team MOSE.' : 'Probeer het opnieuw. Blijft het probleem bestaan? Neem contact op met Team MOSE.'}
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
              {en ? 'Try again' : 'Probeer opnieuw'}
            </button>
            <Link
              href={`/${locale}`}
              className="block w-full py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              {en ? 'Back to home' : 'Naar home'}
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-sm text-gray-600">
          {en ? 'Need help? ' : 'Hulp nodig? '}
          <Link href={`/${locale}/contact`} className="text-brand-primary hover:underline font-semibold">
            {en ? 'Contact us' : 'Neem contact op'}
          </Link>
        </p>
      </div>
    </main>
    </body></html>
  )
}


