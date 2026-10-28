import { createHash } from 'node:crypto'
import { z } from 'zod'
import { admin } from './client'
import { moneyToCents } from './policy'
export const PROMO_PAYMENT_QUERY=`query MosePromoPayment($id:ID!){order(id:$id){
 id updatedAt test displayFinancialStatus currencyCode customAttributes{key value}
 discountApplications(first:100){pageInfo{hasNextPage} nodes{__typename index ... on DiscountCodeApplication{code}}}
 lineItems(first:100){pageInfo{hasNextPage} nodes{discountAllocations{allocatedAmountSet{shopMoney{amount currencyCode}} discountApplication{index}}}}
 shippingLines(first:100){pageInfo{hasNextPage} nodes{discountAllocations{allocatedAmountSet{shopMoney{amount currencyCode}} discountApplication{index}}}}
}}`
const allocations=z.array(z.object({allocatedAmountSet:z.object({shopMoney:z.object({amount:z.string(),currencyCode:z.literal('EUR')})}),discountApplication:z.object({index:z.number().int().nonnegative()})}))
const connection=z.object({pageInfo:z.object({hasNextPage:z.literal(false)}),nodes:z.array(z.object({discountAllocations:allocations}))})
const order=z.object({id:z.string(),updatedAt:z.string().datetime(),test:z.literal(false),displayFinancialStatus:z.enum(['PAID','PARTIALLY_REFUNDED','REFUNDED']),currencyCode:z.literal('EUR'),customAttributes:z.array(z.object({key:z.string(),value:z.string()})),
 discountApplications:z.object({pageInfo:z.object({hasNextPage:z.literal(false)}),nodes:z.array(z.object({__typename:z.string(),index:z.number().int().nonnegative(),code:z.string().optional()}))}),lineItems:connection,shippingLines:connection})
export async function fetchPromoSettlement(input:{orderId:string;sourceUpdatedAt:string;attemptId:string;codeHash:string;discountCents:number}){
 const raw=await admin<{order:unknown}>(PROMO_PAYMENT_QUERY,{id:input.orderId})
 const o=order.parse(raw.order)
 if(o.id!==input.orderId||Date.parse(o.updatedAt)!==Date.parse(input.sourceUpdatedAt)) throw new Error('PROMO_ORDER_VERSION_CHANGED')
 const attribute=(key:string,value:string)=>o.customAttributes.filter(a=>a.key===key).length===1&&o.customAttributes.some(a=>a.key===key&&a.value===value)
 if(!attribute('mose_source','unified-checkout')||!attribute('mose_attempt',input.attemptId)) throw new Error('PROMO_ORDER_ATTEMPT_MISMATCH')
 const applications=o.discountApplications.nodes
 if(new Set(applications.map(a=>a.index)).size!==applications.length) throw new Error('PROMO_APPLICATION_INDEX_MISMATCH')
 const found=applications.filter(a=>a.__typename==='DiscountCodeApplication'&&a.code&&createHash('sha256').update(a.code).digest('hex')===input.codeHash)
 if(found.length!==1) throw new Error('PROMO_DISCOUNT_IDENTITY_MISMATCH')
 const index=found[0].index
 const amount=o.lineItems.nodes.flatMap(l=>l.discountAllocations).filter(a=>a.discountApplication.index===index).reduce((n,a)=>n+moneyToCents(a.allocatedAmountSet.shopMoney.amount),0)
 if(o.shippingLines.nodes.some(l=>l.discountAllocations.some(a=>a.discountApplication.index===index))||amount!==input.discountCents) throw new Error('PROMO_DISCOUNT_AMOUNT_MISMATCH')
 return {sourceUpdatedAt:o.updatedAt,codeHash:input.codeHash,discountCents:amount}
}
