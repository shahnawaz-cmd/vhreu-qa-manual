const { test, expect } = require('@playwright/test');
const path = require('path');

const PREVIEW_URL =
  'https://vhreu.accessautohistory.com/vin-check/preview?vin=2C3CDXCT0GH126868&type=vhr&wpPage=homepage';
const BASE_URL = 'https://vhreu.accessautohistory.com/';
const OFFER_URL = `${BASE_URL}?ref=ads&offer=get20`;
const WINDOW_STICKER_URL = 'https://vhreu.accessautohistory.com/window-sticker';

const EVIDENCE_DIR = path.join(__dirname, 'test-results', 'VHREU-preloader-preview-to-checkout');

test.afterAll(async ({ browser }, testInfo) => {
  if (browser) {
    await browser.close();
  }
  setTimeout(() => {
    process.exit(0);
  }, 1000);
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

  await page.locator('#vin-input').type('123456789012345678'); // 18 chars
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
  
  // Step 1: Search VIN and wait for preview page
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.fill('#vin-input', testVins[0]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  
  // Wait for preview page to load
  await page.waitForURL('**/preview**', { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('✅ Navigated to preview page');
  
  // Go back to base URL in same browser and wait for popup
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);

  // Verify popup appears
  const popup = page.getByText(/ready for pickup|Your report.*is ready/i).first();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04a-VHREU-ready-popup.png`, fullPage: true });
  console.log('✅ Ready for pickup popup appeared');

  // Step 2: Click "Grab it for only" button
  const grabButton = page.getByRole('button', { name: /grab it for only|grab it/i }).first();
  await grabButton.click();
  await page.waitForTimeout(3000);
  console.log(`✅ Clicked grab button, current URL: ${page.url()}`);

  // Step 3: Search with second VIN
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.fill('#vin-input', testVins[1]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).click();
  await page.waitForTimeout(5000);
  
  // Check if navigated to preview
  if (page.url().includes('preview')) {
    await page.waitForTimeout(3000);
    // Go back to base URL and wait
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
  } else {
    // Already on homepage, just wait
    await page.waitForTimeout(5000);
  }

  // Step 4: Capture price without discount
  const priceButton = page.getByRole('button').filter({ hasText: /\$/ }).first();
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithoutDiscount = await priceButton.textContent();
  console.log(`Price without discount: ${priceWithoutDiscount}`);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04b-VHREU-price-no-discount.png`, fullPage: true });

  // Step 5: Apply discount via URL
  await page.goto(`${BASE_URL}?offer=get20`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Capture discounted price
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithDiscount = await priceButton.textContent();
  console.log(`Price with discount: ${priceWithDiscount}`);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\04c-VHREU-price-with-discount.png`, fullPage: true });

  expect(priceWithoutDiscount).not.toBe(priceWithDiscount);
  console.log('✅ Discount applied successfully');
});

// ─── UTM Cookie Capture — Homepage ─────────────────────────────────────────

test('VHREU — Homepage: UTM params (utm_details & traffic_source) captured in cookies', async ({ page }) => {
  await page.goto('https://vhreu.accessautohistory.com/?utm_details=mads&traffic_source=google', { waitUntil: 'networkidle' });

  const cookies = await page.context().cookies();
  const cookieMap = Object.fromEntries(cookies.map(c => [c.name, c.value]));

  const utmDetails = cookieMap['utm_details'];
  const trafficSource = cookieMap['traffic_source'];

  console.log('Homepage cookies found:', { utm_details: utmDetails, traffic_source: trafficSource });

  expect(utmDetails, 'utm_details cookie not found or incorrect').toBe('mads');
  expect(trafficSource, 'traffic_source cookie not found or incorrect').toBe('google');

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

  await page.locator('#vin-input').first().type('123456789012345678'); // 18 chars
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
  
  // Step 1: Search VIN and wait for preview page
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('#vin-input').first().fill(testVins[0]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  
  // Wait for preview page to load
  await page.waitForURL('**/preview**', { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('✅ Navigated to preview page from Window Sticker');
  
  // Go back to Window Sticker URL in same browser and wait for popup
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);

  // Verify popup appears
  const popup = page.getByText(/ready for pickup|Your report.*is ready/i).first();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08a-VHREU-ws-ready-popup.png`, fullPage: true });
  console.log('✅ Ready for pickup popup appeared on Window Sticker');

  // Step 2: Click "Grab it for only" button
  const grabButton = page.getByRole('button', { name: /grab it for only|grab it/i }).first();
  await grabButton.click();
  await page.waitForTimeout(3000);
  console.log(`✅ Clicked grab button, current URL: ${page.url()}`);

  // Step 3: Search with second VIN
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('#vin-input').first().fill(testVins[1]);
  await page.locator('button[type=submit]').filter({ hasText: 'Search VIN' }).first().click();
  await page.waitForTimeout(5000);
  
  // Check if navigated to preview
  if (page.url().includes('preview')) {
    await page.waitForTimeout(3000);
    // Go back to Window Sticker URL and wait
    await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
  } else {
    // Already on Window Sticker, just wait
    await page.waitForTimeout(5000);
  }

  // Step 4: Capture price without discount
  const priceButton = page.getByRole('button').filter({ hasText: /\$/ }).first();
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithoutDiscount = await priceButton.textContent();
  console.log(`Price without discount: ${priceWithoutDiscount}`);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\08b-VHREU-ws-price-no-discount.png`, fullPage: true });

  // Step 5: Apply discount via URL
  await page.goto(`${WINDOW_STICKER_URL}?offer=get20`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Capture discounted price
  await priceButton.waitFor({ state: 'visible', timeout: 10000 });
  const priceWithDiscount = await priceButton.textContent();
  console.log(`Price with discount: ${priceWithDiscount}`);
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

  const utmDetails = cookieMap['utm_details'];
  const trafficSource = cookieMap['traffic_source'];

  console.log('Window Sticker cookies found:', { utm_details: utmDetails, traffic_source: trafficSource });

  expect(utmDetails, 'utm_details cookie not found or incorrect').toBe('mads');
  expect(trafficSource, 'traffic_source cookie not found or incorrect').toBe('google');

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

test('VHREU — Homepage: exit intent CTA redirects to ?offer=stay15', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await triggerExitIntent(page);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 5000 });
  await page.locator('text=Click here to redeem instantly').click();

  await page.waitForURL('**/?offer=stay15**', { timeout: 10000 });
  expect(page.url()).toContain('offer=stay15');

  await page.screenshot({ path: `${EVIDENCE_DIR}\\11-VHREU-homepage-exit-popup-redirect.png`, fullPage: true });
  console.log('✅ VHREU Homepage exit popup CTA → redirected to:', page.url());
});

// ─── PRIORITY 4: Exit Intent Popup — Window Sticker (⚠️ KNOWN BUGS) ────────

test('VHREU — Window Sticker: exit intent popup appears on mouse leave', async ({ page }) => {
  // ⚠️ KNOWN BUG: Exit intent popup does not trigger on /window-sticker. Failing intentionally.
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await triggerExitIntent(page);

  await expect(page.locator('dialog').first()).toBeVisible({ timeout: 10000 }); // FAILS — bug confirmed
});

test('VHREU — Window Sticker: exit intent popup mobile responsiveness (no overflow)', async ({ page }) => {
  // ⚠️ KNOWN BUG: Depends on exit intent popup which does not trigger on /window-sticker. Failing intentionally.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await triggerExitIntent(page);

  await expect(page.locator('dialog').first()).toBeVisible({ timeout: 10000 }); // FAILS — bug confirmed
});

test('VHREU — Window Sticker: exit intent CTA redirects to ?offer=stay15', async ({ page }) => {
  await page.goto(WINDOW_STICKER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  await triggerExitIntent(page);
  await page.waitForTimeout(3000);

  await expect(page.locator('text=Click here to redeem instantly')).toBeVisible({ timeout: 25000 });
  await page.locator('text=Click here to redeem instantly').click();
  await page.waitForURL('**/?offer=stay15**', { timeout: 20000 });
  expect(page.url()).toContain('offer=stay15');

  console.log('✅ VHREU Window Sticker exit popup CTA → redirected to:', page.url());
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
  console.log(`✅ VHREU Homepage VIN search → preview in ${elapsed}s | URL: ${page.url()}`);
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
  console.log(`✅ VHREU Window Sticker VIN search → ws-preview in ${elapsed}s | URL: ${page.url()}`);
});

// ─── PRIORITY 7: Preview → Preloader → Checkout Flow ───────────────────────

test('VHREU — Preview → Preloader → Checkout flow with timing', async ({ page }) => {
  // Step 1: Open Preview page
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\19-VHREU-preview-page.png`, fullPage: true });

  // Step 2: Click "Access Records" to open popup
  await page.getByRole('button', { name: /access records/i }).first().click();
  await page.waitForTimeout(1000);

  // Step 3: Fill email in popup
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  const uniqueEmail = `test${Date.now()}@example.com`;
  await emailInput.fill(uniqueEmail);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\20-VHREU-email-popup.png`, fullPage: true });

  // Step 4: Click "Access Records" inside popup
  await page.getByRole('button', { name: /access records/i }).last().click();
  await page.waitForTimeout(1000);

  const startTime = Date.now();

  // Step 5: Capture Preloader
  const preloader = page.locator('text=Preparing Your Checkout');
  await expect(preloader).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\21-VHREU-preloader-screen.png`, fullPage: true });
  console.log('✅ VHREU Preloader appeared');

  // Step 6: Wait for Checkout page
  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱ VHREU Time from Preloader to Checkout: ${elapsed}s`);

  // Step 7: Capture Checkout page
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Choose payment method')).toBeVisible({ timeout: 40000 });
  await page.screenshot({ path: `${EVIDENCE_DIR}\\22-VHREU-checkout-page.png`, fullPage: true });
  console.log('✅ VHREU Checkout page loaded successfully');

  expect(parseFloat(elapsed)).toBeLessThan(30);
});
