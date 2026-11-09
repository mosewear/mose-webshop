import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.pages.terms' })
  return {
    title: t('title'),
    alternates: {
      canonical: `/${locale}/algemene-voorwaarden`,
      languages: { nl: '/nl/algemene-voorwaarden', en: '/en/algemene-voorwaarden', 'x-default': '/nl/algemene-voorwaarden' },
    },
    ...(t.has('description') ? { description: t('description') } : {}),
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
