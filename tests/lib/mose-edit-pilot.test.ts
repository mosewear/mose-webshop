import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(), postmark: vi.fn(), roep: vi.fn(), htmlToText: vi.fn((html: string) => html),
  usage: vi.fn(), settings: vi.fn(),
}))
const fixture = vi.hoisted(() => ({
  html: '<!doctype html><a href="https://mosewear.com/nl/product/mose-essential-hoodie?color=Groen&amp;utm_content=hero--a">Hoodie</a>',
  email: 'allowed@example.test', start: '2026-11-02T18:15:00.000Z', end: '2026-11-02T22:15:00.000Z',
}))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/toestemming', () => ({ postmark: mocks.postmark, leesInstellingen: mocks.settings, verstuurdLaatste30Dagen: mocks.usage, ORDERRESERVE: 1500 }))
vi.mock('@/lib/brevo', () => ({ roep: mocks.roep }))
vi.mock('@/lib/postmark', () => ({ htmlToText: mocks.htmlToText }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/mose-edit-pilot-config-server', async () => {
  const { createHash } = await import('node:crypto')
  return { MOSE_EDIT_PILOT_CONFIG_READY: true, MOSE_EDIT_PILOT_CONFIG: {
    campaignId: 'pilot-id', slug: 'mose-edit-01-hoodie', subject: 'Jouw hoodie, in drie kleuren',
    htmlSha256: createHash('sha256').update(fixture.html).digest('hex'),
    startAt: fixture.start, endAt: fixture.end, momentLabel: 'Proefgroep: bevestigd',
    minimumGapDays: 7, maximumCommercialEmails30d: 2, batchSize: 25,
    roster: [{ id: 'subscriber-id', emailHash: createHash('sha256').update(fixture.email).digest('hex'), proofKind: 'confirmed', source: 'admin_import' }],
  } }
})
import { eligiblePilotRecipients, hasPilotConsent, pilotFrequency, pilotMail, runMoseEditPilot } from '@/lib/mose-edit-pilot'

const DAY = 86_400_000
const NOW = Date.parse(fixture.start) + 60_000
const at = (days: number, extraMs = 0) => new Date(NOW - days * DAY + extraMs).toISOString()

