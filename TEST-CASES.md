# VHREU — Full Test Case Suite

**File:** `vhreu-e2e-checkout.spec.js`
**Total Test Cases:** 39
**Last Updated:** 2026-04-30

---

## PRIORITY 1: VIN Input Validation — Homepage
- **TC-01:** VIN input: empty submit shows error
- **TC-02:** VIN input: less than 17 chars error
- **TC-03:** VIN input: max length enforced
- **TC-04:** VIN input: locks after valid search
- **TC-05:** VIN input: Ready for pickup popup & discount verification

## PRIORITY 2: VIN Input Validation — Window Sticker
- **TC-06:** Window Sticker VIN input: empty submit error
- **TC-07:** Window Sticker VIN input: less than 17 chars error
- **TC-08:** Window Sticker VIN input: max length enforced
- **TC-09:** Window Sticker VIN input: locks after valid search
- **TC-10:** Window Sticker VIN input: Ready for pickup popup & discount verification

## PRIORITY 3: Exit Intent Popup — Homepage
- **TC-11:** Homepage: exit intent popup appears on mouse leave
- **TC-12:** Homepage: exit intent popup mobile responsiveness (no overflow)
- **TC-13:** Homepage: exit intent CTA redirects to offer page

## PRIORITY 4: Exit Intent Popup — Window Sticker
- **TC-14:** Window Sticker: exit intent popup appears on mouse leave (Known Bug)
- **TC-15:** Window Sticker: exit intent popup mobile responsiveness (Known Bug)
- **TC-16:** Window Sticker: exit intent CTA redirects to offer page

## PRIORITY 5: Offer / Discount Banner
- **TC-17:** offer=get20 banner appears with green background
- **TC-18:** offer=get20 saved in localStorage

## PRIORITY 6: VIN Search Redirect + Timing
- **TC-19:** Homepage: VIN search redirects to preview with timing
- **TC-20:** Window Sticker: VIN search redirects to ws-preview with timing

## PRIORITY 7: Preview Page — Exit Intent Popup (VHR)
- **TC-21:** Exit intent popup triggers on preview page
- **TC-22:** CTA adds offer=Preview15 to URL
- **TC-23:** Discount price element visible after offer=Preview15
- **TC-24:** "No, Thanks" dismisses popup and blocks re-trigger
- **TC-25:** X button closes popup and blocks re-trigger

## PRIORITY 7b: WS Preview Page — Exit Intent Popup
- **TC-26:** Exit intent popup triggers on WS preview page
- **TC-27:** CTA adds offer=Preview15 to URL
- **TC-28:** Discount price element visible after offer=Preview15
- **TC-29:** "No, Thanks" dismisses popup and blocks re-trigger
- **TC-30:** X button closes popup and blocks re-trigger

## PRIORITY 8: Preview → Preloader → Checkout Flow
- **TC-31:** Preview → Preloader → Checkout flow with timing (VHR)
- **TC-32:** WS Preview → Preloader → Checkout flow with timing (WS)

## PRIORITY 9: Preview Page Responsiveness
- **TC-33:** Preview (VHR): responsiveness across 5 viewports
- **TC-34:** Preview (Sticker): responsiveness across 5 viewports

## PRIORITY 10: Checkout Page & Coupons
- **TC-35:** Checkout — full single-session (Skipped)
- **TC-36:** Checkout — coupon: valid/invalid persists (Skipped)
- **TC-37:** Checkout — fill card details and verify success (Skipped)

## PRIORITY 11: Cookies
- **TC-38:** Homepage: UTM params captured (Skipped)
- **TC-39:** Window Sticker: UTM params captured (Failed - Cookie issue)
