import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireNewsletterAdmin } from '@/lib/newsletter-admin-auth'
import {
  buildParsedSubscriberRows,
  chunkEmailsForInFilter,
  collectImportHeaderKeys,
  parseNewsletterImportBuffer,
  parseNewsletterImportColumnPreview,
  validateImportColumnMapping,
} from '@/lib/newsletter-import/parse-import-file'
import type { ImportColumnMapping, ParsedSubscriberInput } from '@/lib/newsletter-import/parse-import-file'
import { generateNewsletterPromoCode } from '@/lib/promo-code-utils'
import { sendNewsletterWelcomeEmail } from '@/lib/email'

export const runtime = 'nodejs'
/** Grote imports (15k+ rijen); Pro plan ondersteunt langere functions. */
export const maxDuration = 300

interface Classified {
  toInsert: ParsedSubscriberInput[]
  toReactivate: { row: ParsedSubscriberInput; id: string }[]
  skippedActive: number
  skippedUnsubscribed: number
}

function classifyRows(
  parsed: ParsedSubscriberInput[],
  existing: Map<string, { id: string; status: string }>,
  reactivateUnsubscribed: boolean
): Classified {
  const toInsert: ParsedSubscriberInput[] = []
  const toReactivate: { row: ParsedSubscriberInput; id: string }[] = []
  let skippedActive = 0
  let skippedUnsubscribed = 0

  for (const row of parsed) {
    const ex = existing.get(row.email)
    if (!ex) {
      toInsert.push(row)
      continue
    }
    if (ex.status === 'active') {
      skippedActive++
      continue
    }
    if (ex.status === 'unsubscribed') {
      if (reactivateUnsubscribed) {
        toReactivate.push({ row, id: ex.id })
      } else {
        skippedUnsubscribed++
      }
    }
  }

  return { toInsert, toReactivate, skippedActive, skippedUnsubscribed }
}

async function loadExistingByEmail(
  sb: ReturnType<typeof createServiceRoleClient>,
  emails: string[]
): Promise<Map<string, { id: string; status: string }>> {
  const map = new Map<string, { id: string; status: string }>()
  for (const chunk of chunkEmailsForInFilter(emails)) {
    const { data, error } = await sb
      .from('newsletter_subscribers')
      .select('id, email, status')
      .in('email', chunk)
    if (error) throw error
    for (const row of data || []) {
      map.set(String(row.email).toLowerCase(), {
        id: row.id as string,
        status: row.status as string,
      })
    }
  }
  return map
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize)
    const part = await Promise.all(slice.map((item) => fn(item)))
    out.push(...part)
  }
  return out
}

