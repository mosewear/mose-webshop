# 🎟️ Promo Code Management System

## Overzicht

Complete discount code / promo code management voor MOSE webshop met database tracking, admin interface en automatische validatie.

---

## 📊 Features

### ✅ Database Management
- Promo codes opgeslagen in Supabase
- Automatische expiry tracking
- Usage limit enforcement
- Detailed usage statistics
- Complete audit trail

### ✅ Admin Interface
- `/admin/promo-codes` - Complete CRUD interface
- Create/Edit/Delete promo codes
- Toggle active/inactive status
- Real-time statistics
- Visual status indicators

### ✅ Validatie & Security
- API-based validation (`/api/validate-promo-code`)
- Checks:
  - Code exists & is active
  - Not expired
  - Usage limit not reached
  - Minimum order value met
- Row Level Security (RLS) policies

### ✅ Discount Types
1. **Percentage** - `10%`, `15%`, etc.
2. **Fixed Amount** - `€5.00`, `€10.00`, etc.

---

## 🗄️ Database Schema

### `promo_codes` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `code` | VARCHAR(50) | Unique promo code (e.g., "ZOMER2024") |
| `description` | TEXT | Beschrijving voor admin |
| `discount_type` | ENUM | "percentage" of "fixed" |
| `discount_value` | DECIMAL | Waarde (10 = 10% of €10) |
| `min_order_value` | DECIMAL | Minimale bestelwaarde (€) |
| `usage_limit` | INTEGER | Max gebruik (NULL = unlimited) |
| `usage_count` | INTEGER | Huidige gebruik counter |
| `expires_at` | TIMESTAMP | Expiry datum (NULL = no expiry) |
| `is_active` | BOOLEAN | Active status toggle |
| `created_at` | TIMESTAMP | Aanmaak datum |
| `updated_at` | TIMESTAMP | Laatste update |
| `created_by` | UUID | Admin die code maakte |

### `promo_code_usage` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `promo_code_id` | UUID | FK naar promo_codes |
| `order_id` | UUID | FK naar orders |
| `discount_amount` | DECIMAL | Toegepaste korting (€) |
| `order_total` | DECIMAL | Totaal orderbedrag (€) |
| `used_at` | TIMESTAMP | Wanneer gebruikt |
| `user_id` | UUID | Klant (optional) |

---

## 🔌 API Endpoints

### POST `/api/validate-promo-code`

**Request:**
```json
{
  "code": "ZOMER2024",
  "orderTotal": 49.99
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "code": "ZOMER2024",
  "discountAmount": 7.50,
  "discountType": "percentage",
  "discountValue": 15,
  "description": "15% zomerkorting"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Code is verlopen"
}
```

**Validatie Checks:**
1. ✅ Code bestaat
2. ✅ Is actief (`is_active = true`)
3. ✅ Niet verlopen (`expires_at > now()`)
4. ✅ Limiet niet bereikt (`usage_count < usage_limit`)
5. ✅ Min order value (`orderTotal >= min_order_value`)

---

## 💻 Admin Interface

### Navigatie
`Admin Dashboard` → `Kortingscodes`

### Features
1. **Create New Code**
   - Code (e.g., "ZOMER2024")
   - Type (Percentage / Fixed)
   - Discount value
   - Min order value
   - Usage limit (optional)
   - Expiry date (optional)
   - Description
   - Active toggle

2. **Edit Existing Code**
   - Click edit icon
   - Update any field
   - Save changes

3. **Delete Code**
   - Click trash icon
   - Confirm deletion

4. **Toggle Active Status**
   - Click status badge
   - Instantly activate/deactivate

5. **Statistics Dashboard**
   - Total codes
   - Active codes
   - Total usage count

6. **Visual Indicators**
   - 🟢 Active & valid
   - 🔴 Expired
   - ⚠️ Usage limit reached
   - ⚫ Inactive

---

## 🛒 Frontend Integration

### CartDrawer Component

De cart drawer gebruikt nu de API voor validatie:

