import { z } from 'zod'
export const NATIVE_GIFT_PRODUCT_ID = 'bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c'
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value+'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
})
export const nativeGiftRecipientSchema = z.object({
  recipientEmail: z.string().trim().email().max(254),
  recipientName: z.string().trim().max(255).optional(),
  senderName: z.string().trim().max(100).optional(),
  personalMessage: z.string().trim().max(200).optional(),
  sendOn: dateOnly.optional(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
}).strict().refine(value => !value.sendOn || value.timezoneOffsetMinutes !== undefined, 'SCHEDULE_TIMEZONE_REQUIRED')
export const nativeGiftLineSchema = z.object({
  productId: z.literal(NATIVE_GIFT_PRODUCT_ID),
  amountCents: z.number().int().min(2_000).max(100_000),
  quantity: z.number().int().min(1).max(10),
  recipient: nativeGiftRecipientSchema.optional(),
}).strict()
export type NativeGiftLine = z.infer<typeof nativeGiftLineSchema>

/** An explicit denomination request, never client authority over a Shopify price. */
export function nativeGiftAmountCents(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('INVALID_GIFT_AMOUNT')
  const text=String(value)
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('INVALID_GIFT_AMOUNT')
  const [whole,fraction='']=text.split('.')
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'))
  if (!Number.isSafeInteger(cents) || cents<2000 || cents>100000) throw new Error('INVALID_GIFT_AMOUNT')
  return cents
}

/** Canonical stable input: reordering carts cannot rotate a payable attempt.
 * Distinct recipients remain distinct native line properties at the same value. */
export function normalizeNativeGiftLines(raw: unknown): NativeGiftLine[] {
  const lines=z.array(nativeGiftLineSchema).max(30).parse(raw)
  const grouped=new Map<string,NativeGiftLine>()
  const amountTotals=new Map<number,number>()
  for (const line of lines) {
    const total=(amountTotals.get(line.amountCents)??0)+line.quantity
    if(total>10)throw new Error('GIFT_QUANTITY_LIMIT')
    amountTotals.set(line.amountCents,total)
    const recipient=line.recipient ? {
      recipientEmail:line.recipient.recipientEmail,
      ...(line.recipient.recipientName ? {recipientName:line.recipient.recipientName}:{}),
      ...(line.recipient.senderName ? {senderName:line.recipient.senderName}:{}),
      ...(line.recipient.personalMessage ? {personalMessage:line.recipient.personalMessage}:{}),
      ...(line.recipient.sendOn ? {sendOn:line.recipient.sendOn,timezoneOffsetMinutes:line.recipient.timezoneOffsetMinutes}:{}),
    } : undefined
    const normalized={productId:line.productId,amountCents:line.amountCents,quantity:line.quantity,...(recipient?{recipient}:{})}
    const key=JSON.stringify({...normalized,quantity:undefined})
    const previous=grouped.get(key)
    const quantity=(previous?.quantity??0)+line.quantity
    if(quantity>10) throw new Error('GIFT_QUANTITY_LIMIT')
    grouped.set(key,{...normalized,quantity})
  }
  return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,line])=>line)
}

/** Official native recipient property names are case-sensitive. No raw gift
 * redemption code is accepted or stored by this contract. Shopify alone issues. */
export function nativeGiftScheduleWithinWindow(sendOn:string,offset:number,now=Date.now()) {
  if(!dateOnly.safeParse(sendOn).success||!Number.isInteger(offset)||offset<-840||offset>840)return false
  const localNow=new Date(now-offset*60_000).toISOString().slice(0,10)
  const latest=new Date(Date.parse(localNow+'T00:00:00Z')+90*86400000).toISOString().slice(0,10)
  return sendOn>=localNow&&sendOn<=latest
}

export function nativeGiftRecipientAttributes(line:NativeGiftLine,locale:'nl'|'en',now=Date.now()) {
  const {recipient}=nativeGiftLineSchema.parse(line)
  if(!recipient) return [] as {key:string;value:string}[]
  const prefix=recipient.senderName ? `${locale==='en'?'From':'Van'}: ${recipient.senderName}` : ''
  const message=[prefix,recipient.personalMessage].filter(Boolean).join('\n\n')
  if(message.length>200) throw new Error('NATIVE_GIFT_MESSAGE_TOO_LONG')
  if(recipient.sendOn&&!nativeGiftScheduleWithinWindow(recipient.sendOn,recipient.timezoneOffsetMinutes??0,now))throw new Error('NATIVE_GIFT_SCHEDULE_INVALID')
  return [
    {key:'__shopify_send_gift_card_to_recipient',value:'true'},
    {key:'Recipient email',value:recipient.recipientEmail},
    ...(recipient.recipientName?[{key:'Recipient name',value:recipient.recipientName}]:[]),
    ...(message?[{key:'Message',value:message}]:[]),
    ...(recipient.sendOn?[{key:'Send on',value:recipient.sendOn},{key:'__shopify_offset',value:String(recipient.timezoneOffsetMinutes)}]:[]),
  ]
}
