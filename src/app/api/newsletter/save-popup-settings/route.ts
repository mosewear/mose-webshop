import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Check if user is admin
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
      popup_discount_percentage
    } = body

    // Upsert settings (one by one to ensure they're created)
    const settings = [
      { key: 'popup_enabled', value: popup_enabled },
      { key: 'popup_trigger', value: popup_trigger },
      { key: 'popup_delay_seconds', value: popup_delay_seconds },
      { key: 'popup_scroll_percentage', value: popup_scroll_percentage },
      { key: 'popup_frequency_days', value: popup_frequency_days },
      { key: 'popup_show_on_pages', value: JSON.stringify(popup_show_on_pages) },
      { key: 'popup_discount_percentage', value: popup_discount_percentage }
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
      message: 'Popup settings saved successfully'
    })
  } catch (error) {
    console.error('Error saving popup settings:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}


