import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  controleerKoppeling,
  haalLijsten,
  isBrevoGeconfigureerd,
  brevoLijstId,
} from '@/lib/brevo'

/**
 * Toont in één oogopslag of de Brevo-koppeling leeft en hoeveel contacten er
 * aan weerszijden staan. Bedoeld om na het instellen van de sleutel te
 * controleren, en later om te zien of beide kanten nog gelijk lopen.
 */
export async function GET() {
  const { authorized } = await requireAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  if (!isBrevoGeconfigureerd()) {
    return NextResponse.json({
      gekoppeld: false,
      reden: 'BREVO_API_KEY ontbreekt in de omgevingsvariabelen',
    })
  }

  const koppeling = await controleerKoppeling()
  if (!koppeling.ok) {
    return NextResponse.json({ gekoppeld: false, reden: koppeling.fout })
  }

  const supabase = createServiceRoleClient()
  const { count: actief } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  const { count: uitgeschreven } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unsubscribed')

  const lijsten = await haalLijsten()

  return NextResponse.json({
    gekoppeld: true,
    account: koppeling.account,
    lijstId: brevoLijstId(),
    lijstNaam: koppeling.lijstNaam,
    eigenDatabase: { actief: actief ?? 0, uitgeschreven: uitgeschreven ?? 0 },
    brevoLijsten: lijsten.lijsten || [],
  })
}
