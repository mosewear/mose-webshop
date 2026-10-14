import { chromium, devices } from '@playwright/test'
const OUT = process.env.OUT
const b = await chromium.launch()

const meet = () => {
  const d = document.querySelector('[data-cart-drawer]')
  if (!d) return { fout: 'lade niet gevonden' }
  const r = d.getBoundingClientRect()
  const box = e => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}@${Math.round(b.x)},${Math.round(b.y)}` }
  const label = e => (e.textContent.trim() || e.getAttribute('aria-label') || '?').replace(/\s+/g,' ').slice(0,22)
  const klein = [...d.querySelectorAll('a,button,input')].filter(e => { const b = e.getBoundingClientRect(); return b.width>0 && (b.height<44||b.width<44) }).map(e => `${label(e)} ${box(e)}`)
  const buitenBeeld = [...d.querySelectorAll('a,button,input,h2,h3,p,span')].filter(e => { const b=e.getBoundingClientRect(); return b.width>0&&b.height>0&&(b.bottom>innerHeight+1||b.top<-1) }).map(e=>`${label(e)} ${box(e)}`).slice(0,25)
  const scroller = d.querySelector('.overflow-x-auto')
  const legeBeelden = [...d.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0).map(i => (i.getAttribute('src')||'').slice(0,70))
  const scrollArea = d.querySelector('.overflow-y-auto')
  return {
    lade: `${Math.round(r.width)}x${Math.round(r.height)}`,
    scherm: `${innerWidth}x${innerHeight}`,
    tapdoelenOnder44: klein,
    buitenViewport: buitenBeeld,
    kapotteBeelden: legeBeelden,
    overflowX: d.scrollWidth > d.clientWidth + 1 ? `${d.scrollWidth} vs ${d.clientWidth}` : false,
    itemsArea: scrollArea ? { h: Math.round(scrollArea.clientHeight), scrollH: scrollArea.scrollHeight, padBottom: getComputedStyle(scrollArea).paddingBottom, scrollbaar: scrollArea.scrollHeight > scrollArea.clientHeight } : null,
    upsellScroller: scroller ? { zichtbaar: Math.round(scroller.clientWidth), inhoud: scroller.scrollWidth, afgekapt: scroller.scrollWidth - scroller.clientWidth, kaarten: scroller.children.length, eersteKaart: scroller.children[0] ? box(scroller.children[0]) : null, tweedeKaart: scroller.children[1] ? box(scroller.children[1]) : null } : 'geen scroller',
    bedragen: [...d.querySelectorAll('*')].filter(e=>e.children.length===0&&/€/.test(e.textContent)).map(e=>e.textContent.trim().replace(/\s+/g,' ').slice(0,46)),
    focus: document.activeElement ? `${document.activeElement.tagName}.${(document.activeElement.className||'').toString().slice(0,30)} "${(document.activeElement.textContent||'').trim().slice(0,18)}" inDrawer=${d.contains(document.activeElement)}` : 'geen',
    liveRegions: [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e=>`${e.getAttribute('aria-live')||e.getAttribute('role')}:"${e.textContent.trim().slice(0,40)}"`),
  }
}

for (const [naam, opts] of [['mobiel', devices['iPhone 14']], ['desktop', { viewport:{width:1440,height:900} }]]) {
  const ctx = await b.newContext({ ...opts, locale: 'nl-NL' })
  await ctx.addInitScript(() => { try { localStorage.setItem('mose_cookie_consent','all'); localStorage.setItem('mose_newsletter_popup_shown', String(Date.now())) } catch {} })
  const p = await ctx.newPage()
  const log = (k,v) => console.log(`\n### ${naam} :: ${k}\n` + (typeof v === 'string' ? v : JSON.stringify(v, null, 1)))

  await p.goto('https://www.mosewear.com/nl/product/mose-tee', { waitUntil:'domcontentloaded', timeout:120000 })
  await p.waitForTimeout(9000)

  // === lege mand: open lade via header-knop ===
  const bag = p.locator('header button[aria-label*="inkelwagen" i], header button[aria-label*="cart" i]').first()
  if (await bag.count()) {
    await bag.click(); await p.waitForTimeout(1500)
    await p.screenshot({ path: `${OUT}/${naam}-0-leeg.png` })
    log('LEGE MAND', await p.evaluate(meet))
    await p.keyboard.press('Escape'); await p.waitForTimeout(800)
    log('na Escape, lade weg?', await p.evaluate(() => !document.querySelector('[data-cart-drawer]')))
  } else { log('LEGE MAND', 'geen winkelwagenknop in header gevonden') }

  for (const m of ['M','L','XL']) { const k = p.locator('button', { hasText: new RegExp('^'+m+'$') }).first(); if (await k.count()) { await k.click(); break } }
  await p.waitForTimeout(1200)
  await p.locator('button', { hasText: /In winkelmand|Toevoegen aan/i }).first().click()
  await p.waitForTimeout(5000)
  await p.screenshot({ path: `${OUT}/${naam}-1-een-item.png` })
  log('EEN ITEM (t-shirt 50)', await p.evaluate(meet))

  // volledige lade-hoogte vastleggen
  const d = p.locator('[data-cart-drawer]')
  await d.screenshot({ path: `${OUT}/${naam}-1b-lade-full.png` }).catch(()=>{})

  // === upsell scroller: scrol naar rechts ===
  const sc = p.locator('[data-cart-drawer] .overflow-x-auto').first()
  if (await sc.count()) {
    await sc.scrollIntoViewIfNeeded().catch(()=>{})
    await p.waitForTimeout(600)
    await p.screenshot({ path: `${OUT}/${naam}-2-upsell.png` })
    await p.evaluate(() => { const s = document.querySelector('[data-cart-drawer] .overflow-x-auto'); if (s) s.scrollLeft = s.scrollWidth })
    await p.waitForTimeout(700)
    await p.screenshot({ path: `${OUT}/${naam}-3-upsell-eind.png` })
    log('UPSELL namen+prijzen', await p.evaluate(() => { const s=document.querySelector('[data-cart-drawer] .overflow-x-auto'); return s? [...s.children].map(c=>c.textContent.trim().replace(/\s+/g,' ').slice(0,80)) : null }))
  }
  await ctx.close()
}
await b.close()
