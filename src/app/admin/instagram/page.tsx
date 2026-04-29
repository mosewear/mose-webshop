'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Instagram,
  Settings,
  Layers,
  RefreshCw,
  Plus,
  Pin,
  EyeOff,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  Film,
} from 'lucide-react'
import LanguageTabs from '@/components/admin/LanguageTabs'
import MediaPicker from '@/components/admin/MediaPicker'

type Tab = 'connection' | 'posts' | 'display'

interface SettingsRow {
  id: string
  enabled: boolean
  username: string
  section_title_nl: string
  section_title_en: string | null
  section_subtitle_nl: string
  section_subtitle_en: string | null
  cta_text_nl: string
  cta_text_en: string | null
  cta_url: string
  marquee_speed_seconds: number
  max_posts: number
}

interface CredentialsRow {
  id: string
  business_account_id: string | null
  token_expires_at: string | null
  last_synced_at: string | null
  last_sync_status: 'idle' | 'success' | 'error' | null
  last_sync_error: string | null
  has_token: boolean
}

interface AdminPostRow {
  id: string
  instagram_id: string | null
  permalink: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url: string | null
  caption: string | null
  caption_en: string | null
  like_count: number | null
  taken_at: string | null
  is_hidden: boolean
  is_pinned: boolean
  pin_order: number | null
  source: 'graph' | 'manual'
  created_at: string
  updated_at: string
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export default function AdminInstagramPage() {
  const [activeTab, setActiveTab] = useState<Tab>('connection')
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [credentials, setCredentials] = useState<CredentialsRow | null>(null)
  const [posts, setPosts] = useState<AdminPostRow[]>([])

  // Connection draft inputs (token wordt nooit teruggehaald van server)
  const [tokenInput, setTokenInput] = useState('')
  const [businessIdInput, setBusinessIdInput] = useState('')

  // Manual post modal state
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPermalink, setManualPermalink] = useState('')
  const [manualMediaUrl, setManualMediaUrl] = useState('')
  const [manualCaptionNl, setManualCaptionNl] = useState('')
  const [manualCaptionEn, setManualCaptionEn] = useState('')
  const [manualMediaType, setManualMediaType] = useState<
    'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  >('IMAGE')
  const [manualSaving, setManualSaving] = useState(false)
  const [manualError, setManualError] = useState('')

  const flashMessage = useCallback((text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 4500)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, postsRes] = await Promise.all([
        fetch('/api/admin/instagram/settings', { cache: 'no-store' }),
        fetch('/api/admin/instagram/posts', { cache: 'no-store' }),
      ])
      const settingsJson = await settingsRes.json()
      const postsJson = await postsRes.json()

