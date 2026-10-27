#!/usr/bin/env node
/** No network access in default dry-run. Explicit --apply only creates unavailable drafts. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { validateManifest, buildDraftRows, planInserts } from './lib/tapstitch-draft-catalog.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const supported = new Set(['--apply', '--asset-root', '--project-ref', '--env-file', '--report', '--help'])
for (let i = 0; i < args.length; i++) {
  if (!supported.has(args[i])) throw new Error(`Unknown option: ${args[i]}`)
  if (!['--apply', '--help'].includes(args[i])) {
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${args[i]}`)
    i++
  }
}
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
if (args.includes('--help')) {
  console.log('node scripts/import-tapstitch-drafts.mjs --asset-root /path/to/tapstitch-2026-10-27 [--apply --project-ref REF --env-file /private/env] [--report /private/report.json]')
  process.exit(0)
}
const assetRoot = option('--asset-root')
if (!assetRoot) throw new Error('--asset-root is required; dry-run validates all 65 local source files')
const manifest = JSON.parse(await readFile(resolve(repo, 'docs/shopify/tapstitch-draft-catalog.json'), 'utf8'))
const counts = validateManifest(manifest)
const sources = manifest.products.flatMap(product => product.colorways.flatMap(color => color.images))
const sharp = (await import('sharp')).default
const files = []
for (const source of sources) {
  const content = await readFile(resolve(assetRoot, source.path))
  if (createHash('sha256').update(content).digest('hex') !== source.sha256) throw new Error(`Image changed after review: ${source.path}`)
  const metadata = await sharp(content).metadata()
  if (metadata.width !== source.width || metadata.height !== source.height) throw new Error(`Image dimensions changed: ${source.path}`)
  // Keep every source pixel and use lossless WebP. Original PNGs remain untouched.
  const webp = await sharp(content).webp({ lossless: true, effort: 5 }).toBuffer()
  const digest = createHash('sha256').update(webp).digest('hex')
  const storagePath = `tapstitch-drafts/2026-10-27/${digest}.webp`
  files.push({ sourcePath: source.path, storagePath, content: webp })
}
const summary = {
  mode: args.includes('--apply') ? 'apply' : 'dry-run', ...counts,
  sourceImagesVerified: true, imageEncoding: 'lossless WebP, source dimensions preserved',
  imageBytes: files.reduce((sum, file) => sum + file.content.length, 0),
  salePricesApproved: false, published: false, supplierConnectionCreated: false,
}
if (!args.includes('--apply')) {
  console.log(JSON.stringify(summary, null, 2))
  if (option('--report')) await writeFile(resolve(option('--report')), JSON.stringify({ ...summary, manifest }, null, 2) + '\n', { mode: 0o600 })
  process.exit(0)
}
const projectRef = option('--project-ref')
if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) throw new Error('Apply requires an explicit 20-character --project-ref')
if (option('--env-file')) {
  const dotenv = await import('dotenv')
  dotenv.config({ path: resolve(option('--env-file')), override: false, quiet: true })
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (url !== `https://${projectRef}.supabase.co` || !key) throw new Error('Target project does not match environment, or service-role key is missing')
const { createClient } = await import('@supabase/supabase-js')
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) },
})
const imageUrls = Object.fromEntries(files.map(file => [file.sourcePath, client.storage.from('product-images').getPublicUrl(file.storagePath).data.publicUrl]))
const rows = buildDraftRows(manifest, imageUrls)
const productIds = rows.products.map(row => row.id)
async function readRows() {
  const existing = {}
  for (const [table, expected] of Object.entries(rows)) {
    // Include slug/SKU collisions; query size is bounded to this 8-product import.
    const filters = table === 'products'
      ? `id.in.(${productIds.join(',')}),slug.in.(${expected.map(row => row.slug).join(',')})`
      : table === 'product_variants'
        ? `product_id.in.(${productIds.join(',')}),id.in.(${expected.map(row => row.id).join(',')}),sku.in.(${expected.map(row => row.sku).join(',')})`
        : `product_id.in.(${productIds.join(',')}),id.in.(${expected.map(row => row.id).join(',')})`
    const { data, error } = await client.from(table).select(Object.keys(expected[0]).join(',')).or(filters).limit(1000)
    if (error) throw new Error(`${table} preflight failed: ${error.code ?? 'unknown'} ${error.message}`)
    existing[table] = data
  }
  return existing
}
// Read and compare all rows before the first storage/database mutation.
const plan = planInserts(rows, await readRows())
const bucket = await client.storage.getBucket('product-images')
if (bucket.error || !bucket.data.public) throw new Error('Existing public product-images bucket could not be verified')
const requiredUrls = new Set(plan.product_images.map(image => image.url))
let uploaded = 0
for (const file of files) {
  if (!requiredUrls.has(imageUrls[file.sourcePath])) continue
  const { error } = await client.storage.from('product-images').upload(file.storagePath, file.content, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' })
  if (error && !['409', '400'].includes(String(error.statusCode))) throw new Error(`Image upload failed for ${file.sourcePath}: ${error.message}`)
  if (error) {
    // A storage conflict is safe only when the existing bytes exactly match.
    const existing = await client.storage.from('product-images').download(file.storagePath)
    if (existing.error || !existing.data || !Buffer.from(await existing.data.arrayBuffer()).equals(file.content)) {
      throw new Error(`Existing storage object differs or cannot be verified: ${file.sourcePath}`)
    }
  } else uploaded++
}
// No upsert: a retry can only fill missing rows, never rewrite merchant changes.
for (const [table, pending] of Object.entries(plan)) {
  if (!pending.length) continue
  const { error } = await client.from(table).insert(pending)
  if (error) throw new Error(`${table} insert failed. Drafts remain unavailable; re-run after inspection: ${error.code ?? 'unknown'} ${error.message}`)
}
const remaining = planInserts(rows, await readRows())
if (Object.values(remaining).some(pending => pending.length)) throw new Error('Read-back verification found missing rows')
const report = {
  ...summary, projectRef, verifiedAt: new Date().toISOString(), uploaded,
  inserted: Object.fromEntries(Object.entries(plan).map(([table, pending]) => [table, pending.length])),
  products: rows.products.map(product => ({ id: product.id, name: product.name, slug: product.slug, status: product.status, basePricePlaceholder: true })),
}
console.log(JSON.stringify(report, null, 2))
if (option('--report')) await writeFile(resolve(option('--report')), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
