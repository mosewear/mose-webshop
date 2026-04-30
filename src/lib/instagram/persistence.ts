import 'server-only'

import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { INSTAGRAM_FEED_TAG } from './types'
import type { FacebookPageWithInstagram } from './graph'

/**
 * Slaat de credentials op die uit de OAuth-flow komen. Wordt zowel door
 * de callback (single-page auto-save) als door finalize (multi-page
 * picker) gebruikt. Returns null bij succes, de error message anders.
 *
 * Page Access Tokens afgeleid van een long-lived User Token vervallen
 * niet zolang de user verbonden blijft. Voor admin-display zetten we
 * 'expires_at' alvast op +60 dagen; de bestaande maandelijkse cron op
 * /api/instagram/refresh-token houdt de keten vers.
 */
export async function saveOAuthCredentials(
  choice: FacebookPageWithInstagram
): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const expiresAt = new Date(
    Date.now() + 60 * 24 * 60 * 60 * 1000
  ).toISOString()

  const payload = {
    long_lived_token: choice.page_access_token,
    token_expires_at: expiresAt,
    business_account_id: choice.ig_business_account_id,
    page_id: choice.page_id,
    page_name: choice.page_name,
    ig_username: choice.ig_username || null,
    last_sync_status: 'idle' as const,
    last_sync_error: null,
  }

  const { data: existing } = await supabase
    .from('instagram_credentials')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase
      .from('instagram_credentials')
      .insert(payload)
    if (insertError) return insertError.message
  } else {
    const { error: updateError } = await supabase
      .from('instagram_credentials')
      .update(payload)
      .eq('id', existing.id)
    if (updateError) return updateError.message
  }

  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return null
}

/**
 * Wist de gehele credentials-rij. Wordt gebruikt door de Disconnect
 * knop in de admin. We zetten alle gevoelige velden expliciet op null
 * zodat de UI weer in de "disconnected" state komt.
 */
export async function clearOAuthCredentials(): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from('instagram_credentials')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Geen rij = al disconnected.
  if (!existing) {
    revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
    return null
  }

  const { error } = await supabase
    .from('instagram_credentials')
    .update({
      long_lived_token: null,
      token_expires_at: null,
      business_account_id: null,
      page_id: null,
      page_name: null,
      ig_username: null,
      last_sync_status: 'idle',
      last_sync_error: null,
      last_synced_at: null,
    })
    .eq('id', existing.id)

  if (error) return error.message
  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return null
}
