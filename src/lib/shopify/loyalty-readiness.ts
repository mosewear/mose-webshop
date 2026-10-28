type Health = {
  cutover_at?: string | null; review_reference?: string | null; last_worker_at?: string | null
  pending_count?: number | string | null; oldest_pending_at?: string | null; dead_letter_count?: number | string | null
}
/** Computed from real cutover/heartbeat/queue state, not a mutable ready flag. */
export function loyaltyRuntimeReady(health: Health | null | undefined, now = Date.now()) {
  if (!health) return false
  const cutoff = Date.parse(health.cutover_at ?? '')
  const heartbeat = Date.parse(health.last_worker_at ?? '')
  const pending = Number(health.pending_count), dead = Number(health.dead_letter_count)
  const oldest = Date.parse(health.oldest_pending_at ?? '')
  return Number.isFinite(cutoff) && cutoff <= now && Boolean(health.review_reference) &&
    Number.isFinite(heartbeat) && heartbeat <= now + 60_000 && now - heartbeat <= 15 * 60_000 &&
    health.pending_count != null && Number.isSafeInteger(pending) && pending >= 0 &&
    health.dead_letter_count != null && Number.isSafeInteger(dead) && dead === 0 &&
    (pending === 0 || (Number.isFinite(oldest) && oldest <= now + 60_000 && now - oldest <= 15 * 60_000))
}
