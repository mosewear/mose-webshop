# Webhook Issue Debug Guide

## Probleem
- Webhook geeft success: `{"received": true, "type": "return_label_payment"}`
- Maar status wordt niet geüpdatet in admin
- Label wordt niet gegenereerd
- Polling blijft oneindig draaien

## Wat ik heb gefixt

### 1. Error Handling
- Webhook geeft nu error terug als status update faalt (was voorheen stil)
- Uitgebreide logging toegevoegd voor debugging

### 2. Admin Auto-Refresh
- Admin pagina refresh nu automatisch elke 5 seconden als label wordt gegenereerd
- Status zou nu automatisch zichtbaar moeten worden

### 3. Polling Improvements
- Betere timeout handling
- Duidelijkere error messages

## Debug Stappen

### 1. Check Vercel Logs
Na een nieuwe betaling, check Vercel Dashboard → Logs voor:
- `🔄 Webhook: Return label payment detected`
- `✅ Return payment status updated`
- `❌ Error updating return payment status` (als dit er is)
- `🔄 Attempting to generate label`
- `✅ Return label generated automatically` OF `❌ Failed to generate return label`

### 2. Check Return Status Direct in Database
Run dit script om te checken of de status wel is geüpdatet:
```bash
node debug-webhook-issue.js
```

Dit checkt:
- Of return bestaat
- Wat de huidige status is
- Of status update werkt
- Of label generation endpoint bereikbaar is

### 3. Check Environment Variables in Vercel
Zorg dat deze zijn ingesteld:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - voor database access
- ✅ `INTERNAL_API_SECRET` - voor label generation
- ✅ `STRIPE_WEBHOOK_SECRET` - voor webhook verificatie

### 4. Test Label Generation Handmatig
Test of label generation werkt:
```bash
curl -X POST https://mose-webshop.vercel.app/api/returns/RETURN_ID/generate-label \
  -H "Authorization: Bearer YOUR_INTERNAL_API_SECRET" \
  -H "Content-Type: application/json"
```

## Meest Waarschijnlijke Oorzaken

### 1. Label Generatie Faalt
Als `INTERNAL_API_SECRET` niet correct is of SendCloud niet geconfigureerd:
- Status wordt wel geüpdatet naar `return_label_payment_completed`
- Maar label wordt niet gegenereerd
- Polling blijft draaien

**Oplossing:** Check Vercel logs voor label generation errors

### 2. Status Update Faalt Stil
Als database update faalt maar geen error wordt teruggegeven:
- Webhook geeft success
- Maar status wordt niet geüpdatet

**Oplossing:** Check Vercel logs - met nieuwe logging zou je dit moeten zien

### 3. Admin Page Refresh Issue
Als status wel is geüpdatet maar admin niet refresh:
- Status staat correct in database
- Admin pagina toont oude status

**Oplossing:** Auto-refresh is toegevoegd - zou nu moeten werken

## Volgende Stap

1. **Redeploy de app** (code is gepusht)
2. **Test met een nieuwe return betaling**
3. **Check Vercel logs** direct na betaling
4. **Check admin pagina** - zou nu moeten auto-refreshen

Als het nog steeds niet werkt, check de Vercel logs en deel de errors die je ziet.

