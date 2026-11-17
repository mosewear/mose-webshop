/** Shopify uses these same UTC boundaries. Times are midnight in Europe/Amsterdam. */
export const SEASONAL_OFFERS = [
  {
    id: 'black-friday-2026', code: 'MOSEBLACK15', percent: 15,
    startsAt: '2026-11-26T23:00:00Z', endsAt: '2026-11-27T23:00:00Z',
    title: { nl: 'Black Friday', en: 'Black Friday' }, color: '#101512', accent: '#00A676',
  },
  {
    id: 'cyber-monday-2026', code: 'MOSECYBER15', percent: 15,
    startsAt: '2026-11-29T23:00:00Z', endsAt: '2026-11-30T23:00:00Z',
    title: { nl: 'Cyber Monday', en: 'Cyber Monday' }, color: '#092820', accent: '#6BD6AD',
  },
  {
    id: 'christmas-2026', code: 'MOSECHRISTMAS10', percent: 10,
    startsAt: '2026-12-24T23:00:00Z', endsAt: '2026-12-26T23:00:00Z',
    title: { nl: 'Kerst bij MOSE', en: 'Christmas at MOSE' }, color: '#253229', accent: '#E4D8BA',
  },
  {
    id: 'new-year-2027', code: 'MOSENEWYEAR10', percent: 10,
    startsAt: '2026-12-30T23:00:00Z', endsAt: '2027-01-01T23:00:00Z',
    title: { nl: 'De jaarwisseling', en: 'New Year at MOSE' }, color: '#171A19', accent: '#C3D5CB',
  },
] as const

export type SeasonalOffer = (typeof SEASONAL_OFFERS)[number]
export function activeSeasonalOffer(now = Date.now()): SeasonalOffer | undefined {
  return SEASONAL_OFFERS.find(({ startsAt, endsAt }) => Date.parse(startsAt) <= now && now < Date.parse(endsAt))
}
export function isSeasonalCode(code?: string) {
  return SEASONAL_OFFERS.some(offer => offer.code === code?.trim().toUpperCase())
}
