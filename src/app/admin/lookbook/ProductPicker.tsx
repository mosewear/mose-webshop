'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Plus, X, ArrowUp, ArrowDown, Search } from 'lucide-react'
import type { ChapterProduct } from '@/lib/lookbook'
import { resolveShopModuleVariant, shopModuleVariantLabel } from '@/lib/lookbook'

interface ProductOption {
  id: string
  slug: string
  name: string
  base_price: number
  primary_image_url: string | null
  status: string
  is_active: boolean
}

interface ProductPickerProps {
  /** Currently linked products, already ordered. */
  selected: ChapterProduct[]
  /** Full catalog to pick from. */
  catalog: ProductOption[]
  /** Called when the list changes; parent persists + refetches. */
  onChange: (next: { product_id: string; sort_order: number }[]) => void
}

/**
 * Multi-select product picker for a lookbook chapter.
 *
 * UX choices
 *  - Left: search-filtered add list (the catalog minus already-linked).
 *  - Right: the chapter's ordered product list with up/down reorder
 *    arrows — explicitly no drag-and-drop because the admin runs on
 *    touch devices too and up/down is just as fast for 1-6 items.
 *  - Top: a live "preview badge" that shows which shop-module variant
 *    the public page will render with the current selection (PIECE /
 *    OUTFIT / LOOK / none). Matches the public logic 1:1.
 */
export default function ProductPicker({
  selected,
  catalog,
  onChange,
}: ProductPickerProps) {
  const [search, setSearch] = useState('')

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected])

  const availableCatalog = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog, selectedIds, search])

  const commit = (next: ChapterProduct[]) => {
    onChange(next.map((p, idx) => ({ product_id: p.id, sort_order: idx * 10 })))
  }

  const add = (option: ProductOption) => {
    const next: ChapterProduct[] = [
      ...selected,
      {
        id: option.id,
        slug: option.slug,
        name: option.name,
        name_en: null,
        base_price: option.base_price,
        sale_price: null,
        primary_image_url: option.primary_image_url,
        secondary_image_url: null,
        variant_colors: [],
        sort_order: selected.length * 10,
        is_active: option.is_active,
        status: option.status,
      },
    ]
    commit(next)
  }

  const remove = (id: string) => {
    commit(selected.filter((p) => p.id !== id))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...selected]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    commit(next)
  }

  const moveDown = (index: number) => {
    if (index === selected.length - 1) return
    const next = [...selected]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    commit(next)
  }

  const variant = resolveShopModuleVariant(selected.length)

  return (
    <div className="space-y-4">
      {/* Preview of which module variant will render */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border-2 border-black">
        <span className="text-xs uppercase tracking-wider text-gray-600">
          Public page toont:
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-wider">
          {variant === 'none'
            ? '—'
            : shopModuleVariantLabel(variant)}
        </span>
        <span className="text-xs text-gray-600">
          {selected.length} {selected.length === 1 ? 'product' : 'producten'}
          {variant === 'piece' && (
            <> · featured-piece layout (extra aandacht voor 1 item)</>
          )}
          {variant === 'outfit' && <> · inline rij met cards</>}
          {variant === 'look' && <> · snap-scroll strip</>}
        </span>
      </div>

      {/* Selected list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SELECTED (right column visually on desktop, shown first) */}
        <div className="md:order-2">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-2">
            In dit chapter ({selected.length})
          </h4>

          {selected.length === 0 ? (
            <div className="aspect-[3/1] border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500 p-4 text-center">
              Geen producten gekoppeld. Voeg er links een toe om de shop-module te
              activeren.
            </div>
          ) : (
            <ul className="space-y-2">
              {selected.map((p, index) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 border-2 border-black bg-white p-2"
                >
                  <div className="relative w-12 h-12 border border-black flex-shrink-0 bg-gray-100">
                    {p.primary_image_url ? (
                      <Image
                        src={p.primary_image_url}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-xs text-gray-600">€{p.base_price}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Omhoog"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === selected.length - 1}
                      className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Omlaag"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="p-1.5 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      aria-label="Verwijderen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CATALOG (left column) */}
        <div className="md:order-1">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-2">
            Catalogus
          </h4>
          <div className="relative mb-2">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek product..."
              className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none"
            />
          </div>
          {availableCatalog.length === 0 ? (
            <div className="aspect-[3/1] border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500 p-4 text-center">
              {catalog.length === 0
                ? 'Geen producten beschikbaar'
                : 'Alle matching producten zijn al gekoppeld'}
            </div>
          ) : (
            <ul className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
              {availableCatalog.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 border-2 border-gray-300 bg-white p-2 hover:border-black transition-colors"
                >
                  <div className="relative w-12 h-12 border border-black flex-shrink-0 bg-gray-100">
                    {p.primary_image_url ? (
                      <Image
                        src={p.primary_image_url}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-xs text-gray-600">
                      €{p.base_price}
                      {p.status !== 'active' && (
                        <span className="ml-1 text-orange-600">· {p.status}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p)}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider border-2 border-black bg-white hover:bg-black hover:text-white px-2 py-1 transition-colors flex-shrink-0"
                  >
                    <Plus size={14} />
                    Toevoegen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
