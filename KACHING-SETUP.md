# 🔔 KaChing! Push Notifications - Admin Setup Guide

## Wat is dit?

Een **PWA (Progressive Web App)** voor het MOSE Admin panel die **instant push notifications** stuurt naar je telefoon bij elke nieuwe order - compleet met een **KaChing!** geluid! 💰

### Features:
- ✅ **Instant notifications** bij nieuwe orders
- ✅ **Custom KaChing geluid**
- ✅ **Installable app** op iPhone & Android  
- ✅ **Badge counts** voor ongelezen orders
- ✅ **Werkt in achtergrond** (ook als browser gesloten is)
- ✅ **100% isolated** van customer website (geen impact)
- ✅ **Vibration** support
- ✅ **Quick actions**: View Order / Close

---

## 🚀 Setup (Stap voor Stap)

### **Stap 1: Genereer VAPID Keys**

```bash
cd /Users/rickschlimback/Desktop/mose-webshop
./setup-push-notifications.sh
```

Dit genereert VAPID keys die je nodig hebt voor Web Push.

### **Stap 2: Voeg Keys toe aan .env.local**

Kopieer de generated keys naar `.env.local`:

```env
VAPID_PUBLIC_KEY=<your_public_key_here>
VAPID_PRIVATE_KEY=<your_private_key_here>
```

### **Stap 3: Run Database Migration**

Ga naar **Supabase Dashboard → SQL Editor** en run:

```sql
-- Kopieer de inhoud van:
supabase/migrations/20260202000000_create_admin_push_subscriptions.sql
```

Dit maakt de `admin_push_subscriptions` tabel aan.

### **Stap 4: Download KaChing Sound**

1. Ga naar: https://freesound.org/search/?q=cash+register  
2. Download een leuke cash register sound (MP3, 1-2 sec)
3. Hernoem naar `kaching.mp3`
4. Plaats in: `public/kaching.mp3`

**Aanbevolen sounds:**
- "Cash Register Ka-ching"
- "Cha-ching Sound Effect"
- Kort, duidelijk, niet te lang

### **Stap 5: Deploy naar Vercel**

```bash
git add -A
git commit -m "feat: KaChing push notifications voor admin"
git push origin main
```

### **Stap 6: Voeg Env Vars toe in Vercel**

Ga naar **Vercel Dashboard → Settings → Environment Variables**:

- `VAPID_PUBLIC_KEY`: <your_public_key>
- `VAPID_PRIVATE_KEY`: <your_private_key>

Klik **"Redeploy"** na het toevoegen.

---

## 📱 Gebruiken op je Phone

### **Installeren als App**

#### **iPhone (iOS 16.4+):**
1. Open Safari
2. Ga naar `https://mosewear.com/admin`
3. Klik Share button (⬆️)
4. Scroll → "Add to Home Screen"
5. Klik "Add"
6. MOSE Admin icon verschijnt op je homescreen

#### **Android:**
1. Open Chrome
2. Ga naar `https://mosewear.com/admin`
3. Je ziet een "Install app" banner
4. Klik "Install"
5. Of: Menu → "Add to Home screen"

### **Activeren van Notifications**

1. **Open MOSE Admin app** (of ga naar /admin in browser)
2. Je ziet rechtsonder: **"🔔 Enable KaChing"** button
3. Klik erop
4. Browser vraagt: "Allow notifications?" → **Allow**
5. Je hoort een KaChing! en ziet een test notificatie
6. **Done!** ✅

### **Testen**

1. Klik op **"🔔 Test"** button (rechtsonder in admin)
2. Je hoort een KaChing en ziet een test order notification
3. Klik op de notification → opens /admin/orders

---

## 🔧 Hoe Werkt Het?

### **Architecture:**

```
Order Payment (Stripe)
    ↓
Webhook Triggered
    ↓
Stripe Webhook Handler
    ↓
sendOrderNotificationToAdmins()
    ↓
Fetch admin_push_subscriptions from DB
    ↓
Send Web Push to all admins
    ↓
Service Worker receives push
    ↓
Show notification + Play KaChing!
    ↓
💰 KaChing!
```

### **Files Created:**

```
public/
  ├── admin-manifest.json          # PWA manifest (admin only)
  ├── admin-sw.js                  # Service Worker (scope: /admin/)
  └── kaching.mp3                  # KaChing sound file

src/
  ├── components/admin/
  │   └── AdminPWASetup.tsx        # PWA setup UI component
  ├── app/api/admin/push/
  │   ├── vapid-public-key/route.ts  # VAPID public key endpoint
  │   ├── subscribe/route.ts          # Subscribe to push
  │   └── unsubscribe/route.ts        # Unsubscribe
  ├── lib/
  │   └── push-notifications.ts    # Utility to send push
  └── app/api/
      └── stripe-webhook/route.ts  # Updated with push logic

supabase/migrations/
  └── 20260202000000_create_admin_push_subscriptions.sql

setup-push-notifications.sh        # Setup helper script
```

