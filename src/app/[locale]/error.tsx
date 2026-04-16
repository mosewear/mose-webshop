'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('error')

  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
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

        <div className="border-4 border-black p-8 md:p-12">
          <h1 className="text-5xl md:text-7xl font-display tracking-tight mb-4">
            Oeps!
          </h1>
          <div className="h-1 w-20 bg-brand-primary mx-auto mb-6" />
          <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed">
            {t('description')}
          </p>

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              {t('tryAgain')}
            </button>
            <Link
              href="/shop"
              className="block w-full py-4 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              {t('toShop')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
