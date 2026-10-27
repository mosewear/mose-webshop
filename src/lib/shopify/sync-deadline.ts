/** Propagate the invocation budget to PostgREST; a timed-out lease is recovered by SQL. */
export function boundedSyncQuery<T>(query: PromiseLike<T> & { abortSignal(signal: AbortSignal): PromiseLike<T> }, signal?: AbortSignal): PromiseLike<T> {
  return signal ? query.abortSignal(signal) : query
}
export function assertSyncBudget(signal?: AbortSignal, deadline = Infinity) {
  if (signal?.aborted || Date.now() >= deadline) throw new Error('SYNC_TIME_BUDGET')
}
