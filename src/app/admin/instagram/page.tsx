'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  Link2,
  Unlink,
  ChevronRight,
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
  page_id: string | null
  page_name: string | null
  ig_username: string | null
  has_token: boolean
}

interface PendingCandidate {
  page_id: string
  page_name: string
  ig_business_account_id: string
  ig_username: string
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

function reasonToMessage(reason: string): string {
  switch (reason) {
    case 'state_mismatch':
    case 'invalid_state':
      return 'Sessie verlopen of beveiligingscontrole faalde. Probeer opnieuw.'
    case 'missing_params':
      return 'Facebook stuurde een onvolledige callback terug.'
    case 'code_exchange_failed':
      return 'Facebook gaf geen geldig token terug.'
    case 'token_extension_failed':
      return 'Long-lived token kon niet worden aangemaakt.'
    case 'pages_fetch_failed':
      return 'Pages konden niet worden opgehaald.'
    case 'permissions_missing':
      return 'Niet alle benodigde permissies gegeven. Probeer opnieuw en laat alle vinkjes aan staan.'
    case 'no_pages':
      return 'Je Facebook-account beheert geen Pages. Maak eerst een Facebook Page aan en koppel daar je Instagram aan.'
    case 'no_ig_account':
      return 'Geen Instagram Business Account gekoppeld aan een van je pages.'
    case 'save_failed':
      return 'Opslaan in de database mislukte.'
    case 'access_denied':
      return 'Je hebt geweigerd toegang te geven op Facebook.'
    default:
      return reason || 'Onbekende fout.'
  }
}

interface ConnectionPanelProps {
  credentials: CredentialsRow | null
  pendingCandidates: PendingCandidate[]
  finalizing: boolean
  disconnecting: boolean
  syncing: boolean
  refreshing: boolean
  connectError: string
  onDismissError: () => void
  onConnect: () => void
  onPick: (pageId: string) => void
  onDisconnect: () => void
  onSync: () => void
  onRefresh: () => void
}

function ConnectionPanel({
  credentials,
  pendingCandidates,
  finalizing,
  disconnecting,
  syncing,
  refreshing,
  connectError,
  onDismissError,
  onConnect,
  onPick,
  onDisconnect,
  onSync,
  onRefresh,
}: ConnectionPanelProps) {
  const isConnected = !!credentials?.has_token
  const showPicker = pendingCandidates.length > 0

  const errorBanner = connectError ? (
    <div className="border-2 border-red-600 bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle
        size={18}
        className="text-red-700 flex-shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-red-700 mb-1">Connectie mislukt</p>
        <p className="text-sm text-red-700 break-words">{connectError}</p>
      </div>
      <button
        onClick={onDismissError}
        className="text-red-700 text-2xl leading-none flex-shrink-0 -mt-1"
        aria-label="Sluit melding"
      >
        ×
      </button>
    </div>
  ) : null

  // PICKER STATE: meerdere FB-pages, admin moet kiezen.
  if (showPicker) {
    return (
      <div className="space-y-5">
        <div className="bg-yellow-50 border-2 border-yellow-300 p-4">
          <h2 className="text-lg font-bold mb-1.5 flex items-center gap-2">
            <ChevronRight size={18} />
            Kies welke page je wilt koppelen
          </h2>
          <p className="text-sm text-gray-700">
            We vonden meerdere Facebook-pages met een gekoppeld Instagram
            Business Account. Selecteer welk account je wilt verbinden met
            de webshop.
          </p>
        </div>
        <div className="space-y-2">
          {pendingCandidates.map((candidate) => (
            <button
              key={candidate.page_id}
              onClick={() => onPick(candidate.page_id)}
              disabled={finalizing}
              className="w-full flex items-center justify-between gap-3 p-4 border-2 border-black bg-white hover:bg-gray-50 disabled:opacity-50 text-left transition-colors"
            >
              <div className="min-w-0">
                <p className="font-bold truncate">
                  {candidate.ig_username
                    ? '@' + candidate.ig_username
                    : 'Instagram-account'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  via Facebook-page: {candidate.page_name}
                </p>
              </div>
              <ChevronRight
                size={18}
                className="flex-shrink-0 text-gray-400"
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Verkeerd account erbij? Je kunt na het koppelen altijd weer
          loskoppelen en opnieuw beginnen.
        </p>
      </div>
    )
  }

  // CONNECTED STATE: account is gekoppeld, toon status + acties.
  if (isConnected) {
    return (
      <div className="space-y-5">
        <div className="bg-green-50 border-2 border-green-300 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle
              size={20}
              className="text-green-700 flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">
                {credentials?.ig_username
                  ? '@' + credentials.ig_username + ' is gekoppeld'
                  : 'Instagram is gekoppeld'}
              </h2>
              {credentials?.page_name && (
                <p className="text-sm text-gray-700">
                  via Facebook-page: <strong>{credentials.page_name}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <dl className="bg-gray-50 border-2 border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              Business Account ID
            </dt>
            <dd className="font-mono text-xs break-all">
              {credentials?.business_account_id || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              Token geldig tot
            </dt>
            <dd>{formatDate(credentials?.token_expires_at || null)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              Laatste sync
            </dt>
            <dd className="flex items-center gap-2 flex-wrap">
              <span>{formatDate(credentials?.last_synced_at || null)}</span>
              {credentials?.last_sync_status === 'success' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold uppercase border border-green-300">
                  Success
                </span>
              )}
              {credentials?.last_sync_status === 'error' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold uppercase border border-red-300">
                  Error
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              Cron
            </dt>
            <dd className="text-xs text-gray-600">
              Automatische sync elke 6 uur. Token verlengt maandelijks.
            </dd>
          </div>
          {credentials?.last_sync_error && (
            <div className="sm:col-span-2 text-red-700 text-xs bg-red-50 border border-red-200 p-2">
              {credentials.last_sync_error}
            </div>
          )}
        </dl>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-brand-primary text-black font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover disabled:bg-gray-200 border-2 border-black flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchroniseren...' : 'Sync nu'}
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-5 py-2.5 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-gray-100 disabled:bg-gray-200 border-2 border-black"
          >
            {refreshing ? 'Vernieuwen...' : 'Token verversen'}
          </button>
          <button
            onClick={onDisconnect}
            disabled={disconnecting}
            className="sm:ml-auto px-5 py-2.5 bg-white text-red-700 font-bold text-sm uppercase tracking-wider hover:bg-red-50 disabled:opacity-50 border-2 border-red-700 flex items-center justify-center gap-2"
          >
            <Unlink size={16} />
            {disconnecting ? 'Loskoppelen...' : 'Verbinding verbreken'}
          </button>
        </div>
      </div>
    )
  }

  // DISCONNECTED STATE: nog geen account gekoppeld, toon connect-CTA.
  return (
    <div className="space-y-5">
      {errorBanner}
      <div className="border-2 border-black p-6 md:p-8 bg-white text-center">
        <div className="mx-auto mb-4 inline-flex p-3 border-2 border-black bg-brand-primary">
          <Instagram size={28} className="text-black" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          Koppel je Instagram-account
        </h2>
        <p className="text-sm md:text-base text-gray-600 mb-6 max-w-md mx-auto">
          Eén klik en je MOSE Instagram Business Account staat in de
          marquee op de homepage. We synchroniseren daarna automatisch
          elke 6 uur.
        </p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-wider text-sm hover:bg-gray-800 border-2 border-black"
        >
          <Link2 size={18} />
          Connect with Instagram
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Je logt in met je Facebook-account dat de MOSE Page beheert.
          We slaan alleen het long-lived Page Access Token en het
          Instagram Business Account ID op.
        </p>
      </div>

      <details className="border-2 border-gray-200 bg-gray-50 p-4 text-sm">
        <summary className="font-bold cursor-pointer">
          Lukt het niet? Veelvoorkomende oorzaken
        </summary>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-gray-700">
          <li>
            <strong>Instagram is niet Business of Maker.</strong> Open de
            Instagram-app, ga naar Profiel → Menu → Type account → schakel
            naar &quot;Bedrijf&quot; of &quot;Maker&quot;.
          </li>
          <li>
            <strong>Instagram is niet aan een Facebook Page gekoppeld.</strong>{' '}
            Ga naar{' '}
            <a
              href="https://business.facebook.com/settings/instagram-accounts"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold"
            >
              Meta Business Suite → Instagram-accounts
            </a>{' '}
            en koppel je Instagram aan de juiste Facebook Page (niet aan een
            persoonlijk profiel).
          </li>
          <li>
            <strong>Geen Facebook Page.</strong> Maak er één aan via{' '}
            <a
              href="https://www.facebook.com/pages/create"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold"
            >
              facebook.com/pages/create
            </a>{' '}
            en koppel daarna je Instagram er via Meta Business Suite aan.
          </li>
          <li>
            <strong>Permissies uitgevinkt tijdens login.</strong> Op het
            Facebook-toestemmingsscherm moeten alle vinkjes (Pages,
            Instagram, Bedrijven) aan blijven staan.
          </li>
          <li>
            <strong>Verkeerd Facebook-account.</strong> Log eerst uit op
            facebook.com en dan via deze knop opnieuw in met het account
            dat de MOSE Page beheert.
          </li>
        </ul>
      </details>

      <details className="border-2 border-gray-200 bg-gray-50 p-4 text-sm">
        <summary className="font-bold cursor-pointer">
          Vereisten in Meta for Developers
        </summary>
        <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-gray-700">
          <li>
            Onze redirect URI staat in &quot;Valid OAuth Redirect URIs&quot;:
            <br />
            <code className="break-all text-xs">
              https://www.mosewear.com/api/instagram/oauth/callback
            </code>
          </li>
          <li>De Meta App staat op &quot;Live&quot;.</li>
          <li>
            App heeft de permissies <code>instagram_basic</code>,{' '}
            <code>pages_show_list</code> en <code>pages_read_engagement</code>{' '}
            actief.
          </li>
        </ol>
      </details>
    </div>
  )
}

export default function AdminInstagramPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('connection')
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageVariant, setMessageVariant] = useState<'success' | 'error'>(
    'success'
  )
  // Long-form OAuth callback errors worden als banner getoond ipv toast,
  // omdat ze meerdere zinnen kunnen zijn (zie callback diagnostics).
  const [connectError, setConnectError] = useState('')

  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [credentials, setCredentials] = useState<CredentialsRow | null>(null)
  const [posts, setPosts] = useState<AdminPostRow[]>([])

  // Pending OAuth state (multi-page picker).
  const [pendingCandidates, setPendingCandidates] = useState<PendingCandidate[]>(
    []
  )

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

  const flashMessage = useCallback(
    (text: string, variant: 'success' | 'error' = 'success') => {
      setMessage(text)
      setMessageVariant(variant)
      window.setTimeout(() => setMessage(''), 4500)
    },
    []
  )

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, postsRes, pendingRes] = await Promise.all([
        fetch('/api/admin/instagram/settings', { cache: 'no-store' }),
        fetch('/api/admin/instagram/posts', { cache: 'no-store' }),
        fetch('/api/admin/instagram/oauth/pending', { cache: 'no-store' }),
      ])
      const settingsJson = await settingsRes.json()
      const postsJson = await postsRes.json()
      const pendingJson = await pendingRes.json().catch(() => null)

      if (settingsJson?.success) {
        setSettings(settingsJson.settings || null)
        setCredentials(settingsJson.credentials || null)
      }
      if (postsJson?.success) {
        setPosts(postsJson.data || [])
      }
      if (pendingJson?.success && pendingJson.pending?.candidates) {
        setPendingCandidates(pendingJson.pending.candidates)
      } else {
        setPendingCandidates([])
      }
    } catch (err) {
      console.error('Failed to load Instagram admin data', err)
      setMessage('Kon data niet laden, probeer het opnieuw.')
      setMessageVariant('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // OAuth callback geeft via query-params een status door. Korte success
  // gaat naar de toast, fouten gaan naar een banner in het connection-
  // panel zelf zodat lange foutmeldingen niet over de menu-knop heen
  // op mobiel komen te liggen.
  useEffect(() => {
    const status = searchParams.get('oauth')
    if (!status) return
    const reason = searchParams.get('reason') || ''
    const detail = searchParams.get('message') || ''
    if (status === 'connected') {
      flashMessage('Instagram-account gekoppeld.', 'success')
    } else if (status === 'pick') {
      flashMessage('Kies welke Facebook-page je wilt koppelen.', 'success')
    } else if (status === 'error') {
      const human = detail || reasonToMessage(reason)
      setConnectError(human)
      setActiveTab('connection')
    }
    const next = new URL(window.location.href)
    next.searchParams.delete('oauth')
    next.searchParams.delete('reason')
    next.searchParams.delete('message')
    router.replace(next.pathname + next.search, { scroll: false })
  }, [searchParams, router, flashMessage])

  const saveSettings = useCallback(
    async (overrides?: { settings?: SettingsRow | null }) => {
      setSaving(true)
      setMessage('')
      try {
        const body = {
          settings: overrides?.settings ?? settings,
        }
        const res = await fetch('/api/admin/instagram/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          flashMessage(
            'Opslaan mislukt: ' + (json?.error || 'onbekende fout'),
            'error'
          )
          return false
        }
        await fetch('/api/revalidate-homepage', { method: 'POST' }).catch(() => {})
        flashMessage('Opgeslagen, homepage opnieuw gepubliceerd.')
        return true
      } catch (err) {
        console.error(err)
        flashMessage('Opslaan mislukt door netwerkfout.', 'error')
        return false
      } finally {
        setSaving(false)
      }
    },
    [settings, flashMessage]
  )

  const startOAuth = useCallback(() => {
    // Top-level navigation -> server-side redirect chain naar Facebook.
    window.location.href = '/api/admin/instagram/oauth/start'
  }, [])

  const finalizeOAuth = useCallback(
    async (pageId: string) => {
      setFinalizing(true)
      setMessage('')
      try {
        const res = await fetch('/api/admin/instagram/oauth/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: pageId }),
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          flashMessage(
            'Koppelen mislukt: ' + (json?.error || 'onbekende fout'),
            'error'
          )
          return
        }
        flashMessage('Account gekoppeld.')
        setPendingCandidates([])
        await loadAll()
      } catch (err) {
        console.error(err)
        flashMessage('Koppelen mislukt door netwerkfout.', 'error')
      } finally {
        setFinalizing(false)
      }
    },
    [flashMessage, loadAll]
  )

  const disconnectOAuth = useCallback(async () => {
    if (
      !confirm(
        'Weet je zeker dat je het Instagram-account wilt loskoppelen? De marquee blijft de laatst gesynchroniseerde posts tonen tot je een nieuw account koppelt.'
      )
    ) {
      return
    }
    setDisconnecting(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/instagram/oauth/disconnect', {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        flashMessage(
          'Loskoppelen mislukt: ' + (json?.error || 'onbekende fout'),
          'error'
        )
        return
      }
      flashMessage('Account losgekoppeld.')
      setPendingCandidates([])
      await loadAll()
    } catch (err) {
      console.error(err)
      flashMessage('Loskoppelen mislukt door netwerkfout.', 'error')
    } finally {
      setDisconnecting(false)
    }
  }, [flashMessage, loadAll])

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
              <ConnectionPanel
                credentials={credentials}
                pendingCandidates={pendingCandidates}
                finalizing={finalizing}
                disconnecting={disconnecting}
                syncing={syncing}
                refreshing={refreshing}
                connectError={connectError}
                onDismissError={() => setConnectError('')}
                onConnect={startOAuth}
                onPick={finalizeOAuth}
                onDisconnect={disconnectOAuth}
                onSync={triggerSync}
                onRefresh={triggerTokenRefresh}
              />
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
                  messageVariant === 'error' ? 'text-red-600' : 'text-green-600'
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
          <div
            className={`fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md px-4 py-2 border-2 text-sm font-bold z-50 ${
              messageVariant === 'error'
                ? 'bg-red-600 text-white border-black'
                : 'bg-black text-white border-brand-primary'
            }`}
          >
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
