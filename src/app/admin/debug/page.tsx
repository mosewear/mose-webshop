'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DebugLog {
  id: string
  level: string
  message: string
  details: any
  user_agent: string | null
  url: string | null
  created_at: string
}

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
    
    // Auto-refresh every 2 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchLogs()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, filter])

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('level', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (err: any) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('Weet je zeker dat je alle logs wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('debug_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) throw error
      alert('✅ Logs verwijderd!')
      fetchLogs()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'warn':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error':
        return '🔴'
      case 'warn':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🐛 Debug Logs</h1>
          <p className="text-gray-600">Real-time logs van de website (incl. mobiel)</p>
        </div>
        <Link
          href="/admin"
          className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
        >
          ← Terug
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="font-bold">Auto-refresh (2s)</span>
          </label>

          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                filter === 'all'
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Alles ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                filter === 'error'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🔴 Errors ({logs.filter(l => l.level === 'error').length})
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                filter === 'warn'
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              ⚠️ Warnings ({logs.filter(l => l.level === 'warn').length})
            </button>
          </div>

          {/* Clear logs */}
          <button
            onClick={handleClearLogs}
            className="ml-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors"
          >
            🗑️ Verwijder Alles
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchLogs}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 uppercase tracking-wider transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 p-4">
          <div className="text-3xl font-bold text-blue-600 mb-2">{logs.filter(l => l.level === 'info').length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Info Logs</div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 p-4">
          <div className="text-3xl font-bold text-orange-600 mb-2">{logs.filter(l => l.level === 'warn').length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Warnings</div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 p-4">
          <div className="text-3xl font-bold text-red-600 mb-2">{logs.filter(l => l.level === 'error').length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Errors</div>
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-gray-100 border-2 border-gray-200 p-12 text-center">
            <p className="text-gray-600">Nog geen logs</p>
            <p className="text-sm text-gray-500 mt-2">Logs verschijnen hier in real-time!</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border-2 p-4 ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getLevelEmoji(log.level)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold uppercase ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(log.created_at).toLocaleString('nl-NL')}
                    </span>
                  </div>
                  <div className="font-bold mb-2">{log.message}</div>
                  
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold mb-2">Details</summary>
                      <pre className="bg-white/50 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {log.user_agent && (
                    <div className="text-xs text-gray-600 mt-2">
                      <strong>User Agent:</strong> {log.user_agent}
                    </div>
                  )}
                  
                  {log.url && (
                    <div className="text-xs text-gray-600">
                      <strong>URL:</strong> {log.url}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

