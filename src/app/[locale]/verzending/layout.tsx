import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.pages.shipping' })
  return {
    title: t('title'),
    alternates: {
      canonical: `/${locale}/verzending`,
      languages: { nl: '/nl/verzending', en: '/en/verzending', 'x-default': '/nl/verzending' },
    },
    ...(t.has('description') ? { description: t('description') } : {}),
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
