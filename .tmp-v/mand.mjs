import { chromium, devices } from 'playwright'
const S = process.argv[2]
const b = await chromium.launch()
for (const [naam, opties] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext(opties)
  const p = await ctx.newPage()
  // twee verschillende producten in de mand leggen
  for (const [slug, maat] of [['mose-essential-hoodie', 'M'], ['mose-classic-sweater', 'L']]) {
    await p.goto(`https://www.mosewear.com/nl/product/${slug}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(3000)
    try { await p.getByRole('button', { name: new RegExp(`^${maat}$`) }).first().click({ timeout: 4000 }) } catch {}
    await p.waitForTimeout(400)
    try { await p.getByRole('button', { name: /winkelmand|toevoegen|in de mand/i }).first().click({ timeout: 5000 }) } catch (e) { console.log(naam, slug, 'knop mislukt') }
    await p.waitForTimeout(1800)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
  }
  await p.goto('https://www.mosewear.com/nl/cart', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000)
  const m = await p.evaluate(() => ({
    hoogte: document.documentElement.scrollHeight,
    breedte: document.documentElement.scrollWidth,
    regels: document.querySelectorAll('[class*="py-8"]').length,
  }))
  console.log(naam, JSON.stringify(m))
  await p.screenshot({ path: `${S}/mand-${naam}.png`, fullPage: true })
  await ctx.close()
}
await b.close()
