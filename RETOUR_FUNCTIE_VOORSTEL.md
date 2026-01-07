# 🔄 RETOURFUNCTIE - Grondig Implementatievoorstel

## 📊 HUIDIGE SITUATIE

### ✅ Wat er al bestaat:
- **Database statussen**: `return_requested`, `returned`, `refunded` in orders tabel
- **Stripe refund webhook**: Handler voor automatische refunds
- **Sendcloud API**: Ondersteunt retouren via `is_return: true`
- **Settings**: `return_days` (standaard 14 dagen) is configureerbaar
- **Informatie pagina**: `/verzending` met retourinstructies
- **Admin**: Status dropdown heeft return opties, maar geen volledige workflow

### ❌ Wat er ontbreekt:
- **Database tabel**: Geen dedicated `returns` tabel voor retour tracking
- **Klant UI**: Geen mogelijkheid om vanuit account pagina retouren aan te vragen
- **Admin UI**: Geen specifieke retourbeheer pagina
- **Return items tracking**: Kan niet specifieke items uit een order retourneren
- **Return label generatie**: Geen automatische generatie van retourlabels
- **Return workflow**: Geen gestructureerd proces van aanvraag → goedkeuring → label → verzending → ontvangst → refund
- **Email notificaties**: Geen specifieke return emails

---

## 🎯 VOORGESTELDE OPLOSSING

### Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│                    RETOUR WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘

1. KLANT ANVRAAGT RETOUR
   └─> Via account pagina → selecteer order → selecteer items → vul reden in
   └─> Status: return_requested

2. ADMIN BEOORDEELT
   └─> Admin ziet retourverzoek in admin panel
   └─> Admin keurt goed OF wijst af
   └─> Status: return_approved OF return_rejected

3. ⭐ KLANT BETAALT RETOURLABEL KOSTEN (€6,50 excl. BTW = €7,87 incl.)
   └─> Email naar klant: "Betaal voor retourlabel"
   └─> Klant betaalt via Stripe Payment Intent
   └─> Status: return_label_payment_pending → return_label_payment_completed

4. RETOURLABEL GENERATIE (Automatisch na betaling)
   └─> Webhook: payment_intent.succeeded triggert automatisch label generatie
   └─> Sendcloud retourlabel wordt aangemaakt (is_return: true)
   └─> Email naar klant met retourlabel PDF
   └─> Status: return_label_generated

5. KLANT VERZENDT TERUG
   └─> Klant gebruikt retourlabel
   └─> Status: return_in_transit (via Sendcloud webhook)

6. PAKKET ONTVANGEN
   └─> Admin bevestigt ontvangst
   └─> Admin controleert items
   └─> Status: return_received

7. TERUGBETALING (Originele order)
   └─> Admin initieert refund via Stripe
   └─> Automatisch via webhook → refunded
   └─> Email naar klant met bevestiging
```

---

## 🗄️ DATABASE SCHEMA

### Nieuwe tabel: `returns`

```sql
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Order relatie
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Retour status
  status TEXT NOT NULL DEFAULT 'return_requested',
  -- Mogelijke statussen:
  -- return_requested, return_approved, return_rejected,
  -- return_label_payment_pending, return_label_payment_completed,
  -- return_label_generated, return_in_transit, return_received,
  -- return_inspected, refund_processing, refunded, cancelled
  
  -- Retour informatie
  return_reason TEXT NOT NULL,
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Return items (JSONB voor flexibiliteit)
  return_items JSONB NOT NULL,
  -- Format: [{"order_item_id": "uuid", "quantity": 2, "reason": "te klein"}]
  
  -- Financieel
  refund_amount DECIMAL(10,2), -- Totaal terug te betalen bedrag (items)
  return_label_cost_excl_btw DECIMAL(10,2) DEFAULT 6.50, -- Kosten retourlabel excl BTW
  return_label_cost_incl_btw DECIMAL(10,2) DEFAULT 7.87, -- Kosten retourlabel incl BTW (6,50 * 1.21)
  total_refund DECIMAL(10,2), -- refund_amount (return label kosten zijn al betaald)
  
  -- Return label betaling
  return_label_payment_intent_id TEXT, -- Stripe Payment Intent ID voor label kosten
  return_label_payment_status TEXT, -- pending, completed, failed
  return_label_paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Sendcloud integratie
  sendcloud_return_id INTEGER, -- ID van retourlabel in Sendcloud
  return_tracking_code TEXT,
  return_tracking_url TEXT,
  return_label_url TEXT, -- URL naar PDF label
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  approved_at TIMESTAMP WITH TIME ZONE,
  label_payment_pending_at TIMESTAMP WITH TIME ZONE,
  label_paid_at TIMESTAMP WITH TIME ZONE,
  label_generated_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Stripe refund
  stripe_refund_id TEXT,
  stripe_refund_status TEXT
);

