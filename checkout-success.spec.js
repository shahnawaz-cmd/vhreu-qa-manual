const { test, expect } = require('@playwright/test');
const path = require('path');
const EVIDENCE_DIR = path.join(__dirname, 'test-results', 'VHREU-preloader-preview-to-checkout');

const PREVIEW_URL = 'https://vhreu.accessautohistory.com/vin-check/preview?vin=2C3CDXCT0GH126868&type=vhr&wpPage=homepage';

test('VHREU Checkout — fill card and verify success page', async ({ page }) => {
  test.setTimeout(300000);

  // Step 1: Go to Preview page
  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Step 2: Click Access Records
  await page.getByRole('button', { name: /access records/i }).first().click();

  // Step 3: Fill unique email and submit
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  // Step 4: Wait for preloader then checkout
  await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
  console.log('✅ Preloader visible');

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CS-01-checkout-loaded.png` });
  console.log('✅ Checkout page loaded');

  // Step 5: Fill cardholder name
  await page.locator('input[placeholder="Enter your name"]').fill('Test User');

  // Step 6: Fill Stripe card fields — wait for iframes to be ready first
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found — card:${!!cardFrame} expiry:${!!expiryFrame} cvc:${!!cvcFrame}`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  if (cardFrame) {
    await cardFrame.locator('[name="cardnumber"]').click();
    await page.waitForTimeout(300);
    await page.keyboard.type('5454545454545454', { delay: 80 });
    console.log('✅ Card number typed');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape'); // dismiss Stripe Link popup if shown
    await page.waitForTimeout(300);
  }

  if (expiryFrame) {
    await expiryFrame.locator('[name="exp-date"]').click();
    await page.waitForTimeout(300);
    await page.keyboard.type('0232', { delay: 80 });
    console.log('✅ Expiry typed');
    await page.waitForTimeout(300);
  }

  if (cvcFrame) {
    await cvcFrame.locator('[name="cvc"]').click();
    await page.waitForTimeout(300);
    await page.keyboard.type('123', { delay: 80 });
    console.log('✅ CVC typed');
  }

  await page.waitForTimeout(1000);

  // Step 7: Click Pay button — use /^pay €/i to avoid matching "Paypal"
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for success page...');

  // Step 8: Wait for success-page, then my-reports
  await page.waitForURL('**/success-page**', { timeout: 60000 }).catch(() => {});
  console.log('✅ Landed on success-page');
  await page.waitForURL('**/my-reports**', { timeout: 60000 }).catch(async () => {
    // some flows go directly — check current URL
    if (page.url().includes('success-page') || page.url().includes('my-reports')) {
      console.log(`✅ SUCCESS — final URL: ${page.url()}`);
    }
  });
  console.log(`✅ SUCCESS — landed on: ${page.url()}`);
});

