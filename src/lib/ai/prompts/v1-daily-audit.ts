/**
 * Prompt v1 — Daily Audit
 *
 * Used by the autopilot's once-per-day decision run to look at the past
 * 24h–14d of paid-traffic performance against MOSE's first-party data
 * (margin, stock, returns, LTV, demand signals) and propose actions.
 *
 * Versioning rules:
 *  - Bump the `version` constant on any non-trivial change.
 *  - Never silently change behaviour. Old decisions keep their original
 *    prompt_version + prompt_hash for reproducibility.
 *  - Keep the contract narrow: the LLM ONLY returns structured JSON
 *    matching `AutopilotDecisionSchema` — never free-form text outside
 *    that. The system prompt instructs this explicitly and the AI SDK's
 *    `generateObject` enforces it.
 */

import crypto from 'crypto'
import type {
  CampaignSnapshotRow,
  GuardrailConfig,
  OptimizerSignalRow,
} from '@/lib/ai/types'
import type { ActivePromoCode } from '@/lib/ai/pricing-context'

export const PROMPT_VERSION = 'v1-daily-audit@1.1.0'

const SYSTEM_PROMPT = `Je bent de AI-strateeg achter MOSE WEAR, een Nederlands streetwear-merk dat campagnes draait via Meta Ads (Facebook + Instagram).

Je MISSIE: maximaliseer contributie-marge (niet ruwe ROAS) van MOSE's betaalde verkeer. Marge weegt zwaarder dan omzet of CPM. Negeer "vanity"-cijfers zonder marge-impact.

Belangrijke principes:
1. Marge boven omzet — een €1.000 ad set die negatieve marge draait moet pauzeren, ongeacht ROAS.
2. Voorraad-aware — adverteer NOOIT actief op SKUs die out-of-stock zijn. Resume zodra voorraad terug is + er pending back-in-stock-signups zijn.
3. Returns-aware — SKUs met een hoge retour-ratio (>30%) krijgen lagere prioriteit; SKUs met lage retouren (<5%) en hoge marge zijn winners.
4. Audience-strategie — pas exclusion lists toe op terugkerende refunders en zware retourners; LTV-cohorten zijn primaire prospect-doelgroep.
5. Voorzichtig — bij twijfel: kies "no_op" met motivatie. Eén keer een fout is duurder dan een gemiste optimalisatie.
6. Risico-awareness — combineer altijd kleine stappen met een breed audit-pad. Liever 10 kleine bewezen wins dan 1 grote gok.
7. Pricing-aware — SKUs op SALE krijgen prioriteit voor scale (urgency drijft conversie), maar pas op de marge-floor. SKUs met een actieve STAFFEL-korting (volume-discount) zijn kandidaten voor "set-completion" creatives (twee-shot, multi-buy framing). Een actieve PROMO-CODE betekent dat er extra topline conversie mogelijk is — leen er max 1 keer per dag op (vermijd "korting-fatigue"). Staffel-kortingen GELDEN NIET wanneer een product al op sale is — broadcast niet beide tegelijk.

Je krijgt steeds:
- Guardrails (harde plafonds; overtreden → actie wordt geblokkeerd)
- Per-SKU signalen (voorraad, sales 7d/30d, retouren, marge)
- Per-campagne Meta-snapshots (spend, ROAS, CTR, frequency, conversies)

Je OUTPUT is een JSON-object met strict schema:
- summary: korte samenvatting van de situatie en strategie (5 zinnen max)
- risk_level: low/medium/high
- actions: array van voorgestelde acties (max 20). Elke actie heeft action_type, target en payload.
- followups: vragen of ontbrekende data die je volgende keer wil hebben

Belangrijke output-regels:
- Voorgestelde budget-aanpassingen gebruiken \`budget_change_ratio\` (fractie tussen -0.5 en +0.5). Bv. -0.20 = -20% budget. Houd je aan max_budget_change_pct.
- Voor "pause"-acties: leg in payload.rationale uit waarom pauze beter is dan budgetverlaging.
- Voor "no_op"-acties: geef target.level = "account", target.meta_id = "n/a", payload.rationale legt uit waarom niets doen het beste is.
- Verzin GEEN audience- of creative-IDs die niet in de input staan. Als je geen geldig meta_id hebt, gebruik dan target.meta_id = "n/a" en motiveer waarom de actie tóch zinvol is.
- Geef NOOIT meer dan 20 acties. Prioriteer de hoogste verwachte marge-impact.`

const COMPACT_NUMBER = (v: number | string | null | undefined, digits = 2): string => {
  if (v === null || v === undefined) return 'n/a'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 'n/a'
  return n.toFixed(digits)
}

/**
 * Render the user-facing context message. Compact, structured, easy for
 * the model to skim. Keep verbosity in check: large prompts both cost
 * tokens and degrade quality past ~200 SKUs / ~200 ad-set rows.
 */
