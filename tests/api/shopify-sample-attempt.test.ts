import { describe, it, expect } from 'vitest'
import { readSampleAttempt, reserveSampleAttempt, sampleAttemptKey } from '@/app/admin/shopify/samples/sample-attempt'
function storage(): Storage {
 const values = new Map<string,string>()
 return { get length(){ return values.size }, clear:()=>values.clear(), key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)} }
}
const variants=Array.from({length:8},(_,i)=>`variant-${i}`)
describe('shared private sample attempt',()=>{
 it('reuses the durable attempt from another tab and refuses changed selections',()=>{
  const shared=storage()
  const first=reserveSampleAttempt(shared,storage(),variants,()=> 'first')
  expect(reserveSampleAttempt(shared,storage(),variants,()=> 'second')).toEqual(first)
  expect(()=>reserveSampleAttempt(shared,storage(),variants.map(v=>v+'changed'),()=> 'third')).toThrow('andere maten')
 })
 it('migrates the existing session attempt before creating another one',()=>{
  const shared=storage(), legacy=storage()
  legacy.setItem(sampleAttemptKey,JSON.stringify({id:'existing',variants}))
  expect(reserveSampleAttempt(shared,legacy,variants,()=> 'new').id).toBe('existing')
  expect(legacy.getItem(sampleAttemptKey)).toBeNull()
  expect(readSampleAttempt(shared,storage())?.id).toBe('existing')
 })
 it('preserves conflicting legacy and shared attempts for operator review',()=>{
  const shared=storage(),legacy=storage()
  shared.setItem(sampleAttemptKey,JSON.stringify({id:'one',variants}))
  legacy.setItem(sampleAttemptKey,JSON.stringify({id:'two',variants}))
  expect(()=>readSampleAttempt(shared,legacy)).toThrow('verschillende')
  expect(shared.getItem(sampleAttemptKey)).toContain('one')
  expect(legacy.getItem(sampleAttemptKey)).toContain('two')
 })
 it('fails closed on malformed data or storage failure without losing the old attempt',()=>{
  const shared=storage(),legacy=storage()
  legacy.setItem(sampleAttemptKey,JSON.stringify({id:'existing',variants}))
  shared.setItem=()=>{throw new Error('storage unavailable')}
  expect(()=>readSampleAttempt(shared,legacy)).toThrow('storage unavailable')
  expect(legacy.getItem(sampleAttemptKey)).toContain('existing')
  legacy.setItem(sampleAttemptKey,'broken')
  expect(()=>reserveSampleAttempt(storage(),legacy,variants,()=> 'new')).toThrow()
 })
})
