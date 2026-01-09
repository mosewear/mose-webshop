# SUPABASE DATABASE AUDIT REPORT

## 🔴 PROBLEMEN GEVONDEN:

### 1. DUPLICATE TABELLEN (KRITIEK!)
Er zijn tabellen die DUBBEL worden aangemaakt in verschillende migraties:

- **wishlists**: Aangemaakt in BEIDE:
  - `20250101000000_initial_schema.sql` (regel 115)
  - `20250101000010_create_wishlist.sql` (regel 2)

- **reviews**: Aangemaakt als "reviews" in initial_schema, maar als "product_reviews" in latere migratie:
  - `20250101000000_initial_schema.sql` (regel 125) → `reviews`
  - `20250101000011_create_reviews.sql` (regel 2) → `product_reviews`

### 2. ONNODIGE TABELLEN
Deze tabellen zijn aangemaakt maar worden NIET gebruikt in de code:

- **admin_users** (vervangen door profiles.is_admin)
- **inventory_logs** (niet geïmplementeerd)
- **order_status_history** (niet geïmplementeerd)
- **product_category_relations** (products.category_id is voldoende)

### 3. ONTBREKENDE KOLOMMEN
- **profiles.is_admin**: Wordt toegevoegd in migratie 20250101000012, maar NIET in 20250101000006
- **orders.admin_notes**: Schema heeft `admin_note` (singular) maar code verwacht mogelijk `admin_notes` (plural)

### 4. INCONSISTENTIES
- **products**: Gebruikt `uuid_generate_v4()` terwijl andere tabellen `gen_random_uuid()` gebruiken
- **orders.stripe_payment_intent_id**: Toegevoegd in latere migratie, niet in initial schema

## ✅ CORRECTE TABELLEN DIE MOETEN BLIJVEN:

1. **categories** - Voor product categorieën
2. **products** - Hoofdproduct info
3. **product_variants** - Size/color combinaties
4. **product_images** - Product afbeeldingen
5. **orders** - Bestellingen
6. **order_items** - Items per bestelling
7. **profiles** - User profielen (met is_admin)
8. **product_reviews** - Product reviews (NIET "reviews")
9. **review_votes** - Votes op reviews
10. **wishlists** - Wishlist items
11. **site_settings** - Site configuratie

## 🔧 AANBEVOLEN ACTIES:

1. **Verwijder duplicate tabellen uit initial_schema.sql**
   - Verwijder "wishlists" (regel 115-123)
   - Verwijder "reviews" (regel 125-139)

2. **Voer cleanup migratie uit** (20250101000013_cleanup_unused_tables.sql)
   - Verwijdert: admin_users, inventory_logs, order_status_history, product_category_relations

3. **Fix profiles tabel**
   - Voeg is_admin kolom toe (migratie 20250101000012)
   - Update admin user: `UPDATE profiles SET is_admin = true WHERE id IN (SELECT id FROM auth.users WHERE email = 'h.schlimback@gmail.com')`

4. **Verifieer RLS policies** op alle tabellen

5. **Check foreign keys** en cascading deletes

## 📊 DATABASE STRUCTUUR OVERZICHT:

```
auth.users (Supabase managed)
  └── profiles (1:1, is_admin flag)

categories
  └── products (many:1)
      ├── product_variants (1:many)
      │   └── product_images (1:many, optional variant link)
      ├── product_images (1:many, general)
      └── product_reviews (1:many)
          └── review_votes (1:many)

orders (user_id can be NULL for guest checkout)
  └── order_items (1:many)
      ├── product_id (reference)
      └── variant_id (reference)

wishlists (user-specific)
  ├── product_id (reference)
  └── variant_id (reference, optional)

site_settings (key-value pairs)
```

## 🎯 PRIORITEIT FIXES:

1. **HOOG**: Fix admin toegang (profiles.is_admin)
2. **HOOG**: Verwijder duplicate wishlists en reviews uit initial_schema
3. **MEDIUM**: Voer cleanup migratie uit voor onnodige tabellen
4. **LAAG**: Standaardiseer UUID functie naar gen_random_uuid()



