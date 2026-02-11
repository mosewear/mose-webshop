# ✅ KaChing Notifications - Setup Checklist

## 🎯 Wat Je Nu Moet Doen

### **1. Database Migration Uitvoeren** ⚠️ BELANGRIJK

Ga naar **Supabase Dashboard**:
1. Open https://supabase.com/dashboard
2. Selecteer je MOSE project
3. Ga naar **SQL Editor** (linker menu)
4. Klik **"New Query"**
5. Kopieer de volledige inhoud van dit bestand:
   ```
   /Users/rickschlimback/Desktop/mose-webshop/supabase/migrations/20260202000000_create_admin_push_subscriptions.sql
   ```
6. Plak in SQL Editor
7. Klik **"Run"** (of Cmd+Enter)
8. Je zou moeten zien: "Success. No rows returned"

**Verifieer:**
```sql
-- Run dit om te checken of tabel bestaat:
SELECT * FROM admin_push_subscriptions LIMIT 1;
```

---

### **2. KaChing Sound Downloaden** 🔊

Je hebt een `kaching.mp3` bestand nodig:

**Optie A - Freesound.org (gratis):**
1. Ga naar: https://freesound.org/search/?q=cash+register
2. Filter op **"Creative Commons 0"** (geen attributie nodig)
3. Preview een paar sounds
4. Download je favoriet als MP3
5. Hernoem naar: `kaching.mp3`
6. Plaats in: `/Users/rickschlimback/Desktop/mose-webshop/public/kaching.mp3`

**Optie B - Mixkit (gratis, geen account):**
1. Ga naar: https://mixkit.co/free-sound-effects/cash-register/
2. Download "Cash Register Sound"
3. Hernoem naar `kaching.mp3`
4. Plaats in `/Users/rickschlimback/Desktop/mose-webshop/public/`

**Aanbevolen eigenschappen:**
- **Duur:** 1-2 seconden (kort!)
- **Formaat:** MP3
- **Kwaliteit:** 128kbps is genoeg
- **Geluid:** Duidelijke "ka-ching" of cash register

**Na downloaden:**
```bash
cd /Users/rickschlimback/Desktop/mose-webshop
ls -lh public/kaching.mp3
# Zou ~20-50KB moeten zijn
```

---

### **3. Environment Variables in Vercel** 🔐

Ga naar **Vercel Dashboard**:
1. Open https://vercel.com/mosewear/mose-webshop
2. Ga naar **Settings** → **Environment Variables**
3. Voeg toe:

**Variable 1:**
```
Name: VAPID_PUBLIC_KEY
Value: BFTM1MZttVDeZO0rnwT2gZ3OfuxTYFNjtC0q5LHbA_f357LjhyKiiFxTvIy5BHrSHhx3seHH94ofWM0hAp3GbcA
Environment: Production, Preview, Development
```

**Variable 2:**
```
Name: VAPID_PRIVATE_KEY
Value: h4Oh2Xqt-2iInGEefR3VOXK4fweZvrgMWh01NBQdPbA
Environment: Production, Preview, Development
```

4. Klik **"Save"**
5. Klik **"Redeploy"** (rechtsboven)
6. Wacht tot deployment klaar is (~2 min)

---

### **4. Sound File Deployen** 📤

Als je de `kaching.mp3` hebt gedownload:

```bash
cd /Users/rickschlimback/Desktop/mose-webshop
git add public/kaching.mp3
git commit -m "feat: Add KaChing sound file"
git push origin main
```

Vercel zal automatisch re-deployen.

---

## 🧪 Testen

### **Desktop Test (Quick Verification)**

1. **Open Admin Panel:**
   - Ga naar: `https://mosewear.com/admin`
   - Of local: `http://localhost:3000/admin`

2. **Check Console:**
   - Open DevTools (F12 of Cmd+Opt+I)
   - Ga naar **Console** tab
   - Je zou moeten zien:
     ```
     [Admin PWA] Service Worker registered: /admin/
     ```

3. **Enable Notifications:**
   - Rechtsboven zie je: **"🔔 Enable KaChing"** button
   - Klik erop
   - Browser vraagt: "Allow notifications?" → **Allow**
   - Je hoort (als sound file er is): KaChing!
   - Je ziet een test notification

4. **Test Notification:**
   - Klik op **"🔔 Test"** button
   - Je zou moeten zien:
     - Push notification: "🛒 Test Order!"
     - KaChing geluid
     - Vibratie (op phone)

