'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical, Save, Eye, EyeOff, Settings } from 'lucide-react'

interface AnnouncementMessage {
  id: string
  text: string
  link_url: string | null
  cta_text: string | null
  icon: string | null
  is_active: boolean
  sort_order: number
}

interface BannerConfig {
  id: string
  enabled: boolean
  rotation_interval: number
  dismissable: boolean
  dismiss_cookie_days: number
}

export default function AnnouncementBannerAdmin() {
  const [config, setConfig] = useState<BannerConfig | null>(null)
  const [messages, setMessages] = useState<AnnouncementMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchBanner()
  }, [])

  const fetchBanner = async () => {
    try {
      setLoading(true)
      
      // Fetch config
      const { data: configData } = await supabase
        .from('announcement_banner')
        .select('*')
        .single()

      if (configData) {
        setConfig(configData)

        // Fetch messages
        const { data: messagesData } = await supabase
          .from('announcement_messages')
          .select('*')
          .eq('banner_id', configData.id)
          .order('sort_order', { ascending: true })

        if (messagesData) {
          setMessages(messagesData)
        }
      }
    } catch (error) {
      console.error('Error fetching banner:', error)
      alert('Fout bij laden van banner data')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBanner = async (enabled: boolean) => {
    if (!config) return

    // Optimistic update
    setConfig({ ...config, enabled })

    try {
      const { error } = await supabase
        .from('announcement_banner')
        .update({
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)

      if (error) throw error
      console.log('✅ Banner toggle saved:', enabled)
    } catch (error: any) {
      console.error('Error toggling banner:', error)
      alert(`Fout bij opslaan: ${error.message}`)
      // Revert on error
      setConfig({ ...config, enabled: !enabled })
    }
  }

  const handleSaveConfig = async () => {
    if (!config) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('announcement_banner')
        .update({
          enabled: config.enabled,
          rotation_interval: config.rotation_interval,
          dismissable: config.dismissable,
          dismiss_cookie_days: config.dismiss_cookie_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)

      if (error) throw error
      alert('✅ Instellingen opgeslagen!')
    } catch (error: any) {
      console.error('Error saving config:', error)
      alert(`Fout: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMessages = async () => {
    setSaving(true)
    try {
      // Update all messages
      const updates = messages.map((msg, index) => ({
        ...msg,
        sort_order: index,
        updated_at: new Date().toISOString()
      }))

      for (const msg of updates) {
        const { error } = await supabase
          .from('announcement_messages')
          .update(msg)
          .eq('id', msg.id)

        if (error) throw error
      }

      alert('✅ Berichten opgeslagen!')
      fetchBanner()
    } catch (error: any) {
      console.error('Error saving messages:', error)
      alert(`Fout: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddMessage = async () => {
    if (!config) return

    try {
      const { data, error } = await supabase
        .from('announcement_messages')
        .insert({
          banner_id: config.id,
          text: 'NIEUW BERICHT',
          link_url: null,
          cta_text: null,
          icon: '🎉',
          is_active: false,
          sort_order: messages.length
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        setMessages([...messages, data])
      }
    } catch (error: any) {
      console.error('Error adding message:', error)
      alert(`Fout: ${error.message}`)
    }
  }

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('announcement_messages')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMessages(messages.filter(m => m.id !== id))
    } catch (error: any) {
      console.error('Error deleting message:', error)
      alert(`Fout: ${error.message}`)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newMessages = [...messages]
    ;[newMessages[index - 1], newMessages[index]] = [newMessages[index], newMessages[index - 1]]
    setMessages(newMessages)
  }

  const handleMoveDown = (index: number) => {
    if (index === messages.length - 1) return
    const newMessages = [...messages]
    ;[newMessages[index], newMessages[index + 1]] = [newMessages[index + 1], newMessages[index]]
    setMessages(newMessages)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Banner configuratie niet gevonden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Marketing Banner</h1>
          <p className="text-gray-600">Beheer auto-rotating announcement bar bovenaan de website</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 cursor-pointer hover:border-brand-primary transition-colors">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleToggleBanner(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-bold uppercase">
              Banner {config.enabled ? 'Actief' : 'Inactief'}
            </span>
          </label>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 border-2 border-gray-300 hover:border-brand-primary transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white p-6 border-2 border-gray-200">
          <h3 className="text-lg font-bold mb-4">Algemene Instellingen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Rotatie interval (seconden)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.rotation_interval}
                onChange={(e) => setConfig({ ...config, rotation_interval: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.dismissable}
                  onChange={(e) => setConfig({ ...config, dismissable: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold text-gray-700">Dismissable (X button)</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cookie duur (dagen)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={config.dismiss_cookie_days}
                onChange={(e) => setConfig({ ...config, dismiss_cookie_days: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                disabled={!config.dismissable}
              />
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : '💾 Instellingen Opslaan'}
          </button>
        </div>
      )}

      {/* Live Preview */}
      {config.enabled && messages.some(m => m.is_active) && (
        <div className="bg-gray-100 p-4 border-2 border-gray-300">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Live Preview:</h3>
          <div className="bg-brand-primary text-white py-3 px-4 flex items-center justify-center gap-2">
            {messages.find(m => m.is_active && m.sort_order === 0) && (
              <>
                <span>{messages.find(m => m.is_active)?.icon}</span>
                <span className="text-sm font-bold uppercase">
                  {messages.find(m => m.is_active)?.text}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white p-6 border-2 border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Berichten ({messages.length})</h3>
          <button
            onClick={handleAddMessage}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuw Bericht
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nog geen berichten. Klik op "Nieuw Bericht" om te beginnen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`border-2 p-4 ${
                  message.is_active ? 'border-brand-primary bg-green-50' : 'border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 disabled:opacity-30 rounded"
                    >
                      ▲
                    </button>
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === messages.length - 1}
                      className="p-1 hover:bg-gray-200 disabled:opacity-30 rounded"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                          Tekst *
                        </label>
                        <input
                          type="text"
                          value={message.text}
                          onChange={(e) => {
                            const updated = [...messages]
                            updated[index].text = e.target.value
                            setMessages(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                          placeholder="GRATIS VERZENDING BOVEN €150"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                          Icon (emoji)
                        </label>
                        <input
                          type="text"
                          value={message.icon || ''}
                          onChange={(e) => {
                            const updated = [...messages]
                            updated[index].icon = e.target.value
                            setMessages(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                          placeholder="🎉"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                          Link URL
                        </label>
                        <input
                          type="text"
                          value={message.link_url || ''}
                          onChange={(e) => {
                            const updated = [...messages]
                            updated[index].link_url = e.target.value || null
                            setMessages(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                          placeholder="/shop"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                          CTA Tekst
                        </label>
                        <input
                          type="text"
                          value={message.cta_text || ''}
                          onChange={(e) => {
                            const updated = [...messages]
                            updated[index].cta_text = e.target.value || null
                            setMessages(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                          placeholder="SHOP NU"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = [...messages]
                          updated[index].is_active = !updated[index].is_active
                          setMessages(updated)
                        }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase border-2 transition-colors ${
                          message.is_active
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-green-600'
                        }`}
                      >
                        {message.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {message.is_active ? 'Actief' : 'Inactief'}
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <button
            onClick={handleSaveMessages}
            disabled={saving}
            className="mt-6 w-full px-6 py-3 bg-brand-primary text-white font-bold uppercase hover:bg-brand-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Opslaan...' : 'Alle Berichten Opslaan'}
          </button>
        )}
      </div>
    </div>
  )
}

