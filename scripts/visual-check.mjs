import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = process.env.OUT || './shots'
const TAG = process.env.TAG || 'before'

// Admin draait achter requireAdmin(); zonder sessie verwachten we een redirect
// naar de login. Dat is nog steeds nuttig: het bewijst dat de route bestaat,
// bouwt en niet crasht. Pagina's die een sessie nodig hebben markeren we.
const PAGES = [
  ['home', '/nl'],
  ['shop', '/nl/shop'],
  ['pdp-hoodie', '/nl/product/mose-essential-hoodie'],
  ['pdp-tee', '/nl/product/mose-tee'],
  ['cart', '/nl/cart'],
  ['checkout', '/nl/checkout'],
  ['lookbook', '/nl/lookbook'],
  ['blog', '/nl/blog'],
  ['over-mose', '/nl/over-mose'],
  ['contact', '/nl/contact'],
  ['verzending', '/nl/verzending'],
  ['login', '/nl/login'],
  ['en-home', '/en'],
  ['en-pdp', '/en/product/mose-essential-hoodie'],
  ['wishlist', '/nl/wishlist'],
  ['track-order', '/nl/track-order'],
  ['blog-post', '/nl/blog/de-perfecte-winter-hoodie-koopgids'],
  ['admin-login', '/admin/login'],
]

const VIEWPORTS = [
  ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ['mobile', devices['iPhone 14']],
]

const report = []

const browser = await chromium.launch()
for (const [vpName, vpOpts] of VIEWPORTS) {
  const ctx = await browser.newContext({ ...vpOpts, locale: 'nl-NL' })
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage()
    const consoleErrors = []
    const failedRequests = []
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
    page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 120)}`))
    let status = 'ok'
    let httpStatus = null
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60_000 })
      httpStatus = resp?.status() ?? null
      await page.waitForTimeout(1200)
    } catch (e) {
      status = 'navigatiefout: ' + e.message.slice(0, 120)
    }
    // horizontale overflow meten
    const overflow = await page.evaluate(() => {
      const d = document.documentElement
      return { scrollW: d.scrollWidth, clientW: d.clientWidth }
    }).catch(() => null)
    const file = `${OUT}/${TAG}-${vpName}-${name}.png`
    try {
      await page.screenshot({ path: file, fullPage: true })
    } catch (e) {
      status += ' | screenshotfout: ' + e.message.slice(0, 80)
    }
    report.push({
      viewport: vpName, page: name, path, httpStatus, status,
      horizontalOverflow: overflow && overflow.scrollW > overflow.clientW + 1
        ? `${overflow.scrollW}px in ${overflow.clientW}px` : 'nee',
      consoleErrors: consoleErrors.slice(0, 5),
      failedRequests: failedRequests.slice(0, 5),
    })
    console.log(`[${vpName}] ${name} -> ${httpStatus} ${status === 'ok' ? '' : status}`)
    await page.close()
  }
  await ctx.close()
}
await browser.close()
fs.writeFileSync(`${OUT}/${TAG}-report.json`, JSON.stringify(report, null, 2))
console.log('\nKLAAR. Rapport: ' + OUT + '/' + TAG + '-report.json')
