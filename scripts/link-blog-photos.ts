/**
 * MOSE blog: koppelt photoshoot-2026 foto's aan bestaande blogartikelen +
 * publiceert één nieuw artikel (de "Lente-Garderobe"-post van 4 mei 2026).
 *
 * Pipeline per artikel:
 *  1. Lees het bron-JPG uit `photoshoot-2026/<filename>`
 *  2. Resize → 2400px breed WebP @ Q82 via sharp (zelfde recipe als
 *     `deploy-photoshoot.ts`'s desktop-variant — leveraged voor consistentie)
 *  3. Upload naar `images/photoshoot-2026/blog/<slug>-desktop.webp`
 *     (idempotent via `upsert: true`, cache-control 1 jaar)
 *  4. UPSERT `blog_posts` op `slug` met de publieke URL als
 *     `featured_image_url` — bestaande velden worden NIET aangetast
 *     (we doen een targeted UPDATE, niet een full upsert)
 *
 * Het nieuwe artikel wordt aan het einde via een full upsert toegevoegd
 * met datum 4 mei 2026, gekoppeld aan
 * `editorial_tee_white_canal-back-blossoms_portrait.jpg` (canal +
 * blossoms = lente in Groningen).
 *
 * Hergebruik van uploads is veilig: dezelfde key + upsert: true vervangt
 * bestaande objecten zonder downtime.
 *
 * Run:  npx tsx scripts/link-blog-photos.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ROOT = path.resolve(__dirname, '..')
const PHOTOSHOOT_DIR = path.join(ROOT, 'photoshoot-2026')
const BUCKET = 'images'

interface BlogPhotoLink {
  /** Slug van het BESTAANDE blogartikel (matcht 1-op-1 met seed-script). */
  slug: string
  /** Bestandsnaam in `photoshoot-2026/`. */
  source: string
  /** Korte uitleg waarom deze foto past — alleen voor logging. */
  rationale: string
}

const PHOTO_LINKS: BlogPhotoLink[] = [
  {
    slug: 'waarom-fast-fashion-kapot-is',
    source: 'lifestyle_hoodies_brown-olive_graffiti-walk-forward_portrait.jpg',
    rationale: 'duo loopt frontaal naar voren — symbool van vooruitgang, weg van fast fashion',
  },
  {
    slug: 'de-perfecte-winter-hoodie-koopgids',
    source: 'hero_hoodie_brown_concrete-hood-up_portrait.jpg',
    rationale: 'hood-up tegen ruwe betonwand — winter-mood pur sang',
  },
  {
    slug: 'capsule-wardrobe-mannen-minder-kleding-meer-stijl',
    source: 'crop_hoodies_trio-brown-black-olive_graffiti_landscape.jpg',
    rationale: 'crop met drie kleurvarianten — visualiseert het capsule-principe',
  },
  {
    slug: 'lokaal-produceren-waarom-mose-kiest-voor-groningen',
    source: 'group_sweater_quartet-white-black_facade-arches_landscape.jpg',
    rationale: 'kwartet voor klassieke Groningse facade — "made in Groningen" letterlijk',
  },
  {
    slug: 'kwaliteit-vs-kwantiteit-echte-kosten-kleding',
    source: 'detail_sweater_cream_chest-puff-logo_portrait.jpg',
    rationale: '3D puff-logo close-up — toont vakmanschap dat kwaliteit verdedigt',
  },
  {
    slug: '5-tijdloze-basics-die-iedereen-nodig-heeft',
    source: 'group_hoodies_trio-brown-black-olive_graffiti-smile-line_portrait.jpg',
    rationale: 'trio glimlachend op een rij — visualisatie van een set tijdloze basics',
  },
  {
    slug: 'van-schets-tot-product-hoe-een-mose-hoodie-ontstaat',
    source: 'detail_sweater_black_chest-logo-hand_portrait.jpg',
    rationale: 'hand op chest-logo detail — handwerk + ambacht in één frame',
  },
  {
    slug: 'streetwear-trends-2026-wat-blijft-wat-verdwijnt',
    source: 'lifestyle_hoodie_brown_graffiti-pink-hood-look_portrait.jpg',
    rationale: 'graffiti + hood-up + roze backdrop — peak streetwear 2026 esthetiek',
  },
  {
    slug: 'duurzame-mode-hoeft-niet-duur-te-zijn',
    source: 'lifestyle_tee_sand_canal-street-smile_portrait.jpg',
    rationale: 'lifestyle straat-shot, glimlach, betaalbare tee — toegankelijke duurzaamheid',
  },
  {
    slug: 'groningse-streetwear-scene-van-underground-tot-mainstream',
    source: 'hero_tee_black_canal-spring_portrait.jpg',
    rationale: 'gracht in Groningen op de achtergrond — de scene zélf',
  },
]

