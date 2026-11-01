// Run against `next start`, not only next dev: ISR failures appear at runtime.
import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3014'
const cases = [
  ['/en/product/mose-classic-sweater', 200, 'en'],
  ['/nl/product/mose-classic-sweater', 200, 'nl'],
  ['/en/product/boxy-fleece-hoodie', 200, 'en'],
  ['/en/product/nonexistent-runtime-check', 404, 'en'],
  ['/en/nonexistent-runtime-check', 404, 'en'],
  ['/nl/nonexistent-runtime-check', 404, 'nl'],
  ['/en/shop', 200, 'en'], ['/nl/shop', 200, 'nl'],
  ['/admin/login', 200, 'nl'],
]
const results = []
for (const [path, status, locale] of cases) {
  const response = await fetch(new URL(path, base))
  const html = await response.text()
  const lang = html.match(/<html[^>]*lang="([^"]*)"/)?.[1]
  const documents = (html.match(/<html[ >]/g) || []).length
  assert.equal(response.status, status, `${path}: HTTP status`)
  // Next may return its hydration error document for notFound() in ISR.
  // Verify localized 404 content separately in the browser.
  if (status === 200) assert.equal(lang, locale, `${path}: server-rendered language`)
  assert.equal(documents, 1, `${path}: one document`)
  assert.ok(!html.includes('DYNAMIC_SERVER_USAGE'), `${path}: ISR rendering`)
  if (status === 404) assert.ok(html.includes('noindex'), `${path}: not indexed`)
  results.push({path, status: response.status, lang: lang || null, documents})
}
console.log(JSON.stringify(results, null, 2))
