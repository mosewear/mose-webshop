# Webhook Setup Status

## ⚠️ Belangrijk Verschil

### Wat de tests WEL testen:
- ✅ **Code logica** - De flow werkt correct
- ✅ **Status updates** - Status transitions zijn correct
- ✅ **Polling mechanisme** - Polling werkt zoals verwacht
- ✅ **Error handling** - Errors worden correct afgehandeld
- ✅ **Edge cases** - Race conditions en timing issues

### Wat de tests NIET testen:
- ❌ **Stripe webhook connectiviteit** - Of Stripe daadwerkelijk je endpoint aanroept
- ❌ **Environment variables in productie** - Of de secrets correct zijn ingesteld
- ❌ **Webhook configuratie in Stripe Dashboard** - Of de webhook is toegevoegd

## 📋 Wat je nog moet doen:

### 1. Stripe Dashboard Webhook Configuratie

De webhook moet handmatig worden toegevoegd in Stripe Dashboard:

1. **Ga naar Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks

2. **Voeg webhook toe:**
   - Klik op "Add endpoint"
   - Endpoint URL: `https://mose-webshop.vercel.app/api/stripe-webhook`
   - Events om te luisteren: `payment_intent.succeeded`

3. **Kopieer signing secret:**
   - Na het aanmaken van de webhook, kopieer het "Signing secret"
   - Dit begint met `whsec_...`

### 2. Environment Variables in Vercel

Zorg dat deze environment variables zijn ingesteld in Vercel:

```bash
# Verplicht voor webhook verificatie
STRIPE_WEBHOOK_SECRET=whsec_...  # Van Stripe Dashboard

# Verplicht voor automatische label generatie
INTERNAL_API_SECRET=...  # Willekeurige geheime string

# Al ingesteld (hoop ik)
NEXT_PUBLIC_SITE_URL=https://mose-webshop.vercel.app
```

### 3. Test de Webhook

Na configuratie, test de webhook:

1. **Maak een test retour en betaal**
2. **Check Stripe Dashboard → Webhooks → Recent events**
   - Je zou een `payment_intent.succeeded` event moeten zien
   - Check of de response 200 OK is

3. **Check Vercel logs:**
   - Ga naar Vercel Dashboard → Logs
   - Zoek naar webhook logs met: `🔄 Webhook: Return label payment detected`

## ✅ Checklist

- [ ] Webhook toegevoegd in Stripe Dashboard
- [ ] Webhook endpoint URL is correct: `https://mose-webshop.vercel.app/api/stripe-webhook`
- [ ] Webhook luistert naar: `payment_intent.succeeded`
- [ ] `STRIPE_WEBHOOK_SECRET` is ingesteld in Vercel
- [ ] `INTERNAL_API_SECRET` is ingesteld in Vercel
- [ ] Webhook is getest met een echte betaling

## 🧪 Test Script

Run dit script om te checken of alles correct is geconfigureerd:

```bash
node check-webhook-status.js
```

Dit checkt:
- ✅ Code configuratie
- ✅ Environment variables (lokaal - niet in productie)
- ✅ Webhook route bestaat
- ✅ Correcte event handlers

**Maar het kan NIET checken:**
- ❌ Of de webhook in Stripe Dashboard is toegevoegd
- ❌ Of Stripe daadwerkelijk events stuurt
- ❌ Of environment variables in Vercel correct zijn

## 📊 Conclusie

**De code is klaar en getest** - maar je moet nog:
1. ✅ Webhook toevoegen in Stripe Dashboard
2. ✅ Environment variables instellen in Vercel
3. ✅ Testen met een echte betaling

De tests bewijzen dat de **logica correct is**, maar de **webhook moet nog geconfigureerd worden** in Stripe Dashboard voordat het werkt in productie.


