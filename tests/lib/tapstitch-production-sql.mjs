import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {PGlite}=await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db=new PGlite()
let checks=0
const check=(a,b)=>{assert.deepEqual(a,b);checks++}
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const rejects=async(sql,args=[])=>{await assert.rejects(()=>db.query(sql,args));checks++}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table shopify_order_snapshots(shopify_order_id text primary key,order_name text);
 create table shopify_order_lines(order_id text,fulfillment_owner text,current_quantity integer);
 insert into shopify_order_snapshots values('gid://shopify/Order/1','#1001'),('gid://shopify/Order/2','#1002');
 insert into shopify_order_lines values('gid://shopify/Order/1','tapstitch',1),('gid://shopify/Order/2','mose',1);`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20261030070000_tapstitch_production_observations.sql',import.meta.url),'utf8'))
 for(const role of ['anon','authenticated'])for(const table of ['tapstitch_production_observations','tapstitch_order_links','tapstitch_latest_production','tapstitch_sync_runtime']){
   check(await scalar(`select has_table_privilege($1,$2,'select')`,[role,'public.'+table]),false)
   check(await scalar(`select has_table_privilege($1,$2,'insert')`,[role,'public.'+table]),false)
 }
 check(await scalar(`select has_table_privilege('service_role','tapstitch_production_observations','update')`),false)
 check(await scalar(`select has_table_privilege('service_role','tapstitch_production_observations','delete')`),false)
 check(await scalar(`select has_function_privilege('authenticated','claim_tapstitch_sync()','execute')`),false)
 check(await scalar(`select enabled from tapstitch_sync_runtime`),false)
 check((await db.query('select * from claim_tapstitch_sync()')).rows.length,0)
 const insert=`insert into tapstitch_production_observations(shopify_order_id,supplier_order_id,shopify_order_name,status,header_text,source_url,observed_at,run_id) values($1,'1565591867570204672',$2,$3,$4,'https://www.tapstitch.com/order/detail/1565591867570204672',$5,$6)`
 const args=['gid://shopify/Order/1','#1001','In Production','Order #1565591867570204672 #1001 In Production',new Date().toISOString(),'025a0b20-fa68-4a42-843b-cf1ae91ab4b6']
 await db.query(insert,args)
 check(await scalar('select status from tapstitch_latest_production'),'In Production')
 await rejects(insert,args) // same provider run cannot count twice
 await rejects(insert,[...args.slice(0,5),'125a0b20-fa68-4a42-843b-cf1ae91ab4b6'].map((x,i)=>i===1?'#other':x))
 await rejects(insert,args.map((x,i)=>i===0?'gid://shopify/Order/2':i===1?'#1002':i===3?'Order #1565591867570204672 #1002 In Production':i===5?'225a0b20-fa68-4a42-843b-cf1ae91ab4b6':x))
 await rejects(insert,args.map((x,i)=>i===4?new Date(Date.now()+3600000).toISOString():i===5?'325a0b20-fa68-4a42-843b-cf1ae91ab4b6':x))
 // A late older observation cannot overwrite newer confirmation.
 await db.query(insert,args.map((x,i)=>i===2?'In Review':i===3?'Order #1565591867570204672 #1001 In Review':i===4?new Date(Date.now()-3600000).toISOString():i===5?'425a0b20-fa68-4a42-843b-cf1ae91ab4b6':x))
 check(await scalar('select status from tapstitch_latest_production'),'In Production')
 await db.exec('update tapstitch_sync_runtime set enabled=true')
 const first=(await db.query('select * from claim_tapstitch_sync()')).rows
 check(first.length,1)
 check((await db.query('select * from claim_tapstitch_sync()')).rows.length,0)
 await db.exec(`update tapstitch_sync_runtime set lease_until=now()-interval '1 minute',state='starting',request_id=gen_random_uuid()`)
 check((await db.query('select * from claim_tapstitch_sync()')).rows.length,1)
 await rejects('update tapstitch_sync_runtime set spent_usd_micros=9000000,reserved_usd_micros=2400000')
 await db.exec(`update tapstitch_sync_runtime set lease_until=null,state='unknown'`)
 check((await db.query('select * from claim_tapstitch_sync()')).rows.length,0)
 console.log(`${checks} production SQL identity, freshness, privilege, lease and budget assertions passed`)
}finally{await db.close()}
