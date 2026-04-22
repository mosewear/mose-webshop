/**
 * Export a Trustpilot-ready CSV of paid orders that never received a review
 * invitation. Use this when the AFS BCC method is not available on your
 * Trustpilot Business plan — upload the generated file at Trustpilot Business
 * portal > Get reviews > Invitations > Upload customer list.
 *
 * The CSV follows Trustpilot's "Service review" upload template:
 *   Email,Name,Reference Number,Product,Locale,SendDate
 *
 * Usage:
 *   npx tsx scripts/export-trustpilot-csv.ts                     # delivered only
 *   npx tsx scripts/export-trustpilot-csv.ts --scope=all-paid    # include shipped
 *   npx tsx scripts/export-trustpilot-csv.ts --out=invitations.csv
 */

import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

config({ path: path.resolve(process.cwd(), '.env.local') })
// Fall back to .env.vercel for vars like NEXT_PUBLIC_SUPABASE_URL that live
// only there on developer machines.
config({ path: path.resolve(process.cwd(), '.env.vercel') })

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const scopeArg = args.find((a) => a.startsWith('--scope='))
const scope: 'delivered' | 'all-paid' =
  scopeArg?.split('=')[1] === 'all-paid' ? 'all-paid' : 'delivered'
const outArg = args.find((a) => a.startsWith('--out='))
const outPath = outArg?.split('=')[1] || `trustpilot-invitations-${new Date().toISOString().slice(0, 10)}.csv`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[export] Missing Supabase credentials. Aborting.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function csvEscape(value: string): string {
  if (value == null) return ''
  const needsQuoting = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

async function main() {
  const query = supabase
    .from('orders')
    .select('id, email, shipping_address, locale, status, payment_status, delivered_at, created_at, order_items(product_name)')
    .eq('payment_status', 'paid')
    .is('review_invitation_sent_at', null)
    .order('created_at', { ascending: true })

  if (scope === 'delivered') {
    query.eq('status', 'delivered')
  } else {
    query.in('status', ['paid', 'processing', 'shipped', 'delivered'])
  }

  const { data, error } = await query
  if (error) {
    console.error('[export] Query failed:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('[export] No candidates found. Nothing to export.')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows: string[] = []
  rows.push('Email,Name,Reference Number,Product,Locale,SendDate')

  for (const order of data) {
    const address = (order.shipping_address as any) || {}
    const name = address.name || [address.firstName, address.lastName].filter(Boolean).join(' ') || 'Klant'
    const firstProduct =
      (order.order_items || []).map((oi: any) => oi.product_name).filter(Boolean)[0] || ''
    const locale = order.locale === 'en' ? 'en-US' : 'nl-NL'
    rows.push(
      [
        csvEscape(order.email || ''),
        csvEscape(name),
        csvEscape(order.id),
        csvEscape(firstProduct),
        csvEscape(locale),
        csvEscape(today),
      ].join(',')
    )
  }

  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8')
  console.log(`[export] Wrote ${data.length} row(s) to ${outPath}`)
  console.log(`[export] Upload this file at Trustpilot Business portal:`)
  console.log(`  Get reviews > Invitations > Upload customer list`)
  console.log(`  After a successful upload, mark these orders as invited in the database:`)
  console.log(`    UPDATE orders SET review_invitation_sent_at = now() WHERE id IN (...);`)
  console.log(`  (or re-run the backfill script with --send once you have the AFS BCC env var set).`)
}

main().catch((err) => {
  console.error('[export] Fatal error:', err)
  process.exit(1)
})
