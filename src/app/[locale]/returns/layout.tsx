import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.pages.returns' })
  return { title: t('title') }
}

export default function ReturnsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
