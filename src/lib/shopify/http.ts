import { timingSafeEqual } from 'node:crypto'

export async function readLimitedBody(request: Request, limit: number): Promise<Buffer> {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('MISSING_BODY')
  const chunks: Uint8Array[] = []
  let bytes = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return Buffer.concat(chunks)
    bytes += value.byteLength
    if (bytes > limit) { await reader.cancel(); throw new Error('BODY_TOO_LARGE') }
    chunks.push(value)
  }
}

export function workerAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const actual = request.headers.get('authorization') ?? ''
  if (!secret || secret.length < 24) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(actual), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
