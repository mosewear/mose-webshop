import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'trackOrder' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function TrackOrderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (routing.locales.includes(locale as (typeof routing.locales)[number])) {
    setRequestLocale(locale)
  }
  return children
}
