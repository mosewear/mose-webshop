/**
 * Admin API to manage meta_credentials rows. The service-role bypasses
 * RLS (the table has no public policies — see migration
 * 20260520110000_meta_credentials.sql).
 *
 * GET returns a redacted view: tokens and pixel ids are never sent
 * back to the client, only metadata (label, ad_account_id,
 * business_id, expiry, scopes).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

interface CredentialBody {
  label?: string
  business_id?: string
  ad_account_id?: string
  access_token?: string
  token_scopes?: string[]
  token_expires_at?: string | null
  pixel_id?: string | null
  page_id?: string | null
  default_link_template?: string | null
}

function maskToken(token: string | null | undefined): string {
  if (!token) return ''
  if (token.length <= 8) return '••••'
  return `${token.slice(0, 4)}••••${token.slice(-4)}`
}

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('meta_credentials')
    .select('id, label, business_id, ad_account_id, token_scopes, token_expires_at, pixel_id, page_id, default_link_template, created_at, updated_at, access_token')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((row) => {
    const r = row as { access_token: string } & Record<string, unknown>
    return {
      ...r,
      access_token_mask: maskToken(r.access_token),
      access_token: undefined,
    }
  })

  return NextResponse.json({ credentials: rows })
}

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: CredentialBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const label = (body.label || 'mose_primary').trim()
  const business_id = (body.business_id || '').trim()
  const ad_account_id = (body.ad_account_id || '').trim()
  const access_token = (body.access_token || '').trim()

  if (!business_id || !ad_account_id || !access_token) {
    return NextResponse.json({ error: 'business_id, ad_account_id en access_token vereist' }, { status: 400 })
  }
  if (!ad_account_id.startsWith('act_')) {
    return NextResponse.json({ error: 'ad_account_id moet beginnen met act_' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('meta_credentials')
    .select('id')
    .eq('label', label)
    .maybeSingle()

  const payload = {
    label,
    business_id,
    ad_account_id,
    access_token,
    token_scopes: Array.isArray(body.token_scopes) ? body.token_scopes : [],
    token_expires_at: body.token_expires_at ?? null,
    pixel_id: body.pixel_id ?? null,
    page_id: body.page_id ?? null,
    default_link_template: body.default_link_template ?? null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase.from('meta_credentials').update(payload).eq('id', (existing as { id: string }).id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: (existing as { id: string }).id })
  }

  const { data, error } = await supabase.from('meta_credentials').insert(payload).select('id').single()
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}

export async function DELETE(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id query-param vereist' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('meta_credentials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
