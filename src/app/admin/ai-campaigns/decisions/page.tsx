'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Info,
  Undo2,
} from 'lucide-react'

interface DecisionRow {
  id: string
  run_started_at: string
  run_completed_at: string | null
  trigger: string
  provider: string
  model: string
  prompt_version: string
  snapshot_date: string | null
  proposal_count: number
  status: 'running' | 'completed' | 'failed' | 'killswitch'
  error_message: string | null
  cost_usd: number | null
  cost_input_tokens: number | null
  cost_output_tokens: number | null
}

interface DecisionDetail extends DecisionRow {
  input_summary: Record<string, unknown> | null
  llm_raw_response: Record<string, unknown> | null
  parsed_actions: unknown[]
  prompt_hash: string
}

interface ActionRow {
  id: string
  action_type: string
  target_level: string
  target_meta_id: string
  target_label: string | null
  payload: Record<string, unknown> | null
  prior_state: Record<string, unknown> | null
  guardrail_outcome: 'allowed' | 'blocked' | 'killswitch' | 'manual_override'
  guardrail_reason: string | null
  status: 'queued' | 'executed' | 'failed' | 'reverted' | 'skipped'
  executed_at: string | null
  reverted_at: string | null
  meta_api_response: Record<string, unknown> | null
  error_message: string | null
}

interface DetailPayload {
  decision: DecisionDetail
  actions: ActionRow[]
}

const STATUS_BADGES: Record<DecisionRow['status'], { label: string; color: string }> = {
  running: { label: 'Bezig', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Voltooid', color: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700 border-red-200' },
  killswitch: { label: 'Killswitch', color: 'bg-gray-200 text-gray-700 border-gray-300' },
}

const GUARDRAIL_BADGES: Record<ActionRow['guardrail_outcome'], string> = {
  allowed: 'bg-green-50 text-green-800 border-green-200',
  blocked: 'bg-amber-50 text-amber-800 border-amber-200',
  killswitch: 'bg-gray-100 text-gray-800 border-gray-300',
  manual_override: 'bg-purple-50 text-purple-800 border-purple-200',
}

const STATUS_FILTERS: Array<DecisionRow['status'] | 'all'> = [
  'all',
  'completed',
  'failed',
  'killswitch',
  'running',
]

