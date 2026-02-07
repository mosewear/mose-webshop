import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import MainContentWrapper from '@/components/layout/MainContentWrapper'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import NewsletterPopupWrapper from '@/components/NewsletterPopupWrapper'
import CookieConsent from '@/components/CookieConsent'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: {
      default: t('title'),
      template: '%s - MOSE'
    },
    description: t('description'),
    keywords: t('keywords').split(', '),
    authors: [{ name: 'MOSE', url: 'https://mosewear.com' }],
    creator: 'MOSE',
    publisher: 'MOSE',
    metadataBase: new URL('https://mosewear.com'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'nl': 'https://mosewear.com/nl',
        'en': 'https://mosewear.com/en',
      }
    },
    openGraph: {
      type: 'website',
      locale: locale === 'nl' ? 'nl_NL' : 'en_GB',
      url: `https://mosewear.com/${locale}`,
      title: t('title'),
      description: t('description'),
      siteName: 'MOSE',
      images: [
        {
          url: '/logomose.png',
          width: 1200,
          height: 630,
          alt: 'MOSE - Premium Basics',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/logomose.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <AnnouncementBanner />
      <Header />
      <MainContentWrapper>{children}</MainContentWrapper>
      <Footer />
      <NewsletterPopupWrapper />
      <CookieConsent />
    </NextIntlClientProvider>
  )
}

