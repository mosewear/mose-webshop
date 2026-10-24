'use client'

/**
 * E-mailmarketing: alles op één plek.
 *
 * Bovenaan de stand van de lijst en de Postmark-bundel, daaronder de
 * campagnes via Brevo (sinds 24-10-2026 de gewone route): wat er in de
 * mailbox gebeurde, kliks per plek in de mail, bezoekers en orders. Dan de
 * Postmark-campagnes (reserve), het verkeer uit e-mail per dag, Postmarks
 * eigen tellingen per stream, en de toestemmingsronde.
 *
 * Opens tonen we alleen bij Brevo en dan zonder de automatische opens van
 * Apple Mail; ook dan blijft het een indicatie. Kliks, bezoekers en orders
 * zijn de cijfers om op te sturen.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ToestemmingAdmin from '../toestemming/ToestemmingAdmin'
import type { BrevoCampagne } from '@/lib/brevo-campagnes'

interface Cijfers {
  verzonden: number
  bounces: number
  klachten: number
  afgemeld: number
  mislukt: number
  orders: number
  omzet: number
}
interface Moment {
  id: string
  campagne_id: string
  label: string
  start_op: string
  aandeel: string
  status: string
  cijfers: Cijfers | null
}
interface Campagne {
  id: string
  slug: string
  naam: string
  onderwerp: string
  status: string
  stopreden: string | null
  wachttijd_minuten: number
  min_dagen_tussen: number
  per_run: number
}
interface Data {
  lijst: { totaal: number; wachtrij: number; vastgehouden: number; verzonden: number; bevestigd: number; afgemeld: number; bounces: number; klachten: number; mislukt: number; abonneesSite: number | null }
  campagnes: Campagne[]
  momenten: Moment[]
  doelgroepNu: number
  bundel: { verstuurd30d: number | null; grootte: number; grens: number }
  verkeer: Array<{ dag: string; campagne: number; toestemming: number }>
  bezoekersPerMoment: Record<string, number>
  brevo: { campagnes: BrevoCampagne[]; fout?: string }
  postmark: Record<string, { Sent?: number; Bounced?: number; SpamComplaints?: number; BounceRate?: number; SpamComplaintsRate?: number } | { http: number }> | null
}

const euro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const pct = (n: number, van: number) => (van > 0 ? `${((n / van) * 100).toFixed(n / van < 0.01 && n > 0 ? 2 : 1)}%` : '–')
const tijd = (s: string) => new Date(s).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** Zelfde omzetting als bouwCampagneMail, om bezoekers aan een moment te koppelen. */
const inhoudSlug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

const STATUSKLEUR: Record<string, string> = {
  actief: 'border-brand-primary bg-brand-primary text-white',
  concept: 'border-black bg-white text-black',
  gestopt: 'border-red-700 bg-red-700 text-white',
  klaar: 'border-gray-400 bg-gray-100 text-gray-700',
  gepland: 'border-gray-300 bg-white text-gray-700',
  bezig: 'border-brand-primary bg-brand-primary text-white',
  overgeslagen: 'border-gray-300 bg-gray-50 text-gray-500',
}
const STATUSNAAM: Record<string, string> = {
  actief: 'actief', concept: 'gepauzeerd', gestopt: 'gestopt', klaar: 'klaar', gepland: 'gepland', bezig: 'bezig', overgeslagen: 'overgeslagen',
}

function Kaart({ label, waarde, sub, nadruk }: { label: string; waarde: string | number; sub?: string; nadruk?: 'goed' | 'let op' }) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</p>
      <p className={`mt-1 font-display text-3xl tabular-nums ${nadruk === 'let op' ? 'text-red-700' : ''}`}>{waarde}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

