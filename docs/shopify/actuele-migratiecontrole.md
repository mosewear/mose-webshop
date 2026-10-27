# MOSE — actuele migratiecontrole

Waargenomen: 27 oktober 2026 om 13:00:10 UTC / 14:00:10 Europe/Amsterdam. Alleen lezen; geen producten, instellingen, betalingen, saldi of klantrecords gewijzigd.

Deze controle gebruikt gerichte Supabase-queries, een GET op één bestaande Stripe PaymentIntent en een openbare PDOK-adrescontrole. Credentials zijn stil uit de bestaande lokale configuratie geladen en niet in uitvoer of dit document opgenomen. Er zijn geen couponcodes, klantadressen, e-mails, kaartcodes of betaalprovider-ID's gepubliceerd. Gesanitiseerde audit: `/private/tmp/mose-shopify-audit/benefits-and-pending-summary.json`.

## Wat de echte configuratie nu zegt

| Onderdeel | Waargenomen waarde | Implementatiegevolg |
|---|---|---|
| Verzendkosten | €0 | Bestaande checkout is nu gratis verzenden ingesteld; niet ongemerkt €150-drempel of een nieuw tarief introduceren. |
| Gratis-verzenddrempel | €0 | De €150 in de broncode is een fallback, niet de huidige winkelinstelling. Tapstitch-kosten moeten in de marge of een expliciet vastgesteld nieuw verzendbeleid passen. |
| Afhalen | Ingeschakeld | Behouden voor aantoonbaar lokaal beschikbare orderregels binnen het goedgekeurde beleid. |
| Afhaalradius | 50 km | Native Shopify pickup is niet automatisch dezelfde radiuscontrole. |
| Afhaallocatie | MOSE Groningen, Helper Brink 27A, 9722 EG Groningen | Gebruik de echte instelling; het oude code-defaultadres is niet leidend. |
| Radiuscoördinaten | 53.2194, 6.5665 | Deze coördinaten wijken af van het resultaat voor het ingestelde adres. Correct adres/meetpunt vóór migratie vaststellen. |
| Staffelregels | Geen actieve tiers voor de vijf catalogusproducten | Geen noodzaak om vóór eerste livegang een niet-gebruikte maatwerkstaffelfunctie te activeren. Wel achter een geteste capability houden als admin later nieuwe tiers kan aanmaken. |
| Saleprijzen | Alle vijf producten `null` | Op dit moment geen actieve product-saleprijzen om over te zetten. |
| Presale | 0 ingeschakelde varianten, 0 presalevoorraad | Geen actieve presaleverplichtingen vanuit deze variantinstellingen. Niet stil presale activeren om voorraadtekorten op te lossen. |
| Giftcards | 0 kaarten, 0 saldo, 0 geplande bezorgingen | Geen bestaande kaarthoudermigratie nodig op dit meetmoment. |
| Giftcardreserveringen | 0 records | Geen bestaande reserveringen om over te zetten op dit meetmoment. |

