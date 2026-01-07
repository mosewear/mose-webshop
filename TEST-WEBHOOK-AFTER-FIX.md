# Test Webhook Na Fix

## ✅ Wat je hebt gedaan
- Alle newlines verwijderd van environment variables
- Code is aangepast om automatisch whitespace te trimmen

## 🧪 Test Stappen

### 1. Redeploy je App
De environment variables zijn gewijzigd, dus je moet redeployen:
- Vercel zou automatisch moeten redeployen
- Of handmatig: Vercel Dashboard → Deployments → ... → Redeploy

### 2. Test Normale Order Betaling
1. Maak een test order aan via checkout
2. Betaal met een test payment method
3. Check Stripe Dashboard → Webhooks → "MOSE Webshop" → Event Deliveries
4. Zoek naar `payment_intent.succeeded` event
5. Check of het nu **succesvol** is (200 OK) in plaats van failed

### 3. Test Return Label Betaling
1. Maak een retour aan
2. Betaal voor het retour label (€0.51)
3. Check Stripe Dashboard → Webhooks → "MOSE Webshop" → Event Deliveries
4. Zoek naar `payment_intent.succeeded` event met `return_label_payment` metadata
5. Check of het succesvol is
6. Check of:
   - ✅ Return status wordt geüpdatet naar `return_label_payment_completed`
   - ✅ Email wordt verstuurd naar klant
   - ✅ Label wordt automatisch gegenereerd

### 4. Check Vercel Logs
1. Ga naar Vercel Dashboard → Project → Logs
2. Zoek naar:
   - `💳 Webhook: Payment Intent Succeeded`
   - `🔄 Webhook: Return label payment detected`
   - `✅ Return payment status updated`
   - `✅ Return label generated automatically`

## ✅ Succes Criteria

Na de fix zou je moeten zien:
- ✅ Webhook deliveries zijn succesvol (200 OK) in Stripe Dashboard
- ✅ Geen signature verification errors meer
- ✅ Return label betalingen worden correct verwerkt
- ✅ Status updates werken automatisch
- ✅ Labels worden automatisch gegenereerd

## 🔍 Als het nog steeds niet werkt

1. **Check Stripe Dashboard → Webhooks → Event Deliveries:**
   - Welke error krijg je nu?
   - Is het nog steeds een signature error?

2. **Check Vercel Logs:**
   - Zie je webhook requests binnenkomen?
   - Welke errors zie je?

3. **Verify Secret:**
   - Stripe Dashboard → Webhooks → "MOSE Webshop" → "Geheime sleutel"
   - Kopieer het secret opnieuw
   - Check in Vercel of het exact matcht (zonder newlines)

## 📊 Monitoring

Na de fix, monitor de webhook success rate:
- Stripe Dashboard → Webhooks → "MOSE Webshop"
- Check "Foutpercentage" - zou nu 0% moeten zijn
- Check "Activiteit" - zou recente succesvolle deliveries moeten tonen

