import { describe, expect, it } from 'vitest'
import { isTapstitchProduct, TAPSTITCH_PRODUCT_SOURCES } from '@/lib/tapstitch-products'

describe('approved sport and denim product presentation', () => {
  it('uses model-specific supplier copy for all five approved products', () => {
    const identities = [
      ['69ae6c7e-aee5-4f31-bd13-1383e95ce212', 'MT0067-P001-V2'],
      ['a25a6db0-a6d3-4ab3-a6e9-d8484db47131', 'MB0035-P001-V2'],
      ['776cb328-59c3-43fb-a790-8fd9dbf58aae', 'UB0026-O001-V2'],
      ['a5ab5fe8-a065-48c6-b765-02e5a19ac7f0', 'UT0101-C001-V2'],
      ['1b2353ca-1081-4789-846c-a24592a4aff8', 'MT0063-P001-V2'],
    ]
    for (const [id, code] of identities) {
      expect(isTapstitchProduct({ id })).toBe(true)
      expect(TAPSTITCH_PRODUCT_SOURCES[id].sourceCode).toBe(code)
    }
    expect(Object.values(TAPSTITCH_PRODUCT_SOURCES).some(p => p.sourceCode.startsWith('UT0111'))).toBe(false)
  })
})
