import type { Metadata } from "next";
import { Anton, Montserrat } from 'next/font/google'
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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

export const metadata: Metadata = {
  title: "MOSE - Geen poespas. Wel karakter.",
  description: "Lokaal gemaakte premium basics. Kleding zonder concessies, gebouwd om lang mee te gaan.",
  keywords: ["MOSE", "streetwear", "Nederlandse kleding", "Groningen", "premium basics", "lokaal gemaakt"],
  authors: [{ name: "MOSE" }],
  openGraph: {
    title: "MOSE - Geen poespas. Wel karakter.",
    description: "Lokaal gemaakte premium basics uit Groningen",
    type: "website",
    locale: "nl_NL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${anton.variable} ${montserrat.variable}`}>
      <body className="antialiased font-sans">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
