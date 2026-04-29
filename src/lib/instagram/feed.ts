import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/server'
import {
  INSTAGRAM_FEED_TAG,
  type InstagramFeedData,
  type InstagramDisplaySettings,
  type InstagramPost,
} from './types'

async function fetchInstagramFeedFromDb(): Promise<InstagramFeedData> {
  const supabase = createAnonClient()
  try {
    const { data, error } = await supabase.rpc('get_instagram_display_data')
    if (error) {
      console.error('[instagram-feed] RPC error:', error)
      return { enabled: false, settings: null, posts: [] }
    }

    const payload = (data ?? {}) as {
      enabled?: boolean
      settings?: InstagramDisplaySettings | null
      posts?: InstagramPost[]
    }

    return {
      enabled: Boolean(payload.enabled),
      settings: payload.settings ?? null,
      posts: Array.isArray(payload.posts) ? payload.posts : [],
    }
  } catch (err) {
    console.error('[instagram-feed] Unexpected error:', err)
    return { enabled: false, settings: null, posts: [] }
  }
}

export const getInstagramFeedData = unstable_cache(
  fetchInstagramFeedFromDb,
  ['instagram-feed:display'],
  { revalidate: 300, tags: [INSTAGRAM_FEED_TAG] }
)
