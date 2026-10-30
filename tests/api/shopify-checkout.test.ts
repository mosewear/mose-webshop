// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ nativeRuntime: vi.fn(), nativeCutover: vi.fn(), nativeResolve: vi.fn(), benefitQuote: vi.fn(), issueBenefits: vi.fn(), runtimeReadiness: vi.fn(), from: vi.fn(), rpc: vi.fn(), storefront: vi.fn(), getUser: vi.fn(), insertOwner: vi.fn(), state: {} as Record<string, unknown>, mappings: [] as unknown[], localVariants: [] as Record<string, unknown>[], localProducts: [] as Record<string, unknown>[], localError: false }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mock.from, rpc: mock.rpc }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mock.getUser } }) }))
vi.mock('@/lib/shopify/client', () => ({ storefront: mock.storefront }))
vi.mock('@/lib/shopify/native-gift-cutover', () => ({ nativeGiftRuntimeReadiness: mock.nativeRuntime, assertNativeGiftCutover: mock.nativeCutover }))
vi.mock('@/lib/shopify/native-gift-catalog', () => ({ resolveNativeGiftVariant: mock.nativeResolve }))
vi.mock('@/lib/shopify/runtime-readiness', () => ({ runtimeReadiness: mock.runtimeReadiness }))
vi.mock('@/lib/shopify/checkout-benefits', () => ({ readCheckoutBenefitQuote: mock.benefitQuote, issueCheckoutBenefits: mock.issueBenefits }))
import { POST } from '@/app/api/shopify/checkout/route'
import { GET as bootstrap } from '@/app/api/shopify/session/route'
const inventory = () => ({ data: [{ mose_variant_id: 'local-123', mapping_revision: 'revision-a', mapping_current: true, status: 'known', available_quantity: 5, observed_at: new Date().toISOString() }] })
const attemptId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const gid = 'gid://shopify/ProductVariant/123'
const url = 'https://mosewear.myshopify.com/cart/c/secret'
const emptyBenefitCart = () => ({ cart: { discountCodes: [], deliveryGroups: { pageInfo: { hasNextPage: false }, nodes: [] }, lines: { pageInfo: { hasNextPage: false }, nodes: [{ quantity: 1, merchandise: { id: gid }, discountAllocations: [], cost: { amountPerQuantity: { amount: '69.95', currencyCode: 'EUR' }, subtotalAmount: { amount: '69.95', currencyCode: 'EUR' } } }] } } })
const body = { attemptId, locale: 'nl', country: 'NL', lines: [{ variantId: 'local-123', quantity: 1 }] }
function request(data: unknown = body, session: string | null = 'a'.repeat(64)) {
  return new NextRequest('https://www.mosewear.com/api/shopify/checkout', { method: 'POST', body: JSON.stringify(data),
    headers: { origin: 'https://www.mosewear.com', ...(session ? { cookie: 'mose_shopify_session=' + session } : {}) } })
}
beforeEach(() => {
  mock.nativeRuntime.mockReset().mockResolvedValue({key:'nativeGiftRuntime',status:'verified'})
  mock.nativeCutover.mockReset().mockResolvedValue({shopifyProductIds:['gid://shopify/Product/999']})
  mock.nativeResolve.mockReset().mockImplementation(async (_db,input) => ({shopifyVariantId:'gid://shopify/ProductVariant/999',shopifyProductId:'gid://shopify/Product/999',amountCents:input.amountCents,nativeGiftCard:true}))
  mock.benefitQuote.mockReset().mockImplementation(async (_db, input) => ({ ...input, expectedSubtotalBeforeOrderCents: input.lines.reduce((n: number,line: {unitCents:number;quantity:number})=>n+line.unitCents*line.quantity,0), quote: { payableMerchandiseCents: input.lines.reduce((n: number,line: {unitCents:number;quantity:number})=>n+line.unitCents*line.quantity,0), discountCents: 0 } }))
  mock.issueBenefits.mockReset().mockResolvedValue([])
  mock.runtimeReadiness.mockReset().mockResolvedValue([{ key: 'loyaltyRuntime', status: 'verified' }, { key: 'legacyStockBridge', status: 'verified' }])
  for (const [key,value] of Object.entries({ SHOPIFY_CHECKOUT_ENABLED: 'true', SHOPIFY_BENEFITS_VERIFIED: 'true', SHOPIFY_SESSION_SECRET: 'a'.repeat(32),
    SHOPIFY_CUTOVER_AT: '2026-01-01T00:00:00Z', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'test', SHOPIFY_ADMIN_ACCESS_TOKEN: 'test',
    SHOPIFY_DEV_BUYER_IP: '127.0.0.1', VERCEL: '', NEXT_PUBLIC_SITE_URL: 'https://www.mosewear.com' })) vi.stubEnv(key,value)
  mock.state = { app_installed: true, checkout_enabled: true, catalog_verified: true, inventory_verified: true,
    benefits_verified: true, fulfillment_verified: true, market_verified: true, last_reconciled_at: new Date().toISOString(), last_worker_at: new Date().toISOString() }
  mock.mappings = [{ mose_variant_id: 'local-123', inventory_revision: 'revision-a', shopify_variant_id: gid, fulfillment_owner: 'mose', supplier_model: null,
    supplier_link_verified: false, sample_verified: false, enabled: true, price_eur_cents: 6995 }]
  mock.localError = false
  mock.localVariants = [{ id: 'local-123', product_id: 'product-1', is_available: true, price_adjustment: 0, presale_enabled: false, presale_stock_quantity: 0 }]
  mock.localProducts = [{ id: 'product-1', status: 'active', is_active: true, is_gift_card: false, base_price: 69.95, sale_price: null }]
  mock.getUser.mockReset().mockResolvedValue({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null })
  mock.insertOwner.mockReset().mockResolvedValue({ error: null })
  mock.from.mockReset().mockImplementation((table: string) => ({ insert: mock.insertOwner, select: () => table === 'shopify_integration_state'
    ? { eq: () => ({ single: async () => ({ data: mock.state }) }) } : { in: async () => ({ data: table === 'product_variants' ? mock.localVariants : table === 'products' ? mock.localProducts : mock.mappings, error: mock.localError && table === 'products' ? { message: 'database unavailable' } : null }) } }))
  mock.rpc.mockReset().mockImplementation(async (name: string, args: Record<string, unknown>) => name === 'shopify_inventory_evidence' ? inventory() : name === 'shopify_queue_health' ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] } : name === 'reserve_shopify_checkout'
    ? { data: [{ status: 'creating', request_fingerprint: args.p_fingerprint, cart_id: null, checkout_url: null, lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] } : { data: true })
  mock.storefront.mockReset().mockResolvedValueOnce({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: 5, price: { amount: '69.95', currencyCode: 'EUR' } }] })
    .mockResolvedValueOnce({ cartCreate: { cart: { id: 'private-cart-id', checkoutUrl: url, totalQuantity: 1,
      cost: { subtotalAmount: { amount: '69.95', currencyCode: 'EUR' } }, lines: { nodes: [{ quantity: 1, merchandise: { id: gid } }] } }, userErrors: [], warnings: [] } })
    .mockResolvedValueOnce(emptyBenefitCart())
})
afterEach(() => vi.unstubAllEnvs())
describe('unified checkout boundary', () => {
  it('records definite rejected promo input before allowing an attempt replacement', async () => {
    mock.benefitQuote.mockRejectedValueOnce(new Error('PROMO_EXPIRED'))
    const result=await POST(request({...body,promoCode:'EXPIRED'}))
    expect(result.status).toBe(409)
    expect(await result.json()).toMatchObject({code:'BENEFIT_UNAVAILABLE',retrySafe:true})
    expect(mock.issueBenefits).not.toHaveBeenCalled()
    expect(mock.rpc.mock.calls.some(call=>call[0]==='reserve_shopify_checkout')).toBe(true)
    expect(mock.rpc.mock.calls.at(-1)?.[1]).toMatchObject({p_status:'failed',p_error:'BENEFIT_INPUT_REJECTED'})
  })
  it('never rotates a previously uncertain cart when a later benefit quote fails', async () => {
    mock.benefitQuote.mockRejectedValueOnce(new Error('POINTS_HELD'))
    const base=mock.rpc.getMockImplementation()!
    mock.rpc.mockImplementation(async (name,args)=>name==='reserve_shopify_checkout' ? {data:[{status:'unknown',request_fingerprint:'previous',lease_token:'old',expires_at:new Date(Date.now()+3600000).toISOString(),cart_id:null,checkout_url:null}]} : base(name,args))
    const response=await POST(request({...body,loyaltyPoints:100}))
    expect(await response.json()).toMatchObject({code:'BENEFIT_UNAVAILABLE',retrySafe:false})
    expect(mock.rpc.mock.calls.some(call=>call[0]==='finish_shopify_checkout')).toBe(false)
    expect(mock.issueBenefits).not.toHaveBeenCalled()
  })
  it('verifies actual provider allocations before returning a discounted checkout', async () => {
    mock.benefitQuote.mockResolvedValueOnce({ expectedSubtotalBeforeOrderCents:6995, quote:{payableMerchandiseCents:6495,discountCents:500}, lines:[], user:{id:'11111111-1111-4111-8111-111111111111'}, points:100 })
    mock.issueBenefits.mockResolvedValueOnce([{code:'PRIVATE-CODE',discountCents:500,eligibleVariants:[gid]}])
    mock.getUser.mockResolvedValueOnce({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'buyer@example.org',email_confirmed_at:'2026-01-01T00:00:00Z'}},error:null})
    mock.storefront.mockReset().mockResolvedValueOnce({ nodes:[{id:gid,availableForSale:true,quantityAvailable:5,price:{amount:'69.95',currencyCode:'EUR'}}] })
      .mockResolvedValueOnce({cartCreate:{cart:{id:'private-cart-id',checkoutUrl:url,totalQuantity:1,cost:{subtotalAmount:{amount:'69.95',currencyCode:'EUR'}},lines:{nodes:[{quantity:1,merchandise:{id:gid}}]}},userErrors:[],warnings:[]}})
      .mockResolvedValueOnce({cart:{discountCodes:[{code:'PRIVATE-CODE',applicable:true}],deliveryGroups:{pageInfo:{hasNextPage:false},nodes:[]},lines:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,merchandise:{id:gid},cost:{amountPerQuantity:{amount:'69.95',currencyCode:'EUR'},subtotalAmount:{amount:'69.95',currencyCode:'EUR'}},discountAllocations:[{__typename:'CartCodeDiscountAllocation',code:'PRIVATE-CODE',discountedAmount:{amount:'5.00',currencyCode:'EUR'}}]}]}}})
    const req=request({...body,loyaltyPoints:100}); req.cookies.set('sb-test-auth-token','session')
    const result=await POST(req)
    expect(result.status).toBe(200)
    expect(mock.storefront.mock.calls[1][1].input).toMatchObject({discountCodes:['PRIVATE-CODE'],buyerIdentity:{countryCode:'NL',email:'buyer@example.org'}})
    expect(mock.insertOwner.mock.invocationCallOrder[0]).toBeLessThan(mock.issueBenefits.mock.invocationCallOrder[0])
    expect(JSON.stringify(await result.json())).not.toContain('PRIVATE-CODE')
  })
  it('does not mark voucher-bearing cart rejection safe for automatic attempt rotation', async () => {
    mock.issueBenefits.mockResolvedValueOnce([{code:'PRIVATE-CODE',discountCents:500,eligibleVariants:[gid]}])
    mock.storefront.mockReset().mockResolvedValueOnce({nodes:[{id:gid,availableForSale:true,quantityAvailable:5,price:{amount:'69.95',currencyCode:'EUR'}}]})
      .mockResolvedValueOnce({cartCreate:{cart:null,userErrors:[{code:'REJECTED'}],warnings:[]}})
    const result=await POST(request())
    expect(result.status).toBe(503)
    expect(await result.json()).toMatchObject({code:'ATTEMPT_PENDING'})
    expect(mock.rpc.mock.calls.at(-1)?.[1].p_status).toBe('unknown')
  })
  it('blocks stale financial or stock runtime before any provider calls or cart reuse', async () => {
    for (const key of ['loyaltyRuntime','legacyStockBridge']) {
      mock.runtimeReadiness.mockResolvedValue([{ key, status: 'unknown' }])
      const result = await POST(request())
      expect(result.status).toBe(503)
      expect((await result.json()).code).toBe('RUNTIME_NOT_READY')
    }
    expect(mock.storefront).not.toHaveBeenCalled()
    expect(mock.rpc.mock.calls.some(call => call[0] === 'reserve_shopify_checkout')).toBe(false)
  })
  it('rejects unknown, stale or changed inventory before provider calls or reusing a checkout', async () => {
    const base = mock.rpc.getMockImplementation()!
    for (const patch of [{ status: 'unknown', available_quantity: null }, { mapping_current: false }, { mapping_revision: 'revision-b' }, { observed_at: '2020-01-01T00:00:00Z' }, { available_quantity: 0 }]) {
      mock.rpc.mockImplementation(async (name, args) => name === 'shopify_inventory_evidence' ? { data: [{ ...inventory().data[0], ...patch }] } : base(name, args))
      const response = await POST(request())
      expect(response.status).toBe(409)
      expect((await response.json()).code).toBe('INVENTORY_NOT_READY')
    }
    expect(mock.storefront).not.toHaveBeenCalled()
    expect(mock.rpc.mock.calls.some(c => c[0] === 'reserve_shopify_checkout')).toBe(false)
  })
  it('defaults closed before external access', async () => {
    vi.stubEnv('SHOPIFY_CHECKOUT_ENABLED', '')
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled()
  })
  it('rejects client prices and stale synchronization', async () => {
    expect((await POST(request({ ...body, price: 0.01 }))).status).toBe(400)
    mock.state.last_reconciled_at = '2020-01-01T00:00:00Z'
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('stores the checkout before exposing its URL and never exposes the cart secret', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ checkoutUrl: url, attemptId })
    expect(mock.rpc.mock.calls.map(c => c[0])).toEqual(['shopify_queue_health','shopify_inventory_evidence','reserve_shopify_checkout','finish_shopify_checkout'])
    expect(mock.rpc.mock.calls[2][1].p_snapshot.lines[0]).toMatchObject({ localVariantId: 'local-123', merchandiseId: gid })
    expect(response.headers.get('set-cookie')).toBe(null)
  })
  it('reuses a session-bound ready attempt without creating a second cart', async () => {
    mock.rpc.mockImplementation(async (name: string,args: Record<string,unknown>) => name === 'shopify_inventory_evidence' ? inventory() : name === 'shopify_queue_health'
      ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] }
      : { data: [{ status: 'ready', request_fingerprint: args.p_fingerprint, checkout_url: url, expires_at: new Date(Date.now()+3600000).toISOString() }] })
    const response = await POST(request())
    expect(response.status).toBe(200); expect(mock.storefront).toHaveBeenCalledTimes(1)
  })
  it('does not return an unpersisted checkout after the database fails', async () => {
    mock.rpc.mockImplementation(async (name: string,args: Record<string,unknown>) => name === 'shopify_inventory_evidence' ? inventory() : name === 'shopify_queue_health' ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] } : name === 'reserve_shopify_checkout'
      ? { data: [{ status: 'creating', request_fingerprint: args.p_fingerprint, cart_id: null, checkout_url: null, lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] }
      : { data: null, error: { message: 'storage failed' } })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('checkoutUrl')
    expect(mock.rpc.mock.calls.at(-1)?.[1].p_status).toBe('unknown')
  })
  it('does not create a cart if any local variant lacks a reviewed mapping', async () => {
    mock.mappings = []
    expect((await POST(request())).status).toBe(409)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('requires an acknowledged session bootstrap before any cart mutation, even after a lost first response', async () => {
    const first = await bootstrap(new NextRequest('https://www.mosewear.com/api/shopify/session'))
    expect(first.headers.get('set-cookie')).toContain('HttpOnly')
    // Pretend that the response (including Set-Cookie) never reached the browser.
    const withoutAck = await POST(request(body, null))
    expect(withoutAck.status).toBe(409)
    expect((await withoutAck.json()).code).toBe('SESSION_REQUIRED')
    expect(mock.storefront).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled()
    const second = await bootstrap(new NextRequest('https://www.mosewear.com/api/shopify/session'))
    const cookie = second.headers.get('set-cookie')?.match(/mose_shopify_session=([a-f0-9]{64})/)?.[1]
    expect(cookie).toBeTruthy()
    expect((await POST(request(body, cookie!))).status).toBe(200)
  })
  it('blocks enqueue-only health when the worker is stale or the inbox has aged/dead-letter events', async () => {
    mock.state.last_worker_at = '2020-01-01T00:00:00Z'
    expect((await POST(request())).status).toBe(503)
    mock.state.last_worker_at = new Date().toISOString()
    for (const health of [
      { pending_count: 1, oldest_pending_at: '2020-01-01T00:00:00Z', dead_letter_count: 0 },
      { pending_count: 0, oldest_pending_at: null, dead_letter_count: 1 },
      { pending_count: 1, oldest_pending_at: null, dead_letter_count: 0 },
      { pending_count: null, oldest_pending_at: null, dead_letter_count: null },
    ]) {
      mock.rpc.mockResolvedValueOnce({ data: [health] })
      const response = await POST(request())
      expect(response.status).toBe(503)
      expect((await response.json()).code).toBe('ORDER_SYNC_NOT_READY')
    }
    expect(mock.storefront).not.toHaveBeenCalled()
  })

  it('binds authenticated checkout to an opaque proof before creating the cart', async () => {
    const req = request()
    req.cookies.set('sb-test-auth-token', 'session')
    const response = await POST(req)
    expect(response.status).toBe(200)
    const owner = mock.insertOwner.mock.calls[0][0]
    expect(owner).toMatchObject({ attempt_id: attemptId, user_id: '11111111-1111-4111-8111-111111111111' })
    expect(owner.proof).toMatch(/^[a-f0-9]{64}$/)
    expect(mock.storefront.mock.calls[1][1].input.attributes).toContainEqual({ key: 'mose_account_proof', value: owner.proof })
    expect(mock.insertOwner.mock.invocationCallOrder[0]).toBeLessThan(mock.storefront.mock.invocationCallOrder[1])
    expect(JSON.stringify(await response.json())).not.toContain(owner.proof)
  })
  it('keeps anonymous checkout working without an account or ownership row', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mock.getUser).not.toHaveBeenCalled()
    expect(mock.insertOwner).not.toHaveBeenCalled()
    expect(mock.storefront.mock.calls[1][1].input.attributes).toHaveLength(2)
  })
  it('does not downgrade an invalid logged-in session to a guest order', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } })
    const req = request(); req.cookies.set('sb-test-auth-token.0', 'session')
    expect((await POST(req)).status).toBe(401)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('does not create a cart if durable account ownership fails', async () => {
    mock.insertOwner.mockResolvedValue({ error: { message: 'database failed' } })
    const req = request(); req.cookies.set('sb-test-auth-token', 'session')
    expect((await POST(req)).status).toBe(503)
    expect(mock.storefront).toHaveBeenCalledTimes(1) // validation only; no cart mutation
  })
  it('includes verified identity in the attempt fingerprint, preventing cross-account reuse', async () => {
    await POST(request())
    const guestFingerprint = mock.rpc.mock.calls.find(c => c[0] === 'reserve_shopify_checkout')![1].p_fingerprint
    mock.storefront.mockResolvedValueOnce({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: 5, price: { amount: '69.95', currencyCode: 'EUR' } }] })
    const implementation = mock.rpc.getMockImplementation()!
    mock.rpc.mockImplementation(async (name, args) => name === 'reserve_shopify_checkout'
      ? { data: [{ status: 'ready', request_fingerprint: guestFingerprint, checkout_url: url, expires_at: new Date(Date.now()+3600000).toISOString() }] }
      : implementation(name, args))
    const req = request(); req.cookies.set('sb-test-auth-token', 'session')
    expect((await POST(req)).status).toBe(409)
    expect(mock.insertOwner).not.toHaveBeenCalled()
  })

  it.each([
    ['draft status', 'product', { status: 'draft' }],
    ['inactive product', 'product', { is_active: false }],
    ['gift card mislabeled as physical in mapping', 'product', { is_gift_card: true }],
    ['unavailable variant', 'variant', { is_available: false }],
    ['local price change', 'product', { base_price: 79.95 }],
    ['local adjustment change', 'variant', { price_adjustment: 5 }],
    ['unmigrated presale promise', 'variant', { presale_enabled: true, presale_stock_quantity: 5 }],
  ])('rejects %s even with an enabled Shopify mapping', async (_label, kind, patch) => {
    Object.assign(kind === 'product' ? mock.localProducts[0] : mock.localVariants[0], patch)
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('LOCAL_CATALOG_CHANGED')
    expect(mock.storefront).not.toHaveBeenCalled()
    expect(mock.rpc.mock.calls.some(call => call[0] === 'reserve_shopify_checkout')).toBe(false)
  })
  it('does not use a deleted or mismatched local variant/product', async () => {
    mock.localVariants = []
    expect((await POST(request())).status).toBe(409)
    mock.localVariants = [{ id: 'local-123', product_id: 'another-product', is_available: true, price_adjustment: 0, presale_enabled: false, presale_stock_quantity: 0 }]
    expect((await POST(request())).status).toBe(409)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('fails closed when current local catalog reads fail', async () => {
    mock.localError = true
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('authorizes the current local sale price plus variant adjustment', async () => {
    mock.localProducts[0].base_price = 89.95
    mock.localProducts[0].sale_price = 64.95
    mock.localVariants[0].price_adjustment = 5
    expect((await POST(request())).status).toBe(200)
  })

})


describe('native gift mixed checkout contract',()=>{
 const gift={productId:'bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c',amountCents:2001,quantity:1,recipient:{recipientEmail:'gift@example.test'}}
 function reflectNativeCart(){
  let cartLines:{quantity:number;merchandise:{id:string};attributes:{key:string;value:string}[];discountAllocations:never[];cost:{amountPerQuantity:{amount:string;currencyCode:string};subtotalAmount:{amount:string;currencyCode:string}}}[]=[]
  mock.storefront.mockReset().mockImplementation(async(query:string,variables:Record<string,unknown>)=>{
   if(query.includes('MoseVariants'))return {nodes:(variables.ids as string[]).map(id=>({id,availableForSale:true,quantityAvailable:id===gid?5:null,price:{amount:id===gid?'69.95':'20.01',currencyCode:'EUR'}}))}
   if(query.includes('MoseCart(')){
    const input=variables.input as {lines:{merchandiseId:string;quantity:number;attributes?:{key:string;value:string}[]}[]}
    cartLines=input.lines.map(line=>{const amount=line.merchandiseId===gid?6995:2001;return {quantity:line.quantity,merchandise:{id:line.merchandiseId},attributes:line.attributes??[],discountAllocations:[],cost:{amountPerQuantity:{amount:(amount/100).toFixed(2),currencyCode:'EUR'},subtotalAmount:{amount:(amount*line.quantity/100).toFixed(2),currencyCode:'EUR'}}}})
    const total=cartLines.reduce((sum,line)=>sum+Number(line.cost.subtotalAmount.amount),0)
    return {cartCreate:{cart:{id:'native-cart',checkoutUrl:url,totalQuantity:cartLines.reduce((sum,line)=>sum+line.quantity,0),cost:{subtotalAmount:{amount:total.toFixed(2),currencyCode:'EUR'}},lines:{nodes:cartLines}},userErrors:[],warnings:[]}}
   }
   if(query.includes('MoseBenefitsCart'))return {cart:{discountCodes:[],deliveryGroups:{pageInfo:{hasNextPage:false},nodes:[]},lines:{pageInfo:{hasNextPage:false},nodes:cartLines}}}
   throw new Error('UNEXPECTED_TEST_QUERY')
  })
 }
 it('creates one mixed physical/native gift cart, binds recipient properties and never calls a MOSE issuer',async()=>{
  reflectNativeCart()
  const response=await POST(request({...body,giftCards:[gift]}))
  expect(response.status).toBe(200)
  const create=mock.storefront.mock.calls.find(([query])=>query.includes('MoseCart('))![1].input
  expect(create.lines).toHaveLength(2)
  expect(create.lines[1].attributes).toContainEqual({key:'Recipient email',value:'gift@example.test'})
  expect(create.lines[1].attributes).toContainEqual({key:'__shopify_send_gift_card_to_recipient',value:'true'})
  expect(create.lines[1].attributes.find((a:{key:string})=>a.key==='_mose_gift_proof').value).toMatch(/^[a-f0-9]{64}$/)
  expect(mock.rpc.mock.calls.some(([name])=>/issue.*gift/.test(name))).toBe(false)
 })
 it('keeps same-value gifts to distinct recipients as separate lines while proving their aggregate face value',async()=>{
  reflectNativeCart()
  const response=await POST(request({...body,lines:[],giftCards:[gift,{...gift,recipient:{recipientEmail:'second@example.test'}}]}))
  expect(response.status).toBe(200)
  expect(mock.nativeResolve).toHaveBeenCalledTimes(2)
  const create=mock.storefront.mock.calls.find(([query])=>query.includes('MoseCart('))![1].input
  expect(create.lines).toHaveLength(2)
  expect(new Set(create.lines.map((line:{merchandiseId:string})=>line.merchandiseId)).size).toBe(1)
  expect(mock.benefitQuote.mock.calls[0][1].lines).toMatchObject([{giftCard:true,quantity:2,unitCents:2001}])
  expect(mock.rpc.mock.calls.some(([name])=>name==='shopify_inventory_evidence')).toBe(false)
 })
 it('retains the basket and creates no payable cart when native product proof or exclusive issuer is missing',async()=>{
  mock.nativeCutover.mockRejectedValueOnce(new Error('LEGACY_OBLIGATIONS_REMAIN'))
  const response=await POST(request({...body,giftCards:[gift]}))
  expect(await response.json()).toMatchObject({code:'NATIVE_GIFT_NOT_READY'})
  expect(mock.storefront).not.toHaveBeenCalled()
  expect(mock.issueBenefits).not.toHaveBeenCalled()
 })
})
