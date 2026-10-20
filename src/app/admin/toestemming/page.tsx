import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToestemmingAdmin from './ToestemmingAdmin'

export const metadata = { title: 'Toestemmingsronde | MOSE Admin' }

export default async function Pagina() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return <ToestemmingAdmin />
}
