import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAuthTimeoutFetch } from '@/lib/supabase/auth-fetch'

const origin = 'https://mose-fixture.supabase.co'
const authUrl = `${origin}/auth/v1/token?grant_type=password`
afterEach(() => vi.useRealTimers())

function pendingTransport() {
  let signal: AbortSignal | undefined
  const transport = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
    signal = init?.signal ?? undefined
    if (signal?.aborted) reject(signal.reason)
    else signal?.addEventListener('abort', () => reject(signal!.reason), { once: true })
  }))
  return { transport, get signal() { return signal! } }
}

describe('Supabase Auth transport deadline', () => {
  it('aborts the underlying sign-in fetch at 12 seconds, rather than merely abandoning its promise', async () => {
    vi.useFakeTimers()
    const pending = pendingTransport()
    const request = createAuthTimeoutFetch(origin, pending.transport)(authUrl, { method: 'POST', body: 'credentials fixture' })
    const rejected = expect(request).rejects.toMatchObject({ name: 'TimeoutError' })
    await vi.advanceTimersByTimeAsync(11_999)
    expect(pending.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(pending.signal.aborted).toBe(true)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['string', 'request'] as const)('preserves caller cancellation and its reason for a %s input', async inputType => {
    vi.useFakeTimers()
    const caller = new AbortController()
    const reason = new Error('Navigation cancelled')
    const pending = pendingTransport()
    const input = inputType === 'string' ? authUrl : new Request(authUrl, { signal: caller.signal })
    const init = inputType === 'string' ? { signal: caller.signal } : undefined
    const request = createAuthTimeoutFetch(origin, pending.transport)(input, init)
    const rejected = expect(request).rejects.toBe(reason)
    caller.abort(reason)
    await rejected
    expect(pending.signal.aborted).toBe(true)
    expect(pending.signal.reason).toBe(reason)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('honours an explicit signal overriding the signal on a Request', async () => {
    vi.useFakeTimers()
    const original = new AbortController()
    const override = new AbortController()
    const pending = pendingTransport()
    const request = createAuthTimeoutFetch(origin, pending.transport)(new Request(authUrl, { signal: original.signal }), { signal: override.signal })
    original.abort()
    expect(pending.signal.aborted).toBe(false)
    const reason = new Error('Caller override')
    const rejected = expect(request).rejects.toBe(reason)
    override.abort(reason)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans up the deadline and abort listener on a successful URL request', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    const removeListener = vi.spyOn(caller.signal, 'removeEventListener')
    const response = new Response('{}', { status: 200 })
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response)
    await expect(createAuthTimeoutFetch(origin, transport)(new URL(authUrl), { signal: caller.signal })).resolves.toBe(response)
    expect(vi.getTimerCount()).toBe(0)
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
    caller.abort()
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(false)
  })

  it('cleans up the timer and listener on a network rejection', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    const removeListener = vi.spyOn(caller.signal, 'removeEventListener')
    const reason = new TypeError('Connection reset')
    const transport = vi.fn<typeof fetch>().mockRejectedValue(reason)
    await expect(createAuthTimeoutFetch(origin, transport)(authUrl, { signal: caller.signal })).rejects.toBe(reason)
    expect(vi.getTimerCount()).toBe(0)
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
  })

  it('respects an explicit null signal instead of inheriting a cancelled Request signal', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    caller.abort()
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    await createAuthTimeoutFetch(origin, transport)(new Request(authUrl, { signal: caller.signal }), { signal: null })
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start a timer when the caller signal is already aborted', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    caller.abort(new Error('Already cancelled'))
    const pending = pendingTransport()
    await expect(createAuthTimeoutFetch(origin, pending.transport)(authUrl, { signal: caller.signal })).rejects.toBe(caller.signal.reason)
    expect(pending.signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['/storage/v1/object/product-images/photo.webp', '/rest/v1/products', 'https://other.example/auth/v1/token'])('leaves non-Auth transport unchanged: %s', async path => {
    vi.useFakeTimers()
    const caller = new AbortController()
    const input = path.startsWith('https:') ? path : `${origin}${path}`
    const init = { method: 'POST', body: 'fixture', signal: caller.signal }
    const response = new Response('{}')
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response)
    await expect(createAuthTimeoutFetch(origin, transport)(input, init)).resolves.toBe(response)
    expect(transport).toHaveBeenCalledWith(input, init)
    expect(transport.mock.calls[0][1]).toBe(init)
    expect(vi.getTimerCount()).toBe(0)
  })
})
