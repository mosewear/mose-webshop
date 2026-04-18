import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BlogPost {
  slug: string
  title_nl: string
  title_en: string
  content_nl: string
  content_en: string
  excerpt_nl: string
  excerpt_en: string
  featured_image_url: string | null
  category: string
  tags: string[]
  status: 'published'
  author: string
  reading_time: number
  seo_title_nl: string
  seo_title_en: string
  seo_description_nl: string
  seo_description_en: string
  published_at: string
}

const posts: BlogPost[] = [
  // ============================================================
  // ARTICLE 1, December 5, 2025
  // ============================================================
  {
    slug: 'waarom-fast-fashion-kapot-is',
    title_nl: 'Waarom Fast Fashion Kapot Is (En Wat Jij Eraan Kunt Doen)',
    title_en: 'Why Fast Fashion Is Broken (And What You Can Do About It)',
    excerpt_nl: 'Elke seconde wordt een vrachtwagen aan kleding verbrand of gedumpt. Dit is het verhaal achter de kleding die je draagt, en hoe je betere keuzes kunt maken.',
    excerpt_en: 'Every second, a truckload of clothing is burned or dumped. This is the story behind the clothes you wear, and how you can make better choices.',
    category: 'sustainability',
    tags: ['fast fashion', 'duurzaamheid', 'bewust kopen', 'kledingverspilling'],
    author: 'MOSE',
    reading_time: 8,
    published_at: '2025-12-05T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Fast Fashion: Waarom Het Kapot Is en Wat Je Kunt Doen | MOSE Blog',
    seo_title_en: 'Why Fast Fashion Is Broken and What You Can Do | MOSE Blog',
    seo_description_nl: 'Ontdek waarom fast fashion niet alleen slecht is voor het milieu, maar ook voor jouw portemonnee. Leer hoe je bewuster kleding koopt die langer meegaat.',
    seo_description_en: 'Discover why fast fashion is bad for the environment and your wallet. Learn how to buy clothes more consciously that last longer.',
    content_nl: `De cijfers liegen er niet om. De kledingindustrie is verantwoordelijk voor 10% van alle mondiale CO2-uitstoot, meer dan alle internationale vluchten en scheepvaart samen. En het wordt alleen maar erger.

## Het probleem in cijfers

Elke seconde wordt het equivalent van een vrachtwagen aan kleding verbrand of gestort. De gemiddelde Nederlander koopt 46 kledingstukken per jaar, draagt ze gemiddeld zeven keer, en gooit ze dan weg. Laten die cijfers even bezinken.

In 2000 produceerden we wereldwijd 50 miljard kledingstukken per jaar. In 2025 zijn dat er meer dan 150 miljard. De wereldbevolking is in die tijd niet verdrievoudigd, onze consumptie wel.

## Waarom is kleding zo goedkoop geworden?

De reden dat je een T-shirt kunt kopen voor vijf euro is simpel: iemand anders betaalt de werkelijke prijs. Dat zijn de arbeiders in fabrieken in Bangladesh, Myanmar of Ethiopië die voor hongerloontjes werken. Dat is het milieu dat de chemische verfstoffen en microplastics absorbeert. En uiteindelijk ben jij het zelf, want goedkope kleding gaat niet lang mee, dus koop je steeds opnieuw.

Fast fashion merken brengen wekelijks nieuwe collecties uit. Het doel is niet om kleding te maken die je lang draagt. Het doel is om je zo snel mogelijk terug in de winkel te krijgen. Het is een verdienmodel gebouwd op wegwerpcultuur.

## De verborgen kosten van een goedkoop T-shirt

Laten we een concreet voorbeeld nemen. Een basis T-shirt van vijf euro bij een fast fashion keten. Dit is waar je geld naartoe gaat:

- Katoen (vaak niet biologisch): €0,80
- Productie en arbeid: €0,50
- Transport: €0,30
- Marge winkel: €2,50
- Marketing en overhead: €0,90

Die €0,50 voor productie en arbeid. Daar zitten uren werk in van echte mensen. De kwaliteit van het materiaal en de afwerking? Het absolute minimum om het kledingstuk één wasbeurt te laten overleven.

## Wat kun je eraan doen?

Het goede nieuws: je hoeft je garderobe niet van de ene op de andere dag te veranderen. Kleine, bewuste keuzes maken al een enorm verschil.

**Koop minder, kies beter.** Dit is de simpelste en meest effectieve stap. Voordat je iets koopt, stel jezelf de vraag: ga ik dit minstens 30 keer dragen? Zo niet, laat het hangen.

**Investeer in kwaliteit.** Een hoodie van €89 die vijf jaar meegaat kost je €17,80 per jaar. Een hoodie van €25 die na zes maanden uit elkaar valt kost je €50 per jaar. Kwaliteit is goedkoper.

**Kies lokaal en transparant.** Weet waar je kleding vandaan komt. Vraag merken naar hun productieproces. Hoe korter de keten, hoe beter je kunt controleren wat er gebeurt.

**Onderhoud je kleding.** Was op 30 graden, droog aan de lijn, repareer kleine scheurtjes. Je kleding gaat langer mee dan je denkt als je er goed voor zorgt.

**Tweedehands is geen schande.** Vintage en tweedehands winkels zijn een goudmijn voor unieke stukken. En het is de meest duurzame manier van kopen die er is.

## Waarom wij dit anders doen

Bij MOSE produceren we lokaal in Groningen. Niet omdat het goedkoper is. Dat is het absoluut niet. Maar omdat we willen weten wie onze kleding maakt, onder welke omstandigheden, en met welke materialen.

Onze hoodies, T-shirts en caps zijn ontworpen om jarenlang mee te gaan. Geen seizoenscollecties die je na drie maanden vergeten bent. Geen kunstmatige schaarste om je onder druk te zetten. Gewoon eerlijke kleding die goed zit, goed eruitziet, en lang meegaat.

Het is niet de goedkoopste optie. Maar het is wel de eerlijkste.`,

    content_en: `The numbers don't lie. The clothing industry is responsible for 10% of all global CO2 emissions, more than all international flights and shipping combined. And it's only getting worse.

## The Problem in Numbers

Every second, the equivalent of a garbage truck of clothing is burned or dumped. The average European buys 26 kilograms of textiles per year and discards 11 kilograms. Let those numbers sink in.

In 2000, we produced 50 billion garments worldwide per year. In 2025, that number exceeds 150 billion. The world population hasn't tripled in that time, our consumption has.

## Why Has Clothing Become So Cheap?

The reason you can buy a T-shirt for five euros is simple: someone else is paying the real price. That's the workers in factories in Bangladesh, Myanmar, or Ethiopia earning starvation wages. It's the environment absorbing chemical dyes and microplastics. And ultimately, it's you, because cheap clothing doesn't last, so you keep buying again.

Fast fashion brands release new collections weekly. The goal isn't to make clothing you'll wear for years. The goal is to get you back in the store as quickly as possible. It's a business model built on throwaway culture.

## The Hidden Costs of a Cheap T-shirt

Let's take a concrete example. A basic T-shirt for five euros at a fast fashion chain. Here's where your money goes:

- Cotton (often not organic): €0.80
- Production and labor: €0.50
- Transport: €0.30
- Store margin: €2.50
- Marketing and overhead: €0.90

That €0.50 for production and labor. That covers hours of work by real people. The quality of the material and finishing? The absolute minimum to survive one wash.

## What Can You Do?

The good news: you don't have to change your wardrobe overnight. Small, conscious choices already make an enormous difference.

**Buy less, choose better.** This is the simplest and most effective step. Before buying something, ask yourself: will I wear this at least 30 times? If not, leave it on the rack.

**Invest in quality.** A hoodie that costs €89 and lasts five years costs you €17.80 per year. A hoodie that costs €25 and falls apart after six months costs you €50 per year. Quality is cheaper.

**Choose local and transparent.** Know where your clothing comes from. Ask brands about their production process. The shorter the chain, the better you can verify what happens.

**Maintain your clothing.** Wash at 30 degrees, air dry, repair small tears. Your clothes last longer than you think when you take care of them.

**Second-hand is not a shame.** Vintage and thrift stores are goldmines for unique pieces. And it's the most sustainable way to buy.

## Why We Do Things Differently

At MOSE, we produce locally in Groningen. Not because it's cheaper, it absolutely isn't. But because we want to know who makes our clothing, under what conditions, and with what materials.

Our hoodies, T-shirts, and caps are designed to last for years. No seasonal collections you'll forget after three months. No artificial scarcity to pressure you. Just honest clothing that fits well, looks good, and lasts.

It's not the cheapest option. But it is the most honest one.`,
  },

  // ============================================================
  // ARTICLE 2, December 19, 2025
  // ============================================================
  {
    slug: 'de-perfecte-winter-hoodie-koopgids',
    title_nl: 'De Perfecte Winter Hoodie: Hier Moet Je Op Letten',
    title_en: 'The Perfect Winter Hoodie: What to Look For',
    excerpt_nl: 'Niet elke hoodie is geschikt voor de Nederlandse winter. Van stofkeuze tot pasvorm, dit is waar je op moet letten als je investeert in een hoodie die echt warm houdt.',
    excerpt_en: 'Not every hoodie is suitable for a Dutch winter. From fabric choice to fit, here\'s what to look for when investing in a hoodie that actually keeps you warm.',
    category: 'style',
    tags: ['hoodie', 'winter', 'koopgids', 'pasvorm', 'stof'],
    author: 'MOSE',
    reading_time: 7,
    published_at: '2025-12-19T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'De Perfecte Winter Hoodie Koopgids | MOSE Blog',
    seo_title_en: 'The Perfect Winter Hoodie Buying Guide | MOSE Blog',
    seo_description_nl: 'Leer waar je op moet letten bij het kopen van een winter hoodie. Stofkeuze, pasvorm, gewicht en kwaliteit, alles wat je moet weten.',
    seo_description_en: 'Learn what to look for when buying a winter hoodie. Fabric choice, fit, weight and quality, everything you need to know.',
    content_nl: `Een hoodie is het meest gedragen kledingstuk in de garderobe van de moderne man, en steeds vaker ook van de moderne vrouw. Maar niet elke hoodie is gelijk gemaakt, vooral niet als de Nederlandse winter toeslaat.

## Het gewicht maakt het verschil

Het gewicht van een hoodie wordt uitgedrukt in GSM: gram per vierkante meter. Dit getal vertelt je meer over de kwaliteit dan welk marketingverhaal dan ook.

**Lichtgewicht (180-280 GSM):** Geschikt voor lente en herfst, of als laag onder een jas. Niet ideaal als je enige warmtebron.

**Midweight (280-380 GSM):** De sweet spot voor de meeste Nederlandse dagen. Warm genoeg voor een frisse herfstdag, niet te zwaar voor binnen.

**Heavyweight (380-500+ GSM):** Dit is waar het serieus wordt. Een zware hoodie voelt als een deken die je draagt. Perfect voor de winter, voor buiten, voor iedereen die gewoon altijd warm wil zijn.

Bij MOSE werken we met 400 GSM katoen. Dat is bewust gekozen: zwaar genoeg om je door een Groningse winter te slepen, maar niet zo zwaar dat je erin verdrinkt.

## De stof: katoen is niet gelijk aan katoen

Er zijn enorme kwaliteitsverschillen in katoen. Goedkoop katoen voelt aanvankelijk zacht, maar pilt na een paar wasbeurten, krimpt, en verliest zijn vorm. Goed katoen wordt beter met de tijd.

**Ring-spun katoen** is de gouden standaard. Het garen wordt strakker gesponnen, wat resulteert in een zachtere, sterkere stof die minder pilt. Het kost meer om te produceren, maar je voelt en ziet het verschil direct.

**Biologisch katoen** is geteeld zonder pesticiden en kunstmest. Het is beter voor het milieu en vaak zachter dan conventioneel katoen. Let op: het label "biologisch" alleen zegt niets over de kwaliteit van het weefsel.

**Gekamd katoen** is een extra stap in het productieproces waarbij kortere vezels worden verwijderd. Het resultaat is een gladder, sterker en zachter oppervlak.

## De pasvorm: relaxed vs. oversized vs. regular

De pasvorm van je hoodie bepaalt je hele look. Er is geen objectief "beste" pasvorm, het hangt af van je stijl en je lichaam.

**Regular fit** volgt je lichaamscontour zonder strak te zitten. Klassiek, clean, werkt altijd. Dit is de pasvorm die je kunt dragen naar een casual vrijdagmiddagborrel zonder dat iemand denkt dat je net uit bed komt.

**Relaxed fit** zit iets ruimer in de schouders en het lijf. Comfortabeler, casualer, en vergeeft meer. Perfect voor weekenddagen en chill sesies.

**Oversized** is bewust te groot. Het is een statement, niet een ongelukje. Een goede oversized hoodie heeft nog steeds structuur in de schouders en zit niet als een zak. Dit is een stijlkeuze, niet een "ik heb de verkeerde maat gepakt" keuze.

MOSE hoodies hebben een relaxed fit. Ruim genoeg om comfortabel te zijn, gestructureerd genoeg om er goed uit te zien. Zowel mannen als vrouwen dragen ze, de fit werkt universeel.

## De details die je over het hoofd ziet

De duivel zit in de details. Letterlijk.

**De kangoeroezak:** Check de afwerking van de naden. Bij goedkope hoodies zijn de naden van de zak het eerste wat losraakt. Dubbele stiksels zijn een teken van kwaliteit.

**De capuchon:** Een goede capuchon heeft voldoende volume om over je hoofd te trekken zonder je zicht te belemmeren. Te klein? Nutteloos. Te groot? Je ziet eruit als een monnik.

**De manchetten en zoom:** Geriblede manchetten moeten stevig terugveren. Na een paar wasbeurten zie je bij goedkope hoodies dat de manchetten uitrekken en slappe happen worden. Kwaliteitsmanchet houdt zijn vorm.

**Het koord:** Ronde koorden of platte koorden is een stijlkeuze. Belangrijker: zitten ze stevig vast of kun je ze er per ongeluk uittrekken?

## De investering

Een goede winterhoodie kost tussen de €70 en €120. Dat voelt als veel als je gewend bent aan fast fashion prijzen. Maar reken even mee.

Een hoodie van €25 die je één seizoen draagt voordat hij pilt, krimpt en zijn vorm verliest: €25 per seizoen. Een hoodie van €89 die je vier winters draagt: €22 per seizoen. En die voelt elke keer dat je hem aantrekt beter dan dat fast fashion alternatief.

Investeer in minder stukken van betere kwaliteit. Je garderobe, en je portemonnee, zullen je dankbaar zijn.`,

    content_en: `A hoodie is the most-worn garment in the modern man's wardrobe, and increasingly in the modern woman's too. But not every hoodie is made equal, especially when the Dutch winter hits.

## Weight Makes the Difference

A hoodie's weight is measured in GSM: grams per square meter. This number tells you more about quality than any marketing story.

**Lightweight (180-280 GSM):** Suitable for spring and fall, or as a layer under a jacket. Not ideal as your only warmth source.

**Midweight (280-380 GSM):** The sweet spot for most Dutch days. Warm enough for a crisp autumn day, not too heavy for indoors.

**Heavyweight (380-500+ GSM):** This is where it gets serious. A heavy hoodie feels like wearing a blanket. Perfect for winter, for outdoors, for anyone who just wants to stay warm.

At MOSE, we work with 400 GSM cotton. That's a deliberate choice: heavy enough to get you through a Groningen winter, but not so heavy you drown in it.

## The Fabric: Not All Cotton Is Equal

There are enormous quality differences in cotton. Cheap cotton initially feels soft but pills after a few washes, shrinks, and loses its shape. Good cotton gets better with time.

**Ring-spun cotton** is the gold standard. The yarn is spun tighter, resulting in a softer, stronger fabric that pills less. It costs more to produce, but you can feel and see the difference immediately.

**Organic cotton** is grown without pesticides and artificial fertilizers. It's better for the environment and often softer than conventional cotton. Note: the label "organic" alone says nothing about the quality of the weave.

**Combed cotton** is an extra step in the production process where shorter fibers are removed. The result is a smoother, stronger, and softer surface.

## The Fit: Relaxed vs. Oversized vs. Regular

Your hoodie's fit determines your entire look. There's no objectively "best" fit, it depends on your style and body.

**Regular fit** follows your body contour without being tight. Classic, clean, always works.

**Relaxed fit** sits slightly looser in the shoulders and body. More comfortable, more casual, and more forgiving. Perfect for weekend days.

**Oversized** is intentionally too large. It's a statement, not an accident. A good oversized hoodie still has structure in the shoulders. This is a style choice, not a "I grabbed the wrong size" choice.

MOSE hoodies have a relaxed fit. Spacious enough to be comfortable, structured enough to look good. Both men and women wear them, the fit works universally.

## The Details You Overlook

The devil is in the details. Literally.

**The kangaroo pocket:** Check the seam finishing. On cheap hoodies, the pocket seams are the first thing to come loose. Double stitching is a sign of quality.

**The hood:** A good hood has enough volume to pull over your head without blocking your vision. Too small? Useless. Too big? You look like a monk.

**The cuffs and hem:** Ribbed cuffs should spring back firmly. After a few washes, cheap hoodies show cuffs that stretch out. Quality cuffs hold their shape.

**The drawstring:** Round or flat cords are a style choice. More important: are they firmly attached or can you accidentally pull them out?

## The Investment

A good winter hoodie costs between €70 and €120. That feels like a lot if you're used to fast fashion prices. But do the math.

A €25 hoodie you wear for one season before it pills, shrinks, and loses shape: €25 per season. A €89 hoodie you wear for four winters: €22 per season. And it feels better every time you put it on.

Invest in fewer pieces of better quality. Your wardrobe, and your wallet, will thank you.`,
  },

  // ============================================================
  // ARTICLE 3, January 8, 2026
  // ============================================================
  {
    slug: 'capsule-wardrobe-mannen-minder-kleding-meer-stijl',
    title_nl: 'Capsule Wardrobe voor Mannen: Minder Kleding, Meer Stijl',
    title_en: 'Capsule Wardrobe for Men: Less Clothing, More Style',
    excerpt_nl: 'Met 20 goed gekozen kledingstukken kun je meer dan 100 outfits samenstellen. Zo bouw je een capsule wardrobe die écht werkt.',
    excerpt_en: 'With 20 well-chosen garments, you can create over 100 outfits. Here\'s how to build a capsule wardrobe that actually works.',
    category: 'style',
    tags: ['capsule wardrobe', 'minimalisme', 'mannenmode', 'stijl', 'basics'],
    author: 'MOSE',
    reading_time: 9,
    published_at: '2026-01-08T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Capsule Wardrobe voor Mannen: Complete Gids | MOSE Blog',
    seo_title_en: 'Capsule Wardrobe for Men: Complete Guide | MOSE Blog',
    seo_description_nl: 'Bouw een capsule wardrobe met minder kleding en meer stijl. Praktische gids voor mannen die bewust willen kleden zonder gedoe.',
    seo_description_en: 'Build a capsule wardrobe with less clothing and more style. Practical guide for men who want to dress consciously without fuss.',
    content_nl: `Open je kast. Hoeveel kledingstukken hangen er? Vijftig? Honderd? En hoeveel daarvan draag je echt regelmatig? Als je eerlijk bent: waarschijnlijk minder dan twintig procent.

Het concept van een capsule wardrobe draait om een simpel idee: bouw je garderobe op rond een klein aantal veelzijdige, kwalitatieve stukken die allemaal met elkaar te combineren zijn. Minder keuze, minder stress, meer stijl.

## Wat is een capsule wardrobe precies?

Een capsule wardrobe bestaat uit 20 tot 35 kernstukken (exclusief ondergoed, sportkleding en speciale gelegenheden). Elk stuk is zorgvuldig gekozen op basis van drie criteria:

- **Kwaliteit:** Het moet jaren meegaan
- **Veelzijdigheid:** Het moet met minimaal drie andere stukken te combineren zijn
- **Pasvorm:** Het moet goed zitten zonder aanpassingen

Het idee is niet nieuw. De term werd in de jaren '70 bedacht door Susie Faux, eigenaar van een Londense boetiek. Maar het concept is relevanter dan ooit in een tijdperk van overconsumptie.

## De basis: wat heb je nodig?

Hier is een realistische capsule wardrobe voor mannen. Dit is geen theoretische lijst, dit zijn stukken die je echt elke week zult dragen.

### Bovenkleding (8-10 stukken)

- 2 tot 3 kwalitatieve T-shirts in neutrale kleuren (zwart, wit, grijs)
- 2 hoodies (één neutraal, één met karakter)
- 1 overshirt of flanellen hemd
- 1 denim of werkjas
- 1 winterjas
- 1 lichtgewicht jas voor tussenseizoenen

### Onderkleding (4-5 stukken)

- 2 jeans (één donker, één medium wash)
- 1 chino of werkbroek
- 1 joggingbroek voor casual dagen
- 1 korte broek voor de zomer

### Accessoires (3-5 stukken)

- 1 cap of muts
- 1 sjaal voor de winter
- 1 riem
- 2 paar schoenen (sneakers + boots)

Dat is het. Twintig tot vijfentwintig stukken waarmee je door het hele jaar komt.

## De kleurenstrategie

De sleutel tot een werkende capsule wardrobe is kleurcoördinatie. Kies een basis van neutrale kleuren en voeg maximaal twee accentkleuren toe.

**Basiskleuren:** Zwart, wit, grijs, navy, olijfgroen
**Accentkleuren:** Kies er maximaal twee die je persoonlijkheid uitdrukken

Met deze strategie kun je letterlijk blind in je kast grijpen en een werkende outfit samenstellen. Alles past bij alles. Geen ochtendstress meer.

## Het kosten-argument

"Kwaliteitskleding is te duur." Dit hoor je vaak, maar het is een misvatting. Laten we rekenen.

**Scenario A, Fast fashion:** Je koopt jaarlijks 46 kledingstukken (het Nederlandse gemiddelde) voor gemiddeld €15. Totaal: €690 per jaar. Na twee jaar heb je €1.380 uitgegeven en een kast vol versleten kleding.

**Scenario B, Capsule wardrobe:** Je investeert €2.000 in 25 kwalitatieve stukken. Na drie jaar zijn de meeste stukken nog in prima staat. Kosten per jaar: €667, en je hebt een kast vol kleding die er nog steeds goed uitziet.

Over vijf jaar bespaar je met een capsule wardrobe gemiddeld 30-40% ten opzichte van fast fashion. En je draagt elke dag kleding waar je je goed in voelt.

## Hoe begin je?

### Stap 1: De grote opruiming

Haal alles uit je kast. Maak drie stapels:

- **Houden:** Stukken die goed passen, in goede staat zijn, en die je het afgelopen seizoen hebt gedragen
- **Doneren/verkopen:** Stukken in goede staat die je niet meer draagt
- **Weggooien:** Stukken die versleten, beschadigd of onherstelbaar zijn

### Stap 2: Analyseer wat overblijft

Kijk naar je "houden" stapel. Wat ontbreekt er? Waar heb je gaten? Dit zijn de stukken waarin je gaat investeren.

### Stap 3: Investeer slim

Koop niet alles in één keer. Begin met de stukken die je het vaakst draagt. Een goede hoodie en twee kwaliteits-T-shirts zijn een betere start dan tien goedkope alternatieven.

### Stap 4: De één-in-één-uit-regel

Voor elk nieuw stuk dat erin komt, gaat er een oud stuk uit. Dit houdt je garderobe compact en dwingt je om bewust te kiezen.

## Het resultaat

Een capsule wardrobe is meer dan een kledingkast. Het is een mindset. Het is de beslissing om minder maar beter te kiezen. Om je niet te laten leiden door trends die over drie maanden vergeten zijn. Om te investeren in stukken die bij jou passen, niet bij de mode van het moment.

Bij MOSE ontwerpen we onze hoodies, T-shirts en caps met precies dit in gedachten. Tijdloze basics in neutrale kleuren en sterke silhouetten die jaren meegaan. Geen seizoenscollecties, geen vluchtige trends. Stukken die de kern vormen van je garderobe, seizoen na seizoen.`,

    content_en: `Open your closet. How many garments are hanging there? Fifty? A hundred? And how many of those do you actually wear regularly? If you're honest: probably less than twenty percent.

The concept of a capsule wardrobe revolves around a simple idea: build your wardrobe around a small number of versatile, quality pieces that all work together. Less choice, less stress, more style.

## What Exactly Is a Capsule Wardrobe?

A capsule wardrobe consists of 20 to 35 core pieces (excluding underwear, sportswear, and special occasions). Each piece is carefully selected based on three criteria:

- **Quality:** It must last for years
- **Versatility:** It must combine with at least three other pieces
- **Fit:** It must fit well without alterations

## The Foundation: What Do You Need?

Here's a realistic capsule wardrobe for men. This isn't a theoretical list, these are pieces you'll actually wear every week.

### Tops (8-10 pieces)

- 2 to 3 quality T-shirts in neutral colors (black, white, grey)
- 2 hoodies (one neutral, one with character)
- 1 overshirt or flannel
- 1 denim or work jacket
- 1 winter coat
- 1 lightweight jacket for transitional seasons

### Bottoms (4-5 pieces)

- 2 jeans (one dark, one medium wash)
- 1 chino or work pant
- 1 jogger for casual days
- 1 shorts for summer

### Accessories (3-5 pieces)

- 1 cap or beanie
- 1 scarf for winter
- 1 belt
- 2 pairs of shoes (sneakers + boots)

That's it. Twenty to twenty-five pieces to get you through the entire year.

## The Color Strategy

The key to a working capsule wardrobe is color coordination. Choose a base of neutral colors and add a maximum of two accent colors.

**Base colors:** Black, white, grey, navy, olive green
**Accent colors:** Choose a maximum of two that express your personality

With this strategy, you can literally grab blindly into your closet and put together a working outfit. Everything matches everything.

## The Cost Argument

"Quality clothing is too expensive." You hear this often, but it's a misconception. Let's do the math.

**Scenario A, Fast fashion:** You buy 46 garments annually (the Dutch average) at an average of €15. Total: €690 per year. After two years, you've spent €1,380 and have a closet full of worn-out clothes.

**Scenario B, Capsule wardrobe:** You invest €2,000 in 25 quality pieces. After three years, most pieces are still in great condition. Cost per year: €667, and you have a closet full of clothes that still look good.

Over five years, a capsule wardrobe saves you 30-40% compared to fast fashion on average. And you wear clothing you feel good in every day.

## How to Start

### Step 1: The Big Clean-Out

Take everything out of your closet. Make three piles: Keep, Donate/Sell, and Discard.

### Step 2: Analyze What Remains

Look at your "keep" pile. What's missing? Where are the gaps? These are the pieces you'll invest in.

### Step 3: Invest Smart

Don't buy everything at once. Start with the pieces you wear most often. A good hoodie and two quality T-shirts are a better start than ten cheap alternatives.

### Step 4: The One-In-One-Out Rule

For every new piece that comes in, an old piece goes out. This keeps your wardrobe compact and forces conscious choices.

## The Result

A capsule wardrobe is more than a closet. It's a mindset. The decision to choose less but better. At MOSE, we design our hoodies, T-shirts, and caps with exactly this in mind. Timeless basics in neutral colors and strong silhouettes that last for years.`,
  },

  // ============================================================
  // ARTICLE 4, January 22, 2026
  // ============================================================
  {
    slug: 'lokaal-produceren-waarom-mose-kiest-voor-groningen',
    title_nl: 'Lokaal Produceren: Waarom MOSE Kiest voor Groningen',
    title_en: 'Local Production: Why MOSE Chooses Groningen',
    excerpt_nl: 'Terwijl 97% van alle kleding buiten Europa wordt geproduceerd, maken wij alles in Groningen. Niet uit sentiment, maar uit overtuiging.',
    excerpt_en: 'While 97% of all clothing is produced outside Europe, we make everything in Groningen. Not out of sentiment, but out of conviction.',
    category: 'behind-the-scenes',
    tags: ['lokaal', 'groningen', 'productie', 'made in netherlands', 'transparantie'],
    author: 'MOSE',
    reading_time: 6,
    published_at: '2026-01-22T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Waarom MOSE Lokaal Produceert in Groningen | MOSE Blog',
    seo_title_en: 'Why MOSE Produces Locally in Groningen | MOSE Blog',
    seo_description_nl: 'Ontdek waarom MOSE ervoor kiest om alle kleding lokaal in Groningen te produceren. Transparantie, kwaliteit en eerlijke productie.',
    seo_description_en: 'Discover why MOSE chooses to produce all clothing locally in Groningen. Transparency, quality, and fair production.',
    content_nl: `97% van alle kleding die in Europa wordt verkocht, wordt buiten Europa geproduceerd. Het overgrote deel in Azië, waar arbeidsomstandigheden en milieunormen vaak ver onder de Europese standaard liggen.

Bij MOSE doen we het anders. Alles wat we maken, elke hoodie, elk T-shirt, elke cap, wordt geproduceerd in Groningen. Dit is het verhaal waarom.

## De lange reis van een gemiddeld kledingstuk

Een gemiddeld T-shirt van een fast fashion merk legt de volgende reis af:

- Katoen wordt verbouwd in India of de VS
- Gesponnen tot garen in Pakistan of Turkije
- Geweven of gebreid in Bangladesh of Vietnam
- Geverfd en afgewerkt in een andere fabriek
- Verscheept naar een distributiecentrum in Europa
- Vervoerd naar een winkel of magazijn

Die reis bedraagt gemiddeld 20.000 tot 40.000 kilometer. Elke stap voegt CO2-uitstoot toe, maakt controle moeilijker, en vergroot de kans op misstanden in de keten.

## Onze keten: kort en transparant

Onze productieketen ziet er anders uit:

- Stoffen worden ingekocht bij Europese leveranciers die we persoonlijk kennen
- Het snijden, naaien en afwerken gebeurt in ons atelier in Groningen
- Kwaliteitscontrole doen we zelf, met onze eigen handen
- Verpakking en verzending gebeurt vanuit Groningen

De totale afstand van stof tot klant: een fractie van het conventionele model. Maar belangrijker dan de kilometers zijn de relaties.

## Gezichten achter de kleding

Wanneer je kleding laat produceren in een fabriek aan de andere kant van de wereld, werk je met spreadsheets en samples. Je ziet foto's van je product, maar zelden van de mensen die het maken.

In Groningen kennen we iedereen. We zien de handen die onze hoodies naaien. We kunnen elk moment binnenlopen en het proces controleren. Niet uit wantrouwen, maar omdat we geloven dat goede kleding begint bij goede werkomstandigheden.

Iedereen die aan MOSE kleding werkt, verdient een eerlijk loon. Niet het minimale wat wettelijk moet, maar wat eerlijk is voor het werk dat ze doen. Dat is de basis. Geen marketing. Gewoon hoe het hoort.

## De prijs van lokaal

Laten we eerlijk zijn: lokaal produceren in Nederland is duurder dan produceren in Bangladesh. Significant duurder. De arbeidskosten zijn hoger, de overhead is hoger, en de schaal is kleiner.

Dat vertaalt zich in onze prijzen. Een MOSE hoodie is niet €25. Maar het is ook geen €250. We geloven in eerlijke prijzen: je betaalt wat het werkelijk kost om een kwalitatief product te maken onder eerlijke omstandigheden.

Geen opgeblazen merkmarge. Geen fake sales. Geen trucs. Gewoon een eerlijke prijs voor een eerlijk product.

## Groningen: waarom hier?

Groningen is een stad met lef. Een studentenstad met een ondernemersgeest die je niet overal vindt. Nuchter, direct, en niet bang om dingen anders te doen.

Dat past bij MOSE. We zijn hier begonnen omdat dit onze stad is. Omdat de mentaliteit hier aansluit bij wat we willen zijn: geen poespas, wel karakter.

Maar er zijn ook praktische redenen. Groningen heeft een groeiende creatieve industrie. Er is talent, er is energie, en er is ruimte om te experimenteren. Het is niet Amsterdam of Rotterdam, en dat is precies het punt. We hoeven niet in de Randstad te zitten om goede kleding te maken.

## De toekomst

Lokale productie is geen modetrend. Het is een noodzaak. De textielindustrie staat voor enorme uitdagingen: klimaatverandering, grondstofschaarste, en een groeiend bewustzijn bij consumenten.

Wij geloven dat de toekomst van mode lokaal, transparant en eerlijk is. Niet grootschalig en anoniem. MOSE is ons bewijs dat het kan. Elke hoodie die ons atelier verlaat is daar het bewijs van.`,

    content_en: `97% of all clothing sold in Europe is produced outside Europe. The vast majority in Asia, where labor conditions and environmental standards often fall far below European standards.

At MOSE, we do it differently. Everything we make, every hoodie, every T-shirt, every cap, is produced in Groningen. This is the story of why.

## The Long Journey of an Average Garment

An average T-shirt from a fast fashion brand travels the following route:

- Cotton is grown in India or the US
- Spun into yarn in Pakistan or Turkey
- Woven or knitted in Bangladesh or Vietnam
- Dyed and finished in another factory
- Shipped to a distribution center in Europe
- Transported to a store or warehouse

That journey averages 20,000 to 40,000 kilometers. Each step adds CO2 emissions, makes oversight harder, and increases the chance of abuses in the chain.

## Our Chain: Short and Transparent

Our production chain looks different:

- Fabrics are sourced from European suppliers we personally know
- Cutting, sewing, and finishing happens in our atelier in Groningen
- Quality control is done by us, with our own hands
- Packaging and shipping happens from Groningen

The total distance from fabric to customer: a fraction of the conventional model. But more important than the kilometers are the relationships.

## Faces Behind the Clothing

When you have clothing produced in a factory on the other side of the world, you work with spreadsheets and samples. You see photos of your product, but rarely of the people who make it.

In Groningen, we know everyone. We see the hands that sew our hoodies. We can walk in at any moment and check the process. Not out of distrust, but because we believe good clothing starts with good working conditions.

Everyone who works on MOSE clothing earns a fair wage. Not the legal minimum, but what's fair for the work they do. That's the baseline. Not marketing. Just how it should be.

## The Price of Local

Let's be honest: producing locally in the Netherlands is significantly more expensive than producing in Bangladesh. Labor costs are higher, overhead is higher, and scale is smaller.

That translates to our prices. A MOSE hoodie isn't €25. But it's not €250 either. We believe in fair prices: you pay what it actually costs to make a quality product under fair conditions.

No inflated brand margin. No fake sales. No tricks. Just an honest price for an honest product.

## Groningen: Why Here?

Groningen is a city with guts. A student city with an entrepreneurial spirit you don't find everywhere. Down-to-earth, direct, and not afraid to do things differently.

That fits MOSE. We started here because this is our city. Because the mentality here aligns with what we want to be: no fuss, just character.

But there are practical reasons too. Groningen has a growing creative industry. There's talent, energy, and room to experiment. It's not Amsterdam or Rotterdam, and that's exactly the point.

## The Future

Local production isn't a fashion trend. It's a necessity. The textile industry faces enormous challenges: climate change, resource scarcity, and growing consumer awareness.

We believe the future of fashion is local, transparent, and fair. Not large-scale and anonymous. MOSE is our proof that it can be done. Every hoodie that leaves our atelier is evidence of that.`,
  },

  // ============================================================
  // ARTICLE 5, February 5, 2026
  // ============================================================
  {
    slug: 'kwaliteit-vs-kwantiteit-echte-kosten-kleding',
    title_nl: 'Kwaliteit vs. Kwantiteit: De Echte Kosten van Je Kleding',
    title_en: 'Quality vs. Quantity: The Real Cost of Your Clothing',
    excerpt_nl: 'Een goedkoop T-shirt is nooit goedkoop. Zo bereken je de werkelijke kosten van je kleding, en waarom investeren in kwaliteit je geld bespaart.',
    excerpt_en: 'A cheap T-shirt is never cheap. Here\'s how to calculate the real cost of your clothing, and why investing in quality saves you money.',
    category: 'sustainability',
    tags: ['kwaliteit', 'cost-per-wear', 'investering', 'bewust kopen'],
    author: 'MOSE',
    reading_time: 7,
    published_at: '2026-02-05T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Kwaliteit vs. Kwantiteit: De Echte Kosten van Kleding | MOSE Blog',
    seo_title_en: 'Quality vs. Quantity: The Real Cost of Clothing | MOSE Blog',
    seo_description_nl: 'Ontdek de cost-per-wear methode en leer waarom goedkope kleding eigenlijk duurder is. Bereken de werkelijke kosten van je garderobe.',
    seo_description_en: 'Discover the cost-per-wear method and learn why cheap clothing is actually more expensive. Calculate the real cost of your wardrobe.',
    content_nl: `We zijn geconditioneerd om naar het prijskaartje te kijken bij het kopen van kleding. €15 voor een T-shirt? Koopje. €49 voor een T-shirt? Duur. Maar die reflex klopt niet. De prijs op het kaartje is slechts het begin van het verhaal.

## Cost-per-wear: de enige metric die ertoe doet

Cost-per-wear (CPW) is een simpele berekening die de werkelijke kosten van een kledingstuk onthult:

**CPW = Aankoopprijs / Aantal keer gedragen**

Laten we twee T-shirts vergelijken:

**T-shirt A:** €12, gedragen 10 keer voordat het krimpt en vervormt. CPW: €1,20 per keer.

**T-shirt B:** €45, gedragen 120 keer over drie jaar. CPW: €0,38 per keer.

Het "dure" T-shirt is meer dan drie keer goedkoper per draagbeurt. Dit is geen hypothetisch voorbeeld, dit is de realiteit van kwaliteitsverschillen in kleding.

## Waarom goedkope kleding snel verslijt

De lage prijs van fast fashion wordt betaald door de kwaliteit. Hier is wat er technisch misgaat:

**Dunne stof:** Goedkope T-shirts gebruiken stof van 120-150 GSM. Na vijf wasbeurten wordt de stof doorschijnend, vooral in lichtere kleuren.

**Open-end garen:** Het goedkoopste type garen. Minder sterk, minder zacht, en meer vatbaar voor pilling. De kleine bolletjes op je T-shirt na een paar wasbeurten? Dat is open-end garen in actie.

**Slechte afwerking:** Enkele stiksels in plaats van dubbele. Overlocknaden die bij de eerste spanning loslaten. Manchetten zonder verstevigde naden.

**Reactieve vs. pigmentverf:** Goedkope merken gebruiken vaak pigmentverf die na een paar wasbeurten uitwast. Die zwarte hoodie die na een maand donkergrijs is? Dat is de verf die verdwijnt.

## De psychologische kosten

Er zijn ook kosten die niet in euro's te meten zijn.

**Keuzestress:** Hoe meer kleding je hebt, hoe moeilijker het wordt om te kiezen. Studies tonen aan dat teveel keuzes leiden tot ontevredenheid en beslissingsmoeheid.

**De "ik heb niets om aan te trekken" paradox:** Een volle kast vol middelmatige kleding voelt leger dan een kleine collectie stukken waar je van houdt.

**Milieugeweten:** Steeds meer mensen voelen een ongemak bij het kopen van wegwerpkleding. Dat ongemak is terecht, en het verdwijnt wanneer je bewust koopt.

## Hoe herken je kwaliteit?

Je hoeft geen textielexpert te zijn om kwaliteit te herkennen. Let op deze vijf dingen:

**1. Gewicht.** Houd het kledingstuk vast. Kwaliteitskleding heeft gewicht. Een T-shirt dat aanvoelt als een tissue is een tissue.

**2. Naden.** Trek voorzichtig aan de naden. Bij kwaliteitskleding blijven de naden stevig. Bij goedkope kleding zie je gaten ontstaan.

**3. Stof.** Voel het materiaal. Goed katoen voelt stevig maar zacht aan. Als het synthetisch of "plasticky" voelt, is het waarschijnlijk een mix met goedkope synthetische vezels.

**4. Elasticiteit.** Rek de stof voorzichtig uit en laat los. Goed materiaal springt terug naar zijn originele vorm. Goedkoop materiaal blijft uitgerekt.

**5. Labels.** Kijk naar het samenstelling-label. 100% katoen of kwalitatieve blends (katoen/modal) zijn over het algemeen beter dan hoge percentages polyester.

## De investering herkaderen

Stop met kleding zien als een uitgave. Begin het te zien als een investering.

Een MOSE hoodie van €89 is geen €89 die je "kwijt" bent. Het is €89 die je investeert in een stuk dat je honderden keren gaat dragen. Dat elke wasbeurt zachter wordt. Dat na drie jaar nog steeds goed zit en er goed uitziet.

Dat is waar je voor betaalt: niet een merknaam, niet een marketingverhaal, maar materialen, vakmanschap, en een eerlijk productieproces.

De goedkoopste kleding is de kleding die je niet hoeft te vervangen.`,

    content_en: `We're conditioned to look at the price tag when buying clothing. €15 for a T-shirt? Bargain. €49 for a T-shirt? Expensive. But that reflex is wrong. The price on the tag is just the beginning of the story.

## Cost-per-Wear: The Only Metric That Matters

Cost-per-wear (CPW) is a simple calculation that reveals the real cost of a garment:

**CPW = Purchase Price / Number of Times Worn**

Let's compare two T-shirts:

**T-shirt A:** €12, worn 10 times before it shrinks and deforms. CPW: €1.20 per wear.
**T-shirt B:** €45, worn 120 times over three years. CPW: €0.38 per wear.

The "expensive" T-shirt is more than three times cheaper per wear.

## Why Cheap Clothing Wears Out Quickly

The low price of fast fashion is paid for by quality. Thin fabric, cheap yarn, poor finishing, and low-quality dye all contribute to garments that barely survive a season.

## How to Recognize Quality

You don't need to be a textile expert. Watch for these five things:

**1. Weight.** Quality clothing has weight.
**2. Seams.** Gently pull at the seams. Quality seams stay firm.
**3. Fabric.** Good cotton feels sturdy but soft.
**4. Elasticity.** Good material springs back to its original shape.
**5. Labels.** 100% cotton or quality blends are generally better than high polyester percentages.

## Reframing the Investment

Stop seeing clothing as an expense. Start seeing it as an investment. A €89 hoodie worn hundreds of times, getting softer with every wash, still looking good after three years, that's what you're paying for.

The cheapest clothing is the clothing you don't have to replace.`,
  },

  // ============================================================
  // ARTICLE 6, February 19, 2026
  // ============================================================
  {
    slug: '5-tijdloze-basics-die-iedereen-nodig-heeft',
    title_nl: '5 Tijdloze Basics Die Elke Man (en Vrouw) Nodig Heeft',
    title_en: '5 Timeless Basics Everyone Needs',
    excerpt_nl: 'Trends komen en gaan, maar deze vijf basics zijn de ruggengraat van elke garderobe. Hier zijn de stukken die je nooit uit de mode raken.',
    excerpt_en: 'Trends come and go, but these five basics are the backbone of every wardrobe. Here are the pieces that never go out of style.',
    category: 'style',
    tags: ['basics', 'tijdloos', 'essentials', 'garderobe', 'unisex'],
    author: 'MOSE',
    reading_time: 6,
    published_at: '2026-02-19T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: '5 Tijdloze Basics voor Elke Garderobe | MOSE Blog',
    seo_title_en: '5 Timeless Basics for Every Wardrobe | MOSE Blog',
    seo_description_nl: 'Ontdek de 5 tijdloze basics die elke man en vrouw in de kast moet hebben. Van de perfecte hoodie tot het ideale T-shirt.',
    seo_description_en: 'Discover the 5 timeless basics every man and woman should have. From the perfect hoodie to the ideal T-shirt.',
    content_nl: `Mode verandert elke zes maanden. Stijl niet. De meest stijlvolle mensen die je kent hebben één ding gemeen: een sterke basis van tijdloze basics die ze seizoen na seizoen dragen.

Dit zijn geen saaie stukken die je draagt omdat je "niets anders hebt." Dit zijn bewuste keuzes. Stukken die zo goed zijn dat je ze elke week wilt dragen. Ongeacht of je een man of vrouw bent, goede basics zijn universeel.

## 1. De Heavyweight Hoodie

Als we één kledingstuk mochten kiezen dat de afgelopen tien jaar het meest heeft bewezen, is het de hoodie. Van Steve Jobs' zwarte coltrui naar de hoodie van vandaag: het is hét uniform van de moderne mens.

**Wat maakt een hoodie tijdloos?**

- Neutraal kleurenpalet (zwart, antraciet, gebroken wit)
- Relaxed fit die niet te oversized is
- Dikke, zware stof die niet doorhangt na wassen
- Clean design zonder grote logo's of prints

Een goede hoodie draag je naar de supermarkt, naar een date, naar een festival, en naar een chill avond thuis. Het is het meest veelzijdige kledingstuk dat bestaat.

## 2. Het Perfecte T-shirt

Klinkt simpel. Is het niet. Het verschil tussen een goed T-shirt en een geweldig T-shirt is subtiel maar cruciaal.

**Waar je op moet letten:**

- Stof van minimaal 180 GSM (liever 200+)
- Naad op de schouder, niet ervoor of erachter
- Kraag die niet uitrekt na drie wasbeurten
- Lengte die voorbij je riem reikt maar niet tot je dij

De kleur? Begin met zwart en wit. Daarna grijs. Met deze drie kleuren heb je voor elke situatie een T-shirt.

## 3. De Onmisbare Cap

Een cap is het accessoire dat het zwaarst onderschat wordt. Het maakt of breekt een casual outfit.

**Vergeet trucker caps en snapbacks met grote logo's.** Een tijdloze cap is simpel: ongestructureerd of licht gestructureerd, subtiel logo of helemaal niets, in een kleur die bij je garderobe past.

De juiste cap voegt diepte toe aan een simpele outfit. Hoodie, jeans, clean sneakers, en een cap, dat is een look die altijd werkt.

## 4. De Donkere Jeans

Niet te skinny, niet te wijd. Een donkere jeans in straight of slim fit is de basis van je onderlichaam-garderobe.

**Waarom donker?**

- Draagt formeler dan light wash
- Verbergt vlekken beter
- Combineert met letterlijk alles
- Wordt mooier met de tijd (fading)

Investeer in een jeans die goed zit in de taille en het zitvlak. De rest kun je laten innemen door een kleermaker voor een paar euro. Een jeans die perfect past is een game-changer.

## 5. De Veelzijdige Jas

Je hebt niet vijf jassen nodig. Je hebt één goede jas nodig die werkt van herfst tot lente.

**De criteria:**

- Waterafstotend maar niet plasticky
- Warm genoeg voor een Nederlandse herfstavond
- Lang genoeg om je nieren te bedekken
- Zakken die groot genoeg zijn voor je telefoon en sleutels
- Clean design dat over een hoodie past

Een goede werkjas of denim jacket is tijdloos. Het wordt mooier met de jaren en vertelt een verhaal met elke slijtplek.

## Het grote plaatje

Deze vijf stukken vormen de basis van je garderobe. Met deze vijf items, aangevuld met een paar seizoensgebonden accessoires, kom je verder dan met een kast vol fast fashion.

Het gaat niet om minimalisme als lifestyle-trend. Het gaat om bewust kiezen. Weten wat bij je past, investeren in kwaliteit, en niet meegaan in de eindeloze cyclus van kopen-dragen-weggooien.

Bij MOSE maken we drie van deze vijf essentials: hoodies, T-shirts en caps. Niet omdat we niet meer zouden willen maken, maar omdat we geloven in focussen op wat je het beste kunt. Onze drie producten zijn ontworpen om het fundament van je garderobe te zijn. Zonder poespas. Wel karakter.`,

    content_en: `Fashion changes every six months. Style doesn't. The most stylish people you know have one thing in common: a strong foundation of timeless basics they wear season after season.

These aren't boring pieces you wear because you "have nothing else." These are conscious choices. Pieces so good you want to wear them every week. Regardless of whether you're a man or woman, good basics are universal.

## 1. The Heavyweight Hoodie

If we could choose one garment that has proven itself most over the past decade, it's the hoodie. It's the uniform of the modern human.

A good hoodie has a neutral color palette, relaxed fit, heavy fabric, and clean design without large logos. You wear it to the grocery store, on a date, to a festival, and for a chill evening at home.

## 2. The Perfect T-shirt

Sounds simple. It's not. Look for fabric of at least 180 GSM, seam on the shoulder, a collar that doesn't stretch, and proper length.

Start with black and white. Then grey. With these three colors, you have a T-shirt for every situation.

## 3. The Essential Cap

A cap is the most underrated accessory. Forget trucker caps with large logos. A timeless cap is simple: unstructured, subtle, in a color that matches your wardrobe.

## 4. Dark Jeans

Not too skinny, not too wide. Dark jeans in straight or slim fit are the foundation. They wear more formally than light wash, hide stains better, and combine with literally everything.

## 5. The Versatile Jacket

You don't need five jackets. You need one good jacket that works from fall to spring. Water-repellent, warm enough, clean design that fits over a hoodie.

## The Big Picture

These five pieces form the foundation of your wardrobe. At MOSE, we make three of these five essentials: hoodies, T-shirts, and caps. Because we believe in focusing on what you do best. Our three products are designed to be the foundation of your wardrobe. No fuss. Just character.`,
  },

  // ============================================================
  // ARTICLE 7, March 5, 2026
  // ============================================================
  {
    slug: 'van-schets-tot-product-hoe-een-mose-hoodie-ontstaat',
    title_nl: 'Van Schets tot Product: Hoe Een MOSE Hoodie Ontstaat',
    title_en: 'From Sketch to Product: How a MOSE Hoodie Is Made',
    excerpt_nl: 'Het duurt gemiddeld acht weken om van een eerste schets tot een afgewerkt product te komen. Dit is het volledige proces achter een MOSE hoodie.',
    excerpt_en: 'It takes an average of eight weeks to go from first sketch to finished product. This is the complete process behind a MOSE hoodie.',
    category: 'behind-the-scenes',
    tags: ['productie', 'behind the scenes', 'hoodie', 'proces', 'vakmanschap'],
    author: 'MOSE',
    reading_time: 7,
    published_at: '2026-03-05T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Hoe Een MOSE Hoodie Wordt Gemaakt: Van Schets tot Product | MOSE Blog',
    seo_title_en: 'How a MOSE Hoodie Is Made: From Sketch to Product | MOSE Blog',
    seo_description_nl: 'Volg het complete productieproces van een MOSE hoodie. Van eerste schets tot afgewerkt product, alles lokaal in Groningen.',
    seo_description_en: 'Follow the complete production process of a MOSE hoodie. From first sketch to finished product, all local in Groningen.',
    content_nl: `Elke MOSE hoodie begint als een idee. Soms als een schets op een servet, soms als een gevoel dat we willen vertalen naar stof en stiksels. Van dat moment tot het moment dat jij hem uit de verpakking haalt, zitten gemiddeld acht weken. Dit is wat er in die acht weken gebeurt.

## Week 1-2: Concept en ontwerp

Alles begint met de vraag: wat willen we maken en waarom? Bij MOSE ontwerpen we geen kleding om seizoenscollecties te vullen. We ontwerpen iets wanneer we geloven dat het iets toevoegt.

De eerste stap is research. We kijken naar materialen, silhouetten en details. We schetsen. Veel. De meeste schetsen belanden in de prullenbak, en dat is precies de bedoeling. We zoeken naar die ene versie die simpel, sterk en tijdloos aanvoelt.

Elke ontwerp beslissing wordt getoetst aan onze kernvraag: zou ik dit over vijf jaar nog steeds willen dragen? Als het antwoord nee is, gaan we terug naar de tekentafel.

## Week 2-3: Materiaal selectie

Dit is waar het technisch wordt. We testen stoffen op meerdere criteria:

- **Gewicht (GSM):** We werken met 400 GSM voor onze hoodies. Dat is beduidend zwaarder dan het gemiddelde, maar het verschil in feel en duurzaamheid is enorm.
- **Samenstelling:** Welk type katoen, hoe is het gesponnen, is het biologisch of conventioneel?
- **Kleurechtheid:** Hoe goed houdt de kleur stand na herhaaldelijk wassen? We testen dit door monsters meerdere keren te wassen.
- **Krimp:** Hoeveel krimpt de stof na het wassen? We compenseren hiervoor in het patroon.
- **Pilling-test:** Vormt de stof bolletjes na wrijving? We testen dit met gestandaardiseerde methodes.

We bestellen meerdere stofmonsters en testen ze weken voordat we een keuze maken. Soms valt een stof af in de laatste ronde omdat hij niet voldoet aan één criterium. Jammer, maar niet onderhandelbaar.

## Week 3-4: Patronen en prototyping

Met het ontwerp en de stof vastgesteld, gaan we patronen maken. Dit is een ambacht op zich. De pasvorm van een kledingstuk wordt volledig bepaald door het patroon.

We maken een eerste prototype, in de mode-industrie een "toile" of "muslin" genoemd. Dit is een testversie in goedkopere stof om de pasvorm te beoordelen.

Dit prototype wordt gepast door meerdere mensen met verschillende lichaamstypes. We kijken naar:

- Zit de schoudernaad op de juiste plek?
- Is de lengte van het lijf correct?
- Hoe valt de capuchon?
- Is de kangoeroezak op de juiste hoogte?
- Hoe zien de mouwen eruit in rust en in beweging?

Na de eerste fitting volgen aanpassingen. Soms kleine tweaks van een centimeter, soms fundamentele wijzigingen. Het patroon wordt bijgewerkt en er wordt een nieuw prototype gemaakt. Dit proces herhalen we totdat het perfect is.

## Week 4-5: Productie voorbereiding

Zodra het patroon is goedgekeurd, bereiden we de productie voor. De stof wordt besteld in de juiste hoeveelheid, met extra marge voor fouten. Alle bijmaterialen worden gecontroleerd: ritssluitingen, koorden, labels, verpakkingsmateriaal.

We maken een gedetailleerde productiebrief voor ons atelier. Elke stap wordt beschreven: welke naad, welke steek, welke afwerking, en in welke volgorde. Er is geen ruimte voor interpretatie, consistentie is cruciaal.

## Week 5-7: Productie

Dan begint het echte werk. In ons atelier in Groningen wordt de stof uitgerold, gecontroleerd op defecten, en gesneden volgens het patroon.

Het naaien van één hoodie kost gemiddeld anderhalf tot twee uur handwerk. Dat is geen druk op een knop in een fabriek. Dat zijn getrainde handen die elke naad controleren, elke steek plaatsen, en elk detail afwerken.

Tijdens de productie controleren we steekproeven. Als er een afwijking is, een naad die niet recht is, een kleurverschil in de stof, een koordje dat niet goed zit, wordt het stuk apart gelegd en gerepareerd of afgekeurd.

## Week 7-8: Kwaliteitscontrole en verpakking

Elk afgewerkt stuk doorloopt een eindcontrole. We checken:

- Alle naden op sterkte en afwerking
- De pasvorm vergeleken met het goedgekeurde prototype
- De kleur op consistentie met de standaard
- Alle labels en details op correctheid

Stukken die niet door de controle komen, worden niet verkocht. Geen kortingsbak, geen "B-keuze." Als het niet goed genoeg is voor ons, is het niet goed genoeg voor jou.

Goedgekeurde stukken worden zorgvuldig gevouwen, verpakt in gerecycled materiaal, en klaargelegd voor verzending.

## Het resultaat

Acht weken voor één hoodie. Dat is lang vergeleken met de zes weken die een fast fashion merk nodig heeft om een volledig nieuwe collectie van ontwerp tot winkelschap te brengen. Maar dat tempo gaat ten koste van alles waar wij in geloven.

Wij kiezen voor langzaam. Voor zorgvuldig. Voor lokaal. Het resultaat is een hoodie die niet na één seizoen op de vuilnisbelt belandt, maar die jaren bij je blijft. Die zachter wordt, die karakter krijgt, die van jou wordt.

Dat is geen marketing. Dat is het eerlijke verhaal achter elk stuk MOSE kleding.`,

    content_en: `Every MOSE hoodie starts as an idea. From that moment to the moment you take it out of the packaging, an average of eight weeks pass. This is what happens in those eight weeks.

## Week 1-2: Concept and Design

Everything starts with the question: what do we want to make and why? We don't design clothing to fill seasonal collections. We design something when we believe it adds value.

Every design decision is tested against our core question: would I still want to wear this in five years?

## Week 2-3: Material Selection

We test fabrics on multiple criteria: weight (400 GSM for our hoodies), composition, color fastness, shrinkage, and pilling resistance. Sometimes a fabric fails in the final round because it doesn't meet one criterion.

## Week 3-4: Patterns and Prototyping

We make a first prototype, a test version to evaluate fit. This prototype is tried on by multiple people with different body types. After fitting, adjustments follow. We repeat this process until it's perfect.

## Week 5-7: Production

In our atelier in Groningen, fabric is unrolled, checked for defects, and cut according to pattern. Sewing one hoodie takes an average of one and a half to two hours of handwork. That's trained hands checking every seam.

## Week 7-8: Quality Control and Packaging

Every finished piece goes through final inspection. Pieces that don't pass inspection are not sold. No discount bin, no "B-choice." If it's not good enough for us, it's not good enough for you.

## The Result

Eight weeks for one hoodie. We choose slow. Careful. Local. The result is a hoodie that doesn't end up in a landfill after one season, but stays with you for years.`,
  },

  // ============================================================
  // ARTICLE 8, March 19, 2026
  // ============================================================
  {
    slug: 'streetwear-trends-2026-wat-blijft-wat-verdwijnt',
    title_nl: 'Streetwear in 2026: Welke Trends Blijven en Welke Verdwijnen',
    title_en: 'Streetwear in 2026: Which Trends Stay and Which Fade',
    excerpt_nl: 'De streetwear-wereld evolueert continu. Van quiet luxury tot workwear invloeden, dit zijn de bewegingen die 2026 definiëren.',
    excerpt_en: 'The streetwear world evolves continuously. From quiet luxury to workwear influences, these are the movements defining 2026.',
    category: 'style',
    tags: ['streetwear', 'trends', '2026', 'mode', 'stijl'],
    author: 'MOSE',
    reading_time: 8,
    published_at: '2026-03-19T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Streetwear Trends 2026: Wat Blijft en Wat Verdwijnt | MOSE Blog',
    seo_title_en: 'Streetwear Trends 2026: What Stays and What Fades | MOSE Blog',
    seo_description_nl: 'De streetwear trends van 2026 geanalyseerd. Ontdek welke bewegingen blijven en welke verdwijnen, en hoe je je stijl toekomstbestendig maakt.',
    seo_description_en: 'The streetwear trends of 2026 analyzed. Discover which movements stay and which fade, and how to future-proof your style.',
    content_nl: `Streetwear was ooit een subcultuur. Skateparken, graffiti, underground hiphop, dat was het ecosysteem waar de eerste Supreme hoodies en Stüssy tees hun thuis vonden. In 2026 is streetwear de dominante kracht in de mode-industrie. Maar dat betekent niet dat alles in streetwear het waard is om te volgen.

## Trends die blijven

### De Heavyweight Revival

De tijd van dunne, doorzichtige basics is voorbij. Consumenten willen gewicht. Ze willen stof die ze kunnen voelen. Heavyweight hoodies (350+ GSM) en dikke tees zijn geen niche meer, ze zijn de standaard geworden voor merken die kwaliteit serieus nemen.

Dit is geen trend die verdwijnt. Het is een correctie. Jarenlang was de mode-industrie bezig om kleding steeds dunner en goedkoper te maken. Nu slaat de slinger terug. Mensen zijn bereid meer te betalen voor stof die echt wat voorstelt.

### Logoloze Mode

Het grote, in-your-face logo is aan het verdwijnen. De shift naar subtielere branding begon al in 2023 met de "quiet luxury" beweging, maar heeft nu ook streetwear bereikt.

Steeds meer merken, van high-end tot startups, kiezen voor minimale branding. Een klein label, een subtiele tag, of helemaal niets. Het product moet voor zichzelf spreken, niet het logo.

Bij MOSE geloven we hier al in sinds dag één. Onze hoodies hebben geen enorm logo op de borst. De kwaliteit en het silhouet zijn het statement.

### Workwear Invloeden

Dickies, Carhartt, werkbroeken en overshirts, workwear-elementen zijn overal in streetwear. En met goede reden: werkkleding is ontworpen om mee te gaan. De functionaliteit, de duurzaamheid, en de no-nonsense esthetiek passen perfect bij de huidige zeitgeist.

Dit gaat verder dan alleen de look. Het is een waardeverandering. Mensen willen kleding die iets kan hebben. Die niet breekt bij het eerste contact met de realiteit.

### Lokaal en Transparant

De bewuste consument is geen niche meer. Steeds meer mensen willen weten waar hun kleding vandaan komt. Merken die transparant zijn over hun productieproces, die laten zien waar, hoe, en door wie hun kleding wordt gemaakt, hebben een voorsprong.

## Trends die verdwijnen

### Overdreven Oversized

De extreem oversized silhouetten van 2023-2024 maken plaats voor meer gecontroleerde volumes. Relaxed fit is het nieuwe midden: ruimer dan regular, maar niet zo extreem dat je erin verdrinkt. Het gaat om comfort met structuur.

### Hype Drops en Kunstmatige Schaarste

Het model van "300 stuks, alles uitverkocht in 8 seconden" verliest zijn aantrekkingskracht. Consumenten zijn moe van de FOMO-marketing en de resellers die producten onbereikbaar maken.

Merken die bouwen op werkelijke waarde in plaats van kunstmatige hype zien betere klantloyaliteit op de lange termijn. Schaarste moet echt zijn, gebaseerd op productiecapaciteit en kwaliteitseisen, niet op marketingstrategieën.

### Fast Fashion Streetwear

De grote fast fashion ketens die streetwear "looks" kopiëren voor een fractie van de prijs hebben hun grenzen bereikt. Consumenten zien steeds beter het verschil tussen een gekopieerde look en een authentiek product.

Een fast fashion hoodie die eruitziet als streetwear maar aanvoelt als een vaatdoek? Die truc werkt niet meer. Kwaliteit wint.

## Hoe maak je je stijl toekomstbestendig?

De beste bescherming tegen verdwijnende trends is investeren in stukken die er bovenuit stijgen.

**Kies neutrale kleuren.** Zwart, wit, grijs, navy en olijfgroen zijn al decennia tijdloos en zullen dat blijven.

**Kies clean silhouetten.** Geen extreme vormen. Relaxed maar gecontroleerd. Stukken die er over twee jaar nog net zo goed uitzien als vandaag.

**Kies kwaliteit boven kwantiteit.** Vijf goede stukken verslaan vijftien middelmatige stukken. Altijd.

**Kies authenticiteit.** Draag wat bij je past, niet wat trending is op TikTok. Stijl is persoonlijk, en de sterkste stijl is degene die niet elke zes maanden verandert.

De trends van 2026 bevestigen wat we bij MOSE altijd al geloofden: de toekomst van streetwear is niet harder schreeuwen, maar beter maken. Heavyweight, logoloze, lokaal geproduceerde basics zijn niet trendy, ze zijn tijdloos.`,

    content_en: `Streetwear was once a subculture. In 2026, it's the dominant force in the fashion industry. But that doesn't mean everything in streetwear is worth following.

## Trends That Stay

### The Heavyweight Revival
The era of thin, see-through basics is over. Consumers want weight and substance. Heavyweight hoodies and thick tees are the new standard.

### Logo-Free Fashion
The big, in-your-face logo is fading. More brands choose minimal branding. The product should speak for itself, not the logo.

### Workwear Influences
Workwear elements are everywhere in streetwear. The functionality, durability, and no-nonsense aesthetic fit the current zeitgeist perfectly.

### Local and Transparent
The conscious consumer is no longer niche. Brands that are transparent about their production process have an edge.

## Trends That Fade

### Extreme Oversized
Extreme oversized silhouettes make way for more controlled volumes. Relaxed fit is the new middle ground.

### Hype Drops and Artificial Scarcity
The "300 pieces, sold out in 8 seconds" model is losing its appeal. Brands building on actual value see better long-term loyalty.

### Fast Fashion Streetwear
Consumers increasingly see the difference between a copied look and an authentic product. Quality wins.

## How to Future-Proof Your Style

Choose neutral colors. Choose clean silhouettes. Choose quality over quantity. Choose authenticity. The trends of 2026 confirm what we've always believed at MOSE: the future of streetwear isn't about shouting louder, but making better.`,
  },

  // ============================================================
  // ARTICLE 9, April 3, 2026
  // ============================================================
  {
    slug: 'duurzame-mode-hoeft-niet-duur-te-zijn',
    title_nl: 'Waarom Duurzame Mode Niet Duur Hoeft Te Zijn',
    title_en: 'Why Sustainable Fashion Doesn\'t Have to Be Expensive',
    excerpt_nl: 'Duurzame mode heeft een reputatie van hoge prijzen. Maar de werkelijkheid is genuanceerder. Zo maak je bewuste keuzes zonder je portemonnee te slopen.',
    excerpt_en: 'Sustainable fashion has a reputation for high prices. But reality is more nuanced. Here\'s how to make conscious choices without breaking the bank.',
    category: 'sustainability',
    tags: ['duurzaamheid', 'budget', 'bewust kopen', 'tweedehands', 'investering'],
    author: 'MOSE',
    reading_time: 7,
    published_at: '2026-04-03T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'Duurzame Mode Hoeft Niet Duur Te Zijn | MOSE Blog',
    seo_title_en: 'Sustainable Fashion Doesn\'t Have to Be Expensive | MOSE Blog',
    seo_description_nl: 'Ontdek hoe je duurzamer kunt kleden zonder je budget te overschrijden. Praktische tips voor bewuste mode op elk prijsniveau.',
    seo_description_en: 'Discover how to dress more sustainably without exceeding your budget. Practical tips for conscious fashion at every price level.',
    content_nl: `"Ik kan me duurzame mode niet veroorloven." Dit is het meest gehoorde argument tegen bewust kopen. En het is begrijpelijk. Wanneer je een biologisch katoenen T-shirt van €49 vergelijkt met een polyester T-shirt van €7, lijkt de keuze duidelijk.

Maar die vergelijking klopt niet. Duurzame mode is niet alleen het kopen van dure merken met een groen label. Het is een manier van denken over kleding die op elk budget werkt.

## De mythe van de groene premium

Er is een deel van de duurzame mode-industrie dat prijzen hanteert die voor de meeste mensen onbereikbaar zijn. Een T-shirt van €120, een hoodie van €300. Vaak zijn die prijzen deels gerechtvaardigd door de productiekosten, maar ook deels door de marketingwaarde van het woord "duurzaam."

Laten we eerlijk zijn: duurzaamheid is een marketingterm geworden. En sommige merken maken daar dankbaar gebruik van.

Maar duurzaam kleden is niet hetzelfde als duur kleden. Het gaat om drie principes die op elk budget toepasbaar zijn.

## Principe 1: Koop minder

Dit is de meest duurzame keuze die je kunt maken, en het kost je niets. Sterker nog, het bespaart geld.

De gemiddelde Nederlander koopt 46 kledingstukken per jaar. Stel je voor dat je dat halveert naar 23. Bij een gemiddelde prijs van €20 per stuk bespaar je €460 per jaar. Dat geld kun je investeren in betere kwaliteit.

**Praktisch:**
- Stel een kledingbudget vast aan het begin van het jaar
- Wacht minimaal 48 uur voordat je een impulsaankoop doet
- Gebruik de 30-draag-test: zou je dit minstens 30 keer dragen?

## Principe 2: Koop tweedehands

Tweedehands kleding is de meest duurzame en meest betaalbare optie. Een tweedehands hoodie die nog in goede staat is, heeft nul extra milieu-impact vergeleken met een nieuwe.

Platforms zoals Vinted, Marktplaats, en lokale kringloopwinkels zijn goudmijnen. Je vindt er kwalitatieve merken voor een fractie van de originele prijs.

**Tips voor tweedehands kopen:**
- Check altijd de stof-samenstelling op het label
- Inspecteer naden, ritssluitingen en elastiek
- Was alles op 40 graden voor het eerste gebruik
- Wees geduldig, de perfecte vondst komt als je het niet verwacht

## Principe 3: Investeer waar het telt

Niet elk kledingstuk hoeft duurzaam geproduceerd te zijn. Maar de stukken die je het vaakst draagt, je dagelijkse hoodies, T-shirts, en jeans, verdienen een hogere investering.

Dit is waar de kosten-per-draagbeurt logica werkt. Je dagelijkse hoodie draag je misschien 100+ keer per jaar. De investering in een kwalitatief exemplaar betaalt zichzelf dubbel en dwars terug.

## De rol van onderhoud

De meest onderschatte factor in duurzame mode is onderhoud. Hoe je voor je kleding zorgt bepaalt voor een groot deel hoe lang het meegaat.

**Basisregels:**
- Was zo min mogelijk (draag je kleding vaker tussen wasbeurten)
- Was op 30 graden tenzij het echt nodig is
- Draai kleding binnenstebuiten voordat het in de wasmachine gaat
- Vermijd de droger, hang je kleding op
- Repareer kleine scheurtjes en losse knopen direct

Met deze simpele gewoontes gaat je kleding twee tot drie keer zo lang mee. Dat is geen overdrijving, het is textielwetenschap.

## Het eerlijke midden

Bij MOSE geloven we in het eerlijke midden. Onze kleding is niet de goedkoopste en niet de duurste. We produceren lokaal in Groningen met eerlijke materialen en eerlijke lonen. Dat kost meer dan produceren in een fabriek in Bangladesh, maar we compenseren door een simpel bedrijfsmodel: geen fysieke winkels, geen grote marketingbudgetten, geen onnodige tussenlagen.

Het resultaat is een eerlijke prijs voor een eerlijk product. Betaalbaar genoeg om toegankelijk te zijn, hoog genoeg om kwaliteit te garanderen.

Duurzame mode hoeft niet duur te zijn. Het begint met een andere manier van denken over wat kleding waard is. Niet wat het kost op het kaartje, maar wat het waard is in je leven.`,

    content_en: `"I can't afford sustainable fashion." This is the most common argument against conscious buying. And it's understandable. But that comparison isn't right. Sustainable fashion isn't just about buying expensive brands with a green label.

## Principle 1: Buy Less

This is the most sustainable choice you can make, and it costs nothing. The average person buys 46 garments per year. Halve that, and you save enough to invest in better quality.

## Principle 2: Buy Second-Hand

Second-hand clothing is the most sustainable and affordable option. Platforms like Vinted and local thrift stores are goldmines for quality brands at a fraction of the original price.

## Principle 3: Invest Where It Counts

The pieces you wear most often, your daily hoodies, T-shirts, and jeans, deserve a higher investment. This is where cost-per-wear logic works.

## The Role of Maintenance

How you care for your clothing determines how long it lasts. Wash less, wash at 30 degrees, air dry, repair small tears immediately.

## The Honest Middle

At MOSE, we believe in the honest middle. We compensate for local production costs through a simple business model: no physical stores, no big marketing budgets, no unnecessary middle layers. The result is a fair price for a fair product.

Sustainable fashion doesn't have to be expensive. It starts with a different way of thinking about what clothing is worth.`,
  },

  // ============================================================
  // ARTICLE 10, April 14, 2026
  // ============================================================
  {
    slug: 'groningse-streetwear-scene-van-underground-tot-mainstream',
    title_nl: 'De Groningse Streetwear Scene: Van Underground tot Mainstream',
    title_en: 'The Groningen Streetwear Scene: From Underground to Mainstream',
    excerpt_nl: 'Groningen heeft een bruisende creatieve scene die ver voorbij de studentenbubbel reikt. Dit is het verhaal van streetwear in het hoge noorden.',
    excerpt_en: 'Groningen has a vibrant creative scene that reaches far beyond the student bubble. This is the story of streetwear in the far north.',
    category: 'groningen',
    tags: ['groningen', 'streetwear', 'lokaal', 'creatieve scene', 'noorderlijk'],
    author: 'MOSE',
    reading_time: 7,
    published_at: '2026-04-14T10:00:00Z',
    featured_image_url: null,
    status: 'published',
    seo_title_nl: 'De Groningse Streetwear Scene | MOSE Blog',
    seo_title_en: 'The Groningen Streetwear Scene | MOSE Blog',
    seo_description_nl: 'Ontdek de bruisende streetwear en creatieve scene in Groningen. Van skatecultuur tot lokale merken, het noorden maakt naam.',
    seo_description_en: 'Discover the vibrant streetwear and creative scene in Groningen. From skate culture to local brands, the north is making its name.',
    content_nl: `Als je aan Nederlandse mode denkt, denk je aan Amsterdam. Misschien Rotterdam. Groningen? Dat staat niet bovenaan de lijst. Maar dat is precies wat de stad zo interessant maakt.

Terwijl de Randstad de schijnwerpers trekt, bouwt Groningen stilletjes aan een creatieve scene die authentiek, eigenzinnig en onafhankelijk is. Streetwear speelt daar een centrale rol in.

## De voedingsbodem

Groningen is een studentenstad. Een op de vier inwoners studeert. Dat zorgt voor een constant instroom van jonge, creatieve energie. Maar anders dan andere studentensteden vertrekken veel creatieven niet na hun studie. De huren zijn betaalbaar, de gemeenschap is hecht, en er is ruimte om te experimenteren.

Die combinatie, jong talent, betaalbare ruimte, en een nuchter-maar-ambitieus klimaat, is de perfecte voedingsbodem voor creatief ondernemerschap.

## Skatecultuur als fundament

De basis van elke streetwear-scene is subcultuur. In Groningen is dat skatecultuur. Het Noorderplantsoen is al jaren een verzamelplaats voor skaters, en rondom die scene zijn communities ontstaan die mode, muziek en kunst met elkaar verbinden.

Het is geen toeval dat veel Groningse streetwear-initiatieven roots hebben in de skatescene. De waarden van skaten, authenticiteit, doe-het-zelf mentaliteit, functionaliteit boven opsmuk, vertalen zich direct naar hoe we over kleding denken.

## De nieuwe generatie

De afgelopen jaren is er een nieuwe generatie Groningse merken en initiatieven opgestaan die voorbij de geijkte paden gaan.

Van screenprint-workshops in gekraakte panden tot pop-up winkels in de Folkingestraat. Van kleine ateliers die limited runs produceren tot creatieve collectieven die mode combineren met muziekvideo's en fotografie.

Wat deze nieuwe generatie kenmerkt is een weigering om het "Amsterdamse model" te kopiëren. Ze bouwen niet aan merken die eruitzien alsof ze uit de Jordaan komen. Ze bouwen aan iets dat onmiskenbaar Gronings is. Nuchter. Direct. Zonder opsmuk.

## Waarom het noorden anders is

De Groningse mentaliteit is fundamenteel anders dan die in de Randstad. Er is minder hype, minder navelstaren, en meer focus op het werk zelf. Wanneer een Groningse ondernemer zegt "het is gewoon goed," dan is dat het hoogste compliment.

Die nuchterheid sijpelt door in de producten. Groningse streetwear is niet schreeuwerig. Het hoeft niet op te vallen met gouden logo's of overdreven designs. Het valt op door kwaliteit, door eerlijkheid, en door een duidelijk verhaal.

Er is ook een sterk gemeenschapsgevoel. Groningse merken concurreren niet met elkaar, ze ondersteunen elkaar. Ze delen tips, connecties, en zelfs productieruimte. Dat is niet naïef. Het is slim. Een sterkere scene trekt meer aandacht dan een verzameling individuen.

## MOSE en Groningen

MOSE is onlosmakelijk verbonden met Groningen. Het is niet alleen waar we produceren, het is wie we zijn.

De directheid van onze communicatie? Gronings. De weigering om mee te gaan in hypes? Gronings. De focus op kwaliteit boven kwantiteit? Gronings.

Ons atelier staat in Groningen. Onze eerste klanten kwamen uit Groningen. En elke hoodie die we maken draagt een stukje van deze stad in zich.

Maar we zijn niet alleen een Gronings merk. We zijn een merk dat toevallig uit Groningen komt en de wereld wil laten zien dat goede kleding niet uit de Randstad hoeft te komen. Dat je vanuit het noorden net zo goed, zo niet beter, premium basics kunt maken als welk merk dan ook.

## De toekomst

De Groningse creatieve scene groeit. Elk jaar komen er nieuwe initiatieven bij. De grenzen tussen mode, kunst, muziek en design vervagen. En steeds meer mensen buiten Groningen ontdekken wat hier gebeurt.

Wij geloven dat Groningen pas aan het begin staat. De ingrediënten zijn er: talent, ruimte, mentaliteit, en een groeiend netwerk. De komende jaren gaat het noorden van zich laten horen.

En MOSE? Wij zijn er trots op om deel uit te maken van dat verhaal. Om vanuit de Stavangerweg in Groningen kleding te maken die in heel Nederland, en daarbuiten, wordt gedragen. Zonder poespas. Met karakter. Precies zoals deze stad.`,

    content_en: `When you think of Dutch fashion, you think of Amsterdam. Maybe Rotterdam. Groningen? That's not top of the list. But that's exactly what makes the city so interesting.

While the Randstad takes the spotlight, Groningen is quietly building a creative scene that's authentic, opinionated, and independent.

## The Breeding Ground

Groningen is a student city. One in four residents studies. This creates a constant influx of young, creative energy. But unlike other student cities, many creatives don't leave after graduating. Rents are affordable, the community is tight-knit, and there's room to experiment.

## Skate Culture as Foundation

The basis of every streetwear scene is subculture. In Groningen, that's skate culture. The values, authenticity, DIY mentality, functionality over decoration, translate directly into how we think about clothing.

## The New Generation

A new generation of Groningen brands and initiatives has emerged that goes beyond the usual paths. From screenprint workshops to pop-ups, from small ateliers producing limited runs to creative collectives combining fashion with music and photography.

What characterizes this generation is a refusal to copy the "Amsterdam model." They're building something unmistakably Groningen. Down-to-earth. Direct. Without fuss.

## Why the North Is Different

The Groningen mentality is fundamentally different from the Randstad. Less hype, less navel-gazing, more focus on the work itself. That sobriety seeps into the products. Groningen streetwear stands out through quality, honesty, and a clear story.

## MOSE and Groningen

MOSE is inseparable from Groningen. The directness of our communication? Groningen. The refusal to follow hypes? Groningen. The focus on quality over quantity? Groningen.

We're proud to be part of this story. Making clothing from the north that's worn throughout the Netherlands, and beyond. No fuss. Just character. Exactly like this city.`,
  },
]

async function seed() {
  console.log(`Seeding ${posts.length} blog posts...`)

  for (const post of posts) {
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(post, { onConflict: 'slug' })
      .select('id, slug, title_nl')
      .single()

    if (error) {
      console.error(`  ✗ ${post.slug}: ${error.message}`)
    } else {
      console.log(`  ✓ ${data.slug} (${data.id})`)
    }
  }

  console.log('\nDone!')
}

seed().catch(console.error)
