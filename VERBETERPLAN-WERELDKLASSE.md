# Verbeterplan MOSE webshop

Opgesteld 11 oktober 2026. Basis: zeven parallelle audits op codeniveau (conversie/funnel, UI/UX, mobiel, performance, toegankelijkheid, SEO/trust, en een forensische analyse van de analytics-attributie), plus een eigen visuele nulmeting van twaalf pagina's op desktop 1440px en iPhone 14.

Alle bevindingen zijn uit de werkelijke code afgeleid en waar mogelijk nagerekend. Waar iets niet met zekerheid vast te stellen was zonder productiedata, staat dat er expliciet bij.

---

## 1. Waar de shop nu staat

Het fundament is beter dan gemiddeld. Dat is belangrijk om vast te stellen, want het bepaalt waar de winst zit.

Sterk en niet aankomen:
- Gastcheckout is de standaard, geen gedwongen account.
- Progressieve validatie in de checkout: geen rode fouten tijdens typen, validatie op blur, direct groen bij herstel. Beter dan veel grotere shops.
- Postcodecheck met debounce en race-bescherming via een request-id.
- Eerlijke social proof. Drempelwaarden op de activiteitsbalk, echte reviews, geen nepsterren. In een eerdere analyse stond het voorstel om tijdelijk nepreviews te plaatsen; dat is terecht genegeerd.
- iDEAL, Bancontact en Klarna correct per land gefilterd.
- Afbeeldingspijplijn: WebP-only met onderbouwing, 30 dagen cache, ingekorte deviceSizes, XL-variant voor zoom.
- De blogdetailpagina is de best verzorgde route van de site: canonical, hreflang, volledige BlogPosting-schema, geldige RSS. Let op: dat geldt voor de detailpagina, niet voor het blogoverzicht. Zie 4.2.
- next/font correct, Supabase-preconnect uit de omgevingsvariabele, Meta-pixel pas na toestemming.

De winst zit dus niet in opnieuw bouwen, maar in drie dingen: een handvol harde defecten, een ontbrekend designsysteem, en twee commerciële kernpagina's die hun inhoud niet server-side leveren.

---

## 2. Harde defecten

Dit zijn geen smaakkwesties. Het zijn fouten met aanwijsbaar gedrag.

### 2.1 Views en omzet van hetzelfde product belandden op twee aparte regels

**Status: opgelost in deze branch.**

`get_product_performance()` groepeert views, add-to-carts en aankopen op één sleutel. Voor views is dat de product-UUID; voor aankopen was dat `items[].id`, en de client stuurde daar de primary key van `order_items` in. Elke verkoop kreeg dus een sleutel die per definitie nooit met de views kon matchen.

Gevolg in de admin: één regel met alle views en geen omzet, en een regel eronder met alle omzet en geen views. De namen leken bijna gelijk omdat de ene regel `products.name` droeg en de andere de naamsnapshot uit `order_items`, die per taal verschilt.

