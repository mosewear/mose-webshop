# 🔧 SITE-WIDE SETTINGS AUDIT & FIX PLAN

## ❌ PROBLEMEN GEVONDEN:

### 1. **INCONSISTENTE FREE SHIPPING THRESHOLD**
   - **Moet zijn:** €100 (admin setting)
   - **Is nu:** €50 hardcoded op vele pagina's
   
   **Locaties met €50 hardcoded:**
   - `/src/app/(main)/page.tsx` - Hero section
   - `/src/app/(main)/product/[slug]/page.tsx` - Product detail (2x)
   - `/src/app/(main)/over-mose/page.tsx` - About page
   - `/src/app/(main)/verzending/page.tsx` - Shipping page (2x)
   - `/src/app/(main)/algemene-voorwaarden/page.tsx` - Terms page
   - `/src/components/CartDrawer.tsx` - Cart drawer tooltip
   - `/src/components/FAQAccordion.tsx` - FAQ answer

### 2. **HARDCODED RETURN DAYS**
   - **Moet zijn:** Dynamic vanuit admin (default: 14)
   - **Is nu:** "14 dagen" hardcoded overal
   
   **Locaties met "14 dagen" hardcoded:**
   - `/src/app/(main)/page.tsx` - Trust badge
   - `/src/app/(main)/product/[slug]/page.tsx` - Product info (2x)
   - `/src/app/(main)/cart/page.tsx` - Cart page (2x, desktop + mobile)
   - `/src/app/(main)/checkout/page.tsx` - Checkout trust badges
   - `/src/app/(main)/over-mose/page.tsx` - About page
   - `/src/app/(main)/verzending/page.tsx` - Shipping page (3x)
   - `/src/app/(main)/algemene-voorwaarden/page.tsx` - Terms page (2x)
   - `/src/components/CartDrawer.tsx` - Cart drawer tooltip
   - `/src/components/FAQAccordion.tsx` - FAQ answer
   - `/src/app/api/email-preview/route.tsx` - Email preview ✅ ALREADY FIXED

### 3. **HARDCODED CONTACT INFO**
   - **Email:** info@mosewear.nl (hardcoded in emails, footer, etc.)
   - **Phone:** +31 50 211 1931 (hardcoded in emails, footer, etc.)
   - **Address:** Helper Brink 27a, 9722 EG Groningen (hardcoded in emails, footer)

   **Moet dynamic worden vanuit admin settings!**

### 4. **MISSING SETTINGS IN ADMIN PANEL**
   - `contact_phone` - NOT in admin settings page
   - `contact_address` - NOT in admin settings page
   - `return_days` - NOT in admin settings page

---

## ✅ OPLOSSINGSPLAN:

### **FASE 1: DATABASE** ✅ DONE
- [x] Migratie `20260103200000_add_missing_site_settings.sql`
- [x] Adds: `contact_phone`, `contact_address`, `return_days`
- [x] Updates: `free_shipping_threshold` default to 100

### **FASE 2: SETTINGS LIBRARY** ✅ DONE
- [x] Updated `src/lib/settings.ts`
- [x] Added new fields to `SiteSettings` interface
- [x] Updated defaults

### **FASE 3: ADMIN SETTINGS PAGE** ⏳ TODO
- [ ] Add form fields for:
  - `contact_phone`
  - `contact_address`
  - `return_days`
- [ ] Add to fetchSettings switch statement
- [ ] Add to handleSaveSettings array

### **FASE 4: REPLACE HARDCODED VALUES** ⏳ TODO (MANY FILES)

**A. Homepage (`/src/app/(main)/page.tsx`):**
- [ ] "Gratis verzending vanaf €50" → use `settings.free_shipping_threshold`
- [ ] "14 dagen retour" → use `settings.return_days`

