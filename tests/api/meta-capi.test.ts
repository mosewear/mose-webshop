// @vitest-environment node
import {beforeEach,describe,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
const mock=vi.hoisted(()=>({send:vi.fn()}))
vi.mock('@/lib/meta/capi',()=>({sendCapiEvent:mock.send}))
import {POST} from '@/app/api/facebook-capi/route'
const request=(event:Record<string,unknown>,cookie='mose_meta_consent=all')=>new NextRequest('https://www.mosewear.com/api/facebook-capi',{method:'POST',headers:{origin:'https://www.mosewear.com','user-agent':'Mozilla/5.0 Macintosh Chrome/142.0',cookie},body:JSON.stringify(event)})
const event={event_name:'PageView',event_id:'page-123',event_source_url:'https://www.mosewear.com/en/shop'}
beforeEach(()=>mock.send.mockReset().mockResolvedValue({ok:true,events_received:1,fbtrace_id:'trace'}))
describe('Meta relay',()=>{
 it('requires marketing consent on the server too',async()=>{expect(await(await POST(request(event,''))).json()).toMatchObject({filtered:'consent'});expect(mock.send).not.toHaveBeenCalled()})
 it('accepts the actual PageView and returns Meta receipt',async()=>{expect(await(await POST(request(event))).json()).toMatchObject({events_received:1,fbtrace_id:'trace'});expect(mock.send).toHaveBeenCalledOnce()})
 it('rejects fabricated paid orders',async()=>{expect((await POST(request({...event,event_name:'Purchase'}))).status).toBe(400);expect(mock.send).not.toHaveBeenCalled()})
 it('rejects an invalid test cookie instead of sending a production event',async()=>{expect((await POST(request(event,'mose_meta_consent=all; mose_meta_test=forged'))).status).toBe(403);expect(mock.send).not.toHaveBeenCalled()})
 it('does not claim success for a rejected Meta request',async()=>{mock.send.mockResolvedValue({ok:false,status:400});expect((await POST(request(event))).status).toBe(502)})
})
