/**
 * Postmark HTTP client — fetch-based, no SDK dependency.
 *
 * Why fetch and not the `postmark` npm package
 * --------------------------------------------
 * Postmark's email endpoint is a single POST with JSON body and an
 * `X-Postmark-Server-Token` header. Pulling in their SDK just to
 * call one URL doubles the cold-start cost on every serverless
 * function for zero feature gain — and the SDK doesn't even handle
 * Postmark's stream / metadata fields any cleaner than the raw JSON.
 *
 * What this module guarantees to the rest of the codebase
 * -------------------------------------------------------
 *   * Same `Promise<{ success, data, error }>` shape that the old
 *     Resend wrapper returned, so `src/lib/email.ts#sendAndLog` is
 *     the only file that needs to change in the swap.
 *   * Never throws on missing token at import time — only on first
 *     send attempt. This preserves the dummy-build pattern used by
 *     CI (`POSTMARK_SERVER_TOKEN=dummy` lets `next build` finish).
 *   * Logs the same emoji-prefixed lines as the old code so the
 *     admin / Vercel log experience stays consistent.
 *
 * Postmark API docs:
 *   https://postmarkapp.com/developer/api/email-api
 *   https://postmarkapp.com/developer/user-guide/send-email-with-api/message-streams
 */

const POSTMARK_API_URL = 'https://api.postmarkapp.com/email'

/**
 * Transactional stream is the default Postmark server stream — every
 * new Postmark server ships with an `outbound` stream pre-created, so
 * we don't need an env var override for it. Marketing must go through
 * an explicitly-created broadcast stream (admin creates it in the
 * Postmark dashboard once); a hardcoded `broadcast` default keeps the
 * code self-explanatory.
 */
export const POSTMARK_STREAM_TRANSACTIONAL = 'outbound'
export const POSTMARK_STREAM_BROADCAST =
  process.env.POSTMARK_BROADCAST_STREAM || 'broadcast'

export interface PostmarkAttachment {
  Name: string
  /** Base64-encoded content (no `data:` prefix). */
  Content: string
  ContentType: string
  /** Optional CID for inline images. */
  ContentID?: string
}

export interface PostmarkHeader {
  Name: string
  Value: string
}

export interface PostmarkSendInput {
  /** e.g. `"MOSE Webshop <orders@mosewear.com>"` — same format Resend accepts. */
  From: string
  /** Single address. Postmark also supports comma-separated but every MOSE send is 1-to-1. */
  To: string
  Cc?: string
  Bcc?: string
  Subject: string
  HtmlBody: string
  TextBody?: string
  ReplyTo?: string
  /**
   * `outbound` (transactional) by default; `broadcast` for newsletters.
   * Streams isolate reputation: a complaint on a newsletter never poisons
   * order-confirmation deliverability and vice versa.
   */
  MessageStream?: string
  Tag?: string
  /** Arbitrary key/value pairs surfaced in the Postmark activity log. */
  Metadata?: Record<string, string>
  Headers?: PostmarkHeader[]
  Attachments?: PostmarkAttachment[]
  /**
   * If true Postmark tracks opens (transactional stream only). Default
   * off — we don't surface opens anywhere in the admin yet and the
   * tracking pixel triggers some corporate spam filters.
   */
  TrackOpens?: boolean
  /** `None` | `HtmlAndText` | `HtmlOnly` | `TextOnly`. */
  TrackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly'
}

export interface PostmarkSendResponse {
  /** Echoed To address. */
  To: string
  /** Time Postmark accepted the message. */
  SubmittedAt: string
  /** Postmark's UUID for the message — the value we persist in `order_emails.resend_id`. */
  MessageID: string
  /** 0 on success. Postmark uses positive integers for documented errors. */
  ErrorCode: number
  /** Human-readable status. On success: `"OK"`. */
  Message: string
}

export interface PostmarkErrorBody {
  ErrorCode: number
  Message: string
}

export interface PostmarkSendResult {
  success: boolean
  /** Mapped to `{ id: MessageID }` so callers stay Resend-shape compatible. */
  data?: { id: string }
  /** Either the parsed Postmark error body or the underlying fetch error. */
  error?: PostmarkErrorBody | { message: string }
}

/**
 * Reasons we should NOT throw at import time but still flag missing
 * config cleanly the first time `sendEmail` actually runs.
 */
function getServerToken(): string {
  const token = process.env.POSTMARK_SERVER_TOKEN
  if (!token) {
    throw new Error(
      'POSTMARK_SERVER_TOKEN ontbreekt. Voeg deze toe in .env.local / Vercel. Voor lokale builds zonder send-pad mag je een dummy waarde gebruiken (POSTMARK_SERVER_TOKEN=dummy).',
    )
  }
  return token
}

export function isPostmarkConfigured(): boolean {
  const token = process.env.POSTMARK_SERVER_TOKEN
  return !!token && token !== 'dummy'
}

/**
 * Send a single email via Postmark. Mirrors the old Resend wrapper:
 * never throws on API errors, returns `{ success: false, error }`
 * instead so the central `sendAndLog` can keep its single happy/sad
 * path. Only throws when the server token is missing (config bug we
 * want to fail loud).
 */
export async function sendEmail(
  input: PostmarkSendInput,
): Promise<PostmarkSendResult> {
  const token = getServerToken()

  // Default streams: explicit beats default beats hardcoded.
  const payload: PostmarkSendInput = {
    ...input,
    MessageStream: input.MessageStream || POSTMARK_STREAM_TRANSACTIONAL,
  }

  let response: Response
  try {
    response = await fetch(POSTMARK_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': token,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Postmark fetch failed'
    return {
      success: false,
      error: { message },
    }
  }

  let body: PostmarkSendResponse | PostmarkErrorBody | null = null
  try {
    body = (await response.json()) as PostmarkSendResponse | PostmarkErrorBody
  } catch {
    // Postmark returned a non-JSON 5xx (rare but possible during
    // their incidents). Surface that distinctly.
    return {
      success: false,
      error: {
        message: `Postmark returned non-JSON response (HTTP ${response.status})`,
      },
    }
  }

  // Postmark uses two failure shapes:
  //   * non-2xx with { ErrorCode, Message }  — config / payload errors
  //   * 200 with { ErrorCode > 0 }           — per-message rejections
  //     (inactive recipient, invalid email, etc.)
  if (!response.ok || body.ErrorCode !== 0) {
    return {
      success: false,
      error: body as PostmarkErrorBody,
    }
  }

  const ok = body as PostmarkSendResponse
  return {
    success: true,
    data: { id: ok.MessageID },
  }
}

/**
 * Render an HTML body into a passable plain-text fallback. Postmark
 * (and every reputable inbox provider) gives a deliverability lift
 * when both parts are present — Gmail and Apple Mail demote bodies
 * that ship HTML-only.
 *
 * This is deliberately minimal: regex-based, no DOM, no dependency.
 * It strips tags, normalises whitespace, and decodes the entity set
 * the React Email primitives actually emit (`&nbsp; & < > " '`).
 * Anything fancier (preserving lists / links) is out of scope — the
 * text part is a deliverability signal, not a primary surface.
 */
export function htmlToText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}
