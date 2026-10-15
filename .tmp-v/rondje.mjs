import { chromium, devices } from 'playwright'
const S = process.argv[2]
const b = await chromium.launch()
const fouten = []
for (const [naam, opties] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  for (const taal of ['nl', 'en']) {
    const ctx = await b.newContext(opties)
    const p = await ctx.newPage()
    p.on('pageerror', e => fouten.push(`${naam}/${taal}: ${e.message}`))
    await p.goto(`https://www.mosewear.com/${taal}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(2500)
    try { await p.getByRole('button', { name: /accepteer alle|accept all/i }).click({ timeout: 4000 }) } catch {}
    await p.goto(`https://www.mosewear.com/${taal}/product/mose-essential-hoodie`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(3000)
    try { await p.getByRole('button', { name: /^M$/ }).first().click({ timeout: 4000 }) } catch {}
    await p.waitForTimeout(400)
    try { await p.getByRole('button', { name: /winkelmand|toevoegen|in de mand|add to/i }).first().click({ timeout: 5000 }) } catch {}
    await p.waitForTimeout(1800)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)

    // mand -> afrekenen -> terugpijl -> mand
    await p.goto(`https://www.mosewear.com/${taal}/cart`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(3000)
    const mandOk = await p.evaluate(() => !!document.querySelector('section ul > li'))
    await p.getByRole('link', { name: /afrekenen|checkout/i }).first().click()
    await p.waitForTimeout(4000)
    const opAfrekenen = p.url().includes('checkout')
    // terugpijl in de afrekenkop
    await p.locator('header a[href*="/cart"]').first().click()
    await p.waitForTimeout(3500)
    const terugOpMand = p.url().includes('/cart')
    const mandNogOk = await p.evaluate(() => !!document.querySelector('section ul > li'))
    console.log(naam, taal, JSON.stringify({ mandOk, opAfrekenen, terugOpMand, mandNogOk, breedte: await p.evaluate(() => document.documentElement.scrollWidth) }))
    if (taal === 'en' && naam === 'desktop') await p.screenshot({ path: `${S}/mand-en-desktop.png` })
    await ctx.close()
  }
}
if (fouten.length) console.log('PAGINAFOUTEN:', fouten)
await b.close()
