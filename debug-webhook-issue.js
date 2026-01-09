/**
 * Debug Script voor Webhook Issue
 * 
 * Dit script simuleert wat de webhook doet en checkt of alles werkt
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function debugWebhook() {
  console.log('🔍 Debug Webhook Issue\n');
  console.log('='.repeat(60));
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  
  // Test return ID uit de logs
  const returnId = '65d4d022-c440-41ff-a4ae-0c3f2b2cea56';
  const paymentIntentId = 'pi_3Sn3Wv18Iv5roGYj12AH4YrQ';
  
  console.log(`\n🔍 Testing return: ${returnId}`);
  console.log(`🔍 Payment Intent: ${paymentIntentId}\n`);
  
  // Step 1: Check if return exists
  console.log('Step 1: Check if return exists...');
  const { data: returnRecord, error: fetchError } = await supabase
    .from('returns')
    .select('*, orders!inner(*)')
    .eq('id', returnId)
    .single();
  
  if (fetchError) {
    console.error('❌ Error:', fetchError.message);
    process.exit(1);
  }
  
  console.log(`✅ Return found`);
  console.log(`   Status: ${returnRecord.status}`);
  console.log(`   Payment status: ${returnRecord.return_label_payment_status}`);
  console.log(`   Payment Intent ID: ${returnRecord.return_label_payment_intent_id}`);
  console.log(`   Label URL: ${returnRecord.return_label_url || 'NONE'}`);
  
  // Step 2: Check if payment intent matches
  console.log(`\nStep 2: Check payment intent match...`);
  if (returnRecord.return_label_payment_intent_id === paymentIntentId) {
    console.log('✅ Payment Intent ID matches');
  } else {
    console.log(`❌ Payment Intent ID mismatch!`);
    console.log(`   Expected: ${paymentIntentId}`);
    console.log(`   Found: ${returnRecord.return_label_payment_intent_id}`);
  }
  
  // Step 3: Try to update status (simulate webhook)
  console.log(`\nStep 3: Simulate status update...`);
  const { data: updatedReturn, error: updateError } = await supabase
    .from('returns')
    .update({
      status: 'return_label_payment_completed',
      return_label_payment_status: 'completed',
      return_label_paid_at: new Date().toISOString(),
    })
    .eq('id', returnId)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    console.error('   Details:', updateError);
    process.exit(1);
  }
  
  console.log('✅ Status update successful');
  console.log(`   New status: ${updatedReturn.status}`);
  console.log(`   Payment status: ${updatedReturn.return_label_payment_status}`);
  
  // Step 4: Check label generation endpoint
  console.log(`\nStep 4: Check label generation...`);
  const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app';
  
  if (!INTERNAL_API_SECRET) {
    console.error('❌ INTERNAL_API_SECRET not set!');
    console.error('   Label generation will NOT work');
  } else {
    console.log('✅ INTERNAL_API_SECRET is set');
    console.log(`   Would call: ${SITE_URL}/api/returns/${returnId}/generate-label`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All checks passed - webhook should work');
  console.log('\n💡 If status is not updating in admin, check:');
  console.log('   1. Vercel logs for webhook errors');
  console.log('   2. If label generation is failing (SendCloud config?)');
  console.log('   3. If INTERNAL_API_SECRET is correct in Vercel');
}

debugWebhook().catch(console.error);


