import 'server-only'
import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { admin, storefront } from './client'
import { moneyToCents } from './policy'

const productGid = z.string().regex(/^gid:\/\/shopify\/Product\/[1-9]\d*$/)
const variantGid = z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/)
export const NATIVE_GIFT_PRODUCT_QUERY = `query MoseNativeGiftProduct($id: ID!) {
  currentAppInstallation { accessScopes { handle } }
  shop { currencyCode resourceLimits { maxProductVariants } }
  product(id: $id) {
    id isGiftCard status giftCardSettings { issuanceCurrency }
    options { id } variantsCount { count precision }
  }
}`
export const APPEND_NATIVE_GIFT_VARIANT = `mutation MoseAppendNativeGiftAmount($product: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $product, variants: $variants, strategy: PRESERVE_STANDALONE_VARIANT) {
    productVariants { id }
    userErrors { field code message }
  }
}`
export const NATIVE_GIFT_VARIANT_QUERY = `query MoseNativeGiftVariant($id: ID!) {
  productVariant(id: $id) {
    id price taxable inventoryItem { tracked requiresShipping }
    product { id isGiftCard status giftCardSettings { issuanceCurrency } }
  }
}`
export const NATIVE_GIFT_CHANNEL_QUERY = `query MoseNativeGiftProductChannel($id: ID!) @inContext(country: NL, language: NL) {
  product(id: $id) { id }
}`
export const NATIVE_GIFT_STOREFRONT_QUERY = `query MoseNativeGiftAvailability($id: ID!) @inContext(country: NL, language: NL) {
  node(id: $id) { ... on ProductVariant {
    id availableForSale price { amount currencyCode } product { id }
  } }
}`
const nativeProductSchema = z.object({
  currentAppInstallation:z.object({accessScopes:z.array(z.object({handle:z.string()}))}),
  shop:z.object({currencyCode:z.literal('EUR'),resourceLimits:z.object({maxProductVariants:z.number().int().positive()})}),
  product:z.object({id:productGid,isGiftCard:z.literal(true),status:z.literal('ACTIVE'),
    giftCardSettings:z.object({issuanceCurrency:z.enum(['EUR']).nullable()}),
    options:z.array(z.object({id:z.string().regex(/^gid:\/\/shopify\/ProductOption\/[1-9]\d*$/)})).length(1),
    variantsCount:z.object({count:z.number().int().nonnegative(),precision:z.literal('EXACT')}),
  }),
})
const registrySchema = z.object({shopify_product_id:productGid,enabled:z.literal(true),variant_limit:z.number().int().positive().max(2048),review_reference:z.string().min(20)})

async function verifyNativeVariant(id:string,productId:string,amountCents:number,buyerIp:string) {
  const checked=z.object({productVariant:z.object({id:variantGid,price:z.string(),taxable:z.literal(false),
    inventoryItem:z.object({tracked:z.literal(false),requiresShipping:z.literal(false)}),
    product:z.object({id:productGid,isGiftCard:z.literal(true),status:z.literal('ACTIVE'),giftCardSettings:z.object({issuanceCurrency:z.enum(['EUR']).nullable()})}),
  })}).parse(await admin<unknown>(NATIVE_GIFT_VARIANT_QUERY,{id})).productVariant
  if(checked.id!==id||checked.product.id!==productId||moneyToCents(checked.price)!==amountCents)throw new Error('NATIVE_GIFT_VARIANT_CHANGED')
  // Actual configured Storefront token/channel and buyer market, not Admin ACTIVE.
  const visible=z.object({node:z.object({id:variantGid,availableForSale:z.literal(true),price:z.object({amount:z.string(),currencyCode:z.literal('EUR')}),product:z.object({id:productGid})})})
    .parse(await storefront<unknown>(NATIVE_GIFT_STOREFRONT_QUERY,{id},buyerIp)).node
  if(visible.id!==id||visible.product.id!==productId||moneyToCents(visible.price.amount)!==amountCents)throw new Error('NATIVE_GIFT_CHANNEL_UNAVAILABLE')
}

/** Stable cents => immutable native variant. No product creation/publication,
 * no repricing, no replacement, and no retry of an uncertain provider mutation.
 * Caller must separately prove native issuer cutover and personalization. */