describe('pilot frequency', () => {
  it('requires an explicit three-message exception and still prevents a fourth message', () => {
    const history = [{ id: 'first', at: at(7) }, { id: 'second', at: at(1) }]
    expect(pilotFrequency(history, NOW, 0)).toBe(false)
    expect(pilotFrequency(history, NOW, 0, 3)).toBe(true)
    expect(pilotFrequency([...history, { id: 'third', at: at(0) }], NOW, 0, 3)).toBe(false)
    expect(pilotFrequency(history, NOW, 0, 4)).toBe(false)
  })
  it('allows the explicitly authorized immediate send while retaining the two-in-thirty cap', () => {
    expect(pilotFrequency([{ id: 'yesterday', at: at(1) }], NOW, 0)).toBe(true)
    expect(pilotFrequency([{ id: 'yesterday', at: at(1) }, { id: 'welcome', at: at(2) }], NOW, 0)).toBe(false)
    expect(pilotFrequency([{ id: 'future', at: at(-1) }], NOW, 0)).toBe(false)
  })
  it('requires a full seven-day gap, including the exact boundary', () => {
    expect(pilotFrequency([], NOW)).toBe(true)
    expect(pilotFrequency([{ id: 'one', at: at(7) }], NOW)).toBe(true)
    expect(pilotFrequency([{ id: 'one', at: at(7, 1) }], NOW)).toBe(false)
    expect(pilotFrequency([{ id: 'one', at: at(6) }], NOW)).toBe(false)
  })

  it('counts fewer than two sends in the open rolling thirty-day window', () => {
    expect(pilotFrequency([{ id: 'one', at: at(8) }, { id: 'two', at: at(29) }], NOW)).toBe(false)
    expect(pilotFrequency([{ id: 'one', at: at(8) }, { id: 'two', at: at(30) }], NOW)).toBe(true)
    expect(pilotFrequency([{ id: 'one', at: at(8) }, { id: 'two', at: at(30, 1) }], NOW)).toBe(false)
  })

  it('deduplicates local/provider records by message ID and uses the latest timestamp conservatively', () => {
    expect(pilotFrequency([{ id: 'same-message', at: at(8) }, { id: 'same-message', at: at(8) }], NOW)).toBe(true)
    expect(pilotFrequency([{ id: 'same-message', at: at(8) }, { id: 'same-message', at: at(6) }], NOW)).toBe(false)
  })

  it('fails closed for missing IDs, invalid timestamps, future sends or invalid current time', () => {
    expect(pilotFrequency([{ id: '', at: at(8) }], NOW)).toBe(false)
    expect(pilotFrequency([{ id: 'x', at: 'not-a-date' }], NOW)).toBe(false)
    expect(pilotFrequency([{ id: 'x', at: at(-1) }], NOW)).toBe(false)
    expect(pilotFrequency([], Number.NaN)).toBe(false)
    expect(pilotFrequency([], Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('expanded signup evidence', () => {
  it('accepts a deliberate website signup older than ninety days without requiring a new confirmation', () => {
    expect(hasPilotConsent({ source: 'early_access_landing', subscribed_at: at(240) }, { status: 'verzonden', groep: 'particulier', bevestigd_op: null }, 'site-signup', NOW)).toBe(true)
    expect(hasPilotConsent({ source: 'homepage', subscribed_at: at(200) }, undefined, 'site-signup', NOW)).toBe(true)
  })
  it('never promotes a silent import or historical checkout checkbox to website signup proof', () => {
    for (const source of ['admin_import', 'checkout']) expect(hasPilotConsent({ source, subscribed_at: at(1) }, undefined, 'site-signup', NOW)).toBe(false)
  })
  it('rejects withdrawn, test, held, stale, future and malformed signup evidence', () => {
    const signup = { source: 'early_access', subscribed_at: at(200) }
    for (const status of ['afgemeld', 'bounce', 'klacht', 'vastgehouden']) expect(hasPilotConsent(signup, { status, groep: 'particulier', bevestigd_op: null }, 'site-signup', NOW)).toBe(false)
    expect(hasPilotConsent(signup, { status: 'verzonden', groep: 'test', bevestigd_op: null }, 'site-signup', NOW)).toBe(false)
    for (const date of [at(366), at(-1), 'invalid']) expect(hasPilotConsent({ ...signup, subscribed_at: date }, undefined, 'site-signup', NOW)).toBe(false)
  })
})

describe('pilot link preparation', () => {
  it('is idempotent, preserves colour and link position, and adds the moment separately', () => {
    const first = pilotMail(fixture.html, 'Proefgroep: bevestigd (2 november)')
    const second = pilotMail(first.html, 'Proefgroep: bevestigd (2 november)')
    expect(second.html).toBe(first.html)
    expect(first.html).toContain('&amp;utm_campaign=mose-edit-01-hoodie')
    expect(first.html).not.toContain('&amp;amp;')
    const encoded = first.html.match(/href="([^"]+)"/)![1]
    const url = new URL(encoded.replaceAll('&amp;', '&'))
    expect(url.searchParams.get('color')).toBe('Groen')
    expect(url.searchParams.get('utm_content')).toBe('hero--a')
    expect(url.searchParams.get('utm_term')).toBe('proefgroep-bevestigd-2-november')
    expect(url.searchParams.getAll('utm_campaign')).toEqual(['mose-edit-01-hoodie'])
    expect(first.tekst).toContain('Hoodie (https://mosewear.com/nl/product/mose-essential-hoodie?')
  })

  it('replaces repeated tracking fields without altering unsubscribe or service links', () => {
    const html = '<a href="https://www.mosewear.com/nl/shop?utm_campaign=old&amp;utm_campaign=other&amp;utm_source=x">Shop</a><a href="{{{ pm:unsubscribe }}}" data-pm-no-track>Uit</a><a href="mailto:info@mosewear.com">Vraag</a>'
    const result = pilotMail(html, 'Proef').html
    const url = new URL(result.match(/href="([^"]+)"/)![1].replaceAll('&amp;', '&'))
    expect(url.searchParams.getAll('utm_campaign')).toEqual(['mose-edit-01-hoodie'])
    expect(url.searchParams.getAll('utm_source')).toEqual(['nieuwsbrief'])
    expect(result).toContain('href="{{{ pm:unsubscribe }}}" data-pm-no-track')
    expect(result).toContain('href="mailto:info@mosewear.com"')
  })

  it('does not rewrite another host that merely starts with the store hostname', () => {
    const html = '<a href="https://mosewear.com.example.test/nl/shop?a=1&amp;b=2">Other</a>'
    expect(pilotMail(html, 'Proef').html).toBe(html)
  })
})

type Scenario = {
  productPrice: number
  availableColors: string[]
  consentDate: string
  existing: Array<{ email: string; status: string }>
  duplicateClaim: boolean
  sendOutcome: 'ok' | 'ambiguous' | 'missing-id'
  subscriberFreshStatus: string
  history: Array<{ email: string; status: string; postmark_id: string; campagne_id: string; verzonden_op: string }>
  providerHistory: Array<{ MessageID: string; ReceivedAt: string; MessageStream: string }>
  updates: Array<{ table: string; values: Record<string, unknown>; filters: Array<[string, unknown]> }>
}
let scenario: Scenario

function databaseQuery(table: string) {
  let operation = 'select'
  let single = false
  let values: Record<string, unknown> = {}
  const filters: Array<[string, unknown]> = []
  const execute = () => {
    if (operation === 'update') {
      scenario.updates.push({ table, values, filters })
      return { data: table === 'campagne_ontvangers' ? [{ email: fixture.email }] : [{ id: 'id' }], error: null }
    }
    if (operation === 'upsert') return { data: scenario.duplicateClaim ? [] : [{ email: fixture.email }], error: null }
    let data: unknown
    if (table === 'newsletter_subscribers') {
      data = { id: 'subscriber-id', email: fixture.email, source: 'admin_import', subscribed_at: at(200), status: single ? scenario.subscriberFreshStatus : 'active', suppressed_at: null, bounced_at: null, unsubscribed_at: null }
      if (!single) data = [data]
    } else if (table === 'toestemming_ontvangers') data = [{ email: fixture.email, status: 'bevestigd', groep: 'legacy', bevestigd_op: scenario.consentDate }]
    else if (table === 'campagne_ontvangers') data = filters.some(([key]) => key === 'campagne_id') ? scenario.existing : scenario.history
    else if (table === 'campagnes') data = { status: 'actief' }
    else if (table === 'products') data = { base_price: scenario.productPrice, sale_price: null, is_active: true, product_variants: scenario.availableColors.map(color => ({ color, is_available: true, stock_quantity: 10 })) }
    else data = []
    return { data, error: null }
  }
  const q = {
    select: () => q,
    in: (key: string, value: unknown) => { filters.push([key, value]); return q },
    eq: (key: string, value: unknown) => { filters.push([key, value]); return q },
    gte: (key: string, value: unknown) => { filters.push([key, value]); return q },
    single: () => { single = true; return q },
    update: (input: Record<string, unknown>) => { operation = 'update'; values = input; return q },
    upsert: (input: Record<string, unknown>, options: unknown) => {
      expect(options).toEqual({ onConflict: 'campagne_id,email', ignoreDuplicates: true })
      operation = 'upsert'; values = input; return q
    },
    then: (resolve: (v: ReturnType<typeof execute>) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(execute()).then(resolve, reject),
  }
  return q
}

beforeEach(() => {
  scenario = { productPrice: 79, availableColors: ['Bruin', 'Groen', 'Zwart'], consentDate: at(5), existing: [], duplicateClaim: false, sendOutcome: 'ok', subscriberFreshStatus: 'active', history: [], providerHistory: [], updates: [] }
  mocks.from.mockReset().mockImplementation(databaseQuery)
  mocks.usage.mockReset().mockResolvedValue(100)
  mocks.settings.mockReset().mockResolvedValue({ postmark_bundel: 10000 })
  mocks.roep.mockReset().mockResolvedValue({ ok: true, status: 200, data: { emailBlacklisted: false, statistics: { messagesSent: [] } } })
  mocks.postmark.mockReset().mockImplementation(async (requestPath: string) => {
    if (requestPath === '/message-streams') return { status: 200, data: { MessageStreams: [{ ID: 'campagnes', MessageStreamType: 'Broadcasts', ArchivedAt: null }] } }
    if (requestPath.includes('/suppressions/dump')) return { status: 200, data: { Suppressions: [] } }
    if (requestPath.startsWith('/messages/outbound?')) return { status: 200, data: { TotalCount: scenario.providerHistory.length, Messages: scenario.providerHistory } }
    if (requestPath.startsWith('/stats/outbound?')) return { status: 200, data: { Bounced: 0, SpamComplaints: 0 } }
    if (requestPath === '/email') {
      if (scenario.sendOutcome === 'ambiguous') throw new Error('Connection lost after POST')
      if (scenario.sendOutcome === 'missing-id') return { status: 200, data: { ErrorCode: 0 } }
      return { status: 200, data: { ErrorCode: 0, MessageID: 'submitted-id', SubmittedAt: new Date(NOW).toISOString() } }
    }
    throw new Error('Unexpected request '+requestPath)
  })
})

const campaign = () => ({ id: 'pilot-id', slug: 'mose-edit-01-hoodie', onderwerp: 'Jouw hoodie, in drie kleuren', html: fixture.html, status: 'actief' })
const moment = () => ({ id: 'moment-id', label: 'Proefgroep: bevestigd', start_op: fixture.start })
const sendCalls = () => mocks.postmark.mock.calls.filter(([requestPath]) => requestPath === '/email')

describe('pilot eligibility and dispatch', () => {
  it('retries a temporary read rate limit but never repeats an email POST', async () => {
    vi.useFakeTimers()
    try {
      mocks.postmark.mockResolvedValueOnce({ status: 429, data: null })
      const pending = runMoseEditPilot(campaign(), moment(), NOW)
      await vi.runAllTimersAsync()
      expect((await pending).verzonden).toBe(1)
      expect(mocks.postmark.mock.calls.filter(([path]) => path.startsWith('/stats/outbound?'))).toHaveLength(2)
      expect(sendCalls()).toHaveLength(1)
    } finally { vi.useRealTimers() }
  })
  it('stops before sending if the advertised price or a colour changes', async () => {
    scenario.productPrice = 89
    expect((await runMoseEditPilot(campaign(), moment(), NOW)).reden).toContain('Hoodieprijs')
    scenario.productPrice = 79
    scenario.availableColors = ['Groen', 'Zwart']
    expect((await runMoseEditPilot(campaign(), moment(), NOW)).reden).toContain('Hoodieprijs')
    expect(sendCalls()).toHaveLength(0)
  })
  it('rejects invalid or future confirmation dates, accepts the exact ninety-day boundary', async () => {
    scenario.consentDate = 'not-a-date'
    expect(await eligiblePilotRecipients(NOW)).toEqual([])
    scenario.consentDate = at(-1)
    expect(await eligiblePilotRecipients(NOW)).toEqual([])
    scenario.consentDate = at(90)
    expect(await eligiblePilotRecipients(NOW)).toEqual([fixture.email])
    scenario.consentDate = at(90, -1)
    expect(await eligiblePilotRecipients(NOW)).toEqual([])
  })

  it('counts a local and provider record of the same real send once', async () => {
    scenario.history = [{ email: fixture.email, status: 'verzonden', postmark_id: 'same-id', campagne_id: 'previous', verzonden_op: at(8) }]
    scenario.providerHistory = [{ MessageID: 'same-id', ReceivedAt: at(8), MessageStream: 'campagnes' }]
    expect(await eligiblePilotRecipients(NOW)).toEqual([fixture.email])
  })

  it('does not POST mail when another process already owns the atomic claim', async () => {
    scenario.duplicateClaim = true
    const result = await runMoseEditPilot(campaign(), moment(), NOW)
    expect(result.verzonden).toBe(0)
    expect(sendCalls()).toHaveLength(0)
    expect(scenario.updates.filter(u => u.table === 'campagne_ontvangers')).toHaveLength(0)
  })

  it('fails closed after an ambiguous send, leaving the claim pending for reconciliation', async () => {
    scenario.sendOutcome = 'ambiguous'
    const result = await runMoseEditPilot(campaign(), moment(), NOW)
    expect(sendCalls()).toHaveLength(1)
    expect(result.verzonden).toBe(0)
    expect(scenario.updates).toContainEqual(expect.objectContaining({ table: 'campagnes', values: expect.objectContaining({ status: 'gestopt' }) }))
    expect(scenario.updates.filter(u => u.table === 'campagne_ontvangers')).toHaveLength(0)
    scenario.existing = [{ email: fixture.email, status: 'bezig' }]
    await runMoseEditPilot(campaign(), moment(), NOW)
    expect(sendCalls()).toHaveLength(1)
  })

  it('refuses to treat a successful-looking response without MessageID as sent', async () => {
    scenario.sendOutcome = 'missing-id'
    const result = await runMoseEditPilot(campaign(), moment(), NOW)
    expect(result.verzonden).toBe(0)
    expect(result.mislukt).toBe(1)
    expect(scenario.updates).toContainEqual(expect.objectContaining({ table: 'campagne_ontvangers', values: expect.objectContaining({ status: 'mislukt' }) }))
    expect(scenario.updates).toContainEqual(expect.objectContaining({ table: 'campagnes', values: expect.objectContaining({ status: 'gestopt' }) }))
  })

  it('rechecks local opt-out immediately before claiming a recipient', async () => {
    scenario.subscriberFreshStatus = 'unsubscribed'
    const result = await runMoseEditPilot(campaign(), moment(), NOW)
    expect(result.verzonden).toBe(0)
    expect(sendCalls()).toHaveLength(0)
  })

  it('sends once with an exact production tag, tracking and a status-guarded ledger update', async () => {
    const result = await runMoseEditPilot(campaign(), moment(), NOW)
    expect(result.verzonden).toBe(1)
    expect(sendCalls()).toHaveLength(1)
    const payload = JSON.parse(sendCalls()[0][1].body)
    expect(payload).toMatchObject({ To: fixture.email, MessageStream: 'campagnes', Tag: 'mose-edit-01-hoodie', TrackLinks: 'HtmlAndText', TrackOpens: false })
    const finalUpdate = scenario.updates.find(u => u.table === 'campagne_ontvangers' && u.values.status === 'verzonden')
    expect(finalUpdate?.filters).toContainEqual(['status', 'bezig'])
  })

  it('does not send before the window, after the window or when approved content changed', async () => {
    await runMoseEditPilot(campaign(), moment(), Date.parse(fixture.start) - 1)
    await runMoseEditPilot(campaign(), moment(), Date.parse(fixture.end))
    await runMoseEditPilot({ ...campaign(), html: fixture.html+'modified' }, moment(), NOW)
    expect(sendCalls()).toHaveLength(0)
    expect(scenario.updates).toContainEqual(expect.objectContaining({ table: 'campagnes', values: expect.objectContaining({ status: 'gestopt' }) }))
  })
})
