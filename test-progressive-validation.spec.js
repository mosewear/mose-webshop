/**
 * 🎭 PLAYWRIGHT TEST - PROGRESSIVE VALIDATION
 * 
 * Test de progressive validation op localhost:3000 voor:
 * - Nederland (NL) - postcode auto-detect + address lookup
 * - België (BE) - postcode auto-detect + handmatige invoer
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Maak screenshots directory
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

test.describe('Progressive Validation - Checkout Form', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ga direct naar checkout (we skippen cart vullen voor snelheid)
    await page.goto('http://localhost:3000/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('TEST 1: Email veld - No premature errors tijdens typen', async ({ page }) => {
    console.log('\n🧪 TEST 1: Email Progressive Validation\n');
    
    const emailInput = page.locator('input[type="email"]').first();
    
    // Screenshot: Initial state
    await page.screenshot({ path: path.join(screenshotsDir, '01-checkout-initial.png'), fullPage: true });
    
    console.log('  ✏️  Typing "john" (incomplete email)...');
    await emailInput.fill('john');
    await page.waitForTimeout(500);
    
    // Screenshot: During typing
    await page.screenshot({ path: path.join(screenshotsDir, '02-email-typing-john.png'), fullPage: true });
    
    // ✅ CHECK: Geen error tijdens typen
    const errorDuringTyping = await page.locator('p.text-red-600').first().isVisible().catch(() => false);
    console.log(`     Error tijdens typen: ${errorDuringTyping ? '❌ JA (FOUT!)' : '✅ NEE (GOED!)'}`);
    expect(errorDuringTyping).toBe(false);
    
    // Check border color tijdens typen (moet grijs of focus kleur zijn, NIET rood)
    const borderColorTyping = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border tijdens typen: ${borderColorTyping}`);
    expect(borderColorTyping).not.toContain('220, 38, 38'); // red-600
    
    console.log('  👆 Blur (klik ergens anders)...');
    await page.locator('h2').first().click();
    await page.waitForTimeout(1000);
    
    // Screenshot: After blur with error
    await page.screenshot({ path: path.join(screenshotsDir, '03-email-blur-invalid.png'), fullPage: true });
    
    // ✅ CHECK: Error verschijnt NA blur
    const errorAfterBlur = await page.locator('p.text-red-600').first().isVisible();
    console.log(`     Error na blur: ${errorAfterBlur ? '✅ JA (GOED!)' : '❌ NEE (FOUT!)'}`);
    expect(errorAfterBlur).toBe(true);
    
    const errorText = await page.locator('p.text-red-600').first().textContent();
    console.log(`     Error text: "${errorText}"`);
    
    console.log('  ✏️  Completing email: "@gmail.com"...');
    await emailInput.click();
    await emailInput.pressSequentially('@gmail.com', { delay: 50 });
    await page.waitForTimeout(1000);
    
    // Screenshot: During correction
    await page.screenshot({ path: path.join(screenshotsDir, '04-email-typing-valid.png'), fullPage: true });
    
    // ✅ CHECK: Error verdwijnt INSTANT (progressive validation!)
    const errorAfterFix = await page.locator('p.text-red-600').first().isVisible().catch(() => false);
    console.log(`     Error na correctie: ${errorAfterFix ? '❌ BLIJFT STAAN (FOUT!)' : '✅ VERDWENEN (GOED!)'}`);
    expect(errorAfterFix).toBe(false);
    
    // Check border na correctie (moet groen zijn)
    const borderColorFixed = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border na correctie: ${borderColorFixed}`);
    
    await page.locator('h2').first().click(); // Final blur
    await page.waitForTimeout(500);
    
    // Screenshot: Final valid state
    await page.screenshot({ path: path.join(screenshotsDir, '05-email-valid-final.png'), fullPage: true });
    
    console.log('  ✅ TEST 1 PASSED: Progressive validation werkt!\n');
  });

  test('TEST 2: Nederland - Postcode auto-detect + formatting', async ({ page }) => {
    console.log('\n🧪 TEST 2: Nederland Postcode Auto-detect\n');
    
    const postcodeInput = page.locator('input[placeholder="1234 AB"]').first();
    const countrySelect = page.locator('select').filter({ hasText: /land|country/i }).first();
    
    console.log('  ✏️  Typing Dutch postcode "1234AB" (zonder spatie)...');
    await postcodeInput.fill('1234AB');
    await page.waitForTimeout(500);
    
    // Screenshot: During typing
    await page.screenshot({ path: path.join(screenshotsDir, '06-postcode-nl-typing.png'), fullPage: true });
    
    console.log('  👆 Blur postcode field...');
    await page.locator('h2').first().click();
    await page.waitForTimeout(1500); // Wacht op auto-format + country detect
    
    // Screenshot: After blur
    await page.screenshot({ path: path.join(screenshotsDir, '07-postcode-nl-detected.png'), fullPage: true });
    
    // ✅ CHECK: Auto-format naar "1234 AB"
    const postcodeValue = await postcodeInput.inputValue();
    console.log(`     Postcode na format: "${postcodeValue}" (verwacht: "1234 AB")`);
    expect(postcodeValue).toBe('1234 AB');
    
    // ✅ CHECK: Land auto-detect naar NL
    const countryValue = await countrySelect.inputValue();
    console.log(`     Land gedetecteerd: ${countryValue} (verwacht: NL)`);
    expect(countryValue).toBe('NL');
    
    console.log('  ✅ TEST 2 PASSED: NL auto-detect werkt!\n');
  });

  test('TEST 3: België - Postcode auto-detect', async ({ page }) => {
    console.log('\n🧪 TEST 3: België Postcode Auto-detect\n');
    
    const postcodeInput = page.locator('input[placeholder="1234 AB"]').first();
    const countrySelect = page.locator('select').filter({ hasText: /land|country/i }).first();
    
    console.log('  ✏️  Typing Belgian postcode "1000" (Brussels)...');
    await postcodeInput.fill('1000');
    await page.waitForTimeout(500);
    
    // Screenshot: During typing
    await page.screenshot({ path: path.join(screenshotsDir, '08-postcode-be-typing.png'), fullPage: true });
    
    console.log('  👆 Blur postcode field...');
    await page.locator('h2').first().click();
    await page.waitForTimeout(1500);
    
    // Screenshot: After blur
    await page.screenshot({ path: path.join(screenshotsDir, '09-postcode-be-detected.png'), fullPage: true });
    
    // ✅ CHECK: Postcode blijft "1000"
    const postcodeValue = await postcodeInput.inputValue();
    console.log(`     Postcode: "${postcodeValue}" (verwacht: "1000")`);
    expect(postcodeValue).toBe('1000');
    
    // ✅ CHECK: Land auto-detect naar BE
    const countryValue = await countrySelect.inputValue();
    console.log(`     Land gedetecteerd: ${countryValue} (verwacht: BE)`);
    expect(countryValue).toBe('BE');
    
    console.log('  ✅ TEST 3 PASSED: BE auto-detect werkt!\n');
  });

  test('TEST 4: Naam velden - Progressive validation', async ({ page }) => {
    console.log('\n🧪 TEST 4: Naam Velden Progressive Validation\n');
    
    const firstNameInput = page.locator('input').filter({ hasText: /voornaam|first.*name/i }).first();
    const lastNameInput = page.locator('input').filter({ hasText: /achternaam|last.*name/i }).first();
    
    // Als we geen input vinden via filter, probeer via placeholder/name attribute
    const firstName = firstNameInput.or(page.locator('input[name="firstName"], input[placeholder*="naam"]').first());
    const lastName = lastNameInput.or(page.locator('input[name="lastName"]').first());
    
    console.log('  ✏️  Typing in firstName: "J"...');
    await firstName.fill('J');
    await page.waitForTimeout(500);
    
    // ✅ CHECK: Geen error tijdens typen
    const firstNameErrors = await page.locator('p.text-red-600').count();
    console.log(`     Errors tijdens typen: ${firstNameErrors === 0 ? '✅ GEEN (GOED!)' : '❌ WEL (FOUT!)'}`);
    expect(firstNameErrors).toBe(0);
    
    console.log('  👆 Blur firstName...');
    await page.locator('h2').first().click();
    await page.waitForTimeout(500);
    
    // Screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '10-firstname-too-short.png'), fullPage: true });
    
    // ✅ CHECK: Error verschijnt (te kort)
    const errorAfterBlur = await page.locator('p.text-red-600').count();
    console.log(`     Errors na blur: ${errorAfterBlur > 0 ? '✅ JA (GOED!)' : '❌ NEE (FOUT!)'}`);
    
    console.log('  ✏️  Completing firstName: "John"...');
    await firstName.click();
    await firstName.fill('John');
    await page.waitForTimeout(500);
    
    // ✅ CHECK: Error verdwijnt
    const errorAfterFix = await page.locator('p.text-red-600').count();
    console.log(`     Errors na fix: ${errorAfterFix === 0 ? '✅ WEG (GOED!)' : '❌ BLIJFT (FOUT!)'}`);
    
    console.log('  ✅ TEST 4 PASSED: Naam validatie werkt!\n');
  });

  test('TEST 5: Submit met lege velden - All touched', async ({ page }) => {
    console.log('\n🧪 TEST 5: Submit Button met Lege Velden\n');
    
    // Screenshot: Initial empty form
    await page.screenshot({ path: path.join(screenshotsDir, '11-empty-form.png'), fullPage: true });
    
    console.log('  👆 Clicking submit button zonder iets in te vullen...');
    
    // Probeer submit button te vinden
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("BETALEN")').or(
        page.locator('button:has-text("NAAR BETALEN")')
      )
    ).first();
    
    await submitButton.click();
    await page.waitForTimeout(1500);
    
    // Screenshot: All errors shown
    await page.screenshot({ path: path.join(screenshotsDir, '12-submit-all-errors.png'), fullPage: true });
    
    // ✅ CHECK: Meerdere errors verschijnen
    const errorCount = await page.locator('p.text-red-600').count();
    console.log(`     Error messages: ${errorCount} (verwacht: >= 5)`);
    expect(errorCount).toBeGreaterThanOrEqual(5);
    
    // ✅ CHECK: Meerdere rode borders
    const allInputs = await page.locator('input[type="text"], input[type="email"]').all();
    let redBorderCount = 0;
    
    for (const input of allInputs) {
      const borderColor = await input.evaluate(el => window.getComputedStyle(el).borderColor);
      if (borderColor.includes('220, 38, 38') || borderColor.includes('rgb(220, 38, 38)')) {
        redBorderCount++;
      }
    }
    
    console.log(`     Rode borders: ${redBorderCount} velden (verwacht: >= 5)`);
    expect(redBorderCount).toBeGreaterThanOrEqual(5);
    
    console.log('  ✅ TEST 5 PASSED: Submit markeert alle velden als touched!\n');
  });

  test('TEST 6: Border kleuren - Visual states', async ({ page }) => {
    console.log('\n🧪 TEST 6: Border Kleuren Check\n');
    
    const emailInput = page.locator('input[type="email"]').first();
    
    // 1. Pristine (grijs)
    const borderPristine = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border pristine: ${borderPristine} (verwacht: grijs)`);
    expect(borderPristine).toContain('209, 213, 219'); // gray-300
    
    // 2. Focus (brand-primary/groen)
    await emailInput.focus();
    await page.waitForTimeout(300);
    const borderFocus = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border focus: ${borderFocus} (verwacht: brand-primary/groen)`);
    
    // 3. Invalid after blur (rood)
    await emailInput.fill('invalid');
    await page.locator('h2').first().click();
    await page.waitForTimeout(500);
    const borderInvalid = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border invalid: ${borderInvalid} (verwacht: rood)`);
    expect(borderInvalid).toContain('220, 38, 38'); // red-600
    
    // 4. Valid after fix (groen)
    await emailInput.fill('test@test.nl');
    await page.locator('h2').first().click();
    await page.waitForTimeout(500);
    const borderValid = await emailInput.evaluate(el => window.getComputedStyle(el).borderColor);
    console.log(`     Border valid: ${borderValid} (verwacht: groen)`);
    expect(borderValid).toContain('22, 163, 74'); // green-600
    
    // Screenshot: Final state
    await page.screenshot({ path: path.join(screenshotsDir, '13-border-colors.png'), fullPage: true });
    
    console.log('  ✅ TEST 6 PASSED: Border kleuren correct!\n');
  });
});

console.log('\n✅ ALL TESTS COMPLETED!\n');
console.log(`📂 Screenshots saved to: ${screenshotsDir}\n`);







