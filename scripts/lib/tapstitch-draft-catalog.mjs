import { createHash } from 'node:crypto'

const ROLES = ['front', 'back', 'angle', 'detail', 'lifestyle']
const UUID_NAMESPACE = 'mose/tapstitch-unprinted-2026-10-27/'

export function stableId(key) {
  const hex = createHash('sha256').update(UUID_NAMESPACE + key).digest('hex').slice(0, 32).split('')
  hex[12] = '8'
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16)
  const value = hex.join('')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}

function insist(condition, message) {
  if (!condition) throw new Error(message)
}

export function validateManifest(manifest) {
  insist(manifest.version === 1 && manifest.mode === 'draft-only', 'Only version 1 draft manifests are supported')
  insist(manifest.importKey === 'tapstitch-unprinted-2026-10-27', 'Unexpected import identity')
  insist(manifest.products?.length === 8, 'Expected eight source models')
  const ids = new Set(), slugs = new Set(), paths = new Set()
  let variantCount = 0, colorCount = 0
  for (const product of manifest.products) {
    insist(/^\d+$/.test(product.sourceProductId) && !ids.has(product.sourceProductId), 'Duplicate or invalid source product')
    ids.add(product.sourceProductId)
    insist(/^tapstitch-[a-z0-9-]+$/.test(product.slug) && !slugs.has(product.slug), 'Duplicate or invalid product slug')
    slugs.add(product.slug)
    insist(product.salePriceEur === null && product.landedCostEur === null, 'This import cannot approve prices or costs')
    insist(product.sampleVerified === false && product.fulfillmentVerified === false, 'This import cannot certify samples or fulfillment')
    insist(product.name && product.description && product.descriptionEn && product.sizeGuide?.type === 'table', 'Product content is incomplete')
    const colors = new Set()
    for (const color of product.colorways) {
      insist(Number.isSafeInteger(color.sourceColorId) && !colors.has(color.sourceColorId), 'Duplicate or invalid color')
      colors.add(color.sourceColorId)
      insist(color.name && /^#[a-f0-9]{6}$/i.test(color.hex), 'Missing color name or swatch')
      const expectedSizes = product.sourceCode.startsWith('RT0028-') ? ['S', 'M', 'L', 'XL'] : ['S', 'M', 'L', 'XL', '2XL']
      insist(JSON.stringify(color.sizes) === JSON.stringify(expectedSizes), 'Sizes do not match verified supplier options')
      insist(color.images.length === 5 && ROLES.every(role => color.images.some(image => image.role === role)), 'Every color requires five distinct image roles')
      for (const image of color.images) {
        insist(/^images\/[A-Za-z0-9-]+\.png$/.test(image.path) && !paths.has(image.path), 'Invalid or duplicate image path')
        insist(/^[a-f0-9]{64}$/.test(image.sha256) && image.status === 'concept-review', 'Missing image integrity or concept status')
        paths.add(image.path)
      }
      variantCount += color.sizes.length
      colorCount++
    }
  }
  insist(colorCount === 13 && variantCount === 63 && paths.size === 65, 'Expected 13 colorways, 63 variants and 65 images')
  return { products: 8, colorways: colorCount, variants: variantCount, images: paths.size }
}

/** Values are intentionally not supplier order IDs or SKU mappings. */
export function buildDraftRows(manifest, imageUrls) {
  validateManifest(manifest)
  const products = [], product_variants = [], product_images = []
  for (const product of manifest.products) {
    const id = stableId(`product/${product.sourceProductId}`)
    products.push({
      id, name: product.name, name_en: product.nameEn, slug: product.slug,
      description: product.description, description_en: product.descriptionEn,
      base_price: 0, sale_price: null, is_active: false, status: 'draft',
      is_gift_card: false, allows_custom_amount: false, is_featured: false, featured: false,
      category_id: null, size_guide_content: product.sizeGuide, size_guide_content_en: product.sizeGuideEn,
      show_color_variants_on_shop: false,
    })
    let imagePosition = 0, variantPosition = 0
    for (const color of product.colorways) {
      for (const size of color.sizes) {
        product_variants.push({
          id: stableId(`variant/${product.sourceProductId}/${color.sourceColorId}/${size}`), product_id: id,
          sku: `MOSE-TS-${product.sourceCode.split('-')[0]}-${color.sourceColorId}-${size}`,
          color: color.name, color_hex: color.hex, size, display_order: variantPosition++,
          stock_quantity: 0, price_adjustment: 0, is_available: false,
          presale_enabled: false, presale_stock_quantity: 0,
        })
      }
      for (const image of color.images) {
        const url = imageUrls[image.path]
        insist(typeof url === 'string' && /^https:\/\//.test(url), `No uploaded HTTPS image for ${image.path}`)
        product_images.push({
          id: stableId(`image/${product.sourceProductId}/${color.sourceColorId}/${image.role}`), product_id: id,
          color: color.name, url, is_primary: imagePosition === 0, position: imagePosition++, media_type: 'image',
          alt_text: `${product.name} — ${color.name} — ${image.role} (conceptbeeld; samplecontrole volgt)`,
        })
      }
    }
  }
  return { products, product_variants, product_images }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

/** Refuse changes to existing rows; only missing, deterministic rows can be inserted. */
export function planInserts(expected, existing) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const plan = {}
  for (const [table, rows] of Object.entries(expected)) {
    const current = existing[table] ?? []
    const byId = new Map(current.map(row => [row.id, row]))
    const uniqueField = table === 'products' ? 'slug' : table === 'product_variants' ? 'sku' : null
    for (const row of rows) {
      if (uniqueField && current.some(other => other[uniqueField] === row[uniqueField] && other.id !== row.id)) {
        throw new Error(`${table}: ${uniqueField} collision for ${row[uniqueField]}; no overwrite permitted`)
      }
      const found = byId.get(row.id)
      if (!found) continue
      for (const [key, value] of Object.entries(row)) {
        if (JSON.stringify(canonical(found[key])) !== JSON.stringify(canonical(value))) {
          throw new Error(`${table}: existing ${row.id} differs at ${key}; inspect it before retrying`)
        }
      }
    }
    // Unexpected variants or images mean another process/admin edited this import.
    if (table !== 'products') {
      const parents = new Set(expected.products.map(product => product.id))
      const expectedIds = new Set(rows.map(row => row.id))
      insist(!current.some(row => parents.has(row.product_id) && !expectedIds.has(row.id)), `${table}: unexpected child rows; refusing an ambiguous import`)
    }
    plan[table] = rows.filter(row => !byId.has(row.id))
  }
  return plan
}
