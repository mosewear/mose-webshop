import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import ToestemmingClient from './ToestemmingClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'toestemming' })
  // Persoonlijke link uit een mail; hoort niet in zoekresultaten.
  return { title: t('metaTitel'), robots: { index: false, follow: false } }
}

export default function ToestemmingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ToestemmingClient />
    </Suspense>
  )
}
