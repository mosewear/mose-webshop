import { createClient } from '@/lib/supabase/client'

interface SiteSettings {
  site_name: string
  contact_email: string
  free_shipping_threshold: number
  shipping_cost: number
  tax_rate: number
  currency: string
  low_stock_threshold: number
  maintenance_mode: boolean
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
      .select('key, value')

    if (error) throw error

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
      free_shipping_threshold: parseFloat(settings.free_shipping_threshold) || 50,
      shipping_cost: parseFloat(settings.shipping_cost) || 0,
      tax_rate: parseFloat(settings.tax_rate) || 21,
      currency: settings.currency || 'EUR',
      low_stock_threshold: parseInt(settings.low_stock_threshold) || 5,
      maintenance_mode: settings.maintenance_mode === 'true' || settings.maintenance_mode === true,
    }

    return cachedSettings
  } catch (error) {
    console.error('Error fetching site settings:', error)
    
    // Return defaults on error
    return {
      site_name: 'MOSE Wear',
      contact_email: 'info@mosewear.nl',
      free_shipping_threshold: 50,
      shipping_cost: 0,
      tax_rate: 21,
      currency: 'EUR',
      low_stock_threshold: 5,
      maintenance_mode: false,
    }
  }
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  cachedSettings = null
}


