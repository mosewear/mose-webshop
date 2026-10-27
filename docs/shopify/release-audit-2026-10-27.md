# Code-audit: volledige Shopify-omschakeling

Deze controle betreft de implementatiebranch op 27 oktober 2026. Er zijn voor deze audit geen live provider- of databasecalls uitgevoerd. Een geconfigureerde of groene schakelaar is geen vervanging voor bewijs dat bestaande klanten hun voordeel, voorraad en bestelling behouden.

## Concrete fouten die nu zijn gedicht

| Probleem | Correctie | Controle |
|---|---|---|
| De readiness-helper kon groen worden met één vrijgegeven mapping, ook bij 27 verkoopbare varianten. | `src/lib/shopify-release-audit.ts` vergelijkt alle actieve verkoopbare MOSE-varianten met de echte enabled mappings. Ontbrekende of dubbele providerkoppelingen en prijsverschillen blokkeren. Afgekapt of mislukt uitlezen wordt onbekend, nooit nul. | Test met 27 varianten en slechts één mapping: 26 ontbrekend, geblokkeerd. |
| De client weigerde giftcardmanden, maar de serverpolicy stond `fulfillment_owner=digital` nog toe. | `src/lib/shopify/policy.ts` staat alleen fysieke MOSE- en Tapstitch-regels toe zolang het digitale contract ontbreekt. | Handmatig enabled digitale mapping wordt server-side geweigerd. |
| Een lokaal op concept gezet product kon via een oude enabled mapping en Shopify-publicatie nog afgerekend worden. | De checkout leest actuele lokale variant en echte ouderproduct terug. Alleen active/is_active, beschikbare fysieke variant en actuele prijs mogen door. | Checkouttests blokkeren gewijzigde publicatie, prijs, onbeschikbaarheid en giftcard vóór een Shopify-aanroep. |
| Een bekende nieuwe Tapstitch-productidentiteit kon per ongeluk als MOSE-fulfillment worden gemapt. | De expliciete bronwhitelist vereist owner `tapstitch` en exact het oorspronkelijke suppliermodel, zowel bij daadwerkelijke checkout als in readiness. | Verkeerde owner of suppliercode wordt geweigerd. |
| Een brede `benefits_verified`-switch verbergt ontbrekende voordelenmigratie. | Readiness toont concrete geaggregeerde actuele verplichtingen apart: geldige promo's, staffels, loyaltyaccounts, cadeaubonsaldo en geplande bezorging. De code laat onbekende native kortingspariteit onbekend en ontbrekende ledgerverwerking geblokkeerd. | 22 promo's en 54 loyaltyaccounts blijven onbekend/geblokkeerd ondanks groene handmatige switch. |

De readiness-route leest eerst alleen de integratiestatus. Als deze migratie nog ontbreekt of de database onbereikbaar is, volgen geen twaalf andere probes. Overige queries draaien in batches van maximaal drie, met één deadline van twaalf seconden. Alleen een geautoriseerde admin/manager krijgt de rapportage; er worden geen kortingscodes, cadeauboncodes of klantidentiteiten uitgelezen of teruggegeven.

## Nog uitvoerbaar werk, onafhankelijk van browsertoegang

### 1. Loyaliteit heeft nog geen Shopify-ledger

`src/lib/shopify/worker.ts` en `complete_shopify_event` projecteren order-/refundgegevens, maar roepen geen puntenboekingen of reversals aan. De bestaande `src/app/api/loyalty/redeem/route.ts` kan wel oude MOSE-punten verminderen; er staat geen Shopify-voordeel tegenover deze route. Alleen klanten koppelen aan orders lost dit niet op.

Benodigd: expliciet voordeelcontract; idempotente boeking per Shopify-order/refund; ordergebonden inwisselreservering; native bruikbaar voordeel; herstel bij onzekere providerrespons. Test: dubbele webhook, deelrefund, al bestede punten, gelijktijdig inwisselen en mislukte checkout. Tot dat werkt, niet de hele huidige webshop omschakelen alsof loyalty behouden is.

### 2. Promocode- en staffelpariteit is nog niet bewezen

De nieuwe `CartInput` bevat alleen merchandise, quantity, buyer country en attributes. Bestaande serverberekeningen uit `/api/checkout` worden hierdoor niet vanzelf Shopify-kortingen. Native Shopify-code-invoer kan pas pariteit geven nadat dezelfde geldigheid, gebruikslimieten, sale-uitsluiting en combinatieregels zijn ingericht en getest. Dit geldt ook voor staffels over verschillende maten/kleuren van één product.

