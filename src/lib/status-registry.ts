/**
 * Eén bron voor statuslabels, kleuren en iconen in de admin.
 *
 * Hiervoor stonden er vijf losse statuskaarten in de admin, en die spraken
 * elkaar tegen. Dezelfde zending kon tegelijk indigo zijn in de orderlijst,
 * merkgroen in de retourlijst, oranje op het klantprofiel en roze op het
 * orderdetail. Dezelfde status had vier verschillende labels:
 * "Return aangevraagd", "Retour aangevraagd", "Aangevraagd" en
 * "Retour Aangevraagd".
 *
 * Gevolg voor de beheerder: je kunt niet op kleur leren werken, en een
 * overdracht ("de oranje retouren") betekent niets.
 *
 * Twee regels die hier gelden:
 *  1. Kleur is nooit het enige signaal. Elke toon heeft een eigen icoon, zodat
 *     de status ook leesbaar is bij kleurenblindheid of op een slecht scherm.
 *  2. `paid` betekent iets anders als orderstatus dan als betaalstatus. Die
 *     twee staan in de orderlijst naast elkaar en kregen daar verschillende
 *     kleuren voor hetzelfde woord. Ze hebben hier dus aparte kaarten.
 */

export type StatusTone = 'neutral' | 'info' | 'pending' | 'success' | 'danger' | 'brand'

export type StatusMeta = {
  label: string
  tone: StatusTone
  /** Korte tekstmarkering vóór het label, zodat kleur niet het enige signaal is. */
  mark: string
}

/** Tailwind-klassen per toon. Vierkant en 2px rand, gelijk aan de rest van de admin. */
export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-gray-100 text-gray-800 border-gray-300',
  info: 'bg-blue-50 text-blue-800 border-blue-300',
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
  success: 'bg-green-50 text-green-800 border-green-400',
  danger: 'bg-red-50 text-red-800 border-red-300',
  brand: 'bg-brand-light text-black border-brand-primary',
}

/** Orderstatus (orders.status). */
export const ORDER_STATUS: Record<string, StatusMeta> = {
  pending: { label: 'In afwachting', tone: 'pending', mark: '○' },
  paid: { label: 'Betaald', tone: 'info', mark: '◆' },
  processing: { label: 'In behandeling', tone: 'info', mark: '◆' },
  partially_shipped: { label: 'Deels verzonden', tone: 'brand', mark: '→' },
  shipped: { label: 'Verzonden', tone: 'brand', mark: '→' },
  delivered: { label: 'Afgeleverd', tone: 'success', mark: '✓' },
  cancelled: { label: 'Geannuleerd', tone: 'danger', mark: '✕' },
  return_requested: { label: 'Retour aangevraagd', tone: 'pending', mark: '↩' },
  return_approved: { label: 'Retour goedgekeurd', tone: 'info', mark: '↩' },
  return_rejected: { label: 'Retour afgewezen', tone: 'danger', mark: '✕' },
  return_label_generated: { label: 'Retourlabel klaar', tone: 'info', mark: '↩' },
  return_in_transit: { label: 'Retour onderweg', tone: 'info', mark: '↩' },
  return_received: { label: 'Retour ontvangen', tone: 'neutral', mark: '↩' },
  return_completed: { label: 'Retour afgerond', tone: 'neutral', mark: '✓' },
  returned: { label: 'Geretourneerd', tone: 'neutral', mark: '↩' },
  refund_processing: { label: 'Terugbetaling loopt', tone: 'pending', mark: '⏳' },
  refunded: { label: 'Terugbetaald', tone: 'neutral', mark: '↩' },
}

/** Betaalstatus (orders.payment_status). Bewust los van de orderstatus. */
export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  partially_refunded: { label: 'Deels terugbetaald', tone: 'pending', mark: '↩' },
  authorized: { label: 'Gereserveerd', tone: 'pending', mark: '○' },
  partially_paid: { label: 'Deels betaald', tone: 'pending', mark: '○' },
  paid: { label: 'Betaald', tone: 'success', mark: '✓' },
  pending: { label: 'Wacht op betaling', tone: 'pending', mark: '⏳' },
  unpaid: { label: 'Onbetaald', tone: 'neutral', mark: '○' },
  failed: { label: 'Betaling mislukt', tone: 'danger', mark: '✕' },
  refunded: { label: 'Terugbetaald', tone: 'neutral', mark: '↩' },
  expired: { label: 'Verlopen', tone: 'neutral', mark: '⌛' },
}

/** Retourstatus (returns.status). Deelt de sleutels met ORDER_STATUS waar dat kan. */
export const RETURN_STATUS: Record<string, StatusMeta> = {
  return_requested: { label: 'Aangevraagd', tone: 'pending', mark: '○' },
  return_approved: { label: 'Goedgekeurd', tone: 'info', mark: '◆' },
  return_rejected: { label: 'Afgewezen', tone: 'danger', mark: '✕' },
  return_label_generated: { label: 'Label aangemaakt', tone: 'info', mark: '◆' },
  return_in_transit: { label: 'Onderweg', tone: 'info', mark: '→' },
  return_received: { label: 'Ontvangen', tone: 'neutral', mark: '✓' },
  refund_processing: { label: 'Terugbetaling loopt', tone: 'pending', mark: '⏳' },
  refunded: { label: 'Terugbetaald', tone: 'success', mark: '✓' },
  return_completed: { label: 'Afgerond', tone: 'success', mark: '✓' },
}

const FALLBACK: StatusMeta = { label: 'Onbekend', tone: 'neutral', mark: '?' }

function lookup(map: Record<string, StatusMeta>, status: string | null | undefined): StatusMeta {
  if (!status) return FALLBACK
  return map[status] ?? { ...FALLBACK, label: status.replace(/_/g, ' ') }
}

export const orderStatus = (s?: string | null) => lookup(ORDER_STATUS, s)
export const paymentStatus = (s?: string | null) => lookup(PAYMENT_STATUS, s)
export const returnStatus = (s?: string | null) => lookup(RETURN_STATUS, s)

/** Klassenreeks voor een badge van een gegeven status. */
export function statusClasses(meta: StatusMeta): string {
  return `${TONE_CLASSES[meta.tone]} border-2`
}
