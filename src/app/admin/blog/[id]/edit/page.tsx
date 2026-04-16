'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const wordCount = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

const CATEGORIES = [
  { value: 'style', label: 'Style' },
  { value: 'drops', label: 'Drops' },
  { value: 'behind-the-scenes', label: 'Behind the Scenes' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'groningen', label: 'Groningen' },
]

export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [titleNl, setTitleNl] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [slug, setSlug] = useState('')
  const [contentNl, setContentNl] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [excerptNl, setExcerptNl] = useState('')
  const [excerptEn, setExcerptEn] = useState('')
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null)
  const [author, setAuthor] = useState('MOSE')
  const [seoTitleNl, setSeoTitleNl] = useState('')
  const [seoTitleEn, setSeoTitleEn] = useState('')
  const [seoDescNl, setSeoDescNl] = useState('')
  const [seoDescEn, setSeoDescEn] = useState('')

  useEffect(() => {
    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Artikel niet gevonden')

      setTitleNl(data.title_nl || '')
      setTitleEn(data.title_en || '')
      setSlug(data.slug || '')
      setContentNl(data.content_nl || '')
      setContentEn(data.content_en || '')
      setExcerptNl(data.excerpt_nl || '')
      setExcerptEn(data.excerpt_en || '')
      setFeaturedImageUrl(data.featured_image_url || '')
      setCategory(data.category || '')
      setTags(data.tags ? data.tags.join(', ') : '')
      setStatus(data.status || 'draft')
      setAuthor(data.author || 'MOSE')
      setOriginalPublishedAt(data.published_at || null)
      setSeoTitleNl(data.seo_title_nl || '')
      setSeoTitleEn(data.seo_title_en || '')
      setSeoDescNl(data.seo_description_nl || '')
      setSeoDescEn(data.seo_description_en || '')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Fout bij laden: ${message}`)
      router.push('/admin/blog')
    } finally {
      setLoading(false)
    }
  }

  const readingTime = calculateReadingTime(contentNl || contentEn)

  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (!titleNl.trim()) {
      toast.error('Titel (NL) is verplicht')
      return
    }
    if (!slug.trim()) {
      toast.error('Slug is verplicht')
      return
    }
    if (!contentNl.trim()) {
      toast.error('Content (NL) is verplicht')
      return
    }

    setSaving(true)
    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('blog_posts')
        .update({
          title_nl: titleNl.trim(),
          title_en: titleEn.trim(),
          slug: slug.trim(),
          content_nl: contentNl.trim(),
          content_en: contentEn.trim(),
          excerpt_nl: excerptNl.trim() || null,
          excerpt_en: excerptEn.trim() || null,
          featured_image_url: featuredImageUrl.trim() || null,
          category: category || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          status: publishStatus,
          author: author.trim() || 'MOSE',
          reading_time: readingTime,
          seo_title_nl: seoTitleNl.trim() || null,
          seo_title_en: seoTitleEn.trim() || null,
          seo_description_nl: seoDescNl.trim() || null,
          seo_description_en: seoDescEn.trim() || null,
          published_at: publishStatus === 'published' ? (originalPublishedAt || new Date().toISOString()) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      if (error) throw error
      toast.success(publishStatus === 'published' ? 'Artikel gepubliceerd!' : 'Concept opgeslagen!')
      router.push('/admin/blog')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Fout bij opslaan: ${message}`)
    } finally {
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
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/blog" className="hover:text-brand-primary transition-colors">Blog</Link>
            <span>/</span>
            <span>Bewerken</span>
          </div>
          <h1 className="text-3xl font-display font-bold">Artikel Bewerken</h1>
        </div>
        <div className="grid grid-cols-2 md:flex md:w-auto gap-2 w-full">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="w-full md:w-auto text-center bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Opslaan als Concept'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="w-full md:w-auto text-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? 'Publiceren...' : 'Publiceren'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title NL */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Titel (NL) *
            </label>
            <input
              type="text"
              value={titleNl}
              onChange={(e) => setTitleNl(e.target.value)}
              placeholder="Artikeltitel in het Nederlands"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-lg font-bold"
            />
          </div>

          {/* Title EN */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Titel (EN)
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Article title in English"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-lg font-bold"
            />
          </div>

          {/* Slug */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="artikel-slug"
                className="flex-1 px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Content NL */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Content (NL) *
            </label>
            <p className="text-xs text-gray-500 mb-2">Ondersteunt Markdown: **vet**, *cursief*, ## kopjes, - lijsten</p>
            <textarea
              value={contentNl}
              onChange={(e) => setContentNl(e.target.value)}
              placeholder="Schrijf je artikel in het Nederlands..."
              rows={16}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-y font-mono text-sm leading-relaxed"
            />
          </div>

          {/* Content EN */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Content (EN)
            </label>
            <textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder="Write your article in English..."
              rows={16}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-y font-mono text-sm leading-relaxed"
            />
          </div>

          {/* Excerpt NL */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Excerpt (NL)
            </label>
            <textarea
              value={excerptNl}
              onChange={(e) => setExcerptNl(e.target.value)}
              placeholder="Korte samenvatting voor de blogpagina..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-y"
            />
          </div>

          {/* Excerpt EN */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Excerpt (EN)
            </label>
            <textarea
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              placeholder="Short summary for the blog page..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors resize-y"
            />
          </div>

          {/* SEO */}
          <div className="bg-white border-2 border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">SEO Instellingen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Titel (NL)</label>
                <input
                  type="text"
                  value={seoTitleNl}
                  onChange={(e) => setSeoTitleNl(e.target.value)}
                  placeholder="SEO titel Nederlands"
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Titel (EN)</label>
                <input
                  type="text"
                  value={seoTitleEn}
                  onChange={(e) => setSeoTitleEn(e.target.value)}
                  placeholder="SEO title English"
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Beschrijving (NL)</label>
                <textarea
                  value={seoDescNl}
                  onChange={(e) => setSeoDescNl(e.target.value)}
                  placeholder="Meta beschrijving Nederlands"
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Description (EN)</label>
                <textarea
                  value={seoDescEn}
                  onChange={(e) => setSeoDescEn(e.target.value)}
                  placeholder="Meta description English"
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Featured Image */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Uitgelichte afbeelding
            </label>
            <input
              type="text"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm mb-3"
            />
            {featuredImageUrl && (
              <div className="relative aspect-video border-2 border-gray-200 overflow-hidden bg-gray-100">
                <Image
                  src={featuredImageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Category */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Categorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
            >
              <option value="">Selecteer categorie...</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Gescheiden door komma&apos;s</p>
          </div>

          {/* Author */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Auteur
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Auteur naam"
              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
            />
          </div>

          {/* Reading Time */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Leestijd
            </label>
            <div className="text-2xl font-bold text-brand-primary">{readingTime} min</div>
            <p className="text-xs text-gray-500 mt-1">Automatisch berekend op basis van content</p>
          </div>

        </div>
      </div>
    </div>
  )
}
