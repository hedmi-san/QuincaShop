# 08 — Code Reuse & Migration Guide (From Multi-Warehouse to Single-Store)

This guide provides a file-by-file mapping explaining how to migrate the existing codebase into the new single-store B2B shop repository.

---

## 1. Files Copied Verbatim (No Changes Needed)

These files have already been staged inside `docs/starter-assets/` and can be dropped directly into the new project:

| Existing File Path | New Target File Path | Purpose |
| :--- | :--- | :--- |
| `frontend/src/assets/styles/variables.css` | `frontend/src/assets/styles/variables.css` | Complete design tokens (colors, fonts, radii, shadows). |
| `frontend/src/assets/styles/main.css` | `frontend/src/assets/styles/main.css` | Global styling, typography, buttons, tables, and print rules. |
| `frontend/src/utils/numberToWords.ts` | `frontend/src/utils/numberToWords.ts` | French legal amount in words converter for Factures. |
| `frontend/src/utils/formatters.ts` | `frontend/src/utils/formatters.ts` | Currency (`formatDZD`), date, and number formatting. |
| `backend/src/common/response.ts` | `backend/src/common/response.ts` | Standardized API response helpers (`sendSuccess`, `sendError`). |
| `frontend/src/services/api.ts` | `frontend/src/services/api.ts` | Base Axios client with JWT interceptor and error handlers. |
| `frontend/src/assets/images/logo.png` | `frontend/src/assets/images/logo.png` | Brand logo asset. |
| `frontend/src/components/common/*` | `frontend/src/components/common/*` | `AppButton`, `AppInput`, `AppTable`, `AppModal`, `AppBadge`, `AppPagination`, `AppSkeleton`, `ConfirmDialog`. |

---

## 2. Files to Adapt & Refactor

### 2.1 Backend Modules

| Existing File | New Destination | Necessary Adaptations |
| :--- | :--- | :--- |
| `backend/src/middleware/auth.ts` | `backend/src/middleware/auth.middleware.ts` | Remove `warehouseId` from JWT payload. Add `clientId` and `clientStatus`. Add `requireActiveClient` middleware. |
| `backend/src/routes/product.routes.ts` | `backend/src/routes/product.routes.ts` | Add `serializeProduct()` to strip prices for visitors/pending clients. Add category filtering and image associations. Strip `warehouse_id` from stock joins. |
| `backend/src/routes/inventory.routes.ts` | `backend/src/routes/inventory.routes.ts` | Remove multi-warehouse scoping from `stock` and `stock_movements`. Keep atomic adjustments with mandatory reasons. |
| `backend/src/routes/client.routes.ts` | `backend/src/routes/client.routes.ts` | Add approval routes (`/approve`, `/reject`, `/suspend`). Add self-service profile endpoint for authenticated clients. |
| `backend/src/routes/client-payment.routes.ts`| `backend/src/routes/client-payment.routes.ts` | Remove `warehouse_id`. Retain payment recording, allocation to orders, and double-column ledger updates. |
| `backend/src/routes/sale.routes.ts` | `backend/src/routes/order.routes.ts` | Rename sales to orders. Replace POS cash drawer logic with online cart checkout + milestone state machine (`PENDING` → `CONFIRMED` → `READY` → `DELIVERED`). |
| `backend/src/routes/facture.routes.ts` | `backend/src/routes/facture.routes.ts` | Remove `warehouse_id`. Retain Timbre Fiscal formula, French number to words, legal header snapshots, and voiding rules. |
| `backend/src/routes/expense.routes.ts` | `backend/src/routes/expense.routes.ts` | Remove `warehouse_id`. Restrict route access to `ADMIN` only. |
| `backend/src/routes/employee.routes.ts` & `salary.routes.ts` | `backend/src/routes/hr.routes.ts` | Combine employee registry and monthly payroll. Restrict to `ADMIN` only. |
| `backend/src/routes/report.routes.ts` | `backend/src/routes/report.routes.ts` | Remove cross-warehouse comparisons. Retain P&L Income Statement, Stock Valuation, and Aging Receivables. Restrict to `ADMIN`. |

