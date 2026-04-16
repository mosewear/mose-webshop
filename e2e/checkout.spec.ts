import { test, expect } from '@playwright/test'

test.describe('Checkout flow', () => {
  test('checkout page loads', async ({ page }) => {
    await page.goto('/nl/checkout')
    await expect(page.getByText(/bestelling|checkout|winkelwagen/i)).toBeVisible({ timeout: 10_000 })
  })

  test('checkout form validates required fields', async ({ page }) => {
    await page.goto('/nl/checkout')
    const submitBtn = page.getByRole('button', { name: /bestellen|betalen|afrekenen/i })
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
      await expect(errorMessages.first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('phone field rejects short numbers', async ({ page }) => {
    await page.goto('/nl/checkout')
    const phoneInput = page.getByLabel(/telefoon|phone/i).first()
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('123')
      await phoneInput.blur()
      await expect(page.getByText(/ongeldig|invalid|kort/i)).toBeVisible({ timeout: 3_000 })
    }
  })
})
