import { chromium, devices } from 'playwright'
const S = process.argv[2]
const b = await chromium.launch()
for (const [naam, opties] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext(opties)
  const p = await ctx.newPage()
  for (const [slug, maat] of [['mose-essential-hoodie', 'M'], ['mose-classic-sweater', 'L']]) {
    await p.goto(`https://www.mosewear.com/nl/product/${slug}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(3000)
    try { await p.getByRole('button', { name: new RegExp(`^${maat}$`) }).first().click({ timeout: 4000 }) } catch {}
    await p.waitForTimeout(400)
    try { await p.getByRole('button', { name: /winkelmand|toevoegen|in de mand/i }).first().click({ timeout: 5000 }) } catch {}
    await p.waitForTimeout(1800)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
  }
  await p.goto('https://www.mosewear.com/nl/cart', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000)
  const m = await p.evaluate(() => {
    const bar = document.querySelector('[data-onderbalk]')
    const chat = document.querySelector('.chat-knop')
    const laatste = document.querySelector('ul li:last-child')
    return {
      hoogte: document.documentElement.scrollHeight,
      breedte: document.documentElement.scrollWidth,
      artikelen: document.querySelectorAll('section ul > li').length,
      balkTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
      chatBottom: chat ? Math.round(window.innerHeight - chat.getBoundingClientRect().bottom) : null,
      chatOverlaptBalk: !!(bar && chat && chat.getBoundingClientRect().bottom > bar.getBoundingClientRect().top),
    }
  })
  console.log(naam, JSON.stringify(m))
  await p.screenshot({ path: `${S}/mand2-${naam}.png`, fullPage: true })
  // ook een schermvullende opname onderaan, om de balk en chatknop te zien
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${S}/mand2-${naam}-onder.png` })
  await ctx.close()
}
await b.close()
