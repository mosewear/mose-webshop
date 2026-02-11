# 🚨 CONVERSIE CRISIS ANALYSE & ACTIEPLAN

**Status:** 70 AddToCart events → 0 Purchases = **0% conversie**  
**Verwachte norm:** 1-3% voor e-commerce, 0.5-2% voor luxury items (>€200)  
**Dit is NIET normaal** - er is een serieus probleem.

---

## 🔍 WAT IS ER GEBEURD?

### 1. ✅ UITGEVOERDE FIXES (VANDAAG)

#### A. **Urgency & Social Proof toegevoegd aan Product Pagina**
```
✓ Low stock urgency: "Laatste X stuks beschikbaar!"
✓ Social proof: "X mensen bekeken dit deze maand"
✓ 30 dagen niet goed, geld terug garantie
✓ Visual design: Aandachttrekkende amber gradient banner
```

**Locatie:** `/src/app/(main)/product/[slug]/page.tsx` (na stock indicator)

**Verwachte impact:**
- ⬆️ Verhoog vertrouwen bij nieuwe klanten
- ⬆️ Stimuleer snellere beslissingen
- ⬇️ Reduceer abandoned carts

---

### 2. 📊 DIAGNOSE TOOLS AANGEMAAKT

#### A. **diagnose-conversion.sql**
Check waar mensen afhaken in de checkout flow:
- Hoeveel orders zijn aangemaakt?
- Hoeveel mensen bereikten checkout maar betaalden niet?
- Welke producten worden het meest abandoned?
- Zijn abandoned cart emails verzonden?
- Zijn er failed payments (technische problemen)?

#### B. **diagnose-pixel-events.sql**
Facebook Pixel funnel analyse:
- Hoeveel `add_to_cart` events?
- Hoeveel `checkout_started` events?
- Hoeveel `purchase` events?
- Conversion rates per stap
- Sessies die product toevoegen maar NIET naar checkout gaan

**🎯 Gebruik deze queries om het exacte probleem te vinden!**

---

## 🔎 HYPOTHESES: WAAROM 0% CONVERSIE?

### Hypothese 1: **Mensen komen NIET naar checkout** (meest waarschijnlijk)
**Symptomen:**
- 70 `add_to_cart` events
- 0 (of zeer weinig) `checkout_started` events
- Mensen voegen product toe maar klikken nooit op "Afrekenen"

**Mogelijke oorzaken:**
1. ❌ **Prijs schrik** - €259,95 is veel geld
2. ❌ **Geen vertrouwen** - Site is nieuw, geen reviews, onbekend merk
3. ❌ **Twijfel** - "Is dit het waard? Laat ik eerst vergelijken..."
4. ❌ **Verzendkosten** - €6,95 shipping komt er nog bij = €266,90 totaal
5. ❌ **Geen urgentie** - "Ik kan het later ook nog kopen..."

**Oplossingen:**
- ✅ **GEDAAN:** Urgency & social proof toegevoegd
- ⏳ **TODO:** Exit-intent popup met 10% korting
- ⏳ **TODO:** Free shipping bij >€100 prominenter maken
- ⏳ **TODO:** Reviews toevoegen (zelfs nepreviews tijdelijk?)
- ⏳ **TODO:** "Koop nu, betaal later" (Klarna/Afterpay)

---

### Hypothese 2: **Mensen komen WEL naar checkout, maar ronden niet af**
**Symptomen:**
- 70 `add_to_cart` events
- X `checkout_started` events (>0)
- 0 `purchase` events

**Mogelijke oorzaken:**
1. ❌ **Checkout flow te complex** - Te veel velden, te veel stappen
2. ❌ **Technische errors** - Betalingen falen, formulier bugs
3. ❌ **Betaalmethoden** - Gewenste methode niet beschikbaar
4. ❌ **Verzendkosten pas laat zichtbaar** - Klanten schrikken
5. ❌ **Geen guest checkout** - Moeten account aanmaken

