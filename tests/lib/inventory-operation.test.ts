// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { inventoryOperation } from '@/lib/admin/inventory-operation'
const stored = new Map<string, string>()
beforeEach(() => { stored.clear(); vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) }) })
afterEach(()=>vi.unstubAllGlobals())
describe('durable inventory command ownership',()=>{
 it('retains an unknown action across retries and rotates only after confirmation',async()=>{
  vi.stubGlobal('crypto',webcrypto)
  const payload={variantId:'reviewed-variant',delta:2,notes:'private receipt note'}
  const first=await inventoryOperation('adjust',payload),retry=await inventoryOperation('adjust',payload)
  expect(retry.id).toBe(first.id)
  expect(JSON.stringify([...stored])).not.toContain('private receipt note')
  expect(JSON.stringify([...stored])).not.toContain('reviewed-variant')
  first.confirmed()
  expect((await inventoryOperation('adjust',payload)).id).not.toBe(first.id)
 })
 it('gives different command intents separate keys',async()=>{
  vi.stubGlobal('crypto',webcrypto)
  const first=await inventoryOperation('adjust',{delta:1})
  expect((await inventoryOperation('adjust',{delta:2})).id).not.toBe(first.id)
  expect((await inventoryOperation('receive',{delta:1})).id).not.toBe(first.id)
 })
})