interface NewBlogPost {
  slug: string
  title_nl: string
  title_en: string
  excerpt_nl: string
  excerpt_en: string
  content_nl: string
  content_en: string
  category: string
  tags: string[]
  author: string
  reading_time: number
  status: 'published'
  seo_title_nl: string
  seo_title_en: string
  seo_description_nl: string
  seo_description_en: string
  published_at: string
  /** Bestandsnaam uit `photoshoot-2026/` voor de featured image. */
  source: string
}

/* Nieuw artikel — datum 4 mei 2026 (10:00 CEST = 08:00 UTC). Onderwerp:
   praktische lente-garderobe in 7 stukken. Past op de seizoenswissel
   en sluit naadloos aan bij de andere "minder maar beter"-content. */
const NEW_POST: NewBlogPost = {
  slug: 'de-perfecte-lente-garderobe-7-stukken-die-werken',
  title_nl: 'De Perfecte Lente-Garderobe: 7 Stukken Die Voor Alles Werken',
  title_en: 'The Perfect Spring Wardrobe: 7 Pieces That Work for Everything',
  excerpt_nl:
    'De Nederlandse lente is grillig. Vandaag zon, morgen regen. Dit zijn de 7 stukken die je door elk weertype én elke gelegenheid heen helpen, zonder dat je kast uit zijn voegen barst.',
  excerpt_en:
    'Dutch spring is unpredictable. Sun today, rain tomorrow. These are the 7 pieces that get you through any weather and any occasion without overflowing your closet.',
  category: 'style',
  tags: ['lente', 'garderobe', 'capsule', 'styling', 'basics', 'seizoen'],
  author: 'MOSE',
  reading_time: 6,
  status: 'published',
  published_at: '2026-05-04T08:00:00Z',
  seo_title_nl: 'De Perfecte Lente-Garderobe in 7 Stukken | MOSE Blog',
  seo_title_en: 'The Perfect Spring Wardrobe in 7 Pieces | MOSE Blog',
  seo_description_nl:
    'Bouw een lente-garderobe die door alle Nederlandse weertypes heen werkt. 7 essentiële stukken, eindeloos te combineren, zonder fast-fashion-stress.',
  seo_description_en:
    'Build a spring wardrobe that handles all Dutch weather types. 7 essential pieces, endlessly combinable, without fast-fashion stress.',
  source: 'editorial_tee_white_canal-back-blossoms_portrait.jpg',
  content_nl: `De Nederlandse lente is een sport. 's Ochtends jas aan, 's middags T-shirt, 's avonds weer een vest erover. Eén regenbui en je hele outfit ligt aan flarden. Geen wonder dat veel mensen hun garderobe in deze periode het meest stressvol vinden.

De oplossing is niet meer kleding. De oplossing is slimmer kiezen. Met 7 goed gekozen stukken kom je door elk lentescenario heen, van koffiedate in de zon tot fietsen door een plotselinge bui.

## 1. De middel-zware sweater

Niet zo dik als een winterhoodie, niet zo dun als een T-shirt. De middel-zware sweater (250-320 GSM) is je belangrijkste lente-stuk. Hij werkt op koele ochtenden, onder een lichte jas op gure dagen, en als enige laag op zonnige middagen.

**Waar je op let:**
- Gebreid katoen of katoen-modal blend
- Crewneck of half-zip — minder bulky dan een hoodie
- Neutrale kleur die met alles combineert (off-white, beige, grijs)

## 2. Twee kwalitatieve T-shirts

Begin niet met tien. Begin met twee. Een wit en een zwart, allebei van minimaal 200 GSM stof. Deze gaan je hele lente en zomer mee.

**Waarom 200+ GSM:** Dunne T-shirts (zoals fast-fashion-basics van 140 GSM) verliezen na drie wasbeurten hun vorm en worden doorschijnend. Een goede tee blijft jaren liggen.

## 3. De donkere jeans (slim of straight)

Jeans is jeans, denk je? Niet helemaal. Voor de lente kies je een donkere wash in slim of straight fit. Donker oogt formeler, vergeeft vlekken (denk: cappuccino-ongelukje), en combineert met letterlijk alles in je kast.

Wat je vermijdt: distressed jeans, light wash, en super skinny modellen. Die voelen verouderd in 2026.

## 4. De chino of canvas-broek

Voor warmere dagen, of als de jeans-look te casual is. Een chino in beige, olijfgroen of donkerblauw geeft direct een opgeruimder beeld zonder pak-en-das vibes. Canvas-werkbroeken doen hetzelfde maar met meer karakter.

**De pasvorm:** Niet te wijd (workwear-trend van 2024 is voorbij), niet te smal. Een tapered cut die op je schoen rust is de zweet-spot.

## 5. De lichtgewicht jas

Eén jas voor alles. Geen winterjas, geen regenjas, geen blazer — gewoon één goede tussenseizoens-jas die je tussen 5°C en 18°C aankunt.

**Wat werkt:**
- Werkjacket (Carhartt-stijl) in canvas
- Coach jacket in nylon of katoen
- Overshirt in zware twill
- Ongevoerde denim jacket

Allemaal water-afstotend genoeg voor een onverwachte miezerbui, ademend genoeg om niet in te zweten.

## 6. Schone sneakers

Een paar schone, eenvoudige sneakers in wit, off-white, of grijs. Geen knal-kleuren, geen extreme silhouetten, geen logo's die schreeuwen. Ze moeten passen bij elke broek én bij elke bovenkleding-keuze.

Tip: koop ze net iets duurder dan je eerste instinct. Een goed paar schone sneakers gaat 2-3 lentes mee, een goedkoop paar één seizoen.

## 7. De cap

Onmisbaar voor zonnige dagen, slechte-haardagen, en regenbuien. Een ongestructureerde cap in zwart of beige verandert direct elke outfit van "casual" naar "casual met intentie."

Vergeet trucker-caps met grote logo's of fluo-kleuren. Tijdloze cap = tijdloze look.

## Hoe combineer je deze 7 stukken?

Wiskundig: 2 T-shirts × 2 broeken × 2 sweaters/jassen-combinaties × 1 cap = 16+ unieke outfits zonder dat iemand merkt dat je dezelfde stukken steeds hergebruikt.

Praktisch:

- **Zonnige zaterdag:** wit T-shirt + chino + sneakers + cap
- **Frisse vrijdag:** zwart T-shirt + sweater + jeans + jasje
- **Regenachtige dinsdag:** sweater + jeans + jas + cap
- **Late-avond afspraak:** wit T-shirt + sweater + chino + sneakers

Geen ochtendstress, geen "ik heb niets om aan te trekken" paradox, geen impulsaankoop op weg naar je werk.

## De MOSE-bijdrage

Drie van deze 7 stukken kun je van ons krijgen: de classic sweater, de tee, en (binnenkort) een lente-cap. Ontworpen om elkaar te dragen, lokaal gemaakt in Groningen, en gemaakt om te blijven.

De rest haal je waar je wilt. Een kwaliteits-jeans bij een vakzaak. Een goede chino bij een Europees workwear-merk. Schone sneakers bij iemand die nog z'n eigen modellen ontwerpt. Het punt is niet om alles bij MOSE te kopen. Het punt is om bewust te kopen, periode.

Lente is een nieuwe start. Begin niet met meer kleding. Begin met betere kleding.`,
  content_en: `Dutch spring is a sport. Coat in the morning, T-shirt in the afternoon, sweater again at night. One rain shower and your whole outfit is shot. No wonder many people find their wardrobe most stressful in this period.

The solution isn't more clothing. The solution is choosing smarter. With 7 well-chosen pieces, you get through any spring scenario, from a coffee date in the sun to biking through a sudden shower.

## 1. The Mid-Weight Sweater

Not as thick as a winter hoodie, not as thin as a T-shirt. The mid-weight sweater (250-320 GSM) is your most important spring piece. It works on cool mornings, under a light jacket on dreary days, and as the only layer on sunny afternoons.

**What to look for:**
- Knitted cotton or cotton-modal blend
- Crewneck or half-zip — less bulky than a hoodie
- Neutral color that combines with everything (off-white, beige, grey)

## 2. Two Quality T-shirts

Don't start with ten. Start with two. One white, one black, both in fabric of at least 200 GSM. These will last all spring and summer.

**Why 200+ GSM:** Thin T-shirts (fast-fashion basics at 140 GSM) lose their shape after three washes and become see-through. A good tee lasts years.

## 3. Dark Jeans (Slim or Straight)

Jeans is jeans, you think? Not entirely. For spring, choose a dark wash in slim or straight fit. Dark looks more formal, hides stains (think: cappuccino accident), and combines with literally everything.

Avoid: distressed jeans, light wash, and super skinny models. They feel dated in 2026.

## 4. The Chino or Canvas Pant

For warmer days, or when jeans feel too casual. A chino in beige, olive, or dark blue immediately gives a tidier look without suit-and-tie vibes.

**The fit:** Not too wide (workwear trend of 2024 is over), not too narrow. A tapered cut resting on your shoe is the sweet spot.

## 5. The Lightweight Jacket

One jacket for everything. Not a winter coat, not a rain jacket, not a blazer — just one good transitional jacket that handles 5°C to 18°C.

**What works:** Workwear jacket in canvas, coach jacket in nylon or cotton, heavy twill overshirt, unlined denim jacket. All water-resistant enough for an unexpected drizzle, breathable enough not to sweat in.

## 6. Clean Sneakers

A pair of clean, simple sneakers in white, off-white, or grey. No bold colors, no extreme silhouettes, no shouting logos. They must match every pant and every top choice.

Tip: spend slightly more than your first instinct. A good clean sneaker lasts 2-3 springs, a cheap pair lasts one season.

## 7. The Cap

Essential for sunny days, bad-hair days, and rain showers. An unstructured cap in black or beige instantly changes any outfit from "casual" to "casual with intention."

Forget trucker caps with big logos or neon colors. Timeless cap = timeless look.

## How to Combine These 7 Pieces?

Mathematically: 2 T-shirts × 2 pants × 2 sweater/jacket combinations × 1 cap = 16+ unique outfits without anyone noticing you reuse the same pieces.

Practically:
- **Sunny Saturday:** white T-shirt + chino + sneakers + cap
- **Crisp Friday:** black T-shirt + sweater + jeans + jacket
- **Rainy Tuesday:** sweater + jeans + jacket + cap
- **Late-evening date:** white T-shirt + sweater + chino + sneakers

No morning stress, no "I have nothing to wear" paradox, no impulse purchase on your way to work.

## The MOSE Contribution

Three of these 7 pieces you can get from us: the classic sweater, the tee, and (soon) a spring cap. Designed to wear together, made locally in Groningen, made to last.

The rest you get wherever you like. A quality jeans at a specialist. A good chino at a European workwear brand. Clean sneakers from someone still designing their own models. The point isn't to buy everything at MOSE. The point is to buy consciously, period.

Spring is a fresh start. Don't start with more clothing. Start with better clothing.`,
}

