/**
 * Script to check how many times the chat button was clicked today
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function checkChatClicksToday() {
  // Get today's date range (start of day to now)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const now = new Date().toISOString()
  
  console.log('📊 Chat clicks vandaag (', new Date().toLocaleDateString('nl-NL'), ')')
  console.log('═══════════════════════════════════════════')
  console.log('')
  
  // Count chat_opened events
  const { data: chatOpened, error: openedError } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .eq('event_name', 'chat_opened')
    .gte('created_at', todayStart)
    .lte('created_at', now)
  
  // Count chat_closed events
  const { data: chatClosed, error: closedError } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .eq('event_name', 'chat_closed')
    .gte('created_at', todayStart)
    .lte('created_at', now)
  
  if (openedError || closedError) {
    console.error('❌ Error:', openedError || closedError)
    return
  }
  
  const openedCount = chatOpened?.length || 0
  const closedCount = chatClosed?.length || 0
  
  console.log('💬 Chat geopend:', openedCount, 'keer')
  console.log('❌ Chat gesloten:', closedCount, 'keer')
  console.log('')
  console.log('📈 Totaal chat interacties:', openedCount + closedCount)
  console.log('')
  
  if (openedCount > 0) {
    console.log('📋 Details (laatste 10 chat opens):')
    const { data: recentOpens } = await supabase
      .from('analytics_events')
      .select('created_at, event_properties')
      .eq('event_name', 'chat_opened')
      .gte('created_at', todayStart)
      .lte('created_at', now)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentOpens) {
      recentOpens.forEach((event, i) => {
        const time = new Date(event.created_at).toLocaleTimeString('nl-NL')
        const page = event.event_properties?.page_url || 'unknown'
        console.log(`   ${i + 1}. ${time} - ${page}`)
      })
    }
  } else {
    console.log('ℹ️  Geen chat clicks vandaag (of tracking is nog niet actief)')
    console.log('')
    console.log('💡 Tip: Chat tracking is net toegevoegd. Na de volgende deployment')
    console.log('   worden chat clicks automatisch getrackt.')
  }
  
  console.log('')
  console.log('═══════════════════════════════════════════')
}

checkChatClicksToday()




