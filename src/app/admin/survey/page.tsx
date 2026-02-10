'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, MessageSquare, TrendingUp, Download, Filter, Calendar, Globe, Monitor, Smartphone } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface SurveyResponse {
  id: string
  session_id: string
  page_url: string | null
  device_type: string | null
  locale: string
  purchase_likelihood: string
  what_needed: string[]
  what_needed_other: string | null
  first_impression: string | null
  created_at: string
}

interface Stats {
  total: number
  likelihoodStats: Record<string, number>
  neededStats: Record<string, number>
  firstImpressions: string[]
}

export default function SurveyAdminPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [likelihoodFilter, setLikelihoodFilter] = useState<string>('all')
  const [pageFilter, setPageFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'responses' | 'settings'>('responses')
  
  // Popup settings state
  const [popupEnabled, setPopupEnabled] = useState(false)
  const [popupTrigger, setPopupTrigger] = useState<'exit_intent' | 'timer' | 'hybrid' | 'scroll'>('hybrid')
  const [popupDelaySeconds, setPopupDelaySeconds] = useState(20)
  const [popupScrollPercentage, setPopupScrollPercentage] = useState(50)
  const [popupFrequencyDays, setPopupFrequencyDays] = useState(7)
  const [popupShowOnPages, setPopupShowOnPages] = useState<string[]>(['home', 'shop', 'product'])
  const [savingPopupSettings, setSavingPopupSettings] = useState(false)

  useEffect(() => {
    fetchResponses()
    fetchStats()
    fetchPopupSettings()
  }, [likelihoodFilter, pageFilter])

  const fetchPopupSettings = async () => {
    try {
      const response = await fetch('/api/survey/popup-settings')
      if (!response.ok) return
      
      const data = await response.json()
      setPopupEnabled(data.popup_enabled)
      setPopupTrigger(data.popup_trigger)
      setPopupDelaySeconds(data.popup_delay_seconds)
      setPopupScrollPercentage(data.popup_scroll_percentage)
      setPopupFrequencyDays(data.popup_frequency_days)
      setPopupShowOnPages(data.popup_show_on_pages)
    } catch (error) {
      console.error('Error fetching popup settings:', error)
    }
  }

  const handleSavePopupSettings = async () => {
    setSavingPopupSettings(true)
    try {
      const response = await fetch('/api/survey/save-popup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popup_enabled: popupEnabled,
          popup_trigger: popupTrigger,
          popup_delay_seconds: popupDelaySeconds,
          popup_scroll_percentage: popupScrollPercentage,
          popup_frequency_days: popupFrequencyDays,
          popup_show_on_pages: popupShowOnPages,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Settings opgeslagen!')
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Error saving popup settings:', error)
      toast.error('Fout bij opslaan settings')
    } finally {
      setSavingPopupSettings(false)
    }
  }

  const fetchResponses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (likelihoodFilter !== 'all') params.append('likelihood', likelihoodFilter)
      if (pageFilter !== 'all') params.append('page', pageFilter)
      
      const response = await fetch(`/api/admin/survey/responses?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch responses')
      
      const data = await response.json()
      setResponses(data.responses || [])
    } catch (error) {
      console.error('Error fetching responses:', error)
      toast.error('Fout bij ophalen responses')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/survey/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const filteredResponses = useMemo(() => {
    return responses
  }, [responses])

  const handleExport = async () => {
    setExporting(true)
    toast.loading('CSV wordt gegenereerd...')

    try {
      const csv = [
        ['Datum', 'Pagina', 'Device', 'Taal', 'Kans op kopen', 'Wat nodig', 'Anders, namelijk', 'Eerste indruk'].join(','),
        ...filteredResponses.map((r) => [
          new Date(r.created_at).toLocaleString('nl-NL'),
          r.page_url || '',
          r.device_type || '',
          r.locale.toUpperCase(),
          r.purchase_likelihood,
          r.what_needed.join('; '),
          (r.what_needed_other || '').replace(/"/g, '""'),
          (r.first_impression || '').replace(/"/g, '""'),
        ].map((cell) => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `survey-responses-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      
      toast.success('CSV gedownload!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Fout bij exporteren')
    } finally {
      setExporting(false)
    }
  }

  const getLikelihoodLabel = (value: string) => {
    const labels: Record<string, string> = {
      probably_yes: 'Waarschijnlijk wel',
      not_sure: 'Weet ik nog niet',
      probably_not: 'Waarschijnlijk niet',
    }
    return labels[value] || value
  }

  const getNeededLabel = (value: string) => {
    const labels: Record<string, string> = {
      free_shipping: 'Gratis verzending',
      discount: 'Korting',
      more_reviews: 'Meer reviews',
      better_size_guide: 'Betere maattabel',
      more_photos: 'Meer foto\'s',
      videos: 'Video\'s',
      other: 'Andere',
    }
    return labels[value] || value
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Survey responses laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 transition-colors border-2 border-gray-300"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
                  <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
                  Survey Responses
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-1">Bekijk alle enquête antwoorden</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || filteredResponses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white border-2 border-black hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase text-sm"
            >
              <Download size={16} />
              {exporting ? 'Exporteren...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b-2 border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                activeTab === 'responses'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              Responses
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-1">Survey Popup</h3>
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
                <label className="block font-bold mb-2">Timer Delay (seconden)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={popupDelaySeconds}
                  onChange={(e) => setPopupDelaySeconds(parseInt(e.target.value))}
                  disabled={!popupEnabled || (popupTrigger !== 'timer' && popupTrigger !== 'hybrid')}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
                />
                <p className="text-xs text-gray-600 mt-2">Aanbevolen: 15-20 sec</p>
              </div>

              {/* Scroll Percentage */}
              <div className="bg-white border-2 border-black p-6">
                <label className="block font-bold mb-2">Scroll Percentage (%)</label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={popupScrollPercentage}
                  onChange={(e) => setPopupScrollPercentage(parseInt(e.target.value))}
                  disabled={!popupEnabled || (popupTrigger !== 'scroll' && popupTrigger !== 'hybrid')}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
                />
                <p className="text-xs text-gray-600 mt-2">Aanbevolen: 40-60%</p>
              </div>

              {/* Frequency Days */}
              <div className="bg-white border-2 border-black p-6">
                <label className="block font-bold mb-2">Frequentie (dagen)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={popupFrequencyDays}
                  onChange={(e) => setPopupFrequencyDays(parseInt(e.target.value))}
                  disabled={!popupEnabled}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
                />
                <p className="text-xs text-gray-600 mt-2">Hoe vaak de popup per gebruiker mag verschijnen</p>
              </div>

              {/* Show On Pages */}
              <div className="bg-white border-2 border-black p-6 md:col-span-2">
                <label className="block font-bold mb-2">Toon op pagina's</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['home', 'shop', 'product'].map((page) => (
                    <label key={page} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupShowOnPages.includes(page)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPopupShowOnPages([...popupShowOnPages, page])
                          } else {
                            setPopupShowOnPages(popupShowOnPages.filter(p => p !== page))
                          }
                        }}
                        disabled={!popupEnabled}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">
                        {page === 'home' ? 'Home' : page === 'shop' ? 'Shop' : 'Product'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSavePopupSettings}
                disabled={savingPopupSettings}
                className="px-6 py-3 bg-brand-primary text-white border-4 border-black hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase"
              >
                {savingPopupSettings ? 'Opslaan...' : 'Settings Opslaan'}
              </button>
            </div>
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === 'responses' && (
          <>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border-2 border-gray-200 p-6">
              <div className="text-sm text-gray-600 font-semibold mb-1">Totaal Responses</div>
              <div className="text-3xl font-bold text-brand-primary">{stats.total}</div>
            </div>
            <div className="bg-white border-2 border-gray-200 p-6">
              <div className="text-sm text-gray-600 font-semibold mb-1">Waarschijnlijk wel</div>
              <div className="text-3xl font-bold text-green-600">{stats.likelihoodStats.probably_yes || 0}</div>
            </div>
            <div className="bg-white border-2 border-gray-200 p-6">
              <div className="text-sm text-gray-600 font-semibold mb-1">Weet ik nog niet</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.likelihoodStats.not_sure || 0}</div>
            </div>
            <div className="bg-white border-2 border-gray-200 p-6">
              <div className="text-sm text-gray-600 font-semibold mb-1">Waarschijnlijk niet</div>
              <div className="text-3xl font-bold text-red-600">{stats.likelihoodStats.probably_not || 0}</div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Purchase Likelihood Chart */}
          {stats && (
            <div className="bg-white border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
                Kans op kopen
              </h2>
              <div className="space-y-3">
                {Object.entries(stats.likelihoodStats).map(([key, count]) => {
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{getLikelihoodLabel(key)}</span>
                        <span className="text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 border-2 border-black h-6">
                        <div
                          className="bg-brand-primary h-full border-r-2 border-black"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* What Needed Chart */}
          {stats && (
            <div className="bg-white border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
                Wat nodig om te kopen
              </h2>
              <div className="space-y-3">
                {Object.entries(stats.neededStats)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 7)
                  .map(([key, count]) => {
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{getNeededLabel(key)}</span>
                          <span className="text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 border-2 border-black h-6">
                          <div
                            className="bg-brand-primary h-full border-r-2 border-black"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border-2 border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="font-bold text-sm">Filters:</span>
            </div>
            <select
              value={likelihoodFilter}
              onChange={(e) => setLikelihoodFilter(e.target.value)}
              className="px-3 py-2 border-2 border-black focus:outline-none focus:border-brand-primary font-semibold text-sm"
            >
              <option value="all">Alle kansen</option>
              <option value="probably_yes">Waarschijnlijk wel</option>
              <option value="not_sure">Weet ik nog niet</option>
              <option value="probably_not">Waarschijnlijk niet</option>
            </select>
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="px-3 py-2 border-2 border-black focus:outline-none focus:border-brand-primary font-semibold text-sm"
            >
              <option value="all">Alle pagina's</option>
              <option value="home">Home</option>
              <option value="shop">Shop</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        {/* Responses Table */}
        <div className="bg-white border-2 border-gray-200">
          <div className="p-4 border-b-2 border-gray-200">
            <h2 className="text-lg font-bold">Alle Responses ({filteredResponses.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Pagina</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Kans op kopen</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Wat nodig</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Anders, namelijk</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Eerste indruk</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.length > 0 ? (
                  filteredResponses.map((response) => (
                    <tr key={response.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(response.created_at).toLocaleString('nl-NL')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a
                          href={response.page_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:underline truncate max-w-xs block"
                        >
                          {response.page_url || '-'}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          {response.device_type === 'mobile' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                          {response.device_type || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {getLikelihoodLabel(response.purchase_likelihood)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {response.what_needed.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs"
                            >
                              {getNeededLabel(item)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        {response.what_needed_other || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        {response.first_impression || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Geen responses gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* First Impressions */}
        {stats && stats.firstImpressions.length > 0 && (
          <div className="mt-8 bg-white border-2 border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Eerste Indrukken</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.firstImpressions.map((impression, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border-2 border-gray-200">
                  <p className="text-sm">{impression}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

