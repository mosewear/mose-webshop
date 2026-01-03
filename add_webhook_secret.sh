#!/bin/bash

# Add webhook secret to all environments
echo "Adding STRIPE_WEBHOOK_SECRET to Vercel..."

# For Production
vercel env add STRIPE_WEBHOOK_SECRET production <<< "whsec_VjeLlvntDPUtyX4nEmKAxsaVML7DGV90"

# For Preview  
vercel env add STRIPE_WEBHOOK_SECRET preview <<< "whsec_VjeLlvntDPUtyX4nEmKAxsaVML7DGV90"

# For Development
vercel env add STRIPE_WEBHOOK_SECRET development <<< "whsec_VjeLlvntDPUtyX4nEmKAxsaVML7DGV90"

echo "Done! Triggering redeploy..."
vercel --prod
