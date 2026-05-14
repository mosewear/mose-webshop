import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsletterAdminClient from './NewsletterAdminClient'

export const metadata = {
  title: 'Nieuwsbrief Subscribers | MOSE Admin',
  description: 'Beheer nieuwsbrief subscribers',
}

export default async function NewsletterAdminPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/admin/login')
  }

  // Stats only; subscriber list loads client-side via /api/newsletter/subscribers (pagination).
  const { count: totalCount, error: totalCountError } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })

  if (totalCountError) {
    console.error('Error counting subscribers:', totalCountError)
  }

  // Calculate stats
  const { count: activeCount } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: unsubscribedCount } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unsubscribed')

  // This month subscribers
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: thisMonthCount } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('subscribed_at', startOfMonth.toISOString())

  const stats = {
    total: activeCount || 0,
    thisMonth: thisMonthCount || 0,
    unsubscribed: unsubscribedCount || 0,
    unsubRate: totalCount && totalCount > 0 
      ? ((unsubscribedCount || 0) / totalCount * 100).toFixed(1) 
      : '0.0',
  }

  return (
    <NewsletterAdminClient
      initialStats={stats}
      totalSubscriberRows={totalCount ?? 0}
    />
  )
}