5. **Check Database:**
   - Ga naar Supabase → Table Editor
   - Open `admin_push_subscriptions`
   - Je zou 1 rij moeten zien met jouw `user_id`

---

### **iPhone Test (Real Scenario)** 📱

**Vereisten:**
- iOS 16.4 of hoger
- Safari browser

**Stappen:**

1. **Installeer als App:**
   - Open Safari
   - Ga naar `https://mosewear.com/admin`
   - Login als admin
   - Klik **Share button** (vierkant met pijl omhoog)
   - Scroll naar beneden
   - Klik **"Add to Home Screen"**
   - Klik **"Add"**
   - MOSE Admin icon verschijnt op je homescreen

2. **Open de App:**
   - Tap op **MOSE Admin** icon (niet Safari!)
   - Login indien nodig

3. **Enable Notifications:**
   - Je ziet automatisch een prompt na 3 seconden
   - Of: Tap op **"🔔 Enable KaChing"** (rechtsonder)
   - iOS vraagt: "Allow notifications?"
   - Tap **"Allow"**
   - Je hoort KaChing!
   - Je ziet een test notification

4. **Test Notification:**
   - Tap op **"🔔 Test"** button
   - Notification verschijnt bovenin scherm
   - Swipe down om te zien
   - Tap notification → opens admin/orders

5. **Background Test:**
   - Sluit de app (swipe up)
   - Plaats een test order (op andere device)
   - **KaChing!** Je krijgt een notification! 💰

---

### **Android Test** 🤖

**Vereisten:**
- Android 5.0+ met Chrome

**Stappen:**

1. **Installeer als App:**
   - Open Chrome
   - Ga naar `https://mosewear.com/admin`
   - Login als admin
   - Je ziet een banner: **"Add MOSE Admin to Home screen"**
   - Tap **"Install"**
   - Of: Menu (⋮) → "Add to Home screen"

2. **Open de App:**
   - Tap op **MOSE Admin** icon
   - Login indien nodig

3. **Enable Notifications:**
   - Tap op **"🔔 Enable KaChing"**
   - Chrome vraagt: "Allow notifications?"
   - Tap **"Allow"**
   - Je hoort KaChing!
   - Je ziet een notification

4. **Test:**
   - Tap **"🔔 Test"**
   - Notification verschijnt in notification tray
   - Phone trilt
   - Tap notification → opens admin

---

## 🎯 End-to-End Test (Real Order)

**Volledige flow testen:**

1. **Phone Setup:**
   - Install PWA op je phone
   - Enable notifications
   - Close app / lock screen

2. **Place Order:**
   - Op andere device: `https://mosewear.com`
   - Add product to cart
   - Checkout
   - Betaal met test card: `4242 4242 4242 4242`

3. **Verwacht Resultaat:**
   - 📧 Customer krijgt order confirmation email
   - 💰 **KaChing!** Je phone trilt + geluid
   - 🔔 Notification verschijnt:
     ```
     🛒 KaChing! Nieuwe Order!
     €99.99 - John Doe
     2 items
     ```
   - Tap notification → Admin panel opens met nieuwe order

4. **Verifieer:**
   - Check Vercel logs voor:
     ```
     [Push] Sending order notification to admins
     [Push] Notification sent to user: <your_user_id>
     ```

---

## 🐛 Troubleshooting

### "Enable KaChing button zichtbaar niet"

**Oorzaak:** Browser ondersteunt geen Push API

**Fix:**
- ✅ Chrome/Edge: Volledig ondersteund
- ✅ Firefox: Volledig ondersteund  
- ✅ Safari iOS 16.4+: Alleen in **installed PWA**
- ❌ Safari iOS <16.4: Niet ondersteund
- ❌ Safari macOS: Wel push, maar niet via Web Push API

**Check support:**
```javascript
// In console:
console.log('ServiceWorker:', 'serviceWorker' in navigator)
console.log('PushManager:', 'PushManager' in window)
```

---

### "Notification permission denied"

**Oorzaak:** Browser heeft notifications geblokkeerd

**Fix iPhone:**
1. Settings → Safari
2. Scroll naar "MOSE Admin"
3. Notifications → Allow

**Fix Android:**
1. Settings → Apps
2. Find Chrome/MOSE Admin
3. Notifications → Allow

**Fix Desktop:**
1. Browser → Settings
2. Privacy & Security → Site Settings
3. Notifications
4. Find mosewear.com → Allow

