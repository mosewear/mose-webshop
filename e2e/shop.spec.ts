import { test, expect } from '@playwright/test'

test.describe('Shop page', () => {
  test('loads and displays products', async ({ page }) => {
    await page.goto('/nl/shop')
    await expect(page).toHaveTitle(/MOSE/i)
    const products = page.locator('[data-testid="product-card"], .group')
    await expect(products.first()).toBeVisible({ timeout: 10_000 })
  })

  test('navigates to product detail', async ({ page }) => {
    await page.goto('/nl/shop')
    const firstProduct = page.locator('[data-testid="product-card"] a, .group a').first()
    await firstProduct.click()
    await expect(page).toHaveURL(/\/nl\/product\//)
  })

  test('product detail shows add-to-cart button', async ({ page }) => {
    await page.goto('/nl/shop')
    const firstProduct = page.locator('[data-testid="product-card"] a, .group a').first()
    await firstProduct.click()
    await expect(page.getByRole('button', { name: /winkelwagen|cart|toevoegen/i })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Navigation', () => {
  test('header links are present', async ({ page }) => {
    await page.goto('/nl')
    await expect(page.getByRole('link', { name: /shop/i })).toBeVisible()
  })

  test('blog page loads', async ({ page }) => {
    await page.goto('/nl/blog')
    await expect(page).toHaveTitle(/blog|MOSE/i)
  })

  test('404 page displays for unknown routes', async ({ page }) => {
    const response = await page.goto('/nl/this-page-does-not-exist-12345')
    expect(response?.status()).toBe(404)
  })
})
