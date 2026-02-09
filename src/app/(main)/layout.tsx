import type { Metadata } from "next";
import { Anton, Montserrat } from "next/font/google";
import Script from "next/script";
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
  title: "MOSE - Kleding en accessoires voor mannen",
  description: "Lokaal ontworpen, gebouwd om lang mee te gaan. Kleding zonder poespas. Wel karakter.",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Trustpilot JavaScript Integration - Always loaded for domain verification */}
      <Script
        id="trustpilot-integration"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,r,n){w.TrustpilotObject=n;w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
              a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;f=d.getElementsByTagName(s)[0];
              f.parentNode.insertBefore(a,f)})(window,document,'script', 'https://invitejs.trustpilot.com/tp.min.js', 'tp');
              tp('register', 'AAbEsaY7hRnD5xEZ');
          `,
        }}
      />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}




