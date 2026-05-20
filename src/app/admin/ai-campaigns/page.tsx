'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Activity,
  Settings as SettingsIcon,
  Coins,
  Sparkles,
  ClipboardList,
  Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AutopilotMode = 'advisory' | 'bounded' | 'full'

interface AutopilotConfig {
  enabled: boolean
  mode: AutopilotMode
  maxBudgetChangePct: number
  maxDailySpendShiftEur: number
  accountSpendCapEur: number
  minMarginPctFloor: number
  workingHoursStart: number
  workingHoursEnd: number
  workingHoursTz: string
  revertWindowDays: number
}

interface SetupChecks {
  hasMetaCredentials: boolean
  hasMetaPixelId: boolean
  hasFacebookAccessToken: boolean
  productsWithEconomicsPct: number
  totalProductsCount: number
  productsWithEconomicsCount: number
  decisionsLogged: number
  actionsLogged: number
  lastDecisionAt: string | null
}

const DEFAULT_CONFIG: AutopilotConfig = {
  enabled: false,
  mode: 'advisory',
  maxBudgetChangePct: 0.1,
  maxDailySpendShiftEur: 50,
  accountSpendCapEur: 500,
  minMarginPctFloor: 0.15,
  workingHoursStart: 7,
  workingHoursEnd: 22,
  workingHoursTz: 'Europe/Amsterdam',
  revertWindowDays: 30,
}

const MODE_DESCRIPTIONS: Record<AutopilotMode, string> = {
  advisory:
    'AI denkt mee maar voert niets uit. Voorstellen verschijnen in het beslissingenlogboek voor handmatige beoordeling.',
  bounded:
    'AI mag autonoom acties uitvoeren binnen de hieronder ingestelde harde grenzen (budgetcaps, marge-floor, werkuren).',
  full:
    'Volledig autonoom inclusief audience-uitbreiding en cross-campaign budget shifts. Pas inschakelen na minimaal 4 weken bewezen track-record in bounded mode.',
}

