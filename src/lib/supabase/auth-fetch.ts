/** Abort the actual Auth transport so GoTrue can release its session lock.
 * REST queries and potentially long Storage uploads keep their own policies. */
export function createAuthTimeoutFetch(supabaseUrl: string, transport: typeof fetch = globalThis.fetch.bind(globalThis)): typeof fetch {
  const origin = new URL(supabaseUrl).origin
  return async (input, init) => {
    let url: URL
    try {
      const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      url = new URL(address, supabaseUrl)
    } catch {
      // Preserve native fetch validation for malformed inputs.
      return transport(input, init)
    }
    if (url.origin !== origin || !url.pathname.startsWith('/auth/v1/')) return transport(input, init)

    // An explicit init.signal overrides a Request's signal, including null,
    // matching native fetch semantics. Otherwise inherit the Request signal.
    const callerSignal = init?.signal !== undefined
      ? init.signal
      : typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined
    const controller = new AbortController()
    const abortFromCaller = () => controller.abort(callerSignal?.reason)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (callerSignal?.aborted) abortFromCaller()
    else {
      callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
      timer = setTimeout(() => controller.abort(new DOMException('Authentication request timed out', 'TimeoutError')), 12_000)
    }
    try {
      return await transport(input, { ...init, signal: controller.signal })
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      callerSignal?.removeEventListener('abort', abortFromCaller)
    }
  }
}
