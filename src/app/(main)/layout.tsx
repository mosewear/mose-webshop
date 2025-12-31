import type { Metadata } from "next";
import { Anton, Montserrat } from "next/font/google";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import "../globals.css";

const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOSE Wear - Minimalistisch & Stoer",
  description: "Lokaal ontworpen, gebouwd om lang mee te gaan. Kleding zonder poespas. Wel karakter.",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {/* Spacer for fixed header - matches Header h-20 */}
      <div className="h-20" />
      <main>{children}</main>
      <Footer />
    </>
  );
}


