/**
 * Brevo-koppeling voor de nieuwsbrief.
 *
 * Rolverdeling, bewust zo gekozen:
 *   Postmark  transactioneel (bestelling, verzending, retour, accountmails)
 *   Brevo     nieuwsbrief en campagnes
 *
 * Deze module synchroniseert alleen contacten. Er gaat geen enkele mail via
 * Brevo vanuit de code; campagnes maak je in Brevo zelf. De cijfers daarvan
 * leest brevo-campagnes.ts terug voor de admin.
 *
 * Alles hier faalt stil. Een inschrijving op mosewear.com mag nooit stuklopen
 * omdat Brevo even onbereikbaar is: de eigen tabel blijft leidend en een
 * mislukte synchronisatie wordt gelogd, niet doorgegeven aan de bezoeker.
 */

import { createServiceClient } from '@/lib/supabase/service'

const BASIS = 'https://api.brevo.com/v3'

/** Contacten die we nooit wegschrijven, ongeacht wat er binnenkomt. */
const VERBODEN_PATROON = /^(postmaster|abuse|spam|noreply|no-reply)@/i

export function isBrevoGeconfigureerd(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim())
}

/** Lijst-id waar nieuwe inschrijvingen in belanden. */
export function brevoLijstId(): number | null {
  const ruw = process.env.BREVO_LIST_ID?.trim()
  if (!ruw) return null
  const n = Number.parseInt(ruw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

interface BrevoAntwoord<T = unknown> {
  ok: boolean
  status: number
  data?: T
  fout?: string
}

export async function roep<T = unknown>(
  pad: string,
  opties: { methode?: string; body?: unknown } = {}
): Promise<BrevoAntwoord<T>> {
  const sleutel = process.env.BREVO_API_KEY?.trim()
  if (!sleutel) return { ok: false, status: 0, fout: 'BREVO_API_KEY ontbreekt' }

  try {
    const res = await fetch(`${BASIS}${pad}`, {
      method: opties.methode || 'GET',
      headers: {
        'api-key': sleutel,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: opties.body ? JSON.stringify(opties.body) : undefined,
    })

    // 204 heeft geen body, dat is bij Brevo de normale uitkomst van een update.
    if (res.status === 204) return { ok: true, status: 204 }

    const tekst = await res.text()
    let data: unknown
    try {
      data = tekst ? JSON.parse(tekst) : undefined
    } catch {
      data = tekst
    }

    if (!res.ok) {
      const melding =
        (data as { message?: string } | undefined)?.message || tekst.slice(0, 200)
      return { ok: false, status: res.status, fout: melding, data: data as T }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      fout: err instanceof Error ? err.message : 'onbekende netwerkfout',
    }
  }
}

export interface ContactGegevens {
  email: string
  locale?: string | null
  source?: string | null
  voornaam?: string | null
}

/**
 * Zet een contact in Brevo, of werkt het bij als het al bestaat.
 *
 * `updateEnabled` laat Brevo zelf beslissen tussen aanmaken en bijwerken, wat
 * een extra ronde scheelt en meteen de race wegneemt tussen twee gelijktijdige
 * inschrijvingen van hetzelfde adres.
 */
export async function zetContact(
  contact: ContactGegevens
): Promise<{ ok: boolean; fout?: string }> {
  const email = contact.email.trim().toLowerCase()
  if (!email || VERBODEN_PATROON.test(email)) {
    return { ok: false, fout: 'adres overgeslagen' }
  }

  const lijst = brevoLijstId()
  const klant = await klantgegevens(email).catch(() => null)
  const res = await roep('/contacts', {
    methode: 'POST',
    body: {
      email,
      updateEnabled: true,
      listIds: lijst ? [lijst] : undefined,
      attributes: {
        TAAL: (contact.locale || 'nl').toUpperCase(),
        BRON: contact.source || 'onbekend',
        ...(contact.voornaam ? { VOORNAAM: contact.voornaam } : {}),
        ...(klant || {}),
      },
    },
  })

  if (!res.ok) {
    console.error(`[Brevo] Contact ${email} niet weggeschreven: ${res.fout}`)
    return { ok: false, fout: res.fout }
  }
  return { ok: true }
}

/**
 * Markeer een contact als uitgeschreven.
 *
 * Bewust `emailBlacklisted` en geen verwijdering: zo blijft de uitschrijving
 * bewaard en kan het adres niet per ongeluk terugkomen via een latere import.
 */
export async function schrijfContactUit(
  email: string
): Promise<{ ok: boolean; fout?: string }> {
  const adres = email.trim().toLowerCase()
  if (!adres) return { ok: false, fout: 'leeg adres' }

  const res = await roep(`/contacts/${encodeURIComponent(adres)}`, {
    methode: 'PUT',
    body: { emailBlacklisted: true },
  })

  // Onbekend bij Brevo telt als geslaagd: het doel is dat hij geen mail krijgt.
  if (!res.ok && res.status !== 404) {
    console.error(`[Brevo] Uitschrijving ${adres} mislukt: ${res.fout}`)
    return { ok: false, fout: res.fout }
  }
  return { ok: true }
}

/**
 * Zet een bestaand contact in een extra lijst. Gebruikt door de
 * toestemmingsronde om bevestigde adressen apart te verzamelen.
 */
export async function voegToeAanLijst(
  email: string,
  lijstId: number
): Promise<{ ok: boolean; fout?: string }> {
  const adres = email.trim().toLowerCase()
  if (!adres || !lijstId) return { ok: false, fout: 'adres of lijst ontbreekt' }

  // Eerst zeker weten dat het contact bestaat en niet geblokkeerd staat: wie
  // zelf op "ja" klikt, mag een eerdere blokkade opheffen.
  const zet = await roep('/contacts', {
    methode: 'POST',
    body: { email: adres, updateEnabled: true, emailBlacklisted: false, listIds: [lijstId] },
  })
  if (!zet.ok) {
    console.error(`[Brevo] ${adres} niet in lijst ${lijstId}: ${zet.fout}`)
    return { ok: false, fout: zet.fout }
  }
  return { ok: true }
}

/**
 * Bestaande contacten in bulk aan een lijst toevoegen (per 150, de grens van
 * Brevo). Gebruikt door de toestemmingsronde: wie de mail kreeg en zich niet
 * afmeldde, hoort op de opgeschoonde lijst. Geblokkeerde contacten blijven
 * geblokkeerd; toevoegen heft dat niet op.
 */
export async function voegToeAanLijstBulk(
  emails: string[],
  lijstId: number
): Promise<{ toegevoegd: number; fout?: string }> {
  let toegevoegd = 0
  for (let i = 0; i < emails.length; i += 150) {
    const deel = emails.slice(i, i + 150)
    const res = await roep<{ contacts?: { success?: string[] } }>(`/contacts/lists/${lijstId}/contacts/add`, {
      methode: 'POST',
      body: { emails: deel },
    })
    if (!res.ok) {
      console.error(`[Brevo] Bulk toevoegen aan lijst ${lijstId} mislukt: ${res.fout}`)
      return { toegevoegd, fout: res.fout }
    }
    toegevoegd += res.data?.contacts?.success?.length ?? 0
  }
  return { toegevoegd }
}

/** Haalt de lijsten op, zodat de admin kan tonen waar contacten belanden. */
export async function haalLijsten(): Promise<
  { ok: boolean; lijsten?: Array<{ id: number; name: string; aantal: number }>; fout?: string }
> {
  const res = await roep<{
    lists?: Array<{ id: number; name: string; totalSubscribers?: number }>
  }>('/contacts/lists?limit=50')
  if (!res.ok) return { ok: false, fout: res.fout }
  return {
    ok: true,
    lijsten: (res.data?.lists || []).map((l) => ({
      id: l.id,
      name: l.name,
      aantal: l.totalSubscribers ?? 0,
    })),
  }
}

/** Controleert sleutel en lijst in één keer, voor de admin en voor scripts. */
export async function controleerKoppeling(): Promise<{
  ok: boolean
  account?: string
  lijstNaam?: string
  fout?: string
}> {
  if (!isBrevoGeconfigureerd()) return { ok: false, fout: 'BREVO_API_KEY ontbreekt' }

  const account = await roep<{ companyName?: string; email?: string }>('/account')
  if (!account.ok) return { ok: false, fout: account.fout }

  const lijstId = brevoLijstId()
  let lijstNaam: string | undefined
  if (lijstId) {
    const lijst = await roep<{ name?: string }>(`/contacts/lists/${lijstId}`)
    if (!lijst.ok) {
      return { ok: false, fout: `lijst ${lijstId} niet gevonden: ${lijst.fout}` }
    }
    lijstNaam = lijst.data?.name
  }

  return {
    ok: true,
    account: account.data?.companyName || account.data?.email,
    lijstNaam,
  }
}

// ─── Klantgegevens ─────────────────────────────────────────────────────────
//
// Drie velden op elk contact, zodat je in Brevo kunt segmenteren: kopers
// anders mailen dan niet-kopers, of wie net iets kocht een week overslaan.
//   KLANT               ja of nee
//   AANTAL_ORDERS       betaalde orders (ook als er later iets terugging)
//   LAATSTE_BESTELLING  datum van de laatste betaalde order
// Bijgewerkt bij elke betaalde order (fulfill-paid-order), bij elke nieuwe
// inschrijving (zetContact) en elke nacht voor de hele lijst
// (/api/cron/brevo-klanten), wat ook nieuwe contacten en gemiste updates
// rechtzet.

export interface Klantgegevens {
  KLANT: boolean
  AANTAL_ORDERS: number
  LAATSTE_BESTELLING?: string
}

const GEEN_KLANT: Klantgegevens = { KLANT: false, AANTAL_ORDERS: 0 }

/** Alle kopers met hun gegevens, op kleine letters. */
async function alleKlanten(): Promise<Map<string, Klantgegevens>> {
  const db = createServiceClient()
  const klanten = new Map<string, Klantgegevens>()
  for (let van = 0; ; van += 1000) {
    const { data, error } = await db
      .from('orders')
      .select('email, created_at')
      .in('payment_status', ['paid', 'refunded'])
      .order('created_at')
      .range(van, van + 999)
    if (error) throw new Error(`orders lezen: ${error.message}`)
    for (const o of data || []) {
      const email = (o.email || '').trim().toLowerCase()
      if (!email) continue
      const k = klanten.get(email) || { KLANT: true, AANTAL_ORDERS: 0 }
      k.AANTAL_ORDERS++
      // Oplopend gesorteerd, dus de laatste die langskomt is de nieuwste.
      k.LAATSTE_BESTELLING = new Date(o.created_at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
      klanten.set(email, k)
    }
    if (!data || data.length < 1000) break
  }
  return klanten
}

export async function klantgegevens(email: string): Promise<Klantgegevens> {
  const klanten = await alleKlanten()
  return klanten.get(email.trim().toLowerCase()) || GEEN_KLANT
}

/** Na een betaalde order. Bestaat het contact niet in Brevo, dan gebeurt er niets. */
export async function werkKlantgegevensBij(email: string): Promise<void> {
  const adres = email.trim().toLowerCase()
  if (!adres || !isBrevoGeconfigureerd()) return
  const res = await roep(`/contacts/${encodeURIComponent(adres)}`, {
    methode: 'PUT',
    body: { attributes: await klantgegevens(adres) },
  })
  if (!res.ok && res.status !== 404) console.error(`[Brevo] Klantgegevens ${adres} niet bijgewerkt: ${res.fout}`)
}

/** Zet de klantgegevens op ieder contact in de nieuwsbrieflijst. */
export async function synchroniseerKlantgegevens(): Promise<{ contacten: number; klanten: number; mislukt: number }> {
  const lijst = brevoLijstId()
  if (!lijst) throw new Error('BREVO_LIST_ID ontbreekt')
  const klanten = await alleKlanten()

  const contacten: Array<{ email: string; attributes?: Record<string, unknown> }> = []
  for (let offset = 0; ; offset += 500) {
    const res = await roep<{ contacts?: Array<{ email: string; attributes?: Record<string, unknown> }> }>(
      `/contacts/lists/${lijst}/contacts?limit=500&offset=${offset}`,
    )
    if (!res.ok) throw new Error(`lijst lezen: ${res.fout}`)
    const deel = res.data?.contacts || []
    contacten.push(...deel)
    if (deel.length < 500) break
  }

  // Alleen versturen wat afwijkt; meestal is dat een handvol.
  const updates = contacten
    .map((c) => {
      const email = c.email.toLowerCase()
      const nieuw = klanten.get(email) || GEEN_KLANT
      const oud = c.attributes || {}
      const gelijk =
        oud.KLANT === nieuw.KLANT &&
        Number(oud.AANTAL_ORDERS ?? -1) === nieuw.AANTAL_ORDERS &&
        String(oud.LAATSTE_BESTELLING ?? '').slice(0, 10) === (nieuw.LAATSTE_BESTELLING ?? '')
      return gelijk ? null : { email, attributes: nieuw }
    })
    .filter((u): u is { email: string; attributes: Klantgegevens } => u !== null)

  let mislukt = 0
  for (let i = 0; i < updates.length; i += 100) {
    const res = await roep('/contacts/batch', { methode: 'POST', body: { contacts: updates.slice(i, i + 100) } })
    if (!res.ok) {
      mislukt += Math.min(100, updates.length - i)
      console.error(`[Brevo] Klantgegevens batch ${i / 100 + 1} mislukt: ${res.fout}`)
    }
  }
  const klantenOpLijst = contacten.filter((c) => klanten.has(c.email.toLowerCase())).length
  return { contacten: updates.length, klanten: klantenOpLijst, mislukt }
}