```typescript
const handleApplyPromo = async () => {
  const response = await fetch('/api/validate-promo-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: promoCode.toUpperCase(),
      orderTotal: subtotal,
    }),
  })

  const data = await response.json()

  if (data.valid) {
    setPromoDiscount(data.discountAmount)
  } else {
    setPromoError(data.error)
  }
}
```

---

## 📈 Usage Tracking

### Automatisch Tracken (TODO - nog implementeren in stripe webhook)

Wanneer een order wordt geplaatst met promo code:

```typescript
import { trackPromoCodeUsage } from '@/lib/promo-code-utils'

// In stripe webhook na successful payment
await trackPromoCodeUsage(
  promoCode,     // "ZOMER2024"
  orderId,       // UUID
  discountAmount, // 7.50
  orderTotal,    // 49.99
  userId         // UUID (optional)
)
```

Dit:
1. ✅ Increments `usage_count` in `promo_codes`
2. ✅ Creates record in `promo_code_usage`
3. ✅ Tracks full analytics

---

## 🔒 Security (RLS Policies)

### `promo_codes`
- ✅ **Public SELECT** - Alleen actieve codes (voor validatie)
- ✅ **Admin SELECT** - Alle codes
- ✅ **Admin INSERT/UPDATE/DELETE** - Full control

### `promo_code_usage`
- ✅ **Admin SELECT** - View all usage
- ✅ **System INSERT** - Track usage

---

## 📦 Migratie

### Default Codes Aangemaakt

Bij migratie worden automatisch aangemaakt:
- `MOSE10` - 10% korting
- `WELCOME15` - 15% welkomstkorting
- `SORRY10` - 10% excuses korting (na annulering)

### Run Migratie

```bash
# In Supabase SQL Editor
-- Plak inhoud van:
supabase/migrations/20260103140000_create_promo_codes.sql
```

---

## 🎯 Voorbeelden

### Voorbeeld 1: Percentage Discount
```
Code: ZOMER2024
Type: Percentage
Value: 15%
Min Order: €30
Usage Limit: 100
Expires: 31-08-2024
```

### Voorbeeld 2: Fixed Amount
```
Code: EURO5
Type: Fixed
Value: €5.00
Min Order: €25
Usage Limit: Unlimited
Expires: Never
```

### Voorbeeld 3: VIP Code
```
Code: VIP20
Type: Percentage
Value: 20%
Min Order: €0
Usage Limit: 10
Expires: Never
```

---

## 🔄 Workflow

### 1. Admin maakt code aan
Admin → Kortingscodes → Nieuwe Code → Vul formulier → Aanmaken

### 2. Klant gebruikt code
Cart → Kortingscode invoeren → "ZOMER2024" → OK

### 3. API valideert
- Check database
- Verify constraints
- Calculate discount
- Return result

### 4. Order geplaatst
- Stripe webhook
- Track usage (TODO)
- Increment counter
- Log analytics

---

## 📊 Analytics & Reporting

### Beschikbare Data
- Usage per code
- Discount amount per order
- Timeline van gebruik
- User attribution (optional)
- Total savings per code

### Future Features (TODO)
- Revenue impact analysis
- Conversion rate per code
- A/B testing support
- Automatic expiry notifications
- Bulk code generation

---

## ✅ Checklist

- [x] Database schema
- [x] RLS policies
- [x] API validation endpoint
- [x] Admin CRUD interface
- [x] Frontend integration (CartDrawer)
- [x] Visual status indicators
- [x] Usage statistics dashboard
- [x] Default codes migration
- [ ] Usage tracking in checkout flow
- [ ] Email notifications (code expiring)
- [ ] Bulk operations
- [ ] Export/import codes
- [ ] Advanced analytics

---

## 🚀 Volgende Stappen

1. **Run database migratie** in Supabase
2. **Test admin interface** op `/admin/promo-codes`
3. **Maak test codes** aan
4. **Test validatie** in cart
5. **Implement usage tracking** in stripe webhook (zie TODO hierboven)

---

**Status:** ✅ Production Ready (minus usage tracking in webhook)

