import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

interface CsvRow {
  sku?: string
  product_slug?: string
  product_id?: string
  variant_id?: string
  cost_price: string | number
  shipping_cost_avg?: string | number
  transaction_fee_pct?: string | number
  vat_rate?: string | number
  notes?: string
}

interface ImportResult {
  imported: number
  updated: number
  skipped: Array<{ row: number; reason: string; raw: Record<string, string> }>
}

/**
 * Naive RFC-4180-ish CSV parser. Handles quoted fields with embedded
 * commas and double-quote escaping. Good enough for human-edited
 * exports from Numbers / Excel; full RFC parsing would warrant a
 * dependency we don't want for one endpoint.
 */
function parseCsv(input: string): Array<Record<string, string>> {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\r') {
      // ignore — handled at \n
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {}
    header.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim()
    })
    return obj
  })
}

function toNumber(v: string | number | undefined): number | undefined {
  if (v === undefined || v === '' || v === null) return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  const cleaned = v.replace(',', '.').replace(/[^0-9.\-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

export async function POST(request: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') || ''
  let csvText: string
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as { csv?: string }
    csvText = body.csv ?? ''
  } else {
    csvText = await request.text()
  }

  csvText = csvText.trim()
  if (!csvText) return NextResponse.json({ error: 'CSV body is leeg' }, { status: 400 })

  const rows = parseCsv(csvText)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Geen rijen gevonden (eerste rij moet headers bevatten)' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Build resolver maps so SKU / slug lookups are batched.
  const skuValues = rows.map((r) => (r.sku || '').trim()).filter(Boolean)
  const slugValues = rows.map((r) => (r.product_slug || '').trim()).filter(Boolean)

  const [variantsRes, productsRes] = await Promise.all([
    skuValues.length > 0
      ? supabase.from('product_variants').select('id, product_id, sku').in('sku', skuValues)
      : Promise.resolve({ data: [], error: null }),
    slugValues.length > 0
      ? supabase.from('products').select('id, slug').in('slug', slugValues)
      : Promise.resolve({ data: [], error: null }),
  ])

  const variantBySku = new Map<string, { id: string; product_id: string }>()
  for (const v of variantsRes.data ?? []) {
    if (v.sku) variantBySku.set(v.sku, { id: v.id, product_id: v.product_id })
  }
  const productBySlug = new Map<string, string>()
  for (const p of productsRes.data ?? []) {
    if (p.slug) productBySlug.set(p.slug, p.id)
  }

  const result: ImportResult = { imported: 0, updated: 0, skipped: [] }

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx]
    const row = raw as unknown as CsvRow

    let productId: string | undefined
    let variantId: string | null | undefined

    if (row.product_id) {
      productId = row.product_id
      variantId = row.variant_id || null
    } else if (row.sku) {
      const hit = variantBySku.get(String(row.sku))
      if (!hit) {
        result.skipped.push({ row: idx + 2, reason: `SKU "${row.sku}" niet gevonden`, raw })
        continue
      }
      productId = hit.product_id
      variantId = hit.id
    } else if (row.product_slug) {
      const hit = productBySlug.get(String(row.product_slug))
      if (!hit) {
        result.skipped.push({ row: idx + 2, reason: `Product-slug "${row.product_slug}" niet gevonden`, raw })
        continue
      }
      productId = hit
      variantId = row.variant_id || null
    } else {
      result.skipped.push({ row: idx + 2, reason: 'Geen product_id, sku of product_slug ingevuld', raw })
      continue
    }

    const cost = toNumber(row.cost_price)
    if (cost === undefined || cost < 0) {
      result.skipped.push({ row: idx + 2, reason: 'cost_price ontbreekt of is ongeldig', raw })
      continue
    }
    const shipping = toNumber(row.shipping_cost_avg) ?? 0
    const fee = toNumber(row.transaction_fee_pct) ?? 0.029
    const vat = toNumber(row.vat_rate) ?? 0.21

    if (fee < 0 || fee >= 1) {
      result.skipped.push({ row: idx + 2, reason: 'transaction_fee_pct moet tussen 0 en 1 liggen', raw })
      continue
    }
    if (vat < 0 || vat >= 1) {
      result.skipped.push({ row: idx + 2, reason: 'vat_rate moet tussen 0 en 1 liggen', raw })
      continue
    }

    const existingQuery = variantId
      ? supabase.from('ad_sku_economics').select('id').eq('product_id', productId).eq('variant_id', variantId).maybeSingle()
      : supabase.from('ad_sku_economics').select('id').eq('product_id', productId).is('variant_id', null).maybeSingle()

    const existing = await existingQuery
    if (existing.error) {
      result.skipped.push({ row: idx + 2, reason: existing.error.message, raw })
      continue
    }

    if (existing.data) {
      const { error } = await supabase
        .from('ad_sku_economics')
        .update({
          cost_price: cost,
          shipping_cost_avg: shipping,
          transaction_fee_pct: fee,
          vat_rate: vat,
          notes: row.notes ?? null,
        })
        .eq('id', existing.data.id)
      if (error) {
        result.skipped.push({ row: idx + 2, reason: error.message, raw })
        continue
      }
      result.updated++
    } else {
      const { error } = await supabase.from('ad_sku_economics').insert({
        product_id: productId,
        variant_id: variantId,
        cost_price: cost,
        shipping_cost_avg: shipping,
        transaction_fee_pct: fee,
        vat_rate: vat,
        notes: row.notes ?? null,
      })
      if (error) {
        result.skipped.push({ row: idx + 2, reason: error.message, raw })
        continue
      }
      result.imported++
    }
  }

  return NextResponse.json({ ok: true, ...result })
}
