'use client'

import { Gift, Info } from 'lucide-react'
import Link from 'next/link'

export interface GiftCardFieldsValue {
  is_gift_card: boolean
  allows_custom_amount: boolean
  gift_card_min_amount: string
  gift_card_max_amount: string
  gift_card_default_validity_months: string
}

interface GiftCardFieldsProps {
  value: GiftCardFieldsValue
  onChange: (next: GiftCardFieldsValue) => void
  variantsHref?: string
}

/**
 * Admin form section for gift-card specific product settings.
 * Shared between the product create and edit pages so the UI stays identical.
 */
export default function GiftCardFields({ value, onChange, variantsHref }: GiftCardFieldsProps) {
  const update = (patch: Partial<GiftCardFieldsValue>) => onChange({ ...value, ...patch })

  const min = parseFloat(value.gift_card_min_amount || '')
  const max = parseFloat(value.gift_card_max_amount || '')
  const customRangeInvalid =
    value.allows_custom_amount &&
    (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min)

  return (
    <div className="border-t-2 border-gray-200 pt-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <Gift className="w-5 h-5 text-brand-primary" />
            Cadeaubon
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Zet dit aan als dit product een cadeaubon is. De productpagina schakelt dan
            automatisch over naar de cadeaubon‑weergave.
          </p>
        </div>
        <label className="inline-flex items-center gap-3 cursor-pointer select-none flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {value.is_gift_card ? 'Aan' : 'Uit'}
          </span>
          <span className="relative">
            <input
              type="checkbox"
              checked={value.is_gift_card}
              onChange={(e) => update({ is_gift_card: e.target.checked })}
              className="sr-only peer"
            />
            <span className="block w-12 h-7 bg-gray-300 peer-checked:bg-brand-primary transition-colors rounded-full" />
            <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
          </span>
        </label>
      </div>

      {value.is_gift_card && (
        <div className="space-y-5 mt-5">
          {/* Explainer */}
          <div className="bg-brand-primary/5 border-2 border-brand-primary/20 p-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  <strong>Bedragen komen uit de varianten.</strong> Zet de{' '}
                  <strong>Maat</strong> op het bedrag-label (bijv. <code>€25</code>) en vul
                  bij <strong>Prijs Aanpassing</strong> het delta-bedrag t.o.v. de basis­prijs
                  in. Het getoonde bedrag = basisprijs + aanpassing.
                </p>
                <p className="text-xs text-gray-600">
                  Tip: zet de basisprijs hierboven op het laagste coupure (bijv. €25). Varianten
                  dan: <code>€25</code> met +0, <code>€50</code> met +25, <code>€100</code>{' '}
                  met +75, enzovoort.
                </p>
                {variantsHref && (
                  <p className="text-xs">
                    <Link
                      href={variantsHref}
                      className="underline font-semibold text-brand-primary hover:text-brand-primary-hover"
                    >
                      → Ga naar Varianten om coupures te beheren
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Custom amount */}
          <div className="border-2 border-gray-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.allows_custom_amount}
                onChange={(e) => update({ allows_custom_amount: e.target.checked })}
                className="w-5 h-5 mt-0.5 border-2 border-gray-300 accent-brand-primary"
              />
              <div className="flex-1">
                <div className="font-bold text-gray-800 uppercase tracking-wide text-sm">
                  Eigen bedrag toestaan
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Klanten kunnen zelf een bedrag kiezen binnen de grenzen hieronder. Naast de
                  vaste coupures verschijnt een &ldquo;Eigen bedrag&rdquo; optie op de productpagina.
                </p>
              </div>
            </label>

            {value.allows_custom_amount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pl-8">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Minimum bedrag (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={value.gift_card_min_amount}
                    onChange={(e) => update({ gift_card_min_amount: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="10.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Maximum bedrag (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={value.gift_card_max_amount}
                    onChange={(e) => update({ gift_card_max_amount: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="500.00"
                  />
                </div>
                {customRangeInvalid && (
                  <p className="sm:col-span-2 text-sm text-red-600 font-semibold">
                    Vul een geldig minimum en maximum in (max moet groter zijn dan min).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Validity months */}
          <div>
            <label
              htmlFor="gift_card_default_validity_months"
              className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2"
            >
              Standaard geldigheid (maanden)
            </label>
            <input
              type="number"
              id="gift_card_default_validity_months"
              min="1"
              max="120"
              step="1"
              value={value.gift_card_default_validity_months}
              onChange={(e) =>
                update({ gift_card_default_validity_months: e.target.value })
              }
              className="w-full sm:w-48 px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nieuwe cadeaubonnen die via dit product worden verkocht krijgen deze geldigheid
              (vervaldatum = aankoopdatum + dit aantal maanden). Leeg laten = onbeperkt geldig.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
