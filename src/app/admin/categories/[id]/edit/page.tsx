'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ImageUpload from '@/components/admin/ImageUpload'

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
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
          slug: data.slug,
          description: data.description || '',
          image_url: data.image_url || '',
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
          slug: formData.slug,
          description: formData.description || null,
          image_url: formData.image_url || null,
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
        <div className="space-y-6">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorienaam *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Bijv. Hoodies"
            />
          </div>

          {/* Slug */}
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

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Beschrijving
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-none"
              placeholder="Korte beschrijving van de categorie..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorie Afbeelding
            </label>
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              onImageRemoved={() => setFormData({ ...formData, image_url: '' })}
              folder="categories"
            />
          </div>

          {/* Product Details Template */}
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

          {/* Materials & Care Template */}
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

