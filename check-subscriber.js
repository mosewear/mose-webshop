const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hrjqkldzpsbjvvwqkdvq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IhyanFrbGR6cHNianZ2d3FrZHZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjU1MTg4NSwiZXhwIjoyMDQ4MTI3ODg1fQ.tYdQqmB48WvGGUxKRc3RSy21dKJF3vPw5eT-SqPn5Gw'
)

async function checkSubscriber() {
  console.log('\n🔍 Checking for subscriber: info@pakketavies.nl\n')
  
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', 'info@pakketavies.nl')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('✅ Found subscriber(s):\n')
    data.forEach((sub, idx) => {
      console.log(`Subscriber ${idx + 1}:`)
      console.log(`  Email: ${sub.email}`)
      console.log(`  Status: ${sub.status}`)
      console.log(`  Source: ${sub.source}`)
      console.log(`  Locale: ${sub.locale}`)
      console.log(`  Created: ${sub.created_at}`)
      console.log(`  Updated: ${sub.updated_at}`)
      console.log('')
    })
  } else {
    console.log('❌ No subscriber found with this email\n')
  }
}

checkSubscriber()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
