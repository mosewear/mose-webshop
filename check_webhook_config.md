# WEBHOOK PROBLEEM - CHECKLIST

## STAP 1: Check Stripe Webhook Configuratie
Ga naar: https://dashboard.stripe.com/webhooks

### CHECK:
1. Is er een webhook geconfigureerd?
2. Wat is de webhook URL? (moet zijn: https://jouw-domain.com/api/stripe-webhook)
3. Welke events zijn geconfigureerd?

### MOET ZIJN:
✅ payment_intent.succeeded (PRIMARY - voor Payment Element)
✅ payment_intent.payment_failed
✅ charge.refunded
✅ checkout.session.completed (optional - legacy)
✅ checkout.session.expired (optional - legacy)

## STAP 2: Check Webhook Secret
In Vercel Environment Variables:
- STRIPE_WEBHOOK_SECRET moet matchen met signing secret in Stripe

## STAP 3: Check laatste webhook calls
In Stripe Dashboard → Webhooks → [jouw webhook] → Logs
- Zie je recent events?
- Zijn ze successful of failed?
- Welke event types komen binnen?

## STAP 4: Manual test
Je kunt in Stripe een event opnieuw verzenden om te testen