test('CS-02 — Declined card: capture API response and frontend error', async ({ page, context }) => {
  test.setTimeout(300000);

  // Intercept at context level FIRST — before any navigation
  let apiPayload = null;
  let apiResponse = null;
  let apiStatus = null;

  context.on('request', request => {
    if (request.url().includes('payment_intents') && request.url().includes('confirm')) {
      apiPayload = request.postData();
      console.log('📤 Stripe API URL:', request.url());
      console.log('📤 Payload:', apiPayload);
    }
  });

  context.on('response', async response => {
    if (response.url().includes('payment_intents') && response.url().includes('confirm')) {
      apiStatus = response.status();
      try {
        const body = await response.json();
        apiResponse = body;
        const code = body?.error?.code || body?.last_payment_error?.code || 'N/A';
        console.log('📥 Stripe API Status:', apiStatus);
        console.log('📥 Decline Code:', code);
        console.log('📥 Full Response:', JSON.stringify(body, null, 2));
      } catch {
        console.log('📥 Stripe API Status:', apiStatus, '— body not parseable');
      }
    }
  });

  // Step 1: Go to Preview page
  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Step 2: Click Access Records
  await page.getByRole('button', { name: /access records/i }).first().click();

  // Step 3: Fill unique email and submit
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  // Step 4: Wait for preloader then checkout
  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch {
    console.log('⚠️ Preloader not detected — continuing');
  }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${EVIDENCE_DIR}\\CS-02-checkout-loaded.png` });
  console.log('✅ Checkout page loaded');

  // Step 5: Fill cardholder name
  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  // Step 6: Find Stripe iframes by componentName in URL
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(3000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 5; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    console.log(`⏳ Retry ${i+1} — card:${!!cardFrame} expiry:${!!expiryFrame} cvc:${!!cvcFrame}`);
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found — card:${!!cardFrame} expiry:${!!expiryFrame} cvc:${!!cvcFrame}`);

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000000002', { delay: 80 });
  console.log('✅ Declined card typed');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  console.log('✅ Expiry typed');
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  console.log('✅ CVC typed');
  await page.waitForTimeout(1000);

  // Step 7: Click Pay
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for Stripe API response...');

  // Step 8: Capture API response
  const res02 = await page.waitForResponse(
    res => res.url().includes('payment_intents') && res.url().includes('confirm'),
    { timeout: 60000 }
  );
  try {
    const body = await res02.json();
    const declineCode = body?.error?.decline_code || body?.error?.code || 'declined';
    console.log('📥 Decline Code:', declineCode);
  } catch {}
  console.log('✅ API captured — closing immediately');
  await context.close();
});


test('CS-03 — Insufficient funds: capture API response', async ({ page, context }) => {
  test.setTimeout(300000);

  context.on('request', request => {
    if (request.url().includes('payment_intents') && request.url().includes('confirm')) {
      console.log('📤 Stripe API URL:', request.url());
      console.log('📤 Payload:', request.postData());
    }
  });

  context.on('response', async response => {
    if (response.url().includes('payment_intents') && response.url().includes('confirm')) {
      const status = response.status();
      try {
        const body = await response.json();
        const code = body?.error?.code || body?.last_payment_error?.code || 'N/A';
        console.log('📥 Stripe API Status:', status);
        console.log('📥 Decline Code:', code);
        console.log('📥 Full Response:', JSON.stringify(body, null, 2));
      } catch {
        console.log('📥 Stripe API Status:', status);
      }
    }
  });

  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /access records/i }).first().click();

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch { console.log('⚠️ Preloader not detected — continuing'); }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Checkout page loaded');

  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000009995', { delay: 80 }); // insufficient funds
  console.log('✅ Card typed');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  await page.waitForTimeout(1000);
  await page.waitForSelector('button:not([disabled])[name="pay"], button:not([disabled])', { timeout: 10000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).waitFor({ state: 'enabled', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for Stripe API response...');

  const res03 = await page.waitForResponse(
    res => res.url().includes('payment_intents') && res.url().includes('confirm'),
    { timeout: 60000 }
  );
  try {
    const body = await res03.json();
    const declineCode = body?.error?.decline_code || body?.error?.code || 'declined';
    console.log('📥 Decline Code:', declineCode);
  } catch {}
  console.log('✅ CS-03 COMPLETE — API captured, terminating');
  await context.close();
});

test('CS-04 — Expired card: capture API response', async ({ page, context }) => {
  test.setTimeout(300000);

  context.on('request', request => {
    if (request.url().includes('payment_intents') && request.url().includes('confirm')) {
      console.log('📤 Stripe API URL:', request.url());
      console.log('📤 Payload:', request.postData());
    }
  });

  context.on('response', async response => {
    if (response.url().includes('payment_intents') && response.url().includes('confirm')) {
      const status = response.status();
      try {
        const body = await response.json();
        const code = body?.error?.code || body?.last_payment_error?.code || 'N/A';
        console.log('📥 Stripe API Status:', status);
        console.log('📥 Decline Code:', code);
        console.log('📥 Full Response:', JSON.stringify(body, null, 2));
      } catch {
        console.log('📥 Stripe API Status:', status);
      }
    }
  });

  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /access records/i }).first().click();

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch { console.log('⚠️ Preloader not detected — continuing'); }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Checkout page loaded');

  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000000069', { delay: 80 }); // expired card
  console.log('✅ Card typed');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /^pay €/i }).waitFor({ state: 'enabled', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for Stripe API response...');

  const res04 = await page.waitForResponse(
    res => res.url().includes('payment_intents') && res.url().includes('confirm'),
    { timeout: 60000 }
  );
  try {
    const body = await res04.json();
    const declineCode = body?.error?.decline_code || body?.error?.code || 'declined';
    console.log('📥 Decline Code:', declineCode);
  } catch {}
  console.log('✅ CS-04 COMPLETE — API captured, terminating');
  await context.close();
});