interface ProcessedVariant {
  buffer: Buffer
  contentType: string
  ext: string
}

async function processDesktopVariant(input: Buffer): Promise<ProcessedVariant> {
  // Hetzelfde recipe als deploy-photoshoot.ts's `desktop` variant:
  // 2400px op de lange kant, WebP @ Q82, EXIF-rotatie gerespecteerd.
  const buffer = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  return { buffer, contentType: 'image/webp', ext: 'webp' }
}

function publicUrl(key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`
}

async function uploadBlogPhoto(slug: string, source: string): Promise<string> {
  const sourcePath = path.join(PHOTOSHOOT_DIR, source)
  const inputBuffer = await fs.readFile(sourcePath)
  const { buffer, contentType, ext } = await processDesktopVariant(inputBuffer)
  const key = `photoshoot-2026/blog/${slug}-desktop.${ext}`
  const sizeKb = (buffer.length / 1024).toFixed(0)
  process.stdout.write(`  · upload ${BUCKET}/${key} (${sizeKb} KB) ... `)
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) {
    console.log('FAIL')
    throw new Error(`upload ${source}: ${error.message}`)
  }
  console.log('ok')
  return publicUrl(key)
}

async function linkExistingPost(link: BlogPhotoLink): Promise<void> {
  console.log(`▶ ${link.slug}`)
  console.log(`  · src   ${link.source}`)
  console.log(`  · why   ${link.rationale}`)

  const url = await uploadBlogPhoto(link.slug, link.source)

  const { data, error } = await supabase
    .from('blog_posts')
    .update({ featured_image_url: url })
    .eq('slug', link.slug)
    .select('id, slug')
    .maybeSingle()

  if (error) {
    throw new Error(`update ${link.slug}: ${error.message}`)
  }
  if (!data) {
    console.log(`  · ! no row found for slug ${link.slug} (skipping)`)
    return
  }
  console.log(`  · linked → blog_posts.id=${data.id}`)
}

async function upsertNewPost(post: NewBlogPost): Promise<void> {
  console.log(`▶ NEW POST  ${post.slug}`)
  console.log(`  · src   ${post.source}`)

  const url = await uploadBlogPhoto(post.slug, post.source)

  // `source` is alleen voor de upload-stap; staat niet in de DB-tabel.
  const { source, ...row } = post
  void source
  const fullRow = { ...row, featured_image_url: url }

  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(fullRow, { onConflict: 'slug' })
    .select('id, slug, title_nl, published_at')
    .single()

  if (error) {
    throw new Error(`upsert new post: ${error.message}`)
  }
  console.log(
    `  · published → ${data.title_nl} (${data.published_at}) id=${data.id}`,
  )
}

async function main() {
  console.log(`Linking ${PHOTO_LINKS.length} bestaande artikelen + 1 nieuw artikel\n`)

  for (const link of PHOTO_LINKS) {
    await linkExistingPost(link)
  }

  console.log('')
  await upsertNewPost(NEW_POST)

  console.log('\n✓ Klaar.')
}

main().catch((err) => {
  console.error('\n✗ link-blog-photos failed:', err)
  process.exit(1)
})
