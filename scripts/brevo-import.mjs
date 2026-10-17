/**
 * Zet de bestaande nieuwsbrieflijst in Brevo.
 *
 * Draaien:
 *   node scripts/brevo-import.mjs --proef          laat zien wat er zou gebeuren
 *   node scripts/brevo-import.mjs --alleen-optin   alleen de eigen aanmeldingen
 *   node scripts/brevo-import.mjs                  alles wat op actief staat
 *
 * Vereist in de omgeving: BREVO_API_KEY, BREVO_LIST_ID,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Waarom in porties en met pauzes: Brevo begrenst de API, en een nieuw account
 * dat in één klap duizenden contacten binnenkrijgt valt eerder op bij hun
 * controle. Een rustige import is zowel technisch als bestuurlijk veiliger.
 */

const PORTIE = 100
const PAUZE_MS = 1100
const EIGEN_BRONNEN = ['homepage', 'checkout', 'early_access', 'early_access_landing']

const argumenten = new Set(process.argv.slice(2))
const proef = argumenten.has('--proef')
const alleenOptin = argumenten.has('--alleen-optin')

const SLEUTEL = process.env.BREVO_API_KEY?.trim()
const LIJST = Number.parseInt(process.env.BREVO_LIST_ID || '', 10)
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SLEUTEL || !Number.isFinite(LIJST)) {
  console.error('BREVO_API_KEY of BREVO_LIST_ID ontbreekt.')
  process.exit(1)
}
if (!SB_URL || !SB_KEY) {
  console.error('Supabase-variabelen ontbreken.')
  process.exit(1)
}

const wacht = (ms) => new Promise((r) => setTimeout(r, ms))

/** Adressen die in mei al als ongeldig werden geweigerd, slaan we over. */
const GELDIG = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

async function haalAbonnees() {
  const uit = []
  let van = 0
  const stap = 1000
  for (;;) {
    const url = new URL(`${SB_URL}/rest/v1/newsletter_subscribers`)
    url.searchParams.set('select', 'email,locale,source,status')
    url.searchParams.set('status', 'eq.active')
    url.searchParams.set('order', 'subscribed_at.asc')
    const res = await fetch(url, {
      headers: {
        apikey: SB_KEY,
        authorization: `Bearer ${SB_KEY}`,
        range: `${van}-${van + stap - 1}`,
      },
    })
    if (!res.ok) throw new Error(`Supabase gaf ${res.status}: ${await res.text()}`)
    const rij = await res.json()
    uit.push(...rij)
    if (rij.length < stap) break
    van += stap
  }
  return uit
}

async function stuurPortie(contacten) {
  const res = await fetch('https://api.brevo.com/v3/contacts/import', {
    method: 'POST',
    headers: {
      'api-key': SLEUTEL,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      listIds: [LIJST],
      updateExistingContacts: true,
      emailBlacklist: false,
      smsBlacklist: false,
      jsonBody: contacten.map((c) => ({
        email: c.email.toLowerCase(),
        attributes: {
          TAAL: (c.locale || 'nl').toUpperCase(),
          BRON: c.source || 'onbekend',
        },
      })),
    }),
  })
  if (!res.ok) {
    return { ok: false, fout: `${res.status} ${(await res.text()).slice(0, 180)}` }
  }
  return { ok: true }
}

const alles = await haalAbonnees()
const gefilterd = alles
  .filter((c) => GELDIG.test(c.email || ''))
  .filter((c) => (alleenOptin ? EIGEN_BRONNEN.includes(c.source) : true))

const ongeldig = alles.length - alles.filter((c) => GELDIG.test(c.email || '')).length
const perBron = {}
for (const c of gefilterd) perBron[c.source || 'onbekend'] = (perBron[c.source || 'onbekend'] || 0) + 1

console.log(`actief in de eigen database : ${alles.length}`)
console.log(`ongeldig adres, overgeslagen: ${ongeldig}`)
console.log(`wordt geïmporteerd         : ${gefilterd.length}${alleenOptin ? ' (alleen eigen aanmeldingen)' : ''}`)
for (const [bron, n] of Object.entries(perBron).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${bron.padEnd(24)} ${n}`)
}
console.log(`porties van ${PORTIE}, pauze ${PAUZE_MS}ms -> ongeveer ${Math.ceil((gefilterd.length / PORTIE) * (PAUZE_MS / 1000) / 60)} minuten`)

if (proef) {
  console.log('\nProefdraai, er is niets verstuurd.')
  process.exit(0)
}

let gelukt = 0
let mislukt = 0
for (let i = 0; i < gefilterd.length; i += PORTIE) {
  const portie = gefilterd.slice(i, i + PORTIE)
  const res = await stuurPortie(portie)
  if (res.ok) {
    gelukt += portie.length
  } else {
    mislukt += portie.length
    console.error(`  portie ${i / PORTIE + 1} mislukt: ${res.fout}`)
  }
  process.stdout.write(`\r  ${gelukt + mislukt}/${gefilterd.length} verwerkt`)
  await wacht(PAUZE_MS)
}
console.log(`\n\nklaar: ${gelukt} geslaagd, ${mislukt} mislukt`)
