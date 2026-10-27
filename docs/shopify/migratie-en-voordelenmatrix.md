# MOSE — migratie en voordelenmatrix

Datum: 27 oktober 2026. Scope: alle nieuwe aankopen via één Shopify-checkout en één betaling; fulfillment per orderregel door MOSE of Tapstitch. Historische Mollie-orders blijven bij hun oorspronkelijke betaalprovider.

Dit document is een inventarisatie en uitvoeringschecklist, geen bewijs van productie-inrichting. De regels zijn gelezen in de lokale oorspronkelijke MOSE-code. De hieronder genoemde catalogus- en saldometing komt uit de read-only Supabase-audit van de hoofdimplementatieagent; het gegenereerde auditbestand is in deze review gecontroleerd. Overige databaseconfiguratie, Shopify-abonnement/rechten en supplierkosten zijn hier niet bewezen. Code-defaults zijn geen bevestigde winkelinstellingen. Er staan geen klantgegevens, sleutels of cadeauboncodes in dit document.

## Actuele read-only momentopname

Bron: `/private/tmp/mose-shopify-audit/catalog-and-summary.json`, waargenomen 27 oktober 2026 om 12:50:49 UTC (13:50:49 Europe/Amsterdam). Deze momentopname vervangt geen laatste controle vlak vóór omschakeling.

| Bestaand product | Actief | Basisprijs | Varianten in audit |
|---|---|---:|---:|
| MOSE Essential Hoodie | Ja | €79 | 9 |
| MOSE Classic Sweater | Ja | €75 | 6 |
| MOSE Tee | Ja | €50 | 12 |
| MOSE Automatisch Horloge | Nee | €150 | 2 |
| MOSE Giftcard | Nee | €20 | 0 |

Dit zijn basisprijzen, geen bewijs dat iedere variant dezelfde eindprijs, voorraad of publicatiestatus heeft. De giftcard staat op vrij bedrag ingesteld, maar is inactief. Bestaande inactieve producten niet automatisch activeren bij migratie.

De audit telt **nul giftcardrecords, nul actief saldo en nul geplande nog niet bezorgde kaarten**. Er is op dit moment dus geen aangetoonde bestaande kaarthoudermigratie nodig. De code-/hashbeperking hieronder is een voorwaardelijke vereiste voor kaarten die tussen nu en omschakeling alsnog worden uitgegeven; de toekomstige giftcardfunctie mag pas worden geactiveerd na bewezen Shopify-ondersteuning. Giftcardredemptions zijn in dit auditbestand niet afzonderlijk geteld.

Orders: 11 `pending / pending`, 5 `paid / shipped`, 1 `paid / processing`; daarnaast historische geleverd-, refund- en retourstatussen. Een databasewaarde `pending` bewijst niet dat de betaalprovider nog een betaalbare poging heeft. Alle 11 individueel privé tegen de provider reconciliëren; niet blind annuleren of opnieuw migreren als onbetaald.

## Belangrijkste vrijgaveblokkades

1. **Cadeaubonnen kunnen niet blind worden gekopieerd als ze later alsnog worden uitgegeven.** De huidige snapshot heeft nul kaarten. Afgeleverde codes zouden uitsluitend als SHA-256-hash plus laatste vier tekens zijn opgeslagen; alleen nog te versturen kaarten bewaren tijdelijk de code. De codevorm is `MOSE-XXXX-XXXX-XXXX-XXXX` (24 tekens inclusief streepjes). Shopify accepteert voor een zelf opgegeven nieuwe giftcardcode 8–20 alfanumerieke tekens. Als de kaartentelling bij omschakeling niet langer nul is: gecontroleerde vervanging of eenmalige omwisselprocedure; geen belofte dat oude codes rechtstreeks blijven werken. Bij blijvend nul records geen onnodige migratiemachine bouwen.
2. **Landenbereik is groter dan het oorspronkelijke NL-pilotplan.** De bestaande checkout biedt NL, BE, DE, FR, GB en OTHER. Die UI-keuzes bewijzen geen correct ingerichte tarieven, maar uitsluitend NL activeren voor de volledige collectie zou een onbesproken beperking zijn. Verifieer bestaande afzetlanden/tarieven en configureer per fulfillmentstroom.
3. **Presale is een aparte voorraadbelofte.** Huidige code bevat gewone voorraad én presalevoorraad. Samenvoegen tot direct leverbare Shopify-voorraad zou onjuiste beschikbaarheid en levertijden geven.
4. **Voordelenpariteit moet in Shopify zelf worden bewezen.** Een korting die uitsluitend in de Next.js-mand berekend wordt is geen afdwingbare checkoutkorting. Maatwerk Shopify Functions via een custom app zijn volgens officiële documentatie Plus-only; een Basic-winkel kan wel publieke App Store-apps met Functions gebruiken.
5. **Bestaande open betalingen en kaartreserveringen moeten vóór omschakeling worden afgehandeld.** Er mag geen moment zijn waarop dezelfde voorraad of hetzelfde cadeaubonsaldo onafhankelijk in twee systemen besteedbaar is.

