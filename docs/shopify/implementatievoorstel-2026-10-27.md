# MOSE — één Shopify-checkout voor de volledige collectie

Datum: 27 oktober 2026 · Revisie 2 · Status: GO voor implementatie na onafhankelijke AI-directiereview. Productievrijgave vereist het bewijspakket.

## Besluit in één minuut

Behoud de bestaande MOSE-webshop, inclusief productpagina’s, beelden en winkelmand. Laat **alle verkoopbare producten samen via één Shopify-checkout** afrekenen. Shopify wordt de bron voor nieuwe orders, betalingen, verkoopprijzen en verkoopbare voorraad. De eigen MOSE-voorraad gaat via de eigen locatie en het bestaande verzendproces; alleen gekoppelde Tapstitch-orderregels gaan via Tapstitch. Eén betaling kan meerdere pakketten opleveren.

Dit voorstel vervangt het eerdere plan met twee checkouts. Historische Mollie-orders blijven beschikbaar voor levering, service en refunds; ze worden niet opnieuw verkocht of als nieuwe omzet geïmporteerd.

Rick heeft op 27 oktober toestemming gegeven voor implementatie en productie na een positieve directiereview. Deze review is een onafhankelijke AI-beoordeling vanuit het perspectief van de directie van een grote herenmodewebshop. Er is geen echte externe CEO betrokken en er wordt geen externe certificering geclaimd. Toestemming voor productie wordt gebruikt zodra de onderstaande vrijgavecriteria aantoonbaar zijn gehaald. Ontbrekende supplierprijzen, samples en accountrechten worden niet vervangen door aannames.

## 1. Feiten en nog te bewijzen onderdelen

| Onderdeel | Vastgesteld | Nog te bewijzen |
|---|---|---|
| Shopify | Connector leest MOSE-winkel; Basic, EUR; permanente API-winkel hp5szr-te.myshopify.com | Productie-apprechten, betaalmethoden, leverprofielen en definitieve catalogus |
| Tapstitch | Rick heeft de officiële app gekoppeld; acht modellen gekozen; onbedrukt | Werkelijke instellingen, variantkoppelingen, kosten, supplierbetaling en aflevering |
| Code | Geïsoleerde branch feat/shopify-tapstitch-pilot met checkout-, mapping- en webhookbasis | Volledige migratiearchitectuur, verwerking, frontend, fulfillment, productieconfiguratie |
| Tests | Negen helpertests opnieuw geslaagd tijdens deze review | Route-, database-, browser-, betaal- en fulfillmenttests |
| Beelden | 13 hoofdbeelden in galerij; metadata voor 40 aanvullende gegenereerde beelden | Resterende 12 aanvullende beelden, verpakking in galerij, productcontrole en samples |
| Huidige webshop | Bestaande custom checkout met voorraad, cadeaukaarten, staffels, loyalty en verzending | Volledige functie-inventaris en pariteit op Shopify |

De bestaande Shopify-code is een startpunt voor de eerdere beperkte pilot, geen bijna afgeronde migratie. De achtmodellen-allowlist moet worden vervangen door een gecontroleerde catalogusmapping voor alle producten. Bestaande orders mogen niet door nieuwe checkoutcode worden gereconstrueerd.

## 2. Klantreis en exacte MOSE-vormgeving

**Productpagina:** bestaande componenten, routenamen en SEO behouden. Prijs, geselecteerde variant, maatadvies, retourinformatie en productgebonden levertermijn staan vóór de koopknop. Geen tweede adresformulier vóór Shopify.

**Winkelmandlade:** één lijst, één prijsberekening en één primaire knop ‘Veilig afrekenen’. Bij verschillende leverstromen: ‘Je rekent één keer af. Je bestelling kan in meerdere pakketten aankomen.’ Geen leveranciersnamen of technische routes als keuze voor de klant.

