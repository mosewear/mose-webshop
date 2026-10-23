/**
 * Brevo-koppeling voor de nieuwsbrief.
 *
 * Rolverdeling, bewust zo gekozen:
 *   Postmark  transactioneel (bestelling, verzending, retour, accountmails)
 *   Brevo     nieuwsbrief en campagnes
 *
 * Deze module synchroniseert alleen contacten. Er gaat geen enkele mail via
 * Brevo vanuit de code; campagnes maak je in Brevo zelf.
 *
 * Alles hier faalt stil. Een inschrijving op mosewear.com mag nooit stuklopen
 * omdat Brevo even onbereikbaar is: de eigen tabel blijft leidend en een
 * mislukte synchronisatie wordt gelogd, niet doorgegeven aan de bezoeker.
 */

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

async function roep<T = unknown>(
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
