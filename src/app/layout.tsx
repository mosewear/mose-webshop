import type { Metadata, Viewport } from "next";
import { Anton, Montserrat } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
import { PostHogProvider } from './providers'
import { getSiteSettings } from '@/lib/settings'
import "./globals.css";

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

// Revalidate layout every 60 seconds to pick up settings changes
export const revalidate = 60

// Force dynamic rendering to ensure favicon updates are picked up
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  console.log('🎯 [LAYOUT] generateMetadata called')
  
  // Use static favicon files from /public folder
  // This ensures consistent branding with the new MOSE logo
  const timestamp = Date.now()

  return {
    title: {
      default: "MOSE - Kleding en accessoires voor mannen",
      template: "%s - MOSE"
    },
    description: "Tijdloze basics zonder gedoe. MOSE maakt premium hoodies, t-shirts en accessoires voor mannen die kwaliteit waarderen. Lokaal geproduceerd in Groningen. Gratis verzending vanaf €75.",
    keywords: ["MOSE", "mannenkleding", "premium basics", "hoodies", "t-shirts", "Groningen", "lokaal gemaakt", "Nederlands merk", "duurzame kleding", "mannenmode", "streetwear", "minimalistisch", "tijdloos"],
    authors: [{ name: "MOSE", url: "https://mosewear.com" }],
    creator: "MOSE",
    publisher: "MOSE",
    metadataBase: new URL('https://mosewear.com'),
    alternates: {
      canonical: '/',
    },
    icons: {
      icon: [
        { url: `/favicon.ico?v=${timestamp}`, sizes: 'any' },
        { url: `/favicon-16x16.png?v=${timestamp}`, sizes: '16x16', type: 'image/png' },
        { url: `/favicon-32x32.png?v=${timestamp}`, sizes: '32x32', type: 'image/png' },
      ],
      shortcut: `/favicon.ico?v=${timestamp}`,
      apple: [
        { url: `/apple-touch-icon.png?v=${timestamp}`, sizes: '180x180', type: 'image/png' },
      ],
    },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://mosewear.com",
    title: "MOSE - Kleding en accessoires voor mannen",
    description: "Tijdloze basics zonder gedoe. Premium hoodies, t-shirts en accessoires voor mannen. Lokaal gemaakt in Groningen. Gratis verzending vanaf €75.",
    siteName: "MOSE",
    images: [
      {
        url: "/logomose.png",
        width: 1200,
        height: 630,
        alt: "MOSE - Premium Basics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MOSE - Kleding en accessoires voor mannen",
    description: "Tijdloze basics zonder gedoe. Lokaal gemaakt in Groningen.",
    images: ["/logomose.png"],
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
  verification: {
    // google: 'your-google-site-verification-code',
  },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${anton.variable} ${montserrat.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Set lang attribute dynamically based on URL */}
        <Script
          id="set-lang"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const path = window.location.pathname;
                const locale = path.split('/')[1];
                if (locale === 'en' || locale === 'nl') {
                  document.documentElement.lang = locale;
                } else {
                  document.documentElement.lang = 'nl';
                }
              })();
            `,
          }}
        />
        {/* Facebook Pixel - Only load after consent */}
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Wait for cookie consent before initializing
              function initFacebookPixel() {
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '1447430483627328');
                fbq('track', 'PageView');
                console.log('🎯 Facebook Pixel initialized');
              }
              
              // Check if consent already given
              if (typeof window !== 'undefined') {
                const consent = localStorage.getItem('mose_cookie_consent');
                if (consent === 'all') {
                  initFacebookPixel();
                } else {
                  // Listen for consent event
                  window.addEventListener('mose-tracking-enabled', initFacebookPixel);
                }
              }
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1447430483627328&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="antialiased font-sans">
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#000',
              color: '#fff',
              border: '2px solid #000',
              borderRadius: '0',
              padding: '16px 20px',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                background: '#000',
                color: '#10b981',
                border: '2px solid #10b981',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                background: '#000',
                color: '#ef4444',
                border: '2px solid #ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
