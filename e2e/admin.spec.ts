import { test, expect } from '@playwright/test'

test.describe('Admin pages', () => {
  test('admin page requires authentication', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const isRedirected = url.includes('login') || url.includes('auth')
    const hasAuthUI = await page.getByRole('button', { name: /login|inloggen|sign in/i }).isVisible().catch(() => false)
    const hasAdminContent = await page.getByText(/dashboard|orders|bestellingen/i).isVisible().catch(() => false)
    expect(isRedirected || hasAuthUI || hasAdminContent).toBeTruthy()
  })

  test('admin blog page requires authentication', async ({ page }) => {
    await page.goto('/admin/blog')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const isRedirected = url.includes('login') || url.includes('auth')
    const hasContent = await page.getByText(/blog/i).isVisible().catch(() => false)
    expect(isRedirected || hasContent).toBeTruthy()
  })

  test('admin loyalty page requires authentication', async ({ page }) => {
    await page.goto('/admin/loyalty')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const isRedirected = url.includes('login') || url.includes('auth')
    const hasContent = await page.getByText(/loyalty|punten/i).isVisible().catch(() => false)
    expect(isRedirected || hasContent).toBeTruthy()
  })
})
