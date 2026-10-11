import 'server-only'

import { createAnonClient } from '@/lib/supabase/server'

/**
 * Server-side lezen van site_settings.
 *
 * Bestaat naast `@/lib/settings`, dat de BROWSER-client importeert en dus niet
 * thuishoort in `generateMetadata` of een server component. Voor die plekken
 * stond het ophaalpatroon tot nu toe gedupliceerd in de pagina's zelf, met per
 * kopie een eigen fallback die niet met de database overeenkwam.
 *
 * De fallbacks hieronder zijn bewust gelijk aan de waarden in site_settings.
 * Een fallback die een gunstiger belofte doet dan de echte instelling is een
 * belofte die in de checkout breekt.
 */
export type CommercePromises = {
  free_shipping_threshold: number
  shipping_cost: number
  return_days: number
  return_label_cost_incl_btw: number
}

const DEFAULTS: CommercePromises = {
  free_shipping_threshold: 150,
  shipping_cost: 6.95,
  return_days: 30,
  return_label_cost_incl_btw: 6.95,
}

export async function getCommercePromises(): Promise<CommercePromises> {
  try {
    const supabase = createAnonClient()
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'free_shipping_threshold',
        'shipping_cost',
        'return_days',
        'return_label_cost_incl_btw',
      ])

    const map: Record<string, unknown> = {}
    ;(data ?? []).forEach((row: { key: string; value: unknown }) => {
      map[row.key] = row.value
    })

    const num = (key: keyof CommercePromises) => {
      const parsed = parseFloat(String(map[key]))
      return Number.isFinite(parsed) ? parsed : DEFAULTS[key]
    }

    return {
      free_shipping_threshold: num('free_shipping_threshold'),
      shipping_cost: num('shipping_cost'),
      return_days: Math.round(num('return_days')),
      return_label_cost_incl_btw: num('return_label_cost_incl_btw'),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Formatteert een bedrag zoals de storefront het toont: 150 → "150", 6.95 → "6,95". */
export function formatPromiseAmount(amount: number, locale: string): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
