// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { admin, ShopifyUnavailable } from '@/lib/shopify/client'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Admin GraphQL error classification', () => {
  it.each([
    [{ errors: [{ extensions: { code: 'ACCESS_DENIED' } }] }, 'SHOPIFY_ACCESS_DENIED'],
    [{ data: { order: null }, errors: [{ extensions: { code: 'THROTTLED' } }, { extensions: { code: 'ACCESS_DENIED' } }] }, 'SHOPIFY_ACCESS_DENIED'],
    [{ errors: [{ extensions: { code: 'THROTTLED' } }] }, 'SHOPIFY_THROTTLED'],
    [{ errors: [{ message: 'private provider details' }] }, 'SHOPIFY_QUERY_FAILED'],
  ])('rejects HTTP 200 failures without accepting partial data', async (body, code) => {
    vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'test-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })))
    await expect(admin('query { shop { name } }', {})).rejects.toEqual(new ShopifyUnavailable(code))
  })
})