export default function DecisionsLogPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [rows, setRows] = useState<DecisionRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyTrigger, setBusyTrigger] = useState<null | 'decision' | 'snapshots' | 'oos'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, DetailPayload>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)

  const refetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-campaigns/decisions?id=${id}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as DetailPayload
      setDetails((d) => ({ ...d, [id]: data }))
    } catch {
      // Silent — UI will show stale state until user reopens.
    }
  }, [])

  const revertAction = useCallback(
    async (decisionId: string, actionId: string) => {
      if (!confirm('Deze actie ongedaan maken? We zetten de Meta-status terug naar prior_state.')) {
        return
      }
      setRevertingId(actionId)
      setError(null)
      setMessage(null)
      try {
        const res = await fetch(
          `/api/admin/ai-campaigns/decisions/revert?actionId=${encodeURIComponent(actionId)}`,
          { method: 'POST' },
        )
        const body = await res.json()
        if (!res.ok || body.ok === false) {
          throw new Error(body.error || 'Revert mislukt')
        }
        setMessage('Actie teruggedraaid.')
        await refetchDetail(decisionId)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setRevertingId(null)
      }
    },
    [refetchDetail],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/ai-campaigns/decisions?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `GET failed (${res.status})`)
      }
      const data = await res.json()
      setRows(data.rows ?? [])
      setTotalCount(data.totalCount ?? 0)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (details[id]) return
    setDetailLoading(id)
    try {
      const res = await fetch(`/api/admin/ai-campaigns/decisions?id=${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Detail load failed (${res.status})`)
      const data = (await res.json()) as DetailPayload
      setDetails((d) => ({ ...d, [id]: data }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Detail load mislukt'
      setError(msg)
    } finally {
      setDetailLoading(null)
    }
  }

  const trigger = async (kind: 'decision' | 'snapshots' | 'oos') => {
    setBusyTrigger(kind)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/ai-campaigns/trigger?kind=${kind}`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || 'Trigger mislukt')
      }
      setMessage(
        kind === 'decision'
          ? `Beslissing aangemaakt (status: ${body.result?.status}, voorstellen: ${body.result?.parsedActionsCount}).`
          : kind === 'snapshots'
            ? `Meta-snapshots opgehaald (${body.result?.account_rows + body.result?.campaign_rows + body.result?.ad_set_rows + body.result?.ad_rows} rijen).`
            : `OOS-regel uitgevoerd (paused: ${body.result?.ad_sets_paused}, resumed: ${body.result?.ad_sets_resumed}).`,
      )
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Trigger mislukt'
      setError(msg)
    } finally {
      setBusyTrigger(null)
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / 25)), [totalCount])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/ai-campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar Campagne AI
        </Link>
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Beslissingenlogboek</h1>
              <p className="text-sm text-gray-600 max-w-2xl">
                Volledige audit trail van AI-beslissingen + rule-based safety acties. In advisory mode worden
                voorstellen geregistreerd maar niet uitgevoerd op Meta.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => trigger('snapshots')}
              disabled={!!busyTrigger}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-black rounded-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busyTrigger === 'snapshots' ? 'animate-spin' : ''}`} />
              Snapshots nu
            </button>
            <button
              onClick={() => trigger('oos')}
              disabled={!!busyTrigger}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-black rounded-md disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" />
              OOS-regel nu
            </button>
            <button
              onClick={() => trigger('decision')}
              disabled={!!busyTrigger}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black hover:bg-gray-800 text-white rounded-md disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {busyTrigger === 'decision' ? 'Bezig…' : 'Beslissing nu'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Filter:</span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s)
              setPage(1)
            }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === 'all' ? 'alles' : STATUS_BADGES[s as DecisionRow['status']].label.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-14 bg-gray-200 rounded" />
          <div className="h-14 bg-gray-200 rounded" />
          <div className="h-14 bg-gray-200 rounded" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-600">
          Nog geen beslissingen. Klik &ldquo;Beslissing nu&rdquo; om er &eacute;&eacute;n te triggeren.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const badge = STATUS_BADGES[row.status]
            const expanded = expandedId === row.id
            const detail = details[row.id]
            return (
              <article key={row.id} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <button
                  onClick={() => toggleExpand(row.id)}
                  className="w-full text-left px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {new Date(row.run_started_at).toLocaleString('nl-NL')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {row.provider} · {row.model} · prompt {row.prompt_version} · trigger {row.trigger}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {row.proposal_count} voorstellen
                    </span>
                    {row.cost_usd !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono">
                        ${row.cost_usd.toFixed(4)}
                      </span>
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4 text-sm">
                    {detailLoading === row.id && (
                      <div className="text-gray-500">Detail laden…</div>
                    )}
                    {row.error_message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex items-start gap-2">
                        <XCircle className="w-4 h-4 mt-0.5" />
                        <span>{row.error_message}</span>
                      </div>
                    )}
                    {detail && (
                      <>
                        <Section title="Input-samenvatting">
                          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto">
                            {JSON.stringify(detail.decision.input_summary, null, 2)}
                          </pre>
                        </Section>

                        <Section title={`Voorgestelde acties (${detail.actions.length})`}>
                          {detail.actions.length === 0 ? (
                            <div className="text-gray-500 text-xs">Geen acties voorgesteld.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="text-left text-gray-500 border-b border-gray-200">
                                  <tr>
                                    <th className="py-1.5 pr-3">Type</th>
                                    <th className="py-1.5 pr-3">Target</th>
                                    <th className="py-1.5 pr-3">Guardrail</th>
                                    <th className="py-1.5 pr-3">Status</th>
                                    <th className="py-1.5 pr-3">Onderbouwing</th>
                                    <th className="py-1.5 pr-3 text-right">Revert</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.actions.map((a) => {
                                    const canRevert =
                                      a.status === 'executed' && !a.reverted_at && !!a.prior_state
                                    return (
                                      <tr key={a.id} className="border-b border-gray-100 align-top">
                                        <td className="py-1.5 pr-3 font-mono">{a.action_type}</td>
                                        <td className="py-1.5 pr-3 font-mono">
                                          {a.target_level}:
                                          <br />
                                          <span className="text-gray-500">{a.target_meta_id}</span>
                                        </td>
                                        <td className="py-1.5 pr-3">
                                          <span
                                            className={`px-2 py-0.5 rounded-full border text-[10px] ${GUARDRAIL_BADGES[a.guardrail_outcome]}`}
                                          >
                                            {a.guardrail_outcome}
                                          </span>
                                          {a.guardrail_reason && (
                                            <div className="text-[11px] text-gray-500 mt-1">{a.guardrail_reason}</div>
                                          )}
                                        </td>
                                        <td className="py-1.5 pr-3 capitalize">
                                          {a.status}
                                          {a.reverted_at && (
                                            <div className="text-[10px] text-gray-500">
                                              reverted {new Date(a.reverted_at).toLocaleString('nl-NL')}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 pr-3 max-w-md text-gray-700">
                                          {extractRationale(a.payload)}
                                          {a.error_message && (
                                            <div className="text-[11px] text-red-700 mt-1">
                                              {a.error_message}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 pr-3 text-right">
                                          {canRevert ? (
                                            <button
                                              type="button"
                                              disabled={revertingId === a.id}
                                              onClick={() => revertAction(row.id, a.id)}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-gray-300 hover:border-black hover:bg-gray-50 disabled:opacity-50"
                                            >
                                              <Undo2 className="w-3 h-3" />
                                              {revertingId === a.id ? 'Bezig…' : 'Revert'}
                                            </button>
                                          ) : (
                                            <span className="text-gray-300 text-[11px]">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </Section>

                        <Section title="Raw LLM response">
                          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto max-h-96">
                            {JSON.stringify(detail.decision.llm_raw_response, null, 2)}
                          </pre>
                        </Section>

                        <Section title="Parsed actions (object)">
                          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto max-h-96">
                            {JSON.stringify(detail.decision.parsed_actions, null, 2)}
                          </pre>
                        </Section>

                        <div className="text-xs text-gray-500 flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Prompt hash <code>{detail.decision.prompt_hash}</code>. Token-kosten:{' '}
                            {detail.decision.cost_input_tokens ?? '?'} input /{' '}
                            {detail.decision.cost_output_tokens ?? '?'} output.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Pagina {page} van {totalPages} ({totalCount} beslissingen totaal)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-md hover:border-black disabled:opacity-50"
            >
              Vorige
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-md hover:border-black disabled:opacity-50"
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  )
}

function extractRationale(payload: Record<string, unknown> | null): string {
  if (!payload) return ''
  if (typeof payload.rationale === 'string') return payload.rationale
  if (typeof payload.matched_sku_count === 'number') {
    return `OOS rule (gematchte SKUs: ${payload.matched_sku_count})`
  }
  try {
    return JSON.stringify(payload).slice(0, 200)
  } catch {
    return ''
  }
}
