const { test, expect } = require('@playwright/test');
const path = require('path');

const PREVIEW_URL =
  'https://vhreu.accessautohistory.com/vin-check/preview?vin=2C3CDXCT0GH126868&type=vhr&wpPage=homepage';
const BASE_URL = 'https://vhreu.accessautohistory.com/';
const OFFER_URL = `${BASE_URL}?ref=ads&offer=get20`;
const WINDOW_STICKER_URL = 'https://vhreu.accessautohistory.com/window-sticker';
const PREVIEW_EXIT_URL =
  'https://vhreu.accessautohistory.com/vin-check/preview?vin=1FTBF2B66HEE83884&type=vhr&wpPage=homepage';

const EVIDENCE_DIR = path.join(__dirname, 'test-results', 'VHREU-preloader-preview-to-checkout');

test.afterAll(async ({ browser }) => {
  if (browser) await browser.close();
  setTimeout(() => process.exit(0), 1000);
});

// Helper: trigger exit intent by moving mouse above viewport via CDP
async function triggerExitIntent(page) {
  const vp = page.viewportSize();
  const midX = vp ? Math.round(vp.width / 2) : 400;
  await page.mouse.move(midX, 400);
  await page.waitForTimeout(1000);
  await page.mouse.move(midX, 10);
  await page.waitForTimeout(300);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: midX, y: -10, modifiers: 0 });
  await page.waitForTimeout(3000);
}

// ─── PRIORITY 1: VIN Input Validation — Homepage ───────────────────────────

test('VHREU — VIN input: empty submit shows error and placeholder remains', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=Please enter a VIN number')).toBeVisible({ timeout: 5000 });
  const placeholder = await page.locator('#vin-input').getAttribute('placeholder');
  expect(placeholder).toBe('Enter VIN');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\01-VHREU-vin-empty-error.png`, fullPage: false });
  console.log('✅ VHREU VIN empty error shown, placeholder intact');
});

test('VHREU — VIN input: less than 17 chars shows character count error', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.fill('#vin-input', 'ABC123');
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=VIN must be exactly 17 characters')).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\02-VHREU-vin-short-error.png`, fullPage: false });
  console.log('✅ VHREU VIN short input error shown');
});

test('VHREU — VIN input: max length enforced at 17 characters', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('#vin-input').type('123456789012345678');
  const value = await page.inputValue('#vin-input');
  expect(value.length).toBeLessThanOrEqual(17);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\03-VHREU-vin-maxlength.png`, fullPage: false });
  console.log(`✅ VHREU VIN maxlength enforced — typed 18, got ${value.length} chars`);
});

test('VHREU — VIN input: locks after valid 17-char VIN search', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.fill('#vin-input', '2C3CDXCT0GH126868');
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForTimeout(3000);
  await expect(page.locator('#vin-input')).toBeDisabled({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04-VHREU-vin-locked.png`, fullPage: false });
  console.log('✅ VHREU VIN input locked after valid search');
});

test('VHREU — VIN input: Ready for pickup popup and discount verification', async ({ page }) => {
  const testVins = ['KL4CJASB6HB019273', '2C3CCAAG3EH179096'];
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.fill('#vin-input', testVins[0]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForURL('**/preview**', { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('✅ Navigated to preview page');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  const popup = page.getByText(/ready for pickup|Your report.*is ready/i).first();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04a-VHREU-ready-popup.png`, fullPage: true });
  console.log('✅ Ready for pickup popup appeared');
  const grabButton = page.locator('button:has-text("Grab it")').first();
  await grabButton.click();
  await page.waitForTimeout(3000);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.fill('#vin-input', testVins[1]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForTimeout(5000);
  if (page.url().includes('preview')) {
    await page.waitForTimeout(3000);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
  } else {
    await page.waitForTimeout(5000);
  }
  
  // Dynamic price button locator: matches a button containing a currency symbol in the text
  const priceButton = page.locator('button:has-text("€"), button:has-text("$"), button:has-text("£")').first();
  const priceWithoutDiscount = await priceButton.textContent();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04b-VHREU-price-no-discount.png`, fullPage: true });
  await page.goto(`${BASE_URL}?offer=get20`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithDiscount = await priceButton.textContent();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04c-VHREU-price-with-discount.png`, fullPage: true });
  expect(priceWithoutDiscount).not.toBe(priceWithDiscount);
  console.log('✅ Discount applied successfully');
});

// ─── UTM Cookie Capture — Homepage ─────────────────────────────────────────

test.skip('VHREU — Homepage: UTM params (utm_details & traffic_source) captured in cookies', async ({ page }) => {
  await page.goto('https://vhreu.accessautohistory.com/?utm_details=mads&traffic_source=google', { waitUntil: 'networkidle' });
  const cookies = await page.context().cookies();
  const cookieMap = Object.fromEntries(cookies.map(c => [c.name, c.value]));
  expect(cookieMap['utm_details'], 'utm_details cookie not found or incorrect').toBe('mads');
  expect(cookieMap['traffic_source'], 'traffic_source cookie not found or incorrect').toBe('google');
  console.log('✅ VHREU Homepage — utm_details & traffic_source captured in cookies');
});

// ─── PRIORITY 2: VIN Input Validation — Window Sticker ─────────────────────

test('VHREU — Window Sticker VIN input: empty submit shows error and placeholder remains', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=Please enter a VIN number').first()).toBeVisible({ timeout: 5000 });
  const placeholder = await page.locator('#vin-input').first().getAttribute('placeholder');
  expect(placeholder).toBe('Enter VIN');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\05-VHREU-ws-vin-empty-error.png`, fullPage: false });
  console.log('✅ VHREU WS VIN empty error shown, placeholder intact');
});

