import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyWebhook, webhookEnvelope } from '@/lib/shopify/webhook'

export const runtime = 'nodejs'
const MAX_BYTES = 2_000_000

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_APP_CLIENT_SECRET
  if (!secret) return new NextResponse('Not configured', { status: 503 })
  // Enforce a real streaming limit, not just the untrusted Content-Length header.
  const reader = request.body?.getReader()
  if (!reader) return new NextResponse('Missing body', { status: 400 })
  const chunks: Uint8Array[] = []
  let bytes = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > MAX_BYTES) { await reader.cancel(); return new NextResponse('Too large', { status: 413 }) }
    chunks.push(value)
  }
  const raw = Buffer.concat(chunks)
  if (!verifyWebhook(raw, request.headers.get('x-shopify-hmac-sha256'), secret)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }
  const envelope = webhookEnvelope(request.headers)
  if (!envelope) return new NextResponse('Unsupported source or topic', { status: 400 })
  let payload: unknown
  try { payload = JSON.parse(raw.toString('utf8')) } catch { return new NextResponse('Invalid JSON', { status: 400 }) }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return new NextResponse('Invalid payload', { status: 400 })
  try {
    const db = createServiceClient()
    const { error } = await db.from('shopify_webhook_inbox').insert({ ...envelope, payload })
    // A duplicate means the durable original still exists, including its retry state.
    if (error && error.code !== '23505') throw new Error('INBOX_WRITE_FAILED')
    return new NextResponse(null, { status: 200 })
  } catch {
    // Shopify must retry if durable storage fails. Never acknowledge a lost event.
    return new NextResponse('Storage unavailable', { status: 503 })
  }
}
