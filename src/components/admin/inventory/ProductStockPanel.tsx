'use client'

import { useState } from 'react'
import StockQuantityEditor from './StockQuantityEditor'
import { sortVariantsByColorSize } from '@/lib/variant-sort'

type Variant = { id: string; color: string; color_hex: string | null; size: string; sku: string | null; stock_quantity: number }

export default function ProductStockPanel({ variants, onSaved }: {
  variants: Variant[]
  onSaved: (variantId: string, quantity: number) => void
}) {
  const [search, setSearch] = useState('')
  const groups = new Map<string, Variant[]>()
  for (const variant of sortVariantsByColorSize(variants)) {
    const group = groups.get(variant.color) ?? []
    group.push(variant)
    groups.set(variant.color, group)
  }
  return (
    <section id="product-stock" aria-labelledby="product-stock-title" className="mb-8 scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="product-stock-title" className="text-2xl font-display font-bold">Voorraad per kleur & maat</h2>
          <p className="mt-1 text-sm text-gray-600">Vul het nieuwe aantal in of gebruik + / −. Sla elke maat apart op; Enter werkt ook.</p>
        </div>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
          Zoek kleur, maat of SKU
          <input type="search" value={search} onChange={event => setSearch(event.target.value)}
            className="mt-1 block h-10 w-full border-2 border-gray-200 bg-white px-3 text-sm font-normal normal-case focus:border-brand-primary focus:outline-none" placeholder="Bijv. Groen of XL" />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from(groups, ([color, rows]) => {
          // Keep editors mounted while filtering so unsaved counts are preserved.
          const visible = rows.some(row => `${row.color} ${row.size} ${row.sku ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
          return <div key={color} hidden={!visible} className="border-2 border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              <span aria-hidden="true" className="h-5 w-5 border border-black/20" style={{ backgroundColor: rows[0].color_hex ?? '#eee' }} />
              <h3 className="font-bold">{color}</h3>
              <span className="ml-auto text-xs text-gray-500">{rows.reduce((sum, row) => sum + row.stock_quantity, 0)} stuks</span>
            </div>
            <div className="divide-y divide-gray-100">
              {rows.map(row => <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="w-12 shrink-0 pt-2 font-bold">{row.size}</div>
                <div className="min-w-0 flex-1">
                  <StockQuantityEditor variantId={row.id} quantity={row.stock_quantity} label={`${row.color} ${row.size}`} onSaved={quantity => onSaved(row.id, quantity)} />
                  <p className="mt-1 break-all text-[10px] text-gray-400">{row.sku}</p>
                </div>
              </div>)}
            </div>
          </div>
        })}
      </div>
      {variants.length === 0 && <p className="bg-white p-4 text-sm text-gray-600">Voeg eerst een variant toe om voorraad te beheren.</p>}
      {variants.length > 0 && !variants.some(row => `${row.color} ${row.size} ${row.sku ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())) && <p className="p-4 text-sm text-gray-600">Geen varianten gevonden. Probeer een andere kleur of maat.</p>}
    </section>
  )
}
