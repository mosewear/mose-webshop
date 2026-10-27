// @vitest-environment node
import { describe, expect, it } from 'vitest'
import manifest from '../docs/shopify/tapstitch-draft-catalog.json'
import { buildDraftRows, planInserts, stableId, validateManifest } from '../scripts/lib/tapstitch-draft-catalog.mjs'
import { needsRetailPrice } from '@/lib/product-publication'
import { isTapstitchProduct, TAPSTITCH_PRODUCT_SOURCES } from '@/lib/tapstitch-products'

const urls = Object.fromEntries(manifest.products.flatMap(product => product.colorways.flatMap(color => color.images.map(image => [image.path, `https://example.supabase.co/storage/v1/object/public/product-images/${image.sha256}.webp`]))))
const fresh = () => buildDraftRows(manifest, urls)

describe('verified eight-model draft catalog', () => {
  it('preserves exact supplier selection and complete image sets', () => {
    expect(validateManifest(manifest)).toEqual({ products: 8, colorways: 13, variants: 63, images: 65 })
    const rows = fresh()
    expect(new Set(rows.product_variants.map(row => row.sku)).size).toBe(63)
    expect(rows.products.every(product => !product.is_active && product.status === 'draft' && product.base_price === 0)).toBe(true)
    expect(rows.product_variants.every(variant => !variant.is_available && variant.stock_quantity === 0 && !variant.presale_enabled)).toBe(true)
    expect(rows.product_images.filter(image => image.is_primary)).toHaveLength(8)
    expect(rows.products.every(product => product.description && product.description_en && product.size_guide_content.rows.length > 0)).toBe(true)
  })

  it('keeps supplier identity explicit and stable for truthful storefront copy', () => {
    const rows = fresh()
    expect(Object.keys(TAPSTITCH_PRODUCT_SOURCES)).toHaveLength(8)
    expect(rows.products.every(isTapstitchProduct)).toBe(true)
    expect(isTapstitchProduct({ id: 'unrelated-product' })).toBe(false)
  })

  it('is replayable and does not overwrite existing data', () => {
    const rows = fresh()
    expect(planInserts(rows, {})).toEqual(rows)
    expect(planInserts(rows, structuredClone(rows))).toEqual({ products: [], product_variants: [], product_images: [] })
    const partial = structuredClone(rows)
    partial.product_images = partial.product_images.slice(0, 20)
    expect(planInserts(rows, partial).product_images).toHaveLength(45)
    expect(planInserts(rows, partial).products).toHaveLength(0)
  })

  it('refuses edits, active rows, SKU collisions and extra children before mutation', () => {
    for (const change of [
      (rows: ReturnType<typeof fresh>) => { rows.products[0].is_active = true },
      (rows: ReturnType<typeof fresh>) => { rows.products[0].base_price = 79 },
      (rows: ReturnType<typeof fresh>) => { rows.product_variants[0].id = stableId('foreign-row') },
      (rows: ReturnType<typeof fresh>) => { rows.product_images.push({ ...rows.product_images[0], id: stableId('extra-image') }) },
    ]) {
      const existing = fresh()
      change(existing)
      expect(() => planInserts(fresh(), existing)).toThrow()
    }
  })

  it('rejects invented sizes, incomplete imagery and unverified pricing approvals', () => {
    const badSizes = structuredClone(manifest)
    badSizes.products[1].colorways[0].sizes.push('2XL')
    expect(() => validateManifest(badSizes)).toThrow(/Sizes/)
    const missing = structuredClone(manifest)
    missing.products[0].colorways[0].images.pop()
    expect(() => validateManifest(missing)).toThrow(/five/)
    expect(() => buildDraftRows(manifest, {})).toThrow(/HTTPS image/)
    expect(() => validateManifest({ ...manifest, mode: 'live' })).toThrow(/draft/)
  })

  it('keeps placeholder prices visibly unapproved without affecting custom-value gift cards', () => {
    expect(needsRetailPrice({ base_price: 0 })).toBe(true)
    expect(needsRetailPrice({ base_price: 'NaN' })).toBe(true)
    expect(needsRetailPrice({ base_price: 79 })).toBe(false)
    expect(needsRetailPrice({ base_price: 0, is_gift_card: true })).toBe(false)
  })
})
