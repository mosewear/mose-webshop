'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Shield, AlertTriangle, Info, RotateCcw } from 'lucide-react'

interface SettingRow {
  key: string
  value: unknown
}

interface WorkingHours {
  start_hour: number
  end_hour: number
  timezone: string
}

interface DraftConfig {
  mode: 'advisory' | 'bounded' | 'full'
  maxBudgetChangePct: number
  maxDailySpendShiftEur: number
  accountSpendCapEur: number
  minMarginPctFloor: number
  workingHoursStart: number
  workingHoursEnd: number
  workingHoursTz: string
  revertWindowDays: number
}

const DEFAULTS: DraftConfig = {
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

const TIMEZONES = ['Europe/Amsterdam', 'Europe/Berlin', 'Europe/Paris', 'Europe/London', 'UTC']

function cleanString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v.replace(/"/g, '') : fallback
}

function parseConfig(rows: SettingRow[]): DraftConfig {
  const map = new Map<string, unknown>()
  for (const r of rows) map.set(r.key, r.value)

  const modeRaw = cleanString(map.get('ai_autopilot_mode'), 'advisory')
  const mode = (['advisory', 'bounded', 'full'].includes(modeRaw) ? modeRaw : 'advisory') as DraftConfig['mode']

  const workingHours =
    (map.get('ai_autopilot_working_hours') as Partial<WorkingHours> | undefined) ?? {}

  const num = (v: unknown, fallback: number): number => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/"/g, ''))
      return Number.isFinite(n) ? n : fallback
    }
    return fallback
  }

  return {
    mode,
    maxBudgetChangePct: num(map.get('ai_autopilot_max_budget_change_pct'), DEFAULTS.maxBudgetChangePct),
    maxDailySpendShiftEur: num(map.get('ai_autopilot_max_daily_spend_shift_eur'), DEFAULTS.maxDailySpendShiftEur),
    accountSpendCapEur: num(map.get('ai_autopilot_account_spend_cap_eur'), DEFAULTS.accountSpendCapEur),
    minMarginPctFloor: num(map.get('ai_autopilot_min_margin_pct_floor'), DEFAULTS.minMarginPctFloor),
    workingHoursStart: typeof workingHours.start_hour === 'number' ? workingHours.start_hour : DEFAULTS.workingHoursStart,
    workingHoursEnd: typeof workingHours.end_hour === 'number' ? workingHours.end_hour : DEFAULTS.workingHoursEnd,
    workingHoursTz: typeof workingHours.timezone === 'string' ? workingHours.timezone : DEFAULTS.workingHoursTz,
    revertWindowDays: num(map.get('ai_autopilot_revert_window_days'), DEFAULTS.revertWindowDays),
  }
}