function buildUserMessage(input: {
  guardrails: GuardrailConfig
  signals: OptimizerSignalRow[]
  snapshots: CampaignSnapshotRow[]
  promos?: ActivePromoCode[]
  now: Date
}): string {
  const { guardrails, signals, snapshots, promos = [], now } = input

  // Bucket SKUs into actionable slices so the model doesn't drown in raw rows.
  const oos = signals
    .filter((s) => (Number(s.current_stock) || 0) <= 0 && (Number(s.units_sold_30d) || 0) > 0)
    .slice(0, 25)
  const lowMargin = signals
    .filter((s) => {
      const m = Number(s.contribution_margin_per_unit)
      return Number.isFinite(m) && m < (Number(s.effective_price) || 0) * guardrails.minMarginPctFloor
    })
    .sort((a, b) => Number(b.gross_revenue_30d) - Number(a.gross_revenue_30d))
    .slice(0, 25)
  const winners = signals
    .filter((s) => {
      const m = Number(s.contribution_margin_30d)
      const r = s.return_rate_30d === null ? null : Number(s.return_rate_30d)
      return Number.isFinite(m) && m > 0 && (Number(s.current_stock) || 0) > 5 && (r === null || r < 0.15)
    })
    .sort((a, b) => Number(b.contribution_margin_30d) - Number(a.contribution_margin_30d))
    .slice(0, 25)
  const highReturns = signals
    .filter((s) => {
      const r = s.return_rate_30d === null ? null : Number(s.return_rate_30d)
      return r !== null && r > 0.3 && Number(s.units_sold_30d) >= 5
    })
    .sort((a, b) => Number(b.return_rate_30d) - Number(a.return_rate_30d))
    .slice(0, 15)
  const bisDemand = signals
    .filter((s) => Number(s.pending_back_in_stock_signups) > 0)
    .sort((a, b) => Number(b.pending_back_in_stock_signups) - Number(a.pending_back_in_stock_signups))
    .slice(0, 15)
  const missingEcon = signals.filter((s) => !s.has_variant_econ && !s.has_product_econ).length
  const totalActive = signals.length

  // Snapshots: latest entry per (meta_entity_id, entity_level). We take
  // the highest snapshot_date per entity so the model sees the most
  // recent perspective.
  const latestByEntity = new Map<string, CampaignSnapshotRow>()
  for (const row of snapshots) {
    const existing = latestByEntity.get(row.meta_entity_id)
    if (!existing || row.snapshot_date > existing.snapshot_date) {
      latestByEntity.set(row.meta_entity_id, row)
    }
  }
  const latestSnapshots = Array.from(latestByEntity.values())
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 40)

  const formatSku = (s: OptimizerSignalRow): string => {
    const margin = COMPACT_NUMBER(s.contribution_margin_per_unit)
    const rrate =
      s.return_rate_30d !== null && s.return_rate_30d !== undefined
        ? `${(Number(s.return_rate_30d) * 100).toFixed(0)}%`
        : 'n/a'
    const price = COMPACT_NUMBER(s.effective_price)
    const tags: string[] = []
    if (s.has_active_sale) tags.push(`SALE -${Number(s.sale_off_pct ?? 0)}%`)
    if (s.has_active_staffel) {
      const off = s.staffel_max_pct_off
        ? `-${Number(s.staffel_max_pct_off)}%`
        : s.staffel_max_fixed_off
          ? `-€${COMPACT_NUMBER(s.staffel_max_fixed_off)}`
          : 'staffel'
      tags.push(`STAFFEL ${s.deepest_min_quantity ?? '?'}+ ${off}`)
    }
    const tagStr = tags.length > 0 ? ` | ${tags.join(' ')}` : ''
    return `- ${s.sku ?? '—'} | ${s.product_name} ${s.size ? `(${s.size}${s.color ? '/' + s.color : ''})` : ''} | price €${price}${tagStr} | stock ${s.current_stock ?? 'n/a'} | sold30d ${COMPACT_NUMBER(s.units_sold_30d, 0)} | rev30d €${COMPACT_NUMBER(s.gross_revenue_30d)} | margin/unit €${margin} | return30d ${rrate} | bis ${s.pending_back_in_stock_signups}`
  }

  const formatSnapshot = (s: CampaignSnapshotRow): string => {
    const roas = Number(s.spend) > 0 ? (Number(s.attributed_revenue) / Number(s.spend)).toFixed(2) : 'n/a'
    return `- ${s.entity_level}:${s.meta_entity_id} (${s.name ?? '—'}) | status ${s.status ?? '—'} | spend €${COMPACT_NUMBER(s.spend)} | impr ${COMPACT_NUMBER(s.impressions, 0)} | clicks ${COMPACT_NUMBER(s.clicks, 0)} | ctr ${COMPACT_NUMBER(s.ctr, 3)} | freq ${COMPACT_NUMBER(s.frequency, 2)} | purchases ${COMPACT_NUMBER(s.attributed_purchases, 0)} | revenue €${COMPACT_NUMBER(s.attributed_revenue)} | roas ${roas}`
  }

  // Bucket SKUs with active pricing flags for high-signal prompt sections.
  const onSale = signals
    .filter((s) => s.has_active_sale === true)
    .sort((a, b) => Number(b.sale_off_pct ?? 0) - Number(a.sale_off_pct ?? 0))
    .slice(0, 20)
  const onStaffel = signals
    .filter((s) => s.has_active_staffel === true)
    .sort((a, b) => Number(b.deepest_min_quantity ?? 0) - Number(a.deepest_min_quantity ?? 0))
    .slice(0, 20)

  const promoBlock = promos.length === 0
    ? '(geen actieve algemene promo-codes)'
    : promos
        .map((p) => {
          const disc =
            p.discount_type === 'percentage'
              ? `${p.discount_value}%`
              : `€${p.discount_value.toFixed(2)}`
          const minOrder = p.min_order_value ? ` (min order €${p.min_order_value.toFixed(2)})` : ''
          const exp = p.expires_in_days != null ? ` — verloopt over ${p.expires_in_days}d` : ''
          return `- ${p.code}: ${disc}${minOrder}${exp}`
        })
        .join('\n')

  return `--- CONTEXT ---
Tijdstip nu (Europe/Amsterdam): ${now.toISOString()}
Modus: ${guardrails.mode}
Killswitch: ${guardrails.enabled ? 'aan' : 'UIT — actie-uitvoering geblokkeerd ongeacht jouw output'}

--- GUARDRAILS ---
- Max budget-aanpassing per actie: ±${(guardrails.maxBudgetChangePct * 100).toFixed(0)}%
- Max totale budget-shift / 24u: €${guardrails.maxDailySpendShiftEur}
- Accountspend hardcap / dag: €${guardrails.accountSpendCapEur}
- Marge-floor: ${(guardrails.minMarginPctFloor * 100).toFixed(0)}% (onder deze marge mag je alleen budget verlagen, nooit verhogen)
- Werkuren: ${String(guardrails.workingHoursStart).padStart(2, '0')}:00 – ${String(guardrails.workingHoursEnd).padStart(2, '0')}:00 ${guardrails.workingHoursTz}
- Revert window: ${guardrails.revertWindowDays} dagen

--- SKU PORTFOLIO ---
Actieve SKUs gevoed in deze run: ${totalActive}
SKUs zonder cost-data: ${missingEcon} (margebepaling onmogelijk — schat conservatief)

OUT-OF-STOCK met recente sales (max 25 getoond):
${oos.length === 0 ? '(geen)' : oos.map(formatSku).join('\n')}

LOW-MARGIN SKUs onder marge-floor (max 25):
${lowMargin.length === 0 ? '(geen)' : lowMargin.map(formatSku).join('\n')}

WINNERS — hoge marge + voorraad + lage retouren (max 25):
${winners.length === 0 ? '(geen)' : winners.map(formatSku).join('\n')}

HIGH-RETURN-RATE SKUs (>30% / min 5 sold; max 15):
${highReturns.length === 0 ? '(geen)' : highReturns.map(formatSku).join('\n')}

BACK-IN-STOCK demand (top 15):
${bisDemand.length === 0 ? '(geen)' : bisDemand.map(formatSku).join('\n')}

ACTIEVE SALES (top 20 op % off):
${onSale.length === 0 ? '(geen producten op sale)' : onSale.map(formatSku).join('\n')}

ACTIEVE STAFFEL-KORTINGEN (top 20 op diepte; sale-producten zijn al uitgesloten):
${onStaffel.length === 0 ? '(geen actieve staffels op niet-sale producten)' : onStaffel.map(formatSku).join('\n')}

ACTIEVE PROMO-CODES (algemeen / breed inzetbaar — geen subscriber-specifiek):
${promoBlock}

--- META AD SNAPSHOTS (laatste per entity, top 40 op spend) ---
${latestSnapshots.length === 0 ? '(geen Meta-data beschikbaar — vermoedelijk omdat ad_campaign_snapshots nog niet ingediend zijn; geef "no_op" met aanbeveling)' : latestSnapshots.map(formatSnapshot).join('\n')}

--- JE TAAK ---
Produceer een gestructureerd JSON-object conform het schema dat is opgegeven. Geen extra velden, geen vrije tekst buiten het schema.`
}

export interface RenderedPrompt {
  systemPrompt: string
  userMessage: string
  promptHash: string
  promptVersion: string
}

export function renderDailyAuditPrompt(input: {
  guardrails: GuardrailConfig
  signals: OptimizerSignalRow[]
  snapshots: CampaignSnapshotRow[]
  promos?: ActivePromoCode[]
  now?: Date
}): RenderedPrompt {
  const userMessage = buildUserMessage({ ...input, now: input.now ?? new Date() })
  const promptHash = crypto
    .createHash('sha256')
    .update(SYSTEM_PROMPT)
    .update('\u241F')
    .update(userMessage)
    .digest('hex')

  return {
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    promptHash,
    promptVersion: PROMPT_VERSION,
  }
}
