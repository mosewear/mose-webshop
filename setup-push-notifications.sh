#!/bin/bash

echo "========================================="
echo "🔔 MOSE Admin Push Notifications Setup"
echo "========================================="
echo ""

# Check if web-push is installed
if ! npm list web-push &> /dev/null; then
  echo "❌ web-push not installed"
  echo "Run: npm install web-push"
  exit 1
fi

echo "📝 Generating VAPID keys..."
echo ""

# Generate VAPID keys
npx web-push generate-vapid-keys

echo ""
echo "========================================="
echo "✅ VAPID Keys Generated!"
echo "========================================="
echo ""
echo "📋 Add these to your .env.local file:"
echo ""
echo "VAPID_PUBLIC_KEY=<public_key_from_above>"
echo "VAPID_PRIVATE_KEY=<private_key_from_above>"
echo ""
echo "========================================="
echo "📝 Next Steps:"
echo "========================================="
echo ""
echo "1. Copy the keys above to .env.local"
echo "2. Run the Supabase migration:"
echo "   - Go to Supabase Dashboard → SQL Editor"
echo "   - Run: supabase/migrations/20260202000000_create_admin_push_subscriptions.sql"
echo ""
echo "3. Download a KaChing sound:"
echo "   - Visit: https://freesound.org/search/?q=cash+register"
echo "   - Save as: public/kaching.mp3"
echo ""
echo "4. Deploy to Vercel:"
echo "   - git add -A && git commit -m 'feat: KaChing notifications'"
echo "   - git push origin main"
echo ""
echo "5. Add env vars to Vercel:"
echo "   - VAPID_PUBLIC_KEY"
echo "   - VAPID_PRIVATE_KEY"
echo ""
echo "6. Test it:"
echo "   - Go to /admin on your phone"
echo "   - Click 'Enable KaChing'"
echo "   - Place a test order"
echo "   - KaChing! 💰"
echo ""
echo "========================================="




