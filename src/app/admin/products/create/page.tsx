'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LanguageTabs from '@/components/admin/LanguageTabs'
import GiftCardFields, { type GiftCardFieldsValue } from '@/components/admin/GiftCardFields'

interface Category {
  id: string
  name: string
}

export default function CreateProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    slug: '',
    description: '',
    description_en: '',
    base_price: '',
    sale_price: '',
    category_id: '',
    meta_title: '',
    meta_description: '',
  })

  const [giftCard, setGiftCard] = useState<GiftCardFieldsValue>({
    is_gift_card: false,
    allows_custom_amount: false,
    gift_card_min_amount: '',
    gift_card_max_amount: '',
    gift_card_default_validity_months: '24',
  })

  // Single publish state. Mirrors onto both `products.status` and
  // `products.is_active` on insert so the storefront stays in sync.
  const [status, setStatus] = useState<'active' | 'draft'>('active')

  const isGift = giftCard.is_gift_card

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
    
    if (data) setCategories(data)
  }

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    setFormData({ ...formData, name, slug })
  }

  const handleNameEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name_en = e.target.value
    setFormData({ ...formData, name_en })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.name || !formData.slug || !formData.base_price) {
        throw new Error('Vul alle verplichte velden in')
      }

      // Gift cards never have a sale price — silently clear it so admin
      // doesn't accidentally persist a stale value after toggling on.
      const effectiveSalePrice = isGift ? '' : formData.sale_price

      if (effectiveSalePrice) {
        const salePrice = parseFloat(effectiveSalePrice)
        const basePrice = parseFloat(formData.base_price)
        
        if (salePrice < 0) {
          throw new Error('Sale prijs kan niet negatief zijn')
        }
        if (salePrice >= basePrice) {
          throw new Error('Sale prijs moet lager zijn dan de normale prijs')
        }
      }

      let giftCardMin: number | null = null
      let giftCardMax: number | null = null
      let giftCardValidity: number | null = null
      if (isGift) {
        if (giftCard.allows_custom_amount) {
          giftCardMin = parseFloat(giftCard.gift_card_min_amount)
          giftCardMax = parseFloat(giftCard.gift_card_max_amount)
          if (!Number.isFinite(giftCardMin) || giftCardMin <= 0) {
            throw new Error('Vul een geldig minimum bedrag in voor de cadeaubon')
          }
          if (!Number.isFinite(giftCardMax) || giftCardMax <= giftCardMin) {
            throw new Error('Maximum bedrag moet groter zijn dan het minimum')
          }
        }
        if (giftCard.gift_card_default_validity_months) {
          const months = parseInt(giftCard.gift_card_default_validity_months, 10)
          if (!Number.isFinite(months) || months <= 0) {
            throw new Error('Standaard geldigheid moet een positief getal zijn')
          }
          giftCardValidity = months
        }
      }

      const { data, error: insertError } = await supabase
        .from('products')
        .insert([
          {
            name: formData.name,
            name_en: formData.name_en || null,
            slug: formData.slug,
            description: formData.description || null,
            description_en: formData.description_en || null,
            base_price: parseFloat(formData.base_price),
            sale_price: effectiveSalePrice ? parseFloat(effectiveSalePrice) : null,
            category_id: formData.category_id || null,
            meta_title: formData.meta_title || null,
            meta_description: formData.meta_description || null,
            // Single publish toggle — write both columns so the
            // storefront, sitemap and feeds remain consistent
            // regardless of which one they happen to filter on.
            status,
            is_active: status === 'active',
            is_gift_card: isGift,
            allows_custom_amount: isGift ? giftCard.allows_custom_amount : false,
            gift_card_min_amount: isGift ? giftCardMin : null,
            gift_card_max_amount: isGift ? giftCardMax : null,
            gift_card_default_validity_months: isGift ? giftCardValidity : null,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Cadeaubon → direct naar coupures zodat ze meteen beheerd kunnen worden.
      if (isGift && data?.id) {
        router.push(`/admin/products/${data.id}/variants`)
      } else {
        router.push('/admin/products')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin/products"
          className="p-2 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1 sm:mb-2">
            {isGift ? 'Nieuwe Cadeaubon' : 'Nieuw Product'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isGift
              ? 'Maak een cadeaubon aan. Na opslaan kun je de coupures (bedragen) instellen.'
              : 'Voeg een nieuw product toe aan je webshop'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 p-5 sm:p-8">
        {/* Publish status — single source of truth for storefront visibility. */}
        <div className="mb-6 border-2 border-gray-200 p-4 sm:p-5 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Status
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {status === 'active'
                  ? 'Direct zichtbaar in de shop, sitemap en productfeeds.'
                  : 'Verborgen voor klanten — alleen zichtbaar in de admin.'}
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="Productstatus"
              className="inline-flex border-2 border-black bg-white self-start"
            >
              <button
                type="button"
                role="radio"
                aria-checked={status === 'draft'}
                onClick={() => setStatus('draft')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${
                  status === 'draft'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Concept
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={status === 'active'}
                onClick={() => setStatus('active')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider border-l-2 border-black transition-colors ${
                  status === 'active'
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Actief
              </button>
            </div>
          </div>
        </div>

        {/* Product type selector — always at the top so admin sees immediately
            which mode the product is in and can flip it before filling out fields. */}
        <div className="mb-6">
          <GiftCardFields value={giftCard} onChange={setGiftCard} />
        </div>

        <LanguageTabs 
          activeLanguage={activeLanguage}
          onLanguageChange={setActiveLanguage}
        />
        
        <div className="space-y-6">
          {/* Product Name */}
          <div>
            <label htmlFor={`name_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              {isGift ? 'Naam cadeaubon' : 'Productnaam'}{' '}
              ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels'}) {activeLanguage === 'nl' && '*'}
            </label>
            <input
              type="text"
              id={`name_${activeLanguage}`}
              required={activeLanguage === 'nl'}
              value={activeLanguage === 'nl' ? formData.name : formData.name_en}
              onChange={activeLanguage === 'nl' ? handleNameChange : handleNameEnChange}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder={
                isGift
                  ? activeLanguage === 'nl' ? 'Bijv. MOSE Cadeaubon' : 'E.g. MOSE Gift Card'
                  : activeLanguage === 'nl' ? 'Bijv. MOSE Classic Hoodie' : 'E.g. MOSE Classic Hoodie'
              }
            />
          </div>

          {/* Slug - Only in NL mode */}
          {activeLanguage === 'nl' && (
            <div>
            <label htmlFor="slug" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              URL Slug *
            </label>
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
              placeholder={isGift ? 'mose-cadeaubon' : 'mose-classic-hoodie'}
            />
            <p className="mt-2 text-sm text-gray-500">
              Automatisch gegenereerd, maar je kunt het aanpassen
            </p>
          </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor={`description_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Beschrijving ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels - optioneel'})
            </label>
            <textarea
              id={`description_${activeLanguage}`}
              rows={6}
              value={activeLanguage === 'nl' ? formData.description : formData.description_en}
              onChange={(e) => setFormData({ 
                ...formData, 
                [activeLanguage === 'nl' ? 'description' : 'description_en']: e.target.value 
              })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
              placeholder={
                isGift
                  ? activeLanguage === 'nl'
                    ? 'Korte beschrijving van de cadeaubon...'
                    : 'Short description of the gift card...'
                  : activeLanguage === 'nl'
                    ? 'Uitgebreide productbeschrijving...'
                    : 'Detailed product description...'
              }
            />
            <p className="text-sm text-gray-500 mt-1">
              💡 Tip: Gebruik ** om tekst <strong>bold</strong> te maken (bijvoorbeeld: **premium materials**)
            </p>
          </div>

          {/* Price & Category - Only in NL mode */}
          {activeLanguage === 'nl' && (
            <>
            {/* Prijs-blok: voor cadeaubonnen alleen de basisprijs, geen sale. */}
            <div className={isGift ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
            <div>
              <label htmlFor="base_price" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                {isGift ? 'Basisprijs / laagste coupure (€) *' : 'Normale Prijs (€) *'}
              </label>
              <input
                type="number"
                id="base_price"
                required
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={isGift ? '25.00' : '79.99'}
              />
              {isGift && (
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  Dit is de laagste coupure. Hogere coupures komen erbij als varianten met een
                  positieve prijs-aanpassing.
                </p>
              )}
            </div>

            {!isGift && (
              <div>
                <label htmlFor="sale_price" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Sale Prijs (€)
                </label>
                <input
                  type="number"
                  id="sale_price"
                  step="0.01"
                  min="0"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="59.99"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Laat leeg voor geen korting
                </p>
              </div>
            )}
          </div>

          {/* Sale Preview — alleen voor standaard producten */}
          {!isGift && formData.sale_price && formData.base_price && parseFloat(formData.sale_price) < parseFloat(formData.base_price) && parseFloat(formData.sale_price) > 0 && (
            <div className="bg-green-50 border-2 border-green-200 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-600 text-white px-3 py-1 text-sm font-bold uppercase tracking-wider">
                  {Math.round((1 - parseFloat(formData.sale_price) / parseFloat(formData.base_price)) * 100)}% KORTING
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2">
                    Korting Actief
                  </p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-3xl font-bold text-red-600">
                      €{parseFloat(formData.sale_price).toFixed(2)}
                    </p>
                    <p className="text-xl line-through text-gray-400">
                      €{parseFloat(formData.base_price).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-green-600 font-semibold mt-1">
                    Klant bespaart: €{(parseFloat(formData.base_price) - parseFloat(formData.sale_price)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorie
            </label>
            <select
              id="category_id"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
            >
              <option value="">Geen categorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* SEO Section */}
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide mb-4">
              SEO Instellingen (Optioneel)
            </h3>

            {/* Meta Title */}
            <div className="mb-4">
              <label htmlFor="meta_title" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Meta Title
              </label>
              <input
                type="text"
                id="meta_title"
                maxLength={60}
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder={isGift ? 'Bijv. MOSE Cadeaubon — Altijd een goed idee' : 'Bijv. MOSE Classic Hoodie - Lokaal Gemaakt'}
              />
              <p className="mt-2 text-sm text-gray-500">
                {formData.meta_title.length}/60 karakters
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label htmlFor="meta_description" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Meta Description
              </label>
              <textarea
                id="meta_description"
                rows={3}
                maxLength={160}
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
                placeholder="Korte beschrijving voor in zoekmachines..."
              />
              <p className="mt-2 text-sm text-gray-500">
                {formData.meta_description.length}/160 karakters
              </p>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-8 pt-6 border-t-2 border-gray-200">
          <Link
            href="/admin/products"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 sm:px-8 uppercase tracking-wider transition-colors text-center"
          >
            Annuleren
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 sm:px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? isGift ? 'Cadeaubon Aanmaken...' : 'Product Aanmaken...'
              : isGift ? 'Cadeaubon Aanmaken' : 'Product Aanmaken'}
          </button>
        </div>
      </form>
    </div>
  )
}