**Winkelmandpagina:** één bestelling. Levergroepen mogen duidelijk maken welke artikelen samen komen, maar krijgen geen aparte betaling. Verzendkosten die nog niet bekend zijn, worden als nog te berekenen aangeduid. Het definitieve bedrag staat vóór betaling in Shopify.

**Checkout en orderstatus:** herkenbare MOSE-branding, één Shopify-orderbevestiging en tracking per zending. Bij vertraagde betaalbevestiging geen tweede betaaloproep. Alleen serverbevestigde betaalde aantallen verdwijnen uit de juiste mandversie; latere toevoegingen blijven behouden.

| Stijlelement | Implementatieafspraak |
|---|---|
| Typografie webshop | Anton voor koppen; Montserrat voor body en bediening |
| Palet | Wit, bijna zwart #171717, MOSE-groen #00A676, hover #008f66, lichtgroen #e6f6ef |
| Componenten | Bestaande Button, productkaart, galerij, maatselectie en drawer hergebruiken |
| Vorm | Rechte funnelknoppen/kaders; bestaande afstandsschaal en hiërarchie |
| Mobiel | Minimaal 44×44 px tapdoelen; focus, safe area en cookiebannerhoogte respecteren |
| Shopify | Logo, kleuren en best passende beschikbare fonts; geen belofte van vrije CSS of identieke layout |

Basic ondersteunt standaardbranding; geavanceerde checkoutuitbreidingen en Branding API zijn Plus-functionaliteit. Geen abonnementsupgrade alleen om cosmetische gelijkheid te suggereren. De oorspronkelijke galerie met Arial en roomwit is een reviewomgeving en niet de webshopstijlgids. [Shopify checkoutmogelijkheden](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations)

Witte kleine tekst op huidig merkgroen heeft onvoldoende contrast voor 4,5:1. Voor de checkoutacties kiezen we een geteste donkerdere groene action-kleur of donkere tekst; merkgroen blijft het accent. De keuze wordt in mobiele en desktopvoorbeelden beoordeeld, zonder ongevraagde algemene redesign.

**Claims zijn productdata.** Nieuwe blanks erven geen ‘Made in Groningen’, lokale productie, voorraadschaarste, reviews of activiteiten van bestaande producten. Controleer ook FAQ, banners, metadata en structured data. MOSE mag als Gronings merk worden gepresenteerd; dat bewijst geen Groningse productielocatie.

## 3. Catalogus en beelden

Alle huidige verkoopbare producten, varianten, cadeaukaartproducten en eventuele preorderstromen worden eerst geïnventariseerd. Bestaande product-ID’s en URL’s blijven stabiel in MOSE; iedere verkoopvariant krijgt een expliciete Shopify-ID. Geen koppeling alleen op titel.

De nieuwe collectie omvat de volgende voorgestelde 63 varianten, onder voorbehoud van actuele supplierbeschikbaarheid:

| Model | Uitvoeringen | Maten | Aantal |
|---|---|---|---:|
| RW0041-P001-V3 hoodie | Coffee, Black, Dark Green | S–2XL | 15 |
| RT0028-C001-V2 raglan | White with Black, White with Coffee | S–XL | 8 |
| MB0001-C001-V2 broek | Black, Gray Green, Coffee | S–2XL | 15 |
| MB0057-C001-V2 camo | Brown Tree Camo | S–2XL | 5 |
| UB0083-C001-V2 jeans | Jeans Blue | S–2XL | 5 |
| MB0030-C001-V2 jeans | Jeans Blue; werkelijke wassing leidend | S–2XL | 5 |
| MB0010-C001-V2 jeans | Light Blue | S–2XL | 5 |
| UB0018-C001-V2 jeans | Blue | S–2XL | 5 |

