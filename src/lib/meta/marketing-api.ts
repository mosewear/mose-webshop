/**
 * Meta Marketing API client (Graph API v22+).
 *
 * Used server-side by the AI Campaign Autopilot to read campaign
 * performance and execute mutations (budget edits, status changes,
 * audience uploads). Authenticates with a Meta Business System User
 * token from the MOSE Business Developer App — see meta_credentials
 * row "mose_primary" or env fallback.
 *
 * Design choices:
 *  - One thin Graph wrapper; the optimizer composes higher-level
 *    workflows on top.
 *  - Rate-limited: Meta enforces ~200 calls/hour/user-account-pair.
 *    The wrapper honours `X-Business-Use-Case-Usage` headers and
 *    backs off exponentially with jitter.
 *  - Retries on transient (5xx, 429, 1, 2, 4, 17, 32, 613).
 *  - Service-role only: never import this module from a Client
 *    Component or unauthenticated route handler.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

const GRAPH_VERSION = 'v22.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

// Transient error subcodes per Meta docs that justify a retry.
const RETRYABLE_ERROR_CODES = new Set([1, 2, 4, 17, 32, 613])

export interface MetaCredentials {
  business_id: string
  ad_account_id: string
  access_token: string
  pixel_id: string | null
  page_id?: string | null
  default_link_template?: string | null
}

export interface MetaApiError extends Error {
  code?: number
  subcode?: number
  type?: string
  fbtrace_id?: string
  is_transient?: boolean
  status?: number
}

interface RawError {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
  fbtrace_id?: string
}

function buildError(body: { error?: RawError } | undefined, status: number): MetaApiError {
  const raw = body?.error ?? {}
  const err = new Error(raw.message || `Meta API error (${status})`) as MetaApiError
  err.code = raw.code
  err.subcode = raw.error_subcode
  err.type = raw.type
  err.fbtrace_id = raw.fbtrace_id
  err.status = status
  err.is_transient = status === 429 || (status >= 500 && status < 600) || (raw.code != null && RETRYABLE_ERROR_CODES.has(raw.code))
  return err
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface FetchCredentialsOptions {
  label?: string
  /** If provided, env fallback is used when the DB row is missing. */
  envFallback?: boolean
}

/**
 * Load Meta credentials from the meta_credentials table, falling back
 * to env vars when no row exists for the requested label. Env fallback
 * is on by default so first-time setup works before the admin saves a
 * row through the UI.
 */
