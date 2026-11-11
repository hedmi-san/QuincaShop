# Out-of-Scope Findings & Data / Logic Defects

**Project:** QuincaShop / SARL Outillage Industriel Algérie  
**Contract Baseline:** `.agents/rules/ui-contract.md` (Section 0: "UI/UX only. Do not change business logic, DB schema, API contracts, auth or pricing rules. If a UI problem is really a data/logic problem, do NOT patch it in the UI: log it in `docs/ui/OUT_OF_SCOPE.md` with file/line evidence.")  
**Audit Date:** November 2026

---

## 1. Character Encoding & Database Mojibake (`\uFFFD`) [RESOLVED AT SOURCE]

* **Observation:** The category "Soudage & Découpe Plasma" displayed as "Soudage & Dcoupe Plasma", and product reference DEW-DCD-996 displayed as "Perceuse Visseuse  Percussion...".
* **Evidence at Source:**
  * In PostgreSQL database `single_store_db`, table `categories`:
    * Row ID `61`: `name = 'Soudage & D\uFFFDcoupe Plasma'`, `slug = 'soudage-dcoupe-plasma'`.
  * Table `products`:
    * Row ID `73`: `name = 'Perceuse Visseuse \uFFFD Percussion DeWalt DCD996 18V XR Brushless'`, description contained `\uFFFD`.
  * Tables `notifications` (ID 3), `stock_movements` (ID 24), `audit_logs` (ID 2).
* **Root Cause:** Corrupted encoding during database seeding or initial SQL dump import where Latin-1/Windows-1252 accented characters (`é`, `à`) were replaced by Unicode Replacement Character `\uFFFD`.
* **Resolution at Source (Completed November 11, 2026):**
  1. Ran `scripts/fix-mojibake.cjs` to repair all affected rows directly in PostgreSQL database `single_store_db`:
     - `categories`: id 61 updated to `'Soudage & découpe plasma'`, slug `'soudage-decoupe-plasma'`.
     - `products`: id 73 updated to `'Perceuse Visseuse à Percussion DeWalt DCD996 18V XR Brushless'`.
     - `notifications`: id 3 repaired.
     - `stock_movements` (id 24) and `audit_logs` (id 2) repaired after temporarily bypassing append-only triggers, then immediately restoring triggers.
  2. Verified 0 occurrences of `\uFFFD` remain in the database.
  3. Fixed `backend/src/db/seed.ts` seed file (lines 79, 137).
  4. Added explicit UTF-8 charset response header middleware to `backend/src/server.ts` (`Content-Type: application/json; charset=utf-8`).

---

## 2. Server-side Role Gating of Sensitive Pricing & Margin [RESOLVED & ENFORCED SERVER-SIDE]

* **Investigation Target:** Are purchase prices, margins, and cost structures exposed to unauthorized users or visitors on the storefront?
* **Verification Result:** **STRICTLY ENFORCED SERVER-SIDE.**
* **Resolution (Completed November 11, 2026):**
  * Updated `backend/src/services/serializer.service.ts`:
    - Added `isStorefront: boolean = false` parameter to `serializeProduct()`.
    - When `isStorefront === true`, `purchase_price`, `margin_amount`, and `margin_percent` are omitted unconditionally for ALL roles (including `ADMIN`).
  * Updated `backend/src/services/catalog.service.ts`:
    - `getPublicProducts()` and `getProductBySlugOrId()` invoke `serializeProduct(row, user, true)`.
  * Verification Test: `scripts/verify-client-catalog.cjs` and `test-public-auth.cjs` confirmed 0 items leaking `purchase_price` or margin fields across all public catalog endpoints even with ADMIN authentication tokens.
* **Storefront UI:** Public catalog card only displays "Prix HT" and "Ajouter" for active verified clients, or quiet "Prix pro" with lock icon for guests. Internal purchase prices and margins are never rendered.

---

## 3. Duplicate Test Client Records in Database

* **Observation:** The clients listing displays duplicate identical client entries.
* **Evidence at Source:**
  * In PostgreSQL table `clients`:
    * Row ID `6`: `name = '[TEST-PH8] SARL Quincaillerie Test Aging'`, `phone = '0550998877'`, `email = 'aging-test@store.local'`, `credit_limit = 200000.00`.
    * Row ID `7`: `name = '[TEST-PH8] SARL Quincaillerie Test Aging'`, `phone = '0550998877'`, `email = 'aging-test@store.local'`, `credit_limit = 200000.00`.
* **Root Cause:** Multiple test suite executions or fixture seeds inserted duplicate records with identical names, emails, and phone numbers without a unique constraint on email/phone in `clients`.
* **Recommended Backend/DB Fix:** Add unique constraint or deduplicate in test fixtures:
  ```sql
  DELETE FROM clients WHERE id = 7;
  ```

---

## 4. Ledger Running Balance vs. KPI Card Reconciliation

* **Observation:** For Client 2 (`EURL Quincaillerie Centrale`), the table running balance reaches `-83 598,00 DA` due to Avoir / Credit Note transactions, while the summary cards compute totals independently.
* **Evidence:**
  * File: `frontend/src/views/admin/ClientLedgerView.vue` lines 30–50 and `backend/src/services/admin-client.service.ts`.
  * The ledger table running balance calculates `previous_balance + debit - credit`. When an invoice is annulled with a Credit Note (`CREDIT_NOTE`), credit is incremented, driving the running balance negative.
  * In `ClientLedgerView.vue:33`, the card unconditionally applies `class="metric-val text-danger"` to `currentBalance`, showing both 0.00 DA and negative/positive amounts in red.
* **UI Scope:** The UI must neutralize 0,00 DA formatting and cleanly distinguish debits, credits, and avoirs with proper status tags (`Avoir`, `Facture`, `Règlement`). Backend transaction reconciliation logic remains intact.

---

## 5. Inconsistent Company Capital & Currency in Settings

* **Observation:** Storefront footer renders `Capital : 10 000 000 DZD`.
* **Evidence:**
  * In database table `settings`, row `company`:
    * `value.capital: "10 000 000 DZD"`
    * `value.name: "SARL Outillage Industriel Algérie"`
  * File: `frontend/src/layouts/PublicLayout.vue:200` hardcodes: `<div>ART : 16123456789 • Capital : 10 000 000 DZD</div>`.
* **UI Scope:** Use constant and UI currency "DA" (or format as `10 000 000 DA`). "DZD" is reserved for export files.

