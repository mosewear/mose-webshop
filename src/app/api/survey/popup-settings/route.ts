import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'survey_popup_enabled',
        'survey_popup_trigger',
        'survey_popup_delay_seconds',
        'survey_popup_scroll_percentage',
        'survey_popup_frequency_days',
        'survey_popup_show_on_pages',
      ])

    if (error) {
      console.error('Error fetching survey popup settings:', error)
      throw error
    }

    const settings: Record<string, any> = {}
    data?.forEach((setting) => {
      settings[setting.key] = setting.value
    })

    return NextResponse.json({
      popup_enabled: settings.survey_popup_enabled === 'true' || settings.survey_popup_enabled === true || false,
      popup_trigger: settings.survey_popup_trigger || 'hybrid',
      popup_delay_seconds: parseInt(settings.survey_popup_delay_seconds) || 20,
      popup_scroll_percentage: parseInt(settings.survey_popup_scroll_percentage) || 50,
      popup_frequency_days: parseInt(settings.survey_popup_frequency_days) || 7,
      popup_show_on_pages: Array.isArray(settings.survey_popup_show_on_pages) 
        ? settings.survey_popup_show_on_pages 
        : (settings.survey_popup_show_on_pages ? JSON.parse(settings.survey_popup_show_on_pages) : ['home', 'shop', 'product']),
    })
  } catch (error) {
    console.error('Error in survey popup settings API:', error)
    
    return NextResponse.json({
      popup_enabled: false,
      popup_trigger: 'hybrid',
      popup_delay_seconds: 20,
      popup_scroll_percentage: 50,
      popup_frequency_days: 7,
      popup_show_on_pages: ['home', 'shop', 'product'],
    })
  }
}

