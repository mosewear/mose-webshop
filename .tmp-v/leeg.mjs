import { chromium, devices } from 'playwright'
const S = process.argv[2]
const b = await chromium.launch()
for (const [naam, opties] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext(opties)
  const p = await ctx.newPage()
  await p.goto('https://www.mosewear.com/nl', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  try { await p.getByRole('button', { name: /accepteer alle/i }).click({ timeout: 4000 }) } catch {}
  await p.goto('https://www.mosewear.com/nl/cart', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(3500)
  console.log(naam, 'breedte', await p.evaluate(() => document.documentElement.scrollWidth))
  await p.screenshot({ path: `${S}/leeg-${naam}.png` })
  await ctx.close()
}
await b.close()
