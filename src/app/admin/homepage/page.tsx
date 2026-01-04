'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Home, Package, FileText, Settings } from 'lucide-react'
import IconSelector from '@/components/admin/IconSelector'

interface HomepageSettings {
  id: string
  // Hero
  hero_badge_text: string
  hero_title_line1: string
  hero_title_line2: string
  hero_subtitle: string
  hero_cta1_text: string
  hero_cta1_link: string
  hero_cta2_text: string
  hero_cta2_link: string
  hero_image_url: string
  // Stats
  stats_1_number: string
  stats_1_text: string
  stats_2_text: string
  stats_3_number: string
  stats_3_text: string
  stats_3_icon: string
  // Trust Badges
  trust_badge_1: string
  trust_badge_2_prefix: string
  trust_badge_3_suffix: string
  trust_badge_4: string
  // Featured Products
  featured_label: string
  featured_title: string
  featured_description: string
  featured_product_1_id: string | null
  featured_product_2_id: string | null
  featured_product_3_id: string | null
  // Categories
  categories_title: string
  categories_description: string
  category_1_id: string | null
  category_2_id: string | null
  category_3_id: string | null
  category_4_id: string | null
  // Story
  story_badge: string
  story_title_line1: string
  story_title_line2: string
  story_paragraph1: string
  story_paragraph2: string
  story_stat1_label: string
  story_stat1_sublabel: string
  story_stat2_label: string
  story_stat2_sublabel: string
  story_stat3_label: string
  story_stat3_sublabel: string
  story_cta_text: string
  story_cta_link: string
  story_image_url: string
  story_founded_year: string
  // Newsletter
  newsletter_title: string
  newsletter_description1: string
  newsletter_description2: string
  newsletter_input_placeholder: string
  newsletter_button_text: string
  newsletter_trust_text: string
}

interface Product {
  id: string
  name: string
  base_price: number
  product_images: { url: string }[]
}

interface Category {
  id: string
  name: string
}

