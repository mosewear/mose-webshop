# Product & Category i18n Implementation Guide

## ✅ Wat is gedaan:

### 1. SQL Migratie Scripts

Twee SQL scripts zijn gemaakt in `migrations/`:

- **001_add_i18n_support.sql**: Voegt `_en` kolommen toe aan database tabellen
- **002_translate_content_to_english.sql**: Vertaalt alle bestaande content naar Engels

### 2. Helper Functions

Een nieuwe helper library `src/lib/i18n-db.ts` met functies voor:
- `mapLocalizedProduct()`: Map product met juiste taalvelden
- `mapLocalizedCategory()`: Map categorie met juiste taalvelden  
- Helper functies voor query building

### 3. Code Updates

De volgende files zijn geüpdatet om localized content te gebruiken:
- ✅ `/src/app/[locale]/product/[slug]/page.tsx` - Product detail metadata
- ⏳ `/src/app/[locale]/product/[slug]/ProductPageClient.tsx` - Product detail UI
- ⏳ `/src/app/[locale]/shop/ShopPageClient.tsx` - Shop page met filters
- ⏳ `/src/components/HomePageClient.tsx` - Homepage featured products
- ⏳ `/src/lib/homepage.ts` - Homepage data fetching

## 📝 Wat je moet doen:

### Stap 1: Database Migraties Uitvoeren

In Supabase SQL Editor:

```sql
-- Voer eerst 001_add_i18n_support.sql uit
-- Dan 002_translate_content_to_english.sql
```

### Stap 2: Verificatie Query

Na de migratie, run deze query om te checken:

```sql
SELECT 
  name as dutch_name,
  name_en as english_name,
  CASE 
    WHEN name_en IS NULL THEN '❌ Missing'
    ELSE '✅ Translated'
  END as status
FROM products
ORDER BY created_at DESC;
```

### Stap 3: Test de Website

1. Ga naar een product pagina in NL: `http://localhost:3000/nl/product/mose-automatisch-horloge`
2. Switch naar EN via de language selector
3. Controleer of productnaam en beschrijving in het Engels zijn

## 🔄 Hoe het werkt:

### Database Structuur

```
products table:
├── name (NL)
├── name_en (EN)
├── description (NL)
└── description_en (EN)
```

### Code Flow

```typescript
// 1. Fetch product met beide taalvelden
const product = await supabase
  .from('products')
  .select('name, name_en, description, description_en')
  .single()

// 2. Map naar juiste taal
const localized = mapLocalizedProduct(product, locale)

// 3. Gebruik localized.name (Engels of Nederlands, afhankelijk van locale)
```

## 🎯 Voordelen:

1. **Backwards Compatible**: Bestaande code blijft werken
2. **Fallback**: Als EN ontbreekt, gebruikt NL
3. **Type-Safe**: TypeScript types blijven hetzelfde
4. **Future-Proof**: Makkelijk uitbreidbaar naar meer talen

## ⚠️ Let op:

- Admin panel moet ook geüpdatet worden om `_en` velden te bewerken
- SEO metadata moet voor beide talen gegenereerd worden
- Sitemap moet beide taalversies bevatten