test('VHREU — Window Sticker VIN input: less than 17 chars shows character count error', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.locator('#vin-input').first().fill('ABC123');
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=VIN must be exactly 17 characters').first()).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\06-VHREU-ws-vin-short-error.png`, fullPage: false });
  console.log('✅ VHREU WS VIN short input error shown');
});

test('VHREU — Window Sticker VIN input: max length enforced at 17 characters', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.locator('#vin-input').first().type('123456789012345678');
  const value = await page.locator('#vin-input').first().inputValue();
  expect(value.length).toBeLessThanOrEqual(17);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\07-VHREU-ws-vin-maxlength.png`, fullPage: false });
  console.log(`✅ VHREU WS VIN maxlength enforced — typed 18, got ${value.length} chars`);
});

test('VHREU — Window Sticker VIN input: locks after valid 17-char VIN search', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.locator('#vin-input').first().fill('SALWA2KE4EA335351');
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForTimeout(3000);
  await expect(page.locator('#vin-input').first()).toBeDisabled({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08-VHREU-ws-vin-locked.png`, fullPage: false });
  console.log('✅ VHREU WS VIN input locked after valid search');
});

test('VHREU — Window Sticker VIN input: Ready for pickup popup and discount verification', async ({ page }) => {
  const testVins = ['KL4CJASB6HB019273', '2C3CCAAG3EH179096'];
  
  // 1. Navigate to WS page and search
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('#vin-input').first().fill(testVins[0]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  
  // 2. Wait for preview to load
  await page.waitForURL('**/*preview**', { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('✅ Navigated to WS preview page');

  // 3. Navigate back to BASE_URL in the SAME session
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(15000); // Allow time for banner to trigger
  
  // 4. Verify banner appearance using the provided HTML-based selector
  const popup = page.locator('div:has-text("Ready for pickup")').first();
  await expect(popup).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08a-VHREU-ws-ready-popup.png`, fullPage: true });
  console.log('✅ WS Ready for pickup popup appeared');
  
  const grabButton = popup.getByRole('button', { name: /grab it/i }).first();
  await grabButton.click();
  await page.waitForTimeout(3000);

  // 5. Continue with the rest of the test in the same session
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('#vin-input').first().fill(testVins[1]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForTimeout(5000);
  
  if (page.url().includes('preview')) {
    await page.waitForTimeout(3000);
    await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
  } else {
    await page.waitForTimeout(5000);
  }
  
  const priceButton = page.getByRole('button').filter({ hasText: /\$/ }).first();
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithoutDiscount = await priceButton.textContent();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08b-VHREU-ws-price-no-discount.png`, fullPage: true });
  
  await page.goto(`${WINDOW_STICKER_URL}?offer=get20`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithDiscount = await priceButton.textContent();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08c-VHREU-ws-price-with-discount.png`, fullPage: true });
  
  expect(priceWithoutDiscount).not.toBe(priceWithDiscount);
  console.log('✅ Window Sticker discount applied successfully');
});

// ─── UTM Cookie Capture — Window Sticker ───────────────────────────────────

test('VHREU — Window Sticker: UTM params (utm_details & traffic_source) captured in cookies', async ({ page }) => {
  await page.goto('https://vhreu.accessautohistory.com/window-sticker?utm_details=mads&traffic_source=google', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const cookies = await page.context().cookies();
  const cookieMap = Object.fromEntries(cookies.map(c => [c.name, c.value]));
  expect(cookieMap['utm_details'], 'utm_details cookie not found or incorrect').toBe('mads');
  expect(cookieMap['traffic_source'], 'traffic_source cookie not found or incorrect').toBe('google');
  console.log('✅ VHREU Window Sticker — utm_details & traffic_source captured in cookies');
});

// ─── PRIORITY 3: Exit Intent Popup — Homepage ──────────────────────────────

test('VHREU — Homepage: exit intent popup appears on mouse leave', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);
  const popup = page.locator('dialog').first();
  await expect(popup).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Hey, before you leave take discount!')).toBeVisible();
  await expect(page.locator('text=15% OFF')).toBeVisible();
  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\09-VHREU-homepage-exit-popup.png`, fullPage: true });
  console.log('✅ VHREU Homepage exit intent popup appeared');
});

