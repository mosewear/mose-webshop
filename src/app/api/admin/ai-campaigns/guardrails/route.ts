import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

const KEYS = [
  'ai_autopilot_enabled',
  'ai_autopilot_mode',
  'ai_autopilot_max_budget_change_pct',
  'ai_autopilot_max_daily_spend_shift_eur',
  'ai_autopilot_account_spend_cap_eur',
  'ai_autopilot_min_margin_pct_floor',
  'ai_autopilot_working_hours',
  'ai_autopilot_revert_window_days',
  'ai_autopilot_provider',
  'ai_autopilot_model',
  'ai_autopilot_prompt_override',
] as const

type SettingKey = (typeof KEYS)[number]

function isAllowedKey(k: string): k is SettingKey {
  return (KEYS as readonly string[]).includes(k)
}

function isValidValue(key: SettingKey, value: unknown): { ok: true } | { ok: false; reason: string } {
  switch (key) {
    case 'ai_autopilot_enabled':
      return typeof value === 'boolean' ? { ok: true } : { ok: false, reason: 'moet boolean zijn' }
    case 'ai_autopilot_mode':
      return typeof value === 'string' && ['advisory', 'bounded', 'full'].includes(value)
        ? { ok: true }
        : { ok: false, reason: 'mode moet advisory|bounded|full zijn' }
    case 'ai_autopilot_max_budget_change_pct':
      return typeof value === 'number' && value >= 0 && value <= 0.5
        ? { ok: true }
        : { ok: false, reason: 'fractie tussen 0 en 0.5' }
    case 'ai_autopilot_min_margin_pct_floor':
      return typeof value === 'number' && value >= 0 && value < 1
        ? { ok: true }
        : { ok: false, reason: 'fractie tussen 0 en 1' }
    case 'ai_autopilot_max_daily_spend_shift_eur':
    case 'ai_autopilot_account_spend_cap_eur':
      return typeof value === 'number' && value >= 0
        ? { ok: true }
        : { ok: false, reason: 'moet niet-negatief getal zijn' }
    case 'ai_autopilot_revert_window_days':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 90
        ? { ok: true }
        : { ok: false, reason: 'integer 1..90' }
    case 'ai_autopilot_working_hours': {
      if (!value || typeof value !== 'object') return { ok: false, reason: 'object verwacht' }
      const v = value as { start_hour?: unknown; end_hour?: unknown; timezone?: unknown }
      if (
        typeof v.start_hour !== 'number' ||
        typeof v.end_hour !== 'number' ||
        typeof v.timezone !== 'string'
      ) {
        return { ok: false, reason: 'start_hour, end_hour, timezone vereist' }
      }
      if (v.start_hour < 0 || v.start_hour > 23 || v.end_hour < 1 || v.end_hour > 24 || v.end_hour <= v.start_hour) {
        return { ok: false, reason: 'start_hour < end_hour, beide 0..24' }
      }
      return { ok: true }
    }
    case 'ai_autopilot_provider':
      return typeof value === 'string' && ['openai', 'mock'].includes(value)
        ? { ok: true }
        : { ok: false, reason: 'provider moet openai of mock zijn' }
    case 'ai_autopilot_model':
      return typeof value === 'string' && value.length > 0 && value.length < 100
        ? { ok: true }
        : { ok: false, reason: 'model moet niet-lege string zijn' }
    case 'ai_autopilot_prompt_override':
      return value === null || (typeof value === 'string' && value.length < 200)
        ? { ok: true }
        : { ok: false, reason: 'null of string < 200 chars' }
  }
}

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('site_settings').select('key, value').in('key', KEYS as unknown as string[])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: { updates?: Array<{ key: string; value: unknown }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
    return NextResponse.json({ error: 'updates[] vereist' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const applied: string[] = []
  const skipped: Array<{ key: string; reason: string }> = []

  for (const upd of body.updates) {
    if (!isAllowedKey(upd.key)) {
      skipped.push({ key: upd.key, reason: 'niet-toegestane sleutel' })
      continue
    }
    const validation = isValidValue(upd.key, upd.value)
    if (!validation.ok) {
      skipped.push({ key: upd.key, reason: validation.reason })
      continue
    }
    const { error } = await supabase
      .from('site_settings')
      .update({ value: upd.value as never, updated_at: new Date().toISOString() })
      .eq('key', upd.key)
    if (error) {
      skipped.push({ key: upd.key, reason: error.message })
      continue
    }
    applied.push(upd.key)
  }

  return NextResponse.json({ ok: true, applied, skipped, by: adminUser?.id })
}
