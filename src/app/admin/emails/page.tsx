'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Search, Filter, Calendar, CheckCircle, XCircle, AlertCircle, FileText, Eye, Code } from 'lucide-react'
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

interface EmailTemplate {
  id: string
  name: string
  type: string
  description: string
  icon: string
  color: string
  subject: string
}

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates'>('logs')
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  
  const emailTemplates: EmailTemplate[] = [
    // ORDER EMAILS
    {
      id: 'confirmation',
      name: 'Bestelling Bevestiging',
      type: 'confirmation',
      description: 'Verzonden direct na succesvolle betaling. Bevat orderoverzicht, producten met afbeeldingen, verzendadres en BTW berekening.',
      icon: '✓',
      color: 'bg-green-100 text-green-800 border-green-200',
      subject: 'Bestelling bevestiging #ORDER_ID - MOSE'
    },
    {
      id: 'preorder',
      name: 'Pre-order Bevestiging',
      type: 'preorder',
      description: 'Speciale bevestiging voor presale orders. Bevat verwachte leveringsdatum, reserveringsstatus en presale timeline.',
      icon: '📅',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      subject: 'Pre-order bevestiging #ORDER_ID - MOSE'
    },
    {
      id: 'processing',
      name: 'Order In Behandeling',
      type: 'processing',
      description: 'Stuurt een update dat de order wordt voorbereid voor verzending. Bevat verwachte verwerkingstijd.',
      icon: '⚙️',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      subject: 'Je bestelling wordt voorbereid #ORDER_ID - MOSE'
    },
    {
      id: 'shipped',
      name: 'Order Verzonden',
      type: 'shipped',
      description: 'Verzonden wanneer order is verzonden. Bevat tracking code, tracking URL, vervoerder en geschatte leveringsdatum.',
      icon: '📦',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      subject: 'Je bestelling is verzonden #ORDER_ID - MOSE'
    },
    {
      id: 'delivered',
      name: 'Order Bezorgd',
      type: 'delivered',
      description: 'Verzonden wanneer pakket is afgeleverd. Bevat call-to-action voor feedback en link naar shop.',
      icon: '🎉',
      color: 'bg-green-100 text-green-800 border-green-200',
      subject: 'Je pakket is bezorgd #ORDER_ID - MOSE'
    },
    {
      id: 'cancelled',
      name: 'Order Geannuleerd',
      type: 'cancelled',
      description: 'Verzonden bij annulering. Bevat terugbetalingsinformatie en link naar shop.',
      icon: '✕',
      color: 'bg-red-100 text-red-800 border-red-200',
      subject: 'Je bestelling is geannuleerd #ORDER_ID - MOSE'
    },
    // RETURN EMAILS
    {
      id: 'return_requested',
      name: 'Retour Aangevraagd',
      type: 'return_requested',
      description: 'Verzonden wanneer klant retour aanvraagt. Bevat retournummer en lijst van te retourneren items.',
      icon: '↩️',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      subject: 'Retour aangevraagd #RETURN_ID - MOSE'
    },
    {
      id: 'return_label',
      name: 'Retourlabel Klaar',
      type: 'return_label',
      description: 'Verzonden met retourlabel download link. Bevat instructies voor retourzending.',
      icon: '🏷️',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      subject: 'Je retourlabel is klaar #RETURN_ID - MOSE'
    },
    {
      id: 'return_approved',
      name: 'Retour Goedgekeurd',
      type: 'return_approved',
      description: 'Verzonden wanneer retour is goedgekeurd. Bevat terugbetaling bedrag en verwachte verwerkingstijd.',
      icon: '✓',
      color: 'bg-green-100 text-green-800 border-green-200',
      subject: 'Je retour is goedgekeurd #RETURN_ID - MOSE'
    },
    {
      id: 'return_refunded',
      name: 'Retour Terugbetaald',
      type: 'return_refunded',
      description: 'Verzonden wanneer terugbetaling is verwerkt. Bevat terugbetaald bedrag en betaalmethode.',
      icon: '💰',
      color: 'bg-green-100 text-green-800 border-green-200',
      subject: 'Je terugbetaling is verwerkt #RETURN_ID - MOSE'
    },
    {
      id: 'return_rejected',
      name: 'Retour Afgewezen',
      type: 'return_rejected',
      description: 'Verzonden wanneer retour wordt afgewezen. Bevat reden en contactinformatie.',
      icon: '⛔',
      color: 'bg-red-100 text-red-800 border-red-200',
      subject: 'Je retour kan niet verwerkt worden #RETURN_ID - MOSE'
    },
    // MARKETING EMAILS
    {
      id: 'abandoned_cart',
      name: 'Verlaten Winkelwagen',
      type: 'abandoned_cart',
      description: 'Verzonden automatisch wanneer klant checkout heeft gestart maar niet heeft afgerond. Bevat cart items en gratis verzending info.',
      icon: '🛒',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      subject: 'Je hebt iets in je winkelwagen laten staan'
    },
    {
      id: 'newsletter_welcome',
      name: 'Nieuwsbrief Welkom',
      type: 'newsletter_welcome',
      description: 'Verzonden bij nieuwsbrief aanmelding. Bevat welkomstbericht en wat te verwachten.',
      icon: '📧',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      subject: 'Welkom bij de MOSE nieuwsbrief!'
    },
    {
      id: 'back_in_stock',
      name: 'Weer Op Voorraad',
      type: 'back_in_stock',
      description: 'Verzonden wanneer uitverkocht product weer beschikbaar is. Bevat product afbeelding en directe link.',
      icon: '🔔',
      color: 'bg-green-100 text-green-800 border-green-200',
      subject: 'Goed nieuws! {PRODUCT} is weer op voorraad'
    },
    // SUPPORT EMAIL
    {
      id: 'contact_form',
      name: 'Contactformulier',
      type: 'contact_form',
      description: 'Admin email bij contactformulier inzending. Bevat klant naam, email, onderwerp en bericht.',
      icon: '💬',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      subject: 'Nieuw contactformulier bericht van {NAME}'
    },
  ]

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
      'preorder': 'Pre-order',
      'processing': 'In Behandeling',
      'shipped': 'Verzonden',
      'delivered': 'Bezorgd',
      'cancelled': 'Geannuleerd',
      'return_requested': 'Retour Aangevraagd',
      'return_label': 'Retourlabel',
      'return_approved': 'Retour Goedgekeurd',
      'return_refunded': 'Retour Terugbetaald',
      'return_rejected': 'Retour Afgewezen',
      'abandoned_cart': 'Verlaten Wagen',
      'newsletter_welcome': 'Nieuwsbrief',
      'back_in_stock': 'Weer Op Voorraad',
      'contact_form': 'Contactformulier',
    }
    return labels[type] || type
  }

  const getEmailTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'confirmation': 'bg-green-100 text-green-800 border-green-200',
      'preorder': 'bg-blue-100 text-blue-800 border-blue-200',
      'processing': 'bg-purple-100 text-purple-800 border-purple-200',
      'shipped': 'bg-orange-100 text-orange-800 border-orange-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'return_requested': 'bg-orange-100 text-orange-800 border-orange-200',
      'return_label': 'bg-orange-100 text-orange-800 border-orange-200',
      'return_approved': 'bg-green-100 text-green-800 border-green-200',
      'return_refunded': 'bg-green-100 text-green-800 border-green-200',
      'return_rejected': 'bg-red-100 text-red-800 border-red-200',
      'abandoned_cart': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'newsletter_welcome': 'bg-blue-100 text-blue-800 border-blue-200',
      'back_in_stock': 'bg-green-100 text-green-800 border-green-200',
      'contact_form': 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getTemplateLine = (type: string) => {
    const lines: { [key: string]: number } = {
      'confirmation': 76,
      'processing': 181,
      'shipped': 247,
      'delivered': 367,
      'cancelled': 484,
    }
    return lines[type] || 1
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
          Email Management
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Bekijk verzonden emails en email templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors relative ${
            activeTab === 'logs'
              ? 'text-brand-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail size={18} className="inline mr-2" />
          Email Log
          {activeTab === 'logs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors relative ${
            activeTab === 'templates'
              ? 'text-brand-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={18} className="inline mr-2" />
          Templates
          {activeTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
      </div>

      {/* Email Logs Tab */}
      {activeTab === 'logs' && (
        <div>
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
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 border-2 border-gray-200">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {emailTemplates.length}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Email Templates
              </div>
            </div>
            <div className="bg-white p-6 border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-800 mb-2">
                6
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Order Lifecycle
              </div>
            </div>
            <div className="bg-white p-6 border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-800 mb-2">
                5
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Return Lifecycle
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {emailTemplates.map((template) => (
              <div key={template.id} className="bg-white border-2 border-gray-200 p-6 hover:border-brand-primary transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{template.icon}</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold border mt-1 ${template.color}`}>
                        {getEmailTypeLabel(template.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {template.description}
                </p>

                <div className="bg-gray-50 p-3 border-l-3 border-brand-primary mb-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Subject Line:</div>
                  <div className="text-sm font-mono text-gray-900">{template.subject}</div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/api/email-preview?type=${template.type}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                  >
                    <Eye size={16} />
                    Preview
                  </a>
                  <a
                    href={`https://github.com/mosewear/mose-webshop/blob/main/src/lib/email.ts#L${getTemplateLine(template.type)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors"
                  >
                    <Code size={16} />
                    Code
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Template Features */}
          <div className="mt-8 bg-white border-2 border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-4 uppercase tracking-wide">Email Template Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Consistent Branding</div>
                  <div className="text-sm text-gray-600">MOSE logo, kleuren (#2ECC71) en typography</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Responsive Design</div>
                  <div className="text-sm text-gray-600">Perfect op desktop, mobile en tablets</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Product Images</div>
                  <div className="text-sm text-gray-600">Absolute URLs naar product afbeeldingen</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Contact Details</div>
                  <div className="text-sm text-gray-600">Helper Brink 27a, +31 50 211 1931</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Clear CTAs</div>
                  <div className="text-sm text-gray-600">Track order, shop, write review buttons</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <div>
                  <div className="font-bold text-sm">Sender Domain</div>
                  <div className="text-sm text-gray-600">bestellingen@orders.mosewear.nl</div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Location */}
          <div className="mt-6 bg-gray-900 text-gray-300 p-6 border-2 border-gray-700 font-mono text-sm">
            <div className="text-gray-400 mb-2">📁 Template Bestanden:</div>
            <div className="space-y-1">
              <div className="text-green-400">└─ src/emails/</div>
              <div className="ml-4 text-gray-500">├─ OrderConfirmation.tsx</div>
              <div className="ml-4 text-gray-500">├─ PreorderConfirmation.tsx</div>
              <div className="ml-4 text-gray-500">├─ OrderProcessing.tsx</div>
              <div className="ml-4 text-gray-500">├─ ShippingConfirmation.tsx</div>
              <div className="ml-4 text-gray-500">├─ OrderDelivered.tsx</div>
              <div className="ml-4 text-gray-500">├─ OrderCancelled.tsx</div>
              <div className="ml-4 text-gray-500">├─ ReturnRequested.tsx</div>
              <div className="ml-4 text-gray-500">├─ ReturnLabelGenerated.tsx</div>
              <div className="ml-4 text-gray-500">├─ ReturnApproved.tsx</div>
              <div className="ml-4 text-gray-500">├─ ReturnRefunded.tsx</div>
              <div className="ml-4 text-gray-500">├─ ReturnRejected.tsx</div>
              <div className="ml-4 text-gray-500">├─ AbandonedCart.tsx</div>
              <div className="ml-4 text-gray-500">├─ NewsletterWelcome.tsx</div>
              <div className="ml-4 text-gray-500">├─ BackInStock.tsx</div>
              <div className="ml-4 text-gray-500">└─ ContactForm.tsx</div>
              <div className="text-green-400 mt-3">└─ src/lib/email.ts</div>
              <div className="ml-4 text-gray-500">Email sending functies</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

