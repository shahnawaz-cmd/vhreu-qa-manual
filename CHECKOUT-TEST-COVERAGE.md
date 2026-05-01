# Checkout Page Test Coverage

**Test File:** `checkout-success.spec.js`  
**Total Cases:** 5  
**Status:** ✅ All Passing

---

## Test Cases Covered

### CS-01 — Valid Card Checkout (Success Flow)
**Card:** 5454 5454 5454 5454  
**Expected:** Payment succeeds → Redirects to success-page → my-reports  
**Validates:**
- Preloader appears before checkout
- Checkout page loads successfully
- Stripe iframes detected (card, expiry, CVC)
- All fields filled correctly
- Payment processes successfully
- Success page reached

---

### CS-02 — Declined Card (Generic Decline)
**Card:** 4000 0000 0000 0002  
**Expected:** Payment declined with `generic_decline` error  
**Validates:**
- API request captured with full payload
- API response captured with error details
- Decline code: `generic_decline`
- Error message: "Your card was declined."
- Frontend displays error appropriately

---

### CS-03 — Insufficient Funds
**Card:** 4000 0000 0000 9995  
**Expected:** Payment declined with `insufficient_funds` error  
**Validates:**
- API request/response captured
- Decline code: `insufficient_funds`
- Error message: "Your card has insufficient funds."
- Stripe API returns 402 status

---

### CS-04 — Expired Card
**Card:** 4000 0000 0000 0069  
**Expected:** Payment declined with `expired_card` error  
**Validates:**
- API request/response captured
- Decline code: `expired_card`
- Error message: "Your card has expired."
- Error param: `exp_month`

---

### CS-05 — Wrong CVC
**Card:** 4000 0000 0000 0127  
**Expected:** Payment declined with `incorrect_cvc` error  
**Validates:**
- API request/response captured
- Decline code: `incorrect_cvc`
- Error message: "Your card's security code is incorrect."
- Error param: `cvc`

---

## Evidence Location
`test-results/VHREU-preloader-preview-to-checkout/`

Screenshots:
- `CS-01-checkout-loaded.png`
- `CS-02-checkout-loaded.png`

---

## API Validation
All test cases capture:
- ✅ Full Stripe API request payload
- ✅ Complete API response with error details
- ✅ HTTP status codes
- ✅ Decline codes and error messages
- ✅ Payment intent details
- ✅ Payment method information

---

## Test Flow
1. Navigate to preview page
2. Click "Access Records"
3. Fill email with unique timestamp
4. Submit → Wait for preloader
5. Checkout page loads
6. Fill cardholder name
7. Detect and fill Stripe iframes (card, expiry, CVC)
8. Click Pay button
9. Capture API response
10. Validate success/error state

---

## Notes
- All tests use preview → preloader → checkout flow
- Stripe iframe detection uses `componentName` URL parameter
- API capture uses context-level request/response listeners
- Tests close context immediately after API capture to prevent hanging
- Timeout: 300 seconds per test
