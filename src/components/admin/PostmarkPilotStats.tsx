import type { PostmarkCampaignReport } from '@/lib/postmark-campaign-report'

/** Read-only provider counts plus explicitly qualified post-click paid-order matching. */
export default function PostmarkPilotStats({ report }: { report: PostmarkCampaignReport | undefined }) {
  if (!report) return null
  if (report.status === 'unavailable') {
    return <p role="status" className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{report.error} De campagneadministratie hieronder blijft beschikbaar.</p>
  }
  const c = report.counts
  const formatted = (value: number | null) => value === null ? '–' : value.toLocaleString('nl-NL')
  const values: Array<[string, number | null, string]> = [
    ['Verstuurd door Postmark', c.sent, 'Exact deze campagne; testmails uitgesloten'],
    ['Afgeleverd', c.delivered, 'Nog niet afzonderlijk gemeten'],
    ['Unieke linkklikken', c.uniqueLinkClicks, 'Per link en bericht; geen unieke personen'],
    ['Alle linkklikken', c.totalClicks, 'Inclusief herhaalde en mogelijke automatische klikken'],
  ]
  return (
    <section aria-label="Postmark-statistieken van deze campagne" className="border-t border-gray-200">
      <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-4">
        {values.map(([label, value, explanation]) => (
          <div key={label} className="bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatted(value)}</p>
            <p className="mt-1 text-xs text-gray-500">{explanation}</p>
          </div>
        ))}
      </div>
      <p className="px-3 py-2 text-xs text-gray-500">
        Postmark: {formatted(c.withLinkTracking)} van {formatted(c.sent)} berichten met klikmeting.
        {' '}Linkklikken zijn geen unieke klikkende personen.
        {' '}Providercijfers kunnen later binnenkomen. Opgehaald om {new Date(report.checkedAt).toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' })}.
      </p>
      {report.clickOrders && <div className="border-t border-gray-200">
        <div className="grid grid-cols-1 gap-px bg-gray-200 md:grid-cols-2">
          <div className="bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Betaalde orders na klik, 7 dagen</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatted(report.clickOrders.paidOrders7d)}</p>
          </div>
          <div className="bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Betaald bedrag na klik, 7 dagen</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{report.clickOrders.paidRevenue7d === null ? '–' : report.clickOrders.paidRevenue7d.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</p>
          </div>
        </div>
        {report.clickOrders.error && <p role="status" className="px-3 py-2 text-xs text-amber-900">{report.clickOrders.error} De uitkomst is onbekend, niet nul.</p>}
        <p className="px-3 py-2 text-xs text-gray-500">{report.clickOrders.coverageNote}</p>
      </div>}
    </section>
  )
}
