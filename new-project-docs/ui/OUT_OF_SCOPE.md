# Out-of-Scope Findings & Data / Logic Defects

**Project:** QuincaShop / SARL Outillage Industriel Algérie  
**Contract Baseline:** `.agents/rules/ui-contract.md` (Section 0: "UI/UX only. Do not change business logic, DB schema, API contracts, auth or pricing rules. If a UI problem is really a data/logic problem, do NOT patch it in the UI: log it in `docs/ui/OUT_OF_SCOPE.md` with file/line evidence.")  
**Audit Date:** November 2026

---

## 1. Character Encoding & Database Mojibake (`\uFFFD`)

* **Observation:** The category "Soudage & Découpe Plasma" displays as "Soudage & Dcoupe Plasma", and product reference DEW-DCD-996 displays as "Perceuse Visseuse  Percussion...".
* **Evidence at Source:**
  * In PostgreSQL database `single_store_db`, table `categories`:
    * Row ID `61`: `name = 'Soudage & D\uFFFDcoupe Plasma'`, `slug = 'soudage-dcoupe-plasma'`.
  * Table `products`:
    * Row ID `73`: `name = 'Perceuse Visseuse \uFFFD Percussion DeWalt DCD996 18V XR Brushless'`.
* **Root Cause:** Corrupted encoding during database seeding or initial SQL dump import where Latin-1/Windows-1252 accented characters (`é`, `à`) were replaced by Unicode Replacement Character `\uFFFD`.
* **Contract Rule:** Section 0 & 8: *Do NOT patch with `.replace('', 'é')` in Vue templates or frontend helpers.*
* **Recommended Backend/DB Fix:** Execute a database data fix:
  ```sql
  UPDATE categories SET name = 'Soudage & Découpe Plasma' WHERE id = 61;
  UPDATE products SET name = 'Perceuse Visseuse à Percussion DeWalt DCD996 18V XR Brushless' WHERE id = 73;
  ```

---

## 2. Server-side Role Gating of Sensitive Pricing & Margin (Verification)

* **Investigation Target:** Are purchase prices, margins, and cost structures exposed to unauthorized users or visitors on the storefront?
* **Verification Result:** **STRICTLY ROLE-GATED SERVER-SIDE.**
* **Evidence:**
  * File: `backend/src/services/serializer.service.ts`
    * Lines 64–67:
      ```ts
      if (!user || (user.role === 'CLIENT' && user.clientStatus !== 'ACTIVE')) {
        return base; // Contains only id, name, slug, brand, images, availability. No prices or costs.
      }
      ```
    * Lines 70–82:
      ```ts
      if (user.role === 'CLIENT' && user.clientStatus === 'ACTIVE') {
        return { ...base, sale_price, tva, price_ttc, min_order_qty };
        // NEVER returns purchase_price, margin_amount, or exact stock numbers
      }
      ```
    * Lines 85–98:
      ```ts
      if (user.role === 'ACCOUNTANT') {
        // Exposes sale_price, facture_price, stock, but NEVER purchase_price
      }
      ```
    * Lines 101–124:
      ```ts
      if (user.role === 'ADMIN') {
        // Only ADMIN receives purchase_price, margin_amount, margin_percent
      }
      ```
* **UI Consideration:** While secure server-side, rendering purchase price and margin percentages on public storefront cards when an admin is logged in (`PublicCatalogView.vue:128` and `ProductDetailView.vue:149`) creates visual clutter and risks accidental shoulder-surfing exposure in store environments. The admin cost view should be toggled off by default on public storefront views.

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

