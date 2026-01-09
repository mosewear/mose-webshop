# Lokaal Webhook Testen

Dit script test de webhook logica lokaal voordat je het live zet.

## Vereisten

1. **Vercel CLI geïnstalleerd:**
   ```bash
   npm i -g vercel
   ```

2. **Ingelogd in Vercel:**
   ```bash
   vercel login
   ```

3. **Een test return in de database:**
   - Status: `return_label_payment_pending`
   - Heeft een `return_label_payment_intent_id`

## Hoe te gebruiken

### Optie 1: Met helper script (aanbevolen)

```bash
./test-webhook.sh
```

Dit script:
1. Haalt environment variables op via Vercel CLI
2. Voert de test uit
3. Vraagt of je `.env.local` wilt verwijderen

### Optie 2: Handmatig

1. **Haal environment variables op:**
   ```bash
   vercel env pull .env.local --yes
   ```

2. **Run de test:**
   ```bash
   node test-webhook-simple.js
   ```

3. **Cleanup (optioneel):**
   ```bash
   rm .env.local
   ```

## Wat wordt getest?

1. ✅ Environment variables aanwezig
2. ✅ Supabase service role client werkt
3. ✅ Return kan worden gevonden
4. ✅ Payment intent kan worden opgehaald van Stripe
5. ✅ Return detection werkt (metadata of database lookup)
6. ✅ Database read access werkt
7. ✅ Service role heeft update permissions
8. ✅ Label generation secret is geconfigureerd

## Resultaat

Als alle checks slagen:
- ✅ Webhook logica is correct
- ✅ Service role key werkt
- ✅ Database access is OK
- ✅ Ready voor deployment

Als checks falen:
- ❌ Check de error messages
- ❌ Fix de issues
- ❌ Run test opnieuw

## Troubleshooting

### "Missing required environment variables"
- Run: `vercel env pull .env.local --yes`
- Check of je ingelogd bent: `vercel whoami`

### "No test return found"
- Maak eerst een return aan via `/returns/new`
- Zorg dat status = `return_label_payment_pending`
- Zorg dat er een `return_label_payment_intent_id` is

### "Error fetching payment intent"
- Check of de payment intent ID correct is
- Check of STRIPE_SECRET_KEY correct is

### "Database lookup failed"
- Check of SUPABASE_SERVICE_ROLE_KEY correct is
- Check of de return bestaat in de database

## Na de test

Als alle tests slagen:
1. ✅ Deploy naar Vercel
2. ✅ Test met een echte betaling
3. ✅ Check Stripe Dashboard → Webhooks → Event Deliveries