---

### "KaChing geluid speelt niet"

**Check 1: File exists?**
```bash
curl -I https://mosewear.com/kaching.mp3
# Should return: 200 OK
```

**Check 2: Browser autoplay policy**
- Some browsers block autoplay
- User must interact with page first
- Notification **itself** will still show + vibrate

**Check 3: Volume**
- Phone not on silent mode?
- Browser sound enabled?
- System volume > 0?

**Fix:**
```javascript
// Test in console:
const audio = new Audio('/kaching.mp3')
audio.volume = 1.0
audio.play()
```

---

### "No notifications after order"

**Check 1: Is Vercel deployment live?**
```bash
curl -I https://mosewear.com/api/admin/push/vapid-public-key
# Should return: 200 OK
```

**Check 2: Environment variables set?**
- Vercel → Settings → Environment Variables
- Check: VAPID_PUBLIC_KEY
- Check: VAPID_PRIVATE_KEY

**Check 3: Subscription saved?**
```sql
-- In Supabase SQL Editor:
SELECT * FROM admin_push_subscriptions;
-- Should show at least 1 row
```

**Check 4: Vercel logs**
- Vercel → Deployments → Latest
- Functions → `/api/stripe-webhook`
- Search for: `[Push]`
- Should see:
  ```
  [Push] Sending order notification to admins
  [Push] Found 1 admin subscription(s)
  [Push] Notification sent to user: ...
  ```

**Check 5: Webhook working?**
```bash
# Check recent orders:
# Supabase → Table Editor → orders
# Recent order should have:
# - payment_status: 'paid'
# - paid_at: <timestamp>
```

---

### "Service Worker not registering"

**Oorzaak:** Scope mismatch or cache issue

**Fix 1: Clear cache**
- DevTools → Application → Service Workers
- Click "Unregister"
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)

**Fix 2: Check scope**
```javascript
// In console on /admin page:
navigator.serviceWorker.getRegistration('/admin/').then(reg => {
  console.log('Registered:', reg)
  console.log('Scope:', reg?.scope)
})
// Should show: scope: "https://mosewear.com/admin/"
```

**Fix 3: HTTPS required**
- ✅ Production: HTTPS (Vercel)
- ✅ Localhost: HTTP OK for dev
- ❌ IP address: Not allowed (use localhost)

---

## 📊 Monitoring

### **Active Subscriptions:**

```sql
-- Supabase SQL Editor:
SELECT 
  aps.id,
  p.email,
  aps.created_at,
  LEFT(aps.endpoint, 50) || '...' as endpoint_preview
FROM admin_push_subscriptions aps
JOIN profiles p ON p.id = aps.user_id
WHERE p.is_admin = true
ORDER BY aps.created_at DESC;
```

### **Recent Notifications:**

Check Vercel logs:
```
Vercel Dashboard → Functions → Filter: "[Push]"
```

Should show:
```
[Push] Sending order notification to admins: {...}
[Push] Found X admin subscription(s)
[Push] Notification sent to user: ...
[Push] Notification summary: X sent, 0 failed
```

---

## ✅ Success Criteria

Alles werkt als:

- ✅ Database tabel `admin_push_subscriptions` bestaat
- ✅ VAPID keys in Vercel environment variables
- ✅ `kaching.mp3` gedeployed naar production
- ✅ Service Worker registreert op `/admin/`
- ✅ Enable KaChing button zichtbaar in admin
- ✅ Test notification werkt
- ✅ Real order → notification komt aan
- ✅ KaChing geluid speelt
- ✅ Phone trilt
- ✅ Tap notification → admin opens

---

## 🎉 Je Bent Klaar!

Als alles werkt:

1. ✅ Database migratie gedraaid
2. ✅ VAPID keys in Vercel
3. ✅ KaChing sound gedownload + gedeployed
4. ✅ PWA installed op je phone
5. ✅ Notifications enabled
6. ✅ Test notification werkt
7. ✅ Real order notification werkt

**Gefeliciteerd! Je krijgt nu KaChing notifications bij elke order! 💰🔔**

---

## 📝 Next Steps (Optioneel)

Toekomstige verbeteringen:

- [ ] Badge count voor unread orders
- [ ] Different sound voor grote orders (>€100)
- [ ] Daily summary notification (08:00)
- [ ] Low stock alerts
- [ ] Return request notifications
- [ ] Admin settings page voor notification preferences

Enjoy je KaChing notifications! 🚀