export default function GuardrailsPage() {
  const [draft, setDraft] = useState<DraftConfig>(DEFAULTS)
  const [initial, setInitial] = useState<DraftConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/ai-campaigns/guardrails')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Laden mislukt')
      const parsed = parseConfig(data.settings || [])
      setDraft(parsed)
      setInitial(parsed)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial])

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      setMessage(null)
      const updates = [
        { key: 'ai_autopilot_mode', value: draft.mode },
        { key: 'ai_autopilot_max_budget_change_pct', value: Number(draft.maxBudgetChangePct.toFixed(4)) },
        { key: 'ai_autopilot_max_daily_spend_shift_eur', value: Number(draft.maxDailySpendShiftEur.toFixed(2)) },
        { key: 'ai_autopilot_account_spend_cap_eur', value: Number(draft.accountSpendCapEur.toFixed(2)) },
        { key: 'ai_autopilot_min_margin_pct_floor', value: Number(draft.minMarginPctFloor.toFixed(4)) },
        {
          key: 'ai_autopilot_working_hours',
          value: {
            start_hour: Math.round(draft.workingHoursStart),
            end_hour: Math.round(draft.workingHoursEnd),
            timezone: draft.workingHoursTz,
          },
        },
        { key: 'ai_autopilot_revert_window_days', value: Math.round(draft.revertWindowDays) },
      ]
      const res = await fetch('/api/admin/ai-campaigns/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      if (data.skipped?.length) {
        const skipped = (data.skipped as Array<{ key: string; reason: string }>)
          .map((s) => `${s.key}: ${s.reason}`)
          .join('; ')
        setError(`Sommige velden zijn niet opgeslagen → ${skipped}`)
      } else {
        setMessage(`Opgeslagen (${data.applied.length} velden bijgewerkt).`)
      }
      setInitial(draft)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-gray-500">Guardrails laden…</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link
        href="/admin/ai-campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Terug naar Campagne AI
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6" /> Guardrails
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Harde limieten waarbinnen de autopilot autonoom mag werken. Wijzigingen werken direct
            voor de volgende run en gelden voor bounded én full mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              onClick={() => setDraft(initial)}
            >
              <RotateCcw className="w-4 h-4" /> Herstel
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={save}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm">{message}</div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Werkmodus</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(['advisory', 'bounded', 'full'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDraft({ ...draft, mode })}
              className={`text-left p-3 rounded-lg border text-sm transition ${
                draft.mode === mode
                  ? 'border-black bg-gray-50 ring-1 ring-black'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium capitalize">{mode}</div>
              <div className="text-xs text-gray-600 mt-1">
                {mode === 'advisory' && 'Alleen adviseren — geen Meta API mutaties.'}
                {mode === 'bounded' && 'Pause/resume + budget ±caps. Geen audience/creative.'}
                {mode === 'full' && 'Inclusief audience expansion en creative launches.'}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Killswitch (Aan/Uit) staat los hiervan en bevindt zich op de overview-pagina. Bij Uit én bounded/full slaan we de run over.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Budget &amp; spend limieten</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Max budget-aanpassing per actie"
            suffix="%"
            value={draft.maxBudgetChangePct * 100}
            step={1}
            min={0}
            max={50}
            onChange={(v) => setDraft({ ...draft, maxBudgetChangePct: v / 100 })}
            hint="Per ad set/campagne kan de autopilot nooit meer dan dit percentage op- of afschroeven."
          />
          <Field
            label="Max dagelijkse spend-shift"
            suffix="EUR"
            value={draft.maxDailySpendShiftEur}
            step={5}
            min={0}
            onChange={(v) => setDraft({ ...draft, maxDailySpendShiftEur: v })}
            hint="Som van alle netto budgetverhogingen mag dit per dag niet overschrijden."
          />
          <Field
            label="Hardcap accountspending per dag"
            suffix="EUR"
            value={draft.accountSpendCapEur}
            step={25}
            min={0}
            onChange={(v) => setDraft({ ...draft, accountSpendCapEur: v })}
            hint="Wanneer het ad-account vandaag al boven deze drempel zit worden alle budget-verhogingen geblokkeerd."
          />
          <Field
            label="Minimum contributie-marge"
            suffix="%"
            value={draft.minMarginPctFloor * 100}
            step={1}
            min={0}
            max={90}
            onChange={(v) => setDraft({ ...draft, minMarginPctFloor: v / 100 })}
            hint="SKUs onder deze marge mag de autopilot alleen afschalen, nooit harder pushen."
          />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Werkuren</h2>
        <p className="text-xs text-gray-500 mb-3">
          Buiten deze uren slaat de autopilot mutaties over. Het hourly OOS-pause script werkt
          24/7 los hiervan.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field
            label="Start (uur)"
            value={draft.workingHoursStart}
            step={1}
            min={0}
            max={23}
            onChange={(v) => setDraft({ ...draft, workingHoursStart: v })}
          />
          <Field
            label="Eind (uur)"
            value={draft.workingHoursEnd}
            step={1}
            min={1}
            max={24}
            onChange={(v) => setDraft({ ...draft, workingHoursEnd: v })}
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tijdzone</label>
            <select
              value={draft.workingHoursTz}
              onChange={(e) => setDraft({ ...draft, workingHoursTz: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Revert window</h2>
        <Field
          label="Aantal dagen dat acties terug te draaien zijn"
          suffix="dagen"
          value={draft.revertWindowDays}
          step={1}
          min={1}
          max={90}
          onChange={(v) => setDraft({ ...draft, revertWindowDays: v })}
          hint="Per actie wordt de prior_state vastgelegd. Binnen dit window kun je in het beslissingenlogboek met één klik terug naar de oorspronkelijke waarde."
        />
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  suffix,
  hint,
  step = 1,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  hint?: string
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
        {suffix && <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
