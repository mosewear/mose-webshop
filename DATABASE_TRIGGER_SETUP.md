# Database Trigger Setup - Back-in-Stock Notifications

## ✅ Implementatie Voltooid

Optie 1 (Database Triggers) is geïmplementeerd. Dit betekent:
- ✅ Real-time notificaties (geen cron job nodig!)
- ✅ Werkt bij elke stock update (ook handmatig)
- ✅ Automatisch en betrouwbaar

## 📋 Stappen om te Activeren

### Stap 1: Migratie Uitvoeren

De migratie staat op je klembord. Voer deze uit in Supabase:

**Optie A: Via Supabase Dashboard**
1. Ga naar je Supabase project
2. Database > SQL Editor
3. Plak de migratie SQL
4. Klik "Run"

**Optie B: Via Supabase CLI**
```bash
supabase migration up
```

### Stap 2: Environment Variable (Optioneel)

Voor de trigger om de juiste site URL te gebruiken, kun je een database setting toevoegen:

```sql
ALTER DATABASE postgres SET app.site_url = 'https://jouw-domain.com';
```

Of laat het zoals het is - het gebruikt de default URL uit de code.

### Stap 3: Testen

1. **Test scenario:**
   - Maak een product/variant met stock = 0
   - Laat een gebruiker zich aanmelden voor back-in-stock notificatie
   - Update stock naar > 0 in admin panel
   - Email zou direct moeten worden verstuurd!

2. **Check logs:**
   - Supabase Logs: Database > Logs (voor trigger execution)
   - Vercel Logs: Voor API endpoint calls
   - Check `back_in_stock_notifications` tabel: `is_notified` en `notified_at` zouden moeten worden geüpdatet

## 🔧 Hoe Het Werkt

1. **Trigger Fires:** Wanneer `stock_quantity` of `is_available` wordt geüpdatet op `product_variants`
2. **Check:** Trigger checkt of stock > 0 en is_available = true (en dat het VOOR was 0 of unavailable)
3. **Queue:** Trigger roept HTTP endpoint aan via `pg_net` extension
4. **Process:** API endpoint verwerkt de notificatie en verstuurt email
5. **Mark:** Notificatie wordt gemarkeerd als `is_notified = true`

## ⚠️ Belangrijke Notities

### pg_net Extension
- De migratie gebruikt `pg_net` extension voor HTTP requests vanuit PostgreSQL
- Deze extension is standaard beschikbaar in Supabase
- Als je een error krijgt, check of `pg_net` enabled is:
  ```sql
  SELECT * FROM pg_available_extensions WHERE name = 'pg_net';
  ```

### Performance
- Triggers worden uitgevoerd binnen de database transactie
- HTTP calls via pg_net zijn asynchroon (fire-and-forget)
- Als de API endpoint down is, worden notificaties NIET automatisch opnieuw geprobeerd
- Voor production: overweeg een retry mechanisme of queue systeem

### Security
- Het endpoint `/api/back-in-stock/process-trigger` heeft geen authentication
- Het is bedoeld om alleen vanuit de database trigger te worden aangeroepen
- Overweeg IP whitelisting of secret key check voor extra security

## 🚨 Troubleshooting

**Trigger werkt niet:**
- Check of migratie is uitgevoerd: `\df check_back_in_stock_notifications`
- Check trigger: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_check_back_in_stock';`
- Check logs in Supabase Dashboard

**Emails worden niet verstuurd:**
- Check of API endpoint werkt: Test handmatig met curl
- Check Vercel logs voor errors
- Check of RESEND_API_KEY is ingesteld
- Check `back_in_stock_notifications` tabel: is `is_notified` geüpdatet?

**pg_net error:**
- Check of extension enabled is: `CREATE EXTENSION IF NOT EXISTS pg_net;`
- Check Supabase logs voor pg_net errors

## ✅ Voordelen van Deze Aanpak

1. **Real-time:** Notificaties worden direct verstuurd bij stock updates
2. **Betrouwbaar:** Werkt bij alle stock updates (admin panel, SQL scripts, etc.)
3. **Geen externe services:** Geen cron jobs nodig
4. **Automatisch:** Set-and-forget, werkt altijd

## 🔄 Verwijder Oude Cron Job

Als je de oude cron job hebt ingesteld (EasyCron.com), kun je die nu verwijderen:
- De `/api/back-in-stock/check` endpoint is niet meer nodig
- Database triggers vervangen de cron job volledig

## 📝 Migratie Bestand

De migratie SQL staat op je klembord en is ook te vinden in:
`supabase/migrations/20260106000000_back_in_stock_trigger.sql`

