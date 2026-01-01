#!/bin/bash

# 🔥 SERVER-SIDE CHECKOUT - Environment Variable Setup
# Run dit script om de SUPABASE_SERVICE_ROLE_KEY toe te voegen aan Vercel

echo "🔑 SERVER-SIDE CHECKOUT SETUP"
echo ""
echo "Stap 1: Haal je SUPABASE_SERVICE_ROLE_KEY op:"
echo "  → Ga naar: https://supabase.com/dashboard/project/_/settings/api"
echo "  → Kopieer de 'service_role' key (NIET de anon key!)"
echo ""
echo "Stap 2: Voeg toe aan Vercel:"
echo "  vercel env add SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "Stap 3: Deploy:"
echo "  git add ."
echo "  git commit -m 'feat: server-side checkout with service_role'"
echo "  git push"
echo ""
echo "✅ Dit lost het RLS probleem PERMANENT op!"


