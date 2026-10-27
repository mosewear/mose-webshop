# Tapstitch-conceptcatalogus

De import bevat acht onbedrukte modellen, dertien kleuruitvoeringen, 63 maat-kleurvarianten en 65 conceptafbeeldingen. Materiaal, stofgewicht, maten en leverancierskleurnamen zijn overgenomen uit de op 27 oktober 2026 lokaal opgeslagen Tapstitch-productgegevens. Product- en kleur-ID's zijn **bronreferenties**, geen geverifieerde bestel- of fulfillmentkoppeling.

## Wat de import doet

- Maakt echte producten, varianten en beeldrecords in de bestaande MOSE-tabellen, zichtbaar onder `/admin/products`.
- Neemt Nederlandse en Engelse producttekst en leveranciersmaattabellen over. De maten zijn kledingmaten, geen lichaamsomtrekken.
- Controleert SHA256 en afmetingen van alle 65 lokale PNG's. Maakt lossless WebP op originele afmetingen; er gaan geen bronpixels verloren. De PNG's blijven onaangetast.
- Uploadt de afbeeldingen naar de bestaande `product-images`-bucket. Bestandsnamen zijn inhoudshashes en worden nooit overschreven.
- Houdt producten op `status=draft`, `is_active=false`; varianten hebben `is_available=false`, voorraad en presalevoorraad nul.
- Schrijft geen leverancierorder-ID's, Shopify-ID's, prijzen of voorraadaantallen alsof die al zijn geverifieerd.

`products.base_price` is verplicht. Daarom staat alleen in het inactieve MOSE-concept een technische nulwaarde. Het bronmanifest houdt `salePriceEur=null` en `landedCostEur=null`. De admin toont **Prijs nog bepalen** en blokkeert publiceren zonder positieve verkoopprijs. Een prijs invullen is op zichzelf geen toestemming om te publiceren: supplierkoppeling, samples, leveringsvoorwaarden en checkout moeten ook worden gevalideerd.

Afbeeldingen hebben de status `concept-review`; fysieke gelijkenis is nog niet met samples geverifieerd. De oorspronkelijke leveranciersfoto-URL's blijven beschikbaar in het manifest. Categorieën worden niet gegokt en blijven in deze import leeg. De productnamen onderscheiden de modellen, maar zijn nog geen afzonderlijk gevalideerde merkpositionering.

## Dry-run (geen netwerk, geen databasewijzigingen)

```sh
node scripts/import-tapstitch-drafts.mjs \
  --asset-root /absolute/path/to/docs/product-imagery/tapstitch-2026-10-27 \
  --report /private/tmp/tapstitch-dry-run.json
```

De losse beeldbestanden blijven buiten deze codecommit. Het volledige, controleerbare manifest staat in `docs/shopify/tapstitch-draft-catalog.json`.

## Bewust toepassen

```sh
node scripts/import-tapstitch-drafts.mjs \
  --asset-root /absolute/path/to/docs/product-imagery/tapstitch-2026-10-27 \
  --apply \
  --project-ref YOUR_SUPABASE_PROJECT_REF \
  --env-file /private/path/to/environment \
  --report /private/tmp/tapstitch-import-result.json
```

Vereist `NEXT_PUBLIC_SUPABASE_URL` (of `SUPABASE_URL`) en `SUPABASE_SERVICE_ROLE_KEY`. De opgegeven projectref moet exact overeenkomen met de URL; geheimen verschijnen niet in het rapport. Er worden geen schemawijzigingen of SQL-migraties toegepast.

Voor de eerste mutatie vergelijkt de importer alle bestaande product-, variant- en beeldrecords en controleert hij de bestaande public storagebucket. Deterministische UUID's en lokale SKU's voorkomen dubbelingen. Alleen ontbrekende records worden ingevoegd. Bestaande gewijzigde records, botsende slugs/SKU's en onverwachte varianten/beelden breken de run af. Er wordt nooit geüpsert of verwijderd.

De drie tabelinserts vormen geen gezamenlijke database-transactie. Bij een onderbreking kunnen dus gedeeltelijke **onbeschikbare concepten** bestaan. Dezelfde opdracht kan na inspectie ontbrekende records aanvullen; gewijzigde handelsdata wordt nooit hersteld of overschreven. Na afloop wordt iedere geïmporteerde kolom teruggelezen en vergeleken. Alleen een geslaagde read-back mag als voltooide MOSE-conceptimport worden gemeld.

## Nog nodig voor verkoop

1. Producten in het juiste Tapstitch-account aanmaken en via de officiële app naar Shopify publiceren, met dezelfde kleuren/maten.
2. Echte supplier/Shopify-variant-ID's registreren en verifiëren; lokale SKU's zijn niet geschikt als vervanging.
3. Verkoopprijzen, belastingen, verzendkosten, categorieën en retourvoorwaarden vastleggen.
4. Samples en beelden beoordelen; overige productgegevens en maattabelmeetwijze controleren.
5. Gehele betaal- en fulfillmentketen testen en pas daarna de bestaande vrijgavepoorten inschakelen.

De importer doet geen Shopify-publicatie of Tapstitch-accountmutatie en kan die stappen niet als voltooid verklaren.
