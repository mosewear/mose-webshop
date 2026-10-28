import { z } from 'zod'
import catalog from './sample-catalog.json'
import { moneyToCents } from './policy'

export const sampleInput = z.object({
  attemptId: z.string().uuid(), acknowledgedCosts: z.literal(true),
  variants: z.array(z.string().uuid()).length(8),
}).strict()
export const sampleCatalog = catalog
export function selectSampleLines(ids: string[]) {
  if(ids.length!==8 || new Set(ids).size!==8) throw new Error('SAMPLE_SELECTION_INVALID')
  const selected = catalog.map(model=>{
    const variants=model.variants.filter(variant=>ids.includes(variant.localId))
    if(variants.length!==1)throw new Error('SAMPLE_SELECTION_INVALID')
    return {localVariantId:variants[0].localId,merchandiseId:variants[0].id,sku:variants[0].sku,
      productId:model.productId,localProductId:model.localProductId,model:model.model,color:variants[0].color,size:variants[0].size,
      quantity:1,expectedPriceCents:model.priceCents}
  })
  if(selected.some(line=>!ids.includes(line.localVariantId)))throw new Error('SAMPLE_SELECTION_INVALID')
  return selected
}
export type SampleLine = ReturnType<typeof selectSampleLines>[number]
export type SampleVariant = {id:string;sku:string;availableForSale:boolean;price:{amount:string;currencyCode:string};product:{id:string};selectedOptions:{name:string;value:string}[]}
/** Untracked POD quantity is not physical stock. Only Shopify's actual sale
 * decision is used for this expressly private pre-approval sample order. */
export function assertSampleAvailability(lines:SampleLine[],nodes:(SampleVariant|null)[]) {
  if(nodes.length!==8 || new Set(nodes.filter(Boolean).map(v=>v!.id)).size!==8)throw new Error('SAMPLE_UNAVAILABLE')
  for(const line of lines){const variant=nodes.find(v=>v?.id===line.merchandiseId)
    if(!variant || variant.product.id!==line.productId || variant.sku!==line.sku || variant.availableForSale!==true ||
      !Array.isArray(variant.selectedOptions) || variant.selectedOptions.length!==2 || !variant.selectedOptions.some(o=>o.value===line.color) || !variant.selectedOptions.some(o=>o.value===line.size) ||
      variant.price.currencyCode!=='EUR' || moneyToCents(variant.price.amount)!==line.expectedPriceCents)throw new Error('SAMPLE_UNAVAILABLE')
  }
}
export const SAMPLE_VARIANTS_QUERY=`query MoseSampleVariants($ids:[ID!]!) @inContext(country:NL,language:NL) {
 nodes(ids:$ids){...on ProductVariant{id sku availableForSale price{amount currencyCode} product{id} selectedOptions{name value}}}
}`