export default function AiCampaignsOverviewPage() {
  const [config, setConfig] = useState<AutopilotConfig>(DEFAULT_CONFIG)
  const [checks, setChecks] = useState<SetupChecks | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: settings, error: settingsError } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'ai_autopilot_enabled',
          'ai_autopilot_mode',
          'ai_autopilot_max_budget_change_pct',
          'ai_autopilot_max_daily_spend_shift_eur',
          'ai_autopilot_account_spend_cap_eur',
          'ai_autopilot_min_margin_pct_floor',
          'ai_autopilot_working_hours',
          'ai_autopilot_revert_window_days',
        ])

      if (settingsError) throw settingsError

      const map = new Map<string, unknown>()
      ;(settings ?? []).forEach((row: { key: string; value: unknown }) => {
        map.set(row.key, row.value)
      })

      const workingHours = (map.get('ai_autopilot_working_hours') as
        | { start_hour?: number; end_hour?: number; timezone?: string }
        | undefined) ?? {}

      const next: AutopilotConfig = {
        enabled: parseBool(map.get('ai_autopilot_enabled')),
        mode: (parseStringEnum(map.get('ai_autopilot_mode'), ['advisory', 'bounded', 'full']) ??
          'advisory') as AutopilotMode,
        maxBudgetChangePct: parseNumber(map.get('ai_autopilot_max_budget_change_pct'), 0.1),
        maxDailySpendShiftEur: parseNumber(map.get('ai_autopilot_max_daily_spend_shift_eur'), 50),
        accountSpendCapEur: parseNumber(map.get('ai_autopilot_account_spend_cap_eur'), 500),
        minMarginPctFloor: parseNumber(map.get('ai_autopilot_min_margin_pct_floor'), 0.15),
        workingHoursStart: typeof workingHours.start_hour === 'number' ? workingHours.start_hour : 7,
        workingHoursEnd: typeof workingHours.end_hour === 'number' ? workingHours.end_hour : 22,
        workingHoursTz: workingHours.timezone || 'Europe/Amsterdam',
        revertWindowDays: parseNumber(map.get('ai_autopilot_revert_window_days'), 30),
      }
      setConfig(next)

      const setupRes = await fetch('/api/admin/ai-campaigns/setup-status', { cache: 'no-store' })
      if (setupRes.ok) {
        const setupData = (await setupRes.json()) as SetupChecks
        setChecks(setupData)
      } else {
        setChecks(null)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout bij laden'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const updateSetting = async (key: string, value: unknown) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const { error: upError } = await supabase
        .from('site_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
      if (upError) throw upError
      setMessage('Opgeslagen.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Opslaan mislukt'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async () => {
    const next = !config.enabled
    setConfig((c) => ({ ...c, enabled: next }))
    await updateSetting('ai_autopilot_enabled', next)
  }

  const setMode = async (mode: AutopilotMode) => {
    setConfig((c) => ({ ...c, mode }))
    await updateSetting('ai_autopilot_mode', mode)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-white rounded-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campagne AI</h1>
            <p className="text-sm text-gray-600">
              Autonome optimalisatie van Meta-advertenties op basis van eerstehands MOSE-data
              (marge, voorraad, retouren, LTV).
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}

      {/* Status + kill switch */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full ${
                config.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}
              aria-hidden
            />
            <div>
              <div className="text-sm text-gray-500">Systeemstatus</div>
              <div className="text-lg font-semibold text-gray-900">
                {config.enabled
                  ? config.mode === 'advisory'
                    ? 'Aan — adviserend (geen autonome acties)'
                    : config.mode === 'bounded'
                      ? 'Aan — autonoom binnen guardrails'
                      : 'Aan — volledig autonoom'
                  : 'Uit (killswitch actief)'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              config.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-black hover:bg-gray-800 text-white'
            } disabled:opacity-50`}
            aria-pressed={config.enabled}
          >
            <Zap className="w-4 h-4" />
            {config.enabled ? 'Schakel autopilot uit' : 'Activeer autopilot'}
          </button>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          {(['advisory', 'bounded', 'full'] as const).map((mode) => {
            const isActive = config.mode === mode
            return (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                disabled={saving}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  isActive
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } disabled:opacity-50`}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold capitalize text-gray-900">{mode}</span>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <p className="text-xs text-gray-600 leading-snug">{MODE_DESCRIPTIONS[mode]}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Setup checklist */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Setup-status</h2>
        </div>
        <SetupChecklist checks={checks} />
      </section>

      {/* Sub-pages */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NavCard
          href="/admin/ai-campaigns/economics"
          title="SKU economics"
          icon={<Coins className="w-5 h-5" />}
          status="ready"
          description="Voer kostprijs, transactiekosten en verzendkosten per product/variant in. Verplicht voordat bounded/full mode geactiveerd kan worden."
        />
        <NavCard
          href="/admin/ai-campaigns/decisions"
          title="Beslissingenlogboek"
          icon={<Activity className="w-5 h-5" />}
          status="ready"
          description="Audit-trail van iedere AI-beslissing en rule-based safety actie: input, prompt-versie, voorgestelde acties, guardrail-uitkomst, kosten."
        />
        <NavCard
          href="/admin/ai-campaigns/guardrails"
          title="Guardrails"
          icon={<Shield className="w-5 h-5" />}
          status="ready"
          description="Harde budget caps, marge-floor, werkuren en accountspending-limit. Live bewerkbaar — wijzigingen werken direct in de volgende run."
        />
        <NavCard
          href="/admin/ai-campaigns/brand-guide"
          title="Brand guide"
          icon={<Sparkles className="w-5 h-5" />}
          status="ready"
          description="Paletten, fonts, voice en QA-drempels. Bron-van-waarheid voor elke AI-prompt en automatische QA op gegenereerde creatives."
        />
        <NavCard
          href="/admin/ai-campaigns/scenes"
          title="Scene library"
          icon={<ImageIcon className="w-5 h-5" />}
          status="ready"
          description="Pre-goedgekeurde achtergrond/setting-foto's met focal-point en palet. Input voor de garment-preserving generator."
        />
        <NavCard
          href="/admin/ai-campaigns/creatives"
          title="Creatives & approvals"
          icon={<Sparkles className="w-5 h-5" />}
          status="ready"
          description="Garment-preserving generator (Flux Kontext) met SSIM + brand palette QA. Mock-mode beschikbaar voor smoke-tests zonder Replicate-cost."
        />
        <NavCard
          href="/admin/ai-campaigns/config"
          title="Configuratie"
          icon={<SettingsIcon className="w-5 h-5" />}
          status="ready"
          description="Meta System User token, ad-account selectie, AI-provider/model en prompt-versie override."
        />
      </section>

      {/* Current guardrails (read-only preview) */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Huidige guardrails</h2>
          <span className="text-xs text-gray-500 ml-2">
            (snapshot — bewerken via{' '}
            <Link href="/admin/ai-campaigns/guardrails" className="text-black underline hover:no-underline">
              Guardrails
            </Link>
            )
          </span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <GuardrailRow
            label="Max budget-aanpassing per run"
            value={`${(config.maxBudgetChangePct * 100).toFixed(0)} %`}
          />
          <GuardrailRow
            label="Max dagelijkse budget-shift"
            value={`€ ${config.maxDailySpendShiftEur.toFixed(2)}`}
          />
          <GuardrailRow
            label="Hardcap accountspending / dag"
            value={`€ ${config.accountSpendCapEur.toFixed(2)}`}
          />
          <GuardrailRow
            label="Minimum contributie-marge"
            value={`${(config.minMarginPctFloor * 100).toFixed(0)} %`}
          />
          <GuardrailRow
            label="Werkuren autopilot"
            value={`${pad(config.workingHoursStart)}:00 – ${pad(config.workingHoursEnd)}:00 (${config.workingHoursTz})`}
          />
          <GuardrailRow
            label="Revert window"
            value={`${config.revertWindowDays} dagen`}
          />
        </dl>
      </section>
    </div>
  )
}

function SetupChecklist({ checks }: { checks: SetupChecks | null }) {
  if (!checks) {
    return (
      <div className="text-sm text-gray-500 italic">
        Setup-status nog niet beschikbaar — endpoint{' '}
        <code className="text-xs">/api/admin/ai-campaigns/setup-status</code> ontbreekt of gaf een
        fout.
      </div>
    )
  }
  const items: Array<{ ok: boolean; label: string; hint?: string }> = [
    {
      ok: checks.hasFacebookAccessToken,
      label: 'FACEBOOK_ACCESS_TOKEN env-var geconfigureerd',
      hint: 'Vereist voor server-side CAPI Purchase events vanuit de Stripe webhook.',
    },
    {
      ok: checks.hasMetaPixelId,
      label: 'NEXT_PUBLIC_META_PIXEL_ID geconfigureerd',
      hint: 'Pixel ID dat client + server gebruiken. Default valt terug op de productie-pixel.',
    },
    {
      ok: checks.hasMetaCredentials,
      label: 'Meta Marketing API credentials opgeslagen',
      hint: 'System User token + business + ad account in tabel meta_credentials (label "mose_primary"), of via env-vars META_BUSINESS_ID / META_AD_ACCOUNT_ID / META_SYSTEM_USER_TOKEN.',
    },
    {
      ok: checks.productsWithEconomicsPct >= 80,
      label: `SKU economics ingevuld voor ${checks.productsWithEconomicsCount} / ${checks.totalProductsCount} producten (${checks.productsWithEconomicsPct.toFixed(0)} %)`,
      hint: 'Bounded/full mode vereist minstens 80 % dekking om op marge te kunnen sturen.',
    },
  ]
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          {item.ok ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className={`font-medium ${item.ok ? 'text-gray-900' : 'text-gray-700'}`}>
              {item.label}
            </div>
            {item.hint && <div className="text-xs text-gray-500 mt-0.5">{item.hint}</div>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function NavCard({
  href,
  title,
  description,
  icon,
  status,
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'ready' | 'phase-1' | 'phase-2' | 'phase-3'
}) {
  const isReady = status === 'ready'
  const wrapperClasses = isReady
    ? 'group block p-5 bg-white border border-gray-200 rounded-xl hover:border-black hover:shadow-md transition-all'
    : 'block p-5 bg-gray-50 border border-gray-200 rounded-xl cursor-not-allowed'

  const badge = isReady ? null : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
      Beschikbaar in {status.replace('phase-', 'Phase ')}
    </span>
  )

  const Inner = (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-md ${isReady ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
            {icon}
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {badge}
      </div>
      <p className="text-sm text-gray-600 leading-snug">{description}</p>
      {isReady && (
        <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
          Openen <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </>
  )

  return isReady ? (
    <Link href={href} className={wrapperClasses}>
      {Inner}
    </Link>
  ) : (
    <div className={wrapperClasses}>{Inner}</div>
  )
}

function GuardrailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-mono font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '"true"'
  return false
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/"/g, ''))
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function parseStringEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== 'string') return undefined
  const stripped = value.replace(/"/g, '') as T
  return allowed.includes(stripped) ? stripped : undefined
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