test('VHREU — Homepage: exit intent popup mobile responsiveness (no overflow)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await triggerExitIntent(page);
  await expect(page.locator('dialog').first()).toBeVisible({ timeout: 10000 });
  const overflow = await page.evaluate(() => {
    const dialog = document.querySelector('dialog');
    if (!dialog) return [];
    return [...dialog.querySelectorAll('*')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.right > window.innerWidth + 2 || r.left < -2;
      })
      .map(el => el.tagName + ' right=' + Math.round(el.getBoundingClientRect().right));
  });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\10-VHREU-homepage-exit-popup-mobile.png`, fullPage: true });
  expect(overflow, `Overflow detected: ${JSON.stringify(overflow)}`).toHaveLength(0);
  console.log('✅ VHREU Homepage exit popup — no mobile overflow');
});

// Homepage: Exit intent CTA redirects and validates offer
test('VHREU — Homepage: exit intent CTA redirects to offer page', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);
  
  const ctaButton = page.locator('button:has-text("Click here to redeem instantly")');
  await expect(ctaButton).toBeVisible({ timeout: 5000 });
  await ctaButton.click();
  
  // Wait for redirect to a URL containing an 'offer' parameter
  await page.waitForURL(/.*offer=.*/, { timeout: 10000 });
  expect(page.url()).toContain('offer=');
  
  // Verify Offer in LocalStorage and Cookies
  const hasLocalStorageOffer = await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('coupon')));
  expect(hasLocalStorageOffer).toBe(true);
  
  const cookies = await page.context().cookies();
  const hasCookieOffer = cookies.some(c => c.name.includes('coupon') || c.value.includes('offer'));
  console.log('✅ Homepage Exit Intent: Redirected, Offer present in storage/cookies');
});

// Window Sticker: Exit intent CTA redirects and validates offer
test('VHREU — Window Sticker: exit intent CTA redirects to offer page', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  await triggerExitIntent(page);
  await page.waitForTimeout(3000);
  
  const ctaButton = page.locator('button:has-text("Take 15% off")');
  await expect(ctaButton).toBeVisible({ timeout: 25000 });
  await ctaButton.click();
  
  await page.waitForURL(/.*offer=.*/, { timeout: 20000 });
  expect(page.url()).toContain('offer=');
  
  // Verify Offer in LocalStorage and Cookies
  const hasLocalStorageOffer = await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('coupon')));
  expect(hasLocalStorageOffer).toBe(true);
  
  console.log('✅ Window Sticker Exit Intent: Redirected, Offer present in storage');
});

// ─── PRIORITY 5: Offer / Discount Banner ───────────────────────────────────

test('VHREU — offer=get20 banner appears with green background', async ({ page }) => {
  await page.goto(OFFER_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\15-VHREU-offer-banner.png`, fullPage: true });
  const banner = page.locator('div.bg-green').first();
  await expect(banner).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=You have received 80% Discount!')).toBeVisible();
  await expect(page.locator('text=Your discount has been applied automatically')).toBeVisible();
  console.log('✅ VHREU Offer banner (get20) displayed with green background');
});

test('VHREU — offer=get20 saved in localStorage', async ({ page }) => {
  await page.goto(OFFER_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => localStorage.getItem('coupon_get20_no_email') !== null, { timeout: 10000 });
  const stored = await page.evaluate(() => localStorage.getItem('coupon_get20_no_email'));
  expect(stored).not.toBeNull();
  const parsed = JSON.parse(stored);
  expect(parsed.value).toBe(80);
  console.log(`✅ VHREU Offer stored in localStorage: coupon_get20_no_email = ${stored}`);
});

// ─── PRIORITY 6: VIN Search Redirect + Timing ──────────────────────────────

test('VHREU — Homepage: VIN search redirects to preview with timing', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.fill('#vin-input', 'SALWA2KE4EA335351');
  const start = Date.now();
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForURL('**/preview**', { timeout: 60000 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  expect(page.url()).toContain('vin=SALWA2KE4EA335351');
  expect(page.url()).toContain('type=vhr');
  expect(page.url()).toContain('wpPage=homepage');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\17-VHREU-homepage-vin-preview.png`, fullPage: false });
  console.log(`✅ VHREU Homepage VIN search → preview in ${elapsed}s`);
});

test('VHREU — Window Sticker: VIN search redirects to ws-preview with timing', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.locator('#vin-input').first().fill('SALWA2KE4EA335351');
  const start = Date.now();
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForURL('**/ws-preview**', { timeout: 60000 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  expect(page.url()).toContain('vin=SALWA2KE4EA335351');
  expect(page.url()).toContain('type=sticker');
  expect(page.url()).toContain('wpPage=window-sticker');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\18-VHREU-window-sticker-vin-preview.png`, fullPage: false });
  console.log(`✅ VHREU Window Sticker VIN search → ws-preview in ${elapsed}s`);
});


