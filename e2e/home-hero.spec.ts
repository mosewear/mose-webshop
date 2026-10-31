import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mose_cookie_consent', 'necessary'))
  // UI tests never persist support conversations to the live database.
  await page.route('**/api/chat/save-message', route => route.fulfill({ json: { success: true, conversationId: 'ui-test' } }))
})

for (const [width, height] of [[320, 568], [375, 600], [390, 664], [430, 760], [768, 1024], [1440, 900]]) {
  for (const locale of ['nl', 'en']) {
    test(`${locale} hero fits ${width}x${height} and chat follows scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto(`/${locale}`)
      const hero = page.locator('[data-home-hero]')
      await expect(hero).toBeVisible()
      const actions = page.locator('[data-hero-actions] a')
      await expect(actions).toHaveCount(2)
      await expect(actions.first()).toHaveCSS('background-color', 'rgb(0, 122, 86)')
      await expect(actions.first()).toHaveCSS('color', 'rgb(255, 255, 255)')
      for (const action of await actions.all()) {
        const box = await action.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(box!.y + box!.height).toBeLessThanOrEqual(height)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await expect(page.locator('.chat-floating')).toHaveCount(0)
      await page.screenshot({ path: `../../outputs/home-hero-${locale}-${width}.png` })
      await hero.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY + 16, behavior: 'instant' }))
      await expect(page.locator('.chat-floating')).toBeVisible()
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await expect(page.locator('.chat-floating')).toHaveCount(0)
    })
  }
}

test('an English chat never restores the legacy Dutch greeting', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('mose_chat_thread', JSON.stringify({
    conversationId: 'old', messages: [{ id: '1', role: 'assistant', content: 'Hoi! Waar kan ik je mee helpen?', ts: new Date().toISOString() }],
  })))
  await page.goto('/en')
  await page.locator('[data-home-hero]').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY + 16))
  await page.locator('.chat-knop').click()
  await expect(page.locator('#chat-window')).not.toContainText('Hoi! Waar kan ik je mee helpen?')
  await expect(page.locator('#chat-window')).toContainText('Hi!')
})
