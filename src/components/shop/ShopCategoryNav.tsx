'use client'

import {useEffect, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight} from 'lucide-react'

/** A shop-only category strip; other category pickers keep their own layout. */
export default function ShopCategoryNav({items, active, onSelect, label, previousLabel, nextLabel}: {
  items: Array<{slug: string; label: string}>
  active: string
  onSelect: (slug: string) => void
  label: string
  previousLabel: string
  nextLabel: string
}) {
  const strip = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({left: false, right: false})
  const measure = () => {
    const el = strip.current
    if (el) setEdges({left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1})
  }
  useEffect(() => {
    const el = strip.current
    if (!el) return
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [items])
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView?.({block: 'nearest', inline: 'nearest'})
  }, [active])
  const scroll = (direction: number) => strip.current?.scrollBy({left: direction * Math.max(160, strip.current.clientWidth * .75), behavior: 'smooth'})
  return <nav aria-label={label} className="relative flex min-w-0 items-center gap-1">
    {edges.left && <button type="button" onClick={() => scroll(-1)} aria-label={previousLabel} className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white focus-visible:outline-brand-primary"><ChevronLeft size={18} aria-hidden="true"/></button>}
    <div ref={strip} onScroll={measure} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {items.map(item => <button type="button" key={item.slug} aria-pressed={active === item.slug} onClick={() => onSelect(item.slug)} className={`min-h-11 shrink-0 whitespace-nowrap border-2 px-3 text-xs font-bold uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${active === item.slug ? 'border-black bg-brand-primary text-white' : 'border-black bg-white text-black hover:bg-black hover:text-white'}`}>{item.label}</button>)}
    </div>
    {edges.right && <button type="button" onClick={() => scroll(1)} aria-label={nextLabel} className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white focus-visible:outline-brand-primary"><ChevronRight size={18} aria-hidden="true"/></button>}
  </nav>
}