## Gecontroleerde regels en gewenste migratie

| Onderdeel | Bestaand gedrag uit code | Vereist resultaat en bewijs |
|---|---|---|
| Staffel | Aantallen van varianten worden per `product_id` opgeteld. Hoogste actieve tier waarvan `min_quantity` gehaald wordt. Percentage per stuk op centen afgerond; vast bedrag maximaal artikelprijs. Werkelijke tiers komen uit `product_quantity_discounts`; aantallen/percentages dus nog onbekend. | Zelfde selectie van kleur-/maatvarianten telt mee. Test tier min−1/min/min+1, meerdere varianten, twee producten, afronding. Geen fictieve standaardstaffel invoeren. |
| Sale + staffel | Een positieve saleprijs lager dan baseprijs blokkeert staffel op dat product. Cadeaubonnen doen niet mee. | Shopify effectieve prijs en kortingscombinaties reproduceren dit; actieve aanbiedingen uit DB exporteren. |
| Promocode + staffel | `/api/checkout` weigert promo als er actieve staffelbesparing is. | Niet beide toepassen na een wijziging in de Shopify-checkout. Test toevoegen/verwijderen/aantal wijzigen na handoff. |
| Promo op sale | Standaard slaan promo's sale-regels over; met `applies_to_sale_items=true` tellen ze wel mee. Minimum wordt op het eligible subtotaal getoetst. Giftcardproducten tellen nooit mee. Vast bedrag wordt op eligible subtotaal begrensd. | Per actieve code migreren: type, waarde, minimum, sale-scope, geldigheid, gebruikslimiet en bestaande usage. Geen coupons of klantkoppelingen opnemen in een openbaar rapport. |
| Promo geldigheid | Bestaande route controleert actief, expiry en usage limit; gebruik wordt bij ordercreatie geregistreerd. | Beslis expliciet of gebruik bij betaalde order gaat tellen. Historische teller eerst reconciliëren met afgebroken orders; geen stil geresette limieten. |
| Loyalty tiers | Bronze 0–499 lifetime points: 0%; Silver 500–999: 5%; Gold ≥1000: 10%. Authenticated Supabase-user moet hetzelfde e-mailadres hebben als order. | Geverifieerde Shopify/Supabase-klantidentiteit, geen gast die alleen een bestaand e-mailadres invult en korting krijgt. |
| Loyalty korting | Route berekent tierkorting op `order.subtotal` na staffel, afzonderlijk van promo; daarna worden promo en tier beide afgetrokken. Er is op deze plek geen expliciete giftcard-/sale-uitsluiting. | Productbeleid vaststellen voor giftcards en combinaties. Bestaand mogelijk ongewenst gedrag niet ongemerkt kopiëren, maar ook niet stil wijzigen. Gouden testmanden met exacte centbedragen goedkeuren. |
| Punten verdienen | `pointsPerEuro=1`; `floor(orderTotal)`. `fulfill-paid-order.ts` gebruikt `updatedOrder.total`, dus orderbedrag inclusief eventueel verzending zoals daar opgeslagen. | Grondslag expliciet bevestigen, vooral giftcardaankoop versus besteden, belasting en verzending. Eén puntenboeking per nieuwe Shopify-order; historische boekingen niet opnieuw uitvoeren. |
| Punten inwisselen | Minimaal 100 punten, stappen van 100, €5 per stap. `api/loyalty/redeem` verlaagt saldo en retourneert een kortingswaarde; de gelezen route maakt geen Shopify-discount of giftcard. | Eerst bewijzen waar die korting in huidige betaalroute terechtkomt. Nieuwe route transactioneel en ordergebonden; geen punten kwijt zonder bruikbaar voordeel. Concurrent inwisselen/retry/reversal testen. |
| Loyalty retour | `reverse-loyalty-for-return.ts` trekt floor(refundbedrag) af, begrensd op resterend verdiende punten; verlaagt saldo en lifetime en berekent tier opnieuw. | Eenmalige reversal per refund, ook deelrefunds en al uitgegeven punten. Idempotente databasebewerking, geen losse browseractie. |
| Verzending | `site_settings.shipping_cost`; fallback €0. `free_shipping_threshold`; fallback €150. Drempel wordt op subtotaal na promo én loyalty toegepast, vóór cadeaubonbetaling. | Live waarden ophalen; niet fallback als commercieel beleid presenteren. Cadeaubon als betaalmiddel verlaagt gratis-verzendkwalificatie niet. Voor gemengde order totale klantkosten en werkelijke dubbele logistieke kosten toetsen. |
| Afhalen | Settings bepalen enabled, radius, adres en coördinaten. Defaults: aan, 50 km, MOSE Groningen. Alleen NL; PDOK-adrescoördinaten + hemelsbrede afstand; mislukte adreslookup maakt niet eligible. Afhalen kost €0. | Shopify native pickup is niet automatisch dezelfde radiusregel. Basic-voorstel: alleen geheel lokaal afhaalbare fysieke order; geen gemengd pickup+Tapstitch zonder bewezen ondersteunde mogelijkheid. Behoud/wijziging radius expliciet vastleggen. |
| Digitale giftcardorder | Uitsluitend giftcards: shipping €0 en geen fysieke voorraadmutatie. | Shopify digitale producten niet naar Tapstitch/Sendcloud; giftcard+fysiek alleen fysieke regels verzenden. |
| Giftcardproduct | Schema heeft vaste denominatievarianten én optioneel vrij bedrag (`allows_custom_amount`, min/max); geldigheidsduur per product. | Actuele waardes/productflags ophalen. Native giftcardvariant dekt niet automatisch vrij bedrag. Geen korting op onjuiste nominale waarde of onbeperkt door klant ingestelde prijs. |
| Giftcardbezorging | Ontvanger, afzender, boodschap, geplande datum; maximaal vijf bezorgpogingen in helper. Issue pas betaald; marker `gift_cards_issued_at`. Plaintext pending code wordt na succesvolle bezorging gewist. | Eén uitgegeven kaart per gekochte eenheid; toekomstige cadeaus niet te vroeg versturen of dubbel versturen. Oud cronwerk per gemigreerde kaart gecontroleerd uitschakelen. |
| Giftcardbetaling | Meerdere codes worden na korting/verzending gereserveerd; row locks via SQL. Reserve/commit/reverse per order, gedeeltelijk besteden mogelijk. | Eén leidend ledger, native giftcard plus gewone betaling, volledige giftcardbetaling, annulering, deelrefund en gelijktijdige tabs testen. |
| Voorraad/presale | Checkout leest regular+presale; `order-stock.ts` gebruikt regular eerst, dan presale; expliciete presaleregel alleen presalepool. Digitale regels worden overgeslagen. | Bewijs per variant: fysiek beschikbaar, gereserveerd, presale, datum, locatie, Shopify-ID. Geen Shopify-voorraad óók door oude `fulfillPaidOrder` verlagen. |

