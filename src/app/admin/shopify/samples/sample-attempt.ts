export const sampleAttemptKey = 'mose-admin-sample-attempt-v1'
type Attempt = { id: string; variants: string[] }
function parse(raw: string): Attempt {
 const value = JSON.parse(raw)
 if (!value || typeof value.id !== 'string' || !Array.isArray(value.variants) || value.variants.length !== 8 || value.variants.some((v: unknown) => typeof v !== 'string')) throw new Error('Een eerdere poging moet eerst worden gecontroleerd.')
 return value
}
/** Call while holding the same browser lock for reads, creation and removal. */
export function readSampleAttempt(shared: Storage, legacy: Storage): Attempt | null {
 const current = shared.getItem(sampleAttemptKey), previous = legacy.getItem(sampleAttemptKey)
 if (current && previous && parse(current).id !== parse(previous).id) throw new Error('Er zijn verschillende eerdere pogingen. Laat deze eerst controleren voordat je verdergaat.')
 const raw = current || previous
 if (!raw) return null
 const attempt = parse(raw)
 if (!current) shared.setItem(sampleAttemptKey, raw)
 // Remove only after durable storage succeeded; never discard an uncertain attempt.
 if (previous) legacy.removeItem(sampleAttemptKey)
 return attempt
}
export function reserveSampleAttempt(shared: Storage, legacy: Storage, variants: string[], newId: () => string): Attempt {
 const prior = readSampleAttempt(shared, legacy)
 if (prior) {
  if (JSON.stringify([...prior.variants].sort()) !== JSON.stringify([...variants].sort())) throw new Error('Je eerdere poging gebruikt andere maten. Rond die poging eerst af of laat hem controleren.')
  return prior
 }
 const attempt = { id: newId(), variants }
 shared.setItem(sampleAttemptKey, JSON.stringify(attempt))
 return attempt
}
export async function withSampleAttemptLock<T>(work: () => T | Promise<T>): Promise<T> {
 if (!navigator.locks) throw new Error('Deze browser kan de afrekenpoging niet veilig tussen tabbladen bewaren. Gebruik een actuele versie van Chrome.')
 return navigator.locks.request(sampleAttemptKey, work)
}
