# MOSE — implementatiestatus en vrijgavebewijs

27 oktober 2026. Besluit: fundament gereed voor een concept-PR, **geen productie-vrijgave**. Rick heeft uitvoering en productie na een positieve onafhankelijke review toegestaan. De positieve AI-directiereview van het voorstel is geen verklaring dat de gebouwde keten al verkoopklaar is. Er is geen echte externe CEO betrokken.

## Gebouwd en gecontroleerd

- Eén Shopify-cart voor de volledige MOSE-mand, gekoppeld via lokale variant-ID’s. Server bepaalt prijzen en Shopify-varianten; geen door de browser aangeleverde prijzen.
- Bevestigde checkout-sessie vóór cartcreatie; duurzame pogingen, dubbele-klikbescherming, behoud van mand, controle op wijzigingen in andere tabs en expliciet herstel bij onzekere resultaten.
- HMAC-webhooks, duurzame inbox, worker, orderprojecties, reconciliatie en blokkering bij achterstallige verwerking. Geen verzending of betaling wordt afgeleid uit alleen het aanmaken van een cart.
- Legacy-cutoverbescherming met behoud van historische betalingsherstelroutes. Nieuwe Shopify-route standaard uitgeschakeld.
- MOSE-adminscherm `/admin/shopify` met alleen-lezen vrijgavecontroles. Ontbrekende gegevens worden “Onbekend”; technisch groene controles zijn geen algemene productiegoedkeuring.
- MOSE-styling op mobiel en desktop: Anton/Montserrat, zwart, wit en groen. Lokale visuele controles van handoff en admin op 390/1440 px, handoff ook 360 px; geen overflow of runtimefouten. Geen bewijs voor de nog niet geconfigureerde hosted Shopify-checkout.

## Werkelijk gewijzigde Shopify-catalogus

Drie producten zijn als **DRAFT** aangemaakt en daarna via Shopify teruggelezen. 27 SKU/kleur/maat/prijs-koppelingen zijn gecontroleerd. Voorraad staat op nul, niet gepubliceerd, niet vrijgegeven voor checkout. Beschrijvingen en afbeeldingen zijn nog niet gemigreerd.

| Product | Varianten | Prijs | Shopify-product-ID |
|---|---:|---:|---|
| MOSE Essential Hoodie | 9 | €79 | 11413172388167 |
| MOSE Classic Sweater | 6 | €75 | 11413172781383 |
| MOSE Tee | 12 | €50 | 11413173109063 |

De inactieve horloge- en cadeaukaartproducten zijn niet geactiveerd. De acht Tapstitch-modellen zijn nog niet als verkoopproducten toegevoegd: hun echte leverancierkoppeling moet via Tapstitch worden gemaakt en gecontroleerd. Geen imitatie van een supplierkoppeling.

De officiële Tapstitch-app is zichtbaar in Shopify. Dat bewijst installatie, niet de juiste productmapping, automatische indiening, betaalmethode, tarieven of volledige fulfillmentketen. De browserinventaris bood geen bestuurbare browser of tab; toestemming is aanwezig, maar toegang tot de ingelogde Tapstitch-sessie was technisch niet beschikbaar.

## Beeldmateriaal

De lokale galerij bevat **65 conceptbeelden: 13 kleuruitvoeringen × 5 beelden** (voorzijde, achterzijde, hoek, detail en lifestyle). Alle beelden zijn bekeken; galerijbediening en mobiele weergave zijn getest. Een broekbeeld is gecorrigeerd op ontbrekende taillebanddetails.

Locatie: `docs/product-imagery/tapstitch-2026-10-27/index.html` in de oorspronkelijke MOSE-workspace. Niet gepubliceerd in Shopify of op de webshop. AI-beelden zijn geen bewijs van exacte fysieke pasvorm of stof/patroon; vergelijking met echte samples blijft nodig.

## Testbewijs

