'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Search, Filter, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface EmailLog {
  id: string
  order_id: string
  email_type: string
  recipient_email: string
  subject: string
  sent_at: string
  status: 'sent' | 'failed'
  error_message: string | null
  metadata: any
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('order_emails')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100)

      const { data, error } = await query

      if (error) throw error
      setEmails(data || [])
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.order_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus
    const matchesType = filterType === 'all' || email.email_type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const emailTypes = Array.from(new Set(emails.map(e => e.email_type)))

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={18} className="text-green-600" />
      case 'failed':
        return <XCircle size={18} className="text-red-600" />
      default:
        return <AlertCircle size={18} className="text-gray-400" />
    }
  }

  const getEmailTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'confirmation': 'Bevestiging',
      'processing': 'In Behandeling',
      'shipped': 'Verzonden',
      'delivered': 'Bezorgd',
      'cancelled': 'Geannuleerd',
    }
    return labels[type] || type
  }

  const getEmailTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'confirmation': 'bg-green-100 text-green-800 border-green-200',
      'processing': 'bg-purple-100 text-purple-800 border-purple-200',
      'shipped': 'bg-orange-100 text-orange-800 border-orange-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
          <Mail size={32} />
          Email Log
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Alle verzonden emails van MOSE - {emails.length} totaal
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1 md:mb-2">
            {emails.length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Totaal
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1 md:mb-2">
            {emails.filter(e => e.status === 'sent').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Verzonden
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1 md:mb-2">
            {emails.filter(e => e.status === 'failed').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Mislukt
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">
            {emailTypes.length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Types
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              <Search size={14} className="inline mr-1" />
              Zoeken
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Email, order ID, onderwerp..."
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              <Filter size={14} className="inline mr-1" />
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
            >
              <option value="all">Alle statussen</option>
              <option value="sent">Verzonden</option>
              <option value="failed">Mislukt</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              <Mail size={14} className="inline mr-1" />
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
            >
              <option value="all">Alle types</option>
              {emailTypes.map(type => (
                <option key={type} value={type}>
                  {getEmailTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="bg-white border-2 border-gray-200">
        {filteredEmails.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Mail size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              Geen emails gevonden
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Probeer je filters aan te passen'
                : 'Er zijn nog geen emails verzonden'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Ontvanger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Onderwerp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Order
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(email.status)}
                          <span className="text-sm font-semibold capitalize">
                            {email.status === 'sent' ? 'Verzonden' : 'Mislukt'}
                          </span>
                        </div>
                        {email.error_message && (
                          <div className="text-xs text-red-600 mt-1">
                            {email.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold border ${getEmailTypeColor(email.email_type)}`}>
                          {getEmailTypeLabel(email.email_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-mono">
                          {email.recipient_email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {email.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(email.sent_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(email.sent_at).toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${email.order_id}`}
                          className="text-brand-primary hover:text-brand-primary-hover font-mono text-sm font-semibold"
                        >
                          #{email.order_id.slice(0, 8)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredEmails.map((email) => (
                <div key={email.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      <span className={`px-2 py-1 text-xs font-semibold border ${getEmailTypeColor(email.email_type)}`}>
                        {getEmailTypeLabel(email.email_type)}
                      </span>
                    </div>
                    <Link
                      href={`/admin/orders/${email.order_id}`}
                      className="text-brand-primary hover:text-brand-primary-hover font-mono text-xs font-semibold"
                    >
                      #{email.order_id.slice(0, 8)}
                    </Link>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-mono text-gray-900">
                      {email.recipient_email}
                    </div>
                    <div className="text-sm text-gray-700">
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Calendar size={12} />
                      {new Date(email.sent_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {email.error_message && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 border border-red-200 mt-2">
                        {email.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-6 bg-blue-50 border-2 border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Email Logging</p>
        <p className="text-blue-700">
          Deze pagina toont de laatste 100 verzonden emails. Alle emails worden verzonden vanaf{' '}
          <span className="font-mono font-bold">bestellingen@orders.mosewear.nl</span>
        </p>
      </div>
    </div>
  )
}

