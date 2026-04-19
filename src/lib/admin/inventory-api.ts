export type InventoryAdjustField = 'regular' | 'presale'

export async function postInventoryAdjust(body: {
  variantId: string
  delta: number
  field: InventoryAdjustField
  reason?: string
  notes?: string | null
}) {
  const res = await fetch('/api/admin/inventory/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      variantId: body.variantId,
      delta: body.delta,
      field: body.field,
      reason: body.reason ?? 'manual',
      notes: body.notes ?? null,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText)
  }
  return json as { ok: true; result: unknown }
}

export type InventoryLogRow = {
  id: string
  created_at: string | null
  variant_id: string
  change_amount: number
  previous_stock: number
  new_stock: number
  inventory_type: string
  reason: string
  notes: string | null
  receipt_id: string | null
  sku: string | null
  size: string | null
  color: string | null
  product_name: string | null
}

export async function getInventoryLogs(params: {
  variantId?: string
  limit?: number
  offset?: number
}) {
  const sp = new URLSearchParams()
  if (params.variantId) sp.set('variantId', params.variantId)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const res = await fetch(`/api/admin/inventory/logs?${sp.toString()}`, {
    credentials: 'same-origin',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText)
  }
  return json as {
    logs: InventoryLogRow[]
    total: number
    limit: number
    offset: number
  }
}

export async function postInventoryReceive(body: {
  title: string
  notes?: string | null
  expectedTotal?: number | null
  lines: Array<{
    variantId: string
    quantityAdded: number
    inventoryType: 'regular' | 'presale'
  }>
}) {
  const res = await fetch('/api/admin/inventory/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText)
  }
  return json as {
    ok: true
    result: {
      receipt_id?: string
      total_added?: number
      expected_total?: number | null
      expected_mismatch?: boolean
    }
  }
}