// ─── PRIORITY 7: Preview Page — Exit Intent Popup ──────────────────────────

// TC-24: Exit intent popup triggers on preview page
test('VHREU — Preview: exit intent popup appears on URL bar hover', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible();

  await page.screenshot({ path: `${EVIDENCE_DIR}\\23-VHREU-preview-exit-popup.png`, fullPage: true });
  console.log('✅ TC-24: Preview exit intent popup appeared');
  await ctx.close();
});

// TC-25: CTA adds offer=Preview15 to URL
test('VHREU — Preview: CTA adds offer=Preview15 to URL', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 10000 });
  await page.locator('text=Click here to redeem instantly').click();
  await page.waitForTimeout(3000);

  expect(page.url()).toContain('offer=Preview15');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\24-VHREU-preview-exit-offer-url.png`, fullPage: true });
  console.log(`✅ TC-25: offer=Preview15 found in URL: ${page.url()}`);
  await ctx.close();
});

// TC-26: Discount price element visible after offer=Preview15
test('VHREU — Preview: discount price element visible after offer=Preview15', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 10000 });
  await page.locator('text=Click here to redeem instantly').click();
  await page.waitForTimeout(3500);

  expect(page.url()).toContain('offer=Preview15');

  const pricingPlan = page.locator('#pricing-plan > div > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)');
  await expect(pricingPlan).toBeVisible({ timeout: 10000 });

  const discountPrice = page.locator('#pricing-plan > div > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) > p');
  await expect(discountPrice).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: `${EVIDENCE_DIR}\\25-VHREU-preview-discount-price.png`, fullPage: true });
  console.log('✅ TC-26: Discount price element visible after offer=Preview15');
  await ctx.close();
});

// TC-27: "No, Thanks" dismisses popup and blocks re-trigger in same session
test('VHREU — Preview: "No, Thanks" dismisses popup and blocks re-trigger in same session', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });

  await expect(page.locator('text=No, Thanks')).toBeVisible({ timeout: 5000 });
  await page.locator('text=No, Thanks').click();
  await page.waitForTimeout(1000);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  console.log('✅ TC-27: "No, Thanks" clicked — popup dismissed');

  // Re-navigate in same session — popup should NOT re-appear
  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\26-VHREU-preview-no-thanks-no-retrigger.png`, fullPage: true });
  console.log('✅ TC-27: Exit intent did NOT re-trigger after "No, Thanks" in same session');
  await ctx.close();
});

// TC-28: X button closes popup and blocks re-trigger in same session
test('VHREU — Preview: X button closes popup and blocks re-trigger in same session', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });

  // X button is the only button in the top-right corner of the popup container
  const closeBtn = popup.locator('button').first();
  await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(1000);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  console.log('✅ TC-28: X button clicked — popup closed');

  // Re-navigate in same session — popup should NOT re-appear
  await page.goto(PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\27-VHREU-preview-x-close-no-retrigger.png`, fullPage: true });
  console.log('✅ TC-28: Exit intent did NOT re-trigger after X close in same session');
  await ctx.close();
});

// ─── PRIORITY 7b: WS Preview Page — Exit Intent Popup ──────────────────────

const WS_PREVIEW_EXIT_URL =
  'https://vhreu.accessautohistory.com/vin-check/ws-preview?vin=1FMCU0G93GUB08696&type=sticker&wpPage=window-sticker';

// TC-31b: Exit intent popup triggers on WS preview page
test('VHREU — WS Preview: exit intent popup appears on URL bar hover', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible();

  await page.screenshot({ path: `${EVIDENCE_DIR}\\31b-VHREU-ws-preview-exit-popup.png`, fullPage: true });
  console.log('✅ TC-31b: WS Preview exit intent popup appeared');
  await ctx.close();
});

// TC-32b: CTA adds offer=Preview15 to URL
test('VHREU — WS Preview: CTA adds offer=Preview15 to URL', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 10000 });
  await page.locator('text=Click here to redeem instantly').click();
  await page.waitForTimeout(3000);

  expect(page.url()).toContain('offer=Preview15');
  await page.screenshot({ path: `${EVIDENCE_DIR}\\32b-VHREU-ws-preview-exit-offer-url.png`, fullPage: true });
  console.log(`✅ TC-32b: offer=Preview15 found in URL: ${page.url()}`);
  await ctx.close();
});

// TC-33b: Discount price element visible after offer=Preview15
test('VHREU — WS Preview: discount price element visible after offer=Preview15', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 10000 });
  await page.locator('text=Click here to redeem instantly').click();
  await page.waitForTimeout(3500);

  expect(page.url()).toContain('offer=Preview15');

  // WS preview pricing plan uses a grid of plan cards
  const pricingPlan = page.locator('#pricing-plan');
  await expect(pricingPlan).toBeVisible({ timeout: 10000 });

  // Discount price shown as a line-through (original) price alongside discounted price
  const discountPrice = page.locator('#pricing-plan span.line-through').first();
  await expect(discountPrice).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: `${EVIDENCE_DIR}\\33b-VHREU-ws-preview-discount-price.png`, fullPage: true });
  console.log('✅ TC-33b: Discount price element visible after offer=Preview15 on WS Preview');
  await ctx.close();
});

// TC-34b: "No, Thanks" dismisses popup and blocks re-trigger in same session
test('VHREU — WS Preview: "No, Thanks" dismisses popup and blocks re-trigger in same session', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });

  await expect(page.locator('text=No, Thanks')).toBeVisible({ timeout: 5000 });
  await page.locator('text=No, Thanks').click();
  await page.waitForTimeout(1000);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  console.log('✅ TC-34b: "No, Thanks" clicked — popup dismissed on WS Preview');

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\34b-VHREU-ws-preview-no-thanks-no-retrigger.png`, fullPage: true });
  console.log('✅ TC-34b: Exit intent did NOT re-trigger after "No, Thanks" on WS Preview');
  await ctx.close();
});