**B. Product Page (`/src/app/(main)/product/[slug]/page.tsx`):**
- [ ] "Gratis verzending vanaf €50" → dynamic
- [ ] "14 dagen bedenktijd" → dynamic
- [ ] Product tabs shipping info → dynamic

**C. Cart Page (`/src/app/(main)/cart/page.tsx`):**
- [ ] "14 dagen bedenktijd" (desktop) → dynamic
- [ ] "14 dagen bedenktijd" (mobile) → dynamic
- [ ] Free shipping progress bar logic already uses `settings.free_shipping_threshold` ✅

**D. Checkout Page (`/src/app/(main)/checkout/page.tsx`):**
- [ ] "14 dagen bedenktijd" trust badge → dynamic
- [ ] Free shipping logic already uses `settings.free_shipping_threshold` ✅

**E. Cart Drawer (`/src/components/CartDrawer.tsx`):**
- [ ] "Gratis verzending vanaf €50" tooltip → dynamic
- [ ] "14 dagen bedenktijd" tooltip → dynamic
- [ ] Free shipping progress already uses `settings.free_shipping_threshold` ✅

**F. About Page (`/src/app/(main)/over-mose/page.tsx`):**
- [ ] "14 dagen retour, gratis verzending vanaf €50" → both dynamic

**G. Shipping Page (`/src/app/(main)/verzending/page.tsx`):**
- [ ] Page metadata description → dynamic
- [ ] "Gratis verzending vanaf €50" → dynamic
- [ ] "Bij bestellingen onder €50 betaal je €5,95" → dynamic
- [ ] "14 dagen bedenktijd" (2x) → dynamic
- [ ] "Maximaal 14 dagen na ontvangst" → dynamic

**H. Terms Page (`/src/app/(main)/algemene-voorwaarden/page.tsx`):**
- [ ] "Gratis verzending vanaf €50" → dynamic
- [ ] "14 dagen na ontvangst" → dynamic
- [ ] "binnen 14 dagen na goedkeuring" → dynamic

**I. FAQ Component (`/src/components/FAQAccordion.tsx`):**
- [ ] "gratis vanaf €50" → dynamic
- [ ] "14 dagen bedenktijd" → dynamic

**J. Footer Component (`/src/components/layout/Footer.tsx`):**
- [ ] Contact email → dynamic
- [ ] Contact phone → dynamic
- [ ] Contact address → dynamic

**K. Contact Page (`/src/app/(main)/contact/page.tsx`):**
- [ ] Contact email → dynamic
- [ ] Contact phone → dynamic
- [ ] Contact address → dynamic

**L. Privacy Page (`/src/app/(main)/privacy/page.tsx`):**
- [ ] Contact email → dynamic (if present)

**M. All Email Templates (`/src/lib/email.ts`):**
- [ ] Contact info in footers → dynamic
- [x] Free shipping threshold in abandoned cart → already dynamic ✅
- [x] Return days in abandoned cart → already dynamic ✅

---

## 🎯 PRIORITEIT:

### **HIGH PRIORITY (klant-zichtbaar):**
1. Homepage trust badges
2. Product pages
3. Cart & Checkout
4. Shipping page
5. FAQ

### **MEDIUM PRIORITY:**
6. About page
7. Terms page
8. Footer
9. Contact page

### **LOW PRIORITY:**
10. Admin settings UI (functionaliteit werkt al via database)

---

## 📊 STATISTICS:

- **Total files to update:** ~13 files
- **Total hardcoded "€50" references:** ~9 locations
- **Total hardcoded "14 dagen" references:** ~16 locations
- **Contact info to dynamize:** Footer, Contact page, All emails

---

## ⚠️ BELANGRIJK:

Na deze updates moet **ALTIJD** de admin settings page gebruikt worden om:
- Free shipping threshold aan te passen (nu €100)
- Return days aan te passen (nu 14)
- Contact info aan te passen
- Dit wordt dan OVERAL op de site toegepast!

**Geen hardcoded waardes meer!** 🚀

