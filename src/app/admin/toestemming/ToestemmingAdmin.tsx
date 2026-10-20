'use client'

/**
 * Dashboard voor de toestemmingsronde. Ververst elke 30 seconden, zodat je
 * een pluk live ziet binnenkomen. De stopregels zitten op de server; deze
 * pagina laat ze alleen zien en geeft de knoppen.
 */

import { useCallback, useEffect, useState } from 'react'

interface Data {
  instellingen: {
    actief: boolean; plukgrootte: number; interval_minuten: number; venster_van: number; venster_tot: number
    max_bounce_pct: number; max_klacht_pct: number; max_bounces_pluk: number
    laatste_pluk: number; laatste_pluk_op: string | null; gestopt_op: string | null; stopreden: string | null
  }
  cijfers: { totaal: number; wachtrij: number; vastgehouden: number; verzonden: number; bevestigd: number; afgemeld: number; bounces: number; klachten: number; mislukt: number }
  plukken: Array<{ pluk: number; op: string | null; verzonden: number; bevestigd: number; afgemeld: number; bounces: number; klachten: number; mislukt: number }>
}

const pct = (n: number, van: number) => (van > 0 ? `${((n / van) * 100).toFixed(n / van < 0.01 && n > 0 ? 2 : 1)}%` : '–')
const tijd = (s: string | null) =>
  s ? new Date(s).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'

