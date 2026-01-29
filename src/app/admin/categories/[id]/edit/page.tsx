'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import MediaPicker from '@/components/admin/MediaPicker'
import SizeGuideEditor from '@/components/admin/SizeGuideEditor'
import LanguageTabs from '@/components/admin/LanguageTabs'

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    image_url: '',
    size_guide_type: 'clothing' as 'clothing' | 'watch' | 'accessory' | 'shoes' | 'jewelry' | 'none',
    size_guide_content: null as any,
    default_product_details: '',
    default_materials_care: '',
  })

  useEffect(() => {
    fetchCategory()
  }, [id])

  const fetchCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          name: data.name,
          name_en: data.name_en || '',
          slug: data.slug,
          description: data.description || '',
          description_en: data.description_en || '',
          image_url: data.image_url || '',
          size_guide_type: data.size_guide_type || 'clothing',
          size_guide_content: data.size_guide_content || null,
          default_product_details: data.default_product_details || '',
          default_materials_care: data.default_materials_care || '',
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!formData.name || !formData.slug) {
        throw new Error('Naam en slug zijn verplicht')
      }

      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          name_en: formData.name_en || null,
          slug: formData.slug,
          description: formData.description || null,
          description_en: formData.description_en || null,
          image_url: formData.image_url || null,
          size_guide_type: formData.size_guide_type,
          size_guide_content: formData.size_guide_content || null,
          default_product_details: formData.default_product_details || null,
          default_materials_care: formData.default_materials_care || null,
        })
        .eq('id', id)

      if (updateError) throw updateError

      router.push('/admin/categories')
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
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/categories"
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Categorie Bewerken</h1>
          <p className="text-gray-600">Pas categorie informatie aan</p>
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
          {/* Category Name */}
          <div>
            <label htmlFor={`name_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorienaam ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels'}) {activeLanguage === 'nl' && '*'}
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
              placeholder={activeLanguage === 'nl' ? 'Bijv. Hoodies' : 'E.g. Hoodies'}
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
                placeholder="hoodies"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor={`description_${activeLanguage}`} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Beschrijving ({activeLanguage === 'nl' ? 'Nederlands' : 'Engels - optioneel'})
            </label>
            <textarea
              id={`description_${activeLanguage}`}
              rows={4}
              value={activeLanguage === 'nl' ? formData.description : formData.description_en}
              onChange={(e) => setFormData({ 
                ...formData, 
                [activeLanguage === 'nl' ? 'description' : 'description_en']: e.target.value 
              })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
              placeholder={activeLanguage === 'nl' ? 'Korte beschrijving van de categorie...' : 'Short category description...'}
            />
          </div>

          {/* Image Upload - Only in NL mode */}
          {activeLanguage === 'nl' && (
            <div>
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorie Afbeelding
            </label>
            <MediaPicker
              mode="single"
              currentImageUrl={formData.image_url}
              onImageSelected={(url) => setFormData({ ...formData, image_url: url })}
              accept="images"
              folder="categories"
              bucket="images"
              buttonText={formData.image_url ? 'Wijzig afbeelding' : 'Selecteer afbeelding'}
            />
          </div>
          )}

          {/* Size Guide Type */}
          {activeLanguage === 'nl' && (
          <div className="bg-blue-50 border-2 border-blue-200 p-4">
            <label htmlFor="size_guide_type" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              📏 Maattabel / Specificaties Type
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Bepaal welk type maattabel getoond wordt op de productpagina.
            </p>
            <select
              id="size_guide_type"
              value={formData.size_guide_type}
              onChange={(e) => setFormData({ ...formData, size_guide_type: e.target.value as typeof formData.size_guide_type })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors bg-white"
            >
              <option value="clothing">👕 Kleding (Maattabel S/M/L/XL)</option>
              <option value="watch">⌚ Horloge (Specificaties)</option>
              <option value="accessory">🎒 Accessoire (Info)</option>
              <option value="shoes">👟 Schoenen (Maten)</option>
              <option value="jewelry">💍 Sieraden (Ring/Armband maten)</option>
              <option value="none">🚫 Geen maattabel (verberg knop)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              💡 <strong>Tip:</strong> Kies "Horloge" voor horloges, "Kleding" voor shirts/hoodies/sweaters
            </p>
          </div>
          )}

          {/* Size Guide Content Editor */}
          {activeLanguage === 'nl' && (
          <div className="bg-purple-50 border-2 border-purple-200 p-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              📝 Maattabel / Specificaties Content (Template)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Dit is de <strong>standaard template</strong> voor alle producten in deze categorie. 
              Producten kunnen dit later individueel overriden.
            </p>
            <SizeGuideEditor
              initialContent={formData.size_guide_content}
              sizeGuideType={formData.size_guide_type}
              onChange={(content) => setFormData({ ...formData, size_guide_content: content })}
            />
          </div>
          )}

          {/* Product Details Template */}
          {activeLanguage === 'nl' && (
          <div className="pt-6 border-t-2 border-gray-200">
            <label htmlFor="default_product_details" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Product Details Template
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Deze tekst wordt gebruikt voor alle producten in deze categorie. 
              <br />Gebruik ** voor <strong>vetgedrukte labels</strong>, bijv: <code className="bg-gray-100 px-1">**Premium kwaliteit:** Hoogwaardige materialen</code>
            </p>
            <textarea
              id="default_product_details"
              rows={6}
              value={formData.default_product_details}
              onChange={(e) => setFormData({ ...formData, default_product_details: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none font-mono text-sm"
              placeholder="**Premium kwaliteit:** Hoogwaardige materialen die lang meegaan&#10;**Perfect fit:** Ontworpen voor comfort en stijl&#10;**Lokaal gemaakt:** Met liefde geproduceerd in Groningen"
            />
          </div>
          )}

          {/* Materials & Care Template */}
          {activeLanguage === 'nl' && (
          <div>
            <label htmlFor="default_materials_care" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Materiaal & Verzorging Template
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Was- en verzorgingsinstructies voor producten in deze categorie.
              <br />Gebruik ** voor <strong>vetgedrukte labels</strong>, bijv: <code className="bg-gray-100 px-1">**Materiaal:** 100% biologisch katoen</code>
            </p>
            <textarea
              id="default_materials_care"
              rows={6}
              value={formData.default_materials_care}
              onChange={(e) => setFormData({ ...formData, default_materials_care: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none font-mono text-sm"
              placeholder="**Materiaal:** 100% biologisch katoen, 300gsm&#10;**Was instructies:** Machinewasbaar op 30°C&#10;**Strijken:** Op lage temperatuur, binnenstebuiten&#10;**Drogen:** Niet in de droger, ophangen"
            />
          </div>
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
            href="/admin/categories"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 uppercase tracking-wider transition-colors"
          >
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  )
}

