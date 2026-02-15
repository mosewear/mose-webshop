import { createClient } from '@/lib/supabase/client'

interface SiteSettings {
  site_name: string
  contact_email: string
  contact_phone: string
  contact_address: string
  free_shipping_threshold: number
  shipping_cost: number
  tax_rate: number
  currency: string
  low_stock_threshold: number
  maintenance_mode: boolean
  return_days: number
  returns_auto_approve: boolean
  return_label_cost_excl_btw: number
  return_label_cost_incl_btw: number
  favicon_url?: string
  show_preview_images_notice?: boolean
  show_category_labels?: boolean
  popup_enabled?: boolean
  popup_trigger?: 'exit_intent' | 'timer' | 'hybrid' | 'scroll'
  popup_delay_seconds?: number
  popup_scroll_percentage?: number
  popup_frequency_days?: number
  popup_show_on_pages?: string[]
  popup_discount_percentage?: number
  ai_chat_enabled?: boolean
  pickup_enabled?: boolean
  pickup_max_distance_km?: number
  pickup_location_name?: string
  pickup_location_address?: string
  pickup_latitude?: number
  pickup_longitude?: number
  updated_at?: string
}

let cachedSettings: SiteSettings | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 60 seconds

export async function getSiteSettings(): Promise<SiteSettings> {
  console.log('🎯 [SETTINGS] getSiteSettings called')
  
  const now = Date.now()
  const cacheAge = now - cacheTimestamp
  
  // Return cached settings if available AND not expired
  if (cachedSettings && cacheAge < CACHE_TTL) {
    console.log(`🎯 [SETTINGS] Returning cached settings (age: ${Math.round(cacheAge / 1000)}s)`)
    return cachedSettings
  }
  
  if (cachedSettings) {
    console.log(`🎯 [SETTINGS] Cache expired (age: ${Math.round(cacheAge / 1000)}s), fetching fresh data`)
  }

  const supabase = createClient()

  try {
    console.log('🎯 [SETTINGS] Fetching from database...')
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value, updated_at')

    if (error) {
      console.error('❌ [SETTINGS] Database error:', error)
      throw error
    }

    console.log('🎯 [SETTINGS] Raw database response:', data)

    // Get the most recent updated_at timestamp
    let latestUpdate = ''
    if (data && data.length > 0) {
      latestUpdate = data.reduce((latest, current) => {
        return current.updated_at > latest ? current.updated_at : latest
      }, data[0].updated_at)
    }

    // Convert array to object
    const settings: any = {}
    if (data) {
      data.forEach((setting) => {
        settings[setting.key] = setting.value
      })
    }

    console.log('🎯 [SETTINGS] Converted settings object:', settings)
    console.log('🎯 [SETTINGS] favicon_url from DB:', settings.favicon_url)

    // Set defaults for missing values
    cachedSettings = {
      site_name: settings.site_name || 'MOSE Wear',
      contact_email: settings.contact_email || 'info@mosewear.nl',
      contact_phone: settings.contact_phone || '+31 50 211 1931',
      contact_address: settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen',
      free_shipping_threshold: (settings.free_shipping_threshold !== null && settings.free_shipping_threshold !== undefined && !isNaN(parseFloat(settings.free_shipping_threshold))) ? parseFloat(settings.free_shipping_threshold) : 100,
      shipping_cost: (settings.shipping_cost !== null && settings.shipping_cost !== undefined && !isNaN(parseFloat(settings.shipping_cost))) ? parseFloat(settings.shipping_cost) : 0,
      tax_rate: parseFloat(settings.tax_rate) || 21,
      currency: settings.currency || 'EUR',
      low_stock_threshold: parseInt(settings.low_stock_threshold) || 5,
      maintenance_mode: settings.maintenance_mode === 'true' || settings.maintenance_mode === true,
      return_days: parseInt(settings.return_days) || 14,
      returns_auto_approve:
        settings.returns_auto_approve === 'true' || settings.returns_auto_approve === true || settings.returns_auto_approve === 1,
      return_label_cost_excl_btw: parseFloat(settings.return_label_cost_excl_btw) || 6.50,
      return_label_cost_incl_btw: parseFloat(settings.return_label_cost_incl_btw) || 7.87,
      favicon_url: settings.favicon_url || '/favicon.ico',
      show_preview_images_notice: settings.show_preview_images_notice === 'true' || settings.show_preview_images_notice === true,
      show_category_labels: settings.show_category_labels === 'true' || settings.show_category_labels === true,
      ai_chat_enabled: settings.ai_chat_enabled === 'true' || settings.ai_chat_enabled === true || settings.ai_chat_enabled === undefined, // Default true
      pickup_enabled: settings.pickup_enabled === 'true' || settings.pickup_enabled === true || settings.pickup_enabled === undefined,
      pickup_max_distance_km: parseFloat(settings.pickup_max_distance_km) || 50,
      pickup_location_name: settings.pickup_location_name || 'MOSE Groningen',
      pickup_location_address: settings.pickup_location_address || 'Stavangerweg 13, 9723 JC Groningen',
      pickup_latitude: parseFloat(settings.pickup_latitude) || 53.2194,
      pickup_longitude: parseFloat(settings.pickup_longitude) || 6.5665,
      updated_at: latestUpdate,
    }

    console.log('🎯 [SETTINGS] Final cached settings:', cachedSettings)
    
    // Update cache timestamp
    cacheTimestamp = Date.now()

    return cachedSettings
  } catch (error) {
    console.error('❌ [SETTINGS] Error fetching site settings:', error)
    
    // Return defaults on error
    return {
      site_name: 'MOSE Wear',
      contact_email: 'info@mosewear.nl',
      contact_phone: '+31 50 211 1931',
      contact_address: 'Stavangerweg 13, 9723 JC Groningen',
      free_shipping_threshold: 100,
      shipping_cost: 0,
      tax_rate: 21,
      currency: 'EUR',
      low_stock_threshold: 5,
      maintenance_mode: false,
      return_days: 14,
      returns_auto_approve: true,
      return_label_cost_excl_btw: 6.50,
      return_label_cost_incl_btw: 7.87,
      favicon_url: '/favicon.ico',
      show_preview_images_notice: false,
      show_category_labels: false,
      ai_chat_enabled: true, // Default enabled
      pickup_enabled: true,
      pickup_max_distance_km: 50,
      pickup_location_name: 'MOSE Groningen',
      pickup_location_address: 'Stavangerweg 13, 9723 JC Groningen',
      pickup_latitude: 53.2194,
      pickup_longitude: 6.5665,
      updated_at: undefined,
    }
  }
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  console.log('🎯 [SETTINGS] Cache cleared!')
  cachedSettings = null
  cacheTimestamp = 0
}


