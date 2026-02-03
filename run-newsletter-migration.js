// Run the migration to update newsletter source constraint
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Running migration to allow early_access_landing source...\n')

  // Read the SQL file
  const sql = readFileSync('./supabase/migrations/20260203120000_allow_early_access_landing_source.sql', 'utf8')
  
  console.log('SQL to execute:')
  console.log('---')
  console.log(sql)
  console.log('---\n')

  // Execute via management API - we'll do it manually via SQL statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('DO $$'))

  for (const statement of statements) {
    if (!statement) continue
    
    console.log('Executing:', statement.substring(0, 100) + '...')
    
    // We can't run DDL directly via the client, so we'll use a workaround
    // The user will need to run this in Supabase SQL Editor
  }

  console.log('\n⚠️  Note: Supabase JS client cannot run DDL statements directly.')
  console.log('Please run the migration manually:')
  console.log('1. Go to https://supabase.com/dashboard/project/_/sql')
  console.log('2. Copy the SQL from: supabase/migrations/20260203120000_allow_early_access_landing_source.sql')
  console.log('3. Paste and run it')
  console.log('\nOR use Supabase CLI:')
  console.log('supabase db push')
  
  console.log('\nTesting if we can insert after manual migration...')
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      email: 'test_after_migration@test.com',
      status: 'active',
      source: 'early_access_landing',
      locale: 'nl'
    })

  if (error) {
    console.log('❌ Still fails - migration not yet applied')
    console.log('Error:', error.message)
  } else {
    console.log('✅ Success! Migration was applied')
    // Clean up
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('email', 'test_after_migration@test.com')
  }
}

runMigration()

