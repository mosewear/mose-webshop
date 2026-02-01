'use client'

import { useState, useMemo } from 'react'
import { Users, TrendingUp, UserX, Download, Search, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subscriber {
  id: string
  email: string
  status: 'active' | 'unsubscribed'
  source: string
  subscribed_at: string
  unsubscribed_at: string | null
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
  const [subscribers] = useState<Subscriber[]>(initialSubscribers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'email'>('newest')
  const [exporting, setExporting] = useState(false)

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
            Nieuwsbrief Subscribers
          </h1>
          <p className="text-gray-600">Beheer je email subscribers en export data</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

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
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-sm">Ingeschreven</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
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
                  <td className="px-4 py-3 text-gray-600">{formatDate(sub.subscribed_at)}</td>
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
                <span>{formatDate(sub.subscribed_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



