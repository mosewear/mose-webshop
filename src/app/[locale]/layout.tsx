import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import { routing } from '@/i18n/routing'
import { getCommercePromises, formatPromiseAmount } from '@/lib/settings-server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import MainContentWrapper from '@/components/layout/MainContentWrapper'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { BuitenAfrekenen, AfrekenKop } from '@/components/AfrekenChrome'
import NewsletterPopupWrapper from '@/components/NewsletterPopupWrapper'
import SurveyPopupWrapper from '@/components/SurveyPopupWrapper'
import CookieConsent from '@/components/CookieConsent'
import ChatButtonWrapper from '@/components/ChatButtonWrapper'
import PaginaWeergaveMeter from '@/components/PaginaWeergaveMeter'
import CampaignPopupWrapper from '@/components/campaign/CampaignPopupWrapper'
import CampaignAutoApply from '@/components/campaign/CampaignAutoApply'
import CampaignThemeProvider from '@/components/campaign/CampaignThemeProvider'
import {
  getActiveMarketingCampaign,
  sanitizeHexColor,
} from '@/lib/marketing-campaign'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'metadata' })
  // De meta-description beloofde hardgecodeerd "gratis verzending vanaf €75",
  // terwijl free_shipping_threshold in site_settings op 150 staat. Een snippet
  // dat een gunstiger drempel belooft dan de checkout hanteert, kost orders.
  const { free_shipping_threshold } = await getCommercePromises()
  const threshold = formatPromiseAmount(free_shipping_threshold, locale)

  return {
    title: {
      default: t('title'),
      template: '%s - MOSE'
    },
    description: t('description', { threshold }),
    keywords: t('keywords').split(', '),
    authors: [{ name: 'MOSE', url: 'https://www.mosewear.com' }],
    creator: 'MOSE',
    publisher: 'MOSE',
    metadataBase: new URL('https://www.mosewear.com'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'nl': 'https://www.mosewear.com/nl',
        'en': 'https://www.mosewear.com/en',
      }
    },
    openGraph: {
      type: 'website',
      locale: locale === 'nl' ? 'nl_NL' : 'en_GB',
      url: `https://www.mosewear.com/${locale}`,
      title: t('title'),
      description: t('description', { threshold }),
      siteName: 'MOSE',
      images: [
        {
          url: '/og-default.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSE - Premium Basics',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description', { threshold }),
      images: ['/og-default.jpg'],
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

  // Enable static rendering voor deze locale (next-intl v4):
  // zonder deze call valt getMessages/getTranslations terug op headers()
  // wat statische/ISR rendering breekt met DYNAMIC_SERVER_USAGE.
  setRequestLocale(locale)

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  // Pre-resolve the active campaign so we can inject its theme color as
  // a CSS variable on the server (no flash of wrong theme).
  const resolved = await getActiveMarketingCampaign()
  const campaignThemeColor = resolved
    ? sanitizeHexColor(resolved.campaign.theme_color)
    : null

  return (
    <NextIntlClientProvider messages={messages}>
      <CampaignThemeProvider color={campaignThemeColor} />
      <CampaignAutoApply />
      {/* Op het afrekenscherm vervangt een kale kop de volledige navigatie,
          en blijven de voettekst en de popups weg. Zie AfrekenChrome. */}
      <BuitenAfrekenen>
        <AnnouncementBanner />
        <Header />
      </BuitenAfrekenen>
      <AfrekenKop />
      <MainContentWrapper>{children}</MainContentWrapper>
      <BuitenAfrekenen>
        <Footer />
        <CampaignPopupWrapper />
        <NewsletterPopupWrapper />
        <SurveyPopupWrapper />
      </BuitenAfrekenen>
      <CookieConsent />
      <ChatButtonWrapper />
      <PaginaWeergaveMeter />
    </NextIntlClientProvider>
  )
}

