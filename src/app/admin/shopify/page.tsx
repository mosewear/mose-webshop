'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Readiness } from '@/lib/shopify-readiness'

const date = (value: string | null) => value ? new Intl.DateTimeFormat('nl-NL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Amsterdam' }).format(new Date(value)) : 'Nog niet vastgesteld'
const statusLabel = { verified: 'Gecontroleerd', missing: 'Nog nodig', unknown: 'Onbekend' }

export default function ShopifyReadinessPage() {
  const [data, setData] = useState<Readiness | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/shopify/readiness', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? 'Je hebt geen toegang tot dit overzicht.' : 'De status kon niet worden opgehaald.')
        return response.json() as Promise<Readiness>
      }).then(setData).catch(reason => {
        if (!controller.signal.aborted) { setData(null); setError(reason instanceof Error ? reason.message : 'De status kon niet worden opgehaald.') }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  return <div className="max-w-5xl mx-auto space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-3xl uppercase">Shopify checkout</h1><p className="text-sm text-gray-600 mt-2">Eén betaalroute voor de volledige MOSE-collectie.</p></div>
      <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(''); setRevision(n => n + 1) }} disabled={loading}>Status vernieuwen</Button>
    </header>
    {loading && <p role="status">Status wordt gecontroleerd…</p>}
    {error && <p role="alert" className="border-2 border-red-700 bg-white p-4 text-red-800">{error}</p>}
    {data && <>
      <section className="border-2 border-black bg-white p-5" aria-labelledby="release-heading">
        <h2 id="release-heading" className="font-display text-xl uppercase">{data.status === 'technical_checks_passed' ? 'Technische controles geslaagd' : 'Nog niet vrijgegeven voor omschakeling'}</h2>
        <p className="mt-2 text-sm">Dit overzicht controleert de geregistreerde technische voorwaarden. Het volledige vrijgavebewijs omvat ook betaalproeven, samples, commerciële voorwaarden en de migratiecontrole.</p>
        <p className="mt-3 text-xs text-gray-600">Gecontroleerd: {date(data.checkedAt)} · Amsterdam</p>
      </section>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([['Gekoppelde varianten', data.counts.mappings], ['Vrijgegeven varianten', data.counts.released], ['Te verwerken updates', data.counts.pendingEvents], ['Herstel nodig', data.counts.failedEvents]] as const).map(([label, value]) => <div key={label} className="border-2 border-black bg-white p-4"><dt className="text-xs font-bold uppercase">{label}</dt><dd className="mt-2 text-2xl font-bold">{value === null ? 'Onbekend' : value}</dd></div>)}
      </dl>
      <section className="border-2 border-black bg-white" aria-label="Vrijgavevoorwaarden">
        <ul className="divide-y divide-gray-200">{data.checks.map(check => <li key={check.key} className="p-4 flex flex-wrap justify-between gap-3"><span className="text-sm">{check.label}</span><span className={`text-xs font-bold uppercase ${check.status === 'verified' ? 'text-green-800' : check.status === 'unknown' ? 'text-gray-600' : 'text-amber-900'}`}>{statusLabel[check.status]}</span></li>)}</ul>
      </section>
      <section className="border-2 border-black bg-white p-5 text-sm space-y-2"><p>Laatste workercontrole: {date(data.lastWorkerAt)}</p><p>Laatste vergelijking met Shopify: {date(data.lastReconciledAt)}</p><p>Oudste wachtende update: {date(data.oldestPendingAt)}</p><p className="text-gray-600">Ontbrekende tabellen of brongegevens worden als onbekend getoond. Dit scherm kan verkoop niet activeren.</p></section>
    </>}
  </div>
}
