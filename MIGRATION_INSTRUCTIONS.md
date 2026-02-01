# 🚀 MIGRATIE UITVOEREN - Guest-Friendly Profiles

## Instructies:

1. **Open Supabase SQL Editor:**
   👉 https://supabase.com/dashboard/project/bsklcgeyvdsxjxvmghbp/sql/new

2. **Kopieer de volledige inhoud van:**
   📁 `supabase/migrations/20260201200000_guest_friendly_profiles.sql`

3. **Plak in SQL Editor**

4. **Klik op "Run" (of druk Cmd/Ctrl + Enter)**

5. **Wacht tot het klaar is** (duurt ~5-10 seconden)

6. **Refresh de klantenpagina in je admin:**
   👉 https://www.mosewear.com/admin/customers

---

## ✅ Verwachte Resultaten:

Na de migratie zou je moeten zien:

- **5 klanten** in totaal (in plaats van 3)
- **Nieuwe klanten:**
  - a.stol18767@gmail.com
  - maurice_moes_18@hotmail.com
  - mjgtrip@hotmail.com
  - ronniehouwen83@hotmail.com

- **Nieuwe kolommen:**
  - Telefoon
  - Orders (aantal)
  - Uitgegeven (totaal bedrag)

---

## 🔍 Verificatie:

Als de migratie succesvol is, zie je geen errors in de SQL Editor en krijg je output zoals:

```
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE POLICY
CREATE POLICY  
CREATE POLICY
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
CREATE FUNCTION
INSERT 0 4
UPDATE 5
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

---

## ⚠️ Bij Problemen:

Als je errors ziet, laat het me weten en stuur de error message. Dan fix ik het!

---

**Klaar om te runnen? Ga naar de SQL Editor en voer het uit! 🎯**

