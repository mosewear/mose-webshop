import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmailMarketingAdmin from './EmailMarketingAdmin'

export const metadata = { title: 'E-mailmarketing | MOSE Admin' }

export default async function Pagina() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return <EmailMarketingAdmin />
}
