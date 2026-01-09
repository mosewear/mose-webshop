# Webhook Troubleshooting - 100% Failures

## Probleem
Je webhook heeft 100% failures (60 mislukte leveringen). Dit betekent dat Stripe wel events stuurt, maar je endpoint niet correct reageert.

## Oplossing: Check Stripe Dashboard Logs

1. **Ga naar je webhook in Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks
   - Klik op "MOSE Webshop" webhook
   - Klik op "Gebeurtenisleveringen" (Event Deliveries)

2. **Klik op een mislukte event** en bekijk de error details:
   - Welke error code krijg je? (400, 401, 500?)
   - Wat is de error message?

## Meest Waarschijnlijke Oorzaken

### 1. STRIPE_WEBHOOK_SECRET is incorrect of niet ingesteld in Vercel

**Symptoom:** 401 Unauthorized errors in Stripe logs

**Oplossing:**
1. Ga naar Stripe Dashboard → Webhooks → "MOSE Webshop"
2. Klik op "Geheime sleutel voor ondertekening" → "Bekijken"
3. Kopieer het volledige secret (begint met `whsec_...`)
4. Ga naar Vercel Dashboard → Settings → Environment Variables
5. Update `STRIPE_WEBHOOK_SECRET` met het juiste secret
6. Redeploy je app

### 2. Webhook signature verification faalt

**Symptoom:** "Webhook signature verification failed" in Vercel logs

**Check:**
- Is `STRIPE_WEBHOOK_SECRET` correct ingesteld in Vercel?
- Matcht het secret met het signing secret in Stripe Dashboard?

### 3. Endpoint geeft een error

**Symptoom:** 500 Internal Server Error in Stripe logs

**Check Vercel logs:**
1. Ga naar Vercel Dashboard → Project → Logs
2. Zoek naar errors rond de tijd van de webhook failures
3. Check voor:
   - Database connection errors
   - Missing environment variables
   - Code errors

### 4. CORS of SSL Issues

**Symptoom:** Connection errors in Stripe logs

**Check:**
- Is je Vercel deployment actief?
- Is de URL correct: `https://mose-webshop.vercel.app/api/stripe-webhook`?

## Quick Fix Checklist

- [ ] Check Stripe Dashboard → Webhooks → "MOSE Webshop" → Event Deliveries → Klik op een failed event → Bekijk error details
- [ ] Check Vercel Dashboard → Logs voor errors rond de tijd van failures
- [ ] Verify `STRIPE_WEBHOOK_SECRET` in Vercel matcht met Stripe Dashboard secret
- [ ] Verify `INTERNAL_API_SECRET` is ingesteld in Vercel
- [ ] Test webhook handmatig via Stripe Dashboard → Webhooks → "Send test webhook"

## Test Webhook Handmatig

1. Ga naar Stripe Dashboard → Webhooks → "MOSE Webshop"
2. Klik op "Gebeurtenissen versturen" (Send test webhook)
3. Selecteer event type: `payment_intent.succeeded`
4. Klik "Gebeurtenis versturen" (Send event)
5. Check of het succesvol is

## Debug Endpoint

Je hebt al een debug endpoint: `/api/webhook-debug`

Test deze:
```bash
curl https://mose-webshop.vercel.app/api/webhook-debug
```

Dit toont:
- Of `STRIPE_WEBHOOK_SECRET` is ingesteld
- Of de webhook URL correct is
- Hulp voor troubleshooting

## Belangrijk

**Dezelfde webhook kan zowel normale orders als return label betalingen afhandelen!**

De code checkt automatisch:
- Als `metadata.type === 'return_label_payment'` → handelt return label payment af
- Anders → handelt normale order payment af

Je hoeft **GEEN extra webhook aan te maken** - los gewoon het 100% failure probleem op.