export default function ToestemmingAdmin() {
  const [data, setData] = useState<Data | null>(null)
  const [bezig, setBezig] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const [testAdres, setTestAdres] = useState('info@mosewear.com')
  const [vraagBevestiging, setVraagBevestiging] = useState<string | null>(null)

  const laad = useCallback(async () => {
    const res = await fetch('/api/admin/toestemming', { cache: 'no-store' })
    const j = await res.json()
    if (j.ok) setData(j)
    else setMelding(j.fout || 'Laden mislukt')
  }, [])

  useEffect(() => {
    laad()
    const id = setInterval(laad, 30_000)
    return () => clearInterval(id)
  }, [laad])

  async function actie(naam: string, extra: Record<string, unknown> = {}) {
    setBezig(naam)
    setMelding(null)
    setVraagBevestiging(null)
    try {
      const res = await fetch('/api/admin/toestemming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actie: naam, ...extra }),
      })
      const j = await res.json()
      if (!j.ok) setMelding(j.fout || 'Mislukt')
      else if (naam === 'nu') {
        const u = j.uitslag
        setMelding(u.gestopt ? `Gestopt: ${u.gestopt}` : u.pluk ? `Pluk ${u.pluk}: ${u.verzonden} verstuurd, ${u.overgeslagen} overgeslagen, ${u.mislukt} mislukt` : `Niets verstuurd: ${u.reden}`)
      } else if (naam === 'test') setMelding(`Testmail verstuurd naar ${testAdres}`)
      else if (naam === 'zakelijk_vrijgeven') setMelding(`${j.vrijgegeven} zakelijke adressen achteraan de rij gezet`)
      await laad()
    } finally {
      setBezig(null)
    }
  }

  if (!data) return <div className="p-8 text-gray-600">Laden…</div>
  const { instellingen: i, cijfers: c, plukken } = data
  const status = i.gestopt_op ? 'gestopt' : i.actief ? 'actief' : 'uit'
  const plukkenPerDag = Math.max(0, Math.floor(((i.venster_tot - i.venster_van) * 60) / i.interval_minuten))
  const dagenTeGaan = plukkenPerDag > 0 ? Math.ceil(c.wachtrij / (plukkenPerDag * i.plukgrootte)) : null

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase md:text-4xl">Toestemmingsronde</h1>
          <p className="mt-1 text-sm text-gray-600">
            Eén mail aan de oude lijst: blijf je op de lijst? Stopt zichzelf bij te veel bounces of klachten.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 border-2 px-3 py-1.5 text-sm font-bold uppercase tracking-wider ${
            status === 'actief' ? 'border-brand-primary bg-brand-primary text-white' : status === 'gestopt' ? 'border-red-700 bg-red-700 text-white' : 'border-black bg-white text-black'
          }`}
        >
          {status}
        </span>
      </header>

      {i.gestopt_op && (
        <div role="alert" className="border-2 border-red-700 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-bold">Automatisch gestopt op {tijd(i.gestopt_op)}</p>
          <p className="mt-1">{i.stopreden}</p>
          <p className="mt-2">Bekijk eerst wat er gebeurd is. Met &quot;Start&quot; hef je de stop op en gaat de ronde verder.</p>
        </div>
      )}

      {melding && <p className="border-2 border-black bg-white p-3 text-sm font-semibold">{melding}</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Verstuurd', c.verzonden, `${c.wachtrij} in de wachtrij`],
          ['Bevestigd', c.bevestigd, pct(c.bevestigd, c.verzonden)],
          ['Afgemeld', c.afgemeld, pct(c.afgemeld, c.verzonden)],
          ['Bounces', c.bounces, `${pct(c.bounces, c.verzonden)} · grens ${i.max_bounce_pct}%`],
          ['Klachten', c.klachten, `${pct(c.klachten, c.verzonden)} · grens ${i.max_klacht_pct}%`],
          ['Mislukt', c.mislukt, 'niet verstuurd'],
          ['Zakelijk vastgehouden', c.vastgehouden, 'wacht op jouw akkoord'],
          ['Klaar over', dagenTeGaan === null ? '–' : `${dagenTeGaan} d`, `${plukkenPerDag} plukken per dag`],
        ].map(([label, waarde, sub]) => (
          <div key={label as string} className="border-2 border-black bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{waarde}</p>
            <p className="mt-1 text-xs text-gray-600">{sub}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        {status !== 'actief' ? (
          <button disabled={!!bezig} onClick={() => actie('start')} className="border-2 border-brand-primary bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50">
            Start
          </button>
        ) : (
          <button disabled={!!bezig} onClick={() => actie('pauzeer')} className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50">
            Pauzeer
          </button>
        )}
        <button
          disabled={!!bezig || status !== 'actief'}
          onClick={() => actie('nu')}
          className="border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-40"
          title="Verstuurt meteen de volgende pluk, ook als de wachttijd nog loopt (wel binnen het venster)"
        >
          {bezig === 'nu' ? 'Bezig…' : `Nu een pluk van ${i.plukgrootte}`}
        </button>
        {c.vastgehouden > 0 && (
          vraagBevestiging === 'zakelijk' ? (
            <span className="flex flex-wrap items-center gap-2 border-2 border-black bg-yellow-50 px-3 py-2 text-sm">
              {c.vastgehouden} zakelijke adressen vrijgeven?
              <button onClick={() => actie('zakelijk_vrijgeven')} className="font-bold underline">Ja</button>
              <button onClick={() => setVraagBevestiging(null)} className="underline">Nee</button>
            </span>
          ) : (
            <button onClick={() => setVraagBevestiging('zakelijk')} className="border-2 border-gray-400 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-gray-700">
              Zakelijke adressen vrijgeven
            </button>
          )
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <form
          className="space-y-3 border-2 border-black bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            actie('instellingen', Object.fromEntries(f.entries()))
          }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider">Tempo</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">Per pluk<input name="plukgrootte" type="number" min={1} max={500} defaultValue={i.plukgrootte} className="block w-full border-2 border-gray-300 px-2 py-1.5" /></label>
            <label className="space-y-1">Minuten ertussen<input name="interval_minuten" type="number" min={30} step={30} defaultValue={i.interval_minuten} className="block w-full border-2 border-gray-300 px-2 py-1.5" /></label>
            <label className="space-y-1">Vanaf (uur)<input name="venster_van" type="number" min={0} max={23} defaultValue={i.venster_van} className="block w-full border-2 border-gray-300 px-2 py-1.5" /></label>
            <label className="space-y-1">Tot (uur)<input name="venster_tot" type="number" min={1} max={24} defaultValue={i.venster_tot} className="block w-full border-2 border-gray-300 px-2 py-1.5" /></label>
          </div>
          <button disabled={!!bezig} className="border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wider">Opslaan</button>
          <p className="text-xs text-gray-600">Laatste pluk {i.laatste_pluk || '–'} op {tijd(i.laatste_pluk_op)}.</p>
        </form>

        <form
          className="space-y-3 border-2 border-black bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            actie('test', { email: testAdres, taal: f.get('taal') })
          }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider">Testmail</h2>
          <p className="text-xs text-gray-600">De echte mail via de echte route, naar één adres. Telt niet mee in de cijfers.</p>
          <input value={testAdres} onChange={(e) => setTestAdres(e.target.value)} type="email" className="block w-full border-2 border-gray-300 px-2 py-1.5 text-sm" />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="taal" value="nl" defaultChecked /> NL</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="taal" value="en" /> EN</label>
          </div>
          <button disabled={!!bezig} className="border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wider">{bezig === 'test' ? 'Bezig…' : 'Verstuur test'}</button>
        </form>
      </section>

      <section className="border-2 border-black bg-white">
        <h2 className="border-b-2 border-black p-4 text-sm font-bold uppercase tracking-wider">Per pluk</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600">
              <tr>{['Pluk', 'Verstuurd op', 'Verstuurd', 'Bevestigd', 'Afgemeld', 'Bounces', 'Klachten', 'Mislukt'].map((k) => <th key={k} className="px-4 py-2">{k}</th>)}</tr>
            </thead>
            <tbody>
              {plukken.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-gray-500">Nog niets verstuurd.</td></tr>}
              {plukken.map((p) => (
                <tr key={p.pluk} className="border-t border-gray-200">
                  <td className="px-4 py-2 font-bold">{p.pluk}</td>
                  <td className="px-4 py-2">{tijd(p.op)}</td>
                  <td className="px-4 py-2">{p.verzonden}</td>
                  <td className="px-4 py-2">{p.bevestigd} <span className="text-gray-500">{pct(p.bevestigd, p.verzonden)}</span></td>
                  <td className="px-4 py-2">{p.afgemeld}</td>
                  <td className={`px-4 py-2 ${p.bounces >= i.max_bounces_pluk ? 'font-bold text-red-700' : ''}`}>{p.bounces}</td>
                  <td className={`px-4 py-2 ${p.klachten > 0 ? 'font-bold text-red-700' : ''}`}>{p.klachten}</td>
                  <td className="px-4 py-2">{p.mislukt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