Bronbestanden: `src/app/api/checkout/route.ts`, `src/lib/quantity-discount.ts`, `src/lib/promo-code-eligibility.ts`, `src/lib/promo-staffel-eligibility.ts`, `src/lib/loyalty.ts`, `src/app/api/loyalty/redeem/route.ts`, `src/lib/reverse-loyalty-for-return.ts`, `src/lib/pickup-eligibility.ts`, `src/lib/gift-cards.ts`, `src/lib/gift-card-processing.ts`, `src/lib/order-stock.ts`, `src/lib/fulfill-paid-order.ts`, `src/app/[locale]/checkout/page.tsx`, `supabase/migrations/20260422160000_gift_cards.sql`.

## Bestaande inconsistenties die een expliciet besluit vereisen

- De gelezen checkout telt `presale_stock_quantity` bij gewone voorraad op zonder in die som `presale_enabled` te toetsen. Dat is geen vrijgavecriterium voor Shopify: actief presalebeleid en leverdatum moeten apart worden gecontroleerd.
- Loyalty-tierkorting lijkt ook giftcardregels te omvatten, terwijl promo/staffel die uitsluiten. Voorkom een kringloop van goedkoper giftcards kopen en daarna extra korting bij besteden; bevestig het bedoelde beleid.
- De inwisselroute voor punten voert afzonderlijke saldo- en transactiequeries uit. Een `.gte`-check bij een vooraf berekend nieuw saldo is geen bewijs van atomair aftrekken bij concurrerende verzoeken. Voor migratie een ledgertransactie/claim met idempotency eisen.
- Voorraadmutaties gebruiken in de gelezen helper een ordermarker na regelsgewijze updates. Een crash halverwege of parallelle verwerking kan niet op basis van die marker alleen als veilig worden beschouwd. Historische route niet hergebruiken voor nieuwe Shopify-orders; reconcile historische onvoltooide mutaties voor de snapshot.
- `OTHER` is een UI-keuze, geen geldig Shopify ISO-land. Bestaande historische adressen en werkelijk ondersteunde bestemmingen normaliseren zonder een land te raden.

