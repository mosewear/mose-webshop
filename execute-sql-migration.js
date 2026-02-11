// Execute SQL migration via Supabase Management API
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Project Ref:', projectRef)
console.log('Service Role Key:', serviceRoleKey ? '✓ Found' : '✗ Missing')

const sql = `
-- Update newsletter_subscribers source check constraint
ALTER TABLE newsletter_subscribers 
DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;

ALTER TABLE newsletter_subscribers
ADD CONSTRAINT newsletter_subscribers_source_check 
CHECK (source IN (
  'homepage',
  'product_page', 
  'checkout',
  'footer',
  'popup',
  'early_access',
  'early_access_landing'
));
`

async function executeSQLDirectly() {
  console.log('\n🔧 Executing SQL migration...\n')
  
  const url = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sql
      })
    })

    const data = await response.text()
    console.log('Response status:', response.status)
    console.log('Response:', data)

    if (response.ok) {
      console.log('\n✅ Migration executed successfully!')
    } else {
      console.log('\n❌ Migration failed')
      console.log('You need to run this SQL manually in Supabase SQL Editor:')
      console.log(sql)
    }
  } catch (error) {
    console.error('Error:', error.message)
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql')
    console.log('\n' + sql)
  }
}

executeSQLDirectly()




