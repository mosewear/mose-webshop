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
  updated_at?: string
}

let cachedSettings: SiteSettings | null = null

export async function getSiteSettings(): Promise<SiteSettings> {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value, updated_at')

    if (error) throw error

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

    // Set defaults for missing values
    cachedSettings = {
      site_name: settings.site_name || 'MOSE Wear',
      contact_email: settings.contact_email || 'info@mosewear.nl',
      contact_phone: settings.contact_phone || '+31 50 211 1931',
      contact_address: settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen',
      free_shipping_threshold: parseFloat(settings.free_shipping_threshold) || 100,
      shipping_cost: parseFloat(settings.shipping_cost) || 0,
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
      updated_at: latestUpdate,
    }

    return cachedSettings
  } catch (error) {
    console.error('Error fetching site settings:', error)
    
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
      updated_at: undefined,
    }
  }
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  cachedSettings = null
}


