'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Type } from 'lucide-react'
import MediaPicker from '@/components/admin/MediaPicker'

interface LookbookSettings {
  id: string
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

export default function LookbookAdminPage() {
  const [settings, setSettings] = useState<LookbookSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
      setMessage('❌ Error bij laden van settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('lookbook_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      setMessage('✅ Lookbook opgeslagen!')
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
          <p className="text-red-600">Error: Kon lookbook settings niet laden</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📸 Lookbook Beheer</h1>
          <p className="text-gray-600">Pas alle teksten en foto's van de lookbook pagina aan</p>
        </div>

        <div className="space-y-8">
          {/* HEADER */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black flex items-center gap-2">
              <Type size={20} /> Header
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Hoofdtitel</label>
                <input
                  type="text"
                  value={settings.header_title}
                  onChange={(e) => setSettings({ ...settings, header_title: e.target.value })}
                  className="w-full px-4 py-2 text-2xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Subtitel</label>
                <input
                  type="text"
                  value={settings.header_subtitle}
                  onChange={(e) => setSettings({ ...settings, header_subtitle: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* HERO */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black flex items-center gap-2">
              <Camera size={20} /> Hero Sectie
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Hero Afbeelding</label>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.hero_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, hero_image_url: url })}
                  accept="images"
                  folder="lookbook/hero"
                  bucket="images"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Hero Titel</label>
                <input
                  type="text"
                  value={settings.hero_title}
                  onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Hero Subtitel</label>
                <input
                  type="text"
                  value={settings.hero_subtitle}
                  onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 1 */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Sectie 1: Urban Essentials</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Afbeelding</label>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.section1_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, section1_image_url: url })}
                  accept="images"
                  folder="lookbook/section1"
                  bucket="images"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Titel</label>
                <input
                  type="text"
                  value={settings.section1_title}
                  onChange={(e) => setSettings({ ...settings, section1_title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Tekst</label>
                <textarea
                  value={settings.section1_text}
                  onChange={(e) => setSettings({ ...settings, section1_text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Tekst</label>
                  <input
                    type="text"
                    value={settings.section1_cta_text}
                    onChange={(e) => setSettings({ ...settings, section1_cta_text: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Link</label>
                  <input
                    type="text"
                    value={settings.section1_cta_link}
                    onChange={(e) => setSettings({ ...settings, section1_cta_link: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Sectie 2: Clean & Simple</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Afbeelding</label>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.section2_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, section2_image_url: url })}
                  accept="images"
                  folder="lookbook/section2"
                  bucket="images"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Titel</label>
                <input
                  type="text"
                  value={settings.section2_title}
                  onChange={(e) => setSettings({ ...settings, section2_title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Tekst</label>
                <textarea
                  value={settings.section2_text}
                  onChange={(e) => setSettings({ ...settings, section2_text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Tekst</label>
                  <input
                    type="text"
                    value={settings.section2_cta_text}
                    onChange={(e) => setSettings({ ...settings, section2_cta_text: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Link</label>
                  <input
                    type="text"
                    value={settings.section2_cta_link}
                    onChange={(e) => setSettings({ ...settings, section2_cta_link: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* QUOTE */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Quote Blok</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Quote Tekst</label>
                <input
                  type="text"
                  value={settings.quote_text}
                  onChange={(e) => setSettings({ ...settings, quote_text: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Quote Subtekst</label>
                <textarea
                  value={settings.quote_subtext}
                  onChange={(e) => setSettings({ ...settings, quote_subtext: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* TRIPLE SPLIT */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Triple Split (3 Producten)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-brand-primary">Product 1</h3>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.triple1_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, triple1_image_url: url })}
                  accept="images"
                  folder="lookbook/triple"
                  bucket="images"
                  buttonText="Afbeelding 1"
                />
                <div>
                  <label className="block text-sm font-bold mb-2">Titel 1</label>
                  <input
                    type="text"
                    value={settings.triple1_title}
                    onChange={(e) => setSettings({ ...settings, triple1_title: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-brand-primary">Product 2</h3>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.triple2_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, triple2_image_url: url })}
                  accept="images"
                  folder="lookbook/triple"
                  bucket="images"
                  buttonText="Afbeelding 2"
                />
                <div>
                  <label className="block text-sm font-bold mb-2">Titel 2</label>
                  <input
                    type="text"
                    value={settings.triple2_title}
                    onChange={(e) => setSettings({ ...settings, triple2_title: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-brand-primary">Product 3</h3>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.triple3_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, triple3_image_url: url })}
                  accept="images"
                  folder="lookbook/triple"
                  bucket="images"
                  buttonText="Afbeelding 3"
                />
                <div>
                  <label className="block text-sm font-bold mb-2">Titel 3</label>
                  <input
                    type="text"
                    value={settings.triple3_title}
                    onChange={(e) => setSettings({ ...settings, triple3_title: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* WIDE PHOTO */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Wide Lifestyle Photo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Wide Afbeelding</label>
                <MediaPicker
                  mode="single"
                  currentImageUrl={settings.wide_image_url}
                  onImageSelected={(url) => setSettings({ ...settings, wide_image_url: url })}
                  accept="images"
                  folder="lookbook/wide"
                  bucket="images"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Titel</label>
                <input
                  type="text"
                  value={settings.wide_title}
                  onChange={(e) => setSettings({ ...settings, wide_title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Tekst</label>
                  <input
                    type="text"
                    value={settings.wide_cta_text}
                    onChange={(e) => setSettings({ ...settings, wide_cta_text: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">CTA Button Link</label>
                  <input
                    type="text"
                    value={settings.wide_cta_link}
                    onChange={(e) => setSettings({ ...settings, wide_cta_link: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FINAL CTA */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">Final Green CTA</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Titel</label>
                <input
                  type="text"
                  value={settings.final_cta_title}
                  onChange={(e) => setSettings({ ...settings, final_cta_title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border-2 border-gray-300 focus:border-black focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Tekst</label>
                <textarea
                  value={settings.final_cta_text}
                  onChange={(e) => setSettings({ ...settings, final_cta_text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Button Tekst</label>
                  <input
                    type="text"
                    value={settings.final_cta_button_text}
                    onChange={(e) => setSettings({ ...settings, final_cta_button_text: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Button Link</label>
                  <input
                    type="text"
                    value={settings.final_cta_button_link}
                    onChange={(e) => setSettings({ ...settings, final_cta_button_link: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="sticky bottom-0 bg-white border-t-2 border-black p-4 mt-8 flex items-center justify-between">
          {message && (
            <p className={`font-bold ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto px-8 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed border-2 border-black"
          >
            {saving ? 'Opslaan...' : '💾 Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}



