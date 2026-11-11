# UI Verification Report: PublicLayout (Storefront & Client Portal Shell)

**Status:** PASS ✅  
**Date:** 11 Novembre 2026  
**Route:** Layout (`frontend/src/layouts/PublicLayout.vue`)  
**Baseline:** `.agents/rules/ui-contract.md`

---

## 1. Matrix Across 6 Widths

| Viewport | Horizontal Scroll | Overflows | Small Text (<12px) | Touch Targets (<44px on mobile) | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **360px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |
| **390px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |
| **768px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |
| **1024px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |
| **1440px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |
| **1920px** | PASS (None) | PASS (0) | PASS (0) | PASS (0) | PASS ✅ |

---

## 2. Static Scan Checklist

| Check | Expected | Result | Evidence |
| :--- | :--- | :---: | :--- |
| Hex colours outside tokens | 0 hits | PASS ✅ | 0 hardcoded hex colors found (all migrated to `var(--color-*)`) |
| Inline styles (`style=`) | 0 hits | PASS ✅ | 0 inline styles |
| Bare buttons / inputs | 0 hits | PASS ✅ | 0 bare controls (migrated to `Button`, `Input`, and `Icon` primitives) |
| Emoji as icons | 0 hits | PASS ✅ | All emoji icons (`📋`, `📑`, `💳`, `🛒`, `🔔`, `✕`) replaced with currentColor Lucide SVG icons (`Icon`) |
| Currency format | `DA` with non-breaking space | PASS ✅ | Sourced from `APP_COMPANY_INFO.capital` (`10 000 000 DA`) — zero `DZD` |
| Arrow suffix on buttons/links | 0 hits | PASS ✅ | "→" removed from pending client banner link |
| Font scale | >= 12px | PASS ✅ | Sub-12px text sizes eliminated; all typography adheres to tokens |
| RTL compatibility | Dir mirror & LTR numbers | PASS ✅ | Phone numbers `dir="ltr"`, mirrored dropdowns and badges for RTL |
| Mobile touch targets | >= 44px at <= 768px | PASS ✅ | All interactive elements (nav buttons, categories, search, links) >= 44px |

---

## 3. Self-Review Checklist (Contract Section 12)

1. **One clear primary action per section?** YES (Brand identity, search, and portal navigation clearly organized).
2. **Title area <= 96px and first content visible at 1440x900?** YES (Sticky header height is 64px, announcement bar is 28px).
3. **All controls from primitives, same heights and radii?** YES (`Input` and `Button` primitives used, 8px radius for controls, 12px cards, 999px pills).
4. **No raw enums, emoji icons, mojibake, mixed languages?** YES (Clean French typography, zero emojis, zero enums).
5. **Money/dates from `lib/format`, "DA" only?** YES (Uses `APP_BRAND_NAME`, `APP_BRAND_SHORT`, `APP_COMPANY_INFO`).
6. **Mobile = 44px targets, no horizontal scroll?** YES (Verified across 360px, 390px, 768px).
7. **Empty/loading/error states present?** YES (Notification dropdown has empty state; search input has clear action).

---

## 4. Screenshots Captured

- Before: `docs/ui/shots/before/public-layout-{360,390,768,1024,1440,1920}.png`
- Before RTL: `docs/ui/shots/before/public-layout-rtl-{390,1440}.png`
- After: `docs/ui/shots/after/public-layout-{360,390,768,1024,1440,1920}.png`
- After RTL: `docs/ui/shots/after/public-layout-rtl-{390,1440}.png`
- Client Active State: `docs/ui/shots/after/public-layout-client-active-1440.png`
- Client Pending State: `docs/ui/shots/after/public-layout-client-pending-1440.png`

**Final Public Layout Verdict:** **PASS** ✅

