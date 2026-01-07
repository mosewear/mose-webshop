# Webhook Fix - Status

## ✅ Wat is gedaan:

1. **Code fix:** Webhook secret wordt nu automatisch getrimd van whitespace
2. **Environment variables:** Alle newlines verwijderd in Vercel

## 📋 Wat je nu moet doen:

### 1. Redeploy de App
De code is al gepusht naar GitHub, maar je moet de app redeployen om de nieuwe code te gebruiken:
- Vercel zou automatisch moeten redeployen (check Vercel Dashboard)
- Of handmatig: Vercel Dashboard → Deployments → ... → Redeploy

### 2. Test de Webhook
Na de redeploy, test:

**Test 1: Normale Order Betaling**
1. Maak een test order via checkout
2. Betaal met test payment method
3. Check Stripe Dashboard → Webhooks → "MOSE Webshop" → Event Deliveries
4. Kijk of het `payment_intent.succeeded` event nu **succesvol** is (200 OK)

**Test 2: Return Label Betaling** ⭐ (Dit is de belangrijkste test!)
1. Maak een retour aan
2. Betaal voor het retour label (€0.51)
3. Check Stripe Dashboard → Webhooks → Event Deliveries
4. Zoek naar `payment_intent.succeeded` met return_label_payment metadata
5. Check of:
   - ✅ Webhook is succesvol (geen errors meer)
   - ✅ Return status wordt geüpdatet naar `return_label_payment_completed`
   - ✅ Email wordt verstuurd
   - ✅ Label wordt automatisch gegenereerd

### 3. Monitor Success Rate
- Stripe Dashboard → Webhooks → "MOSE Webshop"
- Check "Foutpercentage" - zou nu **0%** moeten zijn (in plaats van 100%)
- Check "Activiteit" - zou recente succesvolle deliveries moeten tonen

## 🎯 Verwachte Resultaten

Na de fix zou je moeten zien:
- ✅ **0% failures** in Stripe Dashboard
- ✅ Webhook deliveries zijn succesvol
- ✅ Return label betalingen werken automatisch
- ✅ Status updates gebeuren direct na betaling
- ✅ Labels worden automatisch gegenereerd

## 🔍 Als het nog steeds niet werkt

Check deze dingen:

1. **Redeploy:** Is de app gereployed met de nieuwe code?
2. **Secret match:** Matcht het secret in Vercel exact met Stripe Dashboard (zonder newlines)?
3. **Stripe Dashboard logs:** Welke error zie je nu in de failed events?
4. **Vercel logs:** Check Vercel Dashboard → Logs voor webhook errors

## 💡 Belangrijk

**Normale orders werken al** omdat ze een fallback mechanisme hebben via `/api/check-payment-status`. 

**Return label betalingen zijn nu 100% afhankelijk van de webhook** - daarom is het cruciaal dat de webhook werkt na deze fix.

