import type { NextRequest } from 'next/server'

/**
 * In-memory rate limiter (per server instance). Resets on cold start; not cross-instance.
 * For stricter limits, use Vercel KV / Upstash Redis.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

export type SlidingWindowEntry = { count: number; resetTime: number }

export function checkSlidingWindowRateLimit(
  map: Map<string, SlidingWindowEntry>,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const limit = map.get(key)

  if (!limit || now > limit.resetTime) {
    map.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count += 1
  return true
}
