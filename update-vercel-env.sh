#!/bin/bash

TOKEN="jEwVJoGHEPvH34Pg2jXliUP7"

echo "🔄 Updating all Vercel environment variables (without newlines)..."
echo ""

# Read .env.local and extract key-value pairs
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove quotes from value
  value=$(echo "$value" | sed 's/^"//' | sed 's/"$//')
  
  # Skip local-only vars
  [[ "$key" == "VERCEL_OIDC_TOKEN" ]] && continue
  [[ "$key" == "NEXT_PUBLIC_SITE_URL" ]] && continue
  
  echo "📝 Setting $key..."
  echo -n "$value" | vercel env add "$key" production --token "$TOKEN" --force > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✅ $key updated"
  else
    echo "❌ $key failed"
  fi
  
done < .env.local

echo ""
echo "✅ All environment variables updated!"
