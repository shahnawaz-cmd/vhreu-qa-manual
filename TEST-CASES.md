# VHREU — Test Cases

**File:** `VHREU-preloader-checkout.spec.js`  
**Total Test Cases:** 23  
**Last Updated:** 2026-04-27

---

## PRIORITY 1: VIN Input Validation — Homepage

### TC-01 — VIN input: empty submit shows error and placeholder remains
| | |
|---|---|
| **Step** | Navigate to base URL → Click "Search VIN" without entering VIN |
| **Expected** | Error "Please enter a VIN number" appears, placeholder "Enter VIN" remains |
| **Evidence** | `01-VHREU-vin-empty-error.png` |

---

### TC-02 — VIN input: less than 17 chars shows character count error
| | |
|---|---|
| **Step** | Enter "ABC123" (6 chars) → Click "Search VIN" |
| **Expected** | Error "VIN must be exactly 17 characters" appears |
| **Evidence** | `02-VHREU-vin-short-error.png` |

---

### TC-03 — VIN input: max length enforced at 17 characters
| | |
|---|---|
| **Step** | Type 18 characters in VIN input |
| **Expected** | Input accepts only 17 characters maximum |
| **Evidence** | `03-VHREU-vin-maxlength.png` |

---

### TC-04 — VIN input: locks after valid 17-char VIN search
| | |
|---|---|
| **Step** | Enter valid VIN "2C3CDXCT0GH126868" → Click "Search VIN" |
| **Expected** | VIN input becomes disabled after search |
| **Evidence** | `04-VHREU-vin-locked.png` |

---

### TC-05 — VIN input: Ready for pickup popup and discount verification (NEW)
| | |
|---|---|
| **Step 1** | Enter VIN "KL4CJASB6HB019273" → Navigate to preview page |
| **Step 2** | Go back to base URL → Wait 5-8 seconds |
| **Expected** | "Ready for pickup" popup appears |
| **Evidence** | `04a-VHREU-ready-popup.png` |
| **Step 3** | Click "Grab it for only" button |
| **Expected** | Navigates to preview page |
| **Step 4** | Enter 2nd VIN "2C3CCAAG3EH179096" → Go to preview → Back to base URL |
| **Step 5** | Capture price without discount |
| **Expected** | Price displayed (e.g., $10) |
| **Evidence** | `04b-VHREU-price-no-discount.png` |
| **Step 6** | Apply discount via URL `?offer=get20` |
| **Expected** | Discounted price displayed (e.g., $8) |
| **Evidence** | `04c-VHREU-price-with-discount.png` |
| **Validation** | Price without discount ≠ Price with discount |

---

## UTM Cookie Capture — Homepage

### TC-06 — Homepage: UTM params captured in cookies
| | |
|---|---|
| **Step** | Navigate to `/?utm_details=mads&traffic_source=google` |
| **Expected** | Cookies `utm_details=mads` and `traffic_source=google` are set |
| **Validation** | Cookie values match URL parameters |

---

## PRIORITY 2: VIN Input Validation — Window Sticker

### TC-07 — Window Sticker VIN input: empty submit shows error
| | |
|---|---|
| **Step** | Navigate to Window Sticker URL → Click "Search VIN" without entering VIN |
| **Expected** | Error "Please enter a VIN number" appears, placeholder remains |
| **Evidence** | `05-VHREU-ws-vin-empty-error.png` |

---

### TC-08 — Window Sticker VIN input: less than 17 chars error
| | |
|---|---|
| **Step** | Enter "ABC123" → Click "Search VIN" |
| **Expected** | Error "VIN must be exactly 17 characters" appears |
| **Evidence** | `06-VHREU-ws-vin-short-error.png` |

---

### TC-09 — Window Sticker VIN input: max length enforced
| | |
|---|---|
| **Step** | Type 18 characters in VIN input |
| **Expected** | Input accepts only 17 characters maximum |
| **Evidence** | `07-VHREU-ws-vin-maxlength.png` |

---

### TC-10 — Window Sticker VIN input: locks after valid search
| | |
|---|---|
| **Step** | Enter valid VIN "SALWA2KE4EA335351" → Click "Search VIN" |
| **Expected** | VIN input becomes disabled after search |
| **Evidence** | `08-VHREU-ws-vin-locked.png` |

---

### TC-11 — Window Sticker VIN input: Ready for pickup popup and discount verification (NEW)
| | |
|---|---|
| **Step 1** | Enter VIN "KL4CJASB6HB019273" → Navigate to preview page |
| **Step 2** | Go back to Window Sticker URL → Wait 5-8 seconds |
| **Expected** | "Ready for pickup" popup appears |
| **Evidence** | `08a-VHREU-ws-ready-popup.png` |
| **Step 3** | Click "Grab it for only" button |
| **Expected** | Navigates to preview page |
| **Step 4** | Enter 2nd VIN "2C3CCAAG3EH179096" → Go to preview → Back to Window Sticker |
| **Step 5** | Capture price without discount |
| **Expected** | Price displayed |
| **Evidence** | `08b-VHREU-ws-price-no-discount.png` |
| **Step 6** | Apply discount via URL `?offer=get20` |
| **Expected** | Discounted price displayed |
| **Evidence** | `08c-VHREU-ws-price-with-discount.png` |
| **Validation** | Price without discount ≠ Price with discount |

---

## UTM Cookie Capture — Window Sticker

