'use client'

import { useState, useMemo, useEffect } from 'react'
import { Users, TrendingUp, UserX, Download, Search, Mail, Send, Calendar, Eye, Trash2, Settings, Globe } from 'lucide-react'
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
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'email'>('newest')
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'subscribers' | 'insider-emails' | 'popup-settings'>('subscribers')
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

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





