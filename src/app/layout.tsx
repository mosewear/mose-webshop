import type { Metadata } from 'next'
import './globals.css'

// The document belongs to each route layout, where its locale is a static
// route parameter. Reading request headers here breaks product ISR.
export const metadata: Metadata = {
  title: 'MOSE',
  metadataBase: new URL('https://www.mosewear.com'),
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
