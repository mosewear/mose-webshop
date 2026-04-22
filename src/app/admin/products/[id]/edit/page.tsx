'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LanguageTabs from '@/components/admin/LanguageTabs'
import GiftCardFields, { type GiftCardFieldsValue } from '@/components/admin/GiftCardFields'
import { Trash2, Plus } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  name_en: string | null
  slug: string
  description: string | null
  description_en: string | null
  base_price: number
  sale_price: number | null
  category_id: string | null
  meta_title: string | null
  meta_description: string | null
}

interface QuantityDiscountTier {
  id?: string
  product_id: string
  min_quantity: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  is_active: boolean
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')
  const router = useRouter()
  const supabase = createClient()

  const [discountTiers, setDiscountTiers] = useState<QuantityDiscountTier[]>([])
  const [newTier, setNewTier] = useState({ min_quantity: '2', discount_type: 'percentage' as 'percentage' | 'fixed', discount_value: '' })
  const [savingTiers, setSavingTiers] = useState(false)

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
    gift_card_default_validity_months: '',
  })

  useEffect(() => {
    fetchCategories()
    if (id) {
      fetchProduct(id)
      fetchDiscountTiers(id)
    }
  }, [id])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
    
    if (data) setCategories(data)
  }

  const fetchProduct = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        const product = data as Product & {
          is_gift_card?: boolean | null
          allows_custom_amount?: boolean | null
          gift_card_min_amount?: number | string | null
          gift_card_max_amount?: number | string | null
          gift_card_default_validity_months?: number | string | null
        }
        setFormData({
          name: product.name,
          name_en: product.name_en || '',
          slug: product.slug,
          description: product.description || '',
          description_en: product.description_en || '',
          base_price: product.base_price.toString(),
          sale_price: product.sale_price?.toString() || '',
          category_id: product.category_id || '',
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
        })
        setGiftCard({
          is_gift_card: Boolean(product.is_gift_card),
          allows_custom_amount: Boolean(product.allows_custom_amount),
          gift_card_min_amount:
            product.gift_card_min_amount != null ? String(product.gift_card_min_amount) : '',
          gift_card_max_amount:
            product.gift_card_max_amount != null ? String(product.gift_card_max_amount) : '',
          gift_card_default_validity_months:
            product.gift_card_default_validity_months != null
              ? String(product.gift_card_default_validity_months)
              : '',
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDiscountTiers = async (productId: string) => {
    const { data } = await supabase
      .from('product_quantity_discounts')
      .select('*')
      .eq('product_id', productId)
      .order('min_quantity')
    if (data) setDiscountTiers(data)
  }

  const handleAddTier = async () => {
    const minQty = parseInt(newTier.min_quantity)
    const discVal = parseFloat(newTier.discount_value)
    if (!minQty || minQty < 2) return alert('Minimum aantal moet 2 of meer zijn')
    if (!discVal || discVal <= 0) return alert('Kortingswaarde moet groter dan 0 zijn')
    if (newTier.discount_type === 'percentage' && discVal >= 100) return alert('Percentage moet onder 100% zijn')
    if (discountTiers.some(t => t.min_quantity === minQty)) return alert('Er bestaat al een staffel voor dit aantal')

    setSavingTiers(true)
    const { error } = await supabase.from('product_quantity_discounts').insert([{
      product_id: id,
      min_quantity: minQty,
      discount_type: newTier.discount_type,
      discount_value: discVal,
      is_active: true,
    }])
    if (error) { alert(`Fout: ${error.message}`); setSavingTiers(false); return }
    await fetchDiscountTiers(id)
    setNewTier({ min_quantity: '2', discount_type: 'percentage', discount_value: '' })
    setSavingTiers(false)
  }

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Weet je zeker dat je deze staffel wilt verwijderen?')) return
    const { error } = await supabase.from('product_quantity_discounts').delete().eq('id', tierId)
    if (error) { alert(`Fout: ${error.message}`); return }
    await fetchDiscountTiers(id)
  }

  const handleToggleTier = async (tierId: string, currentActive: boolean) => {
    const { error } = await supabase.from('product_quantity_discounts')
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq('id', tierId)
    if (error) { alert(`Fout: ${error.message}`); return }
    await fetchDiscountTiers(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Validatie
      if (!formData.name || !formData.slug || !formData.base_price) {
        throw new Error('Vul alle verplichte velden in')
      }

      // Valideer sale price
      if (formData.sale_price) {
        const salePrice = parseFloat(formData.sale_price)
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
      if (giftCard.is_gift_card) {
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

      // Update product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          name_en: formData.name_en || null,
          slug: formData.slug,
          description: formData.description || null,
          description_en: formData.description_en || null,
          base_price: parseFloat(formData.base_price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          category_id: formData.category_id || null,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          is_gift_card: giftCard.is_gift_card,
          allows_custom_amount: giftCard.is_gift_card ? giftCard.allows_custom_amount : false,
          gift_card_min_amount: giftCard.is_gift_card ? giftCardMin : null,
          gift_card_max_amount: giftCard.is_gift_card ? giftCardMax : null,
          gift_card_default_validity_months: giftCard.is_gift_card ? giftCardValidity : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Redirect naar products overzicht
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Product Bewerken</h1>
            <p className="text-gray-600">Pas productinformatie aan</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/products/${id}/images`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Afbeeldingen
          </Link>
          <Link
            href={`/admin/products/${id}/variants`}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Varianten
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 p-8">
        {/* Language Tabs */}
        <LanguageTabs 
          activeLanguage={activeLanguage}
          onLanguageChange={setActiveLanguage}
        />
        
        <div className="space-y-6">
          {/* Product Name */}
          <div>
            <label htmlFor={`name_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Productnaam ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels'}) {activeLanguage === 'nl' && '*'}
            </label>
            <input
              type="text"
              id={`name_${activeLanguage}`}
              required={activeLanguage === 'nl'}
              value={activeLanguage === 'nl' ? formData.name : formData.name_en}
              onChange={(e) => setFormData({ 
                ...formData, 
                [activeLanguage === 'nl' ? 'name' : 'name_en']: e.target.value 
              })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder={activeLanguage === 'nl' ? 'Bijv. MOSE Classic Hoodie' : 'E.g. MOSE Classic Hoodie - Black'}
            />
          </div>

          {/* Slug - Only shown in NL mode */}
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
                placeholder="mose-classic-hoodie"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor={`description_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Beschrijving ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels'})
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
              placeholder={activeLanguage === 'nl' ? 'Uitgebreide productbeschrijving...' : 'Detailed product description...'}
            />
            <p className="text-sm text-gray-500 mt-1">
              💡 Tip: Gebruik ** om tekst <strong>bold</strong> te maken (bijvoorbeeld: **premium materials**)
            </p>
          </div>

          {/* Price & Category - Only shown in NL mode */}
          {activeLanguage === 'nl' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Price */}
            <div>
              <label htmlFor="base_price" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Normale Prijs (€) *
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
                placeholder="79.99"
              />
            </div>

            {/* Sale Price */}
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
          </div>

          {/* Sale Preview */}
          {formData.sale_price && formData.base_price && parseFloat(formData.sale_price) < parseFloat(formData.base_price) && parseFloat(formData.sale_price) > 0 && (
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

          {/* Staffelkorting */}
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide mb-1">Staffelkorting</h3>
            <p className="text-sm text-gray-500 mb-4">
              Stel kwantumkorting in (bijv. koop 2 = 10% korting). Geldt niet als er een sale prijs actief is.
            </p>

            {formData.sale_price && parseFloat(formData.sale_price) > 0 && parseFloat(formData.sale_price) < parseFloat(formData.base_price) && (
              <div className="bg-amber-50 border-2 border-amber-200 p-3 mb-4 text-sm text-amber-800">
                Let op: staffelkorting is uitgeschakeld zolang er een sale prijs actief is.
              </div>
            )}

            {discountTiers.length > 0 && (
              <div className="space-y-2 mb-4">
                {discountTiers.map(tier => (
                  <div key={tier.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border-2 ${tier.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm">
                        Koop {tier.min_quantity}+ stuks
                      </span>
                      <span className="mx-1.5 text-gray-300">→</span>
                      <span className="text-sm font-bold text-black">
                        {tier.discount_type === 'percentage'
                          ? `${tier.discount_value}% korting`
                          : `€${Number(tier.discount_value).toFixed(2)} korting per stuk`}
                      </span>
                      {formData.base_price && (
                        <span className="text-xs text-gray-400 ml-1.5">
                          (€{(
                            tier.discount_type === 'percentage'
                              ? parseFloat(formData.base_price) * (1 - tier.discount_value / 100)
                              : parseFloat(formData.base_price) - tier.discount_value
                          ).toFixed(2)} p/s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button" onClick={() => handleToggleTier(tier.id!, tier.is_active)}
                        className={`px-3 py-1 text-xs font-semibold border transition-colors ${tier.is_active ? 'border-black text-black hover:bg-gray-100' : 'border-gray-300 text-gray-400 hover:bg-gray-100'}`}>
                        {tier.is_active ? 'Actief' : 'Inactief'}
                      </button>
                      <button type="button" onClick={() => handleDeleteTier(tier.id!)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600 whitespace-nowrap">Koop</span>
                <input type="number" min={2} value={newTier.min_quantity}
                  onChange={e => setNewTier({ ...newTier, min_quantity: e.target.value })}
                  className="w-16 px-2 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm text-center" />
                <span className="text-sm text-gray-600 whitespace-nowrap">+ stuks =</span>
              </div>
              <div className="flex items-center gap-1">
                <input type="number" min={0} step={0.01} placeholder="10"
                  value={newTier.discount_value}
                  onChange={e => setNewTier({ ...newTier, discount_value: e.target.value })}
                  className="w-20 px-2 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm" />
                <select value={newTier.discount_type}
                  onChange={e => setNewTier({ ...newTier, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="px-2 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm bg-white">
                  <option value="percentage">% korting</option>
                  <option value="fixed">€ per stuk</option>
                </select>
              </div>
              <button type="button" onClick={handleAddTier} disabled={savingTiers}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
                <Plus className="w-4 h-4" />
                Toevoegen
              </button>
            </div>
          </div>

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

          {/* Gift Card Section */}
          <GiftCardFields
            value={giftCard}
            onChange={setGiftCard}
            variantsHref={`/admin/products/${id}/variants`}
          />

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
                placeholder="Bijv. MOSE Classic Hoodie - Lokaal Gemaakt"
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
        <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
          </button>
          <Link
            href="/admin/products"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 uppercase tracking-wider transition-colors"
          >
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  )
}

