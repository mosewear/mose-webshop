'use client'

import {useEffect, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight, Grid2X2} from 'lucide-react'
import Image from 'next/image'

/** A shop-only category strip; other category pickers keep their own layout. */
export default function ShopCategoryNav({items, active, onSelect, label, previousLabel, nextLabel}: {
  items: Array<{slug: string; label: string; image?: string}>
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
  const scroll = (direction: number) => strip.current?.scrollBy({left: direction * Math.max(160, strip.current.clientWidth * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'})
  return <nav aria-label={label} className="relative min-w-0">
    {edges.left && <button type="button" onClick={() => scroll(-1)} aria-label={previousLabel} className="absolute -left-3 top-7 z-10 hidden h-11 w-11 items-center justify-center border border-black/20 bg-white focus-visible:outline-brand-primary md:flex"><ChevronLeft size={18} aria-hidden="true"/></button>}
    <div ref={strip} onScroll={measure} className="flex min-w-0 snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(item => <button type="button" key={item.slug} aria-pressed={active === item.slug} onClick={() => onSelect(item.slug)} className={`group min-w-0 basis-[calc((100%_-_36px)/3.35)] shrink-0 snap-start border-b-2 pb-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:basis-24 ${active === item.slug ? 'border-brand-primary text-black' : 'border-transparent text-gray-600 hover:text-black'}`}>
        <span className="relative mb-1.5 flex aspect-square w-full items-center justify-center overflow-hidden bg-black text-white">
          {item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 767px) 28vw, 96px" className="object-cover object-[50%_30%]"/> : <Grid2X2 size={22} strokeWidth={1.5} aria-hidden="true"/>}
        </span>
        <span className="block truncate text-[10px] font-bold uppercase tracking-wide md:text-xs">{item.label}</span>
      </button>)}
    </div>
    {edges.right && <button type="button" onClick={() => scroll(1)} aria-label={nextLabel} className="absolute -right-3 top-7 z-10 hidden h-11 w-11 items-center justify-center border border-black/20 bg-white focus-visible:outline-brand-primary md:flex"><ChevronRight size={18} aria-hidden="true"/></button>}
  </nav>
}