## Shopify-capabilitybewijs vóór een productiebesluit

Officiële documentatie, gecontroleerd op 27 oktober 2026:

- Publieke App Store-apps met Functions kunnen op alle plannen gebruikt worden; eigen custom apps met Function APIs vereisen Plus. Dit maakt Basic niet ongeschikt, maar blokkeert een ongeteste eigen kortingsfunction als standaardoplossing. [Shopify Functions](https://shopify.dev/docs/apps/build/functions)
- App-uitbreidingen op informatie-, verzend- en betaalstappen zijn Plus-only; Basic ondersteunt onder andere web pixels en geschikte thank-you/order-status-extensies. [Checkout-apps per abonnement](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/checkout-apps)
- Deels afhalen/deels verzenden binnen één order is als feature test drive beschikbaar voor Plus/Enterprise. Op Basic geen stil beloofde mix. [Ship and pickup](https://help.shopify.com/en/manual/checkout-settings/ship-and-pickup)
- Shopify kan profieltarieven combineren; de uitgerolde shipping-options-by-market-inrichting verschilt. App-tarieven kunnen nog steeds optellen. Inspecteer de echte winkelmodus en rekenproeven. [Gecombineerde tarieven](https://help.shopify.com/en/manual/fulfillment/setup/shipping-profiles/combined-shipping-rates)
- `giftCardCreate` vereist `write_gift_cards`; eigen codes zijn 8–20 letters/cijfers. Een schema-operatie bestaan bewijst niet dat de huidige app het recht heeft. [Giftcard-API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/giftcardcreate)

Bewijsplan per capability:

1. Winkelidentiteit, echt plan, geïnstalleerde apps, app-distributietype en huidige scopes uitlezen. Alleen read-product-autorisatie is geen productieserverintegratie.
2. Persistente serverauthenticatie en minimale rechten bewijzen voor producten, voorraad, orders/fulfillment, vereiste klantgegevens, discounts en giftcards. Beschermde klantgegevens alleen op noodzaak aanvragen.
3. Kortingspariteit testen met native functies of een concreet geselecteerde publieke app in afgeschermde checkout. Prijs, API/headless-ondersteuning, combinatiegedrag en klantbinding vastleggen; niet alleen screenshots van een appbelofte.
4. Giftcard aanmaken/inwisselen/deelrefund en geplande bezorging testen met testdata of vooraf vastgelegde kleine proefbedragen; rechtenfouten blijven releaseblokkers.
5. Native pickup en geografisch beleid toetsen. Bij onmogelijke pariteit een concrete keuze aan Rick voorleggen, inclusief abonnementskosten, in plaats van de checkout stil te beperken.
6. Eigen MOSE-fulfillmentlocatie en Tapstitch-location gescheiden; een gemengde order mag geen eigen voorraadregels naar de supplier sturen. Tapstitch-appcompatibiliteit met meerdere fulfillmentgroepen en de gekozen tarieven daadwerkelijk testen.

## Veilige read-only inventarisatie voor de migratieoperator

Geen `select *` op klant-, order- of giftcardtabellen naar logs. Onderstaande SQL is een voorstel voor gerichte metingen, niet in deze review uitgevoerd. Controleer eerst het echte schema. Ruwe mappings blijven in een afgeschermde migratieopslag, niet in Git of dit document.

```sql
-- Winkelbeleid: expliciete allowlist, geen secrets.
select key, value from site_settings
where key in ('shipping_cost','free_shipping_threshold','pickup_enabled',
  'pickup_max_distance_km','pickup_location_name','pickup_location_address',
  'pickup_latitude','pickup_longitude');

-- Werkelijke staffels: aantallen zijn configuratie, niet uit het algoritme afleidbaar.
select product_id, min_quantity, discount_type, discount_value, is_active
from product_quantity_discounts order by product_id, min_quantity;

-- Catalogusbedragen en cadeaufunctionaliteit; geen klantdata.
select id, slug, base_price, sale_price, is_gift_card, allows_custom_amount,
  gift_card_min_amount, gift_card_max_amount, gift_card_default_validity_months
from products;
select id, product_id, stock_quantity, presale_stock_quantity, presale_enabled,
  is_available from product_variants;

-- Saldoverplichtingen: nooit code_hash, pending_delivery_code of ontvangers loggen.
select currency, status, count(*) as cards, sum(balance) as remaining_balance,
  count(*) filter (where scheduled_send_at is not null and delivered_at is null)
    as scheduled_unsent
from gift_cards group by currency, status;
select status, count(*) as redemptions, sum(amount) as amount
from gift_card_redemptions group by status;
select tier, count(*) as accounts, sum(points_balance) as points_balance,
  sum(lifetime_points) as lifetime_points
from loyalty_points group by tier;

-- Betaalstatussen eerst als aggregaat, daarna specifieke pending IDs privé onderzoeken.
select payment_status, count(*) as orders from orders group by payment_status;
```

Aanvullend privé exporteren: actieve promo's inclusief verbruikt gebruik en sale-scope; product-variant-SKU-maat-kleur-prijsmapping; presaledatums; pending betaalprovider-ID's; open returns/refunds; giftcardreserveringen per order; geplande cadeaus; historische loyaltytransacties. Registreer recordaantallen, totaalbedragen, snapshotmoment, bronversie en checksums zonder persoonsgegevens in het auditrapport.

## Cadeaubonmigratie: gecontroleerde route, geen kortingscodebrug

Voorkeursrichting: Shopify is na omschakeling het leidende giftcardledger. Voor reeds verzonden oude codes is bulkbehoud niet mogelijk uit alleen hashes. Twee mogelijke uitvoeringen moeten eerst met rechten, boekhouding en klantreis worden bewezen:

- Gecontroleerde vervanging: per oude kaart één nieuwe native kaart met exact resterend saldo, geldigheid en private mapping; oude kaart kan niet meer worden besteed; één bericht aan de juiste rechthebbende. Bearer cards kunnen weggegeven zijn: het oorspronkelijke koperadres is niet automatisch de huidige eigenaar.
- Eenmalige claim op MOSE: klant voert oude code in, server verifieert hash, claimt kaart/reserveringen atomair en maakt via een herstelbare saga precies één native kaart. Bij een timeout eerst mapping/resultaat herstellen, nooit blind opnieuw uitgeven. Nieuwe code veilig beschikbaar maken zonder logging. Oude code daarna alleen naar dezelfde vervanging verwijzen; nooit nieuw saldo creëren.

Geen van beide is al geïmplementeerd of goedgekeurd als definitieve klantencommunicatie. Native API-calls en een Supabase-transactie vormen samen geen gedistribueerde transactie: daarom een outbox/statusmachine met expliciete herstelstappen en een stop op legacy spending tijdens omzetting.

Legacy refunds moeten via dezelfde mapping op de actieve native kaart terechtkomen. Een eenmaal gemigreerde kaart mag niet ongemerkt opnieuw besteedbaar worden door de oude `reverse_gift_card_redemptions_for_order`. Geplande, nog niet geleverde kaarten één bezorgeigenaar geven; bestaand cron en Shopify mogen niet allebei verzenden. Bij digitale nieuwverkoop geen dubbele issue via zowel Shopify als `issueGiftCardsForOrder`.

## Omschakeldraaiboek en controles

1. Draai een dry-run met alle producttypen: MOSE-fysiek, Tapstitch, gemengd, giftcard-only, giftcard+fysiek, presale, sale, loyalty en meerdere kortingsregels. Bewijs voorraad en geld tot op orderregelniveau.
2. Leg alleen de gekozen nieuwe checkoutingang tijdelijk stil; laat bestaande status/webhook/refundverwerking operationeel. Zet nieuwe Mollie-paymentcreatie en alternatieve express/Meta-checkoutroutes expliciet uit voor nieuwe orders bij omschakeling.
3. Inventariseer alle bestaande pending betalingspogingen via de provider. Laat ze gecontroleerd afronden/vervallen of annuleer alleen als de betaalstatus dat toestaat; geen betaalde orders annuleren omdat de frontend ververst is. Onzekere betalingen blokkeren definitieve saldo-/voorraadsnapshot.
4. Reconcile open voorraadmutaties, presaleclaims en giftcardreserveringen. Verklaar iedere afwijking. Neem snapshot en migratierun-ID; laat routine-adminvoorraadwijzigingen tijdens snapshot niet ongecontroleerd doorgaan.
5. Migreer catalogus/locations/inventory, saldi en voordelen; verifieer individueel én geaggregeerd. De herhaalrun moet dezelfde Shopify-ID's hergebruiken, geen duplicaten publiceren.
6. Open één Shopify-checkout voor alle nieuwe aankopen. Bestaande orderstatuslinks blijven naar de juiste provider wijzen. Historische Mollie-webhooks mogen geen nieuwe Shopify-order maken, herbetalen of dubbel fulfillment starten.
7. Monitor de eerste betalingen, alle fulfillmentgroepen, mails, voorraad, punten en refunds. Tapstitch-import is nog geen bewijs van supplierbetaling; controleer die afzonderlijk.
8. Rollback: blokkeer nieuwe Shopify-checkouts bij een incident; betaalde Shopify-orders blijven via Shopify beheerd. Heropen Mollie niet op een oude voorraad-/saldosnapshot. Eerst delta-reconcile en één saldo-/voorraadbron bevestigen; anders onderhoudsmodus met serviceafhandeling.

Benodigde integratiepunten: `src/app/api/checkout/route.ts`, `src/app/api/create-mollie-payment/route.ts`, `src/app/api/create-payment-intent/route.ts`, `src/app/api/meta-checkout/route.ts`, `src/app/api/check-payment-status/route.ts`, `src/app/api/mollie-webhook/route.ts`, `src/app/api/stripe-webhook/route.ts`, `src/lib/fulfill-paid-order.ts`, `src/lib/order-stock.ts`, `src/lib/gift-card-processing.ts`, `src/app/api/gift-cards/cron/route.ts`, `src/app/api/returns/[id]/process-refund/route.ts`, `src/app/api/create-shipping-label/route.ts`, `src/app/api/sendcloud-webhook/route.ts`. Onderzoek per route of deze nog live wordt aangeroepen; bestandsaanwezigheid alleen is geen bewijs van actieve betaalmethode.

## Exacte bewijzen die een release vrijgeven

- Centnauwkeurige gouden manden voor alle voordelen; cadeau- en kortingscombinaties mogen geen negatieve order veroorzaken.
- Reguliere stock en presale blijven onderscheiden; laatste eenheid in twee tabs, late legacybetaling en refund/restocking getest.
- Alle kaartverplichtingen één keer aanwezig, geen vrijgegeven reserveringen dubbel besteedbaar, geen geplande cadeau-email dubbel/vervroegd.
- Eén orderbevestiging, eventueel meerdere pakketberichten, één aankoop-event en één puntenboeking. Retouren corrigeren de juiste orderregels en bronledger.
- Fulfillmentuitsluiting: MOSE-regels nooit Tapstitch, Tapstitch-regels nooit lokale labels/voorraad. Digitale regels geen fysieke shipment.
- Landen, afhalen en verzending overeen met goedgekeurd beleid; geen unsupported OTHER of valse presaleleverdatum.
- Nieuwe betalingen gebruiken Shopify; oude Mollie/Stripe-routes kunnen historische orders blijven afhandelen en produceren geen dubbele orders.

## Kosten die nog onderbouwd moeten worden

De bestaande basisprijzen zijn hierboven vastgelegd; nieuwe Tapstitch-verkoopprijzen, definitieve variantprijzen, Tapstitch-inkoop en NL/overige-landenverzending, samplekorting, samplebudget, betaalfees, eventuele publieke discount-/loyaltyapp, Shopify-abonnement en retourkosten zijn nog niet bewezen. Leg per model netto-omzet, productkosten, supplierverzending, betaalfees, retourreserve en bijdrage vóór acquisitie vast. Toon vaste platformkosten afzonderlijk. Een samplekorting is geen structurele kostprijs; twee zendingen binnen één checkout betekenen niet één logistieke kostenpost.
