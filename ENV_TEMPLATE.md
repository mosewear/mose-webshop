# 📋 **Environment Variables Setup**

Dit bestand laat zien welke environment variables je nodig hebt.
Kopieer dit naar `.env.local` en vul de echte waarden in.

## 🔐 **Supabase (Database & Auth)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 💳 **Stripe (Payments)**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📧 **Resend (Email)**
```bash
RESEND_API_KEY=re_...
```

## 📦 **Sendcloud (Shipping)**
```bash
SENDCLOUD_PUBLIC_KEY=your_sendcloud_public_key
SENDCLOUD_SECRET_KEY=your_sendcloud_secret_key
SENDCLOUD_WEBHOOK_SECRET=your_webhook_secret
```

## 🌐 **App Configuration**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 **Setup Instructies**

1. **Maak `.env.local` aan:**
   ```bash
   cp ENV_TEMPLATE.md .env.local
   ```

2. **Vul alle waarden in** (zie setup guides)

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

## 🔗 **Waar vind je de keys?**

- **Supabase**: [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API
- **Stripe**: [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
- **Resend**: [resend.com/api-keys](https://resend.com/api-keys)
- **Sendcloud**: [panel.sendcloud.sc](https://panel.sendcloud.sc) → Settings → Integrations → API

---

## ⚠️ **BELANGRIJK**

- **NOOIT** `.env.local` committen naar git
- **ALTIJD** echte keys gebruiken in productie (Vercel environment variables)
- **TEST** eerst met test/sandbox keys


