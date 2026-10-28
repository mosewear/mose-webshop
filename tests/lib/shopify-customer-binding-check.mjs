import assert from 'node:assert/strict'
import {readFile}from'node:fs/promises'
import{pathToFileURL}from'node:url'
const{PGlite}=await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db=new PGlite();let checks=0
const q=(s,a=[])=>db.query(s,a),scalar=async(s,a=[])=>Object.values((await q(s,a)).rows[0])[0]
const check=(a,b)=>{assert.deepEqual(a,b);checks++}
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
try{
 await db.exec('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);')
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000800_shopify_customer_bindings.sql',import.meta.url),'utf8'))
 await q('insert into auth.users values($1),($2)',[a,b])
 check(await scalar('select bind_shopify_customer($1,$2,$3)',[a,'gid://shopify/Customer/1','a'.repeat(64)]),true)
 check(await scalar('select bind_shopify_customer($1,$2,$3)',[a,'gid://shopify/Customer/1','a'.repeat(64)]),true)
 await assert.rejects(q('select bind_shopify_customer($1,$2,$3)',[a,'gid://shopify/Customer/2','a'.repeat(64)]),/CUSTOMER_BINDING_CONFLICT/);checks++
 await assert.rejects(q('select bind_shopify_customer($1,$2,$3)',[a,'gid://shopify/Customer/1','b'.repeat(64)]),/CUSTOMER_BINDING_CONFLICT/);checks++
 await assert.rejects(q('select bind_shopify_customer($1,$2,$3)',[b,'gid://shopify/Customer/1','b'.repeat(64)]),/duplicate key/);checks++
 check(await scalar('select count(*)::int from shopify_customer_bindings'),1)
 for(const role of['anon','authenticated']){
  check(await scalar(`select has_table_privilege('${role}','shopify_customer_bindings','select')`),false)
  check(await scalar(`select has_function_privilege('${role}','bind_shopify_customer(uuid,text,text)','execute')`),false)
 }
 check(await scalar("select has_table_privilege('service_role','shopify_customer_bindings','insert')"),false)
 console.log(`${checks} customer binding PostgreSQL assertions passed`)
}finally{await db.close()}
