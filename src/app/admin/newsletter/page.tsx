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

  // Fetch initial subscribers and stats
  const { data: subscribers, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching subscribers:', error)
  }

  // Calculate stats
  const { count: totalCount } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

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
      ? ((unsubscribedCount || 0) / (totalCount + (unsubscribedCount || 0)) * 100).toFixed(1) 
      : '0.0',
  }

  return (
    <NewsletterAdminClient 
      initialSubscribers={subscribers || []} 
      initialStats={stats}
    />
  )
}








