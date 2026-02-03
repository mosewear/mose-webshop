import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import EarlyAccessClient from './EarlyAccessClient'

type Props = {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props) {
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

export default function EarlyAccessPage({ params: { locale } }: Props) {
  unstable_setRequestLocale(locale)
  
  return <EarlyAccessClient />
}

