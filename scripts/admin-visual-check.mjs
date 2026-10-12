import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'

/**
 * Visuele controle van het ADMIN-paneel op desktop en mobiel.
 *
 * Vereist een ingelogde sessie in admin-session.json (Playwright storageState).
 * Legt per pagina vast: HTTP-status, console-errors, mislukte requests,
 * horizontale overflow, tapdoelen onder 44px, en tabellen zonder scrollcontainer.
 */
const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = process.env.OUT || './admin-shots'
const TAG = process.env.TAG || 'admin'
const SESSION = process.env.SESSION

const PAGES = [
  ['dashboard', '/admin'],
  ['orders', '/admin/orders'],
  ['products', '/admin/products'],
  ['inventory', '/admin/inventory'],
  ['customers', '/admin/customers'],
  ['returns', '/admin/returns'],
  ['analytics', '/admin/analytics'],
  ['behavior', '/admin/behavior'],
  ['media', '/admin/media'],
  ['settings', '/admin/settings'],
  ['newsletter', '/admin/newsletter'],
  ['campaigns', '/admin/campaigns'],
  ['homepage', '/admin/homepage'],
  ['lookbook', '/admin/lookbook'],
  ['blog', '/admin/blog'],
  ['categories', '/admin/categories'],
  ['reviews', '/admin/reviews'],
  ['loyalty', '/admin/loyalty'],
  ['gift-cards', '/admin/gift-cards'],
  ['chat', '/admin/chat'],
  ['audit-log', '/admin/audit-log'],
  ['promo-codes', '/admin/promo-codes'],
]

const VIEWPORTS = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['mobiel', devices['iPhone 14']],
]

const report = []
const browser = await chromium.launch()

for (const [vpName, vpOpts] of VIEWPORTS) {
  const ctx = await browser.newContext({ ...vpOpts, locale: 'nl-NL', storageState: SESSION })
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage()
    const consoleErrors = []
    const failedRequests = []
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)) })
    page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 110)}`))
    let status = 'ok'
    let httpStatus = null
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60_000 })
      httpStatus = resp?.status() ?? null
      await page.waitForTimeout(1800)
    } catch (e) {
      status = 'navigatiefout: ' + e.message.slice(0, 110)
    }

    const metingen = await page.evaluate(() => {
      const d = document.documentElement
      const klein = []
      for (const el of document.querySelectorAll('button, a[href], [role="button"], select')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.width < 44 || r.height < 44) {
          klein.push(`${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 18)}:${Math.round(r.width)}x${Math.round(r.height)}`)
        }
      }
      const tabellenZonderScroll = []
      for (const t of document.querySelectorAll('table')) {
        let p = t.parentElement, scrollbaar = false
        for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
          const ov = getComputedStyle(p).overflowX
          if (ov === 'auto' || ov === 'scroll') { scrollbaar = true; break }
        }
        if (!scrollbaar) tabellenZonderScroll.push(Math.round(t.getBoundingClientRect().width))
      }
      return {
        scrollW: d.scrollWidth, clientW: d.clientWidth,
        kleineTapdoelen: klein.length, voorbeelden: klein.slice(0, 4),
        tabellen: document.querySelectorAll('table').length,
        tabellenZonderScroll,
      }
    }).catch(() => null)

    try { await page.screenshot({ path: `${OUT}/${TAG}-${vpName}-${name}.png`, fullPage: true }) }
    catch (e) { status += ' | screenshotfout' }

    report.push({
      viewport: vpName, page: name, path, httpStatus, status,
      horizontaleOverflow: metingen && metingen.scrollW > metingen.clientW + 1 ? `${metingen.scrollW}px in ${metingen.clientW}px` : 'nee',
      kleineTapdoelen: metingen?.kleineTapdoelen ?? null,
      voorbeeldenTapdoelen: metingen?.voorbeelden ?? [],
      tabellen: metingen?.tabellen ?? 0,
      tabellenZonderScroll: metingen?.tabellenZonderScroll ?? [],
      consoleErrors: consoleErrors.slice(0, 4),
      failedRequests: failedRequests.slice(0, 3),
    })
    console.log(`[${vpName}] ${name} -> ${httpStatus} ${status === 'ok' ? '' : status}`)
    await page.close()
  }
  await ctx.close()
}
await browser.close()
fs.writeFileSync(`${OUT}/${TAG}-report.json`, JSON.stringify(report, null, 2))
console.log('\nKLAAR: ' + OUT + '/' + TAG + '-report.json')
