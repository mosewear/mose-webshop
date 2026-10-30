import { z } from 'zod'
const attribute=z.object({key:z.string(),value:z.string()})
const line=z.object({merchandiseId:z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/),quantity:z.number().int().positive(),attributes:z.array(attribute).optional()})
const attributesKey=(attributes:{key:string;value:string}[]=[])=>{
  if(new Set(attributes.map(a=>a.key)).size!==attributes.length)throw new Error('CART_LINE_ATTRIBUTE_DUPLICATE')
  return JSON.stringify([...attributes].sort((a,b)=>a.key.localeCompare(b.key)))
}
/** Same-valued native gifts may have different recipients. Check exact line
 * properties/quantity rather than finding any row with the same variant ID. */
export function assertCreatedCartLines(raw:unknown,expected:unknown){
  const source=z.array(line).max(30).parse(expected)
  const actual=z.array(z.object({quantity:z.number().int().positive(),merchandise:z.object({id:z.string()}),attributes:z.array(attribute).optional()})).max(30).parse(raw)
  const key=(id:string,a:{key:string;value:string}[]|undefined)=>id+'|'+attributesKey(a)
  const wanted=new Map(source.map(l=>[key(l.merchandiseId,l.attributes),l.quantity]))
  if(wanted.size!==source.length||actual.length!==source.length)throw new Error('CART_LINE_PROOF_MISMATCH')
  for(const l of actual){const k=key(l.merchandise.id,l.attributes);if(wanted.get(k)!==l.quantity)throw new Error('CART_LINE_PROOF_MISMATCH');wanted.delete(k)}
  if(wanted.size)throw new Error('CART_LINE_PROOF_MISMATCH')
}
export function aggregateBenefitLines<T extends {variantId:string;quantity:number;unitCents:number;productId:string;giftCard:boolean;onSale:boolean}>(lines:T[]):T[]{
  const merged=new Map<string,T>()
  for(const l of lines){
    const prior=merged.get(l.variantId)
    if(prior&&(prior.unitCents!==l.unitCents||prior.productId!==l.productId||prior.giftCard!==l.giftCard||prior.onSale!==l.onSale))throw new Error('BENEFIT_VARIANT_IDENTITY_CONFLICT')
    merged.set(l.variantId,{...l,quantity:l.quantity+(prior?.quantity??0)})
  }
  return [...merged.values()].sort((a,b)=>a.variantId.localeCompare(b.variantId))
}