-- Indexes
CREATE INDEX idx_returns_order ON returns(order_id);
CREATE INDEX idx_returns_user ON returns(user_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_created ON returns(created_at DESC);

-- RLS Policies
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own returns" 
  ON returns FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create returns" 
  ON returns FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins kunnen alles
CREATE POLICY "Admins can manage all returns" 
  ON returns FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
```

### Uitbreiding `orders` tabel (optioneel)

```sql
-- Voeg kolom toe om returns te linken
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_returns BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_deadline TIMESTAMP WITH TIME ZONE;

-- Functie om return deadline te berekenen
CREATE OR REPLACE FUNCTION calculate_return_deadline(order_date TIMESTAMP WITH TIME ZONE, return_days INT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN order_date + (return_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 FRONTEND IMPLEMENTATIE

### 1. Account Pagina - Retouren Tab

**Locatie**: `/src/app/(main)/account/page.tsx`

**Nieuwe tab toevoegen**:
- Bestaande tabs: Bestellingen, Profiel, Adressen
- Nieuwe tab: **Retouren**

**Functies**:
- Lijst van alle retouren van de klant
- Status per retour zichtbaar
- Link naar retour details
- Button "Nieuwe retour aanvragen" voor orders die binnen return deadline vallen

### 2. Return Aanvraag Pagina

**Locatie**: `/src/app/(main)/returns/new/page.tsx`

**Flow**:
1. Klant selecteert order (alleen delivered orders binnen return deadline)
2. Klant selecteert items om te retourneren (checkboxes met product afbeeldingen)
3. Klant vult reden in (dropdown):
   - "Past niet goed"
   - "Niet wat ik verwachtte"
   - "Defect product"
   - "Verkeerde maat/kleur geleverd"
   - "Anders"
4. Optionele notities
5. Preview: totaal bedrag dat wordt teruggestort (minus retourkosten)
6. Submit retourverzoek

### 3. Return Details Pagina

**Locatie**: `/src/app/(main)/returns/[id]/page.tsx`

**Toont**:
- Return status met visuele progress bar
- Order details
- Retour items met afbeeldingen
- Reden van retour
- **Betaal retourlabel knop** (als status = return_approved)
- Return label download (als beschikbaar)
- Tracking informatie (als verzonden)
- Verwacht refund bedrag en datum

**Betalingsflow**:
- Als status `return_approved`: Grote "Betaal voor retourlabel" knop (€7,87)
- Klik → Stripe checkout sessie
- Na betaling → automatisch label generatie
- Klant ziet "Betalen..." → "Label wordt gegenereerd..." → "Label beschikbaar"

### 4. Admin Retouren Overzicht

**Locatie**: `/src/app/admin/returns/page.tsx`

**Features**:
- Lijst van alle retourverzoeken
- Filters: status, datum, order
- Sort: nieuwste eerst, oudste eerst
- Quick actions: goedkeuren, afwijzen
- Search: op order nummer, klant naam

**Status badges**:
- 🔴 Aangevraagd (return_requested)
- 🟡 Goedgekeurd (return_approved)
- 💳 Betaling label (return_label_payment_pending)
- ✅ Label betaald (return_label_payment_completed)
- 🟢 Label gegenereerd (return_label_generated)
- 📦 Onderweg (return_in_transit)
- 📬 Ontvangen (return_received)
- 💰 Terugbetaald (refunded)

### 5. Admin Return Details

**Locatie**: `/src/app/admin/returns/[id]/page.tsx`

**Secties**:
1. **Return Informatie**
   - Return ID, Order ID, Klant info
   - Status met timeline
   - Aanvraag datum, deadline

2. **Items**
   - Tabel met retour items
   - Product afbeeldingen
   - Reden per item
   - Originele prijs

3. **Financieel Overzicht**
   - Origineel bedrag (items)
   - Return label kosten (€6,50 excl / €7,87 incl) - AL BETAALD DOOR KLANT
   - Totaal refund bedrag (items alleen)
   - Stripe refund status

4. **Actions**
   - **Goedkeuren**: Zet status naar `return_approved` → klant kan betalen
   - **Afwijzen**: Zet status naar `return_rejected` + reden
   - ⚠️ **Label wordt automatisch gegenereerd na betaling** (geen handmatige actie nodig)
   - **Handmatig Label Genereren**: Forceer label (alleen als betaling al gedaan maar label mislukt)
   - **Ontvangst Bevestigen**: Zet status naar `return_received`
   - **Start Refund**: Initieer Stripe refund (voor originele items)
   - **Admin Notities**: Interne notities veld

5. **Return Label**
   - Download knop voor PDF
   - Tracking code display
   - Tracking URL link

6. **Timeline**
   - Alle status wijzigingen
   - Timestamps en acties

---

## 🔌 API ENDPOINTS

### 1. POST `/api/returns/create`

**Request**:
```json
{
  "order_id": "uuid",
  "return_items": [
    {
      "order_item_id": "uuid",
      "quantity": 1,
      "reason": "te klein"
    }
  ],
  "return_reason": "Past niet goed",
  "customer_notes": "Maat was te klein"
}
```

**Response**:
```json
{
  "success": true,
  "return_id": "uuid",
  "status": "return_requested"
}
```

**Validatie**:
- Order bestaat en is van ingelogde gebruiker
- Order status is `delivered`
- Order is binnen return deadline (return_days)
- Items zijn geldig en niet al geretourneerd
- Quantity <= originele quantity

### 2. GET `/api/returns`

**Query params**: 
- `order_id` (optioneel): filter op order
- `status` (optioneel): filter op status

**Response**:
```json
{
  "returns": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "status": "return_requested",
      "return_reason": "Past niet goed",
      "refund_amount": 49.99,
      "return_shipping_cost": 5.95,
      "total_refund": 44.04,
      "created_at": "2025-01-07T10:00:00Z",
      "order": {
        "id": "uuid",
        "order_number": "ABC12345",
        "total": 49.99
      }
    }
  ]
}
```

### 3. GET `/api/returns/[id]`

**Response**: Volledige return details inclusief order items

### 4. POST `/api/returns/[id]/approve`

**Admin only**

**Request**:
```json
{
  "admin_notes": "Goedgekeurd voor retour"
}
```

### 5. POST `/api/returns/[id]/reject`

**Admin only**

**Request**:
```json
{
  "rejection_reason": "Buiten retourtermijn",
  "admin_notes": "Klant heeft te lang gewacht"
}
```

### 6. POST `/api/returns/[id]/create-payment-intent`

**Klant functie** (moet ingelogd zijn en eigenaar zijn van return)

**Action**:
- Maakt Stripe Payment Intent aan voor €7,87 (€6,50 excl BTW)
- Slaat payment_intent_id op in return
- Zet status naar `return_label_payment_pending`
- Retourneert client_secret voor Stripe Checkout

**Response**:
```json
{
  "success": true,
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 787, // in cents
  "return_id": "uuid"
}
```

### 7. POST `/api/returns/[id]/generate-label`

**Wordt automatisch aangeroepen via webhook na betaling**
**Admin kan handmatig triggeren als backup**

**Action**: 
- Genereert Sendcloud retourlabel
- Slaat label URL op
- Verstuurt email naar klant met label
- Zet status naar `return_label_generated`

**Response**:
```json
{
  "success": true,
  "label_url": "https://...",
  "tracking_code": "ABC123",
  "tracking_url": "https://..."
}
```

**Validatie**:
- Status moet `return_label_payment_completed` zijn
- Betaling moet succesvol zijn

### 8. POST `/api/returns/[id]/confirm-received`

**Admin only**

**Action**:
- Zet status naar `return_received`
- Controleer items (handmatig)
- Update stock (items terug naar inventory)

### 9. POST `/api/returns/[id]/process-refund`

**Admin only**

**Request**:
```json
{
  "refund_amount": 44.04,
  "admin_notes": "Items ontvangen in goede staat"
}
```

**Action**:
- Maakt Stripe refund aan voor originele order items
- ⚠️ Return label kosten (€7,87) worden NIET teruggestort (klant heeft dit al betaald)
- Wacht op webhook bevestiging
- Email naar klant met refund bevestiging

---

## 📧 EMAIL TEMPLATES

### 1. Return Requested Email
**Trigger**: Klant dient retourverzoek in  
**Doel**: Bevestiging aanvraag + uitleg volgende stappen

### 2. Return Approved Email
**Trigger**: Admin keurt retour goed  
**Inhoud**: 
- Bevestiging goedkeuring
- ⭐ **BELANGRIJK**: Link naar betaalpagina voor retourlabel (€7,87)
- Uitleg dat label pas beschikbaar is na betaling
- Duidelijke call-to-action: "Betaal voor retourlabel"

### 3. Return Label Payment Completed Email
**Trigger**: Klant betaalt retourlabel kosten  
**Inhoud**:
- Bevestiging betaling (€7,87)
- Uitleg dat label wordt gegenereerd
- Verwacht wanneer label beschikbaar is (binnen 5 minuten)

### 4. Return Label Generated Email
**Trigger**: Automatisch na betaling (via webhook)  
**Inhoud**:
- Returnlabel PDF attachment
- Tracking code
- Instructies voor verzending
- PostNL punt locator link
- ⚠️ Herinnering: Label is betaald en kan gebruikt worden

### 5. Return Received Email
**Trigger**: Admin bevestigt ontvangst  
**Inhoud**:
- Bevestiging ontvangst
- Uitleg refund proces (5-7 werkdagen)

### 6. Return Refunded Email
**Trigger**: Stripe refund webhook  
**Inhoud**:
- Bevestiging terugbetaling
- Bedrag teruggestort
- Verwachte zichtbaarheid op rekening

### 7. Return Rejected Email
**Trigger**: Admin wijst retour af  
**Inhoud**:
- Reden afwijzing
- Contact mogelijkheden voor vragen

---

## 🔗 SENDCLOUD INTEGRATIE

### Return Label Generatie

**API Call**:
```typescript
const returnLabel = await createSendcloudParcel({
  name: order.shipping_address.name,
  address: order.shipping_address.address,
  city: order.shipping_address.city,
  postal_code: order.shipping_address.postalCode,
  country: order.shipping_address.country || 'NL',
  email: order.email,
  order_number: `RETURN-${return.id}`,
  is_return: true, // ← Belangrijk!
  request_label: true,
  // Optioneel: specifieke return shipping method
})
```

**Uitbreiding `src/lib/sendcloud.ts`**:
```typescript
export async function createReturnLabel(
  returnId: string,
  order: Order,
  returnItems: ReturnItem[]
): Promise<{
  label_url: string
  tracking_code: string
  tracking_url: string
}> {
  // Implementatie
}
```

---

## 💳 STRIPE INTEGRATIE

### 1. Return Label Payment (NIEUW)

**Payment Intent voor retourlabel kosten**:
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 787, // €7,87 in cents (€6,50 excl BTW * 1.21)
  currency: 'eur',
  metadata: {
    return_id: return.id,
    order_id: order.id,
    type: 'return_label_payment',
  },
  description: `Retourlabel kosten - Return ${return.id.slice(0, 8)}`,
  receipt_email: return.order.email,
})
```

**Webhook handler**:
- Na succesvolle betaling → automatisch label genereren
- Update return status naar `return_label_payment_completed`
- Trigger `/api/returns/[id]/generate-label`

### 2. Refund Logic (Originele items)

**Volledige refund**: Alle items geretourneerd  
**Gedeeltelijke refund**: Alleen bepaalde items  
⚠️ **Return label kosten worden NIET teruggestort** (klant heeft dit al betaald)

**API Call**:
```typescript
const refund = await stripe.refunds.create({
  payment_intent: order.stripe_payment_intent_id,
  amount: Math.round(return.refund_amount * 100), // Alleen items, geen label kosten
  reason: 'requested_by_customer',
  metadata: {
    return_id: return.id,
    order_id: order.id,
    type: 'return_refund',
  },
})
```

**Webhook handler** (bestaand uitbreiden):
```typescript
// NIEUWE: Return label betaling
case 'payment_intent.succeeded': {
  // Check of payment_intent metadata return_id bevat
  if (paymentIntent.metadata.return_id) {
    // Update return status naar return_label_payment_completed
    // Automatisch trigger label generatie
    await generateReturnLabel(paymentIntent.metadata.return_id)
  }
  // ... bestaande order logic
}

// Refund voor originele items
case 'charge.refunded': {
  // Bestaande code +
  // Check of refund metadata return_id bevat
  if (charge.metadata.return_id) {
    // Update return status naar refunded
    // Update return.stripe_refund_id
    // Verstuur refund email
  }
}
```

---

## 📱 UI/UX DETAILS

### Account Pagina Retouren Tab

```tsx
// Pseudo code
<ReturnsTab>
  {/* Active Returns */}
  <Section title="Lopende Retouren">
    {activeReturns.map(return => (
      <ReturnCard>
        <StatusBadge status={return.status} />
        <OrderLink order={return.order} />
        <ItemsPreview items={return.items} />
        <RefundAmount amount={return.total_refund} />
        <Actions>
          {return.status === 'return_approved' && (
            <PayForLabelButton 
              amount={7.87}
              onClick={() => createPaymentIntent(return.id)}
            />
          )}
          {return.status === 'return_label_payment_pending' && (
            <PaymentProcessingMessage />
          )}
          {return.status === 'return_label_payment_completed' && (
            <LabelGeneratingMessage />
          )}
          {return.status === 'return_label_generated' && (
            <DownloadLabelButton />
          )}
          {return.status === 'return_in_transit' && (
            <TrackReturnButton />
          )}
        </Actions>
      </ReturnCard>
    ))}
  </Section>

  {/* Past Returns */}
  <Section title="Afgeronde Retouren">
    {/* ... */}
  </Section>

  {/* Eligible Orders */}
  <Section title="Retour Aanvragen">
    {eligibleOrders.map(order => (
      <OrderCard>
        <OrderDetails />
        <RequestReturnButton orderId={order.id} />
        <ReturnDeadline deadline={order.return_deadline} />
      </OrderCard>
    ))}
  </Section>
</ReturnsTab>
```

### Return Request Form

```tsx
<ReturnRequestForm order={order}>
  <Step1: SelectItems>
    {order.items.map(item => (
      <ItemCheckbox>
        <ProductImage />
        <ProductDetails />
        <QuantitySelector max={item.quantity} />
        <ReasonDropdown />
      </ItemCheckbox>
    ))}
  </Step1>

  <Step2: Reason>
    <ReasonDropdown />
    <NotesTextarea />
  </Step2>

  <Step3: Summary>
    <ReturnItemsList />
    <RefundCalculation>
      <Subtotal />
      <ReturnShippingCost />
      <TotalRefund />
    </RefundCalculation>
    <TermsCheckbox />
    <SubmitButton />
  </Step3>
</ReturnRequestForm>
```

---

## ⚙️ ADMIN PANEL

### Returns Overzicht

**Filters**:
- Status dropdown
- Datum range picker
- Order nummer search
- Klant email search

**Actions**:
- Bulk approve
- Export naar CSV
- Print labels (bulk)

**Metrics**:
- Totaal aantal retouren
- Retouren per status
- Gemiddelde refund tijd
- Retour rate (%)

### Return Details View

**Tabs**:
1. **Overzicht**: Basis info, status, timeline
2. **Items**: Retour items tabel
3. **Financieel**: Refund berekening, Stripe status
4. **Communicatie**: Email log, admin notities
5. **Label**: Download, tracking

---

## 🔒 BEVEILIGING & VALIDATIE

### Validatie Rules

1. **Return Deadline Check**:
   ```typescript
   const returnDeadline = addDays(order.delivered_at, returnDays)
   if (new Date() > returnDeadline) {
     throw new Error('Retourtermijn is verstreken')
   }
   ```

2. **Item Availability**:
   - Items kunnen niet 2x geretourneerd worden
   - Quantity <= originele quantity

3. **Status Transitions**:
   ```typescript
   const validTransitions = {
     return_requested: ['return_approved', 'return_rejected'],
     return_approved: ['return_label_payment_pending', 'return_rejected'],
     return_label_payment_pending: ['return_label_payment_completed', 'cancelled'],
     return_label_payment_completed: ['return_label_generated'], // Automatisch
     return_label_generated: ['return_in_transit', 'cancelled'],
     return_in_transit: ['return_received'],
     return_received: ['refund_processing', 'return_inspected'],
     refund_processing: ['refunded'],
   }
   ```

4. **Payment Validation**:
   - Payment Intent kan alleen worden aangemaakt als status `return_approved` is
   - Label kan alleen worden gegenereerd als betaling succesvol is
   - Klant moet eigenaar zijn van return

5. **RLS Policies**:
   - Klanten zien alleen eigen retouren
   - Klanten kunnen alleen eigen retouren betalen
   - Admins zien alles
   - Public geen toegang

---

## 📊 NOTIFICATIES & LOGGING

### Return Status History

```sql
CREATE TABLE return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
)
```

### Email Logging

Gebruik bestaande `order_emails` tabel, uitbreiden met `return_id` kolom.

---

## 🚀 IMPLEMENTATIE STAPPEN

### Fase 1: Database & Backend (Week 1)
1. ✅ Database migrations aanmaken (inclusief payment fields)
2. ✅ API endpoints implementeren
   - Return creation
   - Payment Intent creation voor label
   - Label generatie (na betaling)
3. ✅ Validatie logica
4. ✅ Sendcloud return label functie
5. ✅ Stripe integratie
   - Payment Intent voor label kosten
   - Refund voor originele items
   - Webhook handlers

### Fase 2: Frontend - Klant (Week 2)
1. ✅ Account pagina retouren tab
2. ✅ Return aanvraag formulier
3. ✅ Return details pagina
   - **Betaal voor retourlabel flow** (Stripe Checkout integratie)
   - Payment status indicators
4. ✅ Email templates
   - Return approved (met betaallink)
   - Payment completed
   - Label generated

### Fase 3: Frontend - Admin (Week 2)
1. ✅ Admin returns overzicht
2. ✅ Return details admin view
3. ✅ Bulk actions
4. ✅ Analytics/metrics

### Fase 4: Testing & Polish (Week 3)
1. ✅ End-to-end testing
2. ✅ Edge cases
3. ✅ UI/UX verbeteringen
4. ✅ Performance optimalisatie

---

## 📈 VOORDELEN VAN DEZE AANPAK

✅ **Gestructureerd**: Duidelijke workflow met statussen  
✅ **Transparant**: Klant ziet altijd status van retour  
✅ **Automatisch**: Email notificaties op belangrijke momenten  
✅ **Flexibel**: Kan specifieke items retourneren, niet alleen hele order  
✅ **Professioneel**: Integratie met Sendcloud en Stripe  
✅ **Schaalbaar**: Makkelijk uit te breiden met extra features  
✅ **User-friendly**: Eenvoudig voor klant en admin  

---

## 🎯 SUCCESCRITERIA

- ✅ Klanten kunnen zelf retouren aanvragen vanuit account
- ✅ **Klanten moeten eerst betalen (€7,87) voordat label wordt gegenereerd**
- ✅ Label wordt automatisch gegenereerd na succesvolle betaling
- ✅ Admin kan retouren efficiënt beheren
- ✅ Automatische label generatie werkt na betaling
- ✅ Refund proces is geautomatiseerd (alleen items, geen label kosten)
- ✅ Email communicatie is compleet
- ✅ Return rate is trackbaar
- ✅ Alle edge cases zijn afgehandeld
- ✅ Betalingsflow is duidelijk en transparant

---

## 💡 TOEKOMSTIGE UITBREIDINGEN (Optioneel)

- **Automatische goedkeuring**: Retouren binnen X dagen automatisch goedkeuren
- **Return reason analytics**: Welke redenen komen vaak voor?
- **Exchange flow**: Ruilen i.p.v. retour
- **Return portal**: Dedicated pagina met return wizard
- **SMS notificaties**: Naast email ook SMS updates
- **Return preview**: Klant ziet vooraf exact wat wordt teruggestort
- **Store credit optie**: I.p.v. refund, store credit aanbieden

---

---

## ⚠️ BELANGRIJKE WIJZIGING: RETOURLABEL BETALING

### Betaalflow voor Retourlabel

**Kosten**: €6,50 excl. BTW = €7,87 incl. BTW (21%)

**Workflow**:
1. Admin keurt retour goed → status: `return_approved`
2. Klant ontvangt email met betaallink
3. Klant betaalt €7,87 via Stripe Payment Intent
4. Na succesvolle betaling → automatisch Sendcloud label generatie
5. Klant ontvangt email met retourlabel PDF
6. Klant kan label gebruiken om pakket te verzenden

**Belangrijk**:
- ⚠️ Label wordt **NIET** gegenereerd voordat betaling is voltooid
- ⚠️ Return label kosten worden **NIET** teruggestort bij refund (klant heeft dit al betaald)
- ⚠️ Alleen de originele order items worden teruggestort
- ✅ Betaling is via Stripe (veilig en betrouwbaar)
- ✅ Automatische label generatie na betaling (via webhook)

**Voorbeeld Refund Berekenen**:
```
Originele order: €49,99
Retour items: €49,99
Return label kosten: €7,87 (al betaald door klant)
Totaal refund: €49,99 (alleen items, geen label kosten)
```

---

**Status**: ✅ FINAAL VOORSTEL - Met retourlabel betalingsflow  
**Auteur**: AI Assistant  
**Datum**: 7 januari 2025  
**Laatste update**: Betaalflow toegevoegd

