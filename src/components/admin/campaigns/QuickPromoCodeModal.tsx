'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CampaignPromoCodeMeta } from '@/lib/marketing-campaign-shared'

interface QuickPromoCodeModalProps {
  open: boolean
  defaultCode?: string
  onClose: () => void
  onCreated: (code: CampaignPromoCodeMeta) => void
}

export default function QuickPromoCodeModal({
  open,
  defaultCode,
  onClose,
  onCreated,
}: QuickPromoCodeModalProps) {
  const [code, setCode] = useState(defaultCode ?? '')
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState<string>('15')
  const [minOrder, setMinOrder] = useState<string>('0')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCode(defaultCode ?? '')
      setType('percentage')
      setValue('15')
      setMinOrder('0')
      setExpiresAt('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, defaultCode])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/campaigns/quick-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discount_type: type,
          discount_value: Number(value),
          min_order_value: Number(minOrder),
          expires_at: expiresAt || null,
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: CampaignPromoCodeMeta
        error?: string
      }
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || 'Aanmaken mislukt')
        return
      }
      toast.success(`Code ${json.data.code} aangemaakt`)
      onCreated(json.data)
    } catch (err) {
      console.error(err)
      toast.error('Onverwachte fout bij aanmaken')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white border-2 border-black w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black">
          <h3 className="font-display text-lg">Nieuwe kortingscode</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Code *
            </label>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KINGSDAY15"
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono uppercase tracking-wider"
              required
              minLength={3}
              maxLength={40}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              3–40 tekens, alleen hoofdletters / cijfers / _ -
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Type *
            </label>
            <div className="inline-flex border-2 border-black w-full">
              <button
                type="button"
                onClick={() => setType('percentage')}
                className={`flex-1 px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  type === 'percentage'
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setType('fixed')}
                className={`flex-1 px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors border-l-2 border-black ${
                  type === 'fixed'
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Vast bedrag
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Waarde *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={type === 'percentage' ? '1' : '0.01'}
                  min="0.01"
                  max={type === 'percentage' ? '100' : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none pr-9"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  {type === 'percentage' ? '%' : '€'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                Min. bestelling
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  €
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Verloopt op (optioneel)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 font-bold uppercase tracking-wider text-sm transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Bezig...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
