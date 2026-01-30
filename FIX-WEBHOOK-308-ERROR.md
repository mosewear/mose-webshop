# 🚨 STRIPE WEBHOOK 308 ERROR - DEFINITIEVE OPLOSSING

## 🔥 PROBLEEM GEVONDEN

De Stripe webhook krijgt **308 Permanent Redirect** errors omdat de webhook URL in Stripe Dashboard **ZONDER** www is geconfigureerd, maar de server redirect naar **MET** www.

### BEWIJS:
```bash
curl -I https://mosewear.com/api/stripe-webhook
# Response: HTTP/2 308 → location: https://www.mosewear.com/api/stripe-webhook

curl -I https://www.mosewear.com/api/stripe-webhook  
# Response: HTTP/2 405 (Method Not Allowed) ← CORRECT!
```

**Stripe webhooks volgen GEEN redirects!**
- ❌ 308/301/302 = Stripe behandelt dit als failure
- ✅ 200 OK = Success
- ✅ 405 = Ook OK (betekent endpoint bereikt, maar POST required)

---

## ✅ OPLOSSING: UPDATE WEBHOOK URL IN STRIPE

### Stap 1: Ga naar Stripe Webhooks Dashboard
🔗 https://dashboard.stripe.com/webhooks

### Stap 2: Vind je webhook endpoint
Zoek naar het endpoint met URL: `https://mosewear.com/api/stripe-webhook`

### Stap 3: Update de URL
1. Klik op het endpoint
2. Klik rechts op "..." (three dots menu)
3. Selecteer **"Update endpoint"**
4. Verander de **Endpoint URL** naar:
   ```
   https://www.mosewear.com/api/stripe-webhook
   ```
   ⚠️ **LET OP: MET www!**

### Stap 4: Verificeer Events
Zorg dat deze events **enabled** zijn:
- ✅ `payment_intent.succeeded` (primary)
- ✅ `checkout.session.completed` (legacy fallback)
- ✅ `charge.refunded` (optional - voor refunds)

### Stap 5: Save Changes
Klik op **"Update endpoint"** onderaan

---

## 🧪 VERIFICATIE NA FIX

### Test 1: Direct Webhook Test
In Stripe Dashboard:
1. Ga naar je webhook endpoint
2. Klik op "Send test webhook"
3. Selecteer `payment_intent.succeeded`
4. Click "Send test webhook"
5. **Status moet nu 200 zijn** (niet 308!)

### Test 2: Live Order Test
1. Doe een testbestelling op www.mosewear.com
2. Betaal met iDEAL (of testkaart in test mode)
3. Check Stripe → Webhooks → Recent deliveries
4. **Moet 200 OK tonen** (groen vinkje ✓)
5. Check je email inbox
6. **Je moet nu een order confirmation email ontvangen!** 📧

### Test 3: Vercel Logs Check
In Vercel logs (of via terminal):
```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  "https://api.vercel.com/v2/deployments/DEPLOYMENT_ID/events"
```
Zoek naar:
- ✅ `💳 Webhook: Payment Intent Succeeded`
- ✅ `📧 [WEBHOOK] Preparing to send order confirmation email`
- ✅ `✅ [WEBHOOK] Order confirmation email sent successfully!`

---

## 🎯 WAAROM DIT WERKT

**Voor de fix:**
```
Stripe → https://mosewear.com/api/stripe-webhook
         ↓ (308 Redirect - Stripe NIET volgen!)
         ❌ FAILURE
         ↓
         Retry 5x → Webhook disabled
```

**Na de fix:**
```
Stripe → https://www.mosewear.com/api/stripe-webhook
         ↓ (Direct hit, geen redirect!)
         ✅ 200 OK
         ↓
         Email sent! 📧
```

---

## 📝 EXTRA NOTES

### Waarom werd de webhook uitgeschakeld?
1. **308 errors** worden door Stripe gezien als failures
2. Na **5 consecutive failures** → Stripe disabled de webhook automatisch
3. Disabled webhook = geen emails meer!

### Waarom kregen we 308 redirects?
Vercel (of jouw DNS) is geconfigureerd om:
- `mosewear.com` → redirect naar → `www.mosewear.com`

Dit is **goed voor SEO** en **consistente URLs**, MAAR webhooks moeten direct naar de juiste URL wijzen!

### Kan ik de redirect uitschakelen?
**NEE - niet aangeraden!**
- De redirect is goed voor je website
- De oplossing is om de webhook URL correct te configureren in Stripe
- Stripe heeft dan een direct pad zonder redirects

### Moeten andere webhooks ook geüpdatet worden?
Check of je nog andere webhooks hebt:
- **SendCloud webhook**: Ook checken voor www
- **Facebook CAPI webhook**: Ook checken voor www
- Alle externe webhooks moeten naar `www.mosewear.com` wijzen

---

## ✅ CHECKLIST

- [ ] Stripe webhook URL geüpdatet naar `https://www.mosewear.com/api/stripe-webhook`
- [ ] Test webhook succesvol (200 OK in Stripe Dashboard)
- [ ] Live test order gedaan
- [ ] Email ontvangen
- [ ] Geen 308 errors meer in Stripe logs
- [ ] Webhook blijft enabled

---

## 🆘 ALS HET NOG STEEDS NIET WERKT

1. **Check Webhook Secret**
   - Vercel env var `STRIPE_WEBHOOK_SECRET` moet matchen met Stripe
   - Na URL update krijg je een nieuwe signing secret!
   - Update deze in Vercel environment variables

2. **Check Vercel Deployment**
   - Nieuwe deployment moet live zijn
   - Check of `www.mosewear.com` naar de juiste deployment wijst

3. **Check Stripe Account Mode**
   - Test mode webhook != Live mode webhook
   - Zorg dat je de LIVE webhook update (niet test)

4. **Manual Email Trigger**
   - Als webhook werkt maar email niet komt:
   - Check Resend dashboard: https://resend.com/emails
   - Zoek naar je order ID
   - Check delivery status

---

**TIMESTAMP:** 2026-01-30  
**ISSUE:** Stripe webhook 308 redirect causing disabled webhook  
**STATUS:** ✅ IDENTIFIED - Solution documented  
**ACTION REQUIRED:** Update webhook URL in Stripe Dashboard  

