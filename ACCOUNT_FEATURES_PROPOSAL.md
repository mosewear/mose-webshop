# Account Pagina Functionaliteiten Voorstel

## Huidige Status
- ✅ **Bestellingen tab**: Volledig werkend met product thumbnails, status badges, details
- ⚠️ **Profiel tab**: Placeholder
- ⚠️ **Adressen tab**: Placeholder

## Beschikbare Database Tabellen
- `profiles`: first_name, last_name, email, avatar_url
- `wishlists`: product_id, user_id, variant_id, created_at
- `orders`: shipping_address, billing_address (JSON), email, user_id
- `reviews`: product_id, user_id, rating, comment, title, is_verified_purchase

---

## Voorgestelde Functionaliteiten

### 1. PROFIEL TAB ⭐ **AANBEVOLEN**

**Functionaliteit:**
- Bekijk en bewerk persoonlijke gegevens
- Voornaam, Achternaam, Email weergeven/aanpassen
- Wachtwoord wijzigen
- Avatar upload (optioneel, via profiles.avatar_url)

**Features:**
- Formulier met bestaande gegevens uit `profiles` table
- Email sync met Supabase Auth
- Wachtwoord wijzigen via Supabase Auth
- Validatie (email format, wachtwoord requirements)
- Success/error feedback (toast notifications)
- MOSE styling: border-2 borders, brand-primary buttons

**Complexiteit:** Medium (2-3 uur)
**Waarde:** Hoog - Basis functionaliteit voor account management

---

### 2. ADRESSEN TAB ⭐ **AANBEVOLEN**

**Functionaliteit:**
- Bekijk opgeslagen adressen uit vorige bestellingen
- Voeg nieuwe adressen toe (opslaan als default shipping/billing)
- Bewerk/bewaar favoriete adressen
- Selecteer default shipping/billing adres

**Features:**
- Lijst van adressen uit `orders` table (unique adressen)
- Formulier om nieuwe adres toe te voegen
- "Bewerk" en "Verwijder" acties
- Markeer als default shipping/billing
- Adres selectie bij checkout (toekomst)
- MOSE styling: clean cards, border-2 borders

**Complexiteit:** Medium-High (3-4 uur)
**Waarde:** Hoog - Veel gevraagd, verbetert checkout UX

**Opmerking:** Vereist mogelijk nieuwe `user_addresses` table of gebruik van orders table

---

### 3. WISHLIST TAB ⭐ **AANBEVOLEN**

**Functionaliteit:**
- Link naar wishlist pagina (of inline weergave)
- Snel overzicht van favoriete producten
- Quick actions: "Toevoegen aan winkelwagen", "Verwijderen"

**Features:**
- Gebruik bestaande `/wishlist` pagina of inline component
- Product thumbnails, namen, prijzen
- "Bekijk product" link
- "Verwijder uit wishlist" button
- "Toevoegen aan winkelwagen" button
- Empty state als wishlist leeg is

**Complexiteit:** Low-Medium (1-2 uur)
**Waarde:** Medium-High - Gebruikt bestaande functionaliteit, verbetert navigatie

---

### 4. RECENTE BEKIJKTE PRODUCTEN

**Functionaliteit:**
- Laatst bekeken producten (localStorage of database)
- Quick access naar producten die gebruiker interesseerde

**Features:**
- Opslaan van bekeken producten (localStorage of nieuwe `viewed_products` table)
- Grid/carousel weergave
- Product thumbnails, namen, prijzen
- "Bekijk product" link
- Max 10-15 recente items

**Complexiteit:** Medium (2-3 uur)
**Waarde:** Medium - Nice to have, verhoogt engagement

**Opmerking:** Vereist tracking systeem (localStorage of database table)

---

### 5. ACCOUNT OVERZICHT DASHBOARD

**Functionaliteit:**
- Quick stats bovenaan account pagina (boven tabs)
- Overzicht: Totaal besteed, Aantal bestellingen, Lid sinds, Wishlist items

**Features:**
- Stats cards met key metrics
- Gebruik data uit `orders` en `wishlists` tables
- Clean, minimalistisch design
- Mobile responsive grid

**Complexiteit:** Low (1 uur)
**Waarde:** Medium - Verbetert overview, maar niet essentieel

---

### 6. RECENTE REVIEWS

**Functionaliteit:**
- Overzicht van geschreven reviews
- Link naar product waar review staat
- Bewerk/verwijder eigen reviews

**Features:**
- Lijst van reviews uit `reviews` table
- Product naam, rating, comment preview
- "Bekijk product" link
- "Bewerk review" (toekomst)
- Empty state als geen reviews

**Complexiteit:** Medium (2-3 uur)
**Waarde:** Medium - Handig voor gebruikers die reviews schrijven

---

### 7. NOTIFICATIE PREFERENCES

**Functionaliteit:**
- Instellingen voor email notificaties
- Opt-in/out voor: Order updates, Nieuwe producten, Promoties, Back-in-stock

**Features:**
- Toggle switches voor verschillende notificatie types
- Opslaan in `profiles` table of nieuwe `user_preferences` table
- Success feedback
- MOSE styling: clean toggles

**Complexiteit:** Medium (2-3 uur)
**Waarde:** Low-Medium - Nice to have, niet essentieel

**Opmerking:** Vereist nieuwe database velden of table

---

## Aanbeveling Volgorde

### **FASE 1: Essentiële Functionaliteiten** ⭐⭐⭐
1. **Profiel Tab** - Basis account management
2. **Adressen Tab** - Veel gevraagd, verbetert UX
3. **Wishlist Tab** - Gebruikt bestaande functionaliteit

### **FASE 2: Nice-to-Have** ⭐⭐
4. **Account Overzicht Dashboard** - Quick stats
5. **Recente Reviews** - Als reviews veel gebruikt worden

### **FASE 3: Extra Features** ⭐
6. **Recente Bekeken Producten** - Engagement verhogen
7. **Notificatie Preferences** - Als email marketing belangrijk wordt

---

## Samenvatting

**Top 3 Aanbevelingen:**
1. ✅ **Profiel Tab** - Essentieel voor account management
2. ✅ **Adressen Tab** - Veel gevraagd, verbetert checkout
3. ✅ **Wishlist Tab** - Gebruikt bestaande functionaliteit, snel te implementeren

**Schatting Tijd:**
- Fase 1 (alle 3): 6-9 uur
- Fase 2: +3-4 uur
- Fase 3: +4-6 uur

---

## Vragen voor Jou

1. Wil je een nieuwe `user_addresses` table aanmaken of adressen uit `orders` gebruiken?
2. Moet wishlist inline zijn of link naar `/wishlist` pagina?
3. Wil je account overzicht dashboard bovenaan?
4. Zijn er andere functionaliteiten die je mist?