---

### 2.2 Frontend Views & Components

| Existing View | New Destination | Necessary Adaptations |
| :--- | :--- | :--- |
| `frontend/src/views/sales/SalesListView.vue` | `frontend/src/views/admin/OrdersListView.vue` | Adapt from point-of-sale journal to an order management board with status filtering and milestone actions. |
| `frontend/src/components/sales/FactureDocument.vue`| `frontend/src/components/documents/FactureDocument.vue` | Remove multi-warehouse depot details. Use single store legal coordinates from `settings`. Keep print styling. |
| `frontend/src/views/clients/ClientProfileView.vue` | `frontend/src/views/admin/ClientDetailView.vue` | Add client status controls (Approve/Reject buttons, credit limit editor, document scans viewer). Retain ledger tab. |
| `frontend/src/views/products/ProductListView.vue` | `frontend/src/views/admin/ProductManagementView.vue`| Add category selector, multi-image upload drawer, and online store publish toggle (`published`). Mask purchase cost for Accountants. |

---

## 3. Files to Drop Completely (Delete / Do Not Copy)

The following modules from the multi-warehouse prototype are redundant and should **not** be brought into the new project:

1. **Warehouse Administration:**
   - `backend/src/routes/warehouse.routes.ts`
   - `frontend/src/stores/warehouse.store.ts`
   - `frontend/src/views/admin/WarehousesView.vue`
   - All `warehouse.middleware.ts` files
2. **Inter-Warehouse Logistics & Transfers:**
   - `backend/src/routes/transfer.routes.ts`
   - `frontend/src/views/transfers/TransferListView.vue`
   - `frontend/src/components/transfers/StockRelocationModal.vue`
   - `frontend/src/components/transfers/TransportSlipDocument.vue`
   - `frontend/src/components/transfers/TransportSlipModal.vue`
3. **Split Fulfillment & Remote Pickup Vouchers:**
   - `frontend/src/components/sales/InterWarehouseSplitModal.vue`
   - `frontend/src/components/sales/PickupSlipDocument.vue`
   - `backend/src/common/reservation.ts` (inter-depot reservation logic)
4. **Obsolete Roles:**
   - Any logic, route guards, or enum values referencing `SUPER_MANAGER` or `MANAGER`.

---

## 4. Brand New Modules to Build

| New Module | File Path(s) | Description |
| :--- | :--- | :--- |
| **Public Storefront** | `frontend/src/views/public/PublicCatalogView.vue`<br>`frontend/src/views/public/ProductDetailView.vue` | Clean public catalog with high-res photos, specs, and search. Displays no prices to unauthenticated visitors. |
| **Client Registration** | `frontend/src/views/auth/RegisterView.vue` | B2B registration form with company registry inputs and optional file uploads for RC/NIF documents. |
| **Pending Notice** | `frontend/src/views/portal/PendingApprovalNoticeView.vue` | Waiting page for clients awaiting admin review. |
| **B2B Ordering Portal** | `frontend/src/views/portal/ShopCatalogView.vue`<br>`frontend/src/views/portal/CartView.vue` | Wholesale catalog with active prices, persistent shopping cart, and fulfillment options. |
| **Order Tracking** | `frontend/src/views/portal/OrderTrackingView.vue` | Amazon-style visual milestone tracking stepper for clients. |
| **Client Approval** | `frontend/src/views/admin/PendingClientsView.vue` | Back-office approval queue to review registered businesses, inspect tax papers, and assign credit limits. |
| **Category System** | `backend/src/routes/category.routes.ts`<br>`frontend/src/views/admin/CategoryListView.vue` | Category hierarchy management. |
| **Image Uploader** | `backend/src/services/image.service.ts` | Multer + Sharp multi-size WebP image resizing engine. |

