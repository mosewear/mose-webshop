import { chromium, devices } from 'playwright'
const S = process.argv[2]
const URL = process.argv[3] || 'https://www.mosewear.com'
const b = await chromium.launch()
for (const [naam, opties] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext(opties)
  const p = await ctx.newPage()
  await p.goto(`${URL}/nl`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  try { await p.getByRole('button', { name: /accepteer alle/i }).click({ timeout: 4000 }) } catch {}
  await p.waitForTimeout(800)
  for (const [slug, maat] of [['mose-essential-hoodie', 'M'], ['mose-classic-sweater', 'L']]) {
    await p.goto(`${URL}/nl/product/${slug}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(3000)
    try { await p.getByRole('button', { name: new RegExp(`^${maat}$`) }).first().click({ timeout: 4000 }) } catch {}
    await p.waitForTimeout(400)
    try { await p.getByRole('button', { name: /winkelmand|toevoegen|in de mand/i }).first().click({ timeout: 5000 }) } catch {}
    await p.waitForTimeout(1800)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
  }
  await p.goto(`${URL}/nl/cart`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000)
  const m = await p.evaluate(() => {
    const bar = document.querySelector('[data-onderbalk]')
    const chat = document.querySelector('.chat-knop')
    const cta = Array.from(document.querySelectorAll('a')).find(a => /afrekenen/i.test(a.textContent||'') && a.getBoundingClientRect().width > 150)
    const br = bar?.getBoundingClientRect()
    const cr = chat?.getBoundingClientRect()
    const tr = cta?.getBoundingClientRect()
    const overlapt = (a,b) => !!(a&&b&&a.width&&b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)
    return {
      hoogte: document.documentElement.scrollHeight,
      breedte: document.documentElement.scrollWidth,
      chatOverBalk: overlapt(cr, br),
      chatOverCta: overlapt(cr, tr),
      ctaZichtbaar: tr ? Math.round(tr.top) < window.innerHeight : null,
    }
  })
  console.log(naam, JSON.stringify(m))
  await p.screenshot({ path: `${S}/mand3-${naam}-boven.png` })
  await p.evaluate(() => window.scrollTo(0, 99999))
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${S}/mand3-${naam}-onder.png` })
  await ctx.close()
}
await b.close()
