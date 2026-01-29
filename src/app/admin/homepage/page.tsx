'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Home, Package, FileText, Settings } from 'lucide-react'
import IconSelector from '@/components/admin/IconSelector'
import RevalidateButton from '@/components/admin/RevalidateButton'
import LanguageTabs from '@/components/admin/LanguageTabs'
import MediaPicker from '@/components/admin/MediaPicker'

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
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')
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

      // ✅ Revalidate static homepage after save
      try {
        const revalidateResponse = await fetch('/api/revalidate-homepage', { method: 'POST' })
        if (revalidateResponse.ok) {
          console.log('Homepage revalidated successfully')
        }
      } catch (revalidateError) {
        console.warn('Failed to revalidate homepage:', revalidateError)
        // Don't fail the save if revalidation fails
      }

      setMessage('✅ Homepage opgeslagen! De wijzigingen zijn binnen ~10 seconden live.')
      setTimeout(() => setMessage(''), 5000)
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
          <div className="p-4 md:p-6">
            {/* Language Tabs */}
            <div className="mb-6">
              <LanguageTabs 
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
              <p className="text-sm text-gray-600 mt-2">
                💡 Switch tussen Nederlands en Engels om de content voor beide talen in te stellen.
                {activeLanguage === 'en' && ' (Engelse velden zijn optioneel - indien leeg wordt de Nederlandse tekst gebruikt)'}
              </p>
            </div>

            {/* TAB 1: HERO & STATS */}
            {activeTab === 'hero' && (
              <div className="space-y-8">
                {/* Hero Section */}
                <div>
                  <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 pb-2 border-b-2 border-black">🦁 Hero Sectie</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        Locatie Badge {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_badge_text : (settings as any).hero_badge_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_badge_text' : 'hero_badge_text_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'Gemaakt in Groningen' : 'Made in Groningen'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div>
                        <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">Hero Afbeelding</label>
                        <MediaPicker
                          mode="single"
                          currentImageUrl={settings.hero_image_url}
                          onImageSelected={(url) => setSettings({ ...settings, hero_image_url: url })}
                          accept="images"
                          folder="homepage/hero"
                          bucket="images"
                          buttonText="Selecteer hero afbeelding"
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        Hoofdtitel Regel 1 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_title_line1 : (settings as any).hero_title_line1_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_title_line1' : 'hero_title_line1_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-base md:text-2xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'GEEN POESPAS.' : 'NO NONSENSE.'}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        Hoofdtitel Regel 2 (groen) {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_title_line2 : (settings as any).hero_title_line2_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_title_line2' : 'hero_title_line2_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-base md:text-2xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold text-brand-primary transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'WEL KARAKTER.' : 'PURE CHARACTER.'}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        Subtitel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_subtitle : (settings as any).hero_subtitle_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_subtitle' : 'hero_subtitle_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'Lokaal gemaakt. Kwaliteit die blijft.' : 'Locally made. Quality that lasts.'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        CTA Button 1 Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_cta1_text : (settings as any).hero_cta1_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_cta1_text' : 'hero_cta1_text_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'Shop MOSE' : 'Shop MOSE'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div>
                        <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 1 Link</label>
                        <input
                          type="text"
                          value={settings.hero_cta1_link}
                          onChange={(e) => setSettings({ ...settings, hero_cta1_link: e.target.value })}
                          className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">
                        CTA Button 2 Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.hero_cta2_text : (settings as any).hero_cta2_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'hero_cta2_text' : 'hero_cta2_text_en']: e.target.value 
                        })}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder={activeLanguage === 'nl' ? 'Bekijk Lookbook' : 'View Lookbook'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div>
                        <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2">CTA Button 2 Link</label>
                        <input
                          type="text"
                          value={settings.hero_cta2_link}
                          onChange={(e) => setSettings({ ...settings, hero_cta2_link: e.target.value })}
                          className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Bar */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📊 Stats Bar</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeLanguage === 'nl' && (
                      <div>
                        <label className="block text-sm font-bold mb-2">Stat 1 Cijfer</label>
                        <input
                          type="text"
                          value={settings.stats_1_number}
                          onChange={(e) => setSettings({ ...settings, stats_1_number: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Stat 1 Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.stats_1_text : (settings as any).stats_1_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'stats_1_text' : 'stats_1_text_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Lokaal geproduceerd' : 'Locally produced'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Stat 2 Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'} (cijfer = retour dagen)
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.stats_2_text : (settings as any).stats_2_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'stats_2_text' : 'stats_2_text_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'dagen retour' : 'days return'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                        💡 <strong>Tip:</strong> Stat 2 cijfer wordt automatisch gehaald uit de retour dagen setting
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Stat 3 Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.stats_3_text : (settings as any).stats_3_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'stats_3_text' : 'stats_3_text_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Premium kwaliteit' : 'Premium quality'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div>
                        <label className="block text-sm font-bold mb-2">Stat 3 Icon</label>
                        <IconSelector
                          value={settings.stats_3_icon || 'Star'}
                          onChange={(iconName) => setSettings({ ...settings, stats_3_icon: iconName })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust Badges */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">🏷️ Trust Badges</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Badge 1 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.trust_badge_1 : (settings as any).trust_badge_1_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'trust_badge_1' : 'trust_badge_1_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Lokaal gemaakt' : 'Locally made'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Badge 2 Prefix {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'} (bijv. "Gratis verzending vanaf")
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.trust_badge_2_prefix : (settings as any).trust_badge_2_prefix_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'trust_badge_2_prefix' : 'trust_badge_2_prefix_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Gratis verzending vanaf' : 'Free shipping from'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                        💡 <strong>Tip:</strong> Badge 2 toont automatisch: "{settings.trust_badge_2_prefix} €[gratis verzending drempel]"
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Badge 3 Suffix {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'} (bijv. "dagen retour")
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.trust_badge_3_suffix : (settings as any).trust_badge_3_suffix_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'trust_badge_3_suffix' : 'trust_badge_3_suffix_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'dagen retour' : 'days return'}
                      />
                    </div>
                    {activeLanguage === 'nl' && (
                      <div className="md:col-span-2 text-sm text-gray-600 bg-blue-50 p-3 border-l-4 border-blue-500">
                        💡 <strong>Tip:</strong> Badge 3 toont automatisch: "[retour dagen] {settings.trust_badge_3_suffix}"
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Badge 4 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.trust_badge_4 : (settings as any).trust_badge_4_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'trust_badge_4' : 'trust_badge_4_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Veilig betalen' : 'Secure payment'}
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
                      <label className="block text-sm font-bold mb-2">
                        Label Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.featured_label : (settings as any).featured_label_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'featured_label' : 'featured_label_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Bestsellers' : 'Bestsellers'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Sectie Titel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.featured_title : (settings as any).featured_title_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'featured_title' : 'featured_title_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                        placeholder={activeLanguage === 'nl' ? 'ESSENTIALS DIE BLIJVEN' : 'ESSENTIALS THAT LAST'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Sectie Beschrijving {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.featured_description : (settings as any).featured_description_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'featured_description' : 'featured_description_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Basics zonder poespas die jarenlang meegaan' : 'No-nonsense basics that last for years'}
                      />
                    </div>
                    
                    {activeLanguage === 'nl' && (
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
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📂 Categorieën Sectie</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Sectie Titel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.categories_title : (settings as any).categories_title_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'categories_title' : 'categories_title_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                        placeholder={activeLanguage === 'nl' ? 'SHOP PER CATEGORIE' : 'SHOP BY CATEGORY'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Sectie Beschrijving {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.categories_description : (settings as any).categories_description_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'categories_description' : 'categories_description_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Ontdek onze collectie' : 'Discover our collection'}
                      />
                    </div>

                    {activeLanguage === 'nl' && (
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
                    )}
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
                        <label className="block text-sm font-bold mb-2">
                          Badge Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_badge : (settings as any).story_badge_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_badge' : 'story_badge_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Ons Verhaal' : 'Our Story'}
                        />
                      </div>
                      {activeLanguage === 'nl' && (
                        <div>
                          <label className="block text-sm font-bold mb-2">Oprichtingsjaar</label>
                          <input
                            type="text"
                            value={settings.story_founded_year}
                            onChange={(e) => setSettings({ ...settings, story_founded_year: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Titel Regel 1 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.story_title_line1 : (settings as any).story_title_line1_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'story_title_line1' : 'story_title_line1_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                        placeholder={activeLanguage === 'nl' ? 'GEMAAKT IN' : 'MADE IN'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Titel Regel 2 (groen) {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.story_title_line2 : (settings as any).story_title_line2_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'story_title_line2' : 'story_title_line2_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold text-brand-primary"
                        placeholder={activeLanguage === 'nl' ? 'GRONINGEN' : 'GRONINGEN'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Paragraaf 1 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <textarea
                        value={activeLanguage === 'nl' ? settings.story_paragraph1 : (settings as any).story_paragraph1_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'story_paragraph1' : 'story_paragraph1_en']: e.target.value 
                        })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Geen poespas. Gewoon karakter...' : 'No nonsense. Just character...'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Paragraaf 2 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <textarea
                        value={activeLanguage === 'nl' ? settings.story_paragraph2 : (settings as any).story_paragraph2_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'story_paragraph2' : 'story_paragraph2_en']: e.target.value 
                        })}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Premium basics met een ziel...' : 'Premium basics with a soul...'}
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Stat 1 Label {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat1_label : (settings as any).story_stat1_label_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat1_label' : 'story_stat1_label_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? '100% Lokaal' : '100% Local'}
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">
                          Stat 1 Sublabel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat1_sublabel : (settings as any).story_stat1_sublabel_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat1_sublabel' : 'story_stat1_sublabel_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Gemaakt in NL' : 'Made in NL'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Stat 2 Label {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat2_label : (settings as any).story_stat2_label_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat2_label' : 'story_stat2_label_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? '14 Dagen' : '14 Days'}
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">
                          Stat 2 Sublabel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat2_sublabel : (settings as any).story_stat2_sublabel_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat2_sublabel' : 'story_stat2_sublabel_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Retourbeleid' : 'Return policy'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Stat 3 Label {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat3_label : (settings as any).story_stat3_label_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat3_label' : 'story_stat3_label_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Premium' : 'Premium'}
                        />
                        <label className="block text-sm font-bold mb-2 mt-2">
                          Stat 3 Sublabel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_stat3_sublabel : (settings as any).story_stat3_sublabel_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_stat3_sublabel' : 'story_stat3_sublabel_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Materialen' : 'Materials'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          CTA Button Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.story_cta_text : (settings as any).story_cta_text_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'story_cta_text' : 'story_cta_text_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Lees ons verhaal' : 'Read our story'}
                        />
                      </div>
                      {activeLanguage === 'nl' && (
                        <>
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
                            <label className="block text-sm font-bold mb-2">Story Afbeelding</label>
                            <MediaPicker
                              mode="single"
                              currentImageUrl={settings.story_image_url}
                              onImageSelected={(url) => setSettings({ ...settings, story_image_url: url })}
                              accept="images"
                              folder="homepage/story"
                              bucket="images"
                              buttonText="Selecteer story afbeelding"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Newsletter */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">📧 Newsletter Sectie</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Titel {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.newsletter_title : (settings as any).newsletter_title_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'newsletter_title' : 'newsletter_title_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-2xl font-bold"
                        placeholder={activeLanguage === 'nl' ? 'BLIJF OP DE HOOGTE' : 'STAY UPDATED'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Beschrijving Regel 1 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.newsletter_description1 : (settings as any).newsletter_description1_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'newsletter_description1' : 'newsletter_description1_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Nieuws over drops, restocks en het atelier.' : 'News about drops, restocks, and the atelier.'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Beschrijving Regel 2 {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.newsletter_description2 : (settings as any).newsletter_description2_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'newsletter_description2' : 'newsletter_description2_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'Geen spam — gewoon MOSE.' : 'No spam — just MOSE.'}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Input Placeholder {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.newsletter_input_placeholder : (settings as any).newsletter_input_placeholder_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'newsletter_input_placeholder' : 'newsletter_input_placeholder_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Je e-mailadres' : 'Your email address'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Button Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                        </label>
                        <input
                          type="text"
                          value={activeLanguage === 'nl' ? settings.newsletter_button_text : (settings as any).newsletter_button_text_en || ''}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            [activeLanguage === 'nl' ? 'newsletter_button_text' : 'newsletter_button_text_en']: e.target.value 
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          placeholder={activeLanguage === 'nl' ? 'Meld je aan' : 'Sign up'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Trust Tekst {activeLanguage === 'nl' ? '(NL)' : '(EN - optioneel)'}
                      </label>
                      <input
                        type="text"
                        value={activeLanguage === 'nl' ? settings.newsletter_trust_text : (settings as any).newsletter_trust_text_en || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          [activeLanguage === 'nl' ? 'newsletter_trust_text' : 'newsletter_trust_text_en']: e.target.value 
                        })}
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                        placeholder={activeLanguage === 'nl' ? 'We respecteren je privacy. Geen spam, uitschrijven kan altijd.' : 'We respect your privacy. No spam, unsubscribe anytime.'}
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
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {message && (
              <p className={`font-bold text-sm md:text-base ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
            <RevalidateButton />
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

