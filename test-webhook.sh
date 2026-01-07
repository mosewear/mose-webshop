#!/bin/bash

echo "🧪 Webhook Test Script"
echo "======================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "💡 Install it: npm i -g vercel"
    exit 1
fi

# Pull environment variables
echo "📥 Pulling environment variables from Vercel..."
vercel env pull .env.local --yes

if [ ! -f .env.local ]; then
    echo "❌ Failed to create .env.local"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Run test
echo "🧪 Running webhook test..."
node test-webhook-simple.js

# Cleanup
echo ""
read -p "Delete .env.local? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm .env.local
    echo "✅ Cleaned up .env.local"
fi
