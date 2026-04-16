'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PAGES = [
  { name: 'Dashboard', href: '/admin', icon: 'home' },
  { name: 'Orders', href: '/admin/orders', icon: 'shopping-bag' },
  { name: 'Producten', href: '/admin/products', icon: 'box' },
  { name: 'Klanten', href: '/admin/customers', icon: 'users' },
  { name: 'Voorraad', href: '/admin/inventory', icon: 'clipboard' },
  { name: 'Analytics', href: '/admin/analytics', icon: 'chart' },
  { name: 'Retouren', href: '/admin/returns', icon: 'refresh' },
  { name: 'Reviews', href: '/admin/reviews', icon: 'star' },
  { name: 'Instellingen', href: '/admin/settings', icon: 'settings' },
]

type ResultItem = {
  id: string
  name: string
  href: string
  icon: string
  category: 'Pagina\'s' | 'Orders' | 'Producten'
}

function IconForType({ icon, className }: { icon: string; className?: string }) {
  const cn = className || 'w-4 h-4'
  switch (icon) {
    case 'home':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      )
    case 'shopping-bag':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    case 'box':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    case 'users':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case 'clipboard':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    case 'chart':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    case 'refresh':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'star':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'order':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    case 'product':
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    default:
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const gPressedRef = useRef(false)
  const gTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSelectedIndex(0)
  }, [])

  const navigate = useCallback((href: string) => {
    close()
    router.push(href)
  }, [close, router])

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Cmd/Ctrl+K opens palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        return
      }

      if (open) return
      if (isInput) return

      // G-key sequences
      if (e.key === 'g' || e.key === 'G') {
        if (!gPressedRef.current) {
          gPressedRef.current = true
          if (gTimerRef.current) clearTimeout(gTimerRef.current)
          gTimerRef.current = setTimeout(() => {
            gPressedRef.current = false
          }, 500)
          return
        }
      }

      if (gPressedRef.current) {
        gPressedRef.current = false
        if (gTimerRef.current) clearTimeout(gTimerRef.current)

        switch (e.key.toLowerCase()) {
          case 'o': e.preventDefault(); router.push('/admin/orders'); return
          case 'p': e.preventDefault(); router.push('/admin/products'); return
          case 'c': e.preventDefault(); router.push('/admin/customers'); return
          case 'd': e.preventDefault(); router.push('/admin'); return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, router])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search logic
  useEffect(() => {
    if (!open) return

    const trimmed = query.trim().toLowerCase()

    if (!trimmed) {
      const pageResults: ResultItem[] = PAGES.map(p => ({
        id: `page-${p.href}`,
        name: p.name,
        href: p.href,
        icon: p.icon,
        category: "Pagina's" as const,
      }))
      setResults(pageResults)
      setSelectedIndex(0)
      return
    }

    const pageResults: ResultItem[] = PAGES
      .filter(p => p.name.toLowerCase().includes(trimmed))
      .map(p => ({
        id: `page-${p.href}`,
        name: p.name,
        href: p.href,
        icon: p.icon,
        category: "Pagina's" as const,
      }))

    setResults(pageResults)
    setSelectedIndex(0)

    if (trimmed.length < 2) return

    const controller = new AbortController()
    setLoading(true)

    async function searchRemote() {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          supabase
            .from('orders')
            .select('id, order_number, customer_email')
            .or(`order_number.ilike.%${trimmed}%,customer_email.ilike.%${trimmed}%`)
            .limit(5),
          supabase
            .from('products')
            .select('id, name')
            .ilike('name', `%${trimmed}%`)
            .limit(5),
        ])

        if (controller.signal.aborted) return

        const orderItems: ResultItem[] = (ordersRes.data || []).map(o => ({
          id: `order-${o.id}`,
          name: `#${o.order_number || o.id.slice(0, 8)} — ${o.customer_email || 'Onbekend'}`,
          href: `/admin/orders/${o.id}`,
          icon: 'order',
          category: 'Orders' as const,
        }))

        const productItems: ResultItem[] = (productsRes.data || []).map(p => ({
          id: `product-${p.id}`,
          name: p.name,
          href: `/admin/products/${p.id}`,
          icon: 'product',
          category: 'Producten' as const,
        }))

        setResults(prev => {
          const pages = prev.filter(r => r.category === "Pagina's")
          return [...pages, ...orderItems, ...productItems]
        })
        setSelectedIndex(0)
      } catch {
        // silently fail
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    const debounce = setTimeout(searchRemote, 200)
    return () => {
      controller.abort()
      clearTimeout(debounce)
    }
  }, [query, open, supabase])

  // Keyboard nav inside palette
  function handlePaletteKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigate(results[selectedIndex].href)
      return
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return
    const el = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Group results by category
  const grouped = results.reduce<Record<string, ResultItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  if (!open) return null

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={close}
    >
      <div
        className="bg-white border-2 border-black w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={handlePaletteKeyDown}
      >
        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Zoek pagina's, orders, producten..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-lg border-b-2 border-gray-200 outline-none"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-80 overflow-y-auto">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-bold uppercase text-gray-500 bg-gray-50 tracking-wide">
                {category}
              </div>
              {items.map(item => {
                flatIndex++
                const idx = flatIndex
                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    className={`w-full px-4 py-3 cursor-pointer flex items-center gap-3 text-left transition-colors ${
                      idx === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="text-gray-500">
                      <IconForType icon={item.icon} />
                    </span>
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </button>
                )
              })}
            </div>
          ))}
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Geen resultaten gevonden
            </div>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="p-3 border-t-2 border-gray-200 text-xs text-gray-500 flex gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">↑↓</kbd> navigeer</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">↵</kbd> openen</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">esc</kbd> sluiten</span>
          <span className="ml-auto"><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">?</kbd> sneltoetsen</span>
        </div>
      </div>
    </div>
  )
}
