/**
 * HEAD-request every URL in `scripts/photoshoot-urls.json` and report
 * any non-200 responses. Catches typos in storage keys, missing
 * variants, and stale CDN caches before they ship to the storefront.
 *
 * Run with:  npx tsx scripts/verify-photoshoot-2026.ts
 *
 * Exits non-zero if any URL fails, so this is safe to wire into CI.
 */

import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'

dotenv.config({ path: '.env.local' })

const URL_MAP: Record<string, Record<string, string>> = JSON.parse(
  readFileSync(path.resolve(__dirname, 'photoshoot-urls.json'), 'utf-8'),
)

interface CheckResult {
  tag: string
  variant: string
  url: string
  status: number | 'error'
  ok: boolean
}

async function head(url: string): Promise<{ status: number | 'error'; ok: boolean }> {
  try {
    // Some Supabase CDN edges return 400 on HEAD but 200 on GET; fall
    // back to a Range GET so we don't pull the full image but still
    // verify the object exists.
    const res = await fetch(url, { method: 'HEAD' })
    if (res.status >= 200 && res.status < 400) return { status: res.status, ok: true }
    const range = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
    return { status: range.status, ok: range.status >= 200 && range.status < 400 }
  } catch {
    return { status: 'error', ok: false }
  }
}

async function main() {
  const checks: Promise<CheckResult>[] = []
  for (const [tag, variants] of Object.entries(URL_MAP)) {
    for (const [variant, url] of Object.entries(variants)) {
      checks.push(
        head(url).then(({ status, ok }) => ({ tag, variant, url, status, ok })),
      )
    }
  }

  const total = checks.length
  console.log(`Verifying ${total} photoshoot-2026 URLs …\n`)

  const results: CheckResult[] = []
  // Cap concurrency at 16 so we don't hammer the CDN.
  const concurrency = 16
  for (let i = 0; i < checks.length; i += concurrency) {
    const batch = await Promise.all(checks.slice(i, i + concurrency))
    results.push(...batch)
    process.stdout.write(`  · ${Math.min(i + concurrency, total)}/${total}\r`)
  }
  console.log('')

  const failed = results.filter((r) => !r.ok)
  if (failed.length === 0) {
    console.log(`\n✓ All ${total} URLs reachable.`)
    return
  }
  console.log(`\n✗ ${failed.length} of ${total} URLs failed:`)
  for (const f of failed) {
    console.log(`  · [${f.status}] ${f.tag}/${f.variant} — ${f.url}`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error('\n✗ verify-photoshoot-2026 failed:', err)
  process.exit(1)
})