PDOK geeft voor het ingestelde afhaaladres `POINT(6.58186456 53.19932439)`. Bron: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free` met exacte postcode/huisnummer/huisletter-query. Er is niets gecorrigeerd; het verschil is een concrete datakwaliteitsbevinding, geen toestemming om het afhaalbeleid te veranderen.

## Catalogus en voorraad

| Product | Actief | Basisprijs | Varianten / beschikbaar-vlag | Gewone voorraad |
|---|---|---:|---:|---:|
| MOSE Essential Hoodie | Ja | €79 | 9 / 9 | 53 |
| MOSE Classic Sweater | Ja | €75 | 6 / 6 | 27 |
| MOSE Tee | Ja | €50 | 12 / 12 | 39 |
| MOSE Automatisch Horloge | Nee | €150 | 2 / 2 | 30 |
| MOSE Giftcard | Nee | €20 | 0 / 0 | 0 |

De drie actieve fysieke producten bevatten samen 27 varianten en 119 stuks gewone voorraad. `is_available=true` is een administratieve vlag; dit bewijst niet dat elke individuele maat op voorraad is. Per-variant hoeveelheden blijven de migratiebron. Niet de producttotalen verdelen of voorraad verzinnen. Het inactieve horloge bevat 30 stuks, maar krijgt door migratie geen verkooppublicatie.

De inactieve giftcard heeft `allows_custom_amount=true`, minimum €20, maximum €1.000 en een ingestelde geldigheid van 12 maanden. Dit is configuratie-inventarisatie, geen beoordeling van de voorwaarden. De toekomstige giftcardfunctionaliteit blijft uit totdat vrij bedrag, uitgifte, verzending, gedeeltelijk besteden, refunds en het goedgekeurde voorwaardenbeleid bewezen zijn. Nul bestaande kaarten maakt bouwen van een complexe legacy-codewissel nu onnodig; controleer de telling opnieuw vlak vóór omschakeling.

## Werkelijke voordelen die wél moeten blijven werken

**Loyalty:** 54 accounts: 53 Bronze en 1 Silver; geen Gold in deze snapshot. Totaal puntsaldo 6.104, totaal lifetime points eveneens 6.104. Dit is een klantverplichting, geen checkoutconfiguratie die weg mag vallen. De Silver-tier moet geauthenticeerd 5% volgens het vastgestelde beleid behouden. Nieuwe orders moeten eenmalig punten toevoegen en refunds eenmalig corrigeren. De nul Gold-accounts maken de 10%-Goldregel niet overbodig: bestaande klanten kunnen die grens later bereiken.

**Promocodes:** 18.797 records totaal. Na filtering op actief, niet verlopen en resterende gebruikslimiet zijn 22 codes op dit meetmoment potentieel bruikbaar. Alle 22 zijn procentuele kortingen; 5 zijn ingesteld om ook saleartikelen mee te nemen. Dit is geen bewijs dat alle 22 voor elke mand of klant geldig zijn: minimumbedrag, product-scope en eventueel klant-/subscriberbinding moeten tijdens de gerichte migratie worden meegenomen. Couponwaarden/codes en klantkoppelingen staan niet in dit rapport.

Migratieaanpak: uitsluitend relevante codes en hun resterende rechten/gebruik overzetten; niet blind alle 18.797 records activeren. Native Shopify kortingscodes eerst toetsen aan de echte 22 definities. Een publieke korting-/loyaltyapp is pas nodig als concrete regels niet native afdwingbaar zijn. Geen custom Shopify Function op Basic als onbewezen afhankelijkheid introduceren.

## De 11 pending orders: concreet onderzocht

| Uitkomst | Aantal | Betekenis |
|---|---:|---|
| Geen `mollie_payment_id` en geen `stripe_payment_intent_id` | 10 | Geen providerbetaling uit die twee velden te verifiëren. Geen bewijs van betaalbare checkout of ontvangen geld. |
| Stripe PaymentIntent aanwezig | 1 | Read-only bij Stripe opgehaald: `requires_payment_method`. Niet geslaagd/betaald volgens die status. |
| Mollie Payment-ID aanwezig | 0 | Er was voor deze selectie geen gekoppelde Molliebetaling op te vragen. Geen Mollie-mutatie of API-call uitgevoerd. |
| Voorraad reeds afgeboekt (`stock_decremented_at`) | 0 | Deze pending records hebben die afboekmarker niet. Dit vervangt geen algemene voorraadreconciliatie. |

De 11 databasebedragen tellen op tot €1.224,96; dit is **geen openstaande omzet of ontvangen betaling**. De oudste aanmaakdatum is 3 februari 2026, de nieuwste 21 oktober 2026. Exacte klant-/order-/betaal-ID's zijn niet in deze rapportage opgenomen.

Afhandeling vóór omschakeling:

1. Laat de tien records zonder providerreferentie privé classificeren op eventuele alternatieve betaalmetadata, historische flows en operationele afspraken. Verwijder of annuleer ze niet op basis van `pending` alleen.
2. De Stripe-intent met `requires_payment_method` is nu niet betaald. Leg voor de omschakeling vast of een oude betaalpagina nog deze intent kan bevestigen; zo nodig gecontroleerd afsluiten via de bestaande providerroute. In deze audit is niets geannuleerd.
3. Schakel nieuwe legacy-paymentcreatie bij omschakeling uit, inclusief express/Meta-routes. Houd status-, refund- en webhookverwerking voor historische betalingen beschikbaar.
4. Verifieer vlak vóór de definitieve voorraad-/saldosnapshot opnieuw: geen onbekend betaalresultaat, geen intussen betaalde legacyorder die onterecht genegeerd wordt.

## Concrete resterende blokkades

1. **Tapstitch:** werkelijke gepubliceerde producten, suppliermapping, prijzen, verzendkosten en automatische order-/betaalroute bewijzen. Deze read-only MOSE-audit testte Tapstitch niet.
2. **Shopify-voordelen:** 22 actuele kortingsdefinities plus bestaande loyaltyrechten toetsen, met server-side klantidentiteit en exacte centbedragen. Nul staffels en nul giftcards verkleinen de directe migratiescope wezenlijk.
3. **Gratis verzending en afhalen:** bestaande €0-beleid behouden of een concrete wijziging laten besluiten; correcte afhaalcoördinaten vaststellen. Shopify Basic-capabilities verifiëren voordat een radius- of mixed-pickupbelofte wordt gedaan.
4. **Legacy betaling:** tien records zonder referentie classificeren en het resterende Stripe-betaalpad gecontroleerd in het omschakeldraaiboek opnemen. Er is geen aangetoonde lijst van elf nog open Molliebetalingen.
5. **Voorraad en publicatie:** de 27 actieve fysieke varianten exact overzetten; inactieve producten inactief houden; late betalingen en retouren mogen geen dubbele afboekingen veroorzaken.
6. **Landen en tarieven:** de huidige UI-keuzes en werkelijke actieve bestemmingen nog reconciliëren. Deze audit heeft geen landenverkoop of belasting-/verzendconfiguratie per land bewezen.

## Verificatiegrenzen

De audit heeft uitsluitend de genoemde gegevens gelezen. Geen recente nulmeting is een blijvende garantie: voorraad, promo-expiry, loyalty en betaalstatus kunnen veranderen. De providercontrole had slechts één Stripe-object en geen Mollie-objecten in scope; zij bewijst niet dat alle historische betaalprocessen correct zijn. Kosten, samplekorting, Shopify app-rechten, productieauthenticatie, payout/accountstatus en leverbaarheid zijn niet in deze controle vastgesteld.