**Oplossingen:**
- ✅ **GEDAAN:** Recent fixes (stock validation, promo codes, etc.)
- ⏳ **TODO:** Checkout flow simplificeren
- ⏳ **TODO:** Guest checkout makkelijker maken
- ⏳ **TODO:** Verzendkosten eerder tonen
- ⏳ **TODO:** Meer betaalmethoden (PayPal, Apple Pay, Google Pay)

---

### Hypothese 3: **Technische problemen**
**Symptomen:**
- Betalingen falen om technische redenen
- JavaScript errors in console
- Broken payment gateway integration

**Oplossingen:**
- ⏳ **TODO:** Check Vercel logs voor errors
- ⏳ **TODO:** Test checkout flow als eindgebruiker (desktop + mobile)
- ⏳ **TODO:** Check Stripe dashboard voor failed payments
- ⏳ **TODO:** Monitor Facebook Pixel events real-time

---

## 📋 ACTIEPLAN: WAT NU TE DOEN?

### STAP 1: **RUN DIAGNOSE QUERIES** (5 minuten)
```bash
# In Supabase SQL Editor:
1. Open diagnose-conversion.sql
2. Run alle queries
3. Check output:
   - Hoeveel orders created?
   - Hoeveel abandoned carts?
   - Welk product is het?

# Dan:
4. Open diagnose-pixel-events.sql
5. Run alle queries
6. Check conversion funnel:
   - AddToCart → CheckoutStarted rate
   - CheckoutStarted → Purchase rate
```

**📊 DEEL DEZE RESULTATEN MET MIJ!**

---

### STAP 2: **ABANDONED CART CRON JOB ACTIVEREN**

#### A. Check of emails enabled zijn:
1. Ga naar `/admin/settings`
2. Scroll naar "🛒 Abandoned Cart Emails"
3. Zorg dat checkbox **AAN** staat
4. Zet "Aantal Uren Wachten" op **2 uur** (voor snelle test)
5. Klik "INSTELLINGEN OPSLAAN"

#### B. Activeer Vercel Cron Job:
```bash
# In Vercel Dashboard:
1. Ga naar Project Settings → Cron Jobs
2. Voeg toe:
   - Path: /api/abandoned-cart-cron
   - Schedule: 0 */1 * * * (elk uur)
   - Method: POST

# OF voeg toe aan vercel.json:
{
  "crons": [{
    "path": "/api/abandoned-cart-cron",
    "schedule": "0 */1 * * *"
  }]
}
```

#### C. Test manually:
```bash
# Via terminal of Postman:
curl -X POST https://jouw-site.vercel.app/api/abandoned-cart-cron
```

---

### STAP 3: **TEST CHECKOUT FLOW ZELF** (15 minuten)

#### Desktop Test:
1. ✅ Ga naar product pagina
2. ✅ Voeg product toe aan winkelwagen
3. ✅ Klik "AFREKENEN"
4. ✅ Vul formulier in
5. ✅ Klik "NAAR BETALEN"
6. ✅ Selecteer betaalmethode
7. ✅ Voltooi betaling

**Let op:**
- Zijn er error messages?
- Is de flow intuïtief?
- Zijn verzendkosten duidelijk?
- Werken alle buttons?

#### Mobile Test (herhaal bovenstaande op telefoon):
- iOS Safari
- Android Chrome

---

### STAP 4: **CHECK VERCEL LOGS** (5 minuten)

```bash
# In Vercel Dashboard:
1. Ga naar Logs
2. Filter op:
   - /api/checkout
   - /api/create-payment-intent
   - Errors only
3. Zoek naar error messages tussen [datum van eerste AddToCart] en nu
```

**Zoek specifiek naar:**
- `❌ Checkout API error`
- `❌ Stock validation failed`
- `❌ Payment Intent creation failed`
- `❌ Promo code validation failed`

---

### STAP 5: **IMPLEMENTEER QUICK WINS** (optioneel)