export async function POST(req: NextRequest) {
  const auth = await requireNewsletterAdmin()
  if (!auth.ok) return auth.response

  try {
    const form = await req.formData()
    const file = form.get('file')
    const dryRun = String(form.get('dryRun') || '') === 'true'
    const step = String(form.get('step') || '')
    const reactivateUnsubscribed =
      String(form.get('reactivateUnsubscribed') || '') === 'true'
    const sendWelcomeEmail = String(form.get('sendWelcomeEmail') || '') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Geen bestand meegegeven (veld `file`).' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())

    if (step === 'columns') {
      const preview = parseNewsletterImportColumnPreview(buf, file.name)
      if (preview.issues.some((i) => i.kind === 'limit')) {
        return NextResponse.json(
          {
            success: false,
            error: preview.issues[0]?.message || 'Bestand te groot',
          },
          { status: 400 }
        )
      }
      return NextResponse.json({
        success: true,
        step: 'columns',
        headers: preview.headers,
        sampleRows: preview.sampleRows,
        suggestedMapping: preview.suggestedMapping,
        parseWarnings: preview.issues.map((i) => i.message),
      })
    }

    let columnMapping: ImportColumnMapping | null = null
    const rawMapping = form.get('columnMapping')
    if (typeof rawMapping === 'string' && rawMapping.trim()) {
      try {
        columnMapping = JSON.parse(rawMapping) as ImportColumnMapping
      } catch {
        return NextResponse.json(
          { success: false, error: 'Ongeldige kolomkoppeling (JSON).' },
          { status: 400 }
        )
      }
    }

    const { rows: rawRows, issues: parseBufferIssues } =
      parseNewsletterImportBuffer(buf, file.name)

    if (parseBufferIssues.some((i) => i.kind === 'limit')) {
      return NextResponse.json(
        {
          success: false,
          error: parseBufferIssues[0]?.message || 'Bestand te groot',
        },
        { status: 400 }
      )
    }

    if (columnMapping) {
      const headerKeys = collectImportHeaderKeys(rawRows)
      const v = validateImportColumnMapping(columnMapping, headerKeys)
      if (!v.ok) {
        return NextResponse.json({ success: false, error: v.error }, { status: 400 })
      }
    }

    const {
      parsed,
      invalid,
      duplicateInFile,
      issues: rowIssues,
    } = buildParsedSubscriberRows(rawRows, columnMapping)

    const allIssues = [...parseBufferIssues, ...rowIssues]
    if (allIssues.some((i) => i.kind === 'limit')) {
      return NextResponse.json(
        {
          success: false,
          error: allIssues.find((i) => i.kind === 'limit')?.message,
        },
        { status: 400 }
      )
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        summary: {
          parsedTotal: 0,
          inserted: 0,
          reactivated: 0,
          skippedActive: 0,
          skippedUnsubscribed: 0,
          duplicateInFile,
          invalidCount: invalid.length,
          welcomeEmailsSent: 0,
        },
        invalid: invalid.slice(0, 100),
        parseWarnings: allIssues.map((i) => i.message),
      })
    }

    const sb = createServiceRoleClient()
    const existing = await loadExistingByEmail(
      sb,
      parsed.map((p) => p.email)
    )

    const classified = classifyRows(parsed, existing, reactivateUnsubscribed)

    const summaryBase = {
      parsedTotal: parsed.length,
      inserted: 0,
      reactivated: 0,
      skippedActive: classified.skippedActive,
      skippedUnsubscribed: classified.skippedUnsubscribed,
      duplicateInFile,
      invalidCount: invalid.length,
      welcomeEmailsSent: 0,
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          ...summaryBase,
          inserted: classified.toInsert.length,
          reactivated: classified.toReactivate.length,
        },
        invalid: invalid.slice(0, 100),
        parseWarnings: allIssues.map((i) => i.message),
      })
    }

    let inserted = 0
    let reactivated = 0
    let welcomeEmailsSent = 0

    const insertChunkSize = 200
    for (let i = 0; i < classified.toInsert.length; i += insertChunkSize) {
      const chunk = classified.toInsert.slice(i, i + insertChunkSize)
      const payload = chunk.map((r) => ({
        email: r.email,
        status: 'active' as const,
        source: r.source,
        locale: r.locale,
        subscribed_at: new Date().toISOString(),
      }))
      const { data: insertedRows, error: insErr } = await sb
        .from('newsletter_subscribers')
        .insert(payload)
        .select('id, email')

      if (insErr) {
        console.error('[newsletter/import] insert chunk failed', insErr)
        return NextResponse.json(
          {
            success: false,
            error: `Invoegen mislukt: ${insErr.message}`,
          },
          { status: 500 }
        )
      }

      inserted += insertedRows?.length || 0

      const insertJobs = (insertedRows || []).map((row) => {
        const id = row.id as string
        const email = String(row.email).toLowerCase()
        const meta = chunk.find((c) => c.email === email)
        const locale = meta?.locale || 'nl'
        return { id, email, locale }
      })

      const welcomeFlags = await mapInBatches(insertJobs, 16, async ({ id, email, locale }) => {
        let promo: { code: string; expiresAt: Date } | null = null
        try {
          promo = await generateNewsletterPromoCode(id, email, locale)
        } catch (e) {
          console.error('[newsletter/import] promo code', email, e)
        }

        if (!sendWelcomeEmail) return 0
        try {
          await sendNewsletterWelcomeEmail({
            email,
            source: 'admin_import',
            locale,
            promoCode: promo?.code,
            promoExpiry: promo?.expiresAt,
          })
          return 1
        } catch (e) {
          console.error('[newsletter/import] welcome email', email, e)
          return 0
        }
      })
      welcomeEmailsSent += welcomeFlags.reduce<number>((a, b) => a + b, 0)
    }

    const reactivateResults = await mapInBatches(
      classified.toReactivate,
      12,
      async ({ row, id }) => {
        const { error: upErr } = await sb
          .from('newsletter_subscribers')
          .update({
            status: 'active',
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            source: row.source,
            locale: row.locale,
          })
          .eq('id', id)

        if (upErr) {
          console.error('[newsletter/import] reactivate failed', row.email, upErr)
          return { ok: false as const, welcome: 0 }
        }

        let promo: { code: string; expiresAt: Date } | null = null
        try {
          promo = await generateNewsletterPromoCode(id, row.email, row.locale)
        } catch (e) {
          console.error('[newsletter/import] promo reactivate', row.email, e)
        }

        if (!sendWelcomeEmail) return { ok: true as const, welcome: 0 }
        try {
          await sendNewsletterWelcomeEmail({
            email: row.email,
            source: 'admin_import',
            locale: row.locale,
            promoCode: promo?.code,
            promoExpiry: promo?.expiresAt,
          })
          return { ok: true as const, welcome: 1 }
        } catch (e) {
          console.error('[newsletter/import] welcome reactivate', row.email, e)
          return { ok: true as const, welcome: 0 }
        }
      }
    )

    reactivated += reactivateResults.filter((r) => r.ok).length
    welcomeEmailsSent += reactivateResults.reduce((a, r) => a + r.welcome, 0)

    return NextResponse.json({
      success: true,
      dryRun: false,
      summary: {
        ...summaryBase,
        inserted,
        reactivated,
        welcomeEmailsSent,
      },
      invalid: invalid.slice(0, 100),
      parseWarnings: allIssues.map((i) => i.message),
    })
  } catch (err: any) {
    console.error('[newsletter/import]', err)
    const msg =
      (typeof err?.message === 'string' && err.message.trim()) || ''
    const detail =
      typeof err?.details === 'string' ? err.details.trim() : ''
    const hint = typeof err?.hint === 'string' ? err.hint.trim() : ''
    const userError =
      [msg, detail, hint].filter(Boolean).join(' — ') || 'Import mislukt'
    return NextResponse.json({ success: false, error: userError }, { status: 500 })
  }
}
