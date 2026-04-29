import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { INSTAGRAM_FEED_TAG } from '@/lib/instagram/types'

export const dynamic = 'force-dynamic'

const SETTING_FIELDS = [
  'enabled',
  'username',
  'section_title_nl',
  'section_title_en',
  'section_subtitle_nl',
  'section_subtitle_en',
  'cta_text_nl',
  'cta_text_en',
  'cta_url',
  'marquee_speed_seconds',
  'max_posts',
] as const

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const supabase = createServiceRoleClient()

  const [settingsResult, credsResult] = await Promise.all([
    supabase
      .from('instagram_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('instagram_credentials')
      .select('id, business_account_id, token_expires_at, last_synced_at, last_sync_status, last_sync_error, long_lived_token')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  if (settingsResult.error) {
    return NextResponse.json(
      { success: false, error: settingsResult.error.message },
      { status: 500 }
    )
  }

  // Stuur token niet mee, alleen of die ingevuld is.
  const creds = credsResult.data
    ? {
        id: credsResult.data.id,
        business_account_id: credsResult.data.business_account_id,
        token_expires_at: credsResult.data.token_expires_at,
        last_synced_at: credsResult.data.last_synced_at,
        last_sync_status: credsResult.data.last_sync_status,
        last_sync_error: credsResult.data.last_sync_error,
        has_token: !!credsResult.data.long_lived_token,
      }
    : null

  return NextResponse.json(
    { success: true, settings: settingsResult.data, credentials: creds },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function PATCH(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  let body: {
    settings?: Record<string, unknown>
    credentials?: Record<string, unknown>
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  const settingsUpdate: Record<string, unknown> = {}
  for (const key of SETTING_FIELDS) {
    if (body?.settings && body.settings[key] !== undefined) {
      const value = body.settings[key]
      if (key === 'enabled') {
        settingsUpdate[key] = Boolean(value)
      } else if (key === 'marquee_speed_seconds' || key === 'max_posts') {
        const n = Number(value)
        if (!Number.isFinite(n)) continue
        if (key === 'marquee_speed_seconds' && (n < 20 || n > 240)) {
          return NextResponse.json(
            { success: false, error: 'marquee_speed_seconds moet tussen 20 en 240 liggen.' },
            { status: 400 }
          )
        }
        if (key === 'max_posts' && (n < 4 || n > 20)) {
          return NextResponse.json(
            { success: false, error: 'max_posts moet tussen 4 en 20 liggen.' },
            { status: 400 }
          )
        }
        settingsUpdate[key] = Math.round(n)
      } else if (key === 'cta_url') {
        const url = String(value || '').trim()
        if (url && !/^https?:\/\//i.test(url)) {
          return NextResponse.json(
            { success: false, error: 'cta_url moet beginnen met http(s)://' },
            { status: 400 }
          )
        }
        settingsUpdate[key] = url
      } else {
        settingsUpdate[key] = value === null ? null : String(value).slice(0, 500)
      }
    }
  }

  if (Object.keys(settingsUpdate).length > 0) {
    const { data: existing } = await supabase
      .from('instagram_settings')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Settings-rij niet gevonden.' },
        { status: 500 }
      )
    }
    const { error: settingsError } = await supabase
      .from('instagram_settings')
      .update(settingsUpdate)
      .eq('id', existing.id)
    if (settingsError) {
      return NextResponse.json(
        { success: false, error: settingsError.message },
        { status: 500 }
      )
    }
  }

  // Credentials kunnen apart geüpdatet worden (token + business id).
  if (body?.credentials) {
    const credsUpdate: Record<string, unknown> = {}
    const tokenValue = body.credentials.long_lived_token
    if (typeof tokenValue === 'string') {
      const token = tokenValue.trim()
      credsUpdate.long_lived_token = token === '' ? null : token
      credsUpdate.token_expires_at = null
    }
    const accountValue = body.credentials.business_account_id
    if (typeof accountValue === 'string') {
      credsUpdate.business_account_id = accountValue.trim() || null
    }

    if (Object.keys(credsUpdate).length > 0) {
      const { data: existingCreds } = await supabase
        .from('instagram_credentials')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!existingCreds) {
        const { error: insertError } = await supabase
          .from('instagram_credentials')
          .insert({ ...credsUpdate, last_sync_status: 'idle' })
        if (insertError) {
          return NextResponse.json(
            { success: false, error: insertError.message },
            { status: 500 }
          )
        }
      } else {
        const { error: updateError } = await supabase
          .from('instagram_credentials')
          .update(credsUpdate)
          .eq('id', existingCreds.id)
        if (updateError) {
          return NextResponse.json(
            { success: false, error: updateError.message },
            { status: 500 }
          )
        }
      }
    }
  }

  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return NextResponse.json({ success: true })
}
