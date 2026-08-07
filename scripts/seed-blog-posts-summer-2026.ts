/**
 * Weekly MOSE blog posts for the window after 2026-05-13 through 2026-08-07.
 * Skips 2026-05-26 (existing care post). Twelve posts, Wednesdays 08:00 UTC
 * where possible, bilingual markdown, no em dashes, photoshoot-2026 covers.
 *
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/seed-blog-posts-summer-2026.ts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const IMG =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026'
const PROD =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/photoshoot-2026'

interface PostInput {
  slug: string
  title_nl: string
  title_en: string
  excerpt_nl: string
  excerpt_en: string
  content_nl: string
  content_en: string
  category: string
  tags: string[]
  reading_time: number
  seo_title_nl: string
  seo_title_en: string
  seo_description_nl: string
  seo_description_en: string
  published_at: string
  featured_image_url: string
}

const POSTS: PostInput[] = [
  // ── 1. 20 May 2026 ──────────────────────────────────────────────
  {
    slug: 'hoodie-stylen-late-lente-laagjes-die-werken',
    title_nl: 'Hoodie Stylen in de Late Lente: Laagjes Die Echt Werken',
    title_en: 'Styling a Hoodie in Late Spring: Layers That Actually Work',
    excerpt_nl:
      'Mei in Groningen betekent zon om 11:00 en wind om 16:00. Zo style je een mid-weight hoodie zonder dat je eruitziet alsof je de winter niet hebt losgelaten.',
    excerpt_en:
      'May in Groningen means sun at 11:00 and wind at 16:00. How to style a mid-weight hoodie without looking like you never left winter.',
    content_nl: `Late lente in het noorden is geen seizoen. Het is een onderhandeling met het weer. Warm genoeg voor een tee, koud genoeg voor een hoodie, en altijd die wind vanaf het Reitdiep.

Een hoodie wegstoppen tot oktober is zonde. Mid-weight (300 tot 360 GSM) is juist gemaakt voor dit weer. De truc zit in hoe je hem draagt, niet of je hem draagt.

## Open of dicht: twee looks

**Open over een tee:** Capuchon naar achteren, rits of opening ruim, tee zichtbaar. Werkt met jeans, cargo, of een nette chino. De hoodie wordt dan een jasje, geen hoofdlaag.

**Dicht als hoofdlaag:** Neutrale tee eronder (of geen tee), hoodie als het stuk dat je ziet. Houd de rest rustig: donkere broek, schone sneakers, geen tweede statement-print.

## Mouwen rollen of laten

Bij 18 graden en zon: mouwen tot net onder de elleboog. Bij wind of bewolking: laten hangen. Rol niet tot de schouder. Dat ziet eruit alsof je te warm bent en geen plan hebt.

## Kleuren die mei verdragen

Bruin, zwart, groen, en gebroken wit. Fel neon en logo-overkill passen slecht bij een stad die half steen, half water is. Neutraal laat je laagjes eruitzien alsof ze bij elkaar horen, ook als je ze apart kocht.

## Wat eronder werkt

- Zware tee (200+ GSM) in zwart of beige
- Niets: alleen de hoodie, als de stof dik genoeg is
- Geen flanel-overshirt eroverheen in mei. Dat is oktober-denken.

## De Groningen-test

Loop van de Folkingestraat naar het Noorderplantsoen. Als je halverwege zweet én bibbert, zit je goed. Dat is late lente. Pas je outfit aan die realiteit, niet aan een lookbook uit Zuid-Frankrijk.

Een MOSE hoodie is gebouwd voor dit weer: lokaal, stevig, en niet te zwaar voor een middag zon. Draag hem open, draag hem dicht, maar stop hem niet in de kast omdat de kalender "lente" zegt.`,
    content_en: `Late spring in the north is not a season. It is a negotiation with the weather. Warm enough for a tee, cold enough for a hoodie, and always that wind off the Reitdiep.

Putting a hoodie away until October is a waste. Mid-weight (300 to 360 GSM) is built for this weather. The trick is how you wear it, not whether you wear it.

## Open or Closed: Two Looks

**Open over a tee:** Hood back, opening loose, tee visible. Works with jeans, cargo, or a quiet chino. The hoodie becomes a light jacket, not the main layer.

**Closed as the main layer:** Neutral tee underneath (or none), hoodie as the piece people see. Keep the rest calm: dark pants, clean sneakers, no second loud print.

## Sleeves Rolled or Down

At 18 degrees and sun: roll to just below the elbow. In wind or cloud: leave them down. Do not roll to the shoulder. That looks like you are too warm and have no plan.

## Colors May Can Handle

Brown, black, green, and off-white. Loud neon and logo overload sit badly in a city that is half stone, half water. Neutrals make layers look intentional, even if you bought them separately.

## What Works Underneath

- Heavy tee (200+ GSM) in black or beige
- Nothing: hoodie only, if the fabric is thick enough
- No flannel overshirt on top in May. That is October thinking.

## The Groningen Test

Walk from Folkingestraat to Noorderplantsoen. If you sweat and shiver halfway, you got it right. That is late spring. Dress for that reality, not a lookbook from southern France.

A MOSE hoodie is built for this weather: local, solid, and not too heavy for an afternoon of sun. Wear it open, wear it closed, but do not bury it because the calendar says spring.`,
    category: 'style',
    tags: ['hoodie', 'lente', 'styling', 'laagjes', 'groningen', 'streetwear'],
    reading_time: 5,
    seo_title_nl: 'Hoodie Stylen in de Late Lente: Laagjes Die Werken | MOSE',
    seo_title_en: 'Styling a Hoodie in Late Spring: Layers That Work | MOSE',
    seo_description_nl:
      'Mei in Groningen: zon en wind op één dag. Zo style je een mid-weight hoodie met laagjes die kloppen, zonder winterlook.',
    seo_description_en:
      'May in Groningen: sun and wind in one day. How to style a mid-weight hoodie with layers that make sense, without a winter look.',
    published_at: '2026-05-20T08:00:00Z',
    featured_image_url: `${IMG}/lookbook/02-spring-desktop.webp`,
  },

  // ── 2. 2 Jun 2026 ───────────────────────────────────────────────
  {
    slug: 'zomer-tee-gids-gsm-pasvorm-kleur',
    title_nl: 'De Zomer-Tee Gids: GSM, Pasvorm en Kleur Die Niet Doorzichtig Worden',
    title_en: 'The Summer Tee Guide: GSM, Fit, and Color That Hold Up',
    excerpt_nl:
      'Een tee van 140 GSM is geen zomerstuk. Het is een wegwerp. Dit is wat je zoekt als je wilt dat je tee na juli nog ergens op lijkt.',
    excerpt_en:
      'A 140 GSM tee is not a summer piece. It is disposable. Here is what to look for if you want your tee to still look like something after July.',
    content_nl: `Juni opent het seizoen waarin iedereen denkt dat lichter altijd beter is. Lichter gewicht, lichtere stof, lichtere prijs. En eind augustus hangt die tee scheef, doorschijnend, en klaar voor de textielbak.

Een goede zomer-tee is niet dun. Hij is genoeg stof om vorm te houden als je beweegt, zweet, en hem drie keer draagt voor hij de was in gaat.

## GSM: wat de cijfers betekenen

- **140 tot 160 GSM:** Fast fashion. Doorschijnend in wit, slap na twee wasbeurten.
- **180 tot 200 GSM:** Acceptabel voor warme dagen als de pasvorm klopt.
- **200 tot 220+ GSM:** MOSE-territorium. Zwaarder in de hand, koeler in hoe hij valt, langer mooi.

Zwaarder katoen ademt niet slechter. Het hangt beter van je lichaam af en voelt minder plakkerig bij warm weer.

## Pasvorm voor zomer

Oversized werkt, maar niet oneindig. Schouders mogen iets vallen. De zoom mag iets langer. De oksels mogen niet knijpen. Een tee die strak zit bij 28 graden wordt een probleem binnen een uur.

**Vuistregel:** Als je armen sidderbewegingen maken en de stof trekt mee, is hij te klein. Eén maat groter lost meer op dan een dunner shirt.

## Kleur in de zon

Wit en beige vragen onderhoud. Zwart en donkergroen vergeven meer. Voor Groningen-zomers (regen, terras, fiets) wint donker vaker dan je denkt. Beige of off-white is mooi voor foto's en warme middagen. Zwart is de werkpaard-kleur.

## Wat je combineert

- Tee + lichte chino of relaxed jeans
- Tee + open overshirt alleen 's avonds
- Tee + shorts die niet boven mid-dij eindigen

Geen vijf kettingen en een tweede print. Eén sterk stuk is genoeg.

## De MOSE-lijn

Onze tees zitten in het zwaardere segment met opzet. Ze zijn gemaakt om een zomerseizoen te overleven, niet om er één festivalweekend goed uit te zien. Pak er twee of drie in rotatie. Was op 30. Droog aan de lucht. Klaar.`,
    content_en: `June opens the season where everyone thinks lighter is always better. Lighter weight, lighter fabric, lighter price. By late August that tee hangs crooked, see-through, and ready for the textile bin.

A good summer tee is not thin. It is enough fabric to hold shape when you move, sweat, and wear it three times before washing.

## GSM: What the Numbers Mean

- **140 to 160 GSM:** Fast fashion. See-through in white, limp after two washes.
- **180 to 200 GSM:** Acceptable for hot days if the fit is right.
- **200 to 220+ GSM:** MOSE territory. Heavier in the hand, cooler in how it hangs, longer looking good.

Heavier cotton does not breathe worse. It hangs off your body better and feels less sticky in heat.

## Fit for Summer

Oversized works, but not endlessly. Shoulders can drop a little. The hem can run a bit longer. The underarms should not pinch. A tight tee at 28 degrees becomes a problem within an hour.

**Rule of thumb:** If you move your arms and the fabric pulls with you, it is too small. One size up fixes more than a thinner shirt.

## Color in the Sun

White and beige need care. Black and dark green forgive more. For Groningen summers (rain, terraces, bikes) dark wins more often than you think. Beige or off-white is great for photos and warm afternoons. Black is the workhorse.

## What You Pair

- Tee + light chino or relaxed jeans
- Tee + open overshirt only in the evening
- Tee + shorts that do not end above mid-thigh

No five chains and a second print. One strong piece is enough.

## The MOSE Line

Our tees sit in the heavier segment on purpose. They are made to survive a summer season, not to look good for one festival weekend. Keep two or three in rotation. Wash at 30. Air dry. Done.`,
    category: 'style',
    tags: ['tee', 'zomer', 'gsm', 'pasvorm', 'streetwear', 'basics'],
    reading_time: 5,
    seo_title_nl: 'Zomer-Tee Gids: GSM, Pasvorm en Kleur | MOSE Blog',
    seo_title_en: 'Summer Tee Guide: GSM, Fit, and Color | MOSE Blog',
    seo_description_nl:
      'Welke GSM, pasvorm en kleur houden een tee heel door de Nederlandse zomer? Een directe gids van MOSE Groningen.',
    seo_description_en:
      'Which GSM, fit, and color keep a tee solid through a Dutch summer? A direct guide from MOSE Groningen.',
    published_at: '2026-06-02T08:00:00Z',
    featured_image_url: `${IMG}/categories/tees-desktop.webp`,
  },

  // ── 3. 9 Jun 2026 ───────────────────────────────────────────────
  {
    slug: 'mose-hoodie-maattabel-welke-maat-past',
    title_nl: 'MOSE Hoodie Maattabel: Welke Maat Past Echt',
    title_en: 'MOSE Hoodie Size Guide: Which Size Actually Fits',
    excerpt_nl:
      'Oversized is geen excuus voor de verkeerde maat. Zo lees je onze maten, wat je meet, en wanneer je een maat groter moet pakken.',
    excerpt_en:
      'Oversized is not an excuse for the wrong size. How to read our sizes, what to measure, and when to size up.',
    content_nl: `De meeste retouren in streetwear komen niet door slechte stof. Ze komen door gokken op maat. "Ik neem altijd M" werkt niet als elk merk een andere M heeft.

Hier is hoe je een MOSE hoodie past zonder gokwerk.

## Meet drie dingen

1. **Borstomtrek:** Meet onder de oksels, rondom, niet te strak.
2. **Schouderbreedte:** Van schouderpunt tot schouderpunt over je rug.
3. **Gewenste lengte:** Van nekbasis tot waar je de zoom wilt (heup of iets eronder).

Schrijf de cijfers op. Vergelijk met de maattabel op de productpagina. Niet met je favoriete H&M-hoodie uit 2019.

## Regular vs. oversized gevoel

MOSE hoodies vallen relaxed. Als je een strakke look wilt, blijf bij je gemeten maat. Wil je extra drop in de schouder en meer ruimte in de torso, ga één maat omhoog.

**Niet doen:** Twee maten omhoog "voor het oversized effect". Dan zwemt je erin en zie je eruit alsof je iemands jas leende.

## Lengte en mouwen

Een goede hoodie eindigt rond de heup, niet midden op je buik en niet half over je dij. Mouwen mogen tot de basis van je duim reiken als je armen hangen. Kortere mouwen bij een oversized torso ziet er scheef uit.

## Tussen twee maten?

- Meer torso-ruimte en laagjes eronder: groter
- Strakker silhouet, alleen tee eronder: kleiner
- Twijfel bij cadeau: groter. Te klein wordt niet gedragen.

## Was en krimp

Katoen kan licht inklinken bij verkeerd wassen. Was op 30, droog plat of hangend zonder droger. Dan blijft je gekozen maat dichter bij wat je kocht.

## De korte versie

Meet. Vergelijk. Kies relaxed of één maat omhoog voor extra space. Retourneer liever één keer goed dan drie keer gokken. Vragen over pasvorm? Mail of DM. We zitten in Groningen en kennen de stukken die we maken.`,
    content_en: `Most streetwear returns are not about bad fabric. They are about guessing size. "I always take M" fails when every brand has a different M.

Here is how to fit a MOSE hoodie without guessing.

## Measure Three Things

1. **Chest:** Under the arms, all the way around, not too tight.
2. **Shoulder width:** Point to point across your back.
3. **Desired length:** From base of neck to where you want the hem (hip or slightly below).

Write the numbers down. Compare to the size chart on the product page. Not to your favorite H&M hoodie from 2019.

## Regular vs. Oversized Feel

MOSE hoodies fit relaxed. If you want a cleaner look, stay with your measured size. If you want more shoulder drop and torso room, go one size up.

**Do not:** Jump two sizes "for the oversized effect." You will swim in it and look like you borrowed someone else's jacket.

## Length and Sleeves

A good hoodie ends around the hip, not mid-stomach and not halfway down the thigh. Sleeves can reach the base of your thumb when arms hang. Short sleeves with an oversized torso look off.

## Between Two Sizes?

- More torso room and layers underneath: larger
- Cleaner silhouette, tee only underneath: smaller
- Gift and unsure: larger. Too small does not get worn.

## Wash and Shrink

Cotton can ease in slightly with bad washing. Wash at 30, dry flat or hanging, no dryer. Then your chosen size stays closer to what you bought.

## The Short Version

Measure. Compare. Pick relaxed or one size up for extra space. Return once correctly instead of guessing three times. Fit questions? Mail or DM. We are in Groningen and know the pieces we make.`,
    category: 'style',
    tags: ['maattabel', 'hoodie', 'pasvorm', 'sizing', 'gids'],
    reading_time: 5,
    seo_title_nl: 'MOSE Hoodie Maattabel: Welke Maat Past | MOSE Blog',
    seo_title_en: 'MOSE Hoodie Size Guide: Which Size Fits | MOSE Blog',
    seo_description_nl:
      'Hoe je een MOSE hoodie past: meten, regular vs. oversized, en wat te doen tussen twee maten.',
    seo_description_en:
      'How to fit a MOSE hoodie: measuring, regular vs. oversized, and what to do between two sizes.',
    published_at: '2026-06-09T08:00:00Z',
    featured_image_url: `${PROD}/hoodie/multi/lineup-crop-desktop.webp`,
  },

  // ── 4. 16 Jun 2026 ──────────────────────────────────────────────
  {
    slug: 'groningen-zomer-streetwear-terrassen-grachten',
    title_nl: 'Groningen in de Zomer: Streetwear Tussen Terras en Gracht',
    title_en: 'Groningen in Summer: Streetwear Between Terrace and Canal',
    excerpt_nl:
      'Geen modeweek. Wel Noorderzon, terrassen vol, en mensen die eruitzien alsof ze hier wonen. Wat werkt in deze stad als het warm is.',
    excerpt_en:
      'No fashion week. Just Noorderzon, full terraces, and people who look like they live here. What works in this city when it is warm.',
    content_nl: `Groningen in juni en juli is geen Amsterdam-kopie. Minder toeristen-drukte, meer fietsers met een biertje in de tas, en een stad die 's avonds nog lang buiten blijft.

Streetwear hier hoeft niet te schreeuwen. Het moet meebewegen met grind, bruggen, en plotselinge buien.

## De daglook

Zware tee of lichte sweater, relaxed broek, sneakers die vies mogen worden. Dat is 80% van wat je op de Grote Markt ziet als het warm is. Logo's klein of afwezig. Kleur neutraal of één sterke tint (groen, bruin, zwart).

## Avond en wind

Als de zon achter de Martinitoren zakt, daalt de temperatuur. Een mid-weight hoodie over de arm of om de taille is geen pose. Het is praktisch. Zelfde geldt voor een sweater die je bij Noorderplantsoen weer aantrekt.

## Festivals en bunten

Noorderzon, terrassen, kleine podia. Pak stukken die je na middernacht nog wilt dragen: donkere tee, stevige sneakers, één laag die wind houdt. Laat de witte low-tops thuis als er gras of modder in het programma staat.

## Wat de stad zelf doet

Groningen heeft geen streetwear-hiërarchie zoals grotere steden. Mensen mixen sport, werk, en studie in één outfit. Dat is juist de charme. Je hoeft geen limited drop te dragen om erbij te horen. Je moet eruitzien alsof je ergens naartoe gaat, niet alsof je voor een spiegel poseert.

## De MOSE-hoek

Wij maken hier. De foto's, de stukken, de workshop. Als je door de stad loopt in iets van ons, is dat geen toeval-marketing. Het is dezelfde stof die we zelf testen op dezelfde kasseien.

Zomer in Groningen vraagt om minder lagen en meer keuzes die kloppen. Eén goede tee. Eén hoodie voor later. Sneakers die de brug overleven. Klaar.`,
    content_en: `Groningen in June and July is not an Amsterdam copy. Less tourist crush, more cyclists with a beer in the bag, and a city that stays outside late.

Streetwear here does not need to shout. It needs to move with gravel, bridges, and sudden showers.

## The Day Look

Heavy tee or light sweater, relaxed pants, sneakers that can get dirty. That is 80% of what you see on Grote Markt when it is warm. Logos small or absent. Color neutral or one strong tone (green, brown, black).

## Evening and Wind

When the sun drops behind the Martinitoren, the temperature falls. A mid-weight hoodie over the arm or around the waist is not a pose. It is practical. Same for a sweater you put back on at Noorderplantsoen.

## Festivals and Crowds

Noorderzon, terraces, small stages. Pack pieces you still want to wear after midnight: dark tee, solid sneakers, one layer that blocks wind. Leave the white low-tops at home if grass or mud is on the schedule.

## What the City Itself Does

Groningen has no streetwear hierarchy like bigger cities. People mix sport, work, and study in one outfit. That is the charm. You do not need a limited drop to belong. You need to look like you are going somewhere, not posing for a mirror.

## The MOSE Corner

We make here. The photos, the pieces, the workshop. If you walk through the city in something of ours, that is not accidental marketing. It is the same fabric we test on the same cobbles.

Summer in Groningen asks for fewer layers and more choices that fit. One good tee. One hoodie for later. Sneakers that survive the bridge. Done.`,
    category: 'groningen',
    tags: ['groningen', 'zomer', 'streetwear', 'noorderzon', 'cultuur'],
    reading_time: 5,
    seo_title_nl: 'Groningen in de Zomer: Streetwear Tussen Terras en Gracht | MOSE',
    seo_title_en: 'Groningen in Summer: Streetwear Between Terrace and Canal | MOSE',
    seo_description_nl:
      'Wat werkt als streetwear in Groningen als het warm is: daglook, avondwind, festivals, zonder toeristen-kostuum.',
    seo_description_en:
      'What works as streetwear in Groningen when it is warm: day look, evening wind, festivals, without a tourist costume.',
    published_at: '2026-06-16T08:00:00Z',
    featured_image_url: `${IMG}/about/groningen-desktop.webp`,
  },

  // ── 5. 23 Jun 2026 ──────────────────────────────────────────────
  {
    slug: 'lookbook-city-heat-hoe-we-schoten',
    title_nl: 'Lookbook City Heat: Hoe We in de Stad Schoten',
    title_en: 'Lookbook City Heat: How We Shot in the City',
    excerpt_nl:
      'Beton, licht, en weinig styling-trucjes. Achter de city-beelden van de photoshoot: waarom we de studio lieten voor wat de stad al had.',
    excerpt_en:
      'Concrete, light, and few styling tricks. Behind the city frames of the photoshoot: why we left the studio for what the city already had.',
    content_nl: `Voor de city-beelden wilden we geen set bouwen. Groningen heeft genoeg textuur: steen, graffiti, schaduw onder viaducten, licht dat hard is om 14:00.

We namen hoodies en tees mee die al in de lijn zaten. Geen props die je nooit in het echt ziet. Geen rookmachine. Wel mensen die kunnen staan alsof ze wachten op een vriend, niet alsof ze in een campagne zitten.

## Wat we zochten

Beweging zonder rennen. Een lach die niet geposeerd voelt. Stof die valt zoals hij valt als je fietst of leunt. Als een frame eruitzag als een stock-foto, schrapten we hem.

## Kledingkeuzes op set

Donkere en aardse tinten tegen grijs beton. Groen en bruin wonnen van puur zwart in sommige frames, omdat zwart alles opslokt bij fel middaglicht. Oversized bleef, maar niet zo groot dat je de schouders niet meer zag.

## Wat je als drager meeneemt

Lookbooks liegen soms. Dit deed dat minder. De stukken die je ziet, kun je zo bestellen. De locaties kun je zo langsfietsen. Dat was het punt: streetwear die eruitziet alsof hij hier thuishoort, omdat hij dat doet.

## Na de shoot

Selectie was streng. Liever tien sterke frames dan veertig halfslachtige. De city-reeks hing samen met de spring- en stone-beelden: één shoot, drie sferen, dezelfde hand.

Als je de lookbook-pagina opent, zie je geen fictieve stad. Je ziet een versie van Groningen die we kennen. Dat is genoeg.`,
    content_en: `For the city frames we did not want to build a set. Groningen has enough texture: stone, graffiti, shade under overpasses, light that is hard at 14:00.

We brought hoodies and tees already in the line. No props you never see in real life. No smoke machine. Just people who can stand like they are waiting for a friend, not like they are in a campaign.

## What We Looked For

Movement without running. A laugh that does not feel posed. Fabric that falls the way it falls when you bike or lean. If a frame looked like stock, we cut it.

## Clothing Choices on Set

Dark and earth tones against grey concrete. Green and brown beat pure black in some frames, because black swallows everything in hard midday light. Oversized stayed, but not so big you lost the shoulders.

## What You Take as a Wearer

Lookbooks sometimes lie. This one lied less. The pieces you see, you can order. The locations, you can bike past. That was the point: streetwear that looks like it belongs here, because it does.

## After the Shoot

Selection was strict. Better ten strong frames than forty weak ones. The city series sat with the spring and stone frames: one shoot, three moods, the same hand.

When you open the lookbook page, you do not see a fictional city. You see a version of Groningen we know. That is enough.`,
    category: 'behind-the-scenes',
    tags: ['lookbook', 'photoshoot', 'groningen', 'behind-the-scenes', 'city'],
    reading_time: 4,
    seo_title_nl: 'Lookbook City Heat: Hoe We in de Stad Schoten | MOSE',
    seo_title_en: 'Lookbook City Heat: How We Shot in the City | MOSE',
    seo_description_nl:
      'Achter de city-beelden van de MOSE photoshoot: locatie, licht, kledingkeuzes, en waarom de studio bleef dicht.',
    seo_description_en:
      'Behind the city frames of the MOSE photoshoot: location, light, clothing choices, and why the studio stayed closed.',
    published_at: '2026-06-23T08:00:00Z',
    featured_image_url: `${IMG}/lookbook/03-closing-desktop.webp`,
  },

  // ── 6. 30 Jun 2026 ──────────────────────────────────────────────
  {
    slug: 'midzomer-garderobe-5-stukken-nederland',
    title_nl: 'Midzomer-Garderobe: 5 Stukken Voor een Nederlandse Juli',
    title_en: 'Midsummer Wardrobe: 5 Pieces for a Dutch July',
    excerpt_nl:
      'Hittegolven, regenbuien, en avonden tot 12 graden. Vijf stukken die die mix overleven zonder dat je kast vol ligt.',
    excerpt_en:
      'Heat waves, rain showers, and evenings at 12 degrees. Five pieces that survive that mix without a packed closet.',
    content_nl: `Nederlandse midzomer is onbetrouwbaar. De ene week 32 graden, de volgende week jas weer nodig. Capsule thinking wint van "ik koop nog iets voor als het warm is."

Vijf stukken. Rotatie. Klaar.

## 1. Twee zware tees

Niet vijf dunne. Twee in 200+ GSM, donker en neutraal. Eén in rotatie, één in de was of aan het luchten. Dat dekt werk, terras, en weekend.

## 2. Eén mid-weight hoodie

Voor avonden, airco, en treinen. Niet je zwaarste winterstuk. Wel genoeg GSM om wind te houden. Om de taille of in de tas is geen modefout. Het is Nederland.

## 3. Eén lichte sweater

Dunner dan de hoodie, dikker dan de tee. Perfect voor 18 tot 22 graden met bewolking. Off-white of zwart. Geen print die schreeuwt tenzij dat jouw ding is.

## 4. Eén broek die alles doet

Relaxed jeans of chino in donker of steen. Geen skinny die je bij hitte haat. Geen shorts-only strategie: je hebt die broek nodig voor regen en avond.

## 5. Sneakers die regen vergeven

Donker, gesloten, geen suède dat huilt bij de eerste bui. Eén paar dat je elke dag kunt pakken.

## Wat je niet nodig hebt

Een vijfde print-tee. Een festivalhoed die je één keer draagt. Drie jassen "voor zekerheid". Midzomer vraagt om herhaling van goede stukken, niet om volume.

MOSE dekt tee, hoodie, en sweater. De rest haal je waar je pastvorm en prijs vertrouwt. Minder stukken, vaker goed. Dat is de hele truc.`,
    content_en: `Dutch midsummer is unreliable. One week 32 degrees, the next week you need a jacket again. Capsule thinking beats "I will buy one more thing for when it is hot."

Five pieces. Rotation. Done.

## 1. Two Heavy Tees

Not five thin ones. Two at 200+ GSM, dark and neutral. One in rotation, one washing or airing. That covers work, terrace, and weekend.

## 2. One Mid-Weight Hoodie

For evenings, aircon, and trains. Not your heaviest winter piece. Enough GSM to block wind. Around the waist or in the bag is not a fashion mistake. It is the Netherlands.

## 3. One Light Sweater

Thinner than the hoodie, thicker than the tee. Perfect for 18 to 22 degrees with cloud. Off-white or black. No loud print unless that is your thing.

## 4. One Pair of Pants That Does Everything

Relaxed jeans or chino in dark or stone. No skinny you hate in heat. No shorts-only plan: you need those pants for rain and evening.

## 5. Sneakers That Forgive Rain

Dark, closed, no suede that cries at the first shower. One pair you can grab every day.

## What You Do Not Need

A fifth print tee. A festival hat you wear once. Three jackets "just in case." Midsummer asks for repetition of good pieces, not volume.

MOSE covers tee, hoodie, and sweater. The rest you get where you trust fit and price. Fewer pieces, worn well. That is the whole trick.`,
    category: 'style',
    tags: ['zomer', 'capsule', 'garderobe', 'basics', 'juli'],
    reading_time: 5,
    seo_title_nl: 'Midzomer-Garderobe: 5 Stukken Voor Nederlandse Juli | MOSE',
    seo_title_en: 'Midsummer Wardrobe: 5 Pieces for a Dutch July | MOSE',
    seo_description_nl:
      'Vijf stukken die hitte, regen en koele avonden in juli overleven. Een strakke midzomer-capsule van MOSE.',
    seo_description_en:
      'Five pieces that survive heat, rain, and cool evenings in July. A tight midsummer capsule from MOSE.',
    published_at: '2026-06-30T08:00:00Z',
    featured_image_url: `${IMG}/homepage/story-desktop.webp`,
  },

  // ── 7. 7 Jul 2026 ───────────────────────────────────────────────
  {
    slug: 'minder-kopen-vaker-dragen-zonder-preken',
    title_nl: 'Minder Kopen, Vaker Dragen: Zonder Preken',
    title_en: 'Buy Less, Wear More: Without the Lecture',
    excerpt_nl:
      'Geen schuldgevoel-marketing. Wel een simpele rekensom: wat je vaak draagt, is goedkoop. Wat je één keer draagt, is duur.',
    excerpt_en:
      'No guilt marketing. Just a simple sum: what you wear often is cheap. What you wear once is expensive.',
    content_nl: `Duurzaamheid-praat in mode klinkt vaak als een preek. Wij doen het anders. Het gaat om geld, gemak, en kleding die je niet haat na drie maanden.

## Cost per wear, kort

Een hoodie van 90 euro die je 90 keer draagt kost 1 euro per keer. Een hoodie van 30 euro die je 6 keer draagt kost 5 euro per keer. De "dure" wint.

## Wat "minder kopen" echt betekent

Niet: nooit iets nieuws. Wel: stoppen met kopen uit verveling, uit sale-paniek, of omdat een reel het zei. Eén sterk stuk per seizoen klopt vaker dan vijf zwakke.

## Fast fashion is niet alleen ethiek

Het is ook slechte pasvorm, slechte stof, en tijd kwijt aan retouren. Als je daar genoeg van hebt, ben je al halverwege. De planeet is een bonus, niet de enige reden.

## Praktische filters voor je volgende aankoop

- Draag ik dit met minstens drie dingen die ik al heb?
- Zou ik dit full price ook willen, of alleen omdat het in de sale is?
- Past de stof bij hoe ik echt leef (fiets, weer, wasmachine)?

Nee op twee van drie? Laat liggen.

## Wat MOSE ermee te maken heeft

We maken weinig SKUs met opzet. Geen wekelijkse micro-drops die je FOMO moeten geven. Wel stukken die een seizoen of vijf moeten kunnen. Als dat saai klinkt: goed. Saai is vaak wat je overhoudt in je kast.

Minder kopen is geen identiteit. Het is een gewoonte. Begin met de volgende keer dat je bijna iets in je mandje gooit "voor later."`,
    content_en: `Sustainability talk in fashion often sounds like a sermon. We do it differently. It is about money, ease, and clothes you do not hate after three months.

## Cost per Wear, Short

A 90-euro hoodie you wear 90 times costs 1 euro per wear. A 30-euro hoodie you wear 6 times costs 5 euros per wear. The "expensive" one wins.

## What "Buy Less" Really Means

Not: never buy anything new. Yes: stop buying out of boredom, sale panic, or because a reel said so. One strong piece per season beats five weak ones more often.

## Fast Fashion Is Not Only Ethics

It is also bad fit, bad fabric, and time lost on returns. If you are done with that, you are already halfway. The planet is a bonus, not the only reason.

## Practical Filters for Your Next Buy

- Will I wear this with at least three things I already own?
- Would I want this at full price, or only because it is on sale?
- Does the fabric match how I actually live (bike, weather, washing machine)?

No on two of three? Leave it.

## What MOSE Has to Do With It

We make few SKUs on purpose. No weekly micro-drops meant to trigger FOMO. Pieces that should handle a season or five. If that sounds boring: good. Boring is often what stays in your closet.

Buying less is not an identity. It is a habit. Start with the next time you almost drop something in your cart "for later."`,
    category: 'sustainability',
    tags: ['duurzaamheid', 'cost-per-wear', 'fast-fashion', 'capsule', 'minder-kopen'],
    reading_time: 5,
    seo_title_nl: 'Minder Kopen, Vaker Dragen: Zonder Preken | MOSE Blog',
    seo_title_en: 'Buy Less, Wear More: Without the Lecture | MOSE Blog',
    seo_description_nl:
      'Cost per wear zonder schuldgevoel. Waarom minder en beter kopen goedkoper is, uitgelegd door MOSE Groningen.',
    seo_description_en:
      'Cost per wear without the guilt trip. Why buying less and better is cheaper, explained by MOSE Groningen.',
    published_at: '2026-07-07T08:00:00Z',
    featured_image_url: `${IMG}/about/story-desktop.webp`,
  },

  // ── 8. 14 Jul 2026 ──────────────────────────────────────────────
  {
    slug: 'oversized-tee-stylen-zomer-zonder-zwemmen',
    title_nl: 'Oversized Tee Stylen in de Zomer Zonder Te Zwemmen in Stof',
    title_en: 'Styling an Oversized Tee in Summer Without Swimming in Fabric',
    excerpt_nl:
      'Oversized is een silhouet, geen vrijbrief. Zo houd je volume onder controle als het warm is.',
    excerpt_en:
      'Oversized is a silhouette, not a free pass. How to keep volume under control when it is warm.',
    content_nl: `Een oversized tee in juli kan er scherp uitzien. Of als een nachthemd. Het verschil zit in verhoudingen, niet in het logo op de borst.

## De schouderlijn

De naad mag iets over je schouder vallen. Niet tot halverwege je bovenarm. Als je de mouwnaad niet meer ziet zonder te zoeken, is hij te groot.

## Lengte

Zoom rond het midden van de broekzak of iets lager. Langer dan dat vraagt om inkorten of een andere maat. In combinatie met shorts: iets korter houdt het fris. Met lange broek: iets langer mag.

## Wat eronder en ernaast

- Relaxed of straight broek, niet skinny die alles strak trekt onderaan
- Shorts met genoeg lengte zodat de tee niet alles bedekt
- Geen tweede oversized laag erover in de hitte

## Mouwen

Korte mouwen die tot midden bovenarm vallen. Te wijd én te lang maakt je armen zoek. Opslaan van de zoom is een optie als de tee net te lang is en je hem echt wilt houden.

## Kleur en print

Eén statement. Rest neutraal. Een oversized tee met groot artwork wil rust eromheen: donkere broek, simpele sneakers, klaar.

## De warmte-check

Als de stof plakt en wappert tegelijk, is hij te dun én te wijd. Ga voor zwaarder katoen in een gecontroleerde oversized maat. Dat is cooler dan een zak van 140 GSM.

MOSE tees zijn gemaakt met die balans in gedachten. Pak je maat of één omhoog, niet twee. Zomervolume moet eruitzien alsof je het koos, niet alsof je geen spiegel had.`,
    content_en: `An oversized tee in July can look sharp. Or like a nightshirt. The difference is proportion, not the logo on the chest.

## The Shoulder Line

The seam can drop a little past your shoulder. Not halfway down your upper arm. If you cannot find the sleeve seam without hunting, it is too big.

## Length

Hem around mid-pocket or slightly lower. Longer than that wants a hem or another size. With shorts: slightly shorter stays fresher. With long pants: a bit longer is fine.

## What Goes With It

- Relaxed or straight pants, not skinny that tightens everything below
- Shorts with enough length so the tee does not cover everything
- No second oversized layer on top in the heat

## Sleeves

Short sleeves that end mid upper arm. Too wide and too long makes your arms disappear. Rolling the hem is an option if the tee is just too long and you really want to keep it.

## Color and Print

One statement. Rest neutral. An oversized tee with big artwork wants calm around it: dark pants, simple sneakers, done.

## The Heat Check

If the fabric sticks and flaps at once, it is too thin and too wide. Go heavier cotton in a controlled oversized size. That is cooler than a 140 GSM sack.

MOSE tees are built with that balance in mind. Take your size or one up, not two. Summer volume should look chosen, not like you had no mirror.`,
    category: 'style',
    tags: ['tee', 'oversized', 'styling', 'zomer', 'pasvorm'],
    reading_time: 5,
    seo_title_nl: 'Oversized Tee Stylen in de Zomer | MOSE Blog',
    seo_title_en: 'Styling an Oversized Tee in Summer | MOSE Blog',
    seo_description_nl:
      'Hoe je een oversized tee scherp houdt in de hitte: schouders, lengte, broek, en stofgewicht.',
    seo_description_en:
      'How to keep an oversized tee sharp in the heat: shoulders, length, pants, and fabric weight.',
    published_at: '2026-07-14T08:00:00Z',
    featured_image_url: `${PROD}/tee/multi/duo-canal-desktop.webp`,
  },

  // ── 9. 21 Jul 2026 ──────────────────────────────────────────────
  {
    slug: 'zomeravond-sweater-licht-lagen',
    title_nl: 'Zomeravond-Sweater: Licht Lagen Als de Temperatuur Zakt',
    title_en: 'Summer-Evening Sweater: Light Layers When the Temperature Drops',
    excerpt_nl:
      'Juli-avonden in het noorden zijn geen tropennacht. Een lichte sweater redt meer outfits dan een tweede tee.',
    excerpt_en:
      'July evenings in the north are not tropical nights. A light sweater saves more outfits than a second tee.',
    content_nl: `Overdag 26 graden. Om 22:00 in het plantsoen 15. Dat is geen uitzondering in Groningen. Wie alleen in een tee naar buiten gaat, leent halverwege de avond iemands jas.

Een lichte sweater is de ontbrekende laag tussen tee en hoodie.

## Wanneer sweater, wanneer hoodie

- **Sweater:** 16 tot 22 graden, droog, terras, korte fietsrit
- **Hoodie:** wind, later op de avond, langere tijd stilzitten buiten

De sweater is schoner in silhouet. De hoodie is praktischer bij echt weer.

## Hoe je hem draagt in juli

Over een tee, niet als enige huidlaag als je snel warm wordt. Mouwen normaal of één keer licht gerold. Kleur: off-white, zwart, of steen. Past bij de tees die je overdag al droeg.

## Combinaties die kloppen

- Sweater + relaxed jeans + sneakers
- Sweater over tee + chino
- Sweater knoop of draperie om de schouders alleen als het echt warm blijft. Anders gewoon aantrekken.

## Stof

Te dun en hij pilt of trekt scheef. Te dik en je zweet op weg naar buiten. Zoek middengewicht jersey of french terry die nog ademt. Geen winterknit in juli.

## Waarom dit geen "extra aankoop" is

Diezelfde sweater werkt in september en april opnieuw. Hij is geen zomer-gadget. Hij is een seizoensbrug. Bij MOSE zit de sweater-lijn precies daar: genoeg aanwezigheid voor avondlucht, niet te zwaar voor een warme start.

Pak er één die bij je twee favoriete tees past. Dan heb je de helft van je zomeravonden al opgelost.`,
    content_en: `26 degrees by day. 15 at 22:00 in the park. That is not rare in Groningen. Anyone who leaves in only a tee borrows someone's jacket halfway through the evening.

A light sweater is the missing layer between tee and hoodie.

## When Sweater, When Hoodie

- **Sweater:** 16 to 22 degrees, dry, terrace, short bike ride
- **Hoodie:** wind, later at night, sitting still outside longer

The sweater is cleaner in silhouette. The hoodie is more practical in real weather.

## How to Wear It in July

Over a tee, not as the only skin layer if you run warm. Sleeves normal or lightly rolled once. Color: off-white, black, or stone. Matches the tees you already wore by day.

## Combinations That Work

- Sweater + relaxed jeans + sneakers
- Sweater over tee + chino
- Sweater knotted or draped on shoulders only if it stays truly warm. Otherwise just put it on.

## Fabric

Too thin and it pills or pulls crooked. Too thick and you sweat on the way out. Look for midweight jersey or french terry that still breathes. No winter knit in July.

## Why This Is Not an "Extra Buy"

That same sweater works again in September and April. It is not a summer gadget. It is a season bridge. At MOSE the sweater line sits exactly there: enough presence for evening air, not too heavy for a warm start.

Pick one that matches your two favorite tees. Then half your summer evenings are already solved.`,
    category: 'style',
    tags: ['sweater', 'zomer', 'laagjes', 'avond', 'styling'],
    reading_time: 5,
    seo_title_nl: 'Zomeravond-Sweater: Licht Lagen | MOSE Blog',
    seo_title_en: 'Summer-Evening Sweater: Light Layers | MOSE Blog',
    seo_description_nl:
      'Wanneer een lichte sweater beter is dan een tweede tee of een volle hoodie op Nederlandse zomeravonden.',
    seo_description_en:
      'When a light sweater beats a second tee or a full hoodie on Dutch summer evenings.',
    published_at: '2026-07-21T08:00:00Z',
    featured_image_url: `${PROD}/sweater/off-white/lifestyle-arch-smile-desktop.webp`,
  },

  // ── 10. 28 Jul 2026 ─────────────────────────────────────────────
  {
    slug: 'zomer-wasbeurten-zweet-geur-katoen',
    title_nl: 'Zomer-Wasbeurten: Zweet, Geur en Katoen Die Je Niet Sloopt',
    title_en: 'Summer Washes: Sweat, Smell, and Cotton You Do Not Ruin',
    excerpt_nl:
      'Juli betekent vaker wassen. Niet agressiever wassen. Zo houd je tees en hoodies fris zonder de stof te verbranden.',
    excerpt_en:
      'July means washing more often. Not washing harder. How to keep tees and hoodies fresh without burning the fabric.',
    content_nl: `Zomer is hard voor katoen. Zweet, zonnebrand, deodorant, en de neiging om alles op 60 te gooien "zodat het echt schoon is." Dat laatste is waar goede stukken doodgaan.

## Was wanneer het moet

- Tee na een warme dag: ja
- Hoodie die alleen 's avonds aan was: vaak nee, eerst luchten
- Geur die blijft na luchten: wassen, niet parfum erover

## Temperatuur

30°C voor bijna alles. 40°C alleen bij echte viezigheid. 60°C is voor handdoeken en beddengoed, niet voor je favoriete zwarte tee.

## Binnenstebuiten

Prints, puff, en donkere kleuren: binnenstebuiten in de trommel. Minder wrijving, minder vaal.

## Geen droger in de hitte

Hang buiten in de schaduw. Directe zon bleekt zwart en khaki sneller dan je denkt. Hoodies plat of gevouwen over het rek, niet aan één punt hangend tot ze uitrekken.

## Zweetvlekken onder de oksel

Niet inwrijven met heet water. Koud spoelen, milde zeep, even laten zitten, dan normale was. Bakpoeder-mythes kun je overslaan als je er snel bij bent.

## Rotatie redt wasmachines

Twee tees in omloop betekent dat geen enkele tee elke dag de trommel in moet. Minder wasbeurten per stuk is meer levensduur. Dat is saaier dan een life hack, en het werkt beter.

MOSE-katoen is gemaakt om gewassen te worden. Niet om gemarteld te worden. Behandel het als iets wat je over vijf zomers nog wilt dragen.`,
    content_en: `Summer is hard on cotton. Sweat, sunscreen, deodorant, and the urge to run everything at 60 "so it is really clean." That last part is where good pieces die.

## Wash When You Need To

- Tee after a hot day: yes
- Hoodie that only came out in the evening: often no, air it first
- Smell that stays after airing: wash, do not perfume over it

## Temperature

30°C for almost everything. 40°C only for real dirt. 60°C is for towels and bedding, not your favorite black tee.

## Inside Out

Prints, puff, and dark colors: inside out in the drum. Less friction, less fade.

## No Dryer in the Heat

Hang outside in the shade. Direct sun bleaches black and khaki faster than you think. Hoodies flat or folded over the rack, not hanging from one point until they stretch.

## Underarm Sweat Marks

Do not rub with hot water. Cold rinse, mild soap, let it sit, then a normal wash. Skip baking-soda myths if you catch it early.

## Rotation Saves Machines

Two tees in rotation means no single tee hits the drum every day. Fewer washes per piece means more lifespan. That is duller than a life hack, and it works better.

MOSE cotton is made to be washed. Not tortured. Treat it like something you still want to wear five summers from now.`,
    category: 'sustainability',
    tags: ['onderhoud', 'wassen', 'zomer', 'katoen', 'tee', 'hoodie'],
    reading_time: 5,
    seo_title_nl: 'Zomer-Wasbeurten: Zweet en Katoen Onderhoud | MOSE',
    seo_title_en: 'Summer Washes: Sweat and Cotton Care | MOSE',
    seo_description_nl:
      'Hoe je tees en hoodies in de zomer wast zonder stof, kleur of print te slopen. Praktische tips van MOSE.',
    seo_description_en:
      'How to wash tees and hoodies in summer without wrecking fabric, color, or print. Practical tips from MOSE.',
    published_at: '2026-07-28T08:00:00Z',
    featured_image_url: `${PROD}/hoodie/bruin/detail-drape-desktop.webp`,
  },

  // ── 11. 4 Aug 2026 ──────────────────────────────────────────────
  {
    slug: 'late-zomer-naar-vroege-herfst-overgangskleding',
    title_nl: 'Van Late Zomer naar Vroege Herfst: Overgangskleding Die Klopt',
    title_en: 'From Late Summer to Early Autumn: Transitional Pieces That Work',
    excerpt_nl:
      "Augustus kantelt. Overdag nog warm, 's ochtends al fris. Dit zijn de stukken die beide kanten van de maand overbruggen.",
    excerpt_en:
      'August tips over. Still warm by day, already cool in the morning. These are the pieces that bridge both sides of the month.',
    content_nl: `Begin augustus voelt nog als zomer. Eind augustus ruikt naar schooltassen en nat asfalt. Je kast moet die draai meemaken zonder dat je alles opnieuw koopt.

## Houd vast uit de zomer

- Zware tees (blijven tot oktober onder een laag)
- Lichte sweater
- Donkere sneakers

## Haal naar voren uit de herfst-hoek

- Mid-weight hoodie als dagelijkse buitenlaag
- Iets zwaardere broek (minder linen-achtig, meer denim of twill)
- Optioneel: een simpele coach jacket of overshirt voor regenachtige dagen

## De ochtend-avond truc

Ochtend: hoodie of sweater aan. Middag: uit of open. Avond: weer aan. Zelfde outfit, drie temperaturen. Dat is augustus in één zin.

## Kleuren verschuiven mee

Zomerbeige mag blijven, maar bruin, zwart, en groen nemen weer meer ruimte. Niet omdat trends dat zeggen. Omdat viezigheid en kortere dagen die kleuren vergeven.

## Wat je niet hoeft te doen

Winterjassen in week één van augustus. Nieuwe "herfstcollectie" van tien stuks. Eén goede hoodie plus wat je al had, dekt 90% van de overgang.

Bij MOSE is dat precies de zone waar hoodie en sweater elkaar raken. Koop niet voor een seizoen dat nog zes weken weg is. Koop voor de week die je nu buiten doorbrengt.`,
    content_en: `Early August still feels like summer. Late August smells like school bags and wet asphalt. Your closet has to make that turn without buying everything again.

## Keep From Summer

- Heavy tees (they stay through October under a layer)
- Light sweater
- Dark sneakers

## Pull Forward From the Autumn Corner

- Mid-weight hoodie as the daily outer layer
- Slightly heavier pants (less linen-like, more denim or twill)
- Optional: a simple coach jacket or overshirt for rainy days

## The Morning-Evening Trick

Morning: hoodie or sweater on. Afternoon: off or open. Evening: on again. Same outfit, three temperatures. That is August in one sentence.

## Colors Shift With You

Summer beige can stay, but brown, black, and green take more room again. Not because trends say so. Because dirt and shorter days forgive those colors.

## What You Do Not Need to Do

Winter coats in week one of August. A new "autumn collection" of ten pieces. One good hoodie plus what you already had covers 90% of the transition.

At MOSE that is exactly where hoodie and sweater meet. Do not buy for a season that is still six weeks away. Buy for the week you are spending outside now.`,
    category: 'style',
    tags: ['herfst', 'zomer', 'laagjes', 'hoodie', 'overgang', 'garderobe'],
    reading_time: 5,
    seo_title_nl: 'Late Zomer naar Vroege Herfst: Overgangskleding | MOSE',
    seo_title_en: 'Late Summer to Early Autumn: Transitional Pieces | MOSE',
    seo_description_nl:
      'Welke stukken augustus overbruggen van warme middagen naar frisse ochtenden. Een korte overgangsgids van MOSE.',
    seo_description_en:
      'Which pieces bridge August from warm afternoons to cool mornings. A short transition guide from MOSE.',
    published_at: '2026-08-04T08:00:00Z',
    featured_image_url: `${PROD}/hoodie/zwart/hero-concrete-desktop.webp`,
  },

  // ── 12. 7 Aug 2026 ──────────────────────────────────────────────
  {
    slug: 'drops-vs-rustig-kopen-mose-aanpak',
    title_nl: 'Drops vs. Rustig Kopen: Hoe MOSE Erover Denkt',
    title_en: 'Drops vs. Buying Calmly: How MOSE Sees It',
    excerpt_nl:
      'Hypedrops trainen je om te haasten. Wij trainen liever het tegenovergestelde: weten wat je wilt, dan kopen.',
    excerpt_en:
      'Hype drops train you to rush. We prefer the opposite: know what you want, then buy.',
    content_nl: `Streetwear groeide op met drops: tijdstip, wachtrij, uitverkocht in acht minuten. Soms is dat energie. Vaak is het stress verkocht als cultuur.

## Wat een drop doet met je hoofd

Je koopt sneller dan je nadenkt. Maat gokken. Kleur die je niet wilde. Spijt na twee weken. De "win" was het bemachtigen, niet het dragen.

## Wat wij liever doen

Voorraad die er een tijd mag liggen. Maten die je kunt checken. Foto's van echte stof, niet alleen van schaarste. Als iets weg is, komt er een herrestock of een volgende run. Geen theater alsof de wereld vergaat.

## Wanneer een drop wél zin heeft

Beperkte kleur, samenwerking, of een klein experiment: prima. Zolang het product daarna nog gedragen wordt, niet alleen gefotografeerd bij de brievenbus.

## Hoe jij kalmer koopt

- Zet een reminder voor jezelf, niet voor paniek
- Check maat en stofbeschrijving voor je betaalt
- Vraag: draag ik dit over drie maanden nog?
- Scroll weg als de enige pitch "bijna weg" is

## Groningen-tempo

Wij zitten niet in een hype-district. We zitten in een stad waar mensen fietsen naar werk en in het weekend hetzelfde stuk opnieuw aantrekken. Die realiteit past slecht bij kunstmatige schaarste. Wel bij kleding die op voorraad mag zijn tot jij er klaar voor bent.

Koop als het klopt. Niet omdat de timer op nul staat.`,
    content_en: `Streetwear grew up on drops: a clock, a queue, sold out in eight minutes. Sometimes that is energy. Often it is stress sold as culture.

## What a Drop Does to Your Head

You buy faster than you think. Guess the size. Pick a color you did not want. Regret after two weeks. The "win" was getting it, not wearing it.

## What We Prefer

Stock that can sit for a while. Sizes you can check. Photos of real fabric, not only of scarcity. If something is gone, there is a restock or a next run. No theater like the world is ending.

## When a Drop Does Make Sense

Limited color, a collab, or a small experiment: fine. As long as the product gets worn after, not only photographed at the mailbox.

## How You Buy Calmer

- Set a reminder for yourself, not for panic
- Check size and fabric notes before you pay
- Ask: will I still wear this in three months?
- Scroll away if the only pitch is "almost gone"

## Groningen Pace

We are not in a hype district. We are in a city where people bike to work and wear the same piece again on the weekend. That reality fits poorly with fake scarcity. It fits clothing that can stay in stock until you are ready.

Buy when it fits. Not because the timer hit zero.`,
    category: 'behind-the-scenes',
    tags: ['drops', 'mose', 'kopen', 'streetwear', 'groningen', 'restock'],
    reading_time: 4,
    seo_title_nl: 'Drops vs. Rustig Kopen: De MOSE-Aanpak | MOSE Blog',
    seo_title_en: 'Drops vs. Buying Calmly: The MOSE Approach | MOSE Blog',
    seo_description_nl:
      'Waarom MOSE geen paniek-drops jaagt en wat dat betekent voor hoe jij beter koopt.',
    seo_description_en:
      'Why MOSE does not chase panic drops and what that means for how you buy better.',
    published_at: '2026-08-07T08:00:00Z',
    featured_image_url: `${PROD}/hoodie/multi/trio-smile-line-desktop.webp`,
  },
]

async function upsertPost(post: PostInput): Promise<void> {
  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(
      {
        slug: post.slug,
        title_nl: post.title_nl,
        title_en: post.title_en,
        excerpt_nl: post.excerpt_nl,
        excerpt_en: post.excerpt_en,
        content_nl: post.content_nl,
        content_en: post.content_en,
        category: post.category,
        tags: post.tags,
        reading_time: post.reading_time,
        seo_title_nl: post.seo_title_nl,
        seo_title_en: post.seo_title_en,
        seo_description_nl: post.seo_description_nl,
        seo_description_en: post.seo_description_en,
        published_at: post.published_at,
        featured_image_url: post.featured_image_url,
        author: 'MOSE',
        status: 'published',
      },
      { onConflict: 'slug' },
    )
    .select('id, slug, title_nl, published_at, status, category')
    .single()

  if (error) {
    console.error(`FAIL ${post.slug}: ${error.message}`)
    process.exitCode = 1
    return
  }
  console.log(`OK ${data?.slug}  (${data?.published_at?.slice(0, 10)}, ${data?.category})`)
}

async function main() {
  console.log(`Seeding ${POSTS.length} MOSE blog posts (summer 2026 window)...\n`)
  for (const post of POSTS) {
    // Spot-check: refuse to write em dashes
    const blob = [
      post.title_nl,
      post.title_en,
      post.excerpt_nl,
      post.excerpt_en,
      post.content_nl,
      post.content_en,
      post.seo_title_nl,
      post.seo_title_en,
      post.seo_description_nl,
      post.seo_description_en,
    ].join('\n')
    if (blob.includes('\u2014')) {
      console.error(`Em dash found in ${post.slug}`)
      process.exit(1)
    }
    await upsertPost(post)
  }
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
