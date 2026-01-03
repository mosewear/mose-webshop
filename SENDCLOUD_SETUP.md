# 📦 **Sendcloud + DHL Integratie Handleiding**

Complete setup guide voor automatische verzendlabels in MOSE webshop.

---

## 🎯 **Overzicht**

Deze integratie geeft je:
- ✅ Automatische verzendlabels via Sendcloud + DHL
- ✅ Tracking codes automatisch toegevoegd aan orders
- ✅ Klanten ontvangen automatisch verzend-emails
- ✅ Real-time status updates via webhooks
- ✅ €4,50 per pakket (40% goedkoper dan PostNL!)

---

## 📋 **Stap 1: Sendcloud Account Aanmaken**

### **1.1 Ga naar Sendcloud**
👉 [sendcloud.nl/signup](https://www.sendcloud.nl/signup)

### **1.2 Kies Plan**
- **Starter/Essential**: €0-25/maand
- **Best voor starters**: Essential (€25/maand, onbeperkte pakketten)
- **Tip**: Vraag trial aan om gratis te testen

### **1.3 Bedrijfsgegevens Invullen**
- Bedrijfsnaam: MOSE
- KvK nummer
- BTW nummer
- Contact gegevens

### **1.4 Activeer DHL Parcel**
1. Ga naar `Settings` → `Carriers`
2. Klik op `DHL Parcel`
3. Klik `Activate`
4. Vul eventuele extra gegevens in
5. Wacht op goedkeuring (meestal binnen 1 werkdag)

---

## 🔑 **Stap 2: API Keys Ophalen**

### **2.1 Ga naar API Settings**
1. Log in op Sendcloud panel
2. Ga naar `Settings` → `Integrations`
3. Klik op `API`

### **2.2 Genereer API Keys**
1. Klik op `+ Create new API key`
2. Geef een naam: `MOSE Webshop`
3. Kopieer de `Public Key`
4. Kopieer de `Secret Key`
5. **BELANGRIJK**: Bewaar deze keys veilig!

### **2.3 Webhook Secret (optioneel)**
1. Ga naar `Settings` → `Webhooks`
2. Kopieer de `Webhook Secret`
3. Dit is voor extra security

---

## ⚙️ **Stap 3: Environment Variables Toevoegen**

### **3.1 Open `.env.local`**
In je project root:

```bash
cd /Users/rickschlimback/Desktop/mose-webshop
nano .env.local
```

### **3.2 Voeg Sendcloud Keys Toe**
```bash
# Sendcloud Shipping
SENDCLOUD_PUBLIC_KEY=your_public_key_here
SENDCLOUD_SECRET_KEY=your_secret_key_here
SENDCLOUD_WEBHOOK_SECRET=your_webhook_secret_here
```

**Vervang de placeholders met je echte keys!**

### **3.3 Opslaan en Herstarten**
```bash
# Save (Ctrl+O, Enter, Ctrl+X)
# Restart dev server
npm run dev
```

---

## 🌐 **Stap 4: Webhook Configureren**

### **4.1 Vercel Deploy URL Ophalen**
Zorg dat je app live is op Vercel:
- URL bijvoorbeeld: `https://mose-webshop.vercel.app`

### **4.2 Webhook Toevoegen in Sendcloud**
1. Ga naar Sendcloud panel
2. `Settings` → `Webhooks`
3. Klik `+ Add webhook`

### **4.3 Webhook Details**
```
Event: parcel_status_changed
URL: https://jouw-vercel-url.vercel.app/api/sendcloud-webhook
Method: POST
```

Vink aan:
- ✅ parcel_status_changed
- ✅ parcel_created

### **4.4 Test Webhook**
1. Klik `Test` in Sendcloud
2. Check je server logs
3. Moet `200 OK` response geven

---

## 🚀 **Stap 5: Eerste Label Aanmaken**

### **5.1 Ga naar Admin Panel**
```
https://jouw-site.nl/admin/orders
```

### **5.2 Selecteer een Order**
- Klik op een order met status `paid` of `processing`
- Zorg dat order een geldig verzendadres heeft

### **5.3 Maak Label**
1. Scroll naar "Automatisch Verzendlabel" sectie (blauw/paars blok)
2. Klik op **"Maak Verzendlabel (DHL)"**
3. Wacht 2-5 seconden
4. Label PDF opent automatisch

### **5.4 Print en Plak**
1. Print het label
2. Plak op pakket
3. Klaar! DHL haalt op

---

## ✅ **Stap 6: Verificatie**

Check of alles werkt:

### **6.1 Order Status**
- Order status moet `shipped` zijn
- Tracking code moet zichtbaar zijn

### **6.2 Klant Email**
- Klant ontvangt verzend-email
- Email bevat tracking link

### **6.3 Sendcloud Panel**
- Label staat in `Parcels` overzicht
- Status is `Announced` of `Picked up`

### **6.4 Tracking**
- Klik tracking link
- DHL tracking moet werken (kan 1-2 uur duren)

---

## 🔧 **Troubleshooting**

### **Fout: "Module not found: sendcloud"**
```bash
# Zorg dat alle dependencies installed zijn
npm install
```

### **Fout: "Sendcloud niet geconfigureerd"**
- Check of `.env.local` de juiste keys heeft
- Restart dev server: `npm run dev`

### **Fout: "No suitable shipping method found"**
- Check of DHL geactiveerd is in Sendcloud
- Check of het verzendadres correct is (NL/BE/DE)
- Check of gewicht binnen range is (0.5-30kg)

### **Fout: "Invalid API credentials"**
- Check of Public/Secret key correct gekopieerd zijn
- Geen spaties voor/na de keys
- Check of keys actief zijn in Sendcloud panel

### **Label wordt niet aangemaakt**
1. Check server logs (Vercel deployment logs)
2. Check Sendcloud API logs (`Settings` → `API` → `Logs`)
3. Verificeer dat adres compleet is:
   - Naam
   - Straat + huisnummer
   - Postcode
   - Plaats
   - Land
   - Email

### **Webhook werkt niet**
1. Check webhook URL (moet HTTPS zijn)
2. Test webhook in Sendcloud panel
3. Check server logs
4. Verifieer dat `SENDCLOUD_WEBHOOK_SECRET` correct is

---

## 💰 **Kosten Overzicht**

### **Sendcloud Essential Plan**
- €25/maand
- Onbeperkt pakketten
- Alle carriers beschikbaar
- API toegang

### **DHL Pakket Tarieven**
**Nederland:**
- 0-2kg: €4,50
- 2-5kg: €5,25
- 5-10kg: €6,50

**Vergelijk met PostNL Direct:**
- PostNL: €7,40 (standaard zakelijk)
- **Besparing: €2,90 per pakket (39%!)**

### **Rekenvoorbeeld (50 pakketten/maand)**
```
Sendcloud Essential:    €25
50x DHL @ €4,50:        €225
Total:                  €250/maand

VS PostNL Direct:
50x @ €7,40:           €370/maand

Besparing:             €120/maand 🎉
```

---

## 📊 **Dashboard & Monitoring**

### **Sendcloud Panel**
👉 [panel.sendcloud.sc](https://panel.sendcloud.sc)

**Features:**
- Alle labels overzicht
- Tracking status real-time
- Kosten overzicht
- Statistieken
- Label opnieuw printen

### **MOSE Admin Panel**
👉 `/admin/orders`

**Features:**
- Order status tracking
- Automatische label creatie
- Email history
- Status timeline

---

## 🎯 **Best Practices**

### **1. Test Eerst**
- Maak 2-3 test orders
- Gebruik je eigen adres
- Check hele flow van order → levering

### **2. Batch Processing**
Als je veel orders hebt:
1. Filter op `paid` status
2. Maak labels in batch
3. Print alle labels tegelijk
4. DHL haalt bulk op

### **3. Tracking Updates**
- Sendcloud stuurt automatisch updates via webhook
- Order status update automatisch naar `delivered`
- Klant krijgt automatisch delivered email

### **4. Returns**
Voor retouren:
1. Sendcloud heeft retourportaal
2. Klant kan zelf retourlabel printen
3. Jij krijgt notificatie

---

## 🚀 **Advanced Features**

### **Multi-Carrier**
Voeg meer carriers toe in Sendcloud:
- PostNL (voor premium orders)
- DPD (voor export)
- UPS (voor international)

Code ondersteunt automatisch meerdere carriers!

### **Branded Tracking Page**
Sendcloud heeft branded tracking:
1. `Settings` → `Branding`
2. Upload logo
3. Kies kleuren
4. Klanten zien MOSE branding

### **Automatische Carrier Selectie**
De code kiest automatisch DHL voor NL/BE, maar je kunt dit aanpassen in:
```typescript
// src/lib/sendcloud.ts
export async function getDefaultCarrierMethod(country: string, weight: number) {
  // Custom logic hier
}
```

---

## 📞 **Support**

### **Sendcloud Support**
- Email: support@sendcloud.nl
- Tel: +31 (0)10 2070 465
- Chat: Via panel

### **MOSE Code Support**
- Check server logs bij errors
- Lees error messages
- Test API calls in Postman/Insomnia

---

## ✨ **Checklist Samenvatting**

Voordat je live gaat:

- [ ] Sendcloud account aangemaakt
- [ ] DHL Parcel geactiveerd
- [ ] API keys toegevoegd aan `.env.local`
- [ ] Webhook geconfigureerd
- [ ] Test label aangemaakt
- [ ] Test verzending uitgevoerd
- [ ] Klant email ontvangen
- [ ] Tracking link getest
- [ ] Delivered email ontvangen
- [ ] Kosten begrepen

**Als alles ✅ is, ben je klaar! 🚀**

---

## 🎉 **Resultaat**

Met deze setup heb je:
- ✅ **Volledig geautomatiseerde verzendflow**
- ✅ **€1.300+ besparing per jaar** (bij 500 pakketten)
- ✅ **Professionele klantervaring** met automatische emails
- ✅ **Real-time tracking** updates
- ✅ **Schaalbaar systeem** dat meegroeit

**MOSE is nu production-ready voor verzending! 🔥**

