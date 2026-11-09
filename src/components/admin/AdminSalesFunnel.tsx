'use client'

import { useState } from 'react'
import type { AdminSalesFunnel as FunnelData, FunnelCounts, FunnelRow } from '@/lib/admin-sales-funnel'

const stages = [
  ['sessions', 'Sessies'],
  ['viewed', 'Product bekeken'],
  ['added', 'In winkelmand'],
  ['checkout', 'Naar checkout'],
  ['failed', 'Checkoutfout'],
  ['paid', 'Shopify betaald'],
] as const satisfies ReadonlyArray<readonly [keyof FunnelCounts, string]>
const number = new Intl.NumberFormat('nl-NL')

function FunnelTable({ label, rows }: { label: string; rows: FunnelRow[] }) {
  if (!rows.length) return <p className="text-sm text-gray-600">Geen gemeten activiteit voor deze selectie.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b-2 border-gray-200 text-gray-600">
          <tr>
            <th scope="col" className="py-3 pr-4 text-left">{label}</th>
            {stages.map(([key, title]) => (
              <th key={key} scope="col" className="px-3 py-3 text-right whitespace-nowrap">{title}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map(row => (
            <tr key={row.id}>
              <th scope="row" className="py-3 pr-4 text-left font-semibold">{row.label}</th>
              {stages.map(([key]) => (
                <td key={key} className="px-3 py-3 text-right tabular-nums">{number.format(row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminSalesFunnel({ data }: { data: FunnelData | null }) {
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const campaign = data?.campaigns.some(row => row.id === selectedCampaign) ? selectedCampaign : ''
  return (
    <section className="space-y-5 border-2 border-gray-200 bg-white p-4 md:p-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Van bezoek tot bestelling</h2>
        <p className="mt-1 text-sm text-gray-600">Unieke gemeten sessies per stap. Een campagne komt uit de eerste gemeten campagnelink in die sessie. Een checkout telt als betaald zodra we die aan een bevestigde Shopify-betaling kunnen koppelen. Die koppeling wordt vanaf deze update gemeten.</p>
      </div>
      {data ? <>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {stages.map(([key, title]) => (
            <div key={key} className="border border-gray-200 p-3">
              <dt className="text-sm text-gray-600">{title}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{number.format(data.total[key])}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="mb-1 text-lg font-bold">Per campagne</h3>
          <FunnelTable label="Campagne (UTM)" rows={data.campaigns} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Per product</h3>
            <label className="flex items-center gap-2 text-sm">
              Campagnefilter
              <select value={campaign} onChange={e => setSelectedCampaign(e.target.value)} className="max-w-48 border border-gray-300 px-2 py-1.5">
                <option value="">Alle sessies</option>
                {data.campaigns.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
              </select>
            </label>
          </div>
          <FunnelTable label="Product" rows={campaign ? data.byCampaign[campaign] ?? [] : data.products} />
        </div>
      </> : <p className="border border-gray-200 p-3 text-sm text-gray-600">De webshopfunnel is tijdelijk niet beschikbaar.</p>}
    </section>
  )
}
