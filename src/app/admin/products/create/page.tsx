'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Category {
  id: string
  name: string
}

export default function CreateProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    base_price: '',
    category_id: '',
    meta_title: '',
    meta_description: '',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validatie
      if (!formData.name || !formData.slug || !formData.base_price) {
        throw new Error('Vul alle verplichte velden in')
      }

      // Insert product
      const { data, error: insertError } = await supabase
        .from('products')
        .insert([
          {
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            base_price: parseFloat(formData.base_price),
            category_id: formData.category_id || null,
            meta_title: formData.meta_title || null,
            meta_description: formData.meta_description || null,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Redirect naar products overzicht
      router.push('/admin/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/products"
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Nieuw Product</h1>
          <p className="text-gray-600">Voeg een nieuw product toe aan je webshop</p>
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
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Productnaam *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Bijv. MOSE Classic Hoodie"
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
              placeholder="mose-classic-hoodie"
            />
            <p className="mt-2 text-sm text-gray-500">
              Automatisch gegenereerd, maar je kunt het aanpassen
            </p>
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
              placeholder="Uitgebreide productbeschrijving..."
            />
          </div>

          {/* Price & Category - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Price */}
            <div>
              <label htmlFor="base_price" className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Basisprijs (€) *
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
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Product Aanmaken...' : 'Product Aanmaken'}
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

