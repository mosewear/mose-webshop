# Fix Webhook Secret Whitespace Issue

## Probleem
De webhook secret bevat waarschijnlijk extra whitespace (newline of spatie), wat de signature verification laat falen.

## Oplossing

### Stap 1: Update de Code (AL GEDAAN)
De code is al aangepast om automatisch whitespace te trimmen.

### Stap 2: Update Vercel Environment Variable

**Optie A: Via Vercel Dashboard**
1. Ga naar Vercel Dashboard → Project → Settings → Environment Variables
2. Vind `STRIPE_WEBHOOK_SECRET`
3. Klik op "Edit"
4. **VERWIJDER alle extra newlines/spaties** - alleen de secret zelf (begint met `whsec_`)
5. Klik "Save"
6. **Redeploy je app** (Settings → Deployments → ... → Redeploy)

**Optie B: Via Vercel CLI**
```bash
# Verwijder oude secret
vercel env rm STRIPE_WEBHOOK_SECRET production

# Voeg nieuwe secret toe (ZONDER extra newlines)
# Kopieer het secret uit Stripe Dashboard en plak het direct (zonder Enter drukken)
vercel env add STRIPE_WEBHOOK_SECRET production
# Plak het secret hier direct zonder Enter
```

### Stap 3: Get Secret uit Stripe Dashboard
1. Ga naar: https://dashboard.stripe.com/webhooks
2. Klik op "MOSE Webshop" webhook
3. Klik op "Geheime sleutel voor ondertekening" → "Bekijken"
4. Kopieer het secret (begint met `whsec_...`)
5. **BELANGRIJK:** Plak het in een text editor en check of er geen extra newlines zijn
6. Kopieer het opnieuw (zonder newlines)
7. Update in Vercel

### Stap 4: Test
1. Maak een test retour aan en betaal
2. Check Stripe Dashboard → Webhooks → Event Deliveries
3. Check of de webhook nu succesvol is

## Verificatie

Na de fix zou je moeten zien:
- ✅ Webhook deliveries zijn succesvol (200 OK)
- ✅ Return label betalingen worden correct verwerkt
- ✅ Status updates naar `return_label_payment_completed`
- ✅ Automatische label generatie werkt

## Waarom Werken Normale Orders Wel?

Normale orders gebruiken een **fallback mechanisme**:
- Na betaling wordt gebruiker doorgestuurd naar order confirmation page
- Deze roept `/api/check-payment-status` aan
- Dit endpoint checkt direct bij Stripe of payment succeeded is
- Werkt als fallback als webhook is gemist

Return label betalingen hebben deze fallback **NIET** - die zijn 100% afhankelijk van de webhook. Daarom werken normale orders wel, maar return label betalingen niet.

