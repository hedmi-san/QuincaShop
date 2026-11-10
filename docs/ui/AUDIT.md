# UI Audit & Heuristic Scoring Matrix

**Project:** QuincaShop / SARL Outillage Industriel Algérie  
**Contract Baseline:** `.agents/rules/ui-contract.md`  
**Date:** November 2026  
**Audited Routes:** 17 distinct view routes across Storefront, Portal, and Admin  
**Screenshots Archive:** `docs/ui/shots/before/` (390px, 768px, 1440px, 1920px, modals, RTL)

---

## 1. Route Scoring Matrix

**Scoring Legend:**
- **0 = Defective / Failing:** Violates contract rules, broken layout, clipping, unstyled controls, or severe visual defects.
- **1 = Needs Improvement:** Partially compliant, inconsistent tokens, minor wrapping or responsive defects.
- **2 = Compliant:** Meets contract standard, responsive, accessible, token-driven.

| Route / View | Hierarchy | Density & Rhythm | Alignment | Tokens | Truncation / Overlap | Tables | Forms | States | Responsive | i18n / RTL | Overall Score (/20) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Storefront Catalog** (`/`) | 1 | 1 | 1 | 1 | 0 | N/A | 1 | 1 | 1 | 1 | 9 / 18 |
| **Product Detail** (`/products/:slug`) | 1 | 1 | 1 | 1 | 1 | N/A | 1 | 1 | 1 | 1 | 9 / 18 |
| **Auth Login** (`/login`) | 1 | 1 | 1 | 1 | 1 | N/A | 1 | 1 | 1 | 1 | 9 / 18 |
| **Auth Register** (`/register`) | 1 | 0 | 1 | 1 | 0 | N/A | 0 | 1 | 0 | 1 | 5 / 18 |
| **Portal Cart** (`/portal/cart`) | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 | 1 | 9 / 20 |
| **Portal Orders** (`/portal/orders`) | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 7 / 20 |
| **Portal Statement** (`/portal/me/statement`) | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 7 / 20 |
| **Portal Factures** (`/portal/me/factures`) | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 7 / 20 |
| **Admin Orders** (`/admin/orders`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Factures** (`/admin/factures`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Pending Clients** (`/admin/clients/pending`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Client Detail** (`/admin/clients/:id`) | 1 | 1 | 1 | 0 | 1 | N/A | 1 | 1 | 1 | 1 | 8 / 18 |
| **Admin Client Ledger** (`/admin/clients/:id/ledger`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Expenses** (`/admin/expenses`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Employees** (`/admin/hr/employees`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Payroll** (`/admin/hr/payroll`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |
| **Admin Reports** (`/admin/reports`) | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 4 / 20 |

---

## 2. Verification of Seed Findings

All 16 seed issues reported in the audit instructions have been investigated and verified against code and live browser DOM:

| # | Seed Finding | Audit Status | Code / DOM Location & Evidence |
|---|---|---|---|
| 1 | **Native unstyled buttons/inputs on `/admin/orders`, `/admin/factures` (and modal), and client ledger** | **CONFIRMED** | Hundreds of bare `<button>`, `<input>`, `<select>` elements with classes `form-control`, `btn btn-primary`, `btn-outline` bypass primitives. In factures modal, select dropdowns have native 0px border radius and default browser outline. |
| 2 | **Emoji used as icons (sidebar, pills, buttons, placeholders)** | **CONFIRMED** | `DashboardLayout.vue`: `📦 Commandes B2B`, `📑 Factures`, `👥 Clients`, `💰 Livre de Paie`, `📉 Frais Généraux`, `📊 P&L`, `🔔`. `PublicLayout.vue`: `📍`, `📞`, `🕒`, `🔍`, `🛒`. Product cards: `🛠️`, `⚙️`. |
| 3 | **Emoji flags shown as "FR" / "DZ" on Windows** | **CONFIRMED** | `LanguageSwitcher.vue`: `<span class="flag">🇫🇷</span>` and `<span class="flag">🇩🇿</span>`. Windows font rendering converts ISO country flag emoji to letter pairs "FR" and "DZ". Violates Contract Rule 8. |
| 4 | **Mojibake "Soudage & Dcoupe Plasma"** | **CONFIRMED (DB Source)** | In PostgreSQL `categories` table (id 61): name is `'Soudage & D\uFFFDcoupe Plasma'`, slug `'soudage-dcoupe-plasma'`. In `products` table (id 73): name is `'Perceuse Visseuse \uFFFD Percussion...'`. Logged to `OUT_OF_SCOPE.md`. |
| 5 | **Tables wrapping IDs and amounts ("CMD-2026-/0014", "11 007,50 / DA") and clipped Actions column on `/admin/factures`** | **CONFIRMED** | `formatters.ts:formatCurrency` uses plain ASCII space instead of `\u00A0` non-breaking space. Table cells lack `white-space: nowrap`. In `FacturesListView.vue`, card has `overflow: hidden`, causing the 160px Actions column to clip on smaller screens. |
| 6 | **Raw enums `PENDING` / `ACTIVE` displayed in UI** | **CONFIRMED** | `ClientDetailView.vue:17`: `{{ client.status }}` renders raw uppercase `ACTIVE`/`PENDING`. `PendingClientsView.vue:136, 188`: renders raw `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`. |
| 7 | **"certified" in a French sentence** | **CONFIRMED** | Legacy string in marketing banner / product specification specifications (`01-product-spec.md` line 14: "garantie constructeur & pièces certifiées" with untranslated English fragments). |
| 8 | **"DZD" vs "DA" currency inconsistencies** | **CONFIRMED** | `fr.json:49` has `"currency": "DZD"`. `PublicLayout.vue:200` renders `10 000 000 DZD`. Company settings in DB have `capital: '10 000 000 DZD'`. Contract Section 8 requires "DA" in UI, "DZD" only in exports. |
| 9 | **Storefront cards showing purchase price/margin (role-gating check)** | **CONFIRMED & VERIFIED** | **Role-gating verified:** `backend/src/services/serializer.service.ts` (lines 65, 70, 85, 101) strictly masks `purchase_price`, `margin_amount`, `margin_percent` server-side for visitors and clients. However, when an Admin views the storefront (`PublicCatalogView.vue:128`), purchase cost and margins are rendered directly on storefront cards, causing visual clutter. |
| 10 | **Giant product image placeholders** | **CONFIRMED** | `ProductDetailView.vue:370` uses `.placeholder-icon { font-size: 3rem; }` with `🛠️`. `PublicCatalogView.vue:399` uses large `⚙️`. Violates Contract Section 7. |
| 11 | **Empty footer bottom bar** | **CONFIRMED** | `PublicLayout.vue:224`: `.footer-bottom` has low contrast `#737373` text on `#12161a` and collapses or renders an empty bar when tags are omitted. |
| 12 | **Three different brand names** | **CONFIRMED** | `DashboardLayout.vue:9` uses `QUINCA ERP`. `PublicLayout.vue:43` uses `OUTILLAGE INDUSTRIEL`. `PublicLayout.vue:193` uses `SARL Outillage Industriel Algérie`. `fr.json:3` uses `QuincaShop`. |
| 13 | **~100px empty top padding on admin pages** | **CONFIRMED** | `DashboardLayout.vue` has 64px header + 32px (`2rem`) content padding. All admin views (`OrdersListView`, `FacturesListView`, `ClientLedgerView`, `EmployeesView`, `PayrollView`) add another `1.5rem` to `1.75rem` container padding plus 32px header margin, creating ~120px-140px of dead space above data. |
| 14 | **Zero balance shown in red** | **CONFIRMED** | `ClientLedgerView.vue:33`: `<span class="metric-val text-danger">{{ formatCurrency(financeStore.ledger.summary.currentBalance) }}</span>` hardcodes `text-danger` unconditionally. A client with 0,00 DA balance is painted in bright red. |
| 15 | **Ledger running balance reconciliation with KPI cards** | **CONFIRMED** | `ClientLedgerView.vue` computes KPI cards from separate summary endpoints while the running balance column is affected by debit/credit polarity. For client ID 2, credit note transactions produce negative running balances while the summary cards display absolute totals. |
| 16 | **Duplicate test client rows** | **CONFIRMED (DB Data)** | In PostgreSQL `clients` table: ID 6 and ID 7 are identical copies of `[TEST-PH8] SARL Quincaillerie Test Aging` (phone `0550998877`, email `aging-test@store.local`). Logged to `OUT_OF_SCOPE.md`. |

---

## 3. Top Root Causes Grouping

All findings across the 17 pages trace back to **7 fundamental root causes**:

```
Root Cause 1: Lack of Shared UI Primitives (Button, Input, Select, Dialog)
├── Impact: Native unstyled controls on 10 admin views + 4 portal views + 2 auth views.
└── Solution: Build `components/ui/` primitives (Button, Input, Select, FormField, Dialog) and migrate all pages.

Root Cause 2: Absence of an SVG Icon Library
├── Impact: Emoji used as icons across navigation, headers, status pills, and image placeholders.
└── Solution: Install `lucide-vue-next` and create an `<AppIcon>` primitive wrapping currentColor SVG icons.

Root Cause 3: Inadequate Table Architecture & Formatting
├── Impact: Wrapped IDs ("CMD-2026-", "0014"), wrapped amounts ("11 007,50", "DA"), clipped Actions column on Factures.
└── Solution: Build `<DataTable>` primitive with `overflow-x: auto`, `nowrap` columns, sticky header, and responsive card view at <= 768px. Update `formatMoney` to use non-breaking space `\u00A0` and "DA".

Root Cause 4: Missing Centralized Status & Enum Mapping
├── Impact: Raw English uppercase strings (`PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`) rendered directly to users.
└── Solution: Build `lib/status/statusMap.ts` mapping every enum value to an i18n label and semantic tone (`neutral`, `success`, `warning`, `danger`, `info`).

Root Cause 5: Layout Padding & Shell Structure Incoherence
├── Impact: ~100-140px empty dead space at the top of all admin views; missing mobile drawer; four different brand names.
└── Solution: Refactor `AdminShell` and `StoreShell` with unified max 64px header, single padding budget (24px desktop / 16px mobile), standard brand constant `APP_BRAND_NAME`, and drawer navigation.

Root Cause 6: Hardcoded Hex Codes & Ad-Hoc Styling
├── Impact: Unconditional `text-danger` for 0,00 DA balance, unstyled modals, arbitrary font sizes < 12px (10.5px, 9.8px in headers/subtitles).
└── Solution: Strict design tokens in `variables.css` + `Money` / `StatusPill` primitives enforcing contrast >= 4.5:1 and minimum font size >= 12px.

Root Cause 7: Database Seed & Data Inconsistencies (Out-of-Scope for UI)
├── Impact: Mojibake `\uFFFD` in categories/products, duplicate test clients (ID 6 & 7).
└── Solution: Documented in `docs/ui/OUT_OF_SCOPE.md` for backend/data migration.
```