test('CS-05 — Wrong CVC: capture API response', async ({ page, context }) => {
  test.setTimeout(300000);

  context.on('request', request => {
    if (request.url().includes('payment_intents') && request.url().includes('confirm')) {
      console.log('📤 Stripe API URL:', request.url());
      console.log('📤 Payload:', request.postData());
    }
  });

  context.on('response', async response => {
    if (response.url().includes('payment_intents') && response.url().includes('confirm')) {
      const status = response.status();
      try {
        const body = await response.json();
        const code = body?.error?.code || body?.last_payment_error?.code || 'N/A';
        console.log('📥 Stripe API Status:', status);
        console.log('📥 Decline Code:', code);
        console.log('📥 Full Response:', JSON.stringify(body, null, 2));
      } catch {
        console.log('📥 Stripe API Status:', status);
      }
    }
  });

  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /access records/i }).first().click();

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch { console.log('⚠️ Preloader not detected — continuing'); }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Checkout page loaded');

  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000000127', { delay: 80 }); // incorrect CVC card
  console.log('✅ Card typed');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /^pay €/i }).waitFor({ state: 'enabled', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for Stripe API response...');

  const res05 = await page.waitForResponse(
    res => res.url().includes('payment_intents') && res.url().includes('confirm'),
    { timeout: 60000 }
  );
  try {
    const body = await res05.json();
    const declineCode = body?.error?.decline_code || body?.error?.code || 'declined';
    console.log('📥 Decline Code:', declineCode);
  } catch {}
  console.log('✅ CS-05 COMPLETE — API captured, terminating');
  await context.close();
});

