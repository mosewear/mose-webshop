import { getLocale } from 'next-intl/server'
import { createAnonClient } from '@/lib/supabase/server'
import AnnouncementBannerClient from './AnnouncementBannerClient'

interface ClientConfig {
  enabled: boolean
  rotation_interval: number
  dismissable: boolean
  dismiss_cookie_days: number
}

interface ClientMessage {
  id: string
  text: string
  link_url: string | null
  cta_text: string | null
  icon: string | null
  sort_order: number
}

async function loadBannerData(locale: string): Promise<{
  enabled: boolean
  config: ClientConfig | null
  messages: ClientMessage[]
}> {
  const supabase = createAnonClient()
  const empty = { enabled: false, config: null, messages: [] as ClientMessage[] }

  try {
    const { data: configData } = await supabase
      .from('announcement_banner')
      .select('*')
      .single()

    if (!configData || !configData.enabled) return empty

    const { data: messagesData } = await supabase
      .from('announcement_messages')
      .select('id, text, text_en, link_url, cta_text, cta_text_en, icon, sort_order')
      .eq('banner_id', configData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!messagesData || messagesData.length === 0) return empty

    const isEnglish = locale === 'en'
    return {
      enabled: true,
      config: {
        enabled: configData.enabled,
        rotation_interval: configData.rotation_interval,
        dismissable: configData.dismissable,
        dismiss_cookie_days: configData.dismiss_cookie_days,
      },
      messages: messagesData.map(msg => ({
        id: msg.id,
        text: isEnglish ? (msg.text_en?.trim() || msg.text) : msg.text,
        link_url: normalizeBannerLink(msg.link_url),
        cta_text: isEnglish ? (msg.cta_text_en?.trim() || msg.cta_text) : msg.cta_text,
        icon: msg.icon,
        sort_order: msg.sort_order,
      })),
    }
  } catch (error) {
    console.error('Error fetching announcement banner:', error)
    return empty
  }
}

export default async function AnnouncementBanner() {
  const locale = await getLocale()
  const { enabled, config, messages } = await loadBannerData(locale)

  return <AnnouncementBannerClient enabled={enabled} config={config} messages={messages} />
}

// Strip a leading locale segment so the locale-aware Link in the client
// can inject the visitor's current locale. Keeps external URLs intact.
function normalizeBannerLink(raw: string | null): string | null {
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  return raw.replace(/^\/(nl|en)(?=\/|$)/i, '') || '/'
}
