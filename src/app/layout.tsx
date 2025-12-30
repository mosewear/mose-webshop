import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="nl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
