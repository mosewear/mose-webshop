'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LookbookSettings {
  header_title: string
  header_subtitle: string
  hero_image_url: string
  hero_title: string
  hero_subtitle: string
  section1_image_url: string
  section1_title: string
  section1_text: string
  section1_cta_text: string
  section1_cta_link: string
  section2_image_url: string
  section2_title: string
  section2_text: string
  section2_cta_text: string
  section2_cta_link: string
  quote_text: string
  quote_subtext: string
  triple1_image_url: string
  triple1_title: string
  triple2_image_url: string
  triple2_title: string
  triple3_image_url: string
  triple3_title: string
  wide_image_url: string
  wide_title: string
  wide_cta_text: string
  wide_cta_link: string
  final_cta_title: string
  final_cta_text: string
  final_cta_button_text: string
  final_cta_button_link: string
}

export default function LookbookPage() {
  const [settings, setSettings] = useState<LookbookSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('lookbook_settings')
        .select('*')
        .single()

      if (error) throw error
      setSettings(data)
    } catch (error) {
      console.error('Error fetching lookbook settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="text-center py-12 md:py-16 px-4">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display tracking-tight mb-4">
          {settings.header_title}
        </h1>
        <p className="text-base md:text-xl text-gray-700">
          {settings.header_subtitle}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 space-y-8 md:space-y-12">
        {/* HERO */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] border-2 lg:border-4 border-black overflow-hidden">
          <Image
            src={settings.hero_image_url}
            alt={settings.hero_title}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center text-center text-white px-4">
            <div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display mb-3 md:mb-4 tracking-tight">
                {settings.hero_title}
              </h2>
              <p className="text-base md:text-xl lg:text-2xl opacity-90">
                {settings.hero_subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Image Left + Text Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          <div className="lg:col-span-2 relative aspect-[3/4] border-2 border-black overflow-hidden group">
            <Image
              src={settings.section1_image_url}
              alt={settings.section1_title}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="lg:col-span-3 border-2 border-black p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 tracking-tight">
              {settings.section1_title}
            </h3>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8">
              {settings.section1_text}
            </p>
            <Link
              href={settings.section1_cta_link}
              className="inline-flex items-center gap-2 bg-black text-white px-6 md:px-8 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors self-start"
            >
              {settings.section1_cta_text}
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* SECTION 2: Text Left + Image Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          <div className="lg:col-span-3 border-2 border-black p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white order-2 lg:order-1">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 tracking-tight">
              {settings.section2_title}
            </h3>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8">
              {settings.section2_text}
            </p>
            <Link
              href={settings.section2_cta_link}
              className="inline-flex items-center gap-2 bg-black text-white px-6 md:px-8 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors self-start"
            >
              {settings.section2_cta_text}
              <ArrowRight size={20} />
            </Link>
          </div>

          <div className="lg:col-span-2 relative aspect-[3/4] border-2 border-black overflow-hidden group order-1 lg:order-2">
            <Image
              src={settings.section2_image_url}
              alt={settings.section2_title}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>

        {/* QUOTE BLOCK */}
        <div className="bg-black text-white border-2 lg:border-4 border-black p-8 md:p-12 lg:p-16 text-center">
          <blockquote className="text-2xl md:text-4xl lg:text-5xl font-display leading-tight mb-6 md:mb-8">
            "{settings.quote_text}"
          </blockquote>
          <p className="text-base md:text-lg lg:text-xl opacity-90 max-w-3xl mx-auto">
            {settings.quote_subtext}
          </p>
        </div>

        {/* TRIPLE SPLIT */}
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Item 1 */}
            <div className="group">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src={settings.triple1_image_url}
                  alt={settings.triple1_title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                {settings.triple1_title}
              </h4>
            </div>

            {/* Item 2 */}
            <div className="group">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src={settings.triple2_image_url}
                  alt={settings.triple2_title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                {settings.triple2_title}
              </h4>
            </div>

            {/* Item 3 */}
            <div className="group col-span-2 md:col-span-1">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src={settings.triple3_image_url}
                  alt={settings.triple3_title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                {settings.triple3_title}
              </h4>
            </div>
          </div>
        </div>

        {/* WIDE LIFESTYLE PHOTO */}
        <div className="relative w-full aspect-[16/9] md:aspect-[16/7] border-2 lg:border-4 border-black overflow-hidden group">
          <Image
            src={settings.wide_image_url}
            alt={settings.wide_title}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center p-6 md:p-8 lg:p-12">
            <div className="text-center text-white max-w-2xl">
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 md:mb-6 tracking-tight">
                {settings.wide_title}
              </h3>
              <Link
                href={settings.wide_cta_link}
                className="inline-flex items-center gap-2 bg-white text-black px-8 md:px-10 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                {settings.wide_cta_text}
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>

        {/* FINAL GREEN CTA */}
        <div className="bg-brand-primary text-white border-2 lg:border-4 border-brand-primary p-8 md:p-12 lg:p-16 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display mb-4 md:mb-6 tracking-tight">
            {settings.final_cta_title}
          </h2>
          <p className="text-base md:text-lg lg:text-xl mb-8 md:mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
            {settings.final_cta_text}
          </p>
          <Link
            href={settings.final_cta_button_link}
            className="inline-flex items-center gap-2 bg-white text-brand-primary px-10 md:px-12 py-4 md:py-5 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-base md:text-lg"
          >
            {settings.final_cta_button_text}
            <ArrowRight size={22} />
          </Link>
        </div>
      </div>
    </div>
  )
}
