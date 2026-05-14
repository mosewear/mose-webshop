'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, TrendingUp, UserX, Download, Search, Mail, Send, Calendar, Eye, Trash2, Settings, Globe, Sparkles, AlertTriangle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subscriber {
  id: string
  email: string
  status: 'active' | 'unsubscribed'
  source: string
  subscribed_at: string
  unsubscribed_at: string | null
  locale?: string
}

interface Stats {
  total: number
  thisMonth: number
  unsubscribed: number
  unsubRate: string
}

interface Props {
  initialSubscribers: Subscriber[]
  initialStats: Stats
}

export default function NewsletterAdminClient({ initialSubscribers, initialStats }: Props) {
  const router = useRouter()
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers)

  useEffect(() => {
    setSubscribers(initialSubscribers)
  }, [initialSubscribers])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'email'>('newest')
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'subscribers' | 'insider-emails' | 'spring-drop' | 'popup-settings'>('subscribers')
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [sendingTestEmail, setSendingTestEmail] = useState<string | null>(null)
  const [sendingSpringDrop, setSendingSpringDrop] = useState<number | null>(null)
  const [sendingSpringDropTest, setSendingSpringDropTest] = useState<number | null>(null)
  const [confirmSpringDrop, setConfirmSpringDrop] = useState<{ mail: 1 | 2 | 3; recipients: number } | null>(null)
  const [springDropDryRun, setSpringDropDryRun] = useState<Record<number, { recipients: number; promoCodeCoverage?: any } | null>>({ 1: null, 2: null, 3: null })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDryRunResult, setImportDryRunResult] = useState<{
    summary: Record<string, number>
    invalid: { row: number; reason: string; value?: string }[]
    parseWarnings: string[]
  } | null>(null)
  const [importPreviewLoading, setImportPreviewLoading] = useState(false)
  const [importExecuteLoading, setImportExecuteLoading] = useState(false)
  const [importReactivateUnsub, setImportReactivateUnsub] = useState(false)
  const [importSendWelcome, setImportSendWelcome] = useState(false)

  // Popup settings state
  const [popupEnabled, setPopupEnabled] = useState(false)
  const [popupTrigger, setPopupTrigger] = useState<'exit_intent' | 'timer' | 'hybrid' | 'scroll'>('hybrid')
  const [popupDelaySeconds, setPopupDelaySeconds] = useState(20)
  const [popupScrollPercentage, setPopupScrollPercentage] = useState(50)
  const [popupFrequencyDays, setPopupFrequencyDays] = useState(7)
  const [popupShowOnPages, setPopupShowOnPages] = useState<string[]>(['home', 'shop', 'product'])
  const [popupDiscountPercentage, setPopupDiscountPercentage] = useState(10)
  const [savingPopupSettings, setSavingPopupSettings] = useState(false)

  // Email preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewEmailType, setPreviewEmailType] = useState<'welcome' | 'community' | 'behind-scenes' | 'launch-week' | null>(null)
  const [previewLocale, setPreviewLocale] = useState<'nl' | 'en'>('nl')

  // Open email preview
  const handleOpenPreview = (type: 'welcome' | 'community' | 'behind-scenes' | 'launch-week', locale: 'nl' | 'en' = 'nl') => {
    setPreviewEmailType(type)
    setPreviewLocale(locale)
    setPreviewModalOpen(true)
  }

  // Filtered and sorted subscribers
  const filteredSubscribers = useMemo(() => {
    let filtered = subscribers

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(sub => 
        sub.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.subscribed_at).getTime() - new Date(b.subscribed_at).getTime()
      } else { // email
        return a.email.localeCompare(b.email)
      }
    })

    return filtered
  }, [subscribers, searchQuery, statusFilter, sortBy])

  const handleExport = async () => {
    setExporting(true)
    toast.loading('CSV wordt gegenereerd...')

    try {
      const response = await fetch('/api/newsletter/export')
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.dismiss()
      toast.success('CSV succesvol gedownload!')
    } catch (error) {
      console.error('Export error:', error)
      toast.dismiss()
      toast.error('Kon CSV niet exporteren')
    } finally {
      setExporting(false)
    }
  }

  const resetImportModal = () => {
    setImportFile(null)
    setImportDryRunResult(null)
    setImportReactivateUnsub(false)
    setImportSendWelcome(false)
  }

  const openImportModal = () => {
    resetImportModal()
    setImportModalOpen(true)
  }

  const closeImportModal = () => {
    setImportModalOpen(false)
    resetImportModal()
  }

  const postImportForm = async (dryRun: boolean) => {
    if (!importFile) {
      toast.error('Kies eerst een bestand.')
      return null
    }
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('dryRun', dryRun ? 'true' : 'false')
    fd.append('reactivateUnsubscribed', importReactivateUnsub ? 'true' : 'false')
    fd.append('sendWelcomeEmail', importSendWelcome ? 'true' : 'false')

    const res = await fetch('/api/newsletter/import', {
      method: 'POST',
      body: fd,
    })
    const text = await res.text()
    let data: { error?: string; summary?: Record<string, unknown>; invalid?: unknown[]; parseWarnings?: string[] } = {}
    try {
      if (text) data = JSON.parse(text)
    } catch {
      // e.g. HTML error page from the platform
    }
    if (!res.ok) {
      const msg =
        (typeof data.error === 'string' && data.error.trim()) ||
        `Import mislukt (HTTP ${res.status})`
      throw new Error(msg)
    }
    return data
  }

  const handleImportPreview = async () => {
    setImportPreviewLoading(true)
    setImportDryRunResult(null)
    try {
      const data = await postImportForm(true)
      setImportDryRunResult({
        summary: data.summary || {},
        invalid: data.invalid || [],
        parseWarnings: data.parseWarnings || [],
      })
      toast.success('Controle klaar. Bekijk de tellingen en bevestig.')
    } catch (e: any) {
      toast.error(e?.message || 'Controle mislukt')
    } finally {
      setImportPreviewLoading(false)
    }
  }

  const handleImportExecute = async () => {
    if (!importDryRunResult) {
      toast.error('Doe eerst een controle (droge run).')
      return
    }
    setImportExecuteLoading(true)
    try {
      const data = await postImportForm(false)
      const s = data.summary || {}
      toast.success(
        `Klaar: ${s.inserted ?? 0} nieuw, ${s.reactivated ?? 0} heractiveerd, ${s.welcomeEmailsSent ?? 0} welkomstmails.`
      )
      closeImportModal()
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Import mislukt')
    } finally {
      setImportExecuteLoading(false)
    }
  }

  const handleSendInsiderEmail = async (emailType: string) => {
    setSendingEmail(emailType)
    toast.loading(`${emailType} wordt verstuurd...`)

    try {
      const response = await fetch('/api/newsletter/send-insider-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      toast.dismiss()
      toast.success(`${data.sent} emails succesvol verstuurd!`)
    } catch (error: any) {
      console.error('Send email error:', error)
      toast.dismiss()
      toast.error(error.message || 'Kon emails niet versturen')
    } finally {
      setSendingEmail(null)
    }
  }

  const handleSendTestEmail = async (emailType: string) => {
    setSendingTestEmail(emailType)
    toast.loading('Test email wordt verstuurd...')

    try {
      const response = await fetch('/api/newsletter/send-insider-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailType,
          testEmail: 'h.schlimback@gmail.com'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      toast.dismiss()
      toast.success('Test email succesvol verstuurd naar h.schlimback@gmail.com!')
    } catch (error: any) {
      console.error('Send test email error:', error)
      toast.dismiss()
      toast.error(error.message || 'Kon test email niet versturen')
    } finally {
      setSendingTestEmail(null)
    }
  }

  // ---------------------------------------------------------------
  // Spring Drop 2026 campaign actions
  // ---------------------------------------------------------------

  const SPRING_DROP_TEST_EMAIL = 'h.schlimback@gmail.com'

  const refreshSpringDropDryRun = async (mail: 1 | 2 | 3) => {
    try {
      const response = await fetch('/api/admin/campaigns/spring-drop/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail, dryRun: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Dry-run failed')
      setSpringDropDryRun((prev) => ({
        ...prev,
        [mail]: {
          recipients: data.recipients ?? 0,
          promoCodeCoverage: data.promoCodeCoverage ?? null,
        },
      }))
      return data
    } catch (err: any) {
      toast.error(err?.message || 'Dry-run mislukt')
      return null
    }
  }

  const handleSpringDropTest = async (mail: 1 | 2 | 3) => {
    setSendingSpringDropTest(mail)
    toast.loading(`Test mail ${mail} wordt verstuurd...`)
    try {
      const response = await fetch('/api/admin/campaigns/spring-drop/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail, testEmail: SPRING_DROP_TEST_EMAIL }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Test send failed')
      toast.dismiss()
      if (data.failed > 0) {
        toast.error(
          `Test gefaald (${data.failed}). Eerste error: ${data.errors?.[0] || 'unknown'}`
        )
      } else {
        toast.success(`Test mail ${mail} verstuurd naar ${SPRING_DROP_TEST_EMAIL}`)
      }
    } catch (err: any) {
      toast.dismiss()
      toast.error(err?.message || 'Kon test mail niet versturen')
    } finally {
      setSendingSpringDropTest(null)
    }
  }

  const requestSpringDropBlast = async (mail: 1 | 2 | 3) => {
    const dry = await refreshSpringDropDryRun(mail)
    if (!dry) return
    setConfirmSpringDrop({ mail, recipients: dry.recipients ?? 0 })
  }

  const confirmSpringDropBlast = async () => {
    if (!confirmSpringDrop) return
    const { mail } = confirmSpringDrop
    setSendingSpringDrop(mail)
    setConfirmSpringDrop(null)
    toast.loading(`Spring Drop mail ${mail} wordt verstuurd...`)
    try {
      const response = await fetch('/api/admin/campaigns/spring-drop/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Send failed')
      toast.dismiss()
      const msg = `Verstuurd: ${data.sent}/${data.total}${data.failed ? ` (${data.failed} gefaald)` : ''}`
      if (data.failed > 0) toast.error(msg)
      else toast.success(msg)
      // Refresh dry-run so the counter updates after dedup-write
      await refreshSpringDropDryRun(mail)
    } catch (err: any) {
      toast.dismiss()
      toast.error(err?.message || 'Kon Spring Drop niet versturen')
    } finally {
      setSendingSpringDrop(null)
    }
  }

  // Auto-dry-run the three mails when the tab opens, so admin sees how many
  // recipients are still pending per mail.
  useEffect(() => {
    if (activeTab !== 'spring-drop') return
    let cancelled = false
    ;(async () => {
      for (const m of [1, 2, 3] as const) {
        if (cancelled) break
        await refreshSpringDropDryRun(m)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleDeleteSubscriber = async (subscriberId: string, email: string) => {
    if (!confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) {
      return
    }

    setDeletingId(subscriberId)
    toast.loading('Subscriber wordt verwijderd...')

    try {
      const response = await fetch('/api/newsletter/delete-subscriber', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete subscriber')
      }

      // Update local state
      setSubscribers(prev => prev.filter(sub => sub.id !== subscriberId))

      toast.dismiss()
      toast.success('Subscriber verwijderd!')
    } catch (error: any) {
      console.error('Delete subscriber error:', error)
      toast.dismiss()
      toast.error(error.message || 'Kon subscriber niet verwijderen')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`⚠️ WAARSCHUWING: Dit verwijdert ALLE ${subscribers.length} subscribers!\n\nWeet je dit ABSOLUUT ZEKER?`)) {
      return
    }

    // Double confirmation
    if (!confirm('Laatste kans! Dit kan NIET ongedaan gemaakt worden.\n\nAlle subscribers verwijderen?')) {
      return
    }

    setDeletingAll(true)
    toast.loading('Alle subscribers worden verwijderd...')

    try {
      const response = await fetch('/api/newsletter/delete-all', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete all subscribers')
      }

      // Update local state
      setSubscribers([])

      toast.dismiss()
      toast.success(`${data.deleted} subscribers verwijderd!`)
    } catch (error: any) {
      console.error('Delete all subscribers error:', error)
      toast.dismiss()
      toast.error(error.message || 'Kon subscribers niet verwijderen')
    } finally {
      setDeletingAll(false)
    }
  }

  // Load popup settings
  useEffect(() => {
    const loadPopupSettings = async () => {
      try {
        const response = await fetch('/api/newsletter/popup-settings')
        if (!response.ok) throw new Error('Failed to load popup settings')
        
        const data = await response.json()
        setPopupEnabled(data.popup_enabled)
        setPopupTrigger(data.popup_trigger)
        setPopupDelaySeconds(data.popup_delay_seconds)
        setPopupScrollPercentage(data.popup_scroll_percentage)
        setPopupFrequencyDays(data.popup_frequency_days)
        setPopupShowOnPages(data.popup_show_on_pages)
        setPopupDiscountPercentage(data.popup_discount_percentage)
      } catch (error) {
        console.error('Error loading popup settings:', error)
      }
    }

    loadPopupSettings()
  }, [])

  // Save popup settings
  const handleSavePopupSettings = async () => {
    setSavingPopupSettings(true)
    toast.loading('Popup instellingen opslaan...')

    try {
      const response = await fetch('/api/newsletter/save-popup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popup_enabled: popupEnabled,
          popup_trigger: popupTrigger,
          popup_delay_seconds: popupDelaySeconds,
          popup_scroll_percentage: popupScrollPercentage,
          popup_frequency_days: popupFrequencyDays,
          popup_show_on_pages: popupShowOnPages,
          popup_discount_percentage: popupDiscountPercentage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save popup settings')
      }

      toast.dismiss()
      toast.success('Popup instellingen opgeslagen!')
    } catch (error: any) {
      console.error('Save popup settings error:', error)
      toast.dismiss()
      toast.error(error.message || 'Kon popup instellingen niet opslaan')
    } finally {
      setSavingPopupSettings(false)
    }
  }

  // Toggle page selection
  const togglePage = (page: string) => {
    setPopupShowOnPages(prev => 
      prev.includes(page) 
        ? prev.filter(p => p !== page)
        : [...prev, page]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Nieuwsbrief Beheer
          </h1>
          <p className="text-gray-600">Beheer subscribers en verzend insider emails</p>
        </div>
        {activeTab === 'subscribers' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll || subscribers.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Verwijder Alles
            </button>
            <button
              onClick={openImportModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              <Upload className="w-5 h-5" />
              Import CSV / Excel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-black overflow-x-auto">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
            activeTab === 'subscribers'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <Users className="w-5 h-5 inline-block mr-2" />
          Subscribers
        </button>
        <button
          onClick={() => setActiveTab('insider-emails')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
            activeTab === 'insider-emails'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <Mail className="w-5 h-5 inline-block mr-2" />
          Insider Emails
        </button>
        <button
          onClick={() => setActiveTab('spring-drop')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
            activeTab === 'spring-drop'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-5 h-5 inline-block mr-2" />
          Spring Drop
        </button>
        <button
          onClick={() => setActiveTab('popup-settings')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
            activeTab === 'popup-settings'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <Settings className="w-5 h-5 inline-block mr-2" />
          Popup Instellingen
        </button>
      </div>

      {/* Content - Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Total Active */}
            <div className="bg-white border-2 border-black p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-brand-primary" />
                <span className="text-xs md:text-sm uppercase tracking-wider text-gray-600 font-semibold">
                  Actieve Subscribers
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold">
                {initialStats.total.toLocaleString('nl-NL')}
              </div>
            </div>

            {/* This Month */}
            <div className="bg-white border-2 border-black p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                <span className="text-xs md:text-sm uppercase tracking-wider text-gray-600 font-semibold">
                  Deze Maand
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-green-600">
                +{initialStats.thisMonth}
              </div>
            </div>

            {/* Unsubscribed */}
            <div className="bg-white border-2 border-black p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <UserX className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                <span className="text-xs md:text-sm uppercase tracking-wider text-gray-600 font-semibold">
                  Uitgeschreven
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-red-600">
                {initialStats.unsubscribed}
              </div>
            </div>

            {/* Unsub Rate */}
            <div className="bg-white border-2 border-black p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                <span className="text-xs md:text-sm uppercase tracking-wider text-gray-600 font-semibold">
                  Uitschrijf Rate
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold">
                {initialStats.unsubRate}%
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-2 border-black p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek op email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 border-2 border-black bg-white md:w-48 font-semibold"
              >
                <option value="all">Alle statussen</option>
                <option value="active">Actief</option>
                <option value="unsubscribed">Uitgeschreven</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border-2 border-black bg-white md:w-48 font-semibold"
              >
                <option value="newest">Nieuwste eerst</option>
                <option value="oldest">Oudste eerst</option>
                <option value="email">Email A-Z</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600">
            {filteredSubscribers.length} {filteredSubscribers.length === 1 ? 'resultaat' : 'resultaten'}
          </div>

          {/* Subscribers List - Desktop Table */}
          <div className="hidden md:block bg-white border-2 border-black overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Email</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Status</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Bron</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Taal</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Ingeschreven</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Geen subscribers gevonden
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((sub, index) => (
                    <tr 
                      key={sub.id}
                      className={`border-b-2 border-gray-200 hover:bg-gray-50 transition-colors ${
                        index % 2 === 1 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{sub.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            sub.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.status === 'active' ? 'Actief' : 'Uitgeschreven'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{sub.source}</td>
                      <td className="px-4 py-3 text-gray-600 uppercase">{sub.locale || 'nl'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(sub.subscribed_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          disabled={deletingId === sub.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Verwijder subscriber"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subscribers List - Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredSubscribers.length === 0 ? (
              <div className="bg-white border-2 border-black p-8 text-center text-gray-500">
                Geen subscribers gevonden
              </div>
            ) : (
              filteredSubscribers.map((sub) => (
                <div key={sub.id} className="bg-white border-2 border-black p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="font-semibold text-sm break-all pr-2 flex-1">
                      {sub.email}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                        sub.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {sub.status === 'active' ? 'Actief' : 'Uit'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="capitalize">{sub.source}</span>
                    <span>•</span>
                    <span className="uppercase">{sub.locale || 'nl'}</span>
                    <span>•</span>
                    <span>{formatDate(sub.subscribed_at)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                    disabled={deletingId === sub.id}
                    className="mt-3 w-full flex items-center justify-center gap-2 p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Verwijder</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Content - Insider Emails Tab */}
      {activeTab === 'insider-emails' && (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 p-6">
            <h3 className="font-bold text-lg mb-2">Insider Email Sequence</h3>
            <p className="text-sm text-gray-700 mb-4">
              Verzend automatisch gegenereerde emails naar alle actieve nieuwsbrief subscribers die zich hebben ingeschreven via de Early Access pagina. 
              Emails worden verstuurd in de juiste taal (NL/EN) op basis van de subscriber's locale.
            </p>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Aanbevolen timing:</strong> Email 1 (direct), Email 2 (+3 dagen), Email 3 (+7 dagen), Email 4 (-3 dagen voor launch)
              </div>
            </div>
          </div>

          {/* Email Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email 1: Welcome */}
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">Email 1: Welkom</h3>
                  <p className="text-sm text-gray-600">Direct na inschrijving</p>
                </div>
                <button
                  onClick={() => handleOpenPreview('welcome')}
                  className="p-2 hover:bg-gray-100 transition-colors rounded"
                  title="Bekijk email preview"
                >
                  <Eye className="w-5 h-5 text-gray-600 hover:text-brand-primary transition-colors" />
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Welkom bij de insiders + uitleg van wat dat betekent
              </p>
              <button
                onClick={() => handleSendInsiderEmail('welcome')}
                disabled={sendingEmail !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingEmail === 'welcome' ? 'Bezig...' : 'Verstuur Email 1'}
              </button>
              <button
                onClick={() => handleSendTestEmail('welcome')}
                disabled={sendingTestEmail !== null}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
              >
                <Send className="w-4 h-4" />
                {sendingTestEmail === 'welcome' ? 'Bezig...' : 'Verzend test e-mail'}
              </button>
            </div>

            {/* Email 2: Community */}
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">Email 2: Community</h3>
                  <p className="text-sm text-gray-600">+3 dagen na inschrijving</p>
                </div>
                <button
                  onClick={() => handleOpenPreview('community')}
                  className="p-2 hover:bg-gray-100 transition-colors rounded"
                  title="Bekijk email preview"
                >
                  <Eye className="w-5 h-5 text-gray-600 hover:text-brand-primary transition-colors" />
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Community cijfers + testimonials van andere insiders
              </p>
              <button
                onClick={() => handleSendInsiderEmail('community')}
                disabled={sendingEmail !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingEmail === 'community' ? 'Bezig...' : 'Verstuur Email 2'}
              </button>
              <button
                onClick={() => handleSendTestEmail('community')}
                disabled={sendingTestEmail !== null}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
              >
                <Send className="w-4 h-4" />
                {sendingTestEmail === 'community' ? 'Bezig...' : 'Verzend test e-mail'}
              </button>
            </div>

            {/* Email 3: Behind Scenes */}
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">Email 3: Behind the Scenes</h3>
                  <p className="text-sm text-gray-600">+7 dagen na inschrijving</p>
                </div>
                <button
                  onClick={() => handleOpenPreview('behind-scenes')}
                  className="p-2 hover:bg-gray-100 transition-colors rounded"
                  title="Bekijk email preview"
                >
                  <Eye className="w-5 h-5 text-gray-600 hover:text-brand-primary transition-colors" />
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Productie proces + waarom limited edition
              </p>
              <button
                onClick={() => handleSendInsiderEmail('behind-scenes')}
                disabled={sendingEmail !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingEmail === 'behind-scenes' ? 'Bezig...' : 'Verstuur Email 3'}
              </button>
              <button
                onClick={() => handleSendTestEmail('behind-scenes')}
                disabled={sendingTestEmail !== null}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
              >
                <Send className="w-4 h-4" />
                {sendingTestEmail === 'behind-scenes' ? 'Bezig...' : 'Verzend test e-mail'}
              </button>
            </div>

            {/* Email 4: Launch Week */}
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">Email 4: Launch Week</h3>
                  <p className="text-sm text-gray-600">3 dagen voor launch (Feb 27)</p>
                </div>
                <button
                  onClick={() => handleOpenPreview('launch-week')}
                  className="p-2 hover:bg-gray-100 transition-colors rounded"
                  title="Bekijk email preview"
                >
                  <Eye className="w-5 h-5 text-gray-600 hover:text-brand-primary transition-colors" />
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Countdown + reminder vroege toegang + limited stock items
              </p>
              <button
                onClick={() => handleSendInsiderEmail('launch-week')}
                disabled={sendingEmail !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingEmail === 'launch-week' ? 'Bezig...' : 'Verstuur Email 4'}
              </button>
              <button
                onClick={() => handleSendTestEmail('launch-week')}
                disabled={sendingTestEmail !== null}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
              >
                <Send className="w-4 h-4" />
                {sendingTestEmail === 'launch-week' ? 'Bezig...' : 'Verzend test e-mail'}
              </button>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-6">
            <h4 className="font-bold mb-2">⚠️ Let op</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Emails worden verstuurd naar ALLE actieve subscribers uit de "early_access" bron</li>
              <li>Elke email wordt verstuurd in de juiste taal (NL of EN) op basis van subscriber locale</li>
              <li>Test eerst met jezelf of een test account voordat je naar iedereen verstuurt</li>
              <li>Emails kunnen niet worden teruggehaald na verzenden</li>
            </ul>
          </div>
        </div>
      )}

      {/* Content - Spring Drop 2026 Tab */}
      {activeTab === 'spring-drop' && (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-emerald-50 border-2 border-emerald-200 p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-2">Spring Drop 2026 — 3-mail campagne</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Driedelige NL-campagne naar de ~100 actieve abonnees. Werkt met de bestaande
                  lente-sale prijzen, Tee-staffelkorting en persoonlijke <code className="bg-white px-1 border">WELCOME10-XXXXXX</code> codes.
                  Subs zonder persoonlijke code krijgen automatisch <code className="bg-white px-1 border">SPRING10</code>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                  <div className="bg-white border-2 border-black p-3">
                    <div className="font-bold uppercase text-xs tracking-wider mb-1">Mail 1 — DAG 0</div>
                    <div className="text-xs">"Het is lente. Tijd voor je MOSE."</div>
                    <div className="text-xs text-gray-500 mt-1">Aanbevolen: woe 13 mei 09:00</div>
                  </div>
                  <div className="bg-white border-2 border-black p-3">
                    <div className="font-bold uppercase text-xs tracking-wider mb-1">Mail 2 — DAG +4</div>
                    <div className="text-xs">"Een favoriet uit dit shoot: de MOSE Tee."</div>
                    <div className="text-xs text-gray-500 mt-1">Aanbevolen: zo 17 mei 18:00</div>
                  </div>
                  <div className="bg-white border-2 border-black p-3">
                    <div className="font-bold uppercase text-xs tracking-wider mb-1">Mail 3 — DAG +9</div>
                    <div className="text-xs">"Je MOSE-code verloopt binnenkort."</div>
                    <div className="text-xs text-gray-500 mt-1">Aanbevolen: vr 22 mei 11:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mail cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([1, 2, 3] as const).map((mail) => {
              const meta: Record<number, { title: string; preview: string; subject: string; previewSlug: string }> = {
                1: {
                  title: 'Mail 1 — Launch',
                  preview: 'Hero + 2x2 product grid (Tee, Hoodie, Sweater, Watch).',
                  subject: 'Het is lente. Tijd voor je MOSE.',
                  previewSlug: 'spring-drop-1-launch',
                },
                2: {
                  title: 'Mail 2 — Tee',
                  preview: 'Tee-focus + 4 kleuren rij + staffel-blokje (geen code).',
                  subject: 'Een favoriet uit dit shoot: de MOSE Tee.',
                  previewSlug: 'spring-drop-2-tee',
                },
                3: {
                  title: 'Mail 3 — Founders',
                  preview: 'Persoonlijke note van Irma & Rick + WELCOME10-code reminder.',
                  subject: 'Je MOSE-code verloopt binnenkort.',
                  previewSlug: 'spring-drop-3-founders',
                },
              }
              const m = meta[mail]
              const dry = springDropDryRun[mail]
              return (
                <div key={mail} className="bg-white border-2 border-black p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{m.title}</h3>
                      <div className="text-xs text-gray-500 italic mb-2">"{m.subject}"</div>
                    </div>
                    <a
                      href={`/api/email-preview?type=${m.previewSlug}&locale=nl`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-gray-100 transition-colors rounded"
                      title="Open preview in nieuw tabblad"
                    >
                      <Eye className="w-5 h-5 text-gray-600 hover:text-brand-primary transition-colors" />
                    </a>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{m.preview}</p>

                  <div className="bg-gray-50 border border-gray-300 px-3 py-2 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Nog te versturen</span>
                      <span className="font-bold text-base">
                        {dry ? `${dry.recipients}` : '—'}
                      </span>
                    </div>
                    {mail === 3 && dry?.promoCodeCoverage && (
                      <div className="mt-1 text-xs text-gray-500">
                        Persoonlijk: {dry.promoCodeCoverage.personal} ·
                        Fallback ({dry.promoCodeCoverage.fallbackCode}):{' '}
                        {dry.promoCodeCoverage.fallback}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => requestSpringDropBlast(mail)}
                    disabled={
                      sendingSpringDrop !== null ||
                      sendingSpringDropTest !== null ||
                      (dry?.recipients ?? 0) === 0
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {sendingSpringDrop === mail
                      ? 'Bezig...'
                      : `Verstuur naar ${dry?.recipients ?? '...'}`}
                  </button>
                  <button
                    onClick={() => handleSpringDropTest(mail)}
                    disabled={sendingSpringDropTest !== null || sendingSpringDrop !== null}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
                  >
                    <Send className="w-4 h-4" />
                    {sendingSpringDropTest === mail ? 'Bezig...' : 'Verzend test e-mail'}
                  </button>
                  <button
                    onClick={() => refreshSpringDropDryRun(mail)}
                    className="w-full mt-2 text-xs text-gray-500 hover:text-black underline"
                  >
                    Ververs counter
                  </button>
                </div>
              )
            })}
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-6">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-700" />
              Voor je verstuurt
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Doe per mail eerst een test naar <strong>h.schlimback@gmail.com</strong> en check de inbox.</li>
              <li>Dedup gaat via <code>order_emails</code> (template_key + recipient_email). Een tweede klik voor dezelfde mail stuurt nooit dubbel.</li>
              <li>Counter "Nog te versturen" trekt al-verstuurden af. Wordt 0 zodra alles uitgegaan is.</li>
              <li>Mail 3 gebruikt persoonlijke <code>WELCOME10-XXXXXX</code> waar beschikbaar, anders fallback <code>SPRING10</code>.</li>
              <li>Aanbevolen schema: 13 mei (mail 1) → 17 mei (mail 2) → 22 mei (mail 3).</li>
            </ul>
          </div>
        </div>
      )}

      {/* Confirm modal Spring Drop blast */}
      {confirmSpringDrop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black max-w-md w-full p-6">
            <h3 className="text-xl font-bold uppercase mb-3">Spring Drop mail {confirmSpringDrop.mail} versturen?</h3>
            <p className="text-sm text-gray-700 mb-4">
              Je staat op het punt mail {confirmSpringDrop.mail} naar{' '}
              <strong>{confirmSpringDrop.recipients}</strong> abonnee
              {confirmSpringDrop.recipients === 1 ? '' : 's'} te sturen. Dit kan niet ongedaan
              gemaakt worden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSpringDrop(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-black font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors border-2 border-black"
              >
                Annuleer
              </button>
              <button
                onClick={confirmSpringDropBlast}
                className="flex-1 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
              >
                Ja, versturen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV / Excel modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-bold uppercase mb-2">Import subscribers</h3>
            <p className="text-sm text-gray-700 mb-4">
              Ondersteund: <strong>.csv</strong> (komma of puntkomma, UTF-8) en{' '}
              <strong>.xlsx / .xls</strong> (eerste werkblad). Minimaal een e-mailkolom. Tot ca.{' '}
              <strong>60.000</strong> datarijen per bestand (max. ~20 MB). Optioneel kolommen:{' '}
              <code className="text-xs bg-gray-100 px-1">status</code>,{' '}
              <code className="text-xs bg-gray-100 px-1">locale</code>,{' '}
              <code className="text-xs bg-gray-100 px-1">source</code> (alleen toegestane waarden, anders{' '}
              <code className="text-xs bg-gray-100 px-1">admin_import</code>).
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="w-full text-sm border-2 border-black p-2 mb-4"
              onChange={(e) => {
                setImportDryRunResult(null)
                setImportFile(e.target.files?.[0] || null)
              }}
            />

            <label className="flex items-start gap-2 text-sm mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importReactivateUnsub}
                onChange={(e) => {
                  setImportReactivateUnsub(e.target.checked)
                  setImportDryRunResult(null)
                }}
                className="mt-1"
              />
              <span>
                Ook <strong>uitgeschreven</strong> adressen weer actief zetten (alleen gebruiken als je daar
                toestemming voor hebt).
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={importSendWelcome}
                onChange={(e) => {
                  setImportSendWelcome(e.target.checked)
                  setImportDryRunResult(null)
                }}
                className="mt-1"
              />
              <span>
                <strong>Welkomstmail</strong> sturen bij elke nieuwe of geheractiveerde inschrijving (standaard uit).
              </span>
            </label>

            {importDryRunResult ? (
              <div className="border-2 border-black p-4 mb-4 text-sm space-y-1 bg-gray-50">
                <div className="font-bold mb-2">Resultaat controle</div>
                <div>Nieuwe rijen (insert): {importDryRunResult.summary.inserted ?? 0}</div>
                <div>Heractiveren: {importDryRunResult.summary.reactivated ?? 0}</div>
                <div>Al actief (overslaan): {importDryRunResult.summary.skippedActive ?? 0}</div>
                <div>Uitgeschreven (overslaan): {importDryRunResult.summary.skippedUnsubscribed ?? 0}</div>
                <div>Dubbel in bestand: {importDryRunResult.summary.duplicateInFile ?? 0}</div>
                <div>Ongeldige rijen: {importDryRunResult.summary.invalidCount ?? 0}</div>
                {importDryRunResult.invalid?.length ? (
                  <ul className="mt-2 max-h-28 overflow-y-auto text-xs list-disc list-inside text-red-700">
                    {importDryRunResult.invalid.slice(0, 8).map((inv, i) => (
                      <li key={i}>
                        Rij {inv.row}: {inv.reason}
                        {inv.value ? ` (${inv.value})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {importDryRunResult.parseWarnings?.length ? (
                  <p className="text-xs text-amber-800 mt-2">
                    {importDryRunResult.parseWarnings.join(' ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={closeImportModal}
                className="flex-1 px-4 py-3 bg-gray-200 text-black font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-300"
              >
                Sluiten
              </button>
              <button
                type="button"
                disabled={!importFile || importPreviewLoading}
                onClick={handleImportPreview}
                className="flex-1 px-4 py-3 bg-black text-white font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-800 disabled:opacity-50"
              >
                {importPreviewLoading ? 'Bezig...' : 'Controleer'}
              </button>
              <button
                type="button"
                disabled={!importDryRunResult || importExecuteLoading}
                onClick={handleImportExecute}
                className="flex-1 px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider border-2 border-black hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {importExecuteLoading ? 'Importeren...' : 'Import uitvoeren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content - Popup Settings Tab */}
      {activeTab === 'popup-settings' && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Newsletter Popup</h3>
                <p className="text-sm text-gray-600">
                  {popupEnabled ? 'Popup is actief' : 'Popup is uitgeschakeld'}
                </p>
              </div>
              <button
                onClick={() => setPopupEnabled(!popupEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors border-2 border-black ${
                  popupEnabled ? 'bg-brand-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform border-2 border-black ${
                    popupEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trigger Type */}
            <div className="bg-white border-2 border-black p-6">
              <label className="block font-bold mb-2">Trigger Type</label>
              <select
                value={popupTrigger}
                onChange={(e) => setPopupTrigger(e.target.value as any)}
                disabled={!popupEnabled}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
              >
                <option value="exit_intent">Exit Intent (alleen bij verlaten)</option>
                <option value="timer">Timer (na X seconden)</option>
                <option value="hybrid">Hybrid (exit + timer fallback)</option>
                <option value="scroll">Scroll (na X% scroll)</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">
                {popupTrigger === 'exit_intent' && '✅ Beste conversie, 0% bounce'}
                {popupTrigger === 'timer' && '⚠️ Kan irritant zijn, test timing goed'}
                {popupTrigger === 'hybrid' && '🏆 Aanbevolen: beste van beide'}
                {popupTrigger === 'scroll' && '✅ Natuurlijk, engagement-based'}
              </p>
            </div>

            {/* Delay Seconds */}
            <div className="bg-white border-2 border-black p-6">
              <label className="block font-bold mb-2">
                Timer Delay (seconden)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={popupDelaySeconds}
                onChange={(e) => setPopupDelaySeconds(parseInt(e.target.value))}
                disabled={!popupEnabled || (popupTrigger !== 'timer' && popupTrigger !== 'hybrid')}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
              />
              <p className="text-xs text-gray-600 mt-2">
                Aanbevolen: 15-20 sec (niet te snel, niet te langzaam)
              </p>
            </div>

            {/* Scroll Percentage */}
            <div className="bg-white border-2 border-black p-6">
              <label className="block font-bold mb-2">
                Scroll Percentage (%)
              </label>
              <input
                type="number"
                min="10"
                max="90"
                value={popupScrollPercentage}
                onChange={(e) => setPopupScrollPercentage(parseInt(e.target.value))}
                disabled={!popupEnabled || (popupTrigger !== 'scroll' && popupTrigger !== 'hybrid')}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
              />
              <p className="text-xs text-gray-600 mt-2">
                Aanbevolen: 40-60% (gebruiker is engaged)
              </p>
            </div>

            {/* Frequency Days */}
            <div className="bg-white border-2 border-black p-6">
              <label className="block font-bold mb-2">
                Frequentie (dagen)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={popupFrequencyDays}
                onChange={(e) => setPopupFrequencyDays(parseInt(e.target.value))}
                disabled={!popupEnabled}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
              />
              <p className="text-xs text-gray-600 mt-2">
                Hoe vaak mag popup getoond worden per gebruiker? (max 1x per X dagen)
              </p>
            </div>

            {/* Discount Percentage */}
            <div className="bg-white border-2 border-black p-6">
              <label className="block font-bold mb-2">
                Korting Percentage (%)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                step="5"
                value={popupDiscountPercentage}
                onChange={(e) => setPopupDiscountPercentage(parseInt(e.target.value))}
                disabled={!popupEnabled}
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
              />
              <p className="text-xs text-gray-600 mt-2">
                Huidige popup: "{popupDiscountPercentage}% korting op je eerste bestelling"
              </p>
            </div>
          </div>

          {/* Show On Pages */}
          <div className="bg-white border-2 border-black p-6">
            <label className="block font-bold mb-3">
              <Globe className="w-5 h-5 inline-block mr-2" />
              Toon popup op deze pagina's
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['home', 'shop', 'product', 'early-access'].map(page => (
                <button
                  key={page}
                  onClick={() => togglePage(page)}
                  disabled={!popupEnabled}
                  className={`px-4 py-3 font-semibold uppercase text-sm border-2 border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    popupShowOnPages.includes(page)
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {page === 'home' && 'Homepage'}
                  {page === 'shop' && 'Shop'}
                  {page === 'product' && 'Product'}
                  {page === 'early-access' && 'Early Access'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              💡 Tip: Niet tonen op Early Access (is al een nieuwsbrief pagina)
            </p>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 border-2 border-blue-200 p-6">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Popup Preview
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              De popup heeft het volgende design (brutalist MOSE style):
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Zwart logo + groene accent lijn</li>
              <li>"WORDT MOSE INSIDER" headline (uppercase, bold)</li>
              <li>"{popupDiscountPercentage}% korting op je eerste bestelling"</li>
              <li>"+ early access tot nieuwe drops"</li>
              <li>Social proof: "{633}+ insiders gingen je voor"</li>
              <li>Email input veld (centered, border-2 border-black)</li>
              <li>Groene CTA button: "CLAIM {popupDiscountPercentage}% KORTING"</li>
              <li>Humor dismiss link: "Nee, ik betaal €X meer"</li>
            </ul>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePopupSettings}
            disabled={savingPopupSettings}
            className="w-full px-6 py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            {savingPopupSettings ? 'OPSLAAN...' : 'POPUP INSTELLINGEN OPSLAAN'}
          </button>

          {/* Warning */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-6">
            <h4 className="font-bold mb-2">⚠️ Let op</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Changes zijn direct live na opslaan</li>
              <li>Test de popup altijd in incognito mode</li>
              <li>Popup wordt max 1x per {popupFrequencyDays} dagen getoond per gebruiker</li>
              <li>Gebruikers die al ingeschreven zijn zien de popup niet meer</li>
            </ul>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewModalOpen && previewEmailType && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl h-[90vh] flex flex-col border-4 border-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-gray-50">
              <div>
                <h2 className="font-display text-xl uppercase tracking-wide">Email Preview</h2>
                <p className="text-sm text-gray-600">
                  {previewEmailType === 'welcome' && 'Email 1: Welkom'}
                  {previewEmailType === 'community' && 'Email 2: Community'}
                  {previewEmailType === 'behind-scenes' && 'Email 3: Behind the Scenes'}
                  {previewEmailType === 'launch-week' && 'Email 4: Launch Week'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Locale Toggle */}
                <div className="flex gap-1 border-2 border-black">
                  <button
                    onClick={() => setPreviewLocale('nl')}
                    className={`px-3 py-1 text-sm font-bold uppercase transition-colors ${
                      previewLocale === 'nl' 
                        ? 'bg-brand-primary text-black' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    NL
                  </button>
                  <button
                    onClick={() => setPreviewLocale('en')}
                    className={`px-3 py-1 text-sm font-bold uppercase transition-colors ${
                      previewLocale === 'en' 
                        ? 'bg-brand-primary text-black' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    EN
                  </button>
                </div>
                {/* Close Button */}
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 bg-black text-white font-bold uppercase text-sm hover:bg-gray-800 transition-colors"
                >
                  Sluiten
                </button>
              </div>
            </div>

            {/* iFrame Preview */}
            <div className="flex-1 overflow-hidden">
              <iframe
                key={`${previewEmailType}-${previewLocale}`}
                src={`/api/admin/email-preview?type=${previewEmailType}&locale=${previewLocale}`}
                className="w-full h-full border-0"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





