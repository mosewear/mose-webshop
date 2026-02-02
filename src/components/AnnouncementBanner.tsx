import { createClient } from '@/lib/supabase/server'
import AnnouncementBannerClient from './AnnouncementBannerClient'

interface AnnouncementMessage {
  id: string
  text: string
  link_url: string | null
  cta_text: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

interface BannerConfig {
  id: string
  enabled: boolean
  rotation_interval: number
  dismissable: boolean
  dismiss_cookie_days: number
}

export default async function AnnouncementBanner() {
  const supabase = await createClient()

  try {
    // Fetch banner config
    const { data: configData } = await supabase
      .from('announcement_banner')
      .select('*')
      .single()

    // If config doesn't exist, render empty client (manages CSS var)
    if (!configData) {
      return <AnnouncementBannerClient enabled={false} config={null} messages={[]} />
    }

    // If banner is disabled, render empty client (manages CSS var)
    if (!configData.enabled) {
      return <AnnouncementBannerClient enabled={false} config={null} messages={[]} />
    }

    // Fetch active messages
    const { data: messagesData } = await supabase
      .from('announcement_messages')
      .select('*')
      .eq('banner_id', configData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // If no active messages, render empty client (manages CSS var)
    if (!messagesData || messagesData.length === 0) {
      return <AnnouncementBannerClient enabled={false} config={null} messages={[]} />
    }

    // Pass data to client component for interactivity
    return (
      <AnnouncementBannerClient
        enabled={true}
        config={{
          enabled: configData.enabled,
          rotation_interval: configData.rotation_interval,
          dismissable: configData.dismissable,
          dismiss_cookie_days: configData.dismiss_cookie_days
        }}
        messages={messagesData.map(msg => ({
          id: msg.id,
          text: msg.text,
          link_url: msg.link_url,
          cta_text: msg.cta_text,
          icon: msg.icon,
          sort_order: msg.sort_order
        }))}
      />
    )
  } catch (error) {
    console.error('Error fetching announcement banner:', error)
    return <AnnouncementBannerClient enabled={false} config={null} messages={[]} />
  }
}
