/**
 * Prepare promo codes for the Spring Drop 2026 campaign.
 *
 * Two idempotent operations against the live DB (service role):
 *
 *   1. Extend EVERY active `WELCOME10-XXXXXX` personal code to 2026-06-15.
 *      Many of the originally generated codes had a 90-day TTL and have
 *      either already expired or expire before mail 3 lands. We refresh
 *      the runway so the campaign's "your code is expiring" reminder is
 *      truthful and the code actually works at checkout.
 *
 *   2. Upsert a global `SPRING10` fallback code (10% off, 1x per email,
 *      usage_limit=60, expires 2026-06-15). Used by the Spring Drop send
 *      API when a subscriber has NO personal WELCOME10 code.
 *
 * Run with:  npx tsx scripts/spring-drop-prepare-promo-codes.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// One uniform expiry for the entire campaign so mail 3 can confidently
// say "geldig tot {date}". 5 weeks runway from launch (13 mei).
const CAMPAIGN_EXPIRY = new Date('2026-06-15T22:00:00Z') // Sun 23:59 CEST
const CAMPAIGN_EXPIRY_LABEL = '15 juni 2026'

async function step1ExtendPersonalCodes() {
  console.log('1. Extending personal WELCOME10-* codes to', CAMPAIGN_EXPIRY.toISOString())

  const { data: codes, error } = await supabase
    .from('promo_codes')
    .select('id, code, expires_at, is_active')
    .not('subscriber_id', 'is', null)
    .ilike('code', 'WELCOME10-%')

  if (error) throw error
  if (!codes?.length) {
    console.log('   No personal WELCOME10 codes found.')
    return
  }

  const toExtend = codes.filter((c) => {
    if (!c.is_active) return false
    const exp = new Date(c.expires_at)
    return exp < CAMPAIGN_EXPIRY
  })

  if (!toExtend.length) {
    console.log(`   All ${codes.length} codes already expire after ${CAMPAIGN_EXPIRY_LABEL}. Nothing to extend.`)
    return
  }

  console.log(`   Extending ${toExtend.length} of ${codes.length} codes...`)
  let updated = 0
  for (const c of toExtend) {
    const { error: updErr } = await supabase
      .from('promo_codes')
      .update({
        expires_at: CAMPAIGN_EXPIRY.toISOString(),
        is_active: true,
      })
      .eq('id', c.id)
    if (updErr) {
      console.error(`   ❌ Failed to extend ${c.code}:`, updErr.message)
    } else {
      updated++
    }
  }
  console.log(`   ✅ Extended ${updated}/${toExtend.length} personal codes.`)
}

async function step2UpsertSpring10() {
  console.log('\n2. Upserting global SPRING10 fallback code...')

  const { data: existing, error: fetchErr } = await supabase
    .from('promo_codes')
    .select('id, code, is_active, expires_at, usage_limit, discount_value')
    .eq('code', 'SPRING10')
    .maybeSingle()

  if (fetchErr) throw fetchErr

  const payload = {
    code: 'SPRING10',
    description:
      'Spring Drop 2026 fallback: 10% korting voor abonnees zonder persoonlijke WELCOME10 code.',
    discount_type: 'percentage' as const,
    discount_value: 10,
    min_order_value: 0,
    usage_limit: 60, // dekt 40 subs zonder persoonlijke code + buffer
    expires_at: CAMPAIGN_EXPIRY.toISOString(),
    is_active: true,
    subscriber_id: null as string | null,
  }

  if (existing) {
    console.log(`   Found existing SPRING10 (id=${existing.id}). Updating...`)
    const { error: updErr } = await supabase
      .from('promo_codes')
      .update(payload)
      .eq('id', existing.id)
    if (updErr) throw updErr
    console.log('   ✅ Updated SPRING10:', payload)
  } else {
    console.log('   No existing SPRING10. Creating...')
    const { error: insErr } = await supabase.from('promo_codes').insert(payload)
    if (insErr) throw insErr
    console.log('   ✅ Created SPRING10:', payload)
  }
}

async function main() {
  console.log('=== Spring Drop 2026: prepare promo codes ===\n')
  await step1ExtendPersonalCodes()
  await step2UpsertSpring10()
  console.log('\n=== Done. Personal codes valid through', CAMPAIGN_EXPIRY_LABEL, '===')
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