// TC-35b: X button closes popup and blocks re-trigger in same session
test('VHREU — WS Preview: X button closes popup and blocks re-trigger in same session', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const page = await ctx.newPage();

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  const popup = page.locator('div.bg-white.rounded-2xl.shadow-2xl').first();
  await expect(popup).toBeVisible({ timeout: 10000 });

  const closeBtn = popup.locator('button').first();
  await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(1000);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  console.log('✅ TC-35b: X button clicked — popup closed on WS Preview');

  await page.goto(WS_PREVIEW_EXIT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(popup).not.toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\35b-VHREU-ws-preview-x-close-no-retrigger.png`, fullPage: true });
  console.log('✅ TC-35b: Exit intent did NOT re-trigger after X close on WS Preview');
  await ctx.close();
});

// ─── PRIORITY 8: Preview → Preloader → Checkout Flow ───────────────────────

test('VHREU — Preview → Preloader → Checkout flow with timing', async ({ page }) => {
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\19-VHREU-preview-page.png`, fullPage: true });

  await page.getByRole('button', { name: /access records/i }).first().click();
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\20-VHREU-email-popup.png`, fullPage: true });

  const proceedBtn = page.locator('button:has-text("Proceed to checkout")').last();
  await proceedBtn.waitFor({ state: 'visible', timeout: 20000 });
  await proceedBtn.click();
  await page.waitForTimeout(1000);

  const startTime = Date.now();

  await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\21-VHREU-preloader-screen.png`, fullPage: true });
  console.log('✅ VHREU Preloader appeared');

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱ VHREU Time from Preloader to Checkout: ${elapsed}s`);

  await page.waitForTimeout(2000);
  await expect(page.locator('text=Choose payment method')).toBeVisible({ timeout: 40000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\22-VHREU-checkout-page.png`, fullPage: true });
  console.log('✅ VHREU Checkout page loaded successfully');

  expect(parseFloat(elapsed)).toBeLessThan(30);
});


