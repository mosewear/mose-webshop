import { createHmac } from 'node:crypto'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { admin } from './client'

export const BIND_CUSTOMER = `mutation MoseCustomerBinding($input: CustomerSetInput!, $identifier: CustomerSetIdentifiers!) {
  customerSet(input: $input, identifier: $identifier) {
    customer { id defaultEmailAddress { emailAddress } }
    userErrors { field code message }
  }
}`
const identity = z.object({ id: z.string().uuid(), email: z.string().email(), email_confirmed_at: z.string().min(1) })
/** Must receive the user returned by Supabase auth.getUser(), never request JSON.
 * Does not subscribe anyone, overwrite names/addresses, or create credentials.
 * Shopify's hosted checkout still owns final customer authentication/identity. */
export async function bindAuthenticatedShopifyCustomer(db: SupabaseClient, rawUser: unknown, secret: string) {
  if (process.env.SHOPIFY_CUSTOMER_BINDING_ENABLED !== 'true') throw new Error('CUSTOMER_BINDING_DISABLED')
  const user = identity.parse(rawUser)
  if (!Number.isFinite(Date.parse(user.email_confirmed_at)) || secret.length < 32) throw new Error('CUSTOMER_IDENTITY_UNVERIFIED')
  const email = user.email.trim().toLowerCase()
  const emailHash = createHmac('sha256', secret).update(`shopify-customer:v1:${email}`).digest('hex')
  const existing = await db.from('shopify_customer_bindings').select('shopify_customer_id,email_hash').eq('user_id', user.id).maybeSingle()
  if (existing.error) throw new Error('CUSTOMER_BINDING_UNAVAILABLE')
  // An authenticated email change requires reviewed rebinding; never silently
  // attach the new address to another customer's history or discount identity.
  if (existing.data && existing.data.email_hash !== emailHash) throw new Error('CUSTOMER_REBIND_REQUIRED')
  const response = await admin<unknown>(BIND_CUSTOMER, { identifier: { email }, input: { email } })
  const payload = z.object({ customerSet: z.object({
    customer: z.object({ id: z.string().regex(/^gid:\/\/shopify\/Customer\/[1-9][0-9]*$/),
      defaultEmailAddress: z.object({ emailAddress: z.string().email() }).nullable() }).nullable(),
    userErrors: z.array(z.unknown()),
  }) }).parse(response).customerSet
  if (payload.userErrors.length || !payload.customer || payload.customer.defaultEmailAddress?.emailAddress.trim().toLowerCase() !== email)
    throw new Error('CUSTOMER_PROVIDER_IDENTITY_MISMATCH')
  if (existing.data && existing.data.shopify_customer_id !== payload.customer.id) throw new Error('CUSTOMER_PROVIDER_IDENTITY_CHANGED')
  const saved = await db.rpc('bind_shopify_customer', { p_user: user.id, p_customer: payload.customer.id, p_email_hash: emailHash })
  if (saved.error || saved.data !== true) throw new Error('CUSTOMER_BINDING_UNCONFIRMED')
  return { customerId: payload.customer.id, email }
}