export default function HomepageSettingsPage() {
  const [activeTab, setActiveTab] = useState<'hero' | 'products' | 'content' | 'advanced'>('hero')
  const [settings, setSettings] = useState<HomepageSettings | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    
    try {
      // Fetch homepage settings
      const { data: homepageData, error: homepageError } = await supabase
        .from('homepage_settings')
        .select('*')
        .single()

      if (homepageError) throw homepageError
      setSettings(homepageData)

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, base_price, product_images(url)')
        .eq('product_images.is_primary', true)
        .order('name')

      if (!productsError) setProducts(productsData as Product[])

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (!categoriesError) setCategories(categoriesData)

    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage('Error loading settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage('')

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('homepage_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      // ✅ Revalidate homepage cache after save
      try {
        await fetch('/api/revalidate-homepage', { method: 'POST' })
        console.log('Homepage cache revalidated')
      } catch (revalidateError) {
        console.warn('Failed to revalidate homepage:', revalidateError)
        // Don't fail the save if revalidation fails
      }

      setMessage('✅ Homepage instellingen opgeslagen!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving:', error)
      setMessage('❌ Error bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p>Laden...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: Kon homepage settings niet laden</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'hero' as const, name: 'Hero & Stats', icon: Home },
    { id: 'products' as const, name: 'Producten', icon: Package },
    { id: 'content' as const, name: 'Content', icon: FileText },
    { id: 'advanced' as const, name: 'Geavanceerd', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Homepage Instellingen</h1>
          <p className="text-sm md:text-base text-gray-600">Pas alle content van de homepage aan</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-2 border-black mb-4 md:mb-6">
          <div className="flex border-b-2 border-black overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider text-xs md:text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <Icon size={16} className="md:w-[18px] md:h-[18px]" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6 max-h-[calc(100vh-350px)] md:max-h-[calc(100vh-300px)] overflow-y-auto">
            {/* TAB 1: HERO & STATS */}
            {activeTab === 'hero' && (
              <div className="space-y-8">
                {/* Hero Section */}
                <div>
                  <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 pb-2 border-b-2 border-black">🦁 Hero Sectie</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Locatie Badge</label>
                      <input
                        type="text"
                        value={settings.hero_badge_text}
                        onChange={(e) => setSettings({ ...settings, hero_badge_text: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Hero Afbeelding URL</label>
                      <input
                        type="text"
                        value={settings.hero_image_url}
                        onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Hoofdtitel Regel 1</label>
                      <input
                        type="text"
                        value={settings.hero_title_line1}
                        onChange={(e) => setSettings({ ...settings, hero_title_line1: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-base md:text-2xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Hoofdtitel Regel 2 (groen)</label>
                      <input
                        type="text"
                        value={settings.hero_title_line2}
                        onChange={(e) => setSettings({ ...settings, hero_title_line2: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-base md:text-2xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold text-brand-primary transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Subtitel</label>
                      <input
                        type="text"
                        value={settings.hero_subtitle}
                        onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 1 Tekst</label>
                      <input
                        type="text"
                        value={settings.hero_cta1_text}
                        onChange={(e) => setSettings({ ...settings, hero_cta1_text: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 1 Link</label>
                      <input
                        type="text"
                        value={settings.hero_cta1_link}
                        onChange={(e) => setSettings({ ...settings, hero_cta1_link: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 2 Tekst</label>
                      <input
                        type="text"
                        value={settings.hero_cta2_text}
                        onChange={(e) => setSettings({ ...settings, hero_cta2_text: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 2 Link</label>
                      <input
                        type="text"
                        value={settings.hero_cta2_link}
                        onChange={(e) => setSettings({ ...settings, hero_cta2_link: e.target.value })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Bar */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📊 Stats Bar</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Stat 1 Cijfer</label>
                      <input
                        type="text"
                        value={settings.stats_1_number}
                        onChange={(e) => setSettings({ ...settings, stats_1_number: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Stat 1 Tekst</label>
                      <input
                        type="text"
                        value={settings.stats_1_text}
                        onChange={(e) => setSettings({ ...settings, stats_1_text: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Stat 2 Tekst (cijfer = retour dagen)</label>
                      <input
                        type="text"
                        value={settings.stats_2_text}
                        onChange={(e) => setSettings({ ...settings, stats_2_text: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                      💡 <strong>Tip:</strong> Stat 2 cijfer wordt automatisch gehaald uit de retour dagen setting
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Stat 3 Tekst</label>
                      <input
                        type="text"
                        value={settings.stats_3_text}
                        onChange={(e) => setSettings({ ...settings, stats_3_text: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Stat 3 Icon</label>
                      <IconSelector
                        value={settings.stats_3_icon || 'Star'}
                        onChange={(iconName) => setSettings({ ...settings, stats_3_icon: iconName })}
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">🏷️ Trust Badges</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Badge 1</label>
                      <input
                        type="text"
                        value={settings.trust_badge_1}
                        onChange={(e) => setSettings({ ...settings, trust_badge_1: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Badge 2 Prefix (bijv. "Gratis verzending vanaf")</label>
                      <input
                        type="text"
                        value={settings.trust_badge_2_prefix}
                        onChange={(e) => setSettings({ ...settings, trust_badge_2_prefix: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                      💡 <strong>Tip:</strong> Badge 2 toont automatisch: "{settings.trust_badge_2_prefix} €[gratis verzending drempel]"
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Badge 3 Suffix (bijv. "dagen retour")</label>
                      <input
                        type="text"
                        value={settings.trust_badge_3_suffix}
                        onChange={(e) => setSettings({ ...settings, trust_badge_3_suffix: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                      💡 <strong>Tip:</strong> Badge 3 toont automatisch: "[retour dagen] {settings.trust_badge_3_suffix}"
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Badge 4</label>
                      <input
                        type="text"
                        value={settings.trust_badge_4}
                        onChange={(e) => setSettings({ ...settings, trust_badge_4: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRODUCTEN & CATEGORIEËN */}
            {activeTab === 'products' && (
              <div className="space-y-8">
                {/* Featured Products */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">⭐ Featured Products</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Label Tekst</label>
                      <input
                        type="text"
                        value={settings.featured_label}
                        onChange={(e) => setSettings({ ...settings, featured_label: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Sectie Titel</label>
                      <input
                        type="text"
                        value={settings.featured_title}
                        onChange={(e) => setSettings({ ...settings, featured_title: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Sectie Beschrijving</label>
                      <input
                        type="text"
                        value={settings.featured_description}
                        onChange={(e) => setSettings({ ...settings, featured_description: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">Featured Product 1</label>
                        <select
                          value={settings.featured_product_1_id || ''}
                          onChange={(e) => setSettings({ ...settings, featured_product_1_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - €{product.base_price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Featured Product 2</label>
                        <select
                          value={settings.featured_product_2_id || ''}
                          onChange={(e) => setSettings({ ...settings, featured_product_2_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - €{product.base_price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Featured Product 3</label>
                        <select
                          value={settings.featured_product_3_id || ''}
                          onChange={(e) => setSettings({ ...settings, featured_product_3_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - €{product.base_price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📂 Categorieën Sectie</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Sectie Titel</label>
                      <input
                        type="text"
                        value={settings.categories_title}
                        onChange={(e) => setSettings({ ...settings, categories_title: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Sectie Beschrijving</label>
                      <input
                        type="text"
                        value={settings.categories_description}
                        onChange={(e) => setSettings({ ...settings, categories_description: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">Categorie 1</label>
                        <select
                          value={settings.category_1_id || ''}
                          onChange={(e) => setSettings({ ...settings, category_1_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen categorie</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Categorie 2</label>
                        <select
                          value={settings.category_2_id || ''}
                          onChange={(e) => setSettings({ ...settings, category_2_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen categorie</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Categorie 3</label>
                        <select
                          value={settings.category_3_id || ''}
                          onChange={(e) => setSettings({ ...settings, category_3_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen categorie</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Categorie 4</label>
                        <select
                          value={settings.category_4_id || ''}
                          onChange={(e) => setSettings({ ...settings, category_4_id: e.target.value || null })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">Geen categorie</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONTENT */}
            {activeTab === 'content' && (
              <div className="space-y-8">
                {/* Story Section */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📖 Story Sectie (Ons Verhaal)</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">Badge Tekst</label>
                        <input
                          type="text"
                          value={settings.story_badge}
                          onChange={(e) => setSettings({ ...settings, story_badge: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Oprichtingsjaar</label>
                        <input
                          type="text"
                          value={settings.story_founded_year}
                          onChange={(e) => setSettings({ ...settings, story_founded_year: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Titel Regel 1</label>
                      <input
                        type="text"
                        value={settings.story_title_line1}
                        onChange={(e) => setSettings({ ...settings, story_title_line1: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Titel Regel 2 (groen)</label>
                      <input
                        type="text"
                        value={settings.story_title_line2}
                        onChange={(e) => setSettings({ ...settings, story_title_line2: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold text-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Paragraaf 1</label>
                      <textarea
                        value={settings.story_paragraph1}
                        onChange={(e) => setSettings({ ...settings, story_paragraph1: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Paragraaf 2</label>
                      <textarea
                        value={settings.story_paragraph2}
                        onChange={(e) => setSettings({ ...settings, story_paragraph2: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">Stat 1 Label</label>
                        <input
                          type="text"
                          value={settings.story_stat1_label}
                          onChange={(e) => setSettings({ ...settings, story_stat1_label: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">Stat 1 Sublabel</label>
                        <input
                          type="text"
                          value={settings.story_stat1_sublabel}
                          onChange={(e) => setSettings({ ...settings, story_stat1_sublabel: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Stat 2 Label</label>
                        <input
                          type="text"
                          value={settings.story_stat2_label}
                          onChange={(e) => setSettings({ ...settings, story_stat2_label: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">Stat 2 Sublabel</label>
                        <input
                          type="text"
                          value={settings.story_stat2_sublabel}
                          onChange={(e) => setSettings({ ...settings, story_stat2_sublabel: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Stat 3 Label</label>
                        <input
                          type="text"
                          value={settings.story_stat3_label}
                          onChange={(e) => setSettings({ ...settings, story_stat3_label: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">Stat 3 Sublabel</label>
                        <input
                          type="text"
                          value={settings.story_stat3_sublabel}
                          onChange={(e) => setSettings({ ...settings, story_stat3_sublabel: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">CTA Button Tekst</label>
                        <input
                          type="text"
                          value={settings.story_cta_text}
                          onChange={(e) => setSettings({ ...settings, story_cta_text: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">CTA Button Link</label>
                        <input
                          type="text"
                          value={settings.story_cta_link}
                          onChange={(e) => setSettings({ ...settings, story_cta_link: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Story Afbeelding URL</label>
                        <input
                          type="text"
                          value={settings.story_image_url}
                          onChange={(e) => setSettings({ ...settings, story_image_url: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Newsletter */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📧 Newsletter Sectie</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Titel</label>
                      <input
                        type="text"
                        value={settings.newsletter_title}
                        onChange={(e) => setSettings({ ...settings, newsletter_title: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Beschrijving Regel 1</label>
                      <input
                        type="text"
                        value={settings.newsletter_description1}
                        onChange={(e) => setSettings({ ...settings, newsletter_description1: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Beschrijving Regel 2</label>
                      <input
                        type="text"
                        value={settings.newsletter_description2}
                        onChange={(e) => setSettings({ ...settings, newsletter_description2: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">Input Placeholder</label>
                        <input
                          type="text"
                          value={settings.newsletter_input_placeholder}
                          onChange={(e) => setSettings({ ...settings, newsletter_input_placeholder: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Button Tekst</label>
                        <input
                          type="text"
                          value={settings.newsletter_button_text}
                          onChange={(e) => setSettings({ ...settings, newsletter_button_text: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Trust Tekst</label>
                      <input
                        type="text"
                        value={settings.newsletter_trust_text}
                        onChange={(e) => setSettings({ ...settings, newsletter_trust_text: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ADVANCED */}
            {activeTab === 'advanced' && (
              <div className="space-y-8">
                <div className="text-center py-12">
                  <Settings size={48} className="mx-auto mb-4 text-gray-400" />
                  <h2 className="text-2xl font-bold mb-2">Geavanceerde Instellingen</h2>
                  <p className="text-gray-600 mb-4">Deze sectie komt binnenkort beschikbaar</p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-left max-w-2xl mx-auto">
                    <p className="font-bold mb-2">Binnenkort:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>SEO metadata per sectie</li>
                      <li>Custom CSS</li>
                      <li>Analytics tracking codes</li>
                      <li>A/B testing instellingen</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button - Sticky */}
        <div className="sticky bottom-0 bg-white border-t-2 border-black p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            {message && (
              <p className={`font-bold text-sm md:text-base ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-black text-white font-bold text-sm md:text-base uppercase tracking-wider hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed border-2 border-black"
          >
            {saving ? 'Opslaan...' : '💾 Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

