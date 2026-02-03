// Check newsletter_subscribers table constraint
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? '✓ Found' : '✗ Missing')
console.log('Service Role Key:', supabaseKey ? '✓ Found' : '✗ Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials')
  console.error('Make sure .env.local contains:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConstraint() {
  console.log('Checking newsletter_subscribers table...\n')

  // Get table info from information_schema
  const { data: constraints, error: constraintError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          conname AS constraint_name,
          pg_get_constraintdef(c.oid) AS constraint_definition
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'newsletter_subscribers'
        AND c.contype = 'c'
        AND conname LIKE '%source%';
      `
    })

  if (constraintError) {
    console.log('Cannot use rpc, trying direct query...')
    
    // Try alternative: check actual data
    const { data: sources, error: sourceError } = await supabase
      .from('newsletter_subscribers')
      .select('source')
      .limit(100)

    if (sourceError) {
      console.error('Error fetching sources:', sourceError)
    } else {
      const uniqueSources = [...new Set(sources.map(s => s.source))]
      console.log('Current source values in database:', uniqueSources)
    }

    // Try to insert with 'early_access_landing' to see the error
    console.log('\nTrying to insert test subscriber with early_access_landing...')
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: 'test_constraint_check@test.com',
        status: 'active',
        source: 'early_access_landing',
        locale: 'nl'
      })

    if (insertError) {
      console.log('\n❌ Insert failed with error:')
      console.log('Code:', insertError.code)
      console.log('Message:', insertError.message)
      console.log('Details:', insertError.details)
      console.log('Hint:', insertError.hint)
    } else {
      console.log('✅ Insert succeeded! Cleaning up...')
      await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('email', 'test_constraint_check@test.com')
    }
  } else {
    console.log('Constraints found:', constraints)
  }
}

checkConstraint()

