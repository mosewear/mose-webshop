/**
 * Prune EVERY object under `photoshoot-2026/` in both public buckets so
 * the v2 deploy lands on a clean slate.
 *
 * Why we don't rely on `upsert: true` alone:
 *  - The v2 ASSETS list uses different storage keys than v1 (e.g.
 *    new `xl` variants, `multi/duo-mmx-smile`, `tee/groen/...`),
 *    so v1 leftovers would otherwise shadow forever.
 *  - PDP images are hot-served from the CDN and must not point at
 *    objects that no longer exist in our DB / pipeline.
 *
 * Idempotent and safe:
 *  - Only removes paths starting with `photoshoot-2026/` — anything
 *    outside that prefix is untouched.
 *  - Does a recursive listing (Supabase Storage `list()` only returns
 *    one level at a time) so nested folders like
 *    `product-images/photoshoot-2026/hoodie/bruin/hero-desktop.webp`
 *    are properly enumerated.
 *  - Logs a per-bucket summary before deleting; pass `--dry` to inspect
 *    without mutating.
 *
 * Run:  npx tsx scripts/prune-photoshoot-2026.ts          # delete
 *       npx tsx scripts/prune-photoshoot-2026.ts --dry    # report only
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const DRY = process.argv.includes('--dry')

const BUCKETS = ['images', 'product-images'] as const
const PREFIX = 'photoshoot-2026'
/** Supabase storage `list()` page size. The current cap is 1000. */
const PAGE_SIZE = 1000

/**
 * Recursively walk a bucket prefix. Supabase Storage's `list()` returns
 * "files" (objects) and "folders" (logical prefixes from the path
 * delimiter) interleaved. We BFS so we never lose track of a deeply
 * nested object, and we handle pagination per directory in case any
 * single folder hits 1k+ objects.
 */
async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const queue: string[] = [prefix]
  const files: string[] = []

  while (queue.length > 0) {
    const dir = queue.shift()!

    let offset = 0
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(dir, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw new Error(`list ${bucket}/${dir}: ${error.message}`)
      if (!data || data.length === 0) break

      for (const entry of data) {
        const path = dir ? `${dir}/${entry.name}` : entry.name
        // Folders surface as entries with a null `id`. Files have a
        // populated `id` and `metadata` block.
        if (entry.id === null) {
          queue.push(path)
        } else {
          files.push(path)
        }
      }
      if (data.length < PAGE_SIZE) break
      offset += data.length
    }
  }

  return files
}

async function pruneBucket(bucket: string) {
  console.log(`▶ ${bucket}/${PREFIX}`)
  const files = await listAll(bucket, PREFIX)
  console.log(`  · found ${files.length} object(s) under ${PREFIX}/`)
  if (files.length === 0) return

  if (DRY) {
    files.slice(0, 25).forEach((f) => console.log(`    ${f}`))
    if (files.length > 25) console.log(`    … +${files.length - 25} more`)
    console.log('  · DRY run, not deleting.')
    return
  }

  // Delete in chunks of 100; the Supabase API accepts large arrays but
  // we keep it conservative for clearer error messages on partial fail.
  const chunkSize = 100
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (error) throw new Error(`remove ${bucket} chunk ${i}: ${error.message}`)
    process.stdout.write(`  · removed ${Math.min(i + chunkSize, files.length)}/${files.length}\r`)
  }
  console.log(`\n  ✓ deleted ${files.length} object(s)`)
}

async function main() {
  console.log(`Pruning ${PREFIX}/ in: ${BUCKETS.join(', ')}${DRY ? ' (DRY)' : ''}\n`)
  for (const bucket of BUCKETS) {
    await pruneBucket(bucket)
  }
  console.log('\n✓ Done.')
}

main().catch((err) => {
  console.error('\n✗ prune-photoshoot-2026 failed:', err)
  process.exit(1)
})