### TC-12 — Window Sticker: UTM params captured in cookies
| | |
|---|---|
| **Step** | Navigate to `/window-sticker?utm_details=mads&traffic_source=google` |
| **Expected** | Cookies `utm_details=mads` and `traffic_source=google` are set |
| **Validation** | Cookie values match URL parameters |

---

## PRIORITY 3: Exit Intent Popup — Homepage

### TC-13 — Homepage: exit intent popup appears on mouse leave
| | |
|---|---|
| **Step** | Navigate to base URL → Trigger exit intent (mouse leave) |
| **Expected** | Exit intent popup (dialog) appears within 10s |
| **Evidence** | `09-VHREU-homepage-exit-popup.png` |

---

### TC-14 — Homepage: exit intent popup mobile responsiveness
| | |
|---|---|
| **Step** | Set viewport to 375x812 → Trigger exit intent |
| **Expected** | Popup appears with no horizontal overflow |
| **Evidence** | `10-VHREU-homepage-exit-popup-mobile.png` |
| **Validation** | No elements overflow viewport width |

---

### TC-15 — Homepage: exit intent CTA redirects to ?offer=stay15
| | |
|---|---|
| **Step** | Trigger exit intent → Click "Click here to redeem instantly" |
| **Expected** | Redirects to URL containing `?offer=stay15` |
| **Evidence** | `11-VHREU-homepage-exit-popup-redirect.png` |

---

## PRIORITY 4: Exit Intent Popup — Window Sticker

### TC-16 — Window Sticker: exit intent popup appears (KNOWN BUG)
| | |
|---|---|
| **Step** | Navigate to Window Sticker URL → Trigger exit intent |
| **Expected** | Exit intent popup appears |
| **Status** | ⚠️ KNOWN BUG: Popup does not trigger on /window-sticker |

---

### TC-17 — Window Sticker: exit intent popup mobile responsiveness (KNOWN BUG)
| | |
|---|---|
| **Step** | Set viewport to 375x812 → Trigger exit intent |
| **Expected** | Popup appears with no overflow |
| **Status** | ⚠️ KNOWN BUG: Depends on TC-16 |

---

### TC-18 — Window Sticker: exit intent CTA redirects to ?offer=stay15
| | |
|---|---|
| **Step** | Trigger exit intent → Click "Click here to redeem instantly" |
| **Expected** | Redirects to URL containing `?offer=stay15` |
| **Timeout** | 20s for popup, 20s for navigation |

---

## PRIORITY 5: Offer / Discount Banner

### TC-19 — offer=get20 banner appears with green background
| | |
|---|---|
| **Step** | Navigate to `/?offer=get20` |
| **Expected** | Green banner with "20% OFF" appears |
| **Evidence** | `15-VHREU-offer-banner.png` |

---

### TC-20 — offer=get20 saved in localStorage
| | |
|---|---|
| **Step** | Navigate to `/?offer=get20` → Check localStorage |
| **Expected** | `localStorage.getItem('offer')` returns "get20" |
| **Validation** | Value persists in browser storage |

---

## PRIORITY 6: VIN Search Timing

### TC-21 — Homepage: VIN search redirects to preview with timing
| | |
|---|---|
| **Step** | Enter VIN "2C3CDXCT0GH126868" → Click "Search VIN" |
| **Expected** | Redirects to preview page within 10 seconds |
| **Evidence** | `16-VHREU-homepage-vin-search-timing.png` |
| **Validation** | Time measured and logged |

---

### TC-22 — Window Sticker: VIN search redirects to ws-preview with timing
| | |
|---|---|
| **Step** | Enter VIN "SALWA2KE4EA335351" → Click "Search VIN" |
| **Expected** | Redirects to window-sticker preview within 10 seconds |
| **Evidence** | `17-VHREU-ws-vin-search-timing.png` |
| **Validation** | Time measured and logged |

---

## PRIORITY 7: Preview → Checkout Flow

### TC-23 — Preview → Preloader → Checkout flow with timing
| | |
|---|---|
| **Step 1** | Navigate to preview URL |
| **Evidence** | `19-VHREU-preview-page.png` |
| **Step 2** | Click "Access Records" → Fill unique email → Submit |
| **Evidence** | `20-VHREU-email-popup.png` |
| **Step 3** | Wait for preloader "Preparing Your Checkout" |
| **Expected** | Preloader appears within 15s |
| **Evidence** | `21-VHREU-preloader-screen.png` |
| **Step 4** | Wait for checkout page |
| **Expected** | Checkout URL loads within 90s |
| **Timing** | Measured from preloader to checkout |
| **Step 5** | Verify "Choose payment method" text appears |
| **Expected** | Text visible within 40s |
| **Evidence** | `22-VHREU-checkout-page.png` |
| **Validation** | Total time < 30 seconds (from preloader to checkout) |

---

## Evidence Location
`test-results/VHREU-preloader-preview-to-checkout/`

---

## Notes
- **NEW Test Cases:** TC-05 and TC-11 (Ready for pickup popup and discount verification)
- **VINs Used:** 
  - KL4CJASB6HB019273 (1st VIN for popup tests)
  - 2C3CCAAG3EH179096 (2nd VIN for popup tests)
- **Known Bugs:** TC-16, TC-17 (Exit intent on Window Sticker page)
- **Script Termination:** Configured to close browser and exit after all tests complete
- **HTML Report:** Set to `open: 'never'` to prevent hanging
