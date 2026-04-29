export const INSTAGRAM_FEED_TAG = 'instagram-feed'

export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'

export interface InstagramPost {
  id: string
  instagram_id: string | null
  permalink: string
  media_type: InstagramMediaType
  media_url: string
  thumbnail_url: string | null
  caption: string | null
  caption_en: string | null
  like_count: number | null
  taken_at: string | null
  is_pinned: boolean
  pin_order: number | null
  source: 'graph' | 'manual'
}

export interface InstagramAdminPost extends InstagramPost {
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export interface InstagramDisplaySettings {
  id: string
  enabled: boolean
  username: string
  section_title_nl: string
  section_title_en: string | null
  section_subtitle_nl: string
  section_subtitle_en: string | null
  cta_text_nl: string
  cta_text_en: string | null
  cta_url: string
  marquee_speed_seconds: number
  max_posts: number
}

export interface InstagramFeedData {
  enabled: boolean
  settings: InstagramDisplaySettings | null
  posts: InstagramPost[]
}

export interface InstagramCredentials {
  id: string
  long_lived_token: string | null
  token_expires_at: string | null
  business_account_id: string | null
  last_synced_at: string | null
  last_sync_status: 'idle' | 'success' | 'error' | null
  last_sync_error: string | null
}

export interface InstagramGraphMedia {
  id: string
  permalink: string
  media_type: InstagramMediaType
  media_url: string
  thumbnail_url?: string
  caption?: string
  like_count?: number
  timestamp: string
}
