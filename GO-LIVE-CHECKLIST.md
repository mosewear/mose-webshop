# 🚀 GO-LIVE CHECKLIST - MOSEWEAR.COM

## ✅ STAP 1: VERCEL DOMAIN SETUP
1. Ga naar Vercel → Settings → Domains
2. Voeg toe: `mosewear.com`
3. Voeg toe: `www.mosewear.com` (redirect naar mosewear.com)
4. Volg Vercel's DNS instructies bij je domain provider

---

## ✅ STAP 2: UPDATE ENVIRONMENT VARIABLES

### In Vercel (Settings → Environment Variables):

**Update `NEXT_PUBLIC_SITE_URL`:**
- **Oude waarde**: `https://mose-webshop.vercel.app`
- **Nieuwe waarde**: `https://www.mosewear.com` (of `https://mosewear.com`)
- **Omgevingen**: Production, Preview, Development

**Belangrijk:**
- Dit zorgt ervoor dat alle absolute URLs naar je nieuwe domain wijzen
- Product images in emails krijgen automatisch de juiste URL
- Stripe redirects werken correct

---

## ✅ STAP 3: STRIPE WEBHOOK UPDATE

### Ga naar: https://dashboard.stripe.com/webhooks

1. **Klik op je webhook** (`MOSE Webshop`)
2. **Klik "Bewerken"** (of maak nieuwe aan)
3. **Update Endpoint URL**:
   - **Oude**: `https://mose-webshop.vercel.app/api/stripe-webhook`
   - **Nieuwe**: `https://www.mosewear.com/api/stripe-webhook`
4. **Events blijven hetzelfde**:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
5. **Klik "Endpoint bijwerken"**

**⚠️ BELANGRIJK:** 
- De webhook secret blijft hetzelfde
- Je hoeft STRIPE_WEBHOOK_SECRET NIET aan te passen in Vercel

---

## ✅ STAP 4: SENDCLOUD WEBHOOK UPDATE

### Ga naar: Sendcloud → Settings → Integrations → Webhooks

1. **Update webhook URL**:
   - **Oude**: `https://mose-webshop.vercel.app/api/sendcloud-webhook`
   - **Nieuwe**: `https://www.mosewear.com/api/sendcloud-webhook`
2. **Klik "Save"**

---

## ✅ STAP 5: VERCEL DEPLOYMENT

1. Na het updaten van `NEXT_PUBLIC_SITE_URL`:
2. Ga naar Vercel → Deployments
3. Klik op de laatste deployment
4. Klik **"Redeploy"**
5. Wacht tot deployment klaar is (1-2 min)

---

## ✅ STAP 6: DNS PROPAGATION

**Wacht 5-30 minuten** voor DNS propagation (kan tot 24 uur duren, meestal veel sneller)

Check met: https://dnschecker.org

---

## ✅ STAP 7: VERIFICATIE CHECKLIST

### Test deze dingen na go-live:

#### Website:
- [ ] https://www.mosewear.com laadt correct
- [ ] https://mosewear.com redirect naar www (of andersom)
- [ ] SSL certificaat werkt (groene slot in browser)
- [ ] Alle product images laden

#### Checkout Flow:
- [ ] Product toevoegen aan cart
- [ ] Checkout pagina werkt
- [ ] Betaling via Stripe werkt
- [ ] Redirect terug naar site werkt

#### Emails:
- [ ] Order confirmation email ontvangen
- [ ] Product images zichtbaar in email
- [ ] Afzender: bestellingen@orders.mosewear.nl
- [ ] Links in email werken

#### Webhooks:
- [ ] Stripe webhook logs tonen success (✓)
- [ ] Order status wordt automatisch "Betaald"
- [ ] Sendcloud webhook werkt

#### Admin:
- [ ] Admin panel bereikbaar
- [ ] Orders tonen correct
- [ ] Analytics werkt
- [ ] Shipping labels aanmaken werkt

---

## 🔧 QUICK COMMANDS

### Update NEXT_PUBLIC_SITE_URL via Vercel CLI:
```bash
# Remove old
vercel env rm NEXT_PUBLIC_SITE_URL production

# Add new
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://www.mosewear.com

# Redeploy
vercel --prod
```

---

## 📝 BELANGRIJK OM TE WETEN

### WAT BLIJFT HETZELFDE:
✅ Database (Supabase) - geen changes nodig
✅ Stripe API keys - blijven werken
✅ Sendcloud API keys - blijven werken
✅ Resend API key - blijft werken
✅ Email domain (orders.mosewear.nl) - blijft werken
✅ Webhook secrets - hoeven niet aangepast

### WAT MOET AANGEPAST:
❗ NEXT_PUBLIC_SITE_URL environment variable
❗ Stripe webhook URL
❗ Sendcloud webhook URL
❗ Vercel domain settings

---

## 🆘 TROUBLESHOOTING

### Als emails niet werken:
1. Check Vercel logs: `vercel logs --prod`
2. Check Stripe webhook logs: https://dashboard.stripe.com/webhooks
3. Check Resend logs: https://resend.com/emails

### Als webhooks falen:
1. Verify webhook URLs zijn correct
2. Check webhook secrets in Vercel
3. Test webhook via Stripe dashboard ("Send test webhook")

### Als images niet laden:
1. Check NEXT_PUBLIC_SITE_URL is correct
2. Redeploy Vercel
3. Hard refresh browser (Cmd+Shift+R)

---

## 📞 READY TO GO LIVE?

Volg deze checklist stap voor stap en alles blijft werken! 🚀

**Geschatte tijd:** 15-30 minuten (+ DNS propagation)

