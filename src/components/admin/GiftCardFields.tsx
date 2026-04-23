'use client'

import { Gift, Info, Package, Check } from 'lucide-react'
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
 *
 * Renders as a prominent "product type" selector so admins immediately
 * see which mode the product is in. When toggled on, the surrounding
 * form is expected to hide non-applicable fields (sale price, staffel,
 * etc.) — the parent page is responsible for that.
 */
export default function GiftCardFields({ value, onChange, variantsHref }: GiftCardFieldsProps) {
  const update = (patch: Partial<GiftCardFieldsValue>) => onChange({ ...value, ...patch })

  const min = parseFloat(value.gift_card_min_amount || '')
  const max = parseFloat(value.gift_card_max_amount || '')
  const customRangeInvalid =
    value.allows_custom_amount &&
    (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min)

  const isOn = value.is_gift_card

  return (
    <div
      className={`border-2 transition-colors ${
        isOn
          ? 'border-brand-primary bg-brand-primary/5'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* ------- Header / toggle row ------- */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div
              className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center transition-colors ${
                isOn
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isOn ? <Gift className="w-5 h-5 sm:w-6 sm:h-6" /> : <Package className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                Producttype
              </div>
              <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {isOn ? 'Cadeaubon' : 'Standaard product'}
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-snug">
                {isOn
                  ? 'Varianten fungeren als coupures. Productpagina en winkelwagen schakelen automatisch naar de cadeaubon‑modus.'
                  : 'Normaal fysiek product met maten, voorraad en verzending. Zet aan om er een cadeaubon van te maken.'}
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-3 cursor-pointer select-none flex-shrink-0 self-end sm:self-auto">
            <span
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${
                isOn ? 'text-brand-primary' : 'text-gray-500'
              }`}
            >
              {isOn ? 'Aan' : 'Uit'}
            </span>
            <span className="relative">
              <input
                type="checkbox"
                checked={isOn}
                onChange={(e) => update({ is_gift_card: e.target.checked })}
                className="sr-only peer"
                aria-label="Dit product is een cadeaubon"
              />
              <span className="block w-12 h-7 bg-gray-300 peer-checked:bg-brand-primary transition-colors rounded-full" />
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
            </span>
          </label>
        </div>
      </div>

      {/* ------- Gift-card details (expands when toggle is on) ------- */}
      {isOn && (
        <div className="border-t-2 border-brand-primary/20 bg-white p-4 sm:p-5 space-y-5">
          {/* Quick behaviour summary — what flips when this is a gift card */}
          <div className="bg-brand-primary/5 border-2 border-brand-primary/20 p-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-gray-900 uppercase tracking-wide text-xs">
                  Wat verandert er door deze toggle?
                </p>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Varianten worden coupures</strong> (bijv. €25 / €50 / €100), geen maten.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Sale prijs en staffelkorting zijn uitgeschakeld</strong> — cadeaubonnen
                      hebben altijd hun nominale waarde.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Voorraad en verzending vervallen</strong> — de bon wordt digitaal per
                      e-mail bezorgd.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                    <span>
                      De <strong>productpagina</strong> krijgt automatisch de cadeaubon‑weergave
                      (denominaties + optioneel cadeau-aan-ontvanger-flow).
                    </span>
                  </li>
                </ul>
                <p className="text-xs text-gray-600 pt-1">
                  Tip: zet de basisprijs hieronder op het laagste coupure (bijv. €25). Varianten
                  dan: <code className="px-1 bg-white border border-gray-200 rounded">€25</code> met
                  +0, <code className="px-1 bg-white border border-gray-200 rounded">€50</code> met
                  +25, <code className="px-1 bg-white border border-gray-200 rounded">€100</code>{' '}
                  met +75, enzovoort.
                </p>
                {variantsHref && (
                  <p className="text-xs pt-1">
                    <Link
                      href={variantsHref}
                      className="underline font-bold text-brand-primary hover:text-brand-primary-hover"
                    >
                      → Ga naar Coupures om bedragen te beheren
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Custom amount */}
          <div className="border-2 border-gray-200 p-4 bg-white">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.allows_custom_amount}
                onChange={(e) => update({ allows_custom_amount: e.target.checked })}
                className="w-5 h-5 mt-0.5 border-2 border-gray-300 accent-brand-primary flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 uppercase tracking-wide text-sm">
                  Eigen bedrag toestaan
                </div>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  Klanten kunnen zelf een bedrag kiezen binnen de grenzen hieronder. Naast de
                  vaste coupures verschijnt een &ldquo;Eigen bedrag&rdquo;-optie op de productpagina.
                </p>
              </div>
            </label>

            {value.allows_custom_amount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 sm:pl-8">
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
            <p className="text-xs text-gray-500 mt-1 leading-snug">
              Nieuwe cadeaubonnen die via dit product worden verkocht krijgen deze geldigheid
              (vervaldatum = aankoopdatum + dit aantal maanden). Leeg laten = onbeperkt geldig.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
