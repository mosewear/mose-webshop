import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const gate=vi.hoisted(()=>({allowed:true}))
vi.mock('@/lib/meting-uitsluiten',()=>({magMeten:()=>({mag:gate.allowed})}))
import { trackPixelEvent } from '@/lib/facebook-pixel'
beforeEach(()=>{
  gate.allowed=true
  const storage=new Map<string,string>()
  vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)})
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({events_received:1})}))
  window.fbq=vi.fn() as unknown as Window['fbq']
})
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();delete window.fbq})
describe('Meta consent and deduplication',()=>{
  it('sends neither pixel nor server requests before consent; recovers the current product view after consent',()=>{
    trackPixelEvent('ViewContent',{content_ids:['product:blue'],value:49,currency:'EUR'})
    expect(fetch).not.toHaveBeenCalled();expect(window.fbq).not.toHaveBeenCalled()
    localStorage.setItem('mose_cookie_consent','all')
    window.dispatchEvent(new Event('mose-tracking-enabled'))
    expect(window.fbq).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledTimes(1)
    const pixel=(window.fbq as ReturnType<typeof vi.fn>).mock.calls[0]
    const body=JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(pixel[3].eventID).toBe(body.event_id)
    window.dispatchEvent(new Event('mose-tracking-enabled'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('never replays cart actions made before consent',()=>{
    trackPixelEvent('AddToCart',{value:49})
    localStorage.setItem('mose_cookie_consent','all');window.dispatchEvent(new Event('mose-tracking-enabled'))
    expect(fetch).not.toHaveBeenCalled()
  })
  it('uses keepalive and the checkout attempt ID on both delivery paths',()=>{
    localStorage.setItem('mose_cookie_consent','all')
    trackPixelEvent('InitiateCheckout',{currency:'USD',value:82.1},undefined,{eventId:'attempt-123'})
    expect(window.fbq).toHaveBeenCalledWith('track','InitiateCheckout',{currency:'USD',value:82.1},{eventID:'attempt-123'})
    const request=(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(request.keepalive).toBe(true);expect(JSON.parse(request.body).event_id).toBe('attempt-123')
  })
  it('isolates signed QA from real marketing choices and never calls the production pixel',()=>{
    vi.spyOn(document,'cookie','get').mockReturnValue('mose_meta_test=signed-ticket')
    gate.allowed=false;localStorage.setItem('mose_cookie_consent','necessary')
    trackPixelEvent('PageView')
    expect(fetch).toHaveBeenCalledOnce();expect(window.fbq).not.toHaveBeenCalled()
    expect(localStorage.getItem('mose_cookie_consent')).toBe('necessary')
  })
  it('keeps internal sessions excluded',()=>{
    gate.allowed=false;localStorage.setItem('mose_cookie_consent','all')
    trackPixelEvent('PageView');expect(fetch).not.toHaveBeenCalled()
  })
})
