import { afterEach, describe, expect, it, vi } from 'vitest'
import { withDeadline } from '@/lib/request-deadline'

afterEach(() => vi.useRealTimers())
describe('bounded SDK requests', () => {
  it('releases a caller when the SDK never settles, and ignores a late success', async () => {
    vi.useFakeTimers()
    let finish!: (value: string) => void
    const result = withDeadline(new Promise<string>(resolve => { finish = resolve }), 100)
    const assertion = expect(result).rejects.toThrow('REQUEST_TIMEOUT')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    finish('late session')
    await expect(result).rejects.toThrow('REQUEST_TIMEOUT')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('returns successful results without leaving an active timeout', async () => {
    vi.useFakeTimers()
    await expect(withDeadline(Promise.resolve('ok'))).resolves.toBe('ok')
    expect(vi.getTimerCount()).toBe(0)
  })
})