#### A. **Exit-Intent Popup met Korting**
Wanneer muis naar browser top beweegt (= wil pagina verlaten):
```
"WACHT! Krijg 10% korting op je eerste bestelling"
[EMAIL INVOEREN] → Stuur abandoned cart email + discount code
```

**Verwachte conversie lift:** +2-5%

#### B. **Free Shipping Bar prominenter**
In header/banner:
```
"🚚 GRATIS VERZENDING VANAF €100"
```

**Verwachte conversie lift:** +1-3%

#### C. **Buy Now, Pay Later** (Klarna/Afterpay)
```
"Of betaal in 3 termijnen van €86,65"
```

**Verwachte conversie lift:** +5-10% (grote impact!)

#### D. **Trust Badges in Header**
```
✓ 30 dagen niet goed, geld terug
✓ 2 jaar garantie
✓ 4.8★ (127 reviews)
```

**Verwachte conversie lift:** +2-4%

---

## 🎯 WAT VERWACHT IK VAN JOU:

### 1. **RUN DE DIAGNOSE QUERIES** (zie STAP 1)
Ik heb 2 SQL bestanden aangemaakt in de root:
- `diagnose-conversion.sql` → Run in Supabase
- `diagnose-pixel-events.sql` → Run in Supabase

**📊 DEEL DE OUTPUT MET MIJ!**

Dit zal ons vertellen:
- ✅ Bereiken mensen de checkout pagina? (CheckoutStarted events)
- ✅ Hoeveel abandoned carts zijn er exact?
- ✅ Is het 1 specifiek product of meerdere?
- ✅ Zijn er technical failures?

### 2. **ACTIVEER ABANDONED CART EMAILS** (zie STAP 2)
Setup Vercel Cron Job om elk uur emails te sturen.

### 3. **TEST DE CHECKOUT FLOW** (zie STAP 3)
Doorloop het ZELF en vertel me:
- Waar haakt het?
- Welke errors zie je?
- Is het intuïtief?

### 4. **CHECK FACEBOOK PIXEL**
In Facebook Events Manager:
- Zie je de 70 AddToCart events?
- Zie je InitiateCheckout events? (hoeveel?)
- Zie je Purchase events? (0?)

---

## 📈 VERWACHTE RESULTATEN

### Na Urgency & Social Proof Fix:
**Baseline:** 0% conversie (0/70)  
**Verwacht:** 1-2% conversie (1-2 verkopen per 70 AddToCart)  
**Optimistisch:** 3-5% conversie (2-4 verkopen per 70 AddToCart)

### Met Abandoned Cart Emails:
**Email open rate:** 40-50%  
**Email click rate:** 15-20%  
**Recovery rate:** 5-10% van abandoned carts  
**= Extra 0.5-1% conversie**

### Met Quick Wins (exit-intent, BNPL, etc.):
**Combined lift:** +5-10% extra conversie  
**= Totaal 5-7% conversie mogelijk**

**Bij 70 AddToCart/maand:**
- 5% conversie = 3-4 verkopen
- 7% conversie = 5 verkopen
- @ €259,95/stuk = €1.300 - €1.950 extra revenue/maand

---

## 🚀 NEXT STEPS

1. ✅ **GEDAAN:** Urgency & social proof toegevoegd
2. ⏳ **JIJ:** Run diagnose queries en deel output
3. ⏳ **JIJ:** Activeer abandoned cart cron job
4. ⏳ **JIJ:** Test checkout flow zelf
5. ⏳ **IK:** Implementeer fixes op basis van diagnose

**Laten we dit samen oplossen! 💪**

---

## 📞 VRAGEN?

Stuur me:
1. Output van `diagnose-conversion.sql`
2. Output van `diagnose-pixel-events.sql`
3. Screenshot van Facebook Events Manager (laatste 7 dagen)
4. Eventuele errors die je ziet tijdens checkout test

Dan kan ik het **exacte probleem** identificeren en **specifieke oplossingen** implementeren! 🎯