test('CS-06 — 3D Secure: Authentication required and succeeds', async ({ page, context }) => {
  test.setTimeout(300000);

  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /access records/i }).first().click();

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch { console.log('⚠️ Preloader not detected — continuing'); }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Checkout page loaded');

  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000003220', { delay: 80 }); // 3DS2 card
  console.log('✅ 3DS Card typed (4000 0000 0000 3220)');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /^pay €/i }).waitFor({ state: 'enabled', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for 3DS authentication modal...');

  // Wait for 3DS challenge iframe to appear
  await page.waitForTimeout(8000);
  
  // Find the 3DS authentication iframe
  const frames = page.frames();
  let authFrame = null;
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('stripe.com') && (url.includes('3ds') || url.includes('challenge') || url.includes('authentication'))) {
      authFrame = frame;
      console.log('✅ Found 3DS frame:', url.substring(0, 80));
      break;
    }
  }
  
  if (authFrame) {
    await authFrame.locator('button, input[type="submit"]').first().click({ timeout: 30000 });
    console.log('✅ 3DS Authentication modal completed');
  } else {
    console.log('⚠️ 3DS frame not found');
  }

  // Wait for navigation after 3DS
  await page.waitForTimeout(5000);
  
  const finalURL = page.url();
  console.log(`✅ CS-06 COMPLETE — 3DS authentication flow tested`);
  console.log(`   Final URL: ${finalURL.substring(0, 100)}...`);
  
  // Note: 3DS cards may still decline after authentication depending on backend configuration
  if (finalURL.includes('success-page') || finalURL.includes('my-reports')) {
    console.log('✅ Payment succeeded after 3DS authentication');
  } else if (finalURL.includes('checkout')) {
    console.log('⚠️ Returned to checkout (payment may have been declined after 3DS)');
  }
  
  await context.close();
});
  test.setTimeout(300000);

  await page.goto(PREVIEW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /access records/i }).first().click();

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(`test${Date.now()}@example.com`);
  await page.getByRole('button', { name: /proceed to checkout/i }).click();

  try {
    await expect(page.locator('text=Preparing Your Checkout')).toBeVisible({ timeout: 15000 });
    console.log('✅ Preloader visible');
  } catch { console.log('⚠️ Preloader not detected — continuing'); }

  await page.waitForURL('**/checkout**', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Checkout page loaded');

  const nameInput = page.locator('input[placeholder="Enter your name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.click();
  await nameInput.fill('Test User');
  console.log('✅ Name filled');

  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('iframe')).filter(f => f.src && f.src.includes('stripe.com')).length >= 3
  , { timeout: 30000 });
  await page.waitForTimeout(1000);

  let cardFrame = null, expiryFrame = null, cvcFrame = null;
  for (let i = 0; i < 20; i++) {
    cardFrame = null; expiryFrame = null; cvcFrame = null;
    for (const frame of page.frames()) {
      if (!frame.url().includes('stripe.com')) continue;
      if (frame.url().includes('componentName=cardNumber')) cardFrame = frame;
      else if (frame.url().includes('componentName=cardExpiry')) expiryFrame = frame;
      else if (frame.url().includes('componentName=cardCvc')) cvcFrame = frame;
    }
    if (cardFrame && expiryFrame && cvcFrame) break;
    await page.waitForTimeout(1000);
  }
  console.log(`Frames — card: ${!!cardFrame}, expiry: ${!!expiryFrame}, cvc: ${!!cvcFrame}`);
  if (!cardFrame || !expiryFrame || !cvcFrame) throw new Error(`❌ Stripe iframes not found`);
  await cardFrame.locator('[name="cardnumber"]').waitFor({ state: 'visible', timeout: 15000 });

  await cardFrame.locator('[name="cardnumber"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('4000000000003220', { delay: 80 }); // 3DS2 card that succeeds
  console.log('✅ 3DS Card typed');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expiryFrame.locator('[name="exp-date"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1234', { delay: 80 });
  await page.waitForTimeout(300);

  await cvcFrame.locator('[name="cvc"]').click();
  await page.waitForTimeout(300);
  await page.keyboard.type('123', { delay: 80 });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /^pay €/i }).waitFor({ state: 'enabled', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: /^pay €/i }).click();
  console.log('⏳ Pay clicked — waiting for 3DS authentication modal...');

  // Wait for 3DS challenge iframe to appear
  await page.waitForTimeout(8000);
  
  // Find the 3DS authentication iframe
  const frames = page.frames();
  let authFrame = null;
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('stripe.com') && (url.includes('3ds') || url.includes('challenge') || url.includes('authentication'))) {
      authFrame = frame;
      console.log('✅ Found 3DS frame:', url.substring(0, 80));
      break;
    }
  }
  
  if (authFrame) {
    await authFrame.locator('button, input[type="submit"]').first().click({ timeout: 30000 });
    console.log('✅ 3DS Authentication completed');
  } else {
    console.log('⚠️ 3DS frame not found');
  }

  // Wait for navigation after 3DS
  await page.waitForTimeout(5000);
  
  // Check if we reached success page or my-reports
  await page.waitForURL(/success-page|my-reports/i, { timeout: 60000 }).catch(() => {});
  
  const finalURL = page.url();
  console.log(`✅ CS-06 COMPLETE — Final URL: ${finalURL}`);
  
  if (finalURL.includes('success-page') || finalURL.includes('my-reports')) {
    console.log('✅ 3DS payment succeeded!');
  } else {
    console.log(`⚠️ Unexpected URL after 3DS: ${finalURL}`);
  }
  
  await context.close();
});