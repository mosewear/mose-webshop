'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Play,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  RefreshCw,
  Check,
  X,
  Archive,
  Send,
  ExternalLink,
} from 'lucide-react'

interface ProductOption {
  id: string
  name: string
  slug: string
}

interface SceneOption {
  id: string
  label: string
  scene_type: string
  reference_image_url: string
}

interface RunRow {
  id: string
  source_product_id: string
  scene_id: string
  provider: string
  model: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  total_variants: number
  total_cost_usd: number | null
  started_at: string
  completed_at: string | null
  error_message: string | null
}

interface VariantRow {
  id: string
  run_id: string
  variant_index: number
  output_url: string
  thumbnail_url: string | null
  ssim_score: number | null
  palette_distance: number | null
  brand_color_pass: boolean | null
  ad_policy_pass: boolean | null
  ad_policy_issues: string[]
  qa_notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'archived'
  reviewed_at: string | null
  meta_creative_id: string | null
  published_to_meta_at: string | null
}

interface PublishDraft {
  variantId: string
  headline: string
  message: string
  description: string
  link_override: string
  attach_to_adset_id: string
  call_to_action: string
  locale: 'nl' | 'en'
}

interface OfferPreview {
  base_price: number | null
  sale_price: number | null
  effective_price: number | null
  has_active_sale: boolean
  sale_off_pct: number
  has_active_staffel: boolean
  staffel_tiers: Array<{ label_nl: string; label_en: string }>
  has_active_promo: boolean
  promo_codes: string[]
  offer_copy_nl: string
  offer_copy_en: string
}

interface RunDetail {
  run: RunRow
  variants: VariantRow[]
  product: { id: string; name: string; slug: string } | null
  scene: { id: string; label: string; scene_type: string; reference_image_url: string } | null
}

const MODEL_OPTIONS = [
  { id: 'black-forest-labs/flux-kontext-pro', label: 'Flux Kontext Pro — Replicate (default, ~$0,04/s)' },
  { id: 'black-forest-labs/flux-1.1-pro', label: 'Flux 1.1 Pro — Replicate' },
  { id: 'black-forest-labs/flux-schnell', label: 'Flux Schnell — Replicate (snel + goedkoop)' },
  { id: 'gpt-image-2', label: 'GPT Image 2 — OpenAI (nieuwste, ~$0,20/img)' },
  { id: 'gpt-image-1.5', label: 'GPT Image 1.5 — OpenAI (~$0,18/img)' },
  { id: 'gpt-image-1', label: 'GPT Image 1 — OpenAI (~$0,17/img)' },
  { id: 'gpt-image-1-mini', label: 'GPT Image 1 mini — OpenAI (~$0,04/img)' },
]

const STATUS_COLORS: Record<RunRow['status'], string> = {
  queued: 'bg-blue-50 text-blue-700 border-blue-200',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
}

const VARIANT_BADGES: Record<VariantRow['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  published: 'bg-blue-50 text-blue-800 border-blue-200',
  archived: 'bg-gray-50 text-gray-700 border-gray-200',
}

export default function CreativesPage() {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [scenes, setScenes] = useState<SceneOption[]>([])
  const [runs, setRuns] = useState<RunRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, RunDetail>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null)
  const [offerPreview, setOfferPreview] = useState<OfferPreview | null>(null)
  const [offerPreviewLoading, setOfferPreviewLoading] = useState(false)

  // Run form state
  const [productId, setProductId] = useState('')
  const [sceneId, setSceneId] = useState('')
  const [model, setModel] = useState(MODEL_OPTIONS[0].id)
  const [numVariants, setNumVariants] = useState(2)
  const [provider, setProvider] = useState<'replicate' | 'mock'>('replicate')
  const [extraHint, setExtraHint] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [productsRes, scenesRes, runsRes] = await Promise.all([
        fetch('/api/admin/ai-campaigns/economics', { cache: 'no-store' }),
        fetch('/api/admin/ai-campaigns/scenes', { cache: 'no-store' }),
        fetch('/api/admin/ai-campaigns/creatives/runs', { cache: 'no-store' }),
      ])
      const productsBody = await productsRes.json()
      const scenesBody = await scenesRes.json()
      const runsBody = await runsRes.json()
      if (!productsRes.ok) throw new Error(productsBody.error || 'Producten laden mislukt')
      if (!scenesRes.ok) throw new Error(scenesBody.error || 'Scenes laden mislukt')
      if (!runsRes.ok) throw new Error(runsBody.error || 'Runs laden mislukt')

      const pList: ProductOption[] = (productsBody.products || []).map((p: { id: string; name: string; slug: string }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      }))
      setProducts(pList)
      setScenes(scenesBody.scenes || [])
      setRuns(runsBody.rows || [])
      if (!productId && pList.length > 0) setProductId(pList[0].id)
      if (!sceneId && (scenesBody.scenes || []).length > 0) setSceneId(scenesBody.scenes[0].id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [productId, sceneId])

  useEffect(() => {
    load()
  }, [load])

  const startRun = async () => {
    if (!productId || !sceneId) return setError('Selecteer een product en scene.')
    try {
      setBusy(true)
      setError(null)
      setMessage(null)
      const res = await fetch('/api/admin/ai-campaigns/creatives/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          scene_id: sceneId,
          model,
          num_variants: numVariants,
          // Only forward 'mock' explicitly — for paid providers we let
          // the orchestrator auto-detect based on the model id prefix
          // (gpt-image-* → OpenAI, anything else → Replicate).
          ...(provider === 'mock' ? { provider: 'mock' as const } : {}),
          extra_prompt_hint: extraHint.trim() || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || 'Run mislukt')
      }
      setMessage(
        `Run klaar (${body.generated}/${numVariants} variants, $${(body.cost_usd ?? 0).toFixed(4)} / €${(
          body.cost_eur ?? 0
        ).toFixed(4)}).`,
      )
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (details[id]) return
    try {
      const res = await fetch(`/api/admin/ai-campaigns/creatives/runs?id=${id}`, { cache: 'no-store' })
      const body = (await res.json()) as RunDetail | { error?: string }
      if (!res.ok) throw new Error((body as { error?: string }).error || 'Detail laden mislukt')
      setDetails((d) => ({ ...d, [id]: body as RunDetail }))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const openPublishDialog = async (variantId: string) => {
    setPublishDraft({
      variantId,
      headline: '',
      message: '',
      description: '',
      link_override: '',
      attach_to_adset_id: '',
      call_to_action: 'SHOP_NOW',
      locale: 'nl',
    })
    setOfferPreview(null)
    // Resolve product for this variant by scanning cached details.
    let productIdForVariant: string | null = null
    for (const det of Object.values(details)) {
      if (det.variants.some((v) => v.id === variantId)) {
        productIdForVariant = det.product?.id ?? det.run.source_product_id
        break
      }
    }
    if (!productIdForVariant) return
    try {
      setOfferPreviewLoading(true)
      const res = await fetch(
        `/api/admin/ai-campaigns/pricing-context?product_id=${productIdForVariant}`,
        { cache: 'no-store' },
      )
      const body = await res.json()
      if (res.ok && body.pricing) {
        setOfferPreview({
          base_price: body.pricing.base_price ?? null,
          sale_price: body.pricing.sale_price ?? null,
          effective_price: body.pricing.effective_price ?? null,
          has_active_sale: !!body.pricing.has_active_sale,
          sale_off_pct: body.pricing.sale_off_pct ?? 0,
          has_active_staffel: !!body.pricing.has_active_staffel,
          staffel_tiers: body.pricing.staffel_tiers ?? [],
          has_active_promo: !!body.pricing.has_active_promo,
          promo_codes: (body.pricing.active_promo_codes ?? []).map((p: { code: string }) => p.code),
          offer_copy_nl: body.pricing.offer_copy_nl ?? '',
          offer_copy_en: body.pricing.offer_copy_en ?? '',
        })
      }
    } catch {
      // Non-fatal — the publish route will still load fresh pricing.
    } finally {
      setOfferPreviewLoading(false)
    }
  }

  const submitPublish = async (runId: string) => {
    if (!publishDraft) return
    try {
      setPublishing(publishDraft.variantId)
      setError(null)
      setMessage(null)
      const res = await fetch('/api/admin/ai-campaigns/creatives/variants/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: publishDraft.variantId,
          headline: publishDraft.headline.trim() || undefined,
          message: publishDraft.message.trim() || undefined,
          description: publishDraft.description.trim() || undefined,
          link_override: publishDraft.link_override.trim() || undefined,
          attach_to_adset_id: publishDraft.attach_to_adset_id.trim() || undefined,
          call_to_action: publishDraft.call_to_action || undefined,
          locale: publishDraft.locale,
        }),
      })
      const body = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(body.error || 'Publish mislukt')
      const summary = body.warning
        ? `Creative ${body.creative_id} aangemaakt — ${body.warning}`
        : `Creative ${body.creative_id} live${body.ad_id ? ` (ad ${body.ad_id})` : ''}.`
      setMessage(summary)
      setPublishDraft(null)
      const detailRes = await fetch(`/api/admin/ai-campaigns/creatives/runs?id=${runId}`, { cache: 'no-store' })
      const detailBody = (await detailRes.json()) as RunDetail
      setDetails((d) => ({ ...d, [runId]: detailBody }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPublishing(null)
    }
  }

  const reviewVariant = async (runId: string, variantId: string, status: VariantRow['status']) => {
    try {
      setReviewing(variantId)
      const res = await fetch('/api/admin/ai-campaigns/creatives/variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, status }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Update mislukt')
      // Refresh the cached detail.
      const detailRes = await fetch(`/api/admin/ai-campaigns/creatives/runs?id=${runId}`, { cache: 'no-store' })
      const detailBody = (await detailRes.json()) as RunDetail
      setDetails((d) => ({ ...d, [runId]: detailBody }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReviewing(null)
    }
  }

  const productLabel = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.name])),
    [products],
  )

  return (
    <div className="p-6 max-w-6xl">
      <Link
        href="/admin/ai-campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Terug naar Campagne AI
      </Link>

      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Creatives &amp; approvals
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Genereer ad-variants op basis van een échte MOSE productfoto + scene. Variants worden
            automatisch getest op brand-palet en garment-similariteit; auto-approve gebeurt alleen
            als alle QA-drempels worden gehaald.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Vernieuw
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm flex gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{message}</div>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Play className="w-5 h-5" /> Nieuwe run
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {products.length === 0 && <option value="">Geen actieve producten</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Scene</label>
            <select
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.scene_type})
                </option>
              ))}
              {scenes.length === 0 && (
                <option value="">
                  Geen scenes — eerst toevoegen via /admin/ai-campaigns/scenes
                </option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Aantal variants</label>
            <input
              type="number"
              min={1}
              max={8}
              value={numVariants}
              onChange={(e) => setNumVariants(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Extra prompt-hint (optioneel)
            </label>
            <textarea
              value={extraHint}
              onChange={(e) => setExtraHint(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Bv. 'zwart-witte film grain, low-key light, jaren 90 sfeer'"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={provider === 'mock'}
                onChange={(e) => setProvider(e.target.checked ? 'mock' : 'replicate')}
                className="rounded border-gray-300"
              />
              Mock-mode (geen Replicate cost — gebruikt de productfoto als output, voor smoke-tests).
            </label>
            <button
              type="button"
              onClick={startRun}
              disabled={busy || !productId || !sceneId}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> {busy ? 'Bezig…' : 'Start run'}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Recente runs {runs.length > 0 && <span className="text-gray-400">· {runs.length}</span>}
        </h2>
        {loading ? (
          <div className="animate-pulse text-sm text-gray-500">Runs laden…</div>
        ) : runs.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 bg-white">
            Nog geen runs. Configureer hierboven en klik op &ldquo;Start run&rdquo;.
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const open = expanded === r.id
              const detail = details[r.id]
              return (
                <article key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.id)}
                    className="w-full text-left px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {open ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {productLabel[r.source_product_id] ?? 'Product onbekend'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.provider} · {r.model} · {new Date(r.started_at).toLocaleString('nl-NL')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {r.total_variants} variants
                      </span>
                      {typeof r.total_cost_usd === 'number' && r.total_cost_usd > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono">
                          ${r.total_cost_usd.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4">
                      {r.error_message && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs">
                          {r.error_message}
                        </div>
                      )}
                      {!detail ? (
                        <div className="text-sm text-gray-500">Detail laden…</div>
                      ) : (
                        <>
                          {detail.scene && (
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <ImageIcon className="w-4 h-4" />
                              Scene: <span className="font-medium text-gray-800">{detail.scene.label}</span> (
                              {detail.scene.scene_type})
                            </div>
                          )}
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {detail.variants.map((v) => (
                              <article
                                key={v.id}
                                className={`rounded-lg border overflow-hidden text-xs ${
                                  v.status === 'approved'
                                    ? 'border-green-200'
                                    : v.status === 'rejected'
                                      ? 'border-red-200'
                                      : 'border-gray-200'
                                }`}
                              >
                                <div className="relative aspect-[4/5] bg-gray-100">
                                  <Image
                                    src={v.thumbnail_url || v.output_url}
                                    alt={`Variant ${v.variant_index}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, 25vw"
                                    className="object-cover"
                                    unoptimized
                                  />
                                  <span
                                    className={`absolute top-1 left-1 px-1.5 py-0.5 rounded border ${VARIANT_BADGES[v.status]}`}
                                  >
                                    {v.status}
                                  </span>
                                </div>
                                <div className="p-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono">#{v.variant_index}</span>
                                    <a
                                      href={v.output_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-500 hover:text-black"
                                    >
                                      open full
                                    </a>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <QaBadge label="SSIM" value={v.ssim_score} ok={v.ssim_score !== null && v.ssim_score >= 0.78} />
                                    <QaBadge
                                      label="ΔE"
                                      value={v.palette_distance}
                                      ok={!!v.brand_color_pass}
                                      lowerIsBetter
                                    />
                                    <QaBadge label="ad-policy" boolValue={v.ad_policy_pass} />
                                    <QaBadge label="brand color" boolValue={v.brand_color_pass} />
                                  </div>
                                  {v.ad_policy_issues.length > 0 && (
                                    <div className="text-[11px] text-red-700">
                                      {v.ad_policy_issues.join(', ')}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => reviewVariant(r.id, v.id, 'approved')}
                                      disabled={reviewing === v.id || v.status === 'approved' || v.status === 'published'}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-green-200 text-green-800 hover:bg-green-50 disabled:opacity-40"
                                    >
                                      <Check className="w-3 h-3" /> approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => reviewVariant(r.id, v.id, 'rejected')}
                                      disabled={reviewing === v.id || v.status === 'rejected'}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-red-200 text-red-800 hover:bg-red-50 disabled:opacity-40"
                                    >
                                      <X className="w-3 h-3" /> reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => reviewVariant(r.id, v.id, 'archived')}
                                      disabled={reviewing === v.id || v.status === 'archived'}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                    >
                                      <Archive className="w-3 h-3" />
                                    </button>
                                    {v.status === 'approved' && (
                                      <button
                                        type="button"
                                        onClick={() => openPublishDialog(v.id)}
                                        disabled={publishing === v.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-blue-200 text-blue-800 hover:bg-blue-50 disabled:opacity-40"
                                      >
                                        <Send className="w-3 h-3" /> publish
                                      </button>
                                    )}
                                    {v.status === 'published' && v.meta_creative_id && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-blue-200 text-blue-800 bg-blue-50">
                                        <ExternalLink className="w-3 h-3" />
                                        <code>{v.meta_creative_id.slice(0, 10)}…</code>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </article>
                            ))}
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
      </section>

      {publishDraft && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => publishing === null && setPublishDraft(null)}
        >
          <div
            className="bg-white max-w-lg w-full rounded-xl shadow-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Send className="w-5 h-5" /> Publiceer naar Meta
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Maakt een nieuwe AdCreative in je ad-account. Velden leeg laten = auto-gegenereerd uit
              huidige productprijs, actieve sale / staffel / promo-code.
            </p>

            {offerPreviewLoading && (
              <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600">
                Aanbod laden…
              </div>
            )}
            {offerPreview && (
              <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50/60 text-xs space-y-1">
                <div className="font-medium text-blue-900 flex items-center gap-2">
                  Huidig aanbod (auto)
                </div>
                <div className="text-blue-900">
                  Prijs: €{offerPreview.effective_price?.toFixed(2) ?? '—'}
                  {offerPreview.has_active_sale && offerPreview.base_price && (
                    <span className="text-blue-700">
                      {' '}
                      (sale, -{offerPreview.sale_off_pct}% van €{offerPreview.base_price.toFixed(2)})
                    </span>
                  )}
                </div>
                {offerPreview.has_active_staffel && offerPreview.staffel_tiers.length > 0 && (
                  <div className="text-blue-900">
                    Staffel:{' '}
                    {offerPreview.staffel_tiers.map((t) => t.label_nl).join(' · ')}
                  </div>
                )}
                {offerPreview.has_active_promo && offerPreview.promo_codes.length > 0 && (
                  <div className="text-blue-900">
                    Actieve promo-codes: {offerPreview.promo_codes.join(', ')}
                  </div>
                )}
                <div className="pt-1 text-blue-800 font-mono break-words">
                  {publishDraft.locale === 'nl' ? offerPreview.offer_copy_nl : offerPreview.offer_copy_en}
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Taal van de copy</label>
                <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                  {(['nl', 'en'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPublishDraft({ ...publishDraft, locale: loc })}
                      className={`px-3 py-1.5 text-xs ${
                        publishDraft.locale === loc
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Headline (optioneel)</label>
                <input
                  type="text"
                  value={publishDraft.headline}
                  onChange={(e) => setPublishDraft({ ...publishDraft, headline: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Auto: productnaam + actief aanbod"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary text (message)</label>
                <textarea
                  value={publishDraft.message}
                  onChange={(e) => setPublishDraft({ ...publishDraft, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Auto: productnaam + intro + aanbod + tagline"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description (optioneel)</label>
                <input
                  type="text"
                  value={publishDraft.description}
                  onChange={(e) => setPublishDraft({ ...publishDraft, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Auto: korte beschrijving + prijs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Link override (optioneel)</label>
                <input
                  type="text"
                  value={publishDraft.link_override}
                  onChange={(e) => setPublishDraft({ ...publishDraft, link_override: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono"
                  placeholder="Default: link-template van credentials"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CTA</label>
                  <select
                    value={publishDraft.call_to_action}
                    onChange={(e) =>
                      setPublishDraft({ ...publishDraft, call_to_action: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                  >
                    {['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'GET_OFFER', 'ORDER_NOW'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Attach to ad-set ID</label>
                  <input
                    type="text"
                    value={publishDraft.attach_to_adset_id}
                    onChange={(e) =>
                      setPublishDraft({ ...publishDraft, attach_to_adset_id: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono"
                    placeholder="leeg = niet koppelen"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setPublishDraft(null)}
                disabled={publishing !== null}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                type="button"
                onClick={() => {
                  // Find the runId by scanning cached details for this variant.
                  let foundRunId: string | null = null
                  for (const [rid, det] of Object.entries(details)) {
                    if (det.variants.some((v) => v.id === publishDraft.variantId)) {
                      foundRunId = rid
                      break
                    }
                  }
                  if (!foundRunId) {
                    setError('Run-context niet gevonden — vernieuw de pagina.')
                    return
                  }
                  submitPublish(foundRunId)
                }}
                disabled={publishing !== null}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {publishing ? 'Publiceren…' : 'Publiceer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QaBadge({
  label,
  value,
  ok,
  boolValue,
  lowerIsBetter,
}: {
  label: string
  value?: number | null
  ok?: boolean
  boolValue?: boolean | null
  lowerIsBetter?: boolean
}) {
  let display = '–'
  let pass = false
  if (typeof boolValue === 'boolean') {
    pass = boolValue
    display = boolValue ? 'pass' : 'fail'
  } else if (typeof value === 'number') {
    display = value.toFixed(2)
    pass = lowerIsBetter ? !!ok : !!ok
  }
  return (
    <div
      className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 border ${
        pass ? 'bg-green-50 text-green-800 border-green-100' : 'bg-amber-50 text-amber-800 border-amber-100'
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-mono">{display}</span>
    </div>
  )
}
