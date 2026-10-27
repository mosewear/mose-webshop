export type IntegrationState = {
  app_installed: boolean
  checkout_enabled: boolean
  catalog_verified: boolean
  inventory_verified: boolean
  benefits_verified: boolean
  fulfillment_verified: boolean
  market_verified: boolean
  last_worker_at: string | null
  last_reconciled_at: string | null
}

export type ReadinessCheck = { key: string; label: string; status: 'verified' | 'missing' | 'unknown' }
export type Readiness = {
  checkedAt: string
  status: 'blocked' | 'unknown' | 'technical_checks_passed'
  checks: ReadinessCheck[]
  counts: { mappings: number | null; released: number | null; pendingEvents: number | null; failedEvents: number | null }
  lastWorkerAt: string | null
  lastReconciledAt: string | null
  oldestPendingAt: string | null
}

export function summarizeReadiness(
  state: IntegrationState | null,
  counts: Readiness['counts'],
  environment: { storefront: boolean; admin: boolean; session: boolean; webhook: boolean; checkout: boolean; benefits: boolean; frontend: boolean; cutover?: boolean; sync?: boolean },
  now = new Date(),
  oldestPendingAt: string | null = null,
): Readiness {
  const check = (key: string, label: string, value: boolean | null): ReadinessCheck => ({
    key, label, status: value === null ? 'unknown' : value ? 'verified' : 'missing',
  })
  const stamp = state?.last_reconciled_at ? Date.parse(state.last_reconciled_at) : NaN
  const age = now.getTime() - stamp
  const fresh = (value: string | null | undefined) => {
    const elapsed = now.getTime() - Date.parse(value ?? '')
    return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 900_000
  }
  const checks = [
    check('storefront', 'Storefront-toegang ingesteld', environment.storefront),
    check('admin', 'Servertoegang voor orders ingesteld', environment.admin),
    check('session', 'Beveiliging van checkoutpogingen ingesteld', environment.session),
    check('webhook', 'Webhookverificatie ingesteld', environment.webhook),
    check('cutover', 'Historische betaalgrens vastgelegd', environment.cutover ?? false),
    check('syncEnabled', 'Orderverwerking en reconciliatie ingeschakeld', environment.sync ?? false),
    check('app', 'Appverbinding geverifieerd', state?.app_installed ?? null),
    check('catalog', 'Catalogus en variantkoppelingen gecontroleerd', state?.catalog_verified ?? null),
    check('stock', 'Voorraadoverdracht gecontroleerd', state?.inventory_verified ?? null),
    check('benefits', 'Kortingen, loyaliteit en tegoeden gecontroleerd', state?.benefits_verified ?? null),
    check('fulfillment', 'Eigen verzending en Tapstitch getest', state?.fulfillment_verified ?? null),
    check('markets', 'Landen, betaalmethoden en verzending gecontroleerd', state?.market_verified ?? null),
    check('sync', 'Reconciliatie maximaal 15 minuten oud', state === null ? null : Number.isFinite(age) && age >= 0 && age <= 900_000),
    check('worker', 'Orderverwerking maximaal 15 minuten oud', state === null ? null : fresh(state.last_worker_at)),
    check('queue', 'Geen orderupdates ouder dan 15 minuten', counts.pendingEvents === null ? null : counts.pendingEvents === 0 ? true : oldestPendingAt === null ? null : fresh(oldestPendingAt)),
    check('events', 'Geen gebeurtenissen in de herstelwachtrij', counts.failedEvents === null ? null : counts.failedEvents === 0),
    check('mappings', 'Catalogusmeting beschikbaar en varianten vrijgegeven', counts.released === null || counts.mappings === null ? null : counts.mappings > 0 && counts.released > 0 && counts.released <= counts.mappings),
    check('switches', 'Checkoutvrijgave op server en website actief', state === null ? null : state.checkout_enabled && environment.checkout && environment.benefits && environment.frontend),
  ]
  return {
    checkedAt: now.toISOString(),
    status: checks.some(c => c.status === 'missing') ? 'blocked' : checks.some(c => c.status === 'unknown') ? 'unknown' : 'technical_checks_passed',
    checks, counts, lastWorkerAt: state?.last_worker_at ?? null, lastReconciledAt: state?.last_reconciled_at ?? null, oldestPendingAt,
  }
}
