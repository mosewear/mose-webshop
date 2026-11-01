import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
export default async function UnknownPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  setRequestLocale(locale)
  notFound()
}
