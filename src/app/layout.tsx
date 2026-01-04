import type { Metadata, Viewport } from "next";
import { Anton, Montserrat } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
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

export const metadata: Metadata = {
  title: {
    default: "MOSE - Geen poespas. Wel karakter.",
    template: "%s | MOSE"
  },
  description: "Lokaal gemaakte premium basics uit Groningen. Kleding zonder concessies, gebouwd om lang mee te gaan. Voor stoere moderne mannen.",
  keywords: ["MOSE", "streetwear", "Nederlandse kleding", "Groningen", "premium basics", "lokaal gemaakt", "mannenmode", "duurzame kleding", "hoodies", "t-shirts"],
  authors: [{ name: "MOSE", url: "https://mosewear.com" }],
  creator: "MOSE",
  publisher: "MOSE",
  metadataBase: new URL('https://mosewear.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://mosewear.com",
    title: "MOSE - Geen poespas. Wel karakter.",
    description: "Lokaal gemaakte premium basics uit Groningen. Kleding zonder concessies.",
    siteName: "MOSE",
    images: [
      {
        url: "/logomose.png",
        width: 1200,
        height: 630,
        alt: "MOSE - Premium basics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MOSE - Geen poespas. Wel karakter.",
    description: "Lokaal gemaakte premium basics uit Groningen",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${anton.variable} ${montserrat.variable}`} data-scroll-behavior="smooth">
      <body className="antialiased font-sans">
        {children}
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
