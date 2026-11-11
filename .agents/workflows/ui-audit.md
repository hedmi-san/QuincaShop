---
description: Audit every route against the UI contract and produce a root-cause-based, prioritised backlog. Documentation only, no source changes.
---

# /ui-audit

Goal: know exactly what is wrong across the whole app, grouped by root cause, before changing anything. Follow `.agents/rules/ui-contract.md`.

1. **Detect the stack.** Read package.json, Tailwind/theme/global CSS, `components/`, i18n and icon libraries, routing (`app/` or `pages/`), auth. Write `docs/ui/STACK.md` (what exists, what can be reused, what is missing).
2. **List routes.** Enumerate every route (storefront, `/admin/**`, dynamic ones with real ids from the seed/DB) and the role needed. Start the dev server if it is not running. For login use the seeded admin account documented in the README/.env (never write credentials into files).
3. **Capture.** With the browser tool take full-page screenshots of each route at 390x844, 768x1024 and 1440x900 (plus 1920x1080 for catalogue, orders, invoices, clients). Also capture reachable states: empty, long text, modal open, validation errors, Arabic/RTL. Save to `docs/ui/shots/before/<route-slug>-<width>.png`.
4. **Mechanical checks.** In the browser console, on each route at desktop and 390px, run these and record the output:
   ```js
   // overflow / clipped content
   [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15)
   // text under 12px
   [...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<12).slice(0,15)
   // unstyled native controls (square, default border)
   [...document.querySelectorAll('button,select,input:not([type=checkbox]):not([type=radio])')].filter(e=>getComputedStyle(e).borderRadius==='0px').slice(0,15)
   // emoji used as icons, mojibake, raw enums
   [...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&(/\p{Extended_Pictographic}|�|Ã./u.test(n.textContent)||/^(PENDING|ACTIVE|SUSPENDED|REJECTED|VALIDATED|CANCELLED)$/.test(n.textContent.trim()))))
   // identifiers or amounts wrapped over several lines
   [...document.querySelectorAll('td,th,span,p')].filter(e=>/^(CMD|FAC|BL|CLT)-?[\w-]*$|^[\d\s.,]+\s?(DA|DZD)$/.test(e.textContent.trim())&&e.getBoundingClientRect().height>1.8*(parseFloat(getComputedStyle(e).lineHeight)||20))
   ```
5. **Score.** Rate each screenshot 0/1/2 on: hierarchy, density and rhythm, alignment, token consistency, truncation/overlap, tables, forms, states (empty/loading/error), responsiveness, i18n/RTL. Write the matrix in `docs/ui/AUDIT.md`.
6. **Group by root cause.** Each finding = cause -> shared fix -> pages affected (e.g. "native buttons on 9 pages -> Button primitive", "ids wrap in tables on 6 pages -> DataTable", "emoji icons everywhere -> Icon + Lucide", "raw enums -> statusMap").
7. **Backlog.** Write `docs/ui/BACKLOG.md` as a checklist: Phase A foundation (tokens, primitives, shells, formatters, statusMap, i18n gaps), then Phase B pages ordered by (business importance x severity), each with route, issues, primitives needed, size S/M/L.
8. **Out-of-scope findings.** Log in `docs/ui/OUT_OF_SCOPE.md` with evidence: encoding problems, data or number inconsistencies, role/permission exposure (e.g. purchase price or margin visible on the storefront: check it is filtered server-side, not just hidden), duplicate test data, naming inconsistencies.
9. **Stop.** Do not edit source. Present a one-page summary (top 10 root causes, page count, proposed order) and wait for approval.
