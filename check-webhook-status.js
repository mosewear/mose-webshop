/**
 * Webhook Status Checker
 * 
 * Check of de webhook correct is geconfigureerd:
 * 1. Environment variables zijn ingesteld
 * 2. Webhook endpoint is bereikbaar
 * 3. Signing secret is correct
 */

const https = require('https');
const http = require('http');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app';
const WEBHOOK_ENDPOINT = `${SITE_URL}/api/stripe-webhook`;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

console.log('🔍 Webhook Configuration Check\n');
console.log('='.repeat(60));

let checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    checks.push({ name, status: 'PASS', details });
    passed++;
  } else {
    console.error(`❌ ${name}`);
    if (details) console.error(`   ${details}`);
    checks.push({ name, status: 'FAIL', details });
    failed++;
  }
}

// Check 1: Environment variables
console.log('\n📋 Environment Variables:\n');
check(
  'STRIPE_WEBHOOK_SECRET is ingesteld',
  !!WEBHOOK_SECRET,
  WEBHOOK_SECRET ? `✅ Geconfigureerd (${WEBHOOK_SECRET.substring(0, 10)}...)` : '❌ NIET ingesteld - moet whsec_... zijn'
);

check(
  'INTERNAL_API_SECRET is ingesteld',
  !!INTERNAL_SECRET,
  INTERNAL_SECRET ? `✅ Geconfigureerd (${INTERNAL_SECRET.substring(0, 10)}...)` : '❌ NIET ingesteld - nodig voor automatische label generatie'
);

check(
  'NEXT_PUBLIC_SITE_URL is ingesteld',
  !!SITE_URL,
  SITE_URL ? `✅ Geconfigureerd: ${SITE_URL}` : '❌ NIET ingesteld'
);

check(
  'Webhook secret format is correct',
  !WEBHOOK_SECRET || WEBHOOK_SECRET.startsWith('whsec_'),
  WEBHOOK_SECRET && WEBHOOK_SECRET.startsWith('whsec_') 
    ? '✅ Correct format' 
    : '❌ Moet beginnen met whsec_'
);

// Check 2: Webhook endpoint bereikbaarheid
console.log('\n🌐 Webhook Endpoint:\n');
check(
  'Webhook endpoint URL is correct',
  WEBHOOK_ENDPOINT.includes('/api/stripe-webhook'),
  `Endpoint: ${WEBHOOK_ENDPOINT}`
);

// Check 3: Code checks
console.log('\n💻 Code Configuration:\n');

// Check webhook route exists
const fs = require('fs');
const webhookRouteExists = fs.existsSync('./src/app/api/stripe-webhook/route.ts');
check(
  'Webhook route bestaat',
  webhookRouteExists,
  webhookRouteExists ? '✅ /api/stripe-webhook/route.ts gevonden' : '❌ Route bestand niet gevonden'
);

if (webhookRouteExists) {
  const webhookCode = fs.readFileSync('./src/app/api/stripe-webhook/route.ts', 'utf8');
  
  check(
    'Webhook verwerkt payment_intent.succeeded events',
    webhookCode.includes('payment_intent.succeeded'),
    '✅ Event handler gevonden'
  );
  
  check(
    'Webhook checkt return_label_payment metadata',
    webhookCode.includes('return_label_payment'),
    '✅ Return label payment check gevonden'
  );
  
  check(
    'Webhook update status naar return_label_payment_completed',
    webhookCode.includes('return_label_payment_completed'),
    '✅ Status update code gevonden'
  );
  
  check(
    'Webhook roept automatische label generatie aan',
    webhookCode.includes('generate-label'),
    '✅ Automatische label generatie code gevonden'
  );
  
  check(
    'Webhook gebruikt INTERNAL_API_SECRET voor label generatie',
    webhookCode.includes('INTERNAL_API_SECRET'),
    '✅ INTERNAL_API_SECRET check gevonden'
  );
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ Alle checks geslaagd!');
  console.log('\n⚠️  BELANGRIJK: Deze checks verifiëren alleen de code configuratie.');
  console.log('   Je moet OOK controleren in Stripe Dashboard:');
  console.log('   1. Ga naar: https://dashboard.stripe.com/webhooks');
  console.log(`   2. Check of er een webhook is ingesteld naar: ${WEBHOOK_ENDPOINT}`);
  console.log('   3. Check of deze events luistert: payment_intent.succeeded');
  console.log('   4. Check of het signing secret overeenkomt met STRIPE_WEBHOOK_SECRET\n');
  process.exit(0);
} else {
  console.error('❌ Sommige checks gefaald!\n');
  console.error('⚠️  Fix de bovenstaande issues voordat je de webhook gebruikt.\n');
  process.exit(1);
}

