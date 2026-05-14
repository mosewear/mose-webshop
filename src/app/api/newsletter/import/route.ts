import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireNewsletterAdmin } from '@/lib/newsletter-admin-auth'
import {
  buildParsedSubscriberRows,
  parseNewsletterImportBuffer,
} from '@/lib/newsletter-import/parse-import-file'
import type { ParsedSubscriberInput } from '@/lib/newsletter-import/parse-import-file'
import { generateNewsletterPromoCode } from '@/lib/promo-code-utils'
import { sendNewsletterWelcomeEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 120

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
  const chunkSize = 400
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize)
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

export async function POST(req: NextRequest) {
  const auth = await requireNewsletterAdmin()
  if (!auth.ok) return auth.response

  try {
    const form = await req.formData()
    const file = form.get('file')
    const dryRun = String(form.get('dryRun') || '') === 'true'
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

    const {
      parsed,
      invalid,
      duplicateInFile,
      issues: rowIssues,
    } = buildParsedSubscriberRows(rawRows)

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

    const insertChunkSize = 120
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

      for (const row of insertedRows || []) {
        const id = row.id as string
        const email = String(row.email).toLowerCase()
        const meta = chunk.find((c) => c.email === email)
        const locale = meta?.locale || 'nl'

        let promo: { code: string; expiresAt: Date } | null = null
        try {
          promo = await generateNewsletterPromoCode(id, email, locale)
        } catch (e) {
          console.error('[newsletter/import] promo code', email, e)
        }

        if (sendWelcomeEmail) {
          try {
            await sendNewsletterWelcomeEmail({
              email,
              source: 'admin_import',
              locale,
              promoCode: promo?.code,
              promoExpiry: promo?.expiresAt,
            })
            welcomeEmailsSent++
          } catch (e) {
            console.error('[newsletter/import] welcome email', email, e)
          }
        }
      }
    }

    for (const { row, id } of classified.toReactivate) {
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
        continue
      }
      reactivated++

      let promo: { code: string; expiresAt: Date } | null = null
      try {
        promo = await generateNewsletterPromoCode(id, row.email, row.locale)
      } catch (e) {
        console.error('[newsletter/import] promo reactivate', row.email, e)
      }

      if (sendWelcomeEmail) {
        try {
          await sendNewsletterWelcomeEmail({
            email: row.email,
            source: 'admin_import',
            locale: row.locale,
            promoCode: promo?.code,
            promoExpiry: promo?.expiresAt,
          })
          welcomeEmailsSent++
        } catch (e) {
          console.error('[newsletter/import] welcome reactivate', row.email, e)
        }
      }
    }

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
    return NextResponse.json(
      { success: false, error: err?.message || 'Import mislukt' },
      { status: 500 }
    )
  }
}