- Volledige Vitest-suite: **19 bestanden, 162 tests geslaagd**.
- TypeScript-controle geslaagd.
- Volledige ESLint-controle: nul fouten; 890 bestaande waarschuwingen blijven zichtbaar. Vijf bestaande React-fouten in de winkelmand/productsuggesties zijn gericht hersteld.
- Toevoegen van `npm test` aan de GitHub-workflow is niet gepubliceerd: de bestaande OAuth-koppeling mist `workflow`-scope. Het workflowbestand is behouden; de tests zijn lokaal uitgevoerd. GitHub CI behoudt zijn bestaande lint/typecheck/build-stappen.
- Next.js-productiebuild geslaagd (229 pagina’s), met Shopify-vrijgaveflags uit.
- Migratie lokaal met PGlite gecontroleerd: 23 assertions rond transacties, bevoegdheden, idempotentie en leases. Nog geen live Supabase-migratie uitgevoerd.
- Shopify GraphQL-operaties door de backendreview tegen de officiële schema’s gecontroleerd.
- Onafhankelijke implementatiereview: vier gevonden fouten hersteld en herbeoordeeld; GO voor concept-PR met flags uit.

Lokale en gemockte tests bewijzen geen echte Shopify-betaling of Tapstitch-levering. Er is geen nieuwe klantmail, samplebestelling, voorraadtransfer of productie-omschakeling uitgevoerd.

## Nog te bouwen en te bewijzen vóór productie

| Werkpakket | Concrete ontbrekende stap |
|---|---|
| Productieverbinding | Eigen productiegeschikte Admin/Storefront-appcredentials, webhooksecret, sessiesecret en juiste rechten instellen. De interactieve CLI-login en ChatGPT-connector zijn niet de servercredential. |
| Database en verwerking | Stagingmigratie/RLS bewijzen, productie-migratie voorbereiden, cron instellen, herstel/monitoring demonstreren, retentie vaststellen. |
| Catalogus | Bestaande teksten/beelden migreren; Tapstitch-producten met echte suppliervariant-ID’s toevoegen; voorraad per locatie verifiëren. |
| Kortingen en loyaliteit | 22 mogelijk bruikbare promo’s exact toetsen/migreren; 54 loyaltyaccounts en 6.104 punten behouden; juiste identiteit, korting, bijschrijving en refund verwerken. |
| Markten en levering | Gateway is nu NL/EUR. Bestaande andere landen, gratis verzending en afhaalbeleid volledig overzetten of expliciet afbakenen. Geen onzichtbaar functieverlies. |
| Orderafhandeling | Shopify-orders in account/admin en bestaande fulfillmentoperatie integreren; eenmalige punten/voorraad/e-mail/analytics-bijwerkingen implementeren; juiste adressen en rechten. Huidige worker is alleen projectie. |
| Herstel | Gecontroleerde afhandeling van verlopen/onzekere checkoutpogingen; nooit blind een tweede cart/betaling starten. |
| Tapstitch en marge | Echte kosten, verzending, leverancierbetaling, orderindiening, prijsvoorstel en minimaal acht fysieke samples controleren. |
| Echte ketentest | Eigen order, Tapstitch-order, gemengde order, annulering, deelrefund, uitval en late legacybetaling aantoonbaar doorlopen. |
| Omschakeling | Actuele snapshot van voorraad, punten, kortingen en betalingen; geen onverklaarde afwijkingen; rollback en meldingsontvangst bewezen. |

De volledige integratie is dus **nog niet af**. Behalve externe toegang en fysieke levering staat er nog applicatiewerk open. De releaseflags mogen pas aan wanneer dat werk en de ketentests zijn afgerond. Een geslaagde build of een positieve ontwerpbeoordeling vervangt die voorwaarden niet.

## Terugvinden en behoud

Concept-PR: https://github.com/mosewear/mose-webshop/pull/15. De Vercel-preview heeft succesvol gebouwd; dit is geen productie-omschakeling.

Code staat op branch `feat/shopify-tapstitch-pilot` in geïsoleerde worktree `/private/tmp/mose-shopify-implementation`. Bestaande niet-gerelateerde wijzigingen in de oorspronkelijke werkmap zijn behouden. Catalogusmapping staat naast dit document; er staan geen toegangstokens of klantgegevens in de rapporten.
