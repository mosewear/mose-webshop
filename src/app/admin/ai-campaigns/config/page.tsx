'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  KeyRound,
  Plug,
} from 'lucide-react'
import { useAutoDismiss } from '@/app/admin/ai-campaigns/_lib/use-auto-dismiss'

interface CredentialRow {
  id: string
  label: string
  business_id: string
  ad_account_id: string
  pixel_id: string | null
  page_id: string | null
  default_link_template: string | null
  token_scopes: string[] | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
  access_token_mask: string
}

interface SettingsState {
  provider: 'openai' | 'mock'
  model: string
  promptOverride: string
  creativeMonthlyCapEur: number
  creativeDefaultModel: string
  creativeAutoApprove: boolean
}

const MODELS = [
  'gpt-5.5',
  'gpt-5.5-pro',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5-mini',
]

const CREATIVE_MODELS = [
  'black-forest-labs/flux-kontext-pro',
  'black-forest-labs/flux-1.1-pro',
  'black-forest-labs/flux-schnell',
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
]

function cleanString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v.replace(/"/g, '') : fallback
}

export default function ConfigPage() {
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [settings, setSettings] = useState<SettingsState>({
    provider: 'openai',
    model: 'gpt-5.5',
    promptOverride: '',
    creativeMonthlyCapEur: 150,
    creativeDefaultModel: 'black-forest-labs/flux-kontext-pro',
    creativeAutoApprove: true,
  })
  const [initialSettings, setInitialSettings] = useState<SettingsState>(settings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useAutoDismiss(message, setMessage)
  useAutoDismiss(error, setError, 10_000)
  const [testResult, setTestResult] = useState<{ label: string; ok: boolean; detail: string } | null>(null)

  // Inline form state for a new/updated credential row.
  const [form, setForm] = useState({
    label: 'mose_primary',
    business_id: '',
    ad_account_id: '',
    access_token: '',
    pixel_id: '',
    page_id: '',
    default_link_template: '',
  })
  const [busy, setBusy] = useState(false)
  // Per-credential test state so other rows + the save button stay
  // clickable while one test is in flight.
  const [testingLabel, setTestingLabel] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [credsRes, gRes] = await Promise.all([
        fetch('/api/admin/ai-campaigns/credentials'),
        fetch('/api/admin/ai-campaigns/guardrails'),
      ])
      const credsData = await credsRes.json()
      const gData = await gRes.json()
      if (!credsRes.ok) throw new Error(credsData.error || 'Credentials laden mislukt')
      if (!gRes.ok) throw new Error(gData.error || 'Settings laden mislukt')

      setCredentials(credsData.credentials || [])

      const settingsMap = new Map<string, unknown>()
      for (const s of (gData.settings || []) as Array<{ key: string; value: unknown }>) {
        settingsMap.set(s.key, s.value)
      }
      const providerRaw = cleanString(settingsMap.get('ai_autopilot_provider'), 'openai')
      const rawCap = settingsMap.get('ai_creative_monthly_cap_eur')
      const cap = typeof rawCap === 'number' ? rawCap : Number(rawCap) || 150
      const rawAuto = settingsMap.get('ai_creative_auto_approve')
      const next: SettingsState = {
        provider: providerRaw === 'mock' ? 'mock' : 'openai',
        model: cleanString(settingsMap.get('ai_autopilot_model'), 'gpt-5.5'),
        promptOverride:
          settingsMap.get('ai_autopilot_prompt_override') == null
            ? ''
            : cleanString(settingsMap.get('ai_autopilot_prompt_override'), ''),
        creativeMonthlyCapEur: Number.isFinite(cap) && cap > 0 ? cap : 150,
        creativeDefaultModel: cleanString(
          settingsMap.get('ai_creative_default_model'),
          'black-forest-labs/flux-kontext-pro',
        ),
        creativeAutoApprove: typeof rawAuto === 'boolean' ? rawAuto : true,
      }
      setSettings(next)
      setInitialSettings(next)

      const primary = (credsData.credentials || []).find(
        (c: CredentialRow) => c.label === 'mose_primary',
      )
      if (primary) {
        setForm((f) => ({
          ...f,
          label: primary.label,
          business_id: primary.business_id,
          ad_account_id: primary.ad_account_id,
          pixel_id: primary.pixel_id ?? '',
          page_id: primary.page_id ?? '',
          default_link_template: primary.default_link_template ?? '',
        }))
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dirtySettings = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings],
  )

  const saveSettings = async () => {
    try {
      setBusy(true)
      setError(null)
      setMessage(null)
      const updates = [
        { key: 'ai_autopilot_provider', value: settings.provider },
        { key: 'ai_autopilot_model', value: settings.model },
        { key: 'ai_autopilot_prompt_override', value: settings.promptOverride ? settings.promptOverride : null },
        { key: 'ai_creative_monthly_cap_eur', value: settings.creativeMonthlyCapEur },
        { key: 'ai_creative_default_model', value: settings.creativeDefaultModel },
        { key: 'ai_creative_auto_approve', value: settings.creativeAutoApprove },
      ]
      const res = await fetch('/api/admin/ai-campaigns/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      if (data.skipped?.length) {
        const reasons = (data.skipped as Array<{ key: string; reason: string }>)
          .map((s) => `${s.key}: ${s.reason}`)
          .join('; ')
        setError(`Niet alle velden opgeslagen → ${reasons}`)
      } else {
        setMessage('AI-instellingen opgeslagen.')
        setInitialSettings(settings)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const saveCredential = async () => {
    try {
      setBusy(true)
      setError(null)
      setMessage(null)
      if (!form.business_id || !form.ad_account_id || !form.access_token) {
        throw new Error('business_id, ad_account_id en access_token zijn verplicht.')
      }
      const res = await fetch('/api/admin/ai-campaigns/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label.trim() || 'mose_primary',
          business_id: form.business_id.trim(),
          ad_account_id: form.ad_account_id.trim(),
          access_token: form.access_token.trim(),
          pixel_id: form.pixel_id.trim() || null,
          page_id: form.page_id.trim() || null,
          default_link_template: form.default_link_template.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      setMessage('Meta credentials opgeslagen.')
      setForm((f) => ({ ...f, access_token: '' }))
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removeCredential = async (id: string) => {
    if (!confirm('Credential-row verwijderen? De autopilot valt dan terug op env-vars.')) return
    try {
      setBusy(true)
      setError(null)
      const res = await fetch(`/api/admin/ai-campaigns/credentials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt')
      setMessage('Verwijderd.')
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const testCredential = async (label: string) => {
    try {
      setTestingLabel(label)
      setTestResult(null)
      setError(null)
      const res = await fetch(`/api/admin/ai-campaigns/credentials/test?label=${encodeURIComponent(label)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setTestResult({ label, ok: false, detail: data.error || 'Onbekende fout' })
      } else {
        const a = data.account
        setTestResult({
          label,
          ok: true,
          detail: `${a.name ?? a.id} (${a.account_id ?? a.id}) — ${a.currency ?? '?'} — TZ ${a.timezone_name ?? '?'}`,
        })
      }
    } catch (e) {
      setTestResult({ label, ok: false, detail: (e as Error).message })
    } finally {
      setTestingLabel(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-gray-500">Configuratie laden…</div>
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

      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Configuratie
      </h1>
      <p className="text-sm text-gray-600 mt-1 max-w-2xl mb-6">
        Beheer de Meta System User token (RLS-veilig, alleen leesbaar via service-role) en kies welk
        AI-model de orchestrator gebruikt voor de dagelijkse audit.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm">{message}</div>
      )}
      {testResult && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm flex gap-2 ${
            testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <span className="font-medium">{testResult.label}:</span> {testResult.detail}
          </div>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-5 h-5 text-gray-700" />
          <h2 className="text-base font-semibold text-gray-900">Meta System User token</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Maak een System User aan in Meta Business Manager met de scopes <code>ads_read</code>,{' '}
          <code>ads_management</code> en (indien nodig){' '}
          <code>business_management</code>. Plak hier de token + ad account id (<code>act_...</code>).
          We slaan de token alleen aan de service-role kant op; admin SSR ziet alleen het masker.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="mose_primary"
            />
            <p className="text-xs text-gray-500 mt-1">Unieke key (default: mose_primary).</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Business ID</label>
            <input
              type="text"
              value={form.business_id}
              onChange={(e) => setForm({ ...form, business_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="bv. 1234567890"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ad account ID</label>
            <input
              type="text"
              value={form.ad_account_id}
              onChange={(e) => setForm({ ...form, ad_account_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="act_XXXXXXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">Moet beginnen met <code>act_</code>.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pixel ID (optioneel)</label>
            <input
              type="text"
              value={form.pixel_id}
              onChange={(e) => setForm({ ...form, pixel_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="bv. 9876543210"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Page ID</label>
            <input
              type="text"
              value={form.page_id}
              onChange={(e) => setForm({ ...form, page_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="bv. 1029384756"
            />
            <p className="text-xs text-gray-500 mt-1">Verplicht voor &ldquo;Publiceer naar Meta&rdquo; op AI creatives.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Default link-template</label>
            <input
              type="text"
              value={form.default_link_template}
              onChange={(e) => setForm({ ...form, default_link_template: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono"
              placeholder="https://www.mosewear.com/nl/winkel/{{slug}}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Gebruik <code>{'{{slug}}'}</code> als placeholder. Wordt vervangen door de productslug bij publish.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Access token</label>
            <textarea
              value={form.access_token}
              onChange={(e) => setForm({ ...form, access_token: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono"
              placeholder="EAAB...  (System User token, nooit gebruikerstoken)"
            />
            <p className="text-xs text-gray-500 mt-1">
              We tonen de token nooit terug; bij het opslaan wordt het in <code>meta_credentials</code> geschreven.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveCredential}
            disabled={busy}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Opslaan
          </button>
        </div>

        {credentials.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Opgeslagen credentials</h3>
            <div className="space-y-2">
              {credentials.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-gray-600">
                      ad_account: <code>{c.ad_account_id}</code> · business: <code>{c.business_id}</code>
                    </div>
                    <div className="text-xs text-gray-500">
                      token: <code>{c.access_token_mask}</code>
                      {c.token_expires_at && (
                        <>
                          {' '}
                          · verloopt {new Date(c.token_expires_at).toLocaleDateString('nl-NL')}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => testCredential(c.label)}
                      disabled={testingLabel === c.label}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      <Plug className="w-4 h-4" />
                      {testingLabel === c.label ? 'Testen…' : 'Test verbinding'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCredential(c.id)}
                      disabled={busy || testingLabel === c.label}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Verwijder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">AI-provider &amp; model</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value as SettingsState['provider'] })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="openai">OpenAI</option>
              <option value="mock">Mock (alleen smoke-tests)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Mock verbrandt geen tokens en geeft altijd een veilige no_op terug. Gebruik openai voor productie.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              <code>gpt-5.5</code> is de standaard — vlaggenschip-model met sterke reasoning op SKU-economics. Daily-audit kost ≈ €6/maand bij dagelijkse runs.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Prompt-override</label>
            <input
              type="text"
              value={settings.promptOverride}
              onChange={(e) => setSettings({ ...settings, promptOverride: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="leeg laten = v1-daily-audit@1.0.0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alleen vullen wanneer er een nieuwe prompt-versie is uitgerold. Wij vergelijken de hash voor reproducibility.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Creative pipeline</h3>
          <p className="text-xs text-gray-600 mb-4">
            Knobs voor de AI image generator (gebruikt op <code>/admin/ai-campaigns/creatives</code>). De budget-cap geldt voor Replicate en OpenAI samen.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Maandbudget (EUR)</label>
              <input
                type="number"
                min={0}
                step={10}
                value={settings.creativeMonthlyCapEur}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    creativeMonthlyCapEur: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Runs worden geweigerd zodra MTD + verwachte run-kosten boven deze cap uitkomen.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Standaard model</label>
              <select
                value={settings.creativeDefaultModel}
                onChange={(e) => setSettings({ ...settings, creativeDefaultModel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {CREATIVE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Provider wordt automatisch gekozen op basis van de prefix (gpt-image-* → OpenAI).
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Auto-approve</label>
              <label className="inline-flex items-center gap-2 mt-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.creativeAutoApprove}
                  onChange={(e) => setSettings({ ...settings, creativeAutoApprove: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Variants die alle QA-drempels halen direct goedkeuren
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Uit zetten om altijd handmatig te reviewen (veiliger bij eerste batches).
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveSettings}
            disabled={!dirtySettings || busy}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Opslaan
          </button>
          {dirtySettings && (
            <button
              type="button"
              onClick={() => setSettings(initialSettings)}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Herstel
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
