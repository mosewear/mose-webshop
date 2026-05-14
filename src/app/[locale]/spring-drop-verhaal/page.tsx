import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/routing'

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

const NL_PARAGRAPHS = [
  'Misschien ken je ons al een beetje, of misschien is dit je eerste mail van ons. In beide gevallen: leuk dat je meeleest!',
  'Wij zijn Irma en Rick, de oprichters van MOSE. We wonen in Groningen met onze katten Bob en Marley en onze (verwende) hond Guus. MOSE is vernoemd naar onze overleden kat Mosie, oftewel Moos. 🐱',
  'We zijn begonnen met MOSE omdat fast fashion ons mateloos irriteerde. T-shirts die na een paar keer wassen hun vorm verliezen, daar werden we gek van. Maar ook het idee dat je vaak niet weet waar kleding vandaan komt, door wie het gemaakt is en onder welke omstandigheden. Er is al meer dan genoeg kleding op de wereld. Wij willen juist bijdragen aan minder, maar beter.',
  'Daarom kiezen we bewust voor een kleine collectie met sterke basics van hoge kwaliteit. Geen tientallen kleuren, drops of trends die elkaar in hoog tempo opvolgen, maar kleding die je vaak draagt en lang mooi blijft.',
  'Alles wordt eerlijk en lokaal geproduceerd in een atelier in Groningen. Geen massaproductie aan de andere kant van de wereld, maar transparantie, kwaliteit en aandacht voor het maakproces.',
  'Hieronder vind je onze 3 items voor het voorjaar: de Tee, de Hoodie en de Sweater. De hoodie en sweater staan nu in de lente-sale. Op de Tee krijg je automatisch staffelkorting in je winkelmand. Des te meer je toevoegt, des te hoger de korting. Nice!',
  'We rekenen nooit verzendkosten, en als het niet past mag je binnen 30 dagen ruilen of retourneren.',
  'Natuurlijk dromen we ervan om MOSE verder uit te breiden met meer items en nieuwe ideeën. Maar dat kunnen we alleen samen met jullie. Elke bestelling helpt ons om stap voor stap verder te bouwen aan een eerlijker kledingmerk.',
]

const EN_PARAGRAPHS = [
  'Maybe you already know us a little, or maybe this is your first email from us. Either way: glad you are reading along!',
  'We are Irma and Rick, the founders of MOSE. We live in Groningen with our cats Bob and Marley and our (spoilt) dog Guus. MOSE is named after our late cat Mosie, or Moos. 🐱',
  'We started MOSE because fast fashion drove us mad. T-shirts that lost their shape after a few washes drove us crazy. So did not knowing where clothes come from, who made them, and under what conditions. There is already more than enough clothing in the world. We want to contribute to less, but better.',
  'That is why we deliberately choose a small collection of strong, high-quality basics. No dozens of colours, drops or trends that replace each other at breakneck speed, but clothes you wear often that stay beautiful for a long time.',
  'Everything is produced fairly and locally in a studio in Groningen. No mass production on the other side of the world, but transparency, quality and attention to how things are made.',
  'Below you will find our 3 items for spring: the Tee, the Hoodie and the Sweater. The hoodie and sweater are now in the spring sale. On the Tee you get automatic tiered discount in your cart. The more you add, the higher the discount. Nice!',
  'We never charge shipping, and if it does not fit you can exchange or return within 30 days.',
  'Of course we dream of growing MOSE with more items and new ideas. But we can only do that together with you. Every order helps us build, step by step, towards a fairer clothing brand.',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  return {
    title: isEn ? 'Our story | Spring 2026 | MOSE' : 'Ons verhaal | Lente 2026 | MOSE',
    description: isEn
      ? 'Why MOSE exists, how we produce in Groningen, and what we believe about less, but better.'
      : 'Waarom MOSE bestaat, hoe we produceren in Groningen, en wat we geloven over minder, maar beter.',
  }
}

export default async function SpringDropVerhaalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const isEn = locale === 'en'
  const paragraphs = isEn ? EN_PARAGRAPHS : NL_PARAGRAPHS

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-gray-500 mb-6">
          <Link href="/" className="underline hover:text-black">
            {isEn ? 'Back to home' : 'Terug naar home'}
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span>{isEn ? 'Spring 2026' : 'Lente 2026'}</span>
        </p>
        <h1 className="text-4xl md:text-6xl font-display mb-8 leading-tight">
          {isEn ? 'Why we built MOSE' : 'Waarom we MOSE bouwen'}
        </h1>
        <div className="space-y-6 text-gray-800 leading-relaxed text-base md:text-lg">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-12 pt-10 border-t-2 border-black">
          <p className="text-gray-700 mb-4">
            {isEn
              ? 'Ready to see the spring pieces?'
              : 'Klaar om de lentestukken te zien?'}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-wider text-sm hover:bg-brand-primary transition-colors border-2 border-black"
          >
            {isEn ? 'To the shop' : 'Naar de shop'}
          </Link>
        </div>
      </div>
    </div>
  )
}