export async function getMetaCredentials(opts: FetchCredentialsOptions = {}): Promise<MetaCredentials> {
  const label = opts.label ?? 'mose_primary'
  const envFallback = opts.envFallback ?? true

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('meta_credentials')
    .select('business_id, ad_account_id, access_token, pixel_id, page_id, default_link_template')
    .eq('label', label)
    .maybeSingle()

  if (error) {
    throw new Error(`[MetaAPI] Failed to load credentials: ${error.message}`)
  }

  if (data) {
    return data as MetaCredentials
  }

  if (!envFallback) {
    throw new Error(`[MetaAPI] No credentials row for label "${label}" and env fallback disabled`)
  }

  const business_id = process.env.META_BUSINESS_ID || ''
  const ad_account_id = process.env.META_AD_ACCOUNT_ID || ''
  const access_token = process.env.META_SYSTEM_USER_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || ''

  if (!business_id || !ad_account_id || !access_token) {
    throw new Error('[MetaAPI] Missing META_BUSINESS_ID / META_AD_ACCOUNT_ID / META_SYSTEM_USER_TOKEN env vars')
  }

  return {
    business_id,
    ad_account_id,
    access_token,
    pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
    page_id: process.env.META_PAGE_ID || null,
    default_link_template: process.env.META_DEFAULT_LINK_TEMPLATE || null,
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  searchParams?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown>
  retries?: number
  retryDelayMs?: number
}

/**
 * Core Graph request: applies access token, retries transient errors
 * with exponential backoff + jitter, and rejects with a typed error.
 */
async function graphFetch<T>(
  credentials: MetaCredentials,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', searchParams = {}, body, retries = 4, retryDelayMs = 500 } = options
  const url = new URL(`${GRAPH_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('access_token', credentials.access_token)
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }

  let attempt = 0
  let lastError: MetaApiError | undefined

  while (attempt <= retries) {
    let response: Response
    try {
      response = await fetch(url.toString(), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (networkError) {
      lastError = buildError({ error: { message: (networkError as Error).message } }, 0)
      lastError.is_transient = true
      if (attempt >= retries) throw lastError
      await sleep(retryDelayMs * 2 ** attempt + Math.random() * 200)
      attempt++
      continue
    }

    if (response.ok) {
      const json = (await response.json().catch(() => ({}))) as T
      return json
    }

    const errorBody = (await response.json().catch(() => undefined)) as { error?: RawError } | undefined
    const err = buildError(errorBody, response.status)
    lastError = err

    if (!err.is_transient || attempt >= retries) {
      throw err
    }
    await sleep(retryDelayMs * 2 ** attempt + Math.random() * 200)
    attempt++
  }

  throw lastError ?? new Error('[MetaAPI] Exhausted retries with no error captured')
}

export interface MetaPagedResponse<T> {
  data: T[]
  paging?: {
    cursors?: { before?: string; after?: string }
    next?: string
    previous?: string
  }
}

async function paginateAll<T>(
  credentials: MetaCredentials,
  path: string,
  searchParams: Record<string, string | number | boolean | undefined>,
  limit = 200,
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = []
  let after: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const page = await graphFetch<MetaPagedResponse<T>>(credentials, path, {
      searchParams: { ...searchParams, limit, after },
    })
    if (page?.data?.length) all.push(...page.data)
    after = page?.paging?.cursors?.after
    if (!after || !page?.paging?.next) break
  }
  return all
}

// -----------------------------------------------------------------------
// Public API surface — kept intentionally narrow for Phase 0.
// Higher-level workflows (creative upload, audience sync) land in later
// phases on top of these primitives.
// -----------------------------------------------------------------------

export interface AdAccount {
  id: string
  account_id?: string
  name?: string
  account_status?: number
  currency?: string
  timezone_name?: string
  business?: { id: string; name?: string }
  amount_spent?: string
  balance?: string
}

export interface Campaign {
  id: string
  name?: string
  status?: string
  effective_status?: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
}

export interface AdSet {
  id: string
  name?: string
  status?: string
  effective_status?: string
  campaign_id?: string
  daily_budget?: string
  lifetime_budget?: string
  optimization_goal?: string
  bid_strategy?: string
  targeting?: Record<string, unknown>
}

export interface Ad {
  id: string
  name?: string
  status?: string
  effective_status?: string
  adset_id?: string
  campaign_id?: string
  creative?: { id: string }
}

export interface InsightRow {
  date_start: string
  date_stop: string
  account_id?: string
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  campaign_name?: string
  adset_name?: string
  ad_name?: string
  spend?: string
  impressions?: string
  clicks?: string
  ctr?: string
  cpm?: string
  cpc?: string
  frequency?: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
  inline_link_clicks?: string
}

export class MetaMarketingClient {
  constructor(private readonly credentials: MetaCredentials) {}

  static async fromDb(opts?: FetchCredentialsOptions) {
    const credentials = await getMetaCredentials(opts)
    return new MetaMarketingClient(credentials)
  }

  get adAccountId(): string {
    return this.credentials.ad_account_id.startsWith('act_')
      ? this.credentials.ad_account_id
      : `act_${this.credentials.ad_account_id}`
  }

  async getAdAccount(fields = ['id', 'account_id', 'name', 'account_status', 'currency', 'timezone_name', 'business', 'amount_spent', 'balance']): Promise<AdAccount> {
    return graphFetch<AdAccount>(this.credentials, `/${this.adAccountId}`, {
      searchParams: { fields: fields.join(',') },
    })
  }

  async getCampaigns(fields: string[] = ['id', 'name', 'status', 'effective_status', 'objective', 'daily_budget', 'lifetime_budget', 'start_time', 'stop_time']): Promise<Campaign[]> {
    return paginateAll<Campaign>(this.credentials, `/${this.adAccountId}/campaigns`, {
      fields: fields.join(','),
    })
  }

  async getAdSets(fields: string[] = ['id', 'name', 'status', 'effective_status', 'campaign_id', 'daily_budget', 'lifetime_budget', 'optimization_goal', 'bid_strategy', 'targeting']): Promise<AdSet[]> {
    return paginateAll<AdSet>(this.credentials, `/${this.adAccountId}/adsets`, {
      fields: fields.join(','),
    })
  }

  /**
   * Fetch a single ad set by id. Cheaper than `getAdSets()` when we
   * only need the prior_state row before mutating — the executor calls
   * this for every budget/pause action.
   */
  async getAdSet(adSetId: string, fields: string[] = ['id', 'name', 'status', 'effective_status', 'campaign_id', 'daily_budget', 'lifetime_budget']): Promise<AdSet> {
    return graphFetch<AdSet>(this.credentials, `/${adSetId}`, {
      searchParams: { fields: fields.join(',') },
    })
  }

  async getCampaign(campaignId: string, fields: string[] = ['id', 'name', 'status', 'effective_status', 'objective', 'daily_budget', 'lifetime_budget']): Promise<Campaign> {
    return graphFetch<Campaign>(this.credentials, `/${campaignId}`, {
      searchParams: { fields: fields.join(',') },
    })
  }

  async getAd(adId: string, fields: string[] = ['id', 'name', 'status', 'effective_status', 'adset_id', 'campaign_id']): Promise<Ad> {
    return graphFetch<Ad>(this.credentials, `/${adId}`, {
      searchParams: { fields: fields.join(',') },
    })
  }

  async getAds(fields: string[] = ['id', 'name', 'status', 'effective_status', 'adset_id', 'campaign_id', 'creative']): Promise<Ad[]> {
    return paginateAll<Ad>(this.credentials, `/${this.adAccountId}/ads`, {
      fields: fields.join(','),
    })
  }

  /**
   * Fetch insights with sensible defaults for the autopilot's daily
   * snapshot. Pass `level: 'ad'` to drill down; default is account.
   */
  async getInsights(opts: {
    level?: 'account' | 'campaign' | 'adset' | 'ad'
    datePreset?: 'today' | 'yesterday' | 'last_3d' | 'last_7d' | 'last_14d' | 'last_28d' | 'last_30d' | 'last_90d'
    timeRange?: { since: string; until: string }
    fields?: string[]
    breakdowns?: string[]
    actionAttribution?: '1d_view' | '7d_click' | '1d_view_7d_click'
  } = {}): Promise<InsightRow[]> {
    const fields = opts.fields ?? [
      'spend',
      'impressions',
      'clicks',
      'inline_link_clicks',
      'ctr',
      'cpm',
      'cpc',
      'frequency',
      'actions',
      'action_values',
    ]
    const searchParams: Record<string, string> = {
      level: opts.level ?? 'account',
      fields: fields.join(','),
    }
    if (opts.datePreset) searchParams.date_preset = opts.datePreset
    if (opts.timeRange) searchParams.time_range = JSON.stringify(opts.timeRange)
    if (opts.breakdowns?.length) searchParams.breakdowns = opts.breakdowns.join(',')
    if (opts.actionAttribution) {
      searchParams.action_attribution_windows = JSON.stringify([opts.actionAttribution])
    }

    return paginateAll<InsightRow>(this.credentials, `/${this.adAccountId}/insights`, searchParams)
  }

  /**
   * Update one or more fields on an ad set. Caller is responsible for
   * passing only safe fields (e.g. daily_budget in minor units, status).
   */
  async updateAdSet(adSetId: string, payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return graphFetch<{ success: boolean }>(this.credentials, `/${adSetId}`, {
      method: 'POST',
      body: payload,
    })
  }

  async updateCampaign(campaignId: string, payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return graphFetch<{ success: boolean }>(this.credentials, `/${campaignId}`, {
      method: 'POST',
      body: payload,
    })
  }

  async updateAd(adId: string, payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return graphFetch<{ success: boolean }>(this.credentials, `/${adId}`, {
      method: 'POST',
      body: payload,
    })
  }

  /**
   * Pause an ad set. Convenience wrapper around updateAdSet — the
   * autopilot's OOS-pause cron and the bounded-autonomy guardrails both
   * call this rather than poking the raw mutation.
   */
  async pauseAdSet(adSetId: string): Promise<{ success: boolean }> {
    return this.updateAdSet(adSetId, { status: 'PAUSED' })
  }

  async resumeAdSet(adSetId: string): Promise<{ success: boolean }> {
    return this.updateAdSet(adSetId, { status: 'ACTIVE' })
  }

  /**
   * Set a new daily budget on an ad set. Budget is in MINOR currency
   * units (cents for EUR). Caller must convert before passing.
   */
  async setAdSetDailyBudget(adSetId: string, dailyBudgetMinorUnits: number): Promise<{ success: boolean }> {
    if (!Number.isInteger(dailyBudgetMinorUnits) || dailyBudgetMinorUnits <= 0) {
      throw new Error(`[MetaAPI] Invalid budget ${dailyBudgetMinorUnits}; must be positive integer in minor units`)
    }
    return this.updateAdSet(adSetId, { daily_budget: dailyBudgetMinorUnits })
  }

  get pageId(): string | null {
    return this.credentials.page_id ?? null
  }

  get linkTemplate(): string {
    return this.credentials.default_link_template || 'https://www.mosewear.com/nl/winkel/{{slug}}'
  }

  /**
   * Upload image bytes to the ad account, returning the deduped image
   * hash that AdCreative.object_story_spec.link_data.image_hash expects.
   *
   * Meta accepts the image either as a multipart `source` file OR as a
   * base64 `bytes` field on the JSON body — we use `bytes` so the call
   * goes through the existing `graphFetch` retry path.
   */
  async uploadAdImage(buffer: Buffer): Promise<{ hash: string; url?: string }> {
    if (!buffer.length) throw new Error('[MetaAPI] uploadAdImage: empty buffer')
    const base64 = buffer.toString('base64')
    const response = await graphFetch<{ images?: Record<string, { hash: string; url?: string }> }>(
      this.credentials,
      `/${this.adAccountId}/adimages`,
      { method: 'POST', body: { bytes: base64 } },
    )
    const entry = Object.values(response.images ?? {})[0]
    if (!entry?.hash) throw new Error('[MetaAPI] uploadAdImage: no hash returned')
    return entry
  }

  /**
   * Build the canonical link_data structure used by single-image link
   * ads, then create the AdCreative. Returns the new creative id.
   */
  async createLinkAdCreative(args: {
    name: string
    link: string
    message: string
    image_hash: string
    headline?: string
    description?: string
    call_to_action?: string
  }): Promise<{ id: string }> {
    if (!this.pageId) {
      throw new Error('[MetaAPI] page_id ontbreekt — vul deze in via /admin/ai-campaigns/config voordat je publiceert.')
    }
    const cta = args.call_to_action || 'SHOP_NOW'
    const body = {
      name: args.name.slice(0, 255),
      object_story_spec: {
        page_id: this.pageId,
        link_data: {
          link: args.link,
          message: args.message.slice(0, 1500),
          name: args.headline?.slice(0, 90),
          description: args.description?.slice(0, 200),
          call_to_action: { type: cta },
          image_hash: args.image_hash,
        },
      },
    }
    return graphFetch<{ id: string }>(this.credentials, `/${this.adAccountId}/adcreatives`, {
      method: 'POST',
      body,
    })
  }

  /**
   * Optional: attach an AdCreative to an existing ad set as a new (paused
   * by default) Ad. Used when the admin wants to A/B against the current
   * creative without touching the ad set targeting.
   */
  async createAd(args: {
    name: string
    adset_id: string
    creative_id: string
    status?: 'ACTIVE' | 'PAUSED'
  }): Promise<{ id: string }> {
    return graphFetch<{ id: string }>(this.credentials, `/${this.adAccountId}/ads`, {
      method: 'POST',
      body: {
        name: args.name.slice(0, 255),
        adset_id: args.adset_id,
        creative: { creative_id: args.creative_id },
        status: args.status ?? 'PAUSED',
      },
    })
  }
}
