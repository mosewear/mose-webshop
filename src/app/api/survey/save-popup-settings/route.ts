import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      popup_enabled,
      popup_trigger,
      popup_delay_seconds,
      popup_scroll_percentage,
      popup_frequency_days,
      popup_show_on_pages,
    } = body

    const settings = [
      { key: 'survey_popup_enabled', value: popup_enabled },
      { key: 'survey_popup_trigger', value: popup_trigger },
      { key: 'survey_popup_delay_seconds', value: popup_delay_seconds },
      { key: 'survey_popup_scroll_percentage', value: popup_scroll_percentage },
      { key: 'survey_popup_frequency_days', value: popup_frequency_days },
      { key: 'survey_popup_show_on_pages', value: JSON.stringify(popup_show_on_pages) },
    ]

    for (const setting of settings) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          {
            key: setting.key,
            value: setting.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )

      if (error) {
        console.error(`Error upserting ${setting.key}:`, error)
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Survey popup settings saved successfully'
    })
  } catch (error) {
    console.error('Error saving survey popup settings:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}