      if (settingsJson?.success) {
        setSettings(settingsJson.settings || null)
        setCredentials(settingsJson.credentials || null)
        setBusinessIdInput(settingsJson.credentials?.business_account_id || '')
      }
      if (postsJson?.success) {
        setPosts(postsJson.data || [])
      }
    } catch (err) {
      console.error('Failed to load Instagram admin data', err)
      setMessage('Kon data niet laden — probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const saveSettings = useCallback(
    async (overrides?: {
      credentials?: Record<string, unknown>
      settings?: SettingsRow | null
    }) => {
      setSaving(true)
      setMessage('')
      try {
        const body = {
          settings: overrides?.settings ?? settings,
          credentials: overrides?.credentials,
        }
        const res = await fetch('/api/admin/instagram/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          flashMessage('Opslaan mislukt: ' + (json?.error || 'onbekende fout'))
          return false
        }
        await fetch('/api/revalidate-homepage', { method: 'POST' }).catch(() => {})
        flashMessage('Opgeslagen — homepage revalidated.')
        return true
      } catch (err) {
        console.error(err)
        flashMessage('Opslaan mislukt — netwerkfout.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [settings, flashMessage]
  )

  const saveConnection = useCallback(async () => {
    const credPayload: Record<string, unknown> = {
      business_account_id: businessIdInput.trim(),
    }
    if (tokenInput.trim()) {
      credPayload.long_lived_token = tokenInput.trim()
    }
    const ok = await saveSettings({ credentials: credPayload })
    if (ok) {
      setTokenInput('')
      await loadAll()
    }
  }, [businessIdInput, tokenInput, saveSettings, loadAll])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    setMessage('')
    try {
      const res = await fetch('/api/instagram/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        flashMessage('Sync mislukt: ' + (json?.error || 'onbekende fout'))
      } else {
        flashMessage(`Sync voltooid: ${json.upserted}/${json.fetched} posts.`)
      }
      await loadAll()
    } catch (err) {
      console.error(err)
      flashMessage('Sync mislukt — netwerkfout.')
    } finally {
      setSyncing(false)
    }
  }, [flashMessage, loadAll])

  const triggerTokenRefresh = useCallback(async () => {
    setRefreshing(true)
    setMessage('')
    try {
      const res = await fetch('/api/instagram/refresh-token', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        flashMessage('Token vernieuwen mislukt: ' + (json?.error || 'onbekend'))
      } else {
        flashMessage('Token vernieuwd, geldig tot ' + formatDate(json.token_expires_at))
      }
      await loadAll()
    } catch (err) {
      console.error(err)
      flashMessage('Token vernieuwen mislukt.')
    } finally {
      setRefreshing(false)
    }
  }, [flashMessage, loadAll])

  const togglePostField = useCallback(
    async (id: string, patch: Partial<AdminPostRow>) => {
      try {
        const res = await fetch(`/api/admin/instagram/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          flashMessage('Update mislukt: ' + (json?.error || ''))
          return
        }
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...json.data } : p))
        )
      } catch (err) {
        console.error(err)
        flashMessage('Update mislukt — netwerkfout.')
      }
    },
    [flashMessage]
  )

  const deletePost = useCallback(
    async (id: string) => {
      if (!confirm('Verwijder deze handmatige post?')) return
      try {
        const res = await fetch(`/api/admin/instagram/posts/${id}`, {
          method: 'DELETE',
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          flashMessage('Verwijderen mislukt: ' + (json?.error || ''))
          return
        }
        setPosts((prev) => prev.filter((p) => p.id !== id))
        flashMessage('Post verwijderd.')
      } catch (err) {
        console.error(err)
        flashMessage('Verwijderen mislukt — netwerkfout.')
      }
    },
    [flashMessage]
  )

  const submitManual = useCallback(async () => {
    setManualError('')
    if (!manualPermalink || !manualMediaUrl) {
      setManualError('Permalink en afbeelding zijn verplicht.')
      return
    }
    setManualSaving(true)
    try {
      const res = await fetch('/api/admin/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permalink: manualPermalink,
          media_url: manualMediaUrl,
          media_type: manualMediaType,
          caption: manualCaptionNl || null,
          caption_en: manualCaptionEn || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setManualError(json?.error || 'Toevoegen mislukt')
        return
      }
      setPosts((prev) => [json.data, ...prev])
      setManualOpen(false)
      setManualPermalink('')
      setManualMediaUrl('')
      setManualCaptionNl('')
      setManualCaptionEn('')
      setManualMediaType('IMAGE')
      flashMessage('Handmatige post toegevoegd.')
    } catch (err) {
      console.error(err)
      setManualError('Netwerkfout — probeer opnieuw.')
    } finally {
      setManualSaving(false)
    }
  }, [
    manualPermalink,
    manualMediaUrl,
    manualMediaType,
    manualCaptionNl,
    manualCaptionEn,
    flashMessage,
  ])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
          <p>Laden...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 text-red-600" size={32} />
          <p className="text-red-600 font-bold">
            Instagram-instellingen niet gevonden. Run de migratie eerst.
          </p>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; name: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'connection', name: 'Connectie', icon: RefreshCw },
    { id: 'posts', name: 'Posts', icon: Layers },
    { id: 'display', name: 'Display', icon: Settings },
  ]

  const visiblePosts = posts.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Instagram className="text-brand-primary" />
              Instagram Feed
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Beheer de Instagram-marquee op de homepage. Synct automatisch elke 6 uur.
            </p>
          </div>
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
                  <Icon size={16} />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 md:p-6">
            {/* TAB 1: CONNECTION */}
            {activeTab === 'connection' && (
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-200 p-4">
                  <h2 className="text-lg font-bold mb-3">Status</h2>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      {credentials?.has_token ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      <span>
                        Token:{' '}
                        <strong>
                          {credentials?.has_token ? 'ingesteld' : 'niet ingesteld'}
                        </strong>
                        {credentials?.token_expires_at && (
                          <>
                            {' '}
                            — geldig tot{' '}
                            <strong>
                              {formatDate(credentials.token_expires_at)}
                            </strong>
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {credentials?.business_account_id ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      <span>
                        Business Account ID:{' '}
                        <strong>
                          {credentials?.business_account_id || 'niet ingesteld'}
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>Laatste sync: </span>
                      <strong>{formatDate(credentials?.last_synced_at || null)}</strong>
                      {credentials?.last_sync_status === 'success' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold uppercase border border-green-300">
                          Success
                        </span>
                      )}
                      {credentials?.last_sync_status === 'error' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold uppercase border border-red-300">
                          Error
                        </span>
                      )}
                    </li>
                    {credentials?.last_sync_error && (
                      <li className="text-red-700 text-xs bg-red-50 border border-red-200 p-2 mt-2">
                        {credentials.last_sync_error}
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    Long-Lived Access Token
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={
                      credentials?.has_token
                        ? '••••••••••••••••  (laat leeg om huidige token te behouden)'
                        : 'Plak je Meta long-lived token hier'
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Genereer een long-lived token via Meta Business Suite (Instagram
                    Business). De cron ververst hem maandelijks automatisch.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    Instagram Business Account ID
                  </label>
                  <input
                    type="text"
                    value={businessIdInput}
                    onChange={(e) => setBusinessIdInput(e.target.value)}
                    placeholder="bv. 17841401234567890"
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={saveConnection}
                    disabled={saving}
                    className="px-5 py-2.5 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-800 disabled:bg-gray-400 border-2 border-black"
                  >
                    {saving ? 'Opslaan...' : 'Connectie opslaan'}
                  </button>
                  <button
                    onClick={triggerSync}
                    disabled={syncing || !credentials?.has_token}
                    className="px-5 py-2.5 bg-brand-primary text-black font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover disabled:bg-gray-200 border-2 border-black flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Synchroniseren...' : 'Sync nu'}
                  </button>
                  <button
                    onClick={triggerTokenRefresh}
                    disabled={refreshing || !credentials?.has_token}
                    className="px-5 py-2.5 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-gray-100 disabled:bg-gray-200 border-2 border-black"
                  >
                    {refreshing ? 'Vernieuwen...' : 'Token verversen'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: POSTS */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <p className="text-sm text-gray-600">
                    {visiblePosts} {visiblePosts === 1 ? 'post' : 'posts'} totaal —
                    pin om bovenaan te plaatsen, verberg om weg te halen.
                  </p>
                  <button
                    onClick={() => setManualOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 border-2 border-black"
                  >
                    <Plus size={14} /> Handmatige post
                  </button>
                </div>

                {posts.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">Nog geen posts.</p>
                    <p className="text-sm text-gray-400">
                      Stel het token in en klik &quot;Sync nu&quot; — of voeg handmatig een post toe.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className={`border-2 ${
                          post.is_hidden ? 'border-gray-300 opacity-60' : 'border-black'
                        } bg-white flex flex-col`}
                      >
                        <div className="relative aspect-square bg-gray-100">
                          <Image
                            src={
                              post.media_type === 'VIDEO' && post.thumbnail_url
                                ? post.thumbnail_url
                                : post.media_url
                            }
                            alt=""
                            fill
                            unoptimized={!post.media_url.includes('supabase')}
                            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase border-2 border-black ${
                                post.source === 'manual'
                                  ? 'bg-yellow-300 text-black'
                                  : 'bg-white text-black'
                              }`}
                            >
                              {post.source === 'manual' ? 'Handmatig' : 'IG'}
                            </span>
                            {post.media_type !== 'IMAGE' && (
                              <span className="bg-white border-2 border-black p-1">
                                {post.media_type === 'VIDEO' ? (
                                  <Film size={10} />
                                ) : (
                                  <Layers size={10} />
                                )}
                              </span>
                            )}
                          </div>
                          {post.is_pinned && (
                            <div className="absolute top-2 right-2 bg-brand-primary border-2 border-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Pin size={10} />
                              {typeof post.pin_order === 'number' ? `#${post.pin_order}` : 'Pin'}
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex-1 flex flex-col text-xs">
                          {post.caption && (
                            <p className="line-clamp-3 text-gray-700 mb-2">{post.caption}</p>
                          )}
                          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-200">
                            <button
                              onClick={() =>
                                togglePostField(post.id, { is_pinned: !post.is_pinned })
                              }
                              className={`px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                                post.is_pinned
                                  ? 'bg-brand-primary text-black'
                                  : 'bg-white text-black hover:bg-gray-100'
                              }`}
                            >
                              <Pin size={10} /> {post.is_pinned ? 'Pinned' : 'Pin'}
                            </button>
                            <button
                              onClick={() =>
                                togglePostField(post.id, { is_hidden: !post.is_hidden })
                              }
                              className={`px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                                post.is_hidden
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-white text-black hover:bg-gray-100'
                              }`}
                            >
                              {post.is_hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                              {post.is_hidden ? 'Verborgen' : 'Zichtbaar'}
                            </button>
                            {post.is_pinned && (
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={post.pin_order ?? ''}
                                onChange={(e) =>
                                  togglePostField(post.id, {
                                    pin_order: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                className="w-12 px-1 py-1 border-2 border-black text-[10px] font-bold text-center"
                                placeholder="0"
                                aria-label="Pin volgorde"
                              />
                            )}
                            {post.source === 'manual' && (
                              <button
                                onClick={() => deletePost(post.id)}
                                className="ml-auto p-1 border-2 border-red-600 text-red-600 hover:bg-red-50"
                                aria-label="Verwijder post"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DISPLAY */}
            {activeTab === 'display' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 border-2 border-black bg-gray-50">
                  <input
                    id="ig-enabled"
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, enabled: e.target.checked })
                    }
                    className="h-5 w-5"
                  />
                  <label htmlFor="ig-enabled" className="font-bold text-sm">
                    Toon Instagram-marquee op homepage
                  </label>
                </div>

                <LanguageTabs
                  activeLanguage={activeLanguage}
                  onLanguageChange={setActiveLanguage}
                />

                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    Sectietitel ({activeLanguage.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={
                      activeLanguage === 'nl'
                        ? settings.section_title_nl
                        : settings.section_title_en || ''
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [activeLanguage === 'nl' ? 'section_title_nl' : 'section_title_en']:
                          e.target.value,
                      })
                    }
                    placeholder="@mosewearcom"
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    Subtitel ({activeLanguage.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={
                      activeLanguage === 'nl'
                        ? settings.section_subtitle_nl
                        : settings.section_subtitle_en || ''
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [activeLanguage === 'nl'
                          ? 'section_subtitle_nl'
                          : 'section_subtitle_en']: e.target.value,
                      })
                    }
                    placeholder="Zo wordt MOSE in het echt gedragen"
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    CTA-tekst ({activeLanguage.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={
                      activeLanguage === 'nl'
                        ? settings.cta_text_nl
                        : settings.cta_text_en || ''
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [activeLanguage === 'nl' ? 'cta_text_nl' : 'cta_text_en']:
                          e.target.value,
                      })
                    }
                    placeholder="Volg ons op Instagram"
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>

                {activeLanguage === 'nl' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-1.5">CTA URL</label>
                      <input
                        type="url"
                        value={settings.cta_url}
                        onChange={(e) =>
                          setSettings({ ...settings, cta_url: e.target.value })
                        }
                        placeholder="https://www.instagram.com/mosewearcom"
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-1.5">
                        Instagram username (zonder @)
                      </label>
                      <input
                        type="text"
                        value={settings.username}
                        onChange={(e) =>
                          setSettings({ ...settings, username: e.target.value })
                        }
                        placeholder="mosewearcom"
                        className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-1.5">
                          Marquee snelheid (sec per loop): {settings.marquee_speed_seconds}s
                        </label>
                        <input
                          type="range"
                          min={20}
                          max={240}
                          value={settings.marquee_speed_seconds}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              marquee_speed_seconds: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Lager = sneller. 60s is de standaard.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1.5">
                          Aantal posts in marquee: {settings.max_posts}
                        </label>
                        <input
                          type="range"
                          min={4}
                          max={20}
                          value={settings.max_posts}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              max_posts: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky save bar (alleen voor display-tab) */}
        {activeTab === 'display' && (
          <div className="sticky bottom-0 bg-white border-t-2 border-black p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {message && (
              <p
                className={`font-bold text-sm md:text-base ${
                  message.toLowerCase().includes('mislukt')
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {message}
              </p>
            )}
            <button
              onClick={() => saveSettings()}
              disabled={saving}
              className="ml-auto px-6 py-2.5 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-800 disabled:bg-gray-400 border-2 border-black"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        )}

        {message && activeTab !== 'display' && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 border-2 border-brand-primary text-sm font-bold z-50">
            {message}
          </div>
        )}

        {/* Manual post modal */}
        {manualOpen && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white border-2 border-black w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b-2 border-black sticky top-0 bg-white">
                <h2 className="font-bold uppercase tracking-wider">
                  Handmatige Instagram-post
                </h2>
                <button
                  onClick={() => setManualOpen(false)}
                  className="text-2xl leading-none"
                  aria-label="Sluiten"
                >
                  ×
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">
                    Permalink (instagram.com URL)
                  </label>
                  <input
                    type="url"
                    value={manualPermalink}
                    onChange={(e) => setManualPermalink(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">Afbeelding</label>
                  <MediaPicker
                    mode="single"
                    currentImageUrl={manualMediaUrl}
                    onImageSelected={(url) => setManualMediaUrl(url)}
                    accept="images"
                    folder="instagram/manual"
                    bucket="images"
                    buttonText="Selecteer afbeelding"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">Type</label>
                  <select
                    value={manualMediaType}
                    onChange={(e) =>
                      setManualMediaType(e.target.value as typeof manualMediaType)
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                  >
                    <option value="IMAGE">Foto</option>
                    <option value="VIDEO">Video (gebruikt foto als poster)</option>
                    <option value="CAROUSEL_ALBUM">Carrousel</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Caption (NL)</label>
                    <textarea
                      rows={3}
                      value={manualCaptionNl}
                      onChange={(e) => setManualCaptionNl(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Caption (EN)</label>
                    <textarea
                      rows={3}
                      value={manualCaptionEn}
                      onChange={(e) => setManualCaptionEn(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
                {manualError && (
                  <p className="text-sm text-red-600 font-bold">{manualError}</p>
                )}
              </div>
              <div className="p-4 border-t-2 border-black flex gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setManualOpen(false)}
                  className="px-4 py-2 border-2 border-black font-bold uppercase tracking-wider text-sm hover:bg-gray-100"
                >
                  Annuleren
                </button>
                <button
                  onClick={submitManual}
                  disabled={manualSaving}
                  className="ml-auto px-6 py-2 bg-black text-white border-2 border-black font-bold uppercase tracking-wider text-sm hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {manualSaving ? 'Toevoegen...' : 'Toevoegen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