export default function EmailMarketingAdmin() {
  const [data, setData] = useState<Data | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const [bezig, setBezig] = useState<string | null>(null)
  const [testAdres, setTestAdres] = useState('info@mosewear.com')

  const laad = useCallback(async () => {
    const res = await fetch('/api/admin/email-marketing', { cache: 'no-store' })
    const j = await res.json()
    if (j.ok) {
      setData(j)
      setFout(null)
    } else setFout(j.fout || 'Laden mislukt')
  }, [])

  useEffect(() => {
    laad()
    const id = setInterval(laad, 60_000)
    return () => clearInterval(id)
  }, [laad])

  async function actie(naam: string, extra: Record<string, unknown> = {}) {
    setBezig(naam)
    setMelding(null)
    try {
      const res = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actie: naam, ...extra }),
      })
      const j = await res.json()
      setMelding(j.ok ? (naam === 'test' ? `Testmail verstuurd naar ${testAdres}` : 'Opgeslagen') : j.fout || 'Mislukt')
      await laad()
    } finally {
      setBezig(null)
    }
  }

  if (fout) return <div className="p-8 text-red-700">{fout}</div>
  if (!data) return <div className="p-8 text-gray-600">Laden…</div>

  const { lijst, bundel } = data
  const bereikbaar = Math.max(0, lijst.verzonden - lijst.afgemeld - lijst.bounces - lijst.klachten)
  const bundelPct = bundel.verstuurd30d !== null ? Math.min(100, (bundel.verstuurd30d / bundel.grootte) * 100) : null
  const maxVerkeer = Math.max(1, ...data.verkeer.map((v) => v.campagne + v.toestemming))

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase md:text-4xl">E-mailmarketing</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Lijst, campagnes, verkeer en omzet uit e-mail. Stuur op kliks, bezoekers en orders; opens zijn door Apple Mail hooguit een indicatie.
          </p>
        </div>
        <Link href="/admin/newsletter" className="border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white">
          Abonnees bekijken
        </Link>
      </header>

      {melding && <p className="border-2 border-black bg-white p-3 text-sm font-semibold">{melding}</p>}

      {/* De lijst */}
      <section className="space-y-3" aria-labelledby="lijst">
        <h2 id="lijst" className="font-display text-2xl uppercase">Je lijst</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kaart label="Bereikbaar" waarde={bereikbaar.toLocaleString('nl-NL')} sub="kreeg de toestemmingsmail, niet afgemeld" />
          <Kaart label="Bevestigd" waarde={lijst.bevestigd} sub={`${pct(lijst.bevestigd, lijst.verzonden)} van wie hem kreeg`} />
          <Kaart label="Afgemeld" waarde={lijst.afgemeld} sub={pct(lijst.afgemeld, lijst.verzonden)} />
          <Kaart label="Klachten" waarde={lijst.klachten} sub={`grens 0,1% · nu ${pct(lijst.klachten, lijst.verzonden)}`} nadruk={lijst.klachten > 0 ? 'let op' : undefined} />
          <Kaart label="Nog te mailen" waarde={lijst.wachtrij.toLocaleString('nl-NL')} sub="toestemmingsmail volgt" />
          <Kaart label="Bounces" waarde={lijst.bounces} sub={pct(lijst.bounces, lijst.verzonden)} />
          <Kaart label="Vastgehouden" waarde={lijst.vastgehouden.toLocaleString('nl-NL')} sub="zakelijk en oude providers" />
          <Kaart label="Via de site" waarde={lijst.abonneesSite ?? '–'} sub="zelf aangemeld, actief" />
        </div>

        <div className="border-2 border-black bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold uppercase tracking-wider">Postmark-bundel, laatste 30 dagen</p>
            <p className="text-sm tabular-nums text-gray-700">
              {bundel.verstuurd30d === null ? 'onbekend' : bundel.verstuurd30d.toLocaleString('nl-NL')} van {bundel.grootte.toLocaleString('nl-NL')} · rondes wachten boven {bundel.grens.toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="mt-2 h-3 w-full border border-black bg-gray-100" role="img" aria-label={`${bundelPct?.toFixed(0) ?? '?'} procent van de bundel gebruikt`}>
            <div className={`h-full ${bundelPct !== null && bundelPct > 85 ? 'bg-red-600' : 'bg-brand-primary'}`} style={{ width: `${bundelPct ?? 0}%` }} />
          </div>
          <form
            className="mt-3 flex flex-wrap items-center gap-2 text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              actie('bundel', { postmark_bundel: new FormData(e.currentTarget).get('bundel') })
            }}
          >
            <label htmlFor="bundel" className="text-gray-700">Bundel van je abonnement:</label>
            <input id="bundel" name="bundel" type="number" min={1000} step={1000} defaultValue={bundel.grootte} className="w-28 border-2 border-gray-300 px-2 py-1" />
            <button className="border-2 border-black px-3 py-1 font-bold uppercase tracking-wider" disabled={!!bezig}>Opslaan</button>
            <span className="text-xs text-gray-500">Pas aan na een upgrade in Postmark; 1.500 blijft altijd vrij voor ordermails.</span>
          </form>
        </div>
      </section>

      <BrevoCampagnes brevo={data.brevo} />

      {/* Campagnes via Postmark */}
      <section className="space-y-4" aria-labelledby="campagnes">
        <h2 id="campagnes" className="font-display text-2xl uppercase">Campagnes via Postmark</h2>
        <p className="text-sm text-gray-600">Reserveroute. Campagnes gaan sinds 24 oktober via Brevo; activeer hier alleen iets als Brevo niet beschikbaar is, anders krijgen mensen hem dubbel.</p>
        <p className="text-sm text-gray-600">
          Doelgroep op dit moment: <strong>{data.doelgroepNu.toLocaleString('nl-NL')}</strong> mensen die de toestemmingsmail kregen en zich niet afmeldden. Groeit mee met de toestemmingsronde.
        </p>
        {data.campagnes.map((c) => {
          const momenten = data.momenten.filter((m) => m.campagne_id === c.id)
          const totaal = momenten.reduce(
            (s, m) => {
              const k = m.cijfers
              if (!k) return s
              return { v: s.v + k.verzonden, o: s.o + k.orders, omzet: s.omzet + k.omzet, b: s.b + (data.bezoekersPerMoment[`${c.slug}|${inhoudSlug(m.label)}`] || 0) }
            },
            { v: 0, o: 0, omzet: 0, b: 0 },
          )
          return (
            <article key={c.id} className="border-2 border-black bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black p-4">
                <div>
                  <h3 className="text-lg font-bold">{c.naam}</h3>
                  <p className="text-sm text-gray-600">Onderwerp: “{c.onderwerp}”</p>
                  {c.stopreden && <p className="mt-1 text-sm font-semibold text-red-700">Gestopt: {c.stopreden}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`border-2 px-2 py-1 text-xs font-bold uppercase tracking-wider ${STATUSKLEUR[c.status]}`}>{STATUSNAAM[c.status]}</span>
                  {c.status === 'actief' ? (
                    <button onClick={() => actie('pauzeer', { campagneId: c.id })} disabled={!!bezig} className="border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider">Pauzeer</button>
                  ) : (
                    <button onClick={() => actie('activeer', { campagneId: c.id })} disabled={!!bezig} className="border-2 border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">Activeer</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-4">
                {[
                  ['Verstuurd', totaal.v.toLocaleString('nl-NL')],
                  ['Bezoekers naar de site', `${totaal.b} · ${pct(totaal.b, totaal.v)}`],
                  ['Orders binnen 72 uur', `${totaal.o} · ${pct(totaal.o, totaal.v)}`],
                  ['Omzet', euro(totaal.omzet)],
                ].map(([l, w]) => (
                  <div key={l} className="bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{l}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">{w}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600">
                    <tr>{['Moment', 'Wanneer', 'Status', 'Verstuurd', 'Bezoekers', 'Orders', 'Omzet', 'Afgemeld', 'Bounces', 'Klachten'].map((k) => <th key={k} className="whitespace-nowrap px-3 py-2">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {momenten.map((m) => {
                      const k = m.cijfers
                      const bezoekers = data.bezoekersPerMoment[`${c.slug}|${inhoudSlug(m.label)}`] || 0
                      return (
                        <tr key={m.id} className="border-t border-gray-200">
                          <td className="whitespace-nowrap px-3 py-2 font-semibold">{m.label}</td>
                          <td className="whitespace-nowrap px-3 py-2">{tijd(m.start_op)}</td>
                          <td className="px-3 py-2"><span className={`border px-1.5 py-0.5 text-[11px] font-bold uppercase ${STATUSKLEUR[m.status]}`}>{STATUSNAAM[m.status]}</span></td>
                          <td className="px-3 py-2">{k?.verzonden ?? 0}</td>
                          <td className="px-3 py-2">{bezoekers} <span className="text-gray-500">{pct(bezoekers, k?.verzonden ?? 0)}</span></td>
                          <td className="px-3 py-2">{k?.orders ?? 0} <span className="text-gray-500">{pct(k?.orders ?? 0, k?.verzonden ?? 0)}</span></td>
                          <td className="px-3 py-2">{euro(k?.omzet ?? 0)}</td>
                          <td className="px-3 py-2">{k?.afgemeld ?? 0}</td>
                          <td className="px-3 py-2">{k?.bounces ?? 0}</td>
                          <td className={`px-3 py-2 ${(k?.klachten ?? 0) > 0 ? 'font-bold text-red-700' : ''}`}>{k?.klachten ?? 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 border-t-2 border-black p-4 md:grid-cols-2">
                <form
                  className="space-y-2 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const f = new FormData(e.currentTarget)
                    actie('instellingen', { campagneId: c.id, wachttijd_minuten: f.get('wachttijd'), min_dagen_tussen: f.get('dagen'), per_run: f.get('per_run') })
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">Regels</p>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">Wachttijd na toestemmingsmail (min)<input name="wachttijd" type="number" min={0} defaultValue={c.wachttijd_minuten} className="block w-full border-2 border-gray-300 px-2 py-1" /></label>
                    <label className="space-y-1">Minimaal dagen tussen campagnes<input name="dagen" type="number" min={0} defaultValue={c.min_dagen_tussen} className="block w-full border-2 border-gray-300 px-2 py-1" /></label>
                    <label className="space-y-1">Per 5 minuten<input name="per_run" type="number" min={1} max={500} defaultValue={c.per_run} className="block w-full border-2 border-gray-300 px-2 py-1" /></label>
                  </div>
                  <button className="border-2 border-black px-3 py-1 font-bold uppercase tracking-wider" disabled={!!bezig}>Opslaan</button>
                </form>
                <form
                  className="space-y-2 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault()
                    actie('test', { campagneId: c.id, email: testAdres })
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">Testmail</p>
                  <p className="text-xs text-gray-600">De echte campagne via de echte route, naar één adres. Telt niet mee.</p>
                  <input value={testAdres} onChange={(e) => setTestAdres(e.target.value)} type="email" className="block w-full border-2 border-gray-300 px-2 py-1" />
                  <button className="border-2 border-black px-3 py-1 font-bold uppercase tracking-wider" disabled={!!bezig}>{bezig === 'test' ? 'Bezig…' : 'Verstuur test'}</button>
                </form>
              </div>
            </article>
          )
        })}
      </section>

      {/* Verkeer uit e-mail */}
      <section className="space-y-3" aria-labelledby="verkeer">
        <h2 id="verkeer" className="font-display text-2xl uppercase">Verkeer uit e-mail, 30 dagen</h2>
        <div className="border-2 border-black bg-white p-4">
          {data.verkeer.length === 0 ? (
            <p className="text-sm text-gray-600">Nog geen bezoek vanuit e-mail.</p>
          ) : (
            <>
              <div className="flex h-40 items-end gap-1" role="img" aria-label="Bezoekers uit e-mail per dag">
                {data.verkeer.map((v) => (
                  <div key={v.dag} className="flex h-full flex-1 flex-col justify-end" title={`${v.dag}: ${v.campagne} uit campagnes, ${v.toestemming} op de bevestigingspagina`}>
                    <div className="bg-black" style={{ height: `${(v.campagne / maxVerkeer) * 100}%` }} />
                    <div className="bg-brand-primary" style={{ height: `${(v.toestemming / maxVerkeer) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                <span>{data.verkeer[0].dag}</span>
                <span>{data.verkeer[data.verkeer.length - 1].dag}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-black" /> uit campagnes ({data.verkeer.reduce((s, v) => s + v.campagne, 0)})</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-brand-primary" /> bevestigingspagina ({data.verkeer.reduce((s, v) => s + v.toestemming, 0)})</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Postmark per stream */}
      <section className="space-y-3" aria-labelledby="postmark">
        <h2 id="postmark" className="font-display text-2xl uppercase">Postmark per stream</h2>
        <div className="overflow-x-auto border-2 border-black bg-white">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>{['Stream', 'Verstuurd', 'Bounces', 'Bounce %', 'Klachten', 'Klacht %'].map((k) => <th key={k} className="px-3 py-2">{k}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(data.postmark || {}).map(([stream, s]) => {
                const st = s as { Sent?: number; Bounced?: number; SpamComplaints?: number; BounceRate?: number; SpamComplaintsRate?: number; http?: number }
                const naam = stream === 'outbound' ? 'Ordermails' : stream === 'campagnes' ? 'Campagnes' : 'Toestemmingsronde'
                return (
                  <tr key={stream} className="border-t border-gray-200">
                    <td className="px-3 py-2 font-semibold">{naam}</td>
                    {st.http ? (
                      <td className="px-3 py-2 text-gray-500" colSpan={5}>nog niet in gebruik</td>
                    ) : (
                      <>
                        <td className="px-3 py-2">{st.Sent ?? 0}</td>
                        <td className="px-3 py-2">{st.Bounced ?? 0}</td>
                        <td className={`px-3 py-2 ${(st.BounceRate ?? 0) > 5 ? 'font-bold text-red-700' : ''}`}>{(st.BounceRate ?? 0).toFixed(1)}%</td>
                        <td className="px-3 py-2">{st.SpamComplaints ?? 0}</td>
                        <td className={`px-3 py-2 ${(st.SpamComplaintsRate ?? 0) > 0.1 ? 'font-bold text-red-700' : ''}`}>{(st.SpamComplaintsRate ?? 0).toFixed(2)}%</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-gray-200 p-3 text-xs text-gray-500">Postmarks eigen tellingen, inclusief testmails. Postmark beoordeelt je account op deze cijfers; houd bounces onder 5% en klachten onder 0,1%.</p>
        </div>
      </section>

      {/* Toestemmingsronde */}
      <section aria-labelledby="toestemming" className="border-t-4 border-black pt-8">
        <span id="toestemming" className="sr-only">Toestemmingsronde</span>
        <ToestemmingAdmin ingebed />
      </section>
    </div>
  )
}

const BREVOSTATUS: Record<string, [string, string]> = {
  queued: ['ingepland', 'border-black bg-white text-black'],
  inProcess: ['wordt verstuurd', 'border-brand-primary bg-brand-primary text-white'],
  sent: ['verstuurd', 'border-gray-400 bg-gray-100 text-gray-700'],
  suspended: ['gepauzeerd', 'border-red-700 bg-red-700 text-white'],
}

const PLEKNAAM: Record<string, string> = {
  logo: 'Logo bovenaan',
  'hero-foto': 'Grote foto bovenaan',
  'hoodie-foto': 'Foto hoodie',
  'hoodie-bruin': 'Hoodie bruin',
  'hoodie-groen': 'Hoodie groen',
  'hoodie-zwart': 'Hoodie zwart',
  'hoodie-knop': 'Knop: bekijk de hoodie',
  'sweater-foto': 'Foto sweater',
  'sweater-offwhite': 'Sweater off white',
  'sweater-zwart': 'Sweater zwart',
  'sweater-knop': 'Knop: bekijk de sweater',
  'collectie-knop': 'Knop: bekijk de collectie',
  voettekst: 'Link in de voettekst',
}

function BrevoCampagnes({ brevo }: { brevo: Data['brevo'] }) {
  return (
    <section className="space-y-4" aria-labelledby="brevo">
      <div>
        <h2 id="brevo" className="font-display text-2xl uppercase">Campagnes via Brevo</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Mailboxcijfers komen van Brevo, de rest van de site zelf. <strong>Orders na klik</strong>: gekocht in hetzelfde bezoek als de klik uit de mail.{' '}
          <strong>Orders van ontvangers</strong>: elke bestelling binnen 72 uur door iemand op de lijst, ook zonder klik.
        </p>
      </div>
      {brevo.fout && <p className="border-2 border-red-700 bg-white p-3 text-sm text-red-700">Brevo gaf geen cijfers: {brevo.fout}</p>}
      {brevo.campagnes.length === 0 && !brevo.fout && <p className="text-sm text-gray-600">Nog geen campagnes in Brevo.</p>}
      {brevo.campagnes.map((c) => {
        const m = c.mailbox
        const afgeleverd = m.delivered || m.sent
        const [statusNaam, statusKleur] = BREVOSTATUS[c.status] || [c.status, 'border-gray-300 bg-white text-gray-700']
        const maxKliks = Math.max(1, ...c.links.map((l) => l.kliks))
        const tegels: Array<[string, string, string?, boolean?]> = [
          ['Afgeleverd', afgeleverd.toLocaleString('nl-NL'), m.sent ? `van ${m.sent.toLocaleString('nl-NL')} verstuurd` : undefined],
          ['Opens zonder Apple', m.trackableViews.toLocaleString('nl-NL'), `${pct(m.trackableViews, afgeleverd)} · indicatie`],
          ['Klikkers', m.clickers.toLocaleString('nl-NL'), `${pct(m.clickers, afgeleverd)} van afgeleverd`],
          ['Bezoekers op de site', c.bezoekers.toLocaleString('nl-NL'), 'unieke sessies uit deze mail'],
          ['Orders na klik', String(c.ordersNaKlik.aantal), euro(c.ordersNaKlik.omzet)],
          ['Orders van ontvangers', String(c.ordersOntvangers.aantal), `${euro(c.ordersOntvangers.omzet)} · 72 uur`],
          ['Afgemeld', String(m.unsubscriptions), pct(m.unsubscriptions, afgeleverd)],
          ['Klachten en bounces', `${m.complaints} · ${m.hardBounces}`, `klacht ${pct(m.complaints, afgeleverd)} · bounce ${pct(m.hardBounces, m.sent)}`, m.complaints > 0],
        ]
        return (
          <article key={c.id} className="border-2 border-black bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black p-4">
              <div>
                <h3 className="text-lg font-bold">{c.naam}</h3>
                <p className="text-sm text-gray-600">Onderwerp: “{c.onderwerp}”</p>
                <p className="mt-1 text-sm text-gray-600">
                  {c.verzendmoment ? `${c.status === 'sent' ? 'Verstuurd' : 'Gepland'} ${tijd(c.verzendmoment)}` : 'Nog geen moment'}
                  {c.ontvangersGepland !== null && ` · nu ${c.ontvangersGepland.toLocaleString('nl-NL')} ontvangers, groeit mee met de lijst`}
                  {c.utm && <span className="text-gray-400"> · utm {c.utm}</span>}
                </p>
              </div>
              <span className={`border-2 px-2 py-1 text-xs font-bold uppercase tracking-wider ${statusKleur}`}>{statusNaam}</span>
            </div>

            <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-4">
              {tegels.map(([l, w, sub, letOp]) => (
                <div key={l} className="bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{l}</p>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${letOp ? 'text-red-700' : ''}`}>{w}</p>
                  {sub && <p className="text-xs text-gray-500">{sub}</p>}
                </div>
              ))}
            </div>

            {c.links.length > 0 && (
              <div className="overflow-x-auto border-t-2 border-black">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600">
                    <tr>{['Plek in de mail', 'Kliks (Brevo)', '', 'Bezoekers (site)'].map((k, i) => <th key={i} className="whitespace-nowrap px-3 py-2">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {c.links.map((l) => (
                      <tr key={l.plek} className="border-t border-gray-200">
                        <td className="whitespace-nowrap px-3 py-2 font-semibold">{PLEKNAAM[l.plek] || l.plek}</td>
                        <td className="px-3 py-2">{l.kliks}</td>
                        <td className="w-1/3 px-3 py-2">
                          <div className="h-2 bg-gray-100" aria-hidden>
                            <div className="h-full bg-black" style={{ width: `${(l.kliks / maxKliks) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2">{l.bezoekers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
