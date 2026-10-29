import { redirect } from '@/i18n/routing'

// Old campaign links now lead to the current brand story.
export default async function SpringDropVerhaalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect({ href: '/over-mose', locale })
}
