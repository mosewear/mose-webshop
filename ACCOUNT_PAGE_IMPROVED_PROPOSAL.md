# Account Pagina Verbetering - Werkend Voorstel

## Analyse Huidige Problemen

1. ❌ **Geen product thumbnails** - `order_items.image_url` bestaat maar wordt niet gebruikt
2. ❌ **Sidebar navigatie werkt niet** - buttons doen niets, geen state management
3. ❌ **Status colors niet MOSE style** - gebruikt light colors (bg-yellow-100), niet consistent
4. ❌ **Mobile UX suboptimaal** - sidebar neemt ruimte in op kleine schermen
5. ❌ **Order items layout basic** - alleen tekst, geen visuele hiërarchie
6. ❌ **Geen tab state management** - kan niet switchen tussen Bestellingen/Profiel/Adressen

## Verbetering Voorstel

### Concept: Tab-Based Navigation met Product Thumbnails

**Desktop:**
- Sticky sidebar links (Bestellingen/Profiel/Adressen)
- Active state: Teal-green background + white text
- Main content area met orders
- Product thumbnails links in order items
- Compact, scannable layout

**Mobile:**
- Horizontal scrollable tabs bovenaan (ipv sidebar)
- Full-width orders
- Product thumbnails boven order items
- Touch-optimized buttons

### Key Features

#### 1. Tab Navigation (State Management)
- Werkt op desktop (sidebar) en mobile (tabs)
- Active state visueel duidelijk
- Ready voor toekomstige tabs

#### 2. Product Thumbnails
- Gebruik `order_items.image_url` voor thumbnails
- Fallback naar placeholder als geen image
- Aspect ratio 1:1 (square)
- Desktop: thumbnail links, tekst rechts
- Mobile: thumbnail boven, tekst onder

#### 3. Status Badges (MOSE Style)
- **Pending/Processing**: Geel (`bg-yellow-400 text-black`) - zoals in screenshot
- **Shipped**: Teal-green (`bg-brand-primary text-white`)
- **Delivered**: Donkergrijs (`bg-gray-800 text-white`)
- **Cancelled**: Rood (`bg-red-600 text-white`)
- Bold, uppercase, compact

#### 4. Order Cards Verbetering
- Header: Ordernummer + Status badge + Totaal + Datum
- Order items: Thumbnail + Product naam + Size/Color/Quantity + Prijs
- Actions: "Bekijk details" (primary) + "Bestel opnieuw" (als delivered)
- Border-2 border-black (MOSE style)
- Spacing verbeterd voor scannability

#### 5. Responsive Design
- Mobile: Horizontal scrollable tabs
- Desktop: Sticky sidebar
- Touch-optimized op mobile
- Perfect op alle schermen

### Layout Structure

**Desktop:**
```
┌─────────────────────────────────────────┐
│  MIJN ACCOUNT            [UITLOGGEN]    │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Main Content                │
│          │                              │
│ ● Best.  │  [Order Card 1]              │
│   Profiel│  [Order Card 2]              │
│   Adres. │  [Order Card 3]              │
└──────────┴──────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────────┐
│  MIJN ACCOUNT  [UITLOGGEN]  │
├─────────────────────────────┤
│ [Best.] [Profiel] [Adres.]  │ ← Tabs
├─────────────────────────────┤
│ [Order Card 1]              │
│ [Order Card 2]              │
│ [Order Card 3]              │
└─────────────────────────────┘
```

### Order Card Detail

```
┌──────────────────────────────────────┐
│ Bestelling #87958ECF  [IN BEHANDELING]│
│ 4 januari 2026          €85.00       │
├──────────────────────────────────────┤
│ [IMG] MOSE Hoodie Grijs              │
│       L • Grijs • x1    €84.99       │
├──────────────────────────────────────┤
│ [BEKIJK DETAILS] [BESTEL OPNIEUW]    │
└──────────────────────────────────────┘
```

### Styling Details

**Sidebar (Desktop):**
- Background: `bg-gray-50`
- Border: `border-2 border-gray-300`
- Active: `bg-brand-primary text-white font-bold`
- Hover: `hover:bg-gray-200`

**Tabs (Mobile):**
- Horizontal scrollable
- Active: `border-b-2 border-brand-primary font-bold text-brand-primary`
- Inactive: `text-gray-600`

**Order Cards:**
- Border: `border-2 border-black`
- Background: `bg-white`
- MOSE consistent styling

**Status Badges:**
- Geel/Teal/Grijs/Rood (MOSE style)
- Bold, uppercase, compact

### Voordelen

✅ **Werkt echt** - Tab navigation functioneel  
✅ **Product thumbnails** - Visueel herkenbaar  
✅ **MOSE styling** - Consistent met rest van site  
✅ **Perfect responsive** - Desktop + Mobile geoptimaliseerd  
✅ **Toekomstbestendig** - Ready voor uitbreiding  
✅ **Betere UX** - Scannable, duidelijk, efficient  
