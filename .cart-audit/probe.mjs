import { chromium } from '@playwright/test'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1440,height:900}, locale:'nl-NL' })
const p = await ctx.newPage()
const r = await p.goto('https://www.mosewear.com/nl', { waitUntil:'domcontentloaded', timeout:120000 })
console.log('status', r.status())
await p.waitForTimeout(7000)
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('a[href*="/product/"]')].map(a=>a.getAttribute('href')).filter((v,i,s)=>s.indexOf(v)===i).slice(0,12))))
await b.close()
