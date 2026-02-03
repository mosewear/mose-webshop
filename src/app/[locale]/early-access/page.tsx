import { getTranslations } from 'next-intl/server'
import EarlyAccessClient from './EarlyAccessClient'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'earlyAccess.meta' })
  
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
    }
  }
}

export default async function EarlyAccessPage({ params }: Props) {
  const { locale } = await params
  
  return <EarlyAccessClient />
}

