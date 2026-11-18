import { createHmac, timingSafeEqual } from 'node:crypto'
export type MetaTestSession = { code: string; expires: number }
export function verifyMetaTestTicket(ticket: string | undefined, secret = process.env.CRON_SECRET): MetaTestSession | null {
  if (!ticket || !secret || secret.length < 24) return null
  const [payload, signature, extra] = ticket.split('.')
  if (extra || !payload || !signature) return null
  const expected = createHmac('sha256', secret).update('meta-test:' + payload).digest('base64url')
  const a = Buffer.from(signature), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!/^TEST[A-Z0-9]{3,30}$/.test(data.code) || !Number.isSafeInteger(data.expires) || data.expires < Date.now() || data.expires > Date.now() + 3600_000) return null
    return { code: data.code, expires: data.expires }
  } catch { return null }
}
