import { redirect } from 'next/navigation'

/** De toestemmingsronde staat nu in het e-mailmarketingoverzicht. */
export default function Pagina() {
  redirect('/admin/email-marketing#toestemming')
}
