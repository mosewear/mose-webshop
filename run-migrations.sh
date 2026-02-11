#!/bin/bash

echo "🚀 Starting Favicon Migrations..."
echo ""
echo "⚠️  IMPORTANT: These migrations need to be run in Supabase SQL Editor"
echo ""
echo "==================================================================="
echo "MIGRATION 1: Add favicon_url to site_settings"
echo "==================================================================="
echo ""
cat supabase/migrations/20260201400000_add_favicon_setting.sql
echo ""
echo ""
echo "==================================================================="
echo "MIGRATION 2: Fix site_settings RLS policies"
echo "==================================================================="
echo ""
cat supabase/migrations/20260201410000_fix_site_settings_rls.sql
echo ""
echo ""
echo "==================================================================="
echo "📝 INSTRUCTIONS"
echo "==================================================================="
echo ""
echo "1. Copy MIGRATION 1 SQL (above) to clipboard"
echo "2. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor"
echo "3. Paste and run MIGRATION 1"
echo "4. Copy MIGRATION 2 SQL (above) to clipboard"
echo "5. Paste and run MIGRATION 2"
echo "6. Refresh your admin settings page"
echo "7. Upload the green M favicon"
echo "8. Hard refresh browser (Cmd+Shift+R)"
echo ""



