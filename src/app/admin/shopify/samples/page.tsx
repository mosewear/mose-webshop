import { requireAdmin } from '@/lib/supabase/admin'
import SampleForm from './sample-form'
export default async function SamplePage(){
 const auth=await requireAdmin(['admin'])
 if(!auth.authorized)return <p>Je hebt geen toegang tot deze private samplebestelling.</p>
 return <SampleForm/>
}
