import { z } from 'zod'
export const checkoutMetricsSchema = z.object({
  currency: z.enum(['EUR','USD']), value: z.number().finite().nonnegative().max(100000), num_items: z.number().int().positive(),
  content_type: z.literal('product'), content_ids: z.array(z.string().min(1)).min(1),
  contents: z.array(z.object({id:z.string().min(1),quantity:z.number().int().positive(),item_price:z.number().finite().nonnegative()})).min(1),
  prices_eur: z.record(z.string(),z.number().finite().nonnegative()),
})
export type CheckoutMetrics = z.infer<typeof checkoutMetricsSchema>
export function readCheckoutMetrics(value: unknown, quantity: number): CheckoutMetrics | null {
  const parsed=checkoutMetricsSchema.safeParse(value)
  if(!parsed.success || parsed.data.num_items!==quantity || parsed.data.contents.reduce((n,l)=>n+l.quantity,0)!==quantity ||
      parsed.data.content_ids.length!==parsed.data.contents.length || parsed.data.contents.some((line,i)=>line.id!==parsed.data.content_ids[i])) return null
  return parsed.data
}