Benodigd: actuele regelset privé exporteren, native configuratie of gekozen kortingsapp inrichten, en gouden manden op exacte centbedragen vergelijken. De audit gebruikt alleen aantallen en claimt deze externe inrichting niet te kennen. Een toekomstige implementatie moet gemeten pariteitsbewijs toevoegen; de huidige audit bewust niet groen zetten met alleen een nieuwe boolean.

### 3. Landenbereik is nog NL-only

`src/lib/shopify/policy.ts` valideert `country` met `z.literal('NL')`. `src/lib/shopify-cart.ts`, `ShopifyCheckoutHandoff` en de CartInput zetten ook NL vast. De bestaande checkout bevat BE/DE/FR/GB/OTHER-opties. Die oude UI bewijst geen correcte tarieven, maar stil beperken tot NL is evenmin een volledige migratie.

Benodigd: concrete ondersteunde landenlijst uit daadwerkelijk beleid; serverallowlist en landkeuze; Shopify Markets en tarieven per fulfillmentgroep. Test gemengde MOSE/Tapstitch-mand, verschillende landen, afhalen, belastingen en adreswijziging binnen Shopify. Geen willekeurige `OTHER`-bestemming toestaan.

### 4. Winkelvoorraad moet na Shopify-betaling weer juist worden weergegeven

De shop en PDP lezen lokale `product_variants.stock_quantity` en presalevelden. Shopify-checkout valideert autoritatieve Shopify-beschikbaarheid, maar de huidige orderworker schrijft geen lokale voorraadprojectie. Daardoor kan de uiteindelijke betaling veilig worden geweigerd terwijl de webshop nog beschikbaarheid blijft tonen die niet meer klopt.

Benodigd: één voorraadbron na cutover en een terugleesbare voorraadprojectie of directe Shopify-beschikbaarheid voor cataloguspresentatie. Reguliere en presalevoorraad niet samenvoegen. Test laatste eenheid, late historische Mollie-betaling, annulering/refund en bijvullen. De veilige per-request checkoutcheck is geen vervanging voor correcte winkelpresentatie.

### 5. Worker en reconciliatie moeten automatisch blijven lopen

Bij de start van deze audit stonden `/api/shopify/worker` en `/api/shopify/reconcile` niet in `vercel.json`. Handmatig draaien houdt de maximaal vijftien minuten oude heartbeat niet permanent geldig. Dit werk is parallel aan deze audit toegewezen aan de order-agent; verifieer diens uiteindelijke croncommit en productiescheduler voordat de releasepoort opent.

Benodigd bewijs: schedulerconfiguratie, beperkte concurrency, beveiligde CRON_SECRET-route, uitgeschakelde modus zonder onnodige databasecalls, en verwerkte proeforder plus gesimuleerde gemiste webhook.

## Externe inrichting die deze code-audit niet kan bewijzen

- Acht echte Tapstitch-accountproducten met juiste maten/kleuren en officiële Shopify-variantkoppelingen. Bronpagina-ID's zijn geen accountfulfillment-ID's.
- Shopify-productpublicatie, juiste fulfillmentlocations, echte leveranciersbetaalroute en geteste tracking. Lokale conceptimport voltooit deze stappen niet.
- Verkoopprijzen op echte landed costs, belastingen/verzendkosten, samples en productbeeldcontrole.
- Productieservercredentials, webhookabonnementen, database/RLS-migraties en integratie-appinstallatie.
- Gekozen afhandeling van MOSE-zendingen: via native Shopify/Sendcloud-inrichting of een expliciete eigen koppeling. Legacy MOSE-fulfillmentacties mogen niet per ongeluk Shopify/Tapstitch-regels verwerken.

## Actieve versus inactieve producten

De volledige releasecontrole betreft alle **actieve, verkoopbare** lokale varianten. De acht nieuwe geïmporteerde concepten blijven opzettelijk inactief en onbeschikbaar totdat hun prijzen, samples en supplierkoppelingen zijn bewezen. Een inactieve cadeaubon zonder saldoverplichtingen hoeft niet kunstmatig te worden geactiveerd; zodra die actief wordt, moet het digitale contract wel bestaan. Readiness zegt dus nooit dat een inactief product al verkoopklaar is.
