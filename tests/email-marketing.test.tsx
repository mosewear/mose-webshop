import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import EmailMarketingAdmin from '@/app/admin/email-marketing/EmailMarketingAdmin'

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('@/app/admin/toestemming/ToestemmingAdmin', () => ({ default: () => <div>Toestemmingsronde</div> }))

const cijfers = (verzonden: number) => ({ verzonden, bounces: 0, klachten: 0, afgemeld: 0, mislukt: 0, orders: 0, omzet: 0 })
const data = {
  ok: true,
  lijst: { totaal: 9052, wachtrij: 0, vastgehouden: 0, verzonden: 9052, bevestigd: 21, afgemeld: 429, bounces: 122, klachten: 3, mislukt: 0, abonneesSite: 110 },
  campagnes: [{ id: 'herfst', slug: 'herfst-2026', naam: 'Herfstcampagne', onderwerp: 'Tijd voor je favoriete hoodie', status: 'klaar', stopreden: null, wachttijd_minuten: 90, min_dagen_tussen: 6, per_run: 250 }],
  momenten: [
    { id: 'brevo', campagne_id: 'herfst', label: 'Brevo: eerste 1.000', start_op: '2026-10-25T08:31:00Z', aandeel: 'rest', status: 'klaar', cijfers: cijfers(1000) },
    { id: 'postmark', campagne_id: 'herfst', label: 'Postmark: resterende ontvangers', start_op: '2026-10-25T11:56:00Z', aandeel: 'rest', status: 'klaar', cijfers: cijfers(7553) },
    { id: 'oud', campagne_id: 'herfst', label: 'Oude overgeslagen planning', start_op: '2026-10-29T18:00:00Z', aandeel: 'rest', status: 'overgeslagen', cijfers: null },
  ],
  doelgroepNu: 8499,
  bundel: { verstuurd30d: 16690, grootte: 51500, grens: 50000 },
  verkeer: [], bezoekersPerMoment: {}, brevo: { campagnes: [] }, postmark: null,
}
const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => data })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Gecombineerde e-mailcampagne', () => {
  it('toont 8.553 totaal en beide providers zonder oude planningen of herstartknop', async () => {
    render(<EmailMarketingAdmin />)
    const card = (await screen.findByRole('heading', { name: 'Herfstcampagne' })).closest('article')!
    expect(within(card).getByText('8.553')).toBeInTheDocument()
    expect(within(card).getByText('1.000')).toBeInTheDocument()
    expect(within(card).getByText('7.553')).toBeInTheDocument()
    expect(screen.queryByText('Oude overgeslagen planning')).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Activeer' })).not.toBeInTheDocument()
    expect(within(card).getByText('Instellingen en testmail').closest('details')).not.toHaveAttribute('open')
  })

  it('behoudt de geladen totalen als handmatig verversen mislukt', async () => {
    render(<EmailMarketingAdmin />)
    await screen.findByText('8.553')
    fetchMock.mockRejectedValueOnce(new Error('Verbinding tijdelijk weg'))
    fireEvent.click(screen.getByRole('button', { name: 'Ververs cijfers' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Verbinding tijdelijk weg')
    expect(screen.getByText('8.553')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ververs cijfers' })).toBeEnabled()
  })
})