export async function resolveNativeGiftVariant(db:SupabaseClient,input:{productId:string;amountCents:number;buyerIp:string;allowCreate?:boolean}) {
  const productId=z.string().uuid().parse(input.productId)
  const amountCents=z.number().int().min(2000).max(100000).parse(input.amountCents)
  if(!isIP(input.buyerIp))throw new Error('NATIVE_GIFT_BUYER_CONTEXT_REQUIRED')
  const local=await db.from('products').select('id,is_active,status,is_gift_card,allows_custom_amount,gift_card_min_amount,gift_card_max_amount').eq('id',productId).single()
  if(local.error||!local.data||local.data.is_active!==true||local.data.status!=='active'||local.data.is_gift_card!==true||local.data.allows_custom_amount!==true||
    local.data.gift_card_min_amount==null||local.data.gift_card_max_amount==null||
    !Number.isFinite(Number(local.data.gift_card_min_amount))||!Number.isFinite(Number(local.data.gift_card_max_amount))||
    amountCents/100<Number(local.data.gift_card_min_amount)||amountCents/100>Number(local.data.gift_card_max_amount))throw new Error('NATIVE_GIFT_AMOUNT_UNAVAILABLE')
  const registration=await db.from('shopify_native_gift_products').select('shopify_product_id,enabled,variant_limit,review_reference').eq('mose_product_id',productId).single()
  if(registration.error)throw new Error('NATIVE_GIFT_PRODUCT_UNREGISTERED')
  const binding=registrySchema.parse(registration.data)
  const provider=nativeProductSchema.parse(await admin<unknown>(NATIVE_GIFT_PRODUCT_QUERY,{id:binding.shopify_product_id}))
  if(provider.product.id!==binding.shopify_product_id)throw new Error('NATIVE_GIFT_PRODUCT_MISMATCH')
  if(!provider.currentAppInstallation.accessScopes.some(scope=>scope.handle==='write_products'))throw new Error('NATIVE_GIFT_WRITE_SCOPE_REQUIRED')
  const existing=await db.from('shopify_native_gift_amounts').select('shopify_variant_id,status').eq('mose_product_id',productId).eq('amount_cents',amountCents).maybeSingle()
  if(existing.error)throw new Error('NATIVE_GIFT_REGISTRY_UNAVAILABLE')
  let variantId:string
  if(existing.data) {
    if(existing.data.status!=='ready')throw new Error('NATIVE_GIFT_VARIANT_PENDING_REVIEW')
    variantId=variantGid.parse(existing.data.shopify_variant_id)
  } else {
    if(input.allowCreate===false)throw new Error('NATIVE_GIFT_AMOUNT_UNPROVISIONED')
    if(process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED!=='true')throw new Error('NATIVE_GIFT_CATALOG_WRITES_DISABLED')
    const limit=Math.min(binding.variant_limit,provider.shop.resourceLimits.maxProductVariants)
    if(provider.product.variantsCount.count>=limit)throw new Error('NATIVE_GIFT_VARIANT_CAPACITY')
    const published=z.object({product:z.object({id:productGid})}).parse(
      await storefront<unknown>(NATIVE_GIFT_CHANNEL_QUERY,{id:binding.shopify_product_id},input.buyerIp),
    ).product
    if(published.id!==binding.shopify_product_id)throw new Error('NATIVE_GIFT_CHANNEL_UNAVAILABLE')
    const intent=randomUUID()
    const claim=await db.rpc('reserve_native_gift_variant',{p_product:productId,p_amount:amountCents,p_intent:intent,p_observed_count:provider.product.variantsCount.count,p_provider_limit:limit})
    if(claim.error){
      const known=['NATIVE_GIFT_CREATION_RATE_LIMIT','NATIVE_GIFT_VARIANT_CAPACITY','NATIVE_GIFT_AMOUNT_UNAVAILABLE'].find(code=>claim.error.message?.includes(code))
      throw new Error(known??'NATIVE_GIFT_VARIANT_RESERVATION_FAILED')
    }
    const held=z.array(z.object({action:z.enum(['create','ready','pending']),variant_id:variantGid.nullable()})).length(1).parse(claim.data)[0]
    if(held.action==='pending')throw new Error('NATIVE_GIFT_VARIANT_PENDING_REVIEW')
    if(held.action==='ready')variantId=variantGid.parse(held.variant_id)
    else {
      let createdId:string|null=null
      try {
        const created=z.object({productVariantsBulkCreate:z.object({productVariants:z.array(z.object({id:variantGid})),userErrors:z.array(z.unknown())})})
          .parse(await admin<unknown>(APPEND_NATIVE_GIFT_VARIANT,{product:binding.shopify_product_id,variants:[{
            price:(amountCents/100).toFixed(2),taxable:false,published:true,inventoryItem:{tracked:false,requiresShipping:false,sku:`MOSE-GIFT-${amountCents}`},
            optionValues:[{optionId:provider.product.options[0].id,name:`EUR ${(amountCents/100).toFixed(2)}`}],
          }]})).productVariantsBulkCreate
        if(created.userErrors.length||created.productVariants.length!==1)throw new Error('NATIVE_GIFT_APPEND_UNCONFIRMED')
        createdId=created.productVariants[0].id
        const saved=await db.rpc('bind_native_gift_variant',{p_product:productId,p_amount:amountCents,p_intent:intent,p_variant:createdId})
        if(saved.error||saved.data!==true)throw new Error('NATIVE_GIFT_BINDING_UNCONFIRMED')
        variantId=createdId
      } catch {
        // This intent is never replayed automatically, even if its API response
        // was lost. Preserve a returned identity for operator reconciliation.
        await db.rpc('mark_native_gift_variant_unknown',{p_product:productId,p_amount:amountCents,p_intent:intent,p_variant:createdId})
        throw new Error('NATIVE_GIFT_VARIANT_PENDING_REVIEW')
      }
    }
  }
  await verifyNativeVariant(variantId,binding.shopify_product_id,amountCents,input.buyerIp)
  return {shopifyVariantId:variantId,shopifyProductId:binding.shopify_product_id,amountCents,nativeGiftCard:true as const}
}