### **Database:**

```sql
Table: admin_push_subscriptions
- id (UUID)
- user_id (UUID, refs auth.users)
- subscription (JSONB) -- Full Web Push subscription
- endpoint (TEXT) -- Push service URL
- created_at, updated_at
```

---

## 🛡️ Security & Privacy

### **Admin Only:**
- ✅ Push subscriptions require `is_admin = true`
- ✅ RLS policies prevent non-admins
- ✅ Service role bypasses RLS (for sending)

### **Isolated van Customers:**
- ✅ Service Worker scope: `/admin/` only
- ✅ Manifest alleen geladen in admin layout
- ✅ Geen impact op customer pages
- ✅ Geen extra JS/CSS voor shop

### **Data:**
- ✅ Subscriptions stored in Supabase (encrypted)
- ✅ VAPID keys in environment variables
- ✅ No sensitive order data in push payload
- ✅ Push endpoints auto-removed if invalid (410)

---

## 🐛 Troubleshooting

### **"Notifications not working"**

1. **Check browser support:**
   - ✅ Chrome, Edge, Firefox (desktop + mobile)
   - ✅ Safari iOS 16.4+ (must be installed as PWA)
   - ❌ Safari iOS < 16.4 (no push support)

2. **Check notification permission:**
   - Browser → Settings → Notifications → mosewear.com → Allow

3. **Check Vercel env vars:**
   - VAPID_PUBLIC_KEY set?
   - VAPID_PRIVATE_KEY set?

4. **Check Vercel logs:**
   - See `[Push]` log lines
   - Check for errors

### **"KaChing sound not playing"**

1. **File exists?**
   ```bash
   ls public/kaching.mp3
   ```

2. **Browser autoplay policy:**
   - Some browsers block auto-play
   - User must interact with page first
   - Notification sound should still work

3. **Volume:**
   - Check phone volume/silent mode
   - Check browser sound settings

### **"Service Worker not registering"**

1. **HTTPS required** (localhost is OK for dev)
2. **Clear cache:**
   - DevTools → Application → Service Workers → Unregister
   - Hard refresh (Cmd+Shift+R)

3. **Check scope:**
   - Service Worker scope must be `/admin/`
   - Check: `navigator.serviceWorker.controller?.scriptURL`

---

## 📊 Monitoring

### **Check Active Subscriptions:**

```sql
SELECT 
  aps.id,
  p.email,
  aps.endpoint,
  aps.created_at
FROM admin_push_subscriptions aps
JOIN profiles p ON p.id = aps.user_id
WHERE p.is_admin = true;
```

### **Test Push Manually:**

```typescript
// In Vercel Functions or local dev:
import { sendOrderNotificationToAdmins } from '@/lib/push-notifications'

await sendOrderNotificationToAdmins({
  orderId: 'test-123',
  orderTotal: 99.99,
  customerName: 'Test Customer',
  itemCount: 2
})
```

---

## 🎨 Customization

### **Change Notification Text:**

Edit `src/lib/push-notifications.ts`:

```typescript
const notificationPayload = {
  title: '🛒 KaChing! Nieuwe Order!',  // ← Change here
  body: `€${payload.orderTotal.toFixed(2)}...`,
  // ...
}
```

### **Change Sound:**

Replace `public/kaching.mp3` with your own sound file.

### **Change Icon:**

Update `icon` and `badge` in:
- `public/admin-manifest.json`
- `src/lib/push-notifications.ts`

---

## 🚀 Future Enhancements

Mogelijk in de toekomst:

- [ ] Custom sound per order amount (bigger orders = bigger ka-ching)
- [ ] Badge count voor unread orders
- [ ] Background sync voor offline mode
- [ ] Rich notifications met order preview image
- [ ] Daily summary notifications
- [ ] Low stock alerts
- [ ] Return request notifications

---

## 📝 Notes

- **iOS Safari:** Push only works in **installed PWA**, not in browser
- **Battery:** Push notifications are battery-efficient (iOS/Android optimized)
- **Offline:** Notifications queue if phone is offline, deliver when online
- **Multiple Devices:** You can enable on multiple devices (phone, tablet, laptop)

---

**Enjoy your KaChing notifications! 💰🔔**

Questions? Check Vercel logs or open DevTools console in /admin.