Deze acht modellen blijven onbedrukt. Geen fictieve MOSE-labels in beelden. Per kleuruitvoering vijf beelden: voor, achter, driekwart, detail en lifestyle; totaal 65. Groningse straat-, baksteen- en graffitisfeer blijft passend bij de bestaande collectie, met stoere maar productleesbare poses. Exacte kledingconstructie is belangrijker dan een geslaagd decor. Onjuiste naden, zakken, wassing, ritsen of proporties blokkeren publicatie van het beeld. Echte supplierbeelden en samplefoto’s zijn het controlemateriaal. Geen verzonnen lengte of gedragen maat van een AI-model.

Desktop gebruikt nu een vierkante crop en mobiel 4:5. Broeken moeten op beide de taille en pijpen laten zien. Per product een gecontroleerde crop/positionering toepassen waar nodig. Samplegoedkeuring wordt per model/uitvoering met bewijs geregistreerd; dit is geen bewering dat alle maten fysiek getest zijn.

## 4. Eén commerciële bron, twee logistieke routes

| Gegeven/proces | Leidende bron na omschakeling |
|---|---|
| Presentatie, productverhaal, URL, bestaande frontend | MOSE |
| Nieuwe cart, verkoopprijs, kortingen, belasting, betaling, order | Shopify |
| Beschikbare eigen voorraad | Shopify, eigen MOSE-locatie; Supabase als projectie |
| Tapstitch-verkoopvarianten en toegewezen fulfillment | Officiële koppeling in Shopify; supplierkoppeling afzonderlijk bewezen |
| Interne supplierindiening en supplierbetaling | Tapstitch; onbekend blijft onbekend |
| Eigen pakket en label | MOSE-adapter naar bestaand Sendcloud-proces, alleen eigen orderregels |
| Nieuwe cadeaukaartsaldi | Voorgesteld Shopify, pas na aantoonbaar sluitende migratie |
| Puntenadministratie | Bestaand MOSE-loyaltyledger, idempotent gevoed vanuit Shopify-orders/refunds |
| Historische betaling/refund | Oorspronkelijke Mollie-order en betaalprovider |
| Adminweergave | MOSE-projectie met bron, tijdstip laatste synchronisatie en herstelstatus |

Shopify Fulfillment Orders bepalen welke regels en aantallen naar welke locatie gaan. De eigen adapter verwerkt alleen merchant-managed MOSE-regels; Tapstitch verwerkt de aan zijn service toegewezen regels. Geen volledige order tweemaal naar beide partijen sturen. Bij ontbrekende of onverwachte toewijzing wordt afhandeling geblokkeerd en een uitzondering zichtbaar gemaakt. [Shopify fulfillmentmodel](https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps)

De eigen Sendcloud-adapter wordt eigenaar van labels voor MOSE-regels. Niet daarnaast ongefilterd nog een tweede Shopify–Sendcloud-import activeren. Iedere labelaanvraag krijgt een unieke fulfillment-/pakketidentiteit; een timeout wordt vergeleken met de bestaande aanvraag voordat opnieuw een label wordt gekocht. Tracking schrijft alleen de betreffende regels terug naar Shopify. Een gedeeltelijke zending maakt niet de gehele order ‘verzonden’.

## 5. Checkout, orderverwerking en herstel

