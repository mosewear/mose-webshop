import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import { createAnonClient } from '@/lib/supabase/server'
import { getAboutSettings, renderNoHassleText } from '@/lib/about'

export const revalidate = 1800

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

async function getReturnsAndShipping(): Promise<{
  return_days: number
  free_shipping_threshold: number
}> {
  try {
    const supabase = createAnonClient()
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['return_days', 'free_shipping_threshold'])

    const map: Record<string, string | undefined> = {}
    ;(data ?? []).forEach((row: { key: string; value: string }) => {
      map[row.key] = row.value
    })

    return {
      return_days: parseInt(map.return_days || '14', 10) || 14,
      free_shipping_threshold:
        parseFloat(map.free_shipping_threshold || '100') || 100,
    }
  } catch {
    return { return_days: 14, free_shipping_threshold: 100 }
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [about, shipping] = await Promise.all([
    getAboutSettings(locale),
    getReturnsAndShipping(),
  ])

  const focal = `${about.image_focal_x}% ${about.image_focal_y}%`
  const noHassleText = renderNoHassleText(
    about.value_no_hassle_text,
    shipping.return_days,
    shipping.free_shipping_threshold,
  )

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">
            {about.hero_title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700">
            {about.hero_subtitle}
          </p>
        </div>

        {/* Story Image — art-directed: portrait on mobile, landscape on desktop */}
        <div className="relative aspect-[4/5] md:aspect-[3/2] mb-12 border-2 border-black overflow-hidden">
          {/* Mobile / portrait */}
          <Image
            src={about.hero_image_url_mobile || about.hero_image_url}
            alt={about.hero_alt}
            fill
            sizes="(max-width: 768px) 100vw, 0px"
            className="md:hidden object-cover"
            style={{ objectPosition: focal }}
            priority
          />
          {/* Desktop / landscape */}
          <Image
            src={about.hero_image_url}
            alt={about.hero_alt}
            fill
            sizes="(min-width: 768px) 896px, 0px"
            className="hidden md:block object-cover"
            style={{ objectPosition: focal }}
            priority
          />
        </div>

        {/* Story Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">{about.story_title}</h2>
            <p className="text-gray-700 leading-relaxed">
              {about.story_paragraph1}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {about.story_paragraph2}
            </p>
          </div>

          <div className="bg-brand-primary/10 border-2 border-brand-primary p-8">
            <h3 className="text-2xl font-display mb-4">{about.local_title}</h3>
            <p className="text-gray-800 leading-relaxed">{about.local_text}</p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{about.values_title}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">
                  {about.value_quality_title}
                </h3>
                <p className="text-gray-700">{about.value_quality_text}</p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">
                  {about.value_local_made_title}
                </h3>
                <p className="text-gray-700">{about.value_local_made_text}</p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">
                  {about.value_fair_pricing_title}
                </h3>
                <p className="text-gray-700">{about.value_fair_pricing_text}</p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">
                  {about.value_no_hassle_title}
                </h3>
                <p className="text-gray-700">{noHassleText}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{about.why_title}</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{about.why_sustainable_title}:</strong>{' '}
                  {about.why_sustainable_text}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{about.why_stylish_title}:</strong>{' '}
                  {about.why_stylish_text}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{about.why_local_title}:</strong>{' '}
                  {about.why_local_text}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/shop"
            className="inline-block px-12 py-5 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-lg"
          >
            {about.cta_text}
          </Link>
        </div>
      </div>
    </div>
  )
}