Bewijs: [src/app/\[locale\]/order-confirmation/page.tsx:239](src/app/[locale]/order-confirmation/page.tsx#L239) stuurde `item.id` terwijl `item.product_id` ongeveer vijfenveertig regels hoger, in de Meta-pixelcode van dezelfde functie, wél correct werd gebruikt.

Daarnaast groepeerde [src/app/admin/analytics/page.tsx](src/app/admin/analytics/page.tsx) "Top producten" op de naamstring, wat hetzelfde product over NL- en EN-varianten uitsmeerde.

Na de fix verandert de verdeling over de regels, niet het omzettotaal. `add_to_cart_rate` en `purchase_rate` krijgen voor het eerst een echte noemer en gaan van 0 procent naar een reëel getal.

**Nog te doen door jou:** de meegeleverde migratie uitvoeren. Zie sectie 6.

### 2.2 De mobiele homepage kon bezoekers naar drie niet-bestaande producten sturen

**Status: opgelost in deze branch.**

`MobileProductCarousel` had drie hardgecodeerde fallbackproducten: "MOSE Basic Hoodie" €79,99, "MOSE Basic Tee" €34,99, "MOSE Snapback" €29,99, met slugs `mose-classic-hoodie-zwart`, `mose-essential-tee-zwart` en `mose-classic-cap-zwart`. Geen van die drie komt elders in de repo voor, en je echte slugs zijn `mose-essential-hoodie`, `mose-tee`, `mose-classic-sweater` en `mose-automatisch-horloge`. Let op: die laatste lijst komt uit je live sitemap, dus uit de database, niet uit de code. De conclusie dat de fallbackslugs niet bestaan steunt dus op databaseinzage. Los daarvan is de verwijdering sowieso juist: drie verzonnen producten met verzonnen prijzen op de mobiele homepage is niet te verdedigen, ook als de slugs wél zouden bestaan.

Zodra er geen featured producten ingesteld waren, toonde desktop netjes een lege staat en stuurde mobiel bezoekers met verzonnen prijzen naar een 404. De fout faalde stil: op desktop zag je dat er niets stond, op mobiel leek alles te werken.

### 2.3 De Meta-fallbackpixel vuurde buiten de cookietoestemming om

**Status: opgelost in deze branch.**

De `<noscript>`-pixel in de root layout stond buiten de consentcheck en vuurde bij elke bezoeker, ook bij wie "alleen noodzakelijke cookies" koos. Een noscript-img kan per definitie niet op het toestemmingsevent wachten, dus hij is verwijderd. Dit is een AVG/ePrivacy-punt, geen optimalisatie.

### 2.4 De afrekenknop in de mobiele winkelwagen deed iets anders dan hij beloofde

**Status: opgelost in deze branch.**

De hele vaste bodembalk was één knop die de samenvatting opende. De witte pil met "AFREKENEN →" was een `div` daarbinnen. Tappen op de visueel primaire actie opende dus de samenvatting in plaats van de checkout. Nu zijn het twee losse controls.

### 2.5 De chatbubbel lag bovenop diezelfde afrekenknop

**Status: opgelost in deze branch.**

De bubbel is 64px, staat rechtsonder op `z-[9999]` en werd alleen verborgen op product-, admin- en checkoutpagina's. Op `/cart` overlapte hij precies de afrekenbalk en ving daar taps af.

### 2.6 De cookiebanner bedekte de koopknop

**Status: opgelost in deze branch.**

De banner was op mobiel circa 230 tot 260px hoog en lag op `z-[100]` over de sticky koopbalk van de PDP (`z-40`) en de afrekenbalk in de winkelwagen. Elke advertentieklik landde dus op een product waarvan de koopknop onbereikbaar was tot de banner werd weggeklikt.

Twee dingen gedaan. De mobiele variant is compact geworden: gemeten van circa 250 naar 127 pixels, 19 procent van het scherm in plaats van bijna 40. En de banner publiceert nu zijn eigen hoogte als `--cookie-consent-height`; de sticky koopbalk en de afrekenbalk in de winkelwagen gebruiken die als `bottom`-offset en schuiven er dus bovenop in plaats van eronder te verdwijnen. Kleiner maken alleen was niet genoeg, want de overlap bleef dan bestaan. De banner onder de koopbalk leggen is geen optie: voor geldige toestemming moet hij zichtbaar blijven.

Nagemeten op een iPhone 14 met de banner in beeld: de afrekenbalk staat op `bottom: 127px`, zijn onderrand ligt op 537 en de bovenkant van de banner ook, dus nul overlap. De standaardwaarde `--cookie-consent-height: 0px` staat in `globals.css`, zodat de balken zonder banner exact staan waar ze stonden.

Twee dingen die ik onderweg bij mezelf moest herstellen. De eerste versie van mijn compacte banner duwde de knop "Accepteer alle cookies" 63 pixels buiten het scherm, doordat `whitespace-nowrap` afbreken verhinderde; hersteld en nagemeten op 390 en 360 pixels breed. En ik dacht even dat Tailwind een `var()`-fallback met komma niet genereert; dat is getest en onjuist, Tailwind doet dat gewoon. De expliciete default in `:root` is behouden omdat die leesbaarder is, niet omdat het moest.

**Terzijde, en dit is een vraag aan jou:** de sticky koopbalk op de PDP rendert op dit moment helemaal niet, want hij hangt achter de adminsetting `pdp_sticky_picker_enabled` en die staat uit. Op een shop waar het grootste deel van de omzet van mobiel komt, is een altijd zichtbare koopknop een van de sterkste conversiemiddelen die er zijn. Wil je hem aanzetten?

### 2.7 `bg-brand-light` bestond niet

**Status: opgelost in deze branch.**

De klasse werd vijf keer gebruikt in de retourflow maar stond niet in `tailwind.config.ts`, dus Tailwind genereerde hem nooit. Een geselecteerde retourregel kreeg alleen een rand en geen vulling. De tint is nu gelijk aan `successBg` uit de e-mailtokens, zodat web en e-mail dezelfde kleur delen.

### 2.8 De PDP-skeleton had een ander raster dan de PDP

**Status: opgelost in deze branch.**

Skeleton en echte layout verschilden in raster, gaps, padding en beeldverhouding. Zodra de data binnenkwam sprong de galerijkolom van 50 naar 54,5 procent en veranderde het beeldframe op desktop van 3:4 naar vierkant. Gegarandeerde layoutsprong bij elke load.

### 2.9 De maat- en kleurkeuze kan doodlopen

**Status: nog niet opgelost. Zie sectie 5.**

`selectedVariant` eist een exacte match op maat én kleur, maar de maatknoppen zijn enabled zodra welke kleur dan ook die maat op voorraad heeft, en de kleurenlijst wordt gefilterd op de gekozen maat. Kies je een maat die de huidige kleur niet heeft, dan is er geen variant, toont de knop "UITVERKOCHT" en is hij uitgeschakeld. De back-in-stock-melding verschijnt niet, want die eist ook een variant.

De in-page kleurkiezer heeft een fallback die de maat bijstelt. De sticky balk, het primaire koopoppervlak op mobiel, heeft die fallback niet.

Dit is de enige harde conversieblokker in de lijst. Ik heb hem bewust niet in één nacht aangeraakt: in de code staat een commentaarblok dat een eerdere regressie in precies dit gebied beschrijft, en er is geen e2e-dekking op de maat/kleur-matrix. Dit hoort met een test ernaast en met jou erbij.

---

## 3. Toegankelijkheid

De Europese Accessibility Act maakt dit voor een EU-webshop ook een juridisch punt, niet alleen een kwaliteitspunt.

Vier blokkers:

1. **22 checkoutvelden zonder toegankelijke naam.** Geen `id`, geen `aria-label`, geen `htmlFor`. Screenreaders horen "edit, blank". Spraakbesturing kan "click first name" niet oplossen.
2. **Foutmeldingen nergens programmatisch gekoppeld.** Nul `aria-describedby` en nul `aria-invalid` in de hele codebase. Na een mislukte submit gebeurt er voor een screenreader hoorbaar niets, en er is geen focusverplaatsing naar het eerste foute veld.
3. **Auto-openende modals zonder dialoogsemantiek.** Nieuwsbrief- en enquêtepopup, maattabel, zoekoverlay: geen `role="dialog"`, geen focus trap, geen Escape, geen scroll-lock. De pagina eronder blijft volledig tab-bereikbaar.
4. **`lang="nl"` op Engelse pagina's.** De root layout zet de taal hard; een client-component corrigeert pas na hydratatie. Elke `/en`-respons verlaat de server als Nederlands.

Twee contrastproblemen, nagerekend:

| combinatie | ratio | eis | oordeel |
|---|---|---|---|
| wit op `#00A676` | **3,13:1** | 4,5:1 | zakt |
| wit op `#008f66` (hover) | 4,10:1 | 4,5:1 | zakt |
| zwart op `#00A676` | 6,72:1 | 4,5:1 | voldoet |
| `text-gray-400` op wit | **2,54:1** | 4,5:1 | zakt |
| `text-gray-500` op wit | 4,83:1 | 4,5:1 | voldoet |

Wit op merkgroen staat op 149 plekken, waaronder "In winkelwagen", "Alles accepteren" en de geselecteerde maat. `text-gray-400` staat 61 keer, waaronder de hele PDP-breadcrumb en de uitverkocht-melding.

Dit vraagt een beslissing van jou. Zie sectie 5.

---

## 4. Wat er structureel ontbreekt

### 4.1 Er is geen designsysteem

`tailwind.config.ts` bevat twee kleuren en twee lettertypes. Geen schaal voor fontgrootte, spacing, radii, schaduw of z-index. De twee UI-primitives die wel bestaan, `ui/Button.tsx` en `ui/Skeleton.tsx`, worden nul keer gerenderd. `Button` werd wel geïmporteerd in `HomePageClient` en dus meegebundeld zonder ooit te renderen; die dode import is verwijderd.

Wat daar feitelijk voor in de plaats is gekomen:

| as | aantal varianten |
|---|---|
| unieke CTA-signaturen | 161 over 217 elementen |
| padding op uppercase-CTA's | 39 combinaties |
| kaart- en paneelstijlen | 38 over 82 panelen |
| eenmalige arbitraire schaduwen | 15 |
| contentbreedtes over 12 routes | 6 |
| tracking-waarden | 11 arbitraire |
| scrim-opaciteiten | 9 |
| spinnervarianten | 7, waarvan één draaiend vierkant |

Concreet effect: dezelfde "afrekenen"-actie is groen in de winkelwagenlade en zwart op de winkelwagenpagina. Hetzelfde totaalbedrag staat in de lade in `font-display font-bold` en op de pagina in `font-display`, dus twee verschillende letterbeelden één klik uit elkaar.

De ironie: `src/emails/tokens.ts` is een volwaardig tokenbestand met 38 benoemde kleuren. Je e-mails hebben een designsysteem en je website niet.

**Status: deels opgelost.** Het nepvet is weg (17 plekken), `brand-light` bestaat nu. De rest is sectie 5-werk.

### 4.2 De twee commercieel belangrijkste pagina's leveren geen inhoud

PDP en shop zijn volledig client-side. De serverpagina haalt het product wel op, maar gebruikt dat alleen voor JSON-LD en geeft het niet door. De browser haalt daarna hetzelfde product opnieuw op, plus de instellingen, plus de gerelateerde producten, en pas na die laatste query verdwijnt de loader.

Gevolgen, elk met bewijs uit de build:
- De server-HTML van elke PDP bevat geen productnaam, geen prijs en geen `<h1>`.
- `nl/shop.html` bevat **nul links naar productpagina's**. De shop is je belangrijkste interne-link-hub en levert geen enkele link naar een product. (De pagina heeft wél een `<h1>` via `EditorialPageBanner` en bevat wél twee Supabase-beelden uit de editorial banner; een eerdere versie van dit plan beweerde het tegendeel en dat was onjuist.)
- Nul productpagina's worden geprerenderd: `generateStaticParams` geeft een lege array terug.
- De shop doet `select('*')` op de hele catalogus zonder limiet, inclusief alle beschrijvingen en alle `_en`-kolommen.

**En het blogoverzicht is erger dan de shop.** `/nl/blog` levert server-side helemaal niets: nul `<h1>`, nul links naar blogposts, en de `<main>` bevat een `BAILOUT_TO_CLIENT_SIDE_RENDERING`-template. Oorzaak: `BlogListClient.tsx:37` gebruikt `useSearchParams`, en de Suspense-grens eromheen heeft `fallback={null}`, dus de server rendert een leeg gat. Voor een crawler is je hele contenthub leeg. Dit hoort op hetzelfde niveau als PDP en shop te worden aangepakt.

### 4.3 Het ISR-venster van de hele site staat feitelijk op 30 seconden

Je homepage declareert `revalidate = 3600`, je shop 1800. In `prerender-manifest.json` staat voor élke storefront-route `initialRevalidateSeconds: 30`. Oorzaak: de campagne-lookup in de locale-layout is een `unstable_cache` met `revalidate: 30`, en de kortste waarde in de route wint.

Elke 30 seconden wordt dus elke pagina opnieuw op de origin gerenderd, inclusief alle Supabase-queries.

**Dit vraagt een beslissing van jou,** want campagnes worden via een RPC op datum actief, niet via een mutatie. Tag-invalidatie vangt het starten van een geplande campagne niet op. Zie sectie 5.

### 4.4 Commerciële beloftes spreken elkaar tegen

Op één productpagina staat nu:

- direct bij de koopknop: "Voor 17:00 besteld? Morgen in huis met gratis bezorging"
- in de accordeon lager op diezelfde pagina: "2 tot 3 werkdagen binnen Nederland"
- op `/verzending`: "Totaal: 2-5 werkdagen"

En voor retour:

- bij de koopknop: "30 dagen bedenktijd. Geld terug bij retour, zonder gedoe."
- in de accordeon: "Retourkosten: €6,95 (excl. btw)"
- op `/verzending`: "Betaal EUR 5,95 retourkosten"
- in de code-defaults: 6,50 excl. en 7,87 incl.

Daarnaast belooft je meta-description in beide talen "Gratis verzending vanaf €75", terwijl de codedefault voor de drempel 100 is en een commentaarregel in de Meta-feed "€150 today" zegt.

Dit is geen stijlkwestie. Een bezoeker die via een Google-snippet met "gratis verzending vanaf €75" binnenkomt en in de checkout iets anders ziet, haakt af. Bij een artikel van ruim 250 euro is het verschil tussen "geld terug, zonder gedoe" en betaald retourneren precies de informatie waarop de aankoop hangt.

**Wat is waar?** Dat kan ik niet uit de code afleiden, want de echte waarden staan in `site_settings` in je database. Dit vraagt jouw antwoord. Zie sectie 5.

### 4.5 Ontbrekende wettelijke gegevens

KvK-nummer en btw-identificatienummer staan nergens: niet in de footer, niet in de algemene voorwaarden, niet in het privacybeleid. Voor een Nederlandse webshop is dat wettelijk verplicht, en het is een afkeurgrond bij Trustpilot- en Merchant Center-verificatie.

### 4.6 De Trustpilot-widget toont vaste sterren

De widget vraagt het reviewaantal alleen op om te beslissen of hij zichtbaar is, en rendert daarna vijf hardgecodeerde sterren. De echte score wordt nooit gebruikt. Een commentaarregel zegt dat het Trustpilot-script in de main layout staat; dat script bestaat niet.

Vijf vaste sterren die niet uit de echte score komen is een misleidende ratingweergave. Tegelijk laat je de opbrengst liggen: geen echte TrustBox, geen `aggregateRating`, dus geen sterren in Google terwijl de reviewdata er wel is.

---

## 5. Wat jouw beslissing vraagt

Vijf punten. Ik heb ze bewust niet zelf doorgevoerd, omdat elk een zichtbaar of commercieel effect heeft dat jouw keuze is.

**A. Merkgroen en contrast.** Wit op `#00A676` haalt 3,13:1 en zakt voor WCAG AA. Twee routes:
- *Donkerder groen.* `#00754F` haalt 5,74:1 met wit. Eén regel in de config, lost 149 plus 196 plekken in één keer op. Je merkkleur verandert zichtbaar.
- *Zwarte tekst op het bestaande groen.* Haalt 6,72:1, past bij de brutalistische stijl, laat de merkkleur intact. Raakt 149 class-strings, dus meer werk.

**B. Het ISR-venster.** Nu 30 seconden voor de hele site. Verhogen naar bijvoorbeeld 300 betekent tien keer minder origin-renders, maar een geplande campagne komt tot vijf minuten later live. Acceptabel?

**C. De echte verzend- en retourwaarden.** Wat is waar: gratis verzending vanaf 75, 100 of 150 euro? Zijn de retourkosten 5,95, 6,95 of 7,87? Wat is de echte levertijd? Zodra ik dat weet trek ik alle teksten naar één bron en haal ik de vaste getallen uit de vertalingen.

**D. KvK- en btw-nummer.** Geef me de nummers, dan zet ik ze in de footer, de voorwaarden, het privacybeleid en de Organization-schema.

**E. Hoe ver gaan we met het designsysteem.** De volledige migratie (tokenbestand, Button-component, paneelniveaus, typografische schaal) is enkele dagen werk en raakt elke pagina visueel. De funnel alleen (PDP, winkelwagen, lade, checkout) is zes bestanden en dekt de omzet. Mijn advies: eerst de funnel.

---

## 6. Uitvoeren: de migratie

Er staat één migratie klaar die ik bewust niet heb uitgevoerd, omdat hij je productiedatabase raakt:

`supabase/migrations/20261011120000_fix_product_performance_purchase_key.sql`

Wat hij doet:
- Vertaalt historische `order_items`-id's alsnog naar het juiste product, zodat oude cijfers kloppen zonder dat opgeslagen events gewijzigd worden.
- Zet `products.name` vóór de naamsnapshot als label, zodat NL- en EN-varianten op één regel samenvallen.
- Haalt `anon` uit de grant. De functie draait achter `requireAdmin()` met een ingelogde sessie, dus `authenticated` volstaat; `anon` kon productomzet opvragen zonder login.

Uitvoeren met `supabase db push`. De cijfers in je dashboard veranderen daarna zichtbaar: duplicaatregels verdwijnen, omzet landt bij de views, en de conversiepercentages gaan van 0 naar een reëel getal.

---

## 7. Volgorde van hieraf

**Nu af, in deze branch.** Alle punten in sectie 2 behalve 2.9, plus het nepvet, `brand-light`, de skeleton, de header- en observer-prestaties, de Instagram-preloads, de geneste `main`-landmarks, de dode scrollbar-klasse, de OG-afbeelding en de canonieke www-URL's.

Drie wijzigingen die hierboven niet apart genoemd stonden en die er wel in zitten:
- **Breadcrumb-schema op de PDP.** Het categorie-item wees naar `/{locale}/shop/{slug}`, een route die niet bestaat, wat het hele BreadcrumbList-schema ongeldig maakte. Het wijst nu naar `/{locale}/shop?category={slug}`, gelijk aan de zichtbare breadcrumb. Half werk, want die URL canonicaliseert naar `/shop`; definitief opgelost is het pas met echte categorieroutes (punt 4 hieronder).
- **`scripts/visual-check.mjs`.** Nieuw script dat twaalf pagina's vastlegt op desktop 1440px en iPhone 14 en daarbij HTTP-status, console-errors, mislukte requests en horizontale overflow meet. Hiermee is de nulmeting en de nameting gedaan. Staat als `npm run visual-check` in `package.json`.
- **Dode `isScrolled`-state** uit de header verwijderd. Werd gezet bij elke scroll maar nergens gelezen.

**Zodra jij A tot E beantwoordt.** De contrastfix, het ISR-venster, één bron voor de beloftes, de wettelijke gegevens, en de eerste ronde designsysteem op de funnel.

**Daarna, in deze volgorde.**
1. De maat/kleur-blokker uit 2.9, met een e2e-test op de variantmatrix ernaast.
2. Toegankelijkheid: labels en foutkoppeling in de checkout, daarna de modal-primitive.
3. PDP en shop server-side renderen. Dit is het grootste werk en de grootste winst: het lost tegelijk de LCP, de ontbrekende `<h1>`, de lege interne links en de indexeerbaarheid op.
4. Echte categoriepagina's. Nu staan `?category=`-URL's in de sitemap die allemaal naar `/shop` canonicaliseren, dus je hebt geen landingspagina voor "hoodies heren" en "t-shirts heren".
5. Structured data aanvullen: `aggregateRating`, `shippingDetails`, `hasMerchantReturnPolicy`, presale-aware beschikbaarheid.
6. De rest van het designsysteem.

**Prioriteit, en het staat los van al het bovenstaande.** CI op `main` is al twee maanden rood, en niet door de code. `npm ci` faalt op Linux met `EUSAGE`: `@rolldown/binding-wasm32-wasi` eist exact `@emnapi/core@1.9.2`, maar de lockfile kent alleen een entry op 1.10.0. Zolang dit rood staat, is elke wijziging in deze repo ongecontroleerd werk.

Wat ik heb geprobeerd en wat niet werkte: `npm ci --dry-run` slaagt op macOS, `npm install --package-lock-only` meldt "up to date" en levert geen diff, en datzelfde met `--os=linux --cpu=x64` ook niet. De lockfile opnieuw genereren vanaf deze machine lost het dus niet op.

Twee routes die wel kunnen:
1. De lockfile regenereren op Linux (in een container of via een CI-run) en het resultaat committen.
2. In `.github/workflows/ci.yml` `npm ci` vervangen door `npm install --no-audit --no-fund`. Minder strikt, maar direct groen.

Route 2 raakt een bestand onder `.github/workflows/`, en het GitHub-token van het mosewear-account heeft de `workflow`-scope niet, dus die wijziging kan ik niet pushen. Met `gh auth refresh -s workflow` is dat in één handeling verholpen.

---

## 8. Wat ik niet kan garanderen

De wijzigingen in deze branch zijn door typecheck, unit tests, productiebuild en een visuele controle op desktop en mobiel gehaald. Dat is geen bewijs dat er niets kapot is. Niet gedekt:

- Er is geen e2e-dekking op de variantmatrix, de promocodeflow of de retourflow.
- De visuele controle is gedaan tegen de live database met de huidige catalogus van vier producten. Randgevallen zoals een uitverkochte eerste kleur of een lange Engelse productnaam zijn niet doorlopen.
- De migratie is niet tegen een echte dataset gedraaid, alleen tegen het schema beredeneerd.
- Alle prestatie-uitspraken komen uit de code en de build, niet uit veldmetingen.
