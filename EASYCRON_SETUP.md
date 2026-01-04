# EasyCron.com Setup Instructies

## 📋 Stap 1: Environment Variable Toevoegen

Voeg toe aan je `.env.local` en Vercel environment variables:
```
CRON_SECRET=jouw-willekeurige-secret-key-hier
```

**Tip:** Gebruik een lange, willekeurige string. Bijvoorbeeld:
```bash
openssl rand -hex 32
```

## 🔧 Stap 2: EasyCron.com Account Aanmaken

1. Ga naar https://www.easycron.com/
2. Maak een gratis account aan (of log in)
3. Klik op "Add New Cron Job"

## ⚙️ Stap 3: Cron Job Configureren

### Basis Instellingen:
- **Cron Job Name:** `MOSE Back-in-Stock Check`
- **Cron Schedule:** `0 * * * *` (elk uur) of `*/30 * * * *` (elke 30 minuten)
- **URL:** `https://jouw-domain.com/api/back-in-stock/check?secret=JOUW_CRON_SECRET`
- **HTTP Method:** `GET` (of `POST` - beide werken)

### Geavanceerde Instellingen:
- **Timeout:** 60 seconden
- **Status:** Active
- **Notification Email:** (optioneel) jouw email voor notificaties

## 🔒 Stap 4: Secret Key in URL

**BELANGRIJK:** Vervang `JOUW_CRON_SECRET` in de URL met de waarde uit je `.env.local`:

```
https://mosewear.com/api/back-in-stock/check?secret=jouw-actuele-secret-key-hier
```

**Security Tip:** 
- Gebruik een lange, willekeurige string
- Deel deze URL/secret NOOIT publiekelijk
- Als de secret gelekt is, genereer een nieuwe

## 📊 Stap 5: Testen

1. Klik op "Save" in EasyCron.com
2. Klik op "Run Now" om direct te testen
3. Check de logs in EasyCron.com om te zien of het werkt
4. Check je Vercel logs om te zien of emails zijn verstuurd

## ✅ Verwachte Response

Bij succes:
```json
{
  "message": "Processed X notifications",
  "processed": 5
}
```

Bij geen notificaties:
```json
{
  "message": "No pending notifications",
  "processed": 0
}
```

## 🔍 Monitoring

- **EasyCron Dashboard:** Zie wanneer cron jobs zijn uitgevoerd
- **Vercel Logs:** Check of de endpoint correct wordt aangeroepen
- **Database:** Check de `back_in_stock_notifications` tabel voor `notified_at` timestamps

## 🚨 Troubleshooting

**401 Unauthorized:**
- Check of de `CRON_SECRET` in de URL overeenkomt met je environment variable
- Check of de environment variable is ingesteld in Vercel

**500 Error:**
- Check Vercel logs voor details
- Check of alle environment variables zijn ingesteld (SUPABASE_URL, SERVICE_ROLE_KEY, RESEND_API_KEY)

**Geen emails verstuurd:**
- Check of er producten daadwerkelijk op voorraad zijn gekomen
- Check of notificaties in de database staan (`is_notified = false`)
- Check Resend logs voor email fouten

## 📝 Alternatieve Schedule Opties

- `0 * * * *` - Elk uur op het hele uur
- `*/30 * * * *` - Elke 30 minuten
- `0 */2 * * *` - Elke 2 uur
- `0 9,12,15,18 * * *` - 4x per dag (9:00, 12:00, 15:00, 18:00)

Voor producten is 1x per uur of elke 30 minuten meestal voldoende.

