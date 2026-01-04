# Back-in-Stock Functionaliteit Testen

## ✅ Vereisten

1. **Database migraties uitgevoerd:**
   - `20260105000000_create_back_in_stock_notifications.sql`
   - `20260106000000_back_in_stock_trigger.sql` (optioneel, voor real-time triggers)

2. **Environment variables ingesteld:**
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 🧪 Test Stappen

### Stap 1: Check Database Tabel

Controleer of de tabel bestaat:
```sql
SELECT * FROM back_in_stock_notifications LIMIT 5;
```

### Stap 2: Maak een Product Uitverkocht

1. Ga naar admin panel → Products
2. Kies een product (of maak een test product)
3. Ga naar Variants
4. Zet stock_quantity naar **0**
5. Zet is_available naar **false** (of laat true als je alleen stock wil testen)

### Stap 3: Aanmelden voor Back-in-Stock

**Optie A: Via Frontend (Product Pagina)**
1. Ga naar de product pagina (bijv. `/product/[slug]`)
2. Zorg dat je niet ingelogd bent (of gebruik een test account)
3. Voer een email adres in bij "Laat me weten wanneer dit product weer beschikbaar is"
4. Klik op "Notificeer mij"
5. Check in database of notificatie is opgeslagen:
   ```sql
   SELECT * FROM back_in_stock_notifications 
   WHERE email = 'jouw-test-email@example.com';
   ```

**Optie B: Direct in Database (Sneller voor Testing)**
```sql
INSERT INTO back_in_stock_notifications (product_id, variant_id, email)
VALUES (
  'PRODUCT_ID_HIER',
  'VARIANT_ID_HIER',  -- of NULL voor hele product
  'test@example.com'
);
```

### Stap 4: Test Notificatie Versturen

**Optie A: Via Stock Update (Real-time Trigger)**
1. Ga naar admin panel → Inventory (of Products → Variants)
2. Update stock_quantity naar **> 0** (bijv. 10)
3. Zet is_available naar **true** (als het false was)
4. Save
5. Check email inbox (en spam folder)
6. Check database:
   ```sql
   SELECT * FROM back_in_stock_notifications 
   WHERE email = 'test@example.com';
   -- is_notified zou true moeten zijn
   -- notified_at zou een timestamp moeten hebben
   ```

**Optie B: Via API Endpoint (Handmatig)**
```bash
curl -X POST http://localhost:3000/api/back-in-stock/check \
  -H "Content-Type: application/json" \
  -d '{"secret": "jouw-cron-secret"}'
```

**Optie C: Via Process Trigger Endpoint (Voor Database Trigger)**
```bash
curl -X POST http://localhost:3000/api/back-in-stock/process-trigger \
  -H "Content-Type: application/json" \
  -H "X-Trigger-Source: database" \
  -d '{
    "notification_id": "NOTIFICATION_ID_HIER",
    "product_id": "PRODUCT_ID_HIER",
    "variant_id": "VARIANT_ID_HIER",
    "email": "test@example.com"
  }'
```

### Stap 5: Check Resultaten

**Database Check:**
```sql
-- Check of notificatie is verwerkt
SELECT 
  id,
  email,
  product_id,
  variant_id,
  is_notified,
  notified_at,
  created_at
FROM back_in_stock_notifications
ORDER BY created_at DESC
LIMIT 10;
```

**Logs Check:**
- **Vercel/Next.js logs:** Check voor email sending errors
- **Supabase logs:** Check voor trigger execution errors (als trigger gebruikt)
- **Resend dashboard:** Check voor email delivery status

**Email Check:**
- Check inbox van het test email adres
- Check spam folder
- Check Resend dashboard voor email logs

## 🔍 Troubleshooting

### Email wordt niet verstuurd

1. **Check RESEND_API_KEY:**
   ```bash
   echo $RESEND_API_KEY  # moet ingevuld zijn
   ```

2. **Check Vercel logs:**
   ```bash
   vercel logs
   ```
   Of check Vercel dashboard → Project → Logs

3. **Check database:**
   ```sql
   -- Check of notificatie bestaat
   SELECT * FROM back_in_stock_notifications WHERE is_notified = false;
   
   -- Check product/variant stock
   SELECT id, stock_quantity, is_available 
   FROM product_variants 
   WHERE id = 'VARIANT_ID';
   ```

4. **Test email functie direct:**
   - Maak een test script of gebruik API endpoint handmatig

### Trigger werkt niet

1. **Check of trigger bestaat:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_check_back_in_stock';
   ```

2. **Check of functie bestaat:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'check_back_in_stock_notifications';
   ```

3. **Check Supabase logs:**
   - Database → Logs
   - Filter op "trigger" of "check_back_in_stock"

4. **Test trigger handmatig:**
   ```sql
   -- Update stock en check logs
   UPDATE product_variants 
   SET stock_quantity = 5, is_available = true 
   WHERE id = 'VARIANT_ID';
   ```

### API Endpoint geeft error

1. **Check environment variables in Vercel**
2. **Test endpoint direct:**
   ```bash
   curl -X POST http://localhost:3000/api/back-in-stock/notify \
     -H "Content-Type: application/json" \
     -d '{
       "productId": "PRODUCT_ID",
       "variantId": "VARIANT_ID",
       "email": "test@example.com"
     }'
   ```

3. **Check browser console voor errors**

## 📝 Quick Test Checklist

- [ ] Database tabel bestaat
- [ ] Product/variant heeft stock = 0
- [ ] Notificatie is aangemaakt (in database)
- [ ] Stock is geüpdatet naar > 0
- [ ] Email is verstuurd (check inbox)
- [ ] Database toont is_notified = true
- [ ] Database toont notified_at timestamp

## 🚀 Snelle Test (2 minuten)

1. Insert notificatie direct in database:
   ```sql
   INSERT INTO back_in_stock_notifications (product_id, email, is_notified)
   VALUES ('JE_PRODUCT_ID', 'test@example.com', false);
   ```

2. Update stock:
   ```sql
   UPDATE product_variants 
   SET stock_quantity = 10, is_available = true 
   WHERE product_id = 'JE_PRODUCT_ID' 
   LIMIT 1;
   ```

3. Check database:
   ```sql
   SELECT * FROM back_in_stock_notifications 
   WHERE email = 'test@example.com';
   ```

4. Check email inbox!

