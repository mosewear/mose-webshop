/** Bound work whose SDK does not expose an AbortSignal (notably Auth). Late
 * completion cannot resume the caller; server authorization remains mandatory. */
export async function withDeadline<T>(operation: PromiseLike<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), milliseconds) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