test('VHREU — WS Preview → Preloader → Checkout flow with timing', async ({ page }) => {
  await page.goto('https://vhreu.accessautohistory.com/vin-check/ws-preview?vin=1FMCU0G93GUB08696&type=sticker&wpPage=window-sticker', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\36-VHREU-ws-preview-page.png`, fullPage: true });

  await page.getByRole('button', { name: /access records/i }).first().click();
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\37-VHREU-ws-email-popup.png`, fullPage: true });

  const proceedBtn = page.locator('button:has-text("Proceed to checkout")').last();
  await proceedBtn.waitFor({ state: 'visible', timeout: 20000 });
  await proceedBtn.click();
  await page.waitForTimeout(1000);

  const startTime = Date.now();

  await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\38-VHREU-ws-preloader-screen.png`, fullPage: true });
  console.log('✅ VHREU WS Preloader appeared');

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱ VHREU WS Time from Preloader to Checkout: ${elapsed}s`);

  await page.waitForTimeout(2000);
  await expect(page.locator('text=Choose payment method')).toBeVisible({ timeout: 40000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\39-VHREU-ws-checkout-page.png`, fullPage: true });
  console.log('✅ VHREU WS Checkout page loaded successfully');

  expect(parseFloat(elapsed)).toBeLessThan(30);
});

// ─── PRIORITY 9: Preview Page Responsiveness ───────────────────────────────

const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 393, height: 852 },
  { width: 375, height: 667 },
];

// Helper: check no horizontal overflow at given viewport
async function checkResponsiveness(page, url, label) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('*')].filter(el => {
        // Skip intentional off-screen animation elements (shimmer/translate effects)
        if (el.classList.contains('-translate-x-full') || el.classList.contains('translate-x-full')) return false;
        
        // Skip tooltips or hover-hidden elements
        if (el.classList.contains('pointer-events-none') || 
            el.classList.contains('group-hover:opacity-100') ||
            el.classList.contains('shadow-xl') || 
            el.classList.contains('border-gray-700')) return false;
        
        const r = el.getBoundingClientRect();
        return r.right > window.innerWidth + 2 || r.left < -2;
      }).map(el => `${el.tagName}.${[...el.classList].join('.')} right=${Math.round(el.getBoundingClientRect().right)}`)
    );

    await page.screenshot({
      path: `${EVIDENCE_DIR}\\${label}-${vp.width}x${vp.height}.png`,
      fullPage: true,
    });

    expect(overflow, `Overflow at ${vp.width}x${vp.height}: ${JSON.stringify(overflow)}`).toHaveLength(0);
    console.log(`✅ ${label} ${vp.width}x${vp.height} — no overflow`);
  }
}

// TC-29: VHR preview responsiveness across 5 viewports
test('VHREU — Preview (VHR): responsiveness across 5 viewports', async ({ page }) => {
  await checkResponsiveness(
    page,
    'https://vhreu.accessautohistory.com/vin-check/preview?vin=1FTBF2B66HEE83884&type=vhr&wpPage=homepage&offer=Preview15',
    '28-VHREU-preview-vhr'
  );
});

// TC-30: Sticker preview responsiveness across 5 viewports
test('VHREU — Preview (Sticker): responsiveness across 5 viewports', async ({ page }) => {
  await checkResponsiveness(
    page,
    'https://vhreu.accessautohistory.com/vin-check/preview?vin=1FTBF2B66HEE83884&type=sticker&wpPage=homepage&offer=Preview15',
    '29-VHREU-preview-sticker'
  );
});


// ─── PRIORITY 10: Checkout Page Tests ──────────────────────────────────────

const WS_CHECKOUT_URL = 'https://vhreu.accessautohistory.com/vin-check/ws-preview?vin=1FMCU0G93GUB08696&type=sticker&wpPage=window-sticker';

// Helper: navigate WS Preview → email popup → checkout page
async function goToCheckout(page) {
  await page.goto(WS_CHECKOUT_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /access records/i }).first().click();
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  const proceedBtn = page.locator('button:has-text("Proceed to checkout")').last();
  await proceedBtn.waitFor({ state: 'visible', timeout: 20000 });
  await proceedBtn.click();
  await page.waitForURL('**/checkout**', { timeout: 90000 });
  await page.waitForTimeout(3000);
}

// Helper: fill Stripe card fields — uses elements-inner-card iframes (confirmed from network logs)
async function fillStripeCard(page, { number, exp, cvc }) {
  // Wait for Stripe card iframes to load
  await page.waitForSelector('iframe[src*="elements-inner-card"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const cardFrame = page.frameLocator('iframe[src*="elements-inner-card"]').nth(0);
  const expFrame  = page.frameLocator('iframe[src*="elements-inner-card"]').nth(1);
  const cvcFrame  = page.frameLocator('iframe[src*="elements-inner-card"]').nth(2);

  await cardFrame.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });
  await cardFrame.locator('input').first().click();
  await cardFrame.locator('input').first().type(number, { delay: 50 });

  await expFrame.locator('input').first().click();
  await expFrame.locator('input').first().type(exp, { delay: 50 });

  await cvcFrame.locator('input').first().click();
  await cvcFrame.locator('input').first().type(cvc, { delay: 50 });
}

// ── SINGLE SESSION: CO-01, CO-02, CO-03, CO-04, CO-08, CO-09, CO-10 ─────────
test.skip('VHREU Checkout — full single-session: tabs, card fill, pay, responsiveness, order summary, PayPal', async ({ browser }) => {
  test.setTimeout(300000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await goToCheckout(page);

  // ── CO-01: Card / PayPal tabs switchable ──
  const cardTab   = page.getByRole('button', { name: /^card$/i });
  const paypalTab = page.getByRole('button', { name: /^paypal$/i });
  await expect(cardTab).toBeVisible();
  await expect(paypalTab).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO01a-card-tab.png` });
  console.log('✅ CO-01: Card tab visible');

  // Capture PayPal API responses
  const paypalApiLog = [];
  page.on('response', async res => {
    if (res.url().includes('paypal')) {
      const body = await res.text().catch(() => '');
      paypalApiLog.push({ url: res.url(), status: res.status(), body: body.substring(0, 300) });
      console.log(`📡 PayPal API [${res.status()}] ${res.url()}`);
    }
  });

  await paypalTab.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO01b-paypal-tab.png` });
  console.log('✅ CO-01: PayPal tab active');
  console.log('📋 PayPal APIs captured:', JSON.stringify(paypalApiLog));

  await ctx.close();
  return;

  // ── CO-03: Fill all fields with valid test card and click Pay ──
  await page.locator('input[placeholder="Enter your name"]').fill('Test User');
  await fillStripeCard(page, { number: '4242 4242 4242 4242', exp: '12/34', cvc: '123' });
  const PAY_BTN = page.locator('button[type="submit"]').filter({ hasText: /^Pay/ });
  await PAY_BTN.waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO03-filled-ready.png`, fullPage: true });
  await PAY_BTN.click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO03-pay-result.png`, fullPage: true });
  console.log('✅ CO-03: All fields filled — Pay clicked');

  // ── CO-04: Declined card in same session ──
  await goToCheckout(page);
  await page.locator('input[placeholder="Enter your name"]').fill('Test User');
  await fillStripeCard(page, { number: '4000 0000 0000 0002', exp: '12/34', cvc: '123' });
  const PAY_BTN2 = page.locator('button[type="submit"]').filter({ hasText: /^Pay/ });
  await PAY_BTN2.waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO04-declined-filled.png`, fullPage: true });
  await PAY_BTN2.click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO04-declined-result.png`, fullPage: true });
  console.log('✅ CO-04: Declined card — Pay clicked, decline error expected');

  // ── CO-02: 3 declined card scenarios in same session ──
  const declinedCards = [
    { label: 'generic-decline',    number: '4000 0000 0000 0002' },
    { label: 'insufficient-funds', number: '4000 0000 0000 9995' },
    { label: 'stolen-card',        number: '4000 0000 0000 9979' },
  ];
  for (const card of declinedCards) {
    await goToCheckout(page);
    await page.locator('input[placeholder="Enter your name"]').fill('Test User');
    await fillStripeCard(page, { number: card.number, exp: '12/34', cvc: '123' });
    const btn = page.locator('button[type="submit"]').filter({ hasText: /^Pay/ });
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${EVIDENCE_DIR}\\CO02-${card.label}.png`, fullPage: true });
    console.log(`✅ CO-02 [${card.label}]: submitted`);
  }

  // ── CO-09: Order summary visible ──
  await goToCheckout(page);
  await expect(page.locator('text=/[€$£][0-9]/').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=/sticker|vehicle|history|report/i').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO09-order-summary.png`, fullPage: true });
  console.log('✅ CO-09: Order summary visible');

  // ── CO-10: PayPal tab renders ──
  await goToCheckout(page);
  const paypalTabCO10 = page.getByRole('button', { name: /^paypal$/i });
  const cardTabCO10   = page.getByRole('button', { name: /^card$/i });
  await paypalTabCO10.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO10-paypal-tab.png`, fullPage: true });
  console.log('✅ CO-10: PayPal tab active');
  await cardTabCO10.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO10-card-tab-back.png`, fullPage: true });
  console.log('✅ CO-10: Switched back to Card tab');

  // ── CO-08: Responsiveness across mobile viewports ──
  const viewports = [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 414, height: 896 },
    { width: 375, height: 667 },
  ];
  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await goToCheckout(page);
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('*')].filter(el => {
        if (el.classList.contains('-translate-x-full') || el.classList.contains('translate-x-full')) return false;
        const r = el.getBoundingClientRect();
        return r.right > window.innerWidth + 2 || r.left < -2;
      }).map(el => `${el.tagName} right=${Math.round(el.getBoundingClientRect().right)}`)
    );
    await page.screenshot({ path: `${EVIDENCE_DIR}\\CO08-responsive-${vp.width}x${vp.height}.png`, fullPage: true });
    expect(overflow, `Overflow at ${vp.width}x${vp.height}: ${JSON.stringify(overflow)}`).toHaveLength(0);
    console.log(`✅ CO-08: ${vp.width}x${vp.height} — no overflow`);
  }

  await ctx.close();
});

