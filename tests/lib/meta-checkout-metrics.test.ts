import {describe,expect,it} from 'vitest'
import {readCheckoutMetrics} from '@/lib/meta/checkout-metrics'
const metrics={currency:'USD',value:97,num_items:2,content_type:'product',content_ids:['pants:black','tee:white'],contents:[{id:'pants:black',quantity:1,item_price:65},{id:'tee:white',quantity:1,item_price:32}],prices_eur:{pants:65,tee:32}}
describe('verified Meta checkout amounts',()=>{
 it('retains actual server currency and value',()=>expect(readCheckoutMetrics(metrics,2)).toMatchObject({currency:'USD',value:97}))
 it.each([undefined,{...metrics,value:'97'},{...metrics,num_items:3},{...metrics,content_ids:['other']},{...metrics,value:-1}])('rejects absent or inconsistent metrics instead of falling back to a stale cart',data=>expect(readCheckoutMetrics(data,2)).toBeNull())
})
