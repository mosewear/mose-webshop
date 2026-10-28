/** Persist only a payload hash and random operation ID, never receipt notes or product data. */
const fallback = new Map<string, string>()
export async function inventoryOperation(kind: string, payload: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))
  const key = `mose:inventory:${kind}:${Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')}`
  let id = fallback.get(key)
  try { id = localStorage.getItem(key) || id } catch { /* Memory still protects retries in this page. */ }
  if (!id) id = crypto.randomUUID()
  fallback.set(key, id)
  try { localStorage.setItem(key, id) } catch { /* Restricted browsers keep the in-memory operation. */ }
  return { id, confirmed() { fallback.delete(key); try { localStorage.removeItem(key) } catch { /* No persisted entry. */ } } }
}
