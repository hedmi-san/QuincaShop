---
description: Quality gate. Static scans + browser checks at 6 widths + RTL + self-review. Usage /ui-verify /admin/orders (or /ui-verify all).
---

# /ui-verify

Never report a page as done without a PASS here. Write the result to `docs/ui/verify/<slug>.md` as a table: check -> PASS/FAIL -> evidence.

1. **Build gates.** Lint, typecheck and production build pass; no new console errors or warnings; no failed network requests on the page.
2. **Static scans** (zero hits in the files you touched; inspect false positives; adapt paths to the project):
   ```bash
   rg -nP "#[0-9a-fA-F]{3,8}\b" src --glob '!**/*token*' --glob '!**/*.svg'
   rg -n "style=\{\{|!important" src
   rg -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src
   rg -n "<button|<select|<input" src/app src/pages --glob '!**/ui/**'
   rg -nw "PENDING|ACTIVE|SUSPENDED|REJECTED|DZD" src --glob '!**/lib/status*' --glob '!**/*.test.*'
   rg -n "�|Ã©|Ã¨" src
   ```
3. **Browser matrix.** Widths 360, 390, 768, 1024, 1440, 1920. At each: screenshot, then run the overflow, small-text, native-control, emoji/mojibake/raw-enum and wrapped-identifier scripts from `/ui-audit` (all must return empty), plus:
   ```js
   // tap targets at <=768px (must be empty)
   [...document.querySelectorAll('button,a,input,select,[role=button]')].filter(e=>{const r=e.getBoundingClientRect();return innerWidth<=768&&r.width&&(r.height<44||r.width<44)}).slice(0,15)
   // page-level horizontal scroll (must be false)
   document.documentElement.scrollWidth>innerWidth
   ```
4. **RTL.** Switch to Arabic (`dir=rtl`), screenshot at 1440 and 390: layout mirrors, no overflow, phones stay LTR, no clipped text.
5. **States.** Screenshot empty, loading, error and long-content versions where reachable.
6. **Self-review (yes/no, with evidence from the screenshots).**
   1. One clear primary action per section?
   2. Title area <= 96px and first content visible at 1440x900?
   3. Tables full width, nothing clipped or wrapped mid-token, numbers right-aligned?
   4. One primary action per row + menu?
   5. All controls from primitives, same heights and radii?
   6. No raw enums, emoji icons, mojibake, mixed languages?
   7. Money/dates from `lib/format`, "DA" only?
   8. Destructive actions confirmed, not red-filled?
   9. Mobile = cards/sheets, 44px targets, no horizontal scroll?
   10. Empty/loading/error states present?
   11. Copy sentence case, verb-led, consistent?
   12. No templated tells (all-caps labels, arrows on buttons, identical shadow cards)?
7. **Result.** Any FAIL = not done. When the cause is shared, fix it in the primitive/token, then rerun.
