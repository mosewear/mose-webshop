import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch popup settings from database
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'popup_enabled',
        'popup_trigger',
        'popup_delay_seconds',
        'popup_scroll_percentage',
        'popup_frequency_days',
        'popup_show_on_pages',
        'popup_discount_percentage'
      ])

    if (error) {
      console.error('Error fetching popup settings:', error)
      throw error
    }

    // Convert array to object
    const settings: Record<string, any> = {}
    data?.forEach((setting) => {
      settings[setting.key] = setting.value
    })

    // Return settings with defaults
    return NextResponse.json({
      popup_enabled: settings.popup_enabled === 'true' || settings.popup_enabled === true || false,
      popup_trigger: settings.popup_trigger || 'hybrid',
      popup_delay_seconds: parseInt(settings.popup_delay_seconds) || 20,
      popup_scroll_percentage: parseInt(settings.popup_scroll_percentage) || 50,
      popup_frequency_days: parseInt(settings.popup_frequency_days) || 7,
      popup_show_on_pages: Array.isArray(settings.popup_show_on_pages) 
        ? settings.popup_show_on_pages 
        : (settings.popup_show_on_pages ? JSON.parse(settings.popup_show_on_pages) : ['home', 'shop', 'product']),
      popup_discount_percentage: parseInt(settings.popup_discount_percentage) || 10
    })
  } catch (error) {
    console.error('Error in popup settings API:', error)
    
    // Return safe defaults on error
    return NextResponse.json({
      popup_enabled: false,
      popup_trigger: 'hybrid',
      popup_delay_seconds: 20,
      popup_scroll_percentage: 50,
      popup_frequency_days: 7,
      popup_show_on_pages: ['home', 'shop', 'product'],
      popup_discount_percentage: 10
    })
  }
}

