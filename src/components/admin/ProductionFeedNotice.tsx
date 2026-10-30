'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
export default function ProductionFeedNotice() {
  const [warning, setWarning] = useState('')
  useEffect(() => {
    let stopped = false,
      controller: AbortController | undefined
    async function load() {
      if (document.visibilityState !== 'visible') return
      controller?.abort()
      controller = new AbortController()
      try {
        const r = await fetch('/api/admin/tapstitch', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!r.ok) throw Error()
        const d = await r.json()
        const stale = d.orders.some(
          (o: { production_stale: boolean }) => o.production_stale,
        )
        const text =
          !d.configured || !d.enabled
            ? 'De automatische Tapstitch-productiecontrole is nog niet actief.'
            : d.state.last_error || d.overdue || stale
              ? 'De Tapstitch-productiecontrole vraagt aandacht. Laatst bevestigde statussen blijven bewaard.'
              : ''
        if (!stopped) setWarning(text)
      } catch (e) {
        if (!stopped && !(e instanceof DOMException && e.name === 'AbortError'))
          setWarning(
            'De Tapstitch-productieverbinding kan nu niet worden gecontroleerd.',
          )
      }
    }
    void load()
    const timer = setInterval(load, 60000)
    document.addEventListener('visibilitychange', load)
    return () => {
      stopped = true
      controller?.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])
  return warning ? (
    <div
      role="status"
      className="my-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      {warning}{' '}
      <Link
        href="/admin/shopify/production"
        className="font-semibold underline"
      >
        Bekijk de verbinding
      </Link>
    </div>
  ) : null
}
