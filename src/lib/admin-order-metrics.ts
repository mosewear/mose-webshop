export type DateRange = 'today' | '7d' | '30d' | '90d' | 'year' | 'all'

export interface OrderMetricRow {
  source?: string
  revenue?: number
  status: string
  payment_status: string
  total: number
  checkout_started_at: string | null
  created_at: string
  /** Nodig om te zien of dezelfde klant het alsnog heeft gekocht. */
  email: string | null
}

export interface PeriodStats {
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  unpaidOrders: number
  pendingPayments: number
  totalRevenue: number
  conversionRate: number
  avgOrderValue: number
  abandonedCarts: number
}


export function moneyCents(value: number): number {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) throw new Error('INVALID_ANALYTICS_AMOUNT')
  return Math.round(value * 100)
}

export function resolveDateWindow(range: DateRange, now = new Date()): { currentStart: Date; prevStart: Date } {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
  const n=(key:string)=>Number(parts.find(p=>p.type===key)?.value)
  const midnight=(year:number,month:number,day:number)=> {
    const wall=Date.UTC(year,month-1,day)
    let result=wall
    for(let i=0;i<3;i++) {
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(result))
      const v=(k:string)=>Number(p.find(x=>x.type===k)?.value)
      result+=wall-Date.UTC(v('year'),v('month')-1,v('day'),v('hour'),v('minute'),v('second'))
    }
    return new Date(result)
  }
  if(range==='all') return {currentStart:new Date(0),prevStart:new Date(0)}
  if(range==='year') return {currentStart:midnight(n('year'),1,1),prevStart:midnight(n('year')-1,1,1)}
  if(range==='today') return {currentStart:midnight(n('year'),n('month'),n('day')),prevStart:midnight(n('year'),n('month'),n('day')-1)}
  const days=range==='7d'?7:range==='30d'?30:90
  return {currentStart:new Date(now.getTime()-days*86400000),prevStart:new Date(now.getTime()-2*days*86400000)}
}

export function computePeriodStats(orders: OrderMetricRow[], allOrders = orders, now = Date.now()): PeriodStats {
  const totalOrders = orders.length
  const paid = orders.filter(o => ['paid','partially_paid','partially_refunded','refunded'].includes(o.payment_status))
  const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid' || !o.payment_status).length
  const pendingPayments = orders.filter(o => o.payment_status === 'pending').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length

  const totalRevenue = paid.reduce((sum, o) => sum + moneyCents(o.revenue ?? o.total), 0) / 100
  const avgOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0

  // This is the share of recorded orders that were paid, not visitor conversion.
  const conversionRate = totalOrders > 0 ? (paid.length / totalOrders) * 100 : 0

  /**
   * Verlaten winkelwagens, met dezelfde definitie als de herinneringsmail.
   *
   * Hier stond simpelweg "ouder dan 24 uur en niet betaald". Dat telde er 21,
   * terwijl er 1 echt verlaten was. In die 21 zaten vijf bestellingen met
   * status `refunded`, dus klanten die gewoon gekocht hebben en later hebben
   * geretourneerd, acht mislukte betaalpogingen, en acht onbetaalde regels die
   * stuk voor stuk een dubbele waren: dezelfde klant rondde minuten later een
   * nieuwe bestelling wel af.
   *
   * Een getal dat twintig keer te hoog staat is erger dan geen getal, want je
   * gaat erop sturen. Nu dezelfde drie regels als in get_abandoned_carts:
   * alleen onbetaald, niet geannuleerd, geen eigen adres, en niemand die het
   * daarna alsnog heeft gekocht.
   */
  const cutoff = new Date(now - 24 * 60 * 60 * 1000)
  const betaaldPerAdres = new Map<string, number>()
  for (const o of allOrders) {
    if (!['paid','partially_paid','partially_refunded','refunded'].includes(o.payment_status) || !o.email) continue
    const sleutel = o.email.toLowerCase()
    const t = new Date(o.created_at).getTime()
    betaaldPerAdres.set(sleutel, Math.max(betaaldPerAdres.get(sleutel) ?? 0, t))
  }

  const abandonedCarts = orders.filter((o) => {
    if (!o.checkout_started_at) return false
    if (new Date(o.checkout_started_at) >= cutoff) return false
    if (o.payment_status !== 'unpaid' && o.payment_status !== 'pending') return false
    if (o.status === 'cancelled') return false
    if (!o.email || o.email.toLowerCase().endsWith('@mosewear.com')) return false
    // Heeft dit adres rond of na dit moment alsnog betaald? Dan is het geen
    // verlaten mand maar een tweede poging die wel is gelukt.
    const laatstBetaald = betaaldPerAdres.get(o.email.toLowerCase())
    if (laatstBetaald && laatstBetaald >= new Date(o.created_at).getTime() - 30 * 60 * 1000) return false
    return true
  }).length

  return {
    totalOrders,
    pendingOrders,
    paidOrders: paid.length,
    unpaidOrders,
    pendingPayments,
    totalRevenue,
    conversionRate,
    avgOrderValue,
    abandonedCarts,
  }
}

