import {describe,it,expect} from 'vitest'
import {quoteCheckoutBenefits} from '@/lib/shopify/benefit-quote'
import {evaluatePromoParity,promoParityFingerprint,promoParityRequirements,PROMO_PARITY_CONTRACT,type PromoParitySnapshot} from '@/lib/shopify/promo-parity'
const now=Date.parse('2026-10-29T10:00:00Z')
const s:PromoParitySnapshot={complete:true,promotions:[{id:'p',code:'EXAMPLE',discount_type:'percentage',discount_value:7.5,min_order_value:0,usage_limit:null,usage_count:0,expires_at:null,is_active:true,applies_to_sale_items:false}],products:[{id:'a',base_price:79,sale_price:null,is_gift_card:false}],variants:[{id:'v',price_adjustment:0}],mappings:[{mose_variant_id:'v',shopify_variant_id:'gid://shopify/ProductVariant/1',price_eur_cents:7900}],tiers:[]}
function proof(snapshot=s){return {api_version:'2026-10',contract_version:PROMO_PARITY_CONTRACT,config_fingerprint:promoParityFingerprint(snapshot),verified_at:new Date(now-1000).toISOString(),expires_at:new Date(now+3600000).toISOString(),probe_results:promoParityRequirements(snapshot)!.map(case_id=>({case_id,expected_cents:1477,actual_cents:1477,cart_hash:'a'.repeat(64),observed_at:new Date(now-2000).toISOString()}))}}
describe('measured native promotion parity',()=>{
 it('requires exact provider arithmetic evidence for every required case',()=>{expect(evaluatePromoParity(s,null,now)).toBe('unknown');expect(evaluatePromoParity(s,proof(),now)).toBe('verified');const p=proof();p.probe_results.pop();expect(evaluatePromoParity(s,p,now)).toBe('missing')})
 it('fails on any cent mismatch or untraceable provider result',()=>{const p=proof();p.probe_results[0].actual_cents++;expect(evaluatePromoParity(s,p,now)).toBe('missing');p.probe_results[0].actual_cents--;p.probe_results[0].cart_hash='';expect(evaluatePromoParity(s,p,now)).toBe('missing')})
 it('invalidates changed promo, prices, mapping and loyalty settings',()=>{for(const changed of [{...s,promotions:[{...s.promotions[0],discount_value:10}]},{...s,products:[{...s.products[0],base_price:80}]},{...s,mappings:[{...s.mappings[0],shopify_variant_id:'gid://shopify/ProductVariant/2'}]},{...s,settings:{redemptionRate:6}}])expect(evaluatePromoParity(changed,proof(),now)).toBe('missing')})
 it('does not invalidate solely on mutable redemption counters, but exhaustion is removed by the reader',()=>{expect(promoParityFingerprint({...s,promotions:[{...s.promotions[0],usage_count:1,updated_at:'changed'}]})).toBe(promoParityFingerprint(s))})
 it.each([{discount_type:'fixed'},{min_order_value:50},{max_discount:5},{customer_id:'restricted'},{usage_limit:3}])('rejects unsupported configurations even with matching evidence: %j',change=>{const changed={...s,promotions:[{...s.promotions[0],...change}]};expect(evaluatePromoParity(changed,{...proof(),config_fingerprint:promoParityFingerprint(changed)},now)).toBe('missing')})
 it('fails on active sale exclusion or quantity tiers',()=>{expect(evaluatePromoParity({...s,products:[{...s.products[0],sale_price:59}]},proof(),now)).toBe('missing');expect(evaluatePromoParity({...s,tiers:[{}]},proof(),now)).toBe('missing')})
 it('rejects stale, future, excessively long and old-contract evidence',()=>{for(const p of [{...proof(),expires_at:new Date(now-1).toISOString()},{...proof(),verified_at:new Date(now+1).toISOString()},{...proof(),expires_at:new Date(now+86400001).toISOString()},{...proof(),contract_version:'old'},{...proof(),api_version:'2027-01'}])expect(evaluatePromoParity(s,p,now)).toBe('missing')})
 it('independently verifies physical promo arithmetic while native gifts remain undiscounted',()=>{
  const snapshot={...s,products:[...s.products,{id:'gift',is_gift_card:true,base_price:50,sale_price:null}]}
  expect(evaluatePromoParity(snapshot,proof(snapshot),now)).toBe('verified')
  expect(evaluatePromoParity(snapshot,proof(),now)).toBe('missing')
  const giftLine={productId:'00000000-0000-4000-8000-000000000001',variantId:'gid://shopify/ProductVariant/1',quantity:1,unitCents:5000,giftCard:true,onSale:false}
  expect(quoteCheckoutBenefits({lines:[giftLine],tiers:[],loyalty:{tier:'gold',lifetimePoints:10000}})).toMatchObject({subtotalCents:5000,discountCents:0,tierCents:0,payableMerchandiseCents:5000})
  expect(()=>quoteCheckoutBenefits({lines:[giftLine],tiers:[],points:100})).toThrow('BENEFITS_EXCEED_CART')
 })
 it('keeps incomplete reads unknown and zero obligations verified',()=>{expect(evaluatePromoParity({...s,complete:false},proof(),now)).toBe('unknown');expect(evaluatePromoParity({...s,promotions:[]},null,now)).toBe('verified')})
})
