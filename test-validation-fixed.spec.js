/**
 * 🎭 PLAYWRIGHT - PROGRESSIVE VALIDATION TEST (FIXED)
 * 
 * Nu met ECHTE cart items!
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

test.describe('Progressive Validation Test', () => {
  
  test('Complete flow: Add to cart → Checkout → Test validation', async ({ page }) => {
    console.log('\n🚀 Starting complete progressive validation test\n');
    
    // STAP 1: Ga naar shop en voeg product toe
    console.log('📍 Step 1: Go to shop');
    await page.goto('http://localhost:3000/shop');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: path.join(screenshotsDir, '01-shop.png'), fullPage: true });
    
    console.log('📍 Step 2: Click first product');
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: path.join(screenshotsDir, '02-product.png'), fullPage: true });
    
    console.log('📍 Step 3: Add to cart');
    // Probeer add to cart button te vinden
    const addToCartButton = page.locator('button', { hasText: /in winkelwagen|add to cart/i }).first();
    await addToCartButton.click();
    await page.waitForTimeout(2000); // Wacht op cart update
    await page.screenshot({ path: path.join(screenshotsDir, '03-added-to-cart.png'), fullPage: true });
    
    console.log('📍 Step 4: Go to checkout');
    await page.goto('http://localhost:3000/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-checkout-loaded.png'), fullPage: true });
    
    // =========================================
    // TEST 1: EMAIL - PROGRESSIVE VALIDATION
    // =========================================
    console.log('\n🧪 TEST 1: Email Progressive Validation\n');
    
    const emailInput = page.locator('input[type="email"]').first();
    
    console.log('  ✏️  Typing incomplete email: "john"');
    await emailInput.fill('john');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '05-email-typing.png'), fullPage: true });
    
    // Check: Geen error tijdens typen?
    const errorVisible = await page.locator('p.text-red-600').first().isVisible().catch(() => false);
    console.log(`     Error tijdens typen: ${errorVisible ? '❌ JA (FOUT!)' : '✅ NEE (GOED!)'}`);
    
    console.log('  👆 Blur email field');
    await page.locator('h2').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '06-email-blur-error.png'), fullPage: true });
    
    // Check: Error verschijnt NA blur?
    const errorAfterBlur = await page.locator('p.text-red-600').first().isVisible().catch(() => false);
    console.log(`     Error na blur: ${errorAfterBlur ? '✅ JA (GOED!)' : '❌ NEE (FOUT!)'}`);
    
    console.log('  ✏️  Fixing email: "john@gmail.com"');
    await emailInput.click();
    await emailInput.fill('john@gmail.com');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '07-email-fixed.png'), fullPage: true });
    
    // Check: Error verdwijnt instant?
    const errorAfterFix = await page.locator('p.text-red-600').first().isVisible().catch(() => false);
    console.log(`     Error na fix: ${errorAfterFix ? '❌ BLIJFT (FOUT!)' : '✅ WEG (GOED!)'}`);
    
    // Check border kleur (groen verwacht)
    const borderColor = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border color: ${borderColor}`);
    const isGreen = borderColor.includes('22, 163, 74') || borderColor.includes('34, 197, 94');
    console.log(`     Is green: ${isGreen ? '✅ JA' : '❌ NEE'}`);
    
    // =========================================
    // TEST 2: NEDERLAND - POSTCODE AUTO-DETECT
    // =========================================
    console.log('\n🧪 TEST 2: Nederland Postcode Auto-detect\n');
    
    const postcodeInput = page.locator('input').filter({ hasText: /postcode/i }).or(
      page.locator('input[placeholder*="1234"]')
    ).first();
    
    console.log('  ✏️  Typing NL postcode: "1234AB"');
    await postcodeInput.fill('1234AB');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '08-postcode-nl-typing.png'), fullPage: true });
    
    console.log('  👆 Blur postcode');
    await page.locator('h2').first().click();
    await page.waitForTimeout(2000); // Wacht op auto-format + country detect
    await page.screenshot({ path: path.join(screenshotsDir, '09-postcode-nl-detected.png'), fullPage: true });
    
    const postcodeValue = await postcodeInput.inputValue();
    console.log(`     Postcode value: "${postcodeValue}" (verwacht: "1234 AB")`);
    
    const countrySelect = page.locator('select').first();
    const countryValue = await countrySelect.inputValue();
    console.log(`     Country: ${countryValue} (verwacht: NL)`);
    console.log(`     ${countryValue === 'NL' ? '✅ CORRECT!' : '❌ FOUT!'}`);
    
    // =========================================
    // TEST 3: BELGIË - POSTCODE AUTO-DETECT
    // =========================================
    console.log('\n🧪 TEST 3: België Postcode Auto-detect\n');
    
    console.log('  ✏️  Changing to BE postcode: "1000"');
    await postcodeInput.click();
    await postcodeInput.fill('1000');
    await page.waitForTimeout(500);
    
    console.log('  👆 Blur postcode');
    await page.locator('h2').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '10-postcode-be-detected.png'), fullPage: true });
    
    const postcodeValueBE = await postcodeInput.inputValue();
    console.log(`     Postcode value: "${postcodeValueBE}" (verwacht: "1000")`);
    
    const countryValueBE = await countrySelect.inputValue();
    console.log(`     Country: ${countryValueBE} (verwacht: BE)`);
    console.log(`     ${countryValueBE === 'BE' ? '✅ CORRECT!' : '❌ FOUT!'}`);
    
    // =========================================
    // TEST 4: SUBMIT MET LEGE VELDEN
    // =========================================
    console.log('\n🧪 TEST 4: Submit met incomplete form\n');
    
    console.log('  👆 Clicking submit button');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button', { hasText: /betalen/i })
    ).first();
    
    await submitButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '11-submit-errors.png'), fullPage: true });
    
    const errorCount = await page.locator('p.text-red-600').count();
    console.log(`     Error messages: ${errorCount}`);
    console.log(`     ${errorCount >= 3 ? '✅ MEERDERE ERRORS (GOED!)' : '❌ TE WEINIG ERRORS'}`);
    
    // =========================================
    // FINAL SCREENSHOT
    // =========================================
    await page.screenshot({ path: path.join(screenshotsDir, '12-final-state.png'), fullPage: true });
    
    console.log('\n✅ TEST COMPLETED!\n');
    console.log(`📂 Screenshots: ${screenshotsDir}\n`);
  });
});