1. Server valideert de volledige mand tegen gecontroleerde mappings en actuele Shopify-variantdata; geen vertrouwde browserprijzen, negatieve aantallen of niet-vrijgegeven producten.
2. Een checkoutpoging bevat mandversie, regelsnapshot en Shopify-cartreferentie. Dubbelklikken en retries hergebruiken een bekende poging. Onzekere resultaten worden vergeleken voordat een nieuwe betaalroute ontstaat.
3. Storefront Cart API levert checkoutUrl; de server accepteert uitsluitend geverifieerde checkoutdomeinen. Geen gevoelige tokenwaarden of cartkeys in publieke logs. [Shopify Cart API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
4. Betaalbewijs komt uit Shopify, nooit uit alleen een browserredirect. Bevestiging, nulbetaling met cadeaukaart, gedeeltelijke betaling en mislukte betaling krijgen expliciete states.
5. Webhooks worden op ruwe body gecontroleerd, duurzaam opgeslagen en daarna door een worker verwerkt. Unieke leverings-ID’s, idempotente bijeffecten en gecontroleerde leases beschermen tegen dubbele of vertraagde verwerking. [Shopify webhookverificatie](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
6. Worker haalt actuele gezaghebbende orders op; genormaliseerde regels, bedragen, refunds en fulfillments ondersteunen adminacties. Een snapshot alleen volstaat niet.
7. Periodieke reconciliatie herstelt gemiste meldingen met pagination, overlappend tijdvenster en duurzame cursor. Rate limits en fouten leiden tot retries en zichtbare achterstand.
8. Product-/voorraadwijzigingen verversen de catalogusprojectie. Een verouderde projectie geeft geen toestemming om een uitverkocht artikel alsnog te verkopen.
9. Account- en gaststatuslinks vereisen bewezen eigenaarschap; een ordernummer of onbevestigd e-mailadres is geen toegangsbewijs. Bestaande MOSE-accounts blijven behouden; geen stilzwijgende wachtwoordmigratie.
10. Nieuwe Shopify-orders doorlopen niet de monolithische bestaande fulfillPaidOrder-functie. Voorraad, punten, mails, labels en analytics worden als afzonderlijke gecontroleerde acties aangesloten.

Apprechten, protected-customer-data-toegang, privésleutels, secretrotatie, RLS en minimale bewaartermijnen worden in de implementatie bewezen. De huidige CLI-leestoegang is geen productie-appcredential. Webhookpayloads en logs worden geminimaliseerd; toegang uitsluitend voor bevoegde processen.

## 6. Bestaande voordelen behouden

Voor omschakeling maken we een vaste set bestaande winkelmanden met verwachte centbedragen en uitkomsten. Shopify moet die reproduceren. Een niet-uitvoerbare regel leidt tot een concreet voorstel met kosten en effect, niet tot stil verlies van een voordeel.

| Functie | Vereiste migratie |
|---|---|
| Staffelkorting per product | Dezelfde hoeveelheidsgrenzen en combineerregels, één berekening |
| Promocodes | Geldigheid, minimum, uitsluitingen, gebruikslimiet en stapeling behouden |
| Loyalty | Bestaande punten/tier behouden; veilige identiteit; eenmaal verdienen/inwisselen; correcte refund |
| Cadeaukaarten | Eén actief saldo; kaart-voor-kaart vergelijking; oude reserveringen en refunds afhandelen |
| Gratis verzending | Werkelijke orderbrede tarieven na korting getest op elke logistieke combinatie |
| Afhalen | Voorstel op Basic: alleen bij volledig afhaalbare eigen fysieke voorraad; gemengde Tapstitch-orders verzenden |
| Preorders/digitale producten | Eigen verwachtingen en afhandeling; geen fictieve supplier- of fysieke voorraad |

Cadeaukaarten worden niet als gewone kortingscodes nagebouwd. Eerst toetsen of bestaande codes en rechten een ondersteunde Shopify-migratie toelaten. Zo nodig een gecontroleerd vervangingsplan, met hetzelfde resterende tegoed en één klantcommunicatie. Niet twee levende saldi naast elkaar. Historische refunds moeten naar de actuele saldo-administratie worden geboekt en niet óók het oude saldo verhogen.

Basic biedt niet zonder meer gedeeltelijk afhalen en gedeeltelijk bezorgen binnen één order. Bovenstaande afhaalregel is een expliciet voorstel voor de nieuwe collectie; bestaande volledig afhaalbare manden moeten blijven werken. Geen product fictief op de eigen locatie zetten om deze beperking te omzeilen. [Shopify afhalen en bezorgen in één order](https://help.shopify.com/en/manual/checkout-settings/ship-and-pickup)

## 7. Verzending, prijs en retouren

Bestaande verkooplanden en servicebeloften inventariseren en behouden waar de nieuwe route equivalent werkt. Tapstitch start als voorstel met Nederland/EUR. Voor niet-ondersteunde adressen zijn die regels duidelijk niet bestelbaar; bestaande producten worden niet stil tot Nederland beperkt.

Inspecteer of de winkel shipping profiles of de nieuwere shipping options by market gebruikt. Combinatieregels verschillen. Test eigen voorraad, Tapstitch, gemengd, meerdere jeans, kortingen en gratis-verzenddrempels. Eén betaling betekent niet automatisch één pakket of één laag verzendtarief. [Shopify gecombineerde tarieven](https://help.shopify.com/en/manual/fulfillment/setup/shipping-profiles/combined-shipping-rates), [shipping options by market](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options)

Verkoopprijzen worden per model voorgesteld na echte product- en verzendquotes. Besliskaart: prijs inclusief belasting; omzet exclusief belasting en na korting; productkosten, supplierverzending, betaal-/appkosten, niet-terugvorderbare kosten, valuta en retour-/defectreserve; bijdrage vóór advertenties; maximaal betaalbare acquisitiekosten. Vaste maandkosten staan apart. Voorstelprijs wordt getoetst aan losse én gemengde orders en een tegenvallend retour-/verzendscenario. Bijdrage is geen nettowinst en een samplekorting is geen structurele kostprijs.

Samplebudget: minimaal één fysiek exemplaar per acht modellen, plus risicogestuurde kleur-/maattests. Eerst een concrete offerte inclusief transport en toepasselijke kosten; de opgeslagen samplecode privé toepassen en het werkelijke effect controleren. Geen onbeperkte supplierbetalingen aanzetten zonder de wachtrij en kosten te kennen.

MOSE blijft verantwoordelijk voor klantservice en de bestaande 30-dagenretourbelofte als uitgangspunt. Een eigen retouradres en procedure zijn noodzakelijk. Tapstitch noemt inmiddels een aanvraagtermijn van 180 dagen met voorwaarden en voorafgaande toestemming; samples zijn in beginsel uitgesloten behalve bij fabricage-/fulfillmentfouten. Dat is geen automatisch MOSE-retourbeleid en bewijst niet dat iedere blank-ruil geweigerd wordt. [Tapstitch retourbeleid](https://www.tapstitch.com/help-center/faq/detail/Returns-Policy)

## 8. Tapstitch-bediening en noodstop

Eerste ketentest op Manual Submission. Controleer echte variantverbinding, import, supplierbetaling, juiste orderregels, tracking en aflevering. Daarna één begrensde automatische proef en pas vervolgens de gekozen automatische strategie.

De actuele Tapstitch-documentatie maakt import en indiening afzonderlijk. De uurcyclus is geen gegarandeerd persoonlijk annuleringsvenster van zestig minuten. Strategieaanpassingen gelden voor nieuwe orders; bestaande en On Hold-orders moeten afzonderlijk worden nagekeken. De noodstop omvat dus ook alle al wachtende orders, supplierbetalingen en reeds gestarte afhandeling. [Tapstitch automatische indiening](https://www.tapstitch.com/help-center/faq/detail/How-to-set-up-Auto-Order-Submission)

Een Shopify-refund annuleert niet bewezen de supplierproductie. Admin toont betaling, fulfillment en suppliercontrole als verschillende gegevens. Interne supplierstatus zonder ondersteunde terugkoppeling wordt niet verzonnen; geef een controleactie en tijdstip van laatste bevestiging.

## 9. Gecontroleerde omschakeling van Mollie naar Shopify

1. **Repetitie:** migratie op afgeschermde omgeving met exportmanifest, versies, checksums en kaart-/variantvergelijking. Geen productiepatch vanuit de vuile werkmap; geselecteerde wijzigingen op aparte branch en gecontroleerde basis.
2. **Voorbereiding:** alle producten en rechten gekoppeld; voorraadlocaties, cadeaukaartmigratie en voordeelpariteit getest; daadwerkelijke betaalmethoden inclusief Nederlandse voorkeuren bewezen.
3. **Korte cutover:** nieuwe oude-checkoutcreatie tijdelijk sluiten. Lopende Mollie-orders, reserveringen, cadeaubonclaims en betaalpogingen inventariseren. Geen onzekere betaling als mislukt aannemen.
4. **Open betalingen afhandelen:** veilig laten aflopen/cancelbaar afsluiten of in een expliciete overgangsadministratie reserveren. De gekozen route moet in de repetitie zijn bewezen. Geen dezelfde laatste voorraad aan twee checkouts verkopen.
5. **Definitieve telling:** Shopify-voorraad starten met fysieke verkoopbare voorraad minus reeds gecommitteerde/reserveerde eenheden; geen tweede aftrek voor historische orders. Cadeaukaartsaldi per kaart én totaal gelijk. Overgangsledger voor late Mollie-events.
6. **Eén schrijver:** nieuwe eigen voorraadwijzigingen via Shopify; Supabase toont projectie. Bestaande admin-voorraadknoppen worden omgeleid, niet als tweede onafhankelijke schrijver behouden.
7. **Activering:** alle nieuwe winkelmanden naar Shopify; oude links krijgen gecontroleerde afhandeling, geen nieuwe Mollie-order. Historische webhooks, service, refunds en toegestane oude betalingen blijven verwerkt.
8. **Controle:** echte Shopify-order, eigen fulfillment, gemengde order, saldo, tracking en rapportage vergelijken. Geen publiek verkooppunt open met ontbrekende verwerking.

Rollback is geen blind terugzetten van een Vercel-build. Eerst nieuwe verkoop stoppen, actieve Shopify-checkouts en late betalingen vergelijken, vervolgens voorraad en tegoeden reconciliëren. Mollie pas heropenen als het overdrachtsledger klopt. Bestaande Shopify-orders en supplieropdrachten blijven afhandelbaar. Alleen de knop verbergen blokkeert niet bewezen reeds geopende checkoutlinks.

## 10. E-mails, meting en beheer

Shopify is eigenaar van nieuwe order-, refund- en verzendbevestigingen; elk verzendbericht bevat de relevante regels. De oude Postmark-/Sendcloud-route stuurt voor deze orders geen tweede orderbevestiging. Historische orders houden hun oorspronkelijke communicatieroute.

Meet productweergave → toevoegen → checkoutstart → betaalde order → levering. Eén stabiele Shopify-order/event-ID voorkomt dubbele purchase-registratie. Refunds corrigeren omzet; test domeinovergang, consent en browser/serverdeduplicatie. Marketingtoestemming wordt niet uit een aankoop afgeleid. Geen nieuwe marketingcampagne als onderdeel van deze opdracht.

MOSE-admin toont nieuwe en historische orders met juiste betaalbron; per regel fulfillmentpartij, status, tracking en refund. Een mislukt of niet gesynchroniseerd gegeven wordt onbekend/fout, geen nul of succes. Adminmutaties route-specifiek; een oude Mollie-refundactie mag geen Shopify-order raken.

Voorgestelde operatie: reconciliatie iedere vijf minuten, waarschuwing bij meer dan vijftien minuten achterstand, zichtbare herstelwachtrij met veilige replay. Rick is voorlopig operationeel eigenaar; bereikbaarheid en ontvangst van meldingen moeten bij vrijgave bewezen zijn. Geen fictieve 24/7-bezetting. Tijdens introductie dagelijkse order-/voorraad-/tegoedcontrole en tweemaal per werkdag suppliercontrole zolang daarvoor geen ondersteunde technische terugkoppeling bestaat.

## 11. Werkpakketten en bewijs

| Fase | Resultaat | Exitcriterium |
|---|---|---|
| A — inventaris & ontwerp | Volledige catalogus, voordelenmatrix, echte app-/betaalrechten, vier schermontwerpen | Geen onbekende kritieke checkoutfunctie; kosten-/abonnementskeuzes expliciet |
| B — fundament | Mapping, nieuwe ordermodellen, checkoutpogingen, worker, reconciliatie, adapters | Migraties en foutenherstel getest; minimale toegangsrechten bewezen |
| C — klantreis | Bestaande MOSE-PDP/cart op één Shopify-cart; branding en status | Visuele en functionele tests, juiste claims, alle varianten kloppen |
| D — migratie | Voorraad-, saldi-, kortingen- en accountkoppeling; historische compatibiliteit | Repetitie zonder financiële of voorraadafwijking |
| E — echte keten | Eigen levering, acht samples, gemengde order, supplierbetaling, refund | Betaling tot fysieke aflevering en herstel aantoonbaar geslaagd |
| F — productie | Gecontroleerde cutover met monitoring en terugvalplan | Alle onderstaande blokkerende tests groen; toestemming reeds gegeven |

Doorlooptijd wordt bepaald door rechten, beschikbare functies en fysieke samples. Bouw en samplevoorbereiding kunnen parallel; een vaste opleverdatum zonder die gegevens zou schijnzekerheid zijn. Het is een volledige commerce-migratie, geen wijziging van alleen een afrekenknop.

## 12. Vrijgavechecklist — geen open kritieke afwijkingen

| Scenario | Vereist resultaat |
|---|---|
| Alle huidige + alle vrijgegeven nieuwe varianten | Unieke mapping, juiste prijs/kleur/maat/afbeelding/locatie |
| Gemengde mand | Eén betaling, één Shopify-order, juiste regels bij beide partijen |
| Laatste voorraad, parallelle checkouts | Geen dubbele verkoop of tweede voorraadaftrek |
| Cadeaukaart volledig/deels, nulbetaling, refund | Eén correct saldo, geen dubbele besteding of teruggave |
| Staffels, kortingscodes, tiers, punten | Gouden voorbeelden tot op de cent correct |
| Dubbelklik, time-out, back, refresh, twee tabs | Herstelbare poging, mand niet onterecht leeggemaakt |
| Webhooks dubbel, verkeerd geordend, ontbrekend | Eén correcte projectie en één set bijeffecten |
| Database/API uitval, workercrash, rate limit | Retry, waarschuwing en gecontroleerd herstel |
| Sendcloud-timeout, gedeeltelijke zending | Geen dubbel label; alleen juiste regels verzonden |
| Tapstitch onbeschikbaar of betaling mislukt | Zichtbare uitzondering, geen valse productiestatus |
| Historische Mollie-refund/late betaling | Correcte oude financiële route en overgangsledger |
| Deelrefund/annulering/restock | Correct bedrag en juiste locatie, supplierapart gecontroleerd |
| Onbevoegd account/gastlink | Geen inzage of wijziging van andermans bestelling |
| Noodstop met geopende checkout | Effect bewezen; late betalingen blijven afgehandeld |
| Fysieke samples | Minimaal acht modellen ontvangen en gecontroleerd |
| Bevestigingen en analytics | Eén orderbevestiging en één aankoopregistratie |
| Mobiele vormgeving | 360/390/768/1440 px, iOS Safari/Android Chrome/desktop, toetsenbord en 200% zoom |
| Prestaties | Op afgesproken product-/cartscenario’s geen materiële regressie; LCP/CLS/INP vóór en na vergelijken |

Gebruikerstest: twee personen kunnen op mobiel zonder uitleg een bestaande hoodie en nieuwe broek samen kiezen, één keer betalen, het totaal begrijpen en aangeven welke leveringen volgen. Eventuele onduidelijkheid leidt tot aanpassing vóór vrijgave.

## 13. Reviewbewijs en directiebesluit

Specialistische AI-reviews: techniek/architectuur, design/UX en commercie/operatie. Zij hebben de huidige broncode en relevante actuele platformdocumentatie beoordeeld. De scope is daarna herzien naar alle producten en één checkout.

Concrete codebevindingen: src/store/cart.ts heeft een algemene clearCart en providerloze regels; de bestaande checkout bevat cadeaukaartreserveringen en orderherstel; src/lib/fulfill-paid-order.ts combineert voorraad, punten, e-mail en analytics. Deze onderdelen krijgen expliciete migratie-/regressietests. ProductPageClient.tsx en rootmetadata bevatten productieclaims die productgebonden moeten worden.

Onafhankelijke directiereview afgerond door een afzonderlijke reviewer: **GO voor uitvoering; publieke omschakeling pas na bewezen vrijgavecriteria.** Dit is geen oordeel van een echte externe CEO. De reviewer vindt geen fundamentele herziening nodig en stelt drie aanvullingen:

1. Bewijs Basic-ondersteuning van staffels, loyaliteit, cadeaukaarten en afhalen vroeg in fase A, met exacte app-/integratiekosten. Onafhankelijke fundamentbouw kan parallel doorgaan.
2. Vul vóór verkoop echte prijzen, retourreserve, minimale bijdrage en een maximaal sample-/appbudget in. Geen verlieslatend artikel publiceren om de collectie compleet te laten lijken.
3. Eén vrijgaverapport vergelijkt vóór/na voorraad per variant, saldo per kaart, reserveringen, open betalingen en achterstallige events. Het benoemt uitvoerder en meldingsontvanger, plus bewijs van rollback met laat betaalde orders. Geen onverklaarde afwijkingen.

Rick heeft uitvoering en productie na dit positieve oordeel toegestaan. De bovenstaande bewijsvoorwaarden blijven gelden; dat is geen nieuwe generieke toestemmingsvraag.

## 14. Actuele inventaris na directiereview

Read-only momentopname 27 oktober 2026, 13:50 Amsterdam: Shopify-catalogus leeg. MOSE heeft drie actieve fysieke producten: Essential Hoodie (€79, 9 varianten), Classic Sweater (€75, 6 varianten), Tee (€50, 12 varianten). Horloge en cadeaukaartproduct zijn inactief en worden niet automatisch geactiveerd. De gift_cards-tabel bevat op dit moment geen uitgegeven kaarten of saldo; bestaande cadeaukaartfunctionaliteit blijft relevant voor toekomstige heractivering. Voor cutover opnieuw meten, niet vertrouwen op deze momentopname.

Elf orders staan administratief op pending/pending. Dit is geen bewijs dat de betaalprovider ze nog open heeft staan. Verificatie bij de provider en controle van reserveringen zijn nodig voordat verkoopvoorraad wordt overgedragen.

Technische beperking: de browsercontrol inventaris biedt momenteel geen browser of tab. Ricks toestemming is aanwezig, maar maakt een ingelogde Tapstitch-browser niet technisch beschikbaar. Shopify is wel via connector bereikbaar. Tapstitch-instellingen en fysieke samples blijven daarom afzonderlijk te bewijzen.


## 15. Uitvoeringsstatus na de inventaris

Het fundament is gebouwd en onafhankelijk beoordeeld. Drie bestaande producten met 27 varianten staan inmiddels als concept in Shopify; 65 conceptbeelden zijn lokaal beschikbaar. De volledige test-suite en productiebuild slagen. Dit is nog geen productie-vrijgave: zie [implementatiestatus en resterend werk](implementatiestatus-2026-10-27.md). De lege catalogus in §14 is de eerdere momentopname, niet de huidige stand.
