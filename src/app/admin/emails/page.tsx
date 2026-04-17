'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle,
  Code,
  Eye,
  FileText,
  Filter,
  Mail,
  Search,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  EMAIL_TEMPLATES,
  getCategoryLabel,
  getTemplateByKey,
  type EmailTemplateCategory,
  type EmailTemplateDefinition,
} from '@/lib/email-catalog'

interface EmailLog {
  id: string
  order_id: string | null
  email_type: string | null
  template_key: string | null
  recipient_email: string
  subject: string
  sent_at: string
  status: 'sent' | 'failed'
  error_message: string | null
  resend_id: string | null
  locale: string | null
  metadata: any
}

const CATEGORY_ORDER: EmailTemplateCategory[] = [
  'order',
  'return',
  'marketing',
  'insider',
  'loyalty',
  'admin',
]

const CATEGORY_ACCENTS: Record<EmailTemplateCategory, string> = {
  order: 'bg-green-100 text-green-800 border-green-200',
  return: 'bg-orange-100 text-orange-800 border-orange-200',
  marketing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  insider: 'bg-purple-100 text-purple-800 border-purple-200',
  loyalty: 'bg-pink-100 text-pink-800 border-pink-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
}

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates'>('logs')
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all')
  const [filterTemplate, setFilterTemplate] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    let ignore = false

    const fetchEmails = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('order_emails')
          .select(
            'id, order_id, email_type, template_key, recipient_email, subject, sent_at, status, error_message, resend_id, locale, metadata'
          )
          .order('sent_at', { ascending: false })
          .limit(200)

        if (!ignore) {
          if (error) throw error
          setEmails((data as EmailLog[]) || [])
        }
      } catch (err) {
        console.error('Error fetching emails:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchEmails()
    return () => {
      ignore = true
    }
  }, [])

  const usageByTemplate = useMemo(() => {
    const map: Record<string, { sent: number; failed: number; last?: string }> = {}
    for (const email of emails) {
      const key = email.template_key || email.email_type || 'unknown'
      if (!map[key]) map[key] = { sent: 0, failed: 0 }
      if (email.status === 'sent') map[key].sent += 1
      else map[key].failed += 1
      if (!map[key].last || email.sent_at > map[key].last!) {
        map[key].last = email.sent_at
      }
    }
    return map
  }, [emails])

  const filteredEmails = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return emails.filter((email) => {
      const templateKey = email.template_key || email.email_type || ''
      const matchesSearch =
        !q ||
        email.recipient_email.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        (email.order_id || '').toLowerCase().includes(q) ||
        templateKey.toLowerCase().includes(q)
      const matchesStatus = filterStatus === 'all' || email.status === filterStatus
      const matchesTemplate = filterTemplate === 'all' || templateKey === filterTemplate
      return matchesSearch && matchesStatus && matchesTemplate
    })
  }, [emails, searchTerm, filterStatus, filterTemplate])

  const templatesInLogs = useMemo(() => {
    const keys = new Set<string>()
    for (const email of emails) {
      const key = email.template_key || email.email_type
      if (key) keys.add(key)
    }
    return Array.from(keys)
  }, [emails])

  const groupedTemplates = useMemo(() => {
    const grouped: Record<EmailTemplateCategory, EmailTemplateDefinition[]> = {
      order: [],
      return: [],
      marketing: [],
      insider: [],
      loyalty: [],
      admin: [],
    }
    for (const tpl of EMAIL_TEMPLATES) {
      grouped[tpl.category].push(tpl)
    }
    return grouped
  }, [])

  const totalSent = emails.filter((e) => e.status === 'sent').length
  const totalFailed = emails.filter((e) => e.status === 'failed').length

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={18} className="text-green-600" />
      case 'failed':
        return <XCircle size={18} className="text-red-600" />
      default:
        return <AlertCircle size={18} className="text-gray-400" />
    }
  }

  const renderTemplateBadge = (key: string) => {
    const template = getTemplateByKey(key)
    if (template) {
      return (
        <span
          className={`px-2 py-1 text-xs font-semibold border ${CATEGORY_ACCENTS[template.category]}`}
        >
          {template.name}
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold border bg-gray-100 text-gray-800 border-gray-200">
        {key}
      </span>
    )
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
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
          <Mail size={32} />
          Email Management
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Bekijk verzonden emails en beheer alle email templates op één plek
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors relative ${
            activeTab === 'logs' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-700'
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
          <span className="ml-2 text-[10px] tracking-wide bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5">
            {EMAIL_TEMPLATES.length}
          </span>
          {activeTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
      </div>

      {activeTab === 'logs' && (
        <div>
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
                {totalSent}
              </div>
              <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
                Verzonden
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
              <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1 md:mb-2">
                {totalFailed}
              </div>
              <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
                Mislukt
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
              <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">
                {templatesInLogs.length}
              </div>
              <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
                Gebruikte templates
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 md:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  <Search size={14} className="inline mr-1" />
                  Zoeken
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Email, order ID, onderwerp of template..."
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                />
              </div>
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
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  <Mail size={14} className="inline mr-1" />
                  Template
                </label>
                <select
                  value={filterTemplate}
                  onChange={(e) => setFilterTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                >
                  <option value="all">Alle templates</option>
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <option key={tpl.key} value={tpl.key}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">Geen emails gevonden</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all' || filterTemplate !== 'all'
                    ? 'Probeer je filters aan te passen'
                    : 'Er zijn nog geen emails verzonden'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y-2 divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Template
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
                      {filteredEmails.map((email) => {
                        const key = email.template_key || email.email_type || 'unknown'
                        return (
                          <tr key={email.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {renderStatusIcon(email.status)}
                                <span className="text-sm font-semibold capitalize">
                                  {email.status === 'sent' ? 'Verzonden' : 'Mislukt'}
                                </span>
                              </div>
                              {email.error_message && (
                                <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                                  {email.error_message}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderTemplateBadge(key)}
                              {email.locale && (
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">
                                  {email.locale}
                                </div>
                              )}
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
                              {email.order_id ? (
                                <Link
                                  href={`/admin/orders/${email.order_id}`}
                                  className="text-brand-primary hover:text-brand-primary-hover font-mono text-sm font-semibold"
                                >
                                  #{email.order_id.slice(0, 8)}
                                </Link>
                              ) : (
                                <span className="text-gray-400 text-xs italic">–</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {filteredEmails.map((email) => {
                    const key = email.template_key || email.email_type || 'unknown'
                    return (
                      <div key={email.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {renderStatusIcon(email.status)}
                            {renderTemplateBadge(key)}
                          </div>
                          {email.order_id && (
                            <Link
                              href={`/admin/orders/${email.order_id}`}
                              className="text-brand-primary hover:text-brand-primary-hover font-mono text-xs font-semibold"
                            >
                              #{email.order_id.slice(0, 8)}
                            </Link>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-mono text-gray-900">
                            {email.recipient_email}
                          </div>
                          <div className="text-sm text-gray-700">{email.subject}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Calendar size={12} />
                            {new Date(email.sent_at).toLocaleString('nl-NL', {
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
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border-2 border-blue-200 p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Email Logging</p>
            <p className="text-blue-700">
              Elke email die MOSE verstuurt — order, retour, marketing, insider en admin —
              wordt automatisch opgeslagen in deze log. De laatste 200 verzendingen zijn
              zichtbaar.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
              <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1 md:mb-2">
                {EMAIL_TEMPLATES.length}
              </div>
              <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
                Templates
              </div>
            </div>
            {CATEGORY_ORDER.map((category) => (
              <div
                key={category}
                className="bg-white p-4 md:p-6 border-2 border-gray-200"
              >
                <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">
                  {groupedTemplates[category].length}
                </div>
                <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
                  {getCategoryLabel(category)}
                </div>
              </div>
            ))}
          </div>

          {CATEGORY_ORDER.map((category) => {
            const templates = groupedTemplates[category]
            if (!templates.length) return null
            return (
              <div key={category} className="mb-10">
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3"
                    style={{ backgroundColor: templates[0]?.accent }}
                    aria-hidden
                  />
                  {getCategoryLabel(category)}
                  <span className="text-xs text-gray-400 font-medium normal-case tracking-normal">
                    {templates.length} template{templates.length === 1 ? '' : 's'}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {templates.map((template) => {
                    const stats = usageByTemplate[template.key]
                    const sent = stats?.sent ?? 0
                    const failed = stats?.failed ?? 0
                    const last = stats?.last
                    return (
                      <div
                        key={template.key}
                        className="bg-white border-2 border-gray-200 p-6 hover:border-brand-primary transition-colors flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {template.name}
                            </h3>
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold border mt-2 ${CATEGORY_ACCENTS[template.category]}`}
                            >
                              {getCategoryLabel(template.category)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase tracking-wide">
                              Verzonden
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{sent}</div>
                            {failed > 0 && (
                              <div className="text-xs text-red-600 font-semibold">
                                {failed} mislukt
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 leading-relaxed flex-grow">
                          {template.description}
                        </p>

                        <div className="bg-gray-50 p-3 border-l-4 border-brand-primary mb-4">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Template key
                          </div>
                          <div className="text-sm font-mono text-gray-900">{template.key}</div>
                        </div>

                        {template.from && (
                          <div className="text-xs text-gray-500 mb-3">
                            <span className="font-bold uppercase tracking-wide mr-2">From</span>
                            <span className="font-mono">{template.from}</span>
                          </div>
                        )}

                        {last && (
                          <div className="text-xs text-gray-500 mb-3">
                            <span className="font-bold uppercase tracking-wide mr-2">
                              Laatste verzending
                            </span>
                            {new Date(last).toLocaleString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <a
                            href={`/api/email-preview?type=${template.previewSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                          >
                            <Eye size={16} />
                            Preview
                          </a>
                          <button
                            onClick={() => {
                              setActiveTab('logs')
                              setFilterTemplate(template.key)
                              setFilterStatus('all')
                              setSearchTerm('')
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors"
                          >
                            <Code size={16} />
                            Log
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
