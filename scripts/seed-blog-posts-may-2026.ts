/**
 * One-shot seed for two new blog posts in the May-2026 window
 * (between 2026-05-04 and 2026-05-27):
 *
 *  1. Festival outfit guide (style, 2026-05-13)
 *  2. Clothing-care guide (sustainability, 2026-05-26)
 *
 * Matches the voice, structure and metadata pattern of the May-4
 * 'lente-garderobe' post: 6-8 min read, full bilingual content,
 * SEO fields populated, no em dashes, photoshoot-2026 cover image.
 *
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/seed-blog-posts-may-2026.ts
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

const IMAGES_BUCKET =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026'

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

const POST_1: PostInput = {
  slug: 'festival-outfit-2026-7-streetwear-stukken-die-meegaan',
  title_nl: 'Festival-Outfit 2026: 7 Streetwear-Stukken Die 4 Dagen Meegaan',
  title_en: 'Festival Outfit 2026: 7 Streetwear Pieces That Survive 4 Days',
  excerpt_nl:
    'Pinkpop, Welcome to the Village, Lowlands. Vier dagen modder, zon en regen, en maar één rugzak. Dit is wat je inpakt om er op zondagmiddag nog uit te zien als jezelf.',
  excerpt_en:
    "Pinkpop, Welcome to the Village, Lowlands. Four days of mud, sun and rain, and just one backpack. Here's what you pack to still look like yourself on Sunday afternoon.",
  content_nl: `Pinkpop opent het seizoen. Daarna komen Welcome to the Village, Down the Rabbit Hole, en op een gegeven moment Lowlands. Vier dagen op een veld, één rugzak, weinig stroom, en weer dat tussen 8 en 28 graden alles doet.

De grootste fout is zoveel inpakken dat je rugzak je tweede festival wordt. De op één na grootste: één outfit voor alles, dus zondag loop je in dezelfde modderige hoodie als donderdagavond.

De truc zit in slim laagjes-werk met stukken die er na drie dagen nog uitzien alsof je het wilt zien. Dit is wat erin gaat.

## 1. Eén hoodie, niet de duurste

Een mid-weight hoodie (300 tot 360 GSM) is je belangrijkste laag. Hij houdt je warm bij 3 uur 's nachts, beschermt je arm tegen de zon in de middag, en absorbeert het stof van een festivalveld zonder dat hij er meteen kapot uitziet.

**Wat je vermijdt:** Je nieuwste, schoonste hoodie. Festivals slopen kleding. Je pakt een hoodie die je al een seizoen of twee gedragen hebt, niet de hoodie waarvan je hoopt dat je er nieuwe foto's mee maakt.

Donker, neutraal, oversized. Dat is de formule.

## 2. Twee tees, allebei donker

Twee, niet vier. Twee in zwart, donkergrijs, of donkerbruin. Donker laat zweet, bier-vlekken, en het stof van een festivalveld niet meteen zien.

**Waarom 200+ GSM:** Een dikke tee laat minder van wat erop terecht komt door en houdt zijn vorm beter onder een rugzak-band. Een 140 GSM fast-fashion tee is na één avond uitgerekt.

Eén draag je op dag één, eentje op dag drie. Dag twee en vier hangt af van wat het meest acceptabel is.

## 3. Een korte broek, niet je goede chino

Voor warme dagen heb je iets korts nodig dat niet bij je nette outfit hoort. Cargo shorts of een rustige athletic short in olijfgroen, beige, of zwart. Zakken zijn alleen maar mooi meegenomen.

**De pasvorm:** Niet super kort (denk: niet boven de helft van je dij), niet super lang (denk: niet over je knie). De zoom valt net boven of net op de knie. Genoeg ruimte voor zon, genoeg dekking om bij elk veld op tegen te zitten.

## 4. Cargo broek voor de avond

Als de zon ondergaat zakt de temperatuur in Nederland flink. Een cargo broek in canvas of nylon erbij. Niet voor de looks, voor de zakken. Telefoon, sigaretten, oordoppen, snack, kleingeld, alles wat je niet wilt verliezen in een rugzak die ergens op een veldje ligt.

Donkerbruin, zwart, of olijfgroen. Dezelfde formule als alles tot nu toe.

## 5. Sneakers die je mag laten lijden

Eén keer: geen witte sneakers. Niemand heeft witte sneakers na een festival. Donker, gesloten, en oud genoeg dat je niet aan kapot durft. Bij voorkeur een paar dat je een seizoen lang om wilde gooien.

**De alternatieven:**
- Stevige work-sneakers (Carhartt-stijl)
- Donker leren high-tops
- Trail-runners als het echt vies wordt

Een paar reservesokken in je rugzak is geen luxe. Dat is overlevingskennis.

## 6. Bucket hat boven cap

Een bucket hat doet drie dingen die een cap niet doet: hij beschermt je nek, hij past in je rugzak zonder vorm te verliezen, en hij valt minder op als hij ergens onder een tent uitsteekt.

Eén bucket hat in canvas of nylon, ongestructureerd, in een kleur die bij minimaal twee van je outfits past. Niet de witte met logo. Niet de neon-versie. De donkere die niemand opvalt totdat ze hem zelf willen.

## 7. Een laag voor 3 uur 's nachts

Een coach jacket of werkjas in nylon. Niet voor de looks. Voor het moment dat je om half 4 's nachts dat dunne stof tussen je en de wind nodig hebt om bij dat ene vriendje uit Twente in de tent te kruipen.

Lichtgewicht genoeg om in je rugzak te proppen overdag. Genoeg windvang om bij 12 graden niet te bibberen.

## De checklist die je vergeet

Niet kleding, maar net zo belangrijk:

- **Oordoppen.** Drie dagen 100+ decibel slopen je oren. Goede oordoppen kosten 15 euro.
- **Zonnebrand SPF 30.** Eén dag zonder is één weekend met spijt.
- **Wegwerp-poncho.** Geen volwaardige regenjas, gewoon een zak voor het geval dat.
- **Twee sokken per dag.** Vochtige sokken zijn de snelste route naar slecht humeur.
- **Een powerbank.** Een opgeladen telefoon is de enige manier om je vrienden 's nachts terug te vinden.

## De MOSE-bijdrage

De hoodie kun je van ons krijgen. Mid-weight, lokaal gemaakt in Groningen, ontworpen om dragen te overleven. De rest haal je waar je wilt. Korte broek bij een outdoor-merk, cargo bij iemand die nog werkbroeken serieus neemt, sneakers waar je vertrouwen in hebt.

Het punt van festival-kleding is niet dat het schoon thuiskomt. Het punt is dat het na het wassen er weer zo uitziet dat je het volgend seizoen weer aantrekt.

Pak smart in. Draag je beste vrienden. Vergeet de oordoppen niet.`,
  content_en: `Pinkpop opens the season. Then come Welcome to the Village, Down the Rabbit Hole, and at some point Lowlands. Four days on a field, one backpack, barely any power, and weather that swings between 8 and 28 degrees.

The biggest mistake is packing so much that your backpack becomes your second festival. The second biggest: one outfit for everything, so by Sunday you're in the same muddy hoodie as Thursday night.

The trick is smart layering with pieces that still look like you want to wear them after three days. Here's what goes in.

## 1. One Hoodie, Not the Most Expensive

A mid-weight hoodie (300 to 360 GSM) is your most important layer. It keeps you warm at 3 in the morning, protects your arms from the sun, and absorbs the dust of a festival field without looking immediately destroyed.

**What to avoid:** Your newest, cleanest hoodie. Festivals destroy clothing. You pack a hoodie you've already worn a season or two, not the one you're hoping to get new photos in.

Dark, neutral, oversized. That's the formula.

## 2. Two Tees, Both Dark

Two, not four. Two in black, dark grey, or dark brown. Dark hides sweat, beer stains, and the dust of a festival field much longer than light colors do.

**Why 200+ GSM:** A thicker tee shows less of what lands on it and holds shape better under a backpack strap. A 140 GSM fast-fashion tee is stretched out after one night.

Wear one on day one, the other on day three. Day two and four depend on what's most acceptable.

## 3. Shorts, Not Your Good Chino

For warm days you need something short that isn't part of your nice outfit. Cargo shorts or a quiet athletic short in olive, beige, or black. Pockets are a bonus.

**The fit:** Not super short (think: not above the middle of your thigh), not super long (think: not below your knee). The hem sits just above or at the knee. Enough room for sun, enough coverage to sit on any patch of grass.

## 4. Cargo Pants for the Evening

When the sun goes down in the Netherlands, the temperature drops noticeably. Add cargo pants in canvas or nylon. Not for the looks, for the pockets. Phone, cigarettes, earplugs, snacks, change, everything you don't want to lose in a backpack lying on some field.

Dark brown, black, or olive. Same formula as everything else so far.

## 5. Sneakers You Can Sacrifice

Once and for all: no white sneakers. Nobody has white sneakers after a festival. Dark, closed, and old enough that you don't mind damage. Ideally a pair you've been wanting to retire anyway.

**The alternatives:**
- Heavy work-style sneakers (Carhartt-style)
- Dark leather high-tops
- Trail runners if it really gets muddy

A pair of spare socks in your backpack isn't luxury. That's survival knowledge.

## 6. Bucket Hat Over Cap

A bucket hat does three things a cap doesn't: it protects your neck, it folds into a backpack without losing shape, and it draws less attention when it pokes out from under a tent.

One bucket hat in canvas or nylon, unstructured, in a color that works with at least two of your outfits. Not the white one with the logo. Not the neon version. The dark one nobody notices until they want it themselves.

## 7. A Layer for 3 AM

A coach jacket or work jacket in nylon. Not for the looks. For the moment at 3:30 in the morning when you need that thin layer between you and the wind to crawl into your friend from Twente's tent.

Light enough to compress into your backpack during the day. Wind-blocking enough not to shiver at 12 degrees.

## The Checklist You Forget

Not clothing, but just as important:

- **Earplugs.** Three days of 100+ decibels wreck your ears. Good earplugs cost 15 euros.
- **Sunscreen SPF 30.** One day without is one weekend with regret.
- **Disposable poncho.** Not a full rain jacket, just a bag for emergencies.
- **Two pairs of socks per day.** Damp socks are the fastest route to bad mood.
- **A power bank.** A charged phone is the only way to find your friends at night.

## The MOSE Contribution

The hoodie you can get from us. Mid-weight, locally made in Groningen, designed to survive being worn. The rest you get wherever you want. Shorts from an outdoor brand, cargo from someone who still takes work pants seriously, sneakers you trust.

The point of festival clothing isn't that it comes home clean. The point is that after a wash, it looks ready to wear next season.

Pack smart. Wear your best friends. Don't forget the earplugs.`,
  category: 'style',
  tags: ['festival', 'streetwear', 'zomer', 'styling', 'lente', 'hoodie', 'pinkpop'],
  reading_time: 6,
  seo_title_nl: 'Festival-Outfit 2026 in 7 Streetwear-Stukken | MOSE Blog',
  seo_title_en: 'Festival Outfit 2026 in 7 Streetwear Pieces | MOSE Blog',
  seo_description_nl:
    'Vier dagen festival, één rugzak. Een MOSE-gids met 7 streetwear-stukken en de checklist die je vergeet, zodat je er op zondag nog uitziet als jezelf.',
  seo_description_en:
    'Four days of festival, one backpack. A MOSE guide with 7 streetwear pieces and the checklist you forget, so you still look like yourself on Sunday.',
  published_at: '2026-05-13T08:00:00Z',
  featured_image_url: `${IMAGES_BUCKET}/lookbook/01-city-desktop.webp`,
}

const POST_2: PostInput = {
  slug: 'hoe-je-je-kleding-5-jaar-laat-meegaan-7-onderhoudstips',
  title_nl: 'Hoe Je Je Kleding 5 Jaar Laat Meegaan: 7 Onderhoudstips Die Werken',
  title_en: 'How to Make Your Clothing Last 5 Years: 7 Care Tips That Work',
  excerpt_nl:
    'De meeste kleding gaat niet kapot. Je behandelt het verkeerd. Dit zijn de 7 kleine beslissingen die het verschil maken tussen een hoodie van één seizoen en een hoodie van vijf jaar.',
  excerpt_en:
    "Most clothing doesn't break. You treat it wrong. These are the 7 small decisions between a one-season hoodie and a five-year hoodie.",
  content_nl: `De gemiddelde Nederlander koopt 46 stukken kleding per jaar en draagt elk stuk gemiddeld 18 maanden voor het of in de kast verdwijnt of bij het oud-papier eindigt. Dat ligt niet aan de stof. Dat ligt aan hoe we ermee omgaan.

Goede kleding kan vijf jaar mee. Soms tien. Een MOSE hoodie van 300 GSM katoen heeft daar de constructie voor, de naden voor, en de stof voor. Of dat ook gebeurt? Hangt af van zeven kleine beslissingen die de meeste mensen elke week verkeerd nemen.

Hier zijn ze.

## 1. Was minder vaak (en op een lagere temperatuur)

De grootste vijand van je kleding is niet vuil. Het is de wasmachine. Elke wasbeurt vreet aan vezels, vervaagt kleuren, en versnelt vormverlies. Een hoodie die je drie keer minder wast gaat letterlijk drie keer langer mee.

**Het 3-draag-protocol:**
- T-shirt: 1 tot 2 keer dragen, dan wassen
- Sweater of hoodie: 4 tot 6 keer dragen, mits niet zweterig
- Jeans: 8 tot 10 keer dragen (donker hangt zelfs langer)

Lucht buiten een paar uur tussen draagbeurten. Frisheid komt vaak gewoon door zuurstof, niet door wasmiddel.

**De temperatuur:** 30°C wast 95% van wat 40°C wast, maar zonder de stoffen permanent te beschadigen. Sla 60°C over tenzij iets echt vies is.

## 2. Aan de lucht drogen, altijd

De droger is de tweede grootste vijand. Hitte krimpt natuurlijke vezels, smelt elastiek, en vernietigt de print of de ribstuk van een hoodie binnen tien drogingen.

**Wat je doet in plaats daarvan:**
- Hoodies en sweaters: liggend op een handdoek (anders rekken ze uit)
- T-shirts: hangend, maar niet aan de schouders (denk: omgekeerd over het rek)
- Jeans: aan de pijpen ophangen, niet aan de tailleband

Eén detail vergeet je niet: nooit in direct zonlicht. Zon vervaagt zwart en donkere kleuren in een paar uur tijd.

## 3. Vouwen, niet hangen, voor zwaardere stukken

Een hoodie van 360 GSM hangend in je kast? De schouders rekken uit, de capuchon zakt scheef, en binnen drie maanden ziet hij er versleten uit zonder dat je hem ooit gedragen hebt.

**Regel:** Alles boven 250 GSM gaat gevouwen op een plank. T-shirts, lichte sweaters, en blouses mag je hangen op brede houten hangers (geen draadversie van de stomerij).

Vouw zoals een kledingwinkel het doet. Drie vouwen, schouders binnenin, geen vouw door de print of het logo. Een minuut werk per stuk.

## 4. Het vlekken-protocol van 5 minuten

De meeste vlekken zijn op te lossen als je er binnen vijf minuten bij bent. Wacht je drie dagen tot de eerstvolgende wasbeurt? Dan eet de vlek zich in en is het volledig verwijderen vrijwel onmogelijk.

**Wat werkt op de meeste vlekken:**
- Koud water (warm zet eiwit-vlekken vast)
- Een druppel afwasmiddel
- Deppen, niet wrijven
- Vijf minuten later uitspoelen

Voor lastige vlekken (rode wijn, koffie, gras) een aparte vlekkenstift in je tas. Drie euro bij een drogist, redt een outfit per kwartaal.

## 5. Pillen verwijderen zonder de stof te slopen

Pillen, die kleine balletjes wol die op gebruikte sweaters verschijnen, betekenen niet dat een stuk versleten is. Het betekent dat het friction heeft gehad. Pillen verwijderen is een vijf-minuten-klus.

**Wat werkt:**
- Een goedkope pillen-shaver (10 tot 15 euro, gaat jaren mee)
- Een scheermesje (voorzichtig, plat houden)
- Een schuursponsje (alleen op robuuste stof)

**Wat absoluut niet werkt:** Een schaartje. Je knipt een gat alvorens je het door hebt.

## 6. De rust-regel: 2 dagen tussen draagbeurten

Vezels hebben rust nodig. Een hoodie die je drie dagen achter elkaar draagt verliest sneller zijn vorm dan een hoodie die je alterneert met andere stukken.

**Praktisch:** Heb minimaal twee hoodies en twee sweaters in je rotatie. Draag de ene, hang de andere te luchten. Volgende dag andersom.

Bonus: je weet altijd welke kleding je echt vaak draagt, want die zijn binnen een week aan rust toe.

## 7. Wanneer is een kledingstuk eindelijk klaar?

Soms is een stuk echt afgedragen. Gaten in de naden, doorgesleten stof, een rits die niet meer te repareren is. Dan is het tijd om afscheid te nemen.

**Wat je niet doet:** In de oud-papier-bak. Textiel hoort niet bij papier.

**Wat je wel doet:**
- Repareren bij een vakzaak (gaten in jeans, ritsen, naden, vaak onder de 20 euro)
- Een eerlijke kringloop of textielcontainer (niet alles, maar veel kan een tweede leven krijgen)
- Inleveren bij een retailer met take-back programma

Een MOSE hoodie die echt op is gaat retour naar onze workshop in Groningen. Wat nog bruikbaar is wordt hergebruikt, de rest wordt verwerkt. Geen klein lettertje, gewoon zoals het hoort.

## De MOSE-bijdrage

We maken kleding die ontworpen is om vijf jaar mee te kunnen. Naden die dubbel zijn gestikt, stof die niet onder 220 GSM zakt, en details die niet bij de eerste wasbeurt verdwijnen. Maar zelfs het beste stuk maakt het niet zonder onderhoud.

Een hoodie van 90 euro die vijf jaar meegaat kost je 18 euro per jaar. Een hoodie van 25 euro die acht maanden meegaat kost je 38 euro per jaar. Het rekensommetje doet zichzelf, mits je weet hoe je een hoodie van 90 euro vijf jaar laat duren.

Goede kleding kopen is stap één. Goede kleding behandelen is stap twee. De rest doet zichzelf.`,
  content_en: `The average Dutch person buys 46 garments per year and wears each piece for an average of 18 months before it disappears in the closet or ends up at the curb. That isn't because of the fabric. That's because of how we treat clothing.

Good clothing can last five years. Sometimes ten. A MOSE hoodie of 300 GSM cotton has the construction, the seams, and the fabric for it. Whether that actually happens depends on seven small decisions most people make wrong every week.

Here they are.

## 1. Wash Less Often (and at a Lower Temperature)

The biggest enemy of your clothing isn't dirt. It's the washing machine. Every wash eats at fibers, fades colors, and accelerates shape loss. A hoodie washed three times less often literally lasts three times longer.

**The 3-wear protocol:**
- T-shirt: wear 1 to 2 times, then wash
- Sweater or hoodie: wear 4 to 6 times if not sweaty
- Jeans: wear 8 to 10 times (dark wash stretches even further)

Air out between wears for a few hours. Freshness often comes from oxygen, not detergent.

**The temperature:** 30°C washes 95% of what 40°C washes, without permanently damaging the fabric. Skip 60°C unless something is truly disgusting.

## 2. Air Dry, Always

The dryer is the second biggest enemy. Heat shrinks natural fibers, melts elastane, and destroys the print or rib detail of a hoodie within ten dries.

**What to do instead:**
- Hoodies and sweaters: laid flat on a towel (otherwise they stretch)
- T-shirts: hung, but not by the shoulders (think: inside out over the rack)
- Jeans: hung by the legs, not the waistband

One detail not to forget: never in direct sunlight. The sun fades black and dark colors in a few hours.

## 3. Fold, Don't Hang, Heavier Pieces

A 360 GSM hoodie hanging in your closet? The shoulders stretch, the hood sags, and within three months it looks worn out without you having worn it.

**Rule:** Anything above 250 GSM goes folded on a shelf. T-shirts, light sweaters, and shirts you can hang on wide wooden hangers (not the wire kind from the dry cleaner).

Fold like a clothing store does. Three folds, shoulders inside, no crease through a print or logo. One minute of work per piece.

## 4. The 5-Minute Stain Protocol

Most stains come out if you handle them within five minutes. Wait three days for the next wash? The stain settles in and is virtually impossible to remove completely.

**What works on most stains:**
- Cold water (warm sets protein-based stains)
- One drop of dish soap
- Dab, don't rub
- Rinse out five minutes later

For tougher stains (red wine, coffee, grass), a separate stain pen in your bag. Three euros at a drugstore, saves one outfit per quarter.

## 5. Remove Pilling Without Destroying the Fabric

Pilling, those small balls of fiber that appear on used sweaters, doesn't mean a piece is worn out. It means it experienced friction. Removing pills is a five-minute job.

**What works:**
- A cheap pill shaver (10 to 15 euros, lasts years)
- A razor blade (carefully, kept flat)
- A scouring sponge (only on durable fabric)

**What absolutely doesn't work:** Scissors. You'll cut a hole before you realize it.

## 6. The Rest Rule: 2 Days Between Wears

Fibers need rest. A hoodie worn three days in a row loses its shape faster than a hoodie alternated with other pieces.

**Practical:** Keep at least two hoodies and two sweaters in rotation. Wear one, hang the other to air. Switch the next day.

Bonus: you'll always know which clothing you actually wear often, because they need a rest day every week.

## 7. When Is a Piece Finally Done?

Sometimes a piece is genuinely worn out. Holes in the seams, worn-through fabric, a zipper beyond repair. Then it's time to say goodbye.

**What you don't do:** Throw it in the paper bin. Textile doesn't belong with paper.

**What you do:**
- Repair at a tailor (holes in jeans, zippers, seams, often under 20 euros)
- An honest secondhand store or textile container (not everything, but much can have a second life)
- Return to a retailer with a take-back program

A MOSE hoodie that's truly done goes back to our workshop in Groningen. What's still usable gets reused, the rest gets processed. No small print, just how it should work.

## The MOSE Contribution

We make clothing designed to last five years. Double-stitched seams, fabric that never drops below 220 GSM, and details that don't disappear after the first wash. But even the best piece doesn't make it without care.

A 90-euro hoodie that lasts five years costs you 18 euros per year. A 25-euro hoodie that lasts eight months costs you 38 euros per year. The math does itself, as long as you know how to make a 90-euro hoodie last five years.

Buying good clothing is step one. Treating it well is step two. The rest happens by itself.`,
  category: 'sustainability',
  tags: [
    'duurzaamheid',
    'kledingonderhoud',
    'cost-per-wear',
    'wassen',
    'levensduur',
    'hoodie',
    'kwaliteit',
  ],
  reading_time: 7,
  seo_title_nl: 'Hoe Je Je Kleding 5 Jaar Laat Meegaan: 7 Onderhoudstips | MOSE Blog',
  seo_title_en: 'How to Make Your Clothing Last 5 Years: 7 Care Tips | MOSE Blog',
  seo_description_nl:
    'De meeste kleding gaat niet kapot, je behandelt het verkeerd. 7 concrete onderhoudstips om je kleding vijf jaar mee te laten gaan, getest in de MOSE-workshop.',
  seo_description_en:
    "Most clothing doesn't break, you treat it wrong. 7 concrete care tips to make your clothing last five years, tested in the MOSE workshop.",
  published_at: '2026-05-26T08:00:00Z',
  featured_image_url: `${IMAGES_BUCKET}/lookbook/03-stone-desktop.webp`,
}

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
    console.error(`❌ ${post.slug}: ${error.message}`)
    process.exitCode = 1
    return
  }
  console.log(`✅ Upserted: ${data?.slug}  (${data?.published_at?.slice(0, 10)}, ${data?.category})`)
}

async function main() {
  console.log('Seeding 2 new MOSE blog posts (May 2026 window)...\n')
  await upsertPost(POST_1)
  await upsertPost(POST_2)
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