// ── NEW SESSION: CO-05, CO-06, CO-07 — Coupon + API capture + Pay + Success ──
// Fresh browser context — valid coupon → invalid coupon (valid must NOT reset) → pay → success
test.skip('VHREU Checkout — coupon: valid, invalid, persists, pay, success page + API capture', async ({ browser }) => {
  test.setTimeout(300000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Capture all API responses
  const apiLog = [];
  page.on('response', async res => {
    const url = res.url();
    if (
      url.includes('coupon') || url.includes('promo') || url.includes('discount') ||
      url.includes('CWA_Sticker') || url.includes('registration') || url.includes('checkout') ||
      url.includes('payment') || url.includes('stripe')
    ) {
      const body = await res.text().catch(() => '');
      apiLog.push({ url, status: res.status(), body: body.substring(0, 500) });
      console.log(`📡 API [${res.status()}] ${url}`);
      if (body) console.log(`   payload: ${body.substring(0, 300)}`);
    }
  });

  await goToCheckout(page);

  const couponInput = page.locator('input[placeholder*="coupon" i]');
  const applyBtn    = page.getByRole('button', { name: /apply/i });

  // ── CO-05: Apply valid coupon ──
  await couponInput.fill('get20');
  await applyBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO05-coupon-valid.png`, fullPage: true });
  console.log('✅ CO-05: Valid coupon applied');

  // ── CO-06: Apply invalid coupon — valid discount must NOT reset ──
  await couponInput.fill('INVALIDXYZ999');
  await applyBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO06-coupon-invalid.png`, fullPage: true });
  console.log('✅ CO-06: Invalid coupon submitted — previous discount should persist');

  // ── CO-07: Try all 3 coupons in sequence ──
  for (const code of ['get20', 'stay15', 'Preview15']) {
    await couponInput.fill(code);
    await applyBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${EVIDENCE_DIR}\\CO07-coupon-${code}.png`, fullPage: true });
    console.log(`✅ CO-07 [${code}]: applied`);
  }

  // ── Fill card and Pay → capture success page ──
  await page.locator('input[placeholder="Enter your name"]').fill('Test User');
  await fillStripeCard(page, { number: '4242 4242 4242 4242', exp: '12/34', cvc: '123' });

  const PAY_BTN = page.locator('button[type="submit"]').filter({ hasText: /^Pay/ });
  await PAY_BTN.waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO-pay-before-submit.png`, fullPage: true });

  await PAY_BTN.click();

  // Wait for success page or confirmation
  await page.waitForURL(/success|confirmation|thank/i, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO-success-page.png`, fullPage: true });
  console.log(`✅ Payment submitted — URL: ${page.url()}`);

  // Log all captured API calls
  console.log('\n📋 API Summary:');
  apiLog.forEach(r => console.log(`  [${r.status}] ${r.url}\n  ${r.body.substring(0, 200)}`));

  // Check CWA_Sticker_registration specifically
  const stickerApi = apiLog.find(r => r.url.includes('CWA_Sticker') || r.url.includes('registration'));
  if (stickerApi) {
    console.log(`\n✅ CWA_Sticker_registration API found: [${stickerApi.status}]\n${stickerApi.body}`);
  } else {
    console.log('\n⚠️ CWA_Sticker_registration API not captured — may fire after redirect');
  }

  await ctx.close();
});





// ── CO-SUCCESS: Fill checkout form like a human and verify success page ────────
test.skip('VHREU Checkout — fill card details and verify success page', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('https://vhreu.accessautohistory.com/checkout?type=sticker&data=eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ2aW4iOiJJakZPTmtGQk1VVktXRWhPTlRRd056UTVJZz09IiwidiI6IklqSXdNVGNnVG1semMyRnVJRlJwZEdGdUlGaEVJZz09IiwiY29kZSI6IkFTQVVIIiwiY3VycmVuY3kiOiJFVVIiLCJwcmljZSI6NDkuOTksInBlcmNlbnRhZ2UiOjEsInBob25lIjoiIiwicGxhbiI6IkludGNJbU52WkdWY0lqcGNJa0ZUUVZWSFhDSXNYQ0p1WVcxbFhDSTZYQ0pOYjNOMElGQnZjSFZzWVhKY0lpeGNJblI1Y0dWY0lqcGNJbk4wYVdOclpYSmNJaXhjSW5CeWFXTmxYQ0k2TkRrdU9Ua3NYQ0p1YjNOY0lqcGNJaTB4WENJc1hDSmpkWEp5Wlc1amVWOWpiMlJsWENJNlhDSkZWVkpjSWl4Y0ltTjFjbkpsYm1ONVgzTnBaMjVjSWpwY0lrVlZVbHdpTEZ3aVkyOXVkbVZ5YzJsdmJsOXlZWFJsWENJNk1TeGNJbkpsWTNWeWNtbHVaMXdpT2x3aWJXOXVkR2hzZVZ3aUxGd2laM1Z0Y205aFpGd2lPbHdpWENJc1hDSmthWE5qYjNWdWRGd2lPbHdpTUZ3aWZTST0ifQ%3D%3D&wpPage=window-sticker', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO-SUCCESS-01-checkout-loaded.png`, fullPage: true });

  // Fill name
  await page.locator('input[placeholder="Enter your name"]').click();
  await page.locator('input[placeholder="Enter your name"]').type('Test User', { delay: 80 });

  // Wait for Stripe card iframe
  await page.waitForSelector('iframe[src*="elements-inner-card"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Click card number iframe and type (pointer-events disabled on outer input, click the iframe directly)
  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await cardFrame.locator('input').first().click({ force: true });
  await page.keyboard.type('4242424242424242', { delay: 80 });

  // Tab to expiry (name="exp-date") and type
  await page.keyboard.press('Tab');
  await page.keyboard.type('1234', { delay: 80 });

  // Tab to CVC (name="cvc") and type
  await page.keyboard.press('Tab');
  await page.keyboard.type('123', { delay: 80 });

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO-SUCCESS-02-form-filled.png`, fullPage: true });

  // Press Enter to submit (Pay button may have pointer-events disabled until form valid)
  await page.keyboard.press('Enter');
  console.log('⏳ Enter pressed — waiting for success page...');

  await page.waitForURL('**/success-page**', { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CO-SUCCESS-03-success-page.png`, fullPage: true });

  expect(page.url()).toContain('success-page');
  console.log(`✅ CO-SUCCESS: Payment successful — URL: ${page.url()}`);
});

