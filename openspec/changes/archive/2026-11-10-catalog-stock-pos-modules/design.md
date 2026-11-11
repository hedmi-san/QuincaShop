## Context

QuincaShop (SARL Outillage Industriel Algérie) is a hybrid single-store ERP and B2B online catalog. While order processing and fiscal invoicing are in place, the application previously lacked administrative interfaces for managing the catalog, monitoring/adjusting inventory, and processing in-person counter sales.

The system shares one physical stock location:
- Online B2B orders hold reservations on stock (`reserved_quantity`), which are decremented from physical stock upon delivery/pickup.
- In-shop walk-in sales immediately deduct physical stock upon checkout and log an immutable `SALE` stock movement.
- Store staff need to execute manual stock adjustments (recounts, damaged goods, supplier receipts) with mandatory audit notes.

## Goals / Non-Goals

**Goals:**
- Provide a full administrative Product Catalog UI for creating, editing, categorizing, pricing, and managing images of products.
- Provide a Stock & Inventory dashboard showing physical, reserved, and available quantities, stock valuation (admin-only), threshold alerts, adjustment tools, and audit movement logs.
- Provide a streamlined In-Shop Point of Sale (POS) / Vente au Comptoir UI capable of handling anonymous walk-ins (`CLT-COMPTOIR`) or registered B2B clients, calculating taxes and cash timbre fiscal, deducting physical stock immediately, recording payment, and printing receipts/invoices.
- Adhere strictly to the design system rules in `ui-contract.md` (shared primitives, tokens, French copy, currency formatting `DA`, no raw inputs/selects).

**Non-Goals:**
- Multi-warehouse routing (the business operates from a single central store/warehouse).
- Hardware ESC/POS receipt printer driver integration (standard browser print stylesheets for 80mm and A4/A5 are sufficient).
- Online payment gateway integration (Algerian SATIM/CIB cards are slated for a future phase; cash, check, transfer, and account credit are supported).

## Decisions

### 1. Unified Stock Formula
- `available_quantity = physical_quantity - reserved_quantity`
- Both online orders and counter sales check that `available_quantity >= requested_quantity`.
- Online orders increment `reserved_quantity` when status becomes `CONFIRMED`, and decrement both `physical_quantity` and `reserved_quantity` on `DELIVERED`.
- In-shop counter sales are completed immediately: `physical_quantity` is decremented directly, and a `SALE` record is inserted into `stock_movements`.

### 2. POS Customer Selection & Credit Rules
- Default client is `CLT-COMPTOIR` (walk-in retail). Walk-in customers cannot purchase on credit (`ON_CREDIT` is rejected).
- Cashier can switch client to an approved registered B2B client (`CLT-0001`, etc.).
- When `ON_CREDIT` is selected for a registered client, the system verifies `client.current_balance + totalTtc <= client.credit_limit`.
- Cash payments include the statutory Algerian Timbre Fiscal (1%, minimum 5 DA, maximum 10 000 DA) when an invoice is issued.

### 3. POS Atomic Transaction Architecture
- `POST /admin/pos/checkout` runs in a single database transaction (`withTransaction`):
  1. Product rows and stock rows are locked `FOR UPDATE` sorted by `product_id` to prevent deadlocks.
  2. Stock availability checked.
  3. Order created with `channel = 'STAFF'`, `fulfillment_type = 'PICKUP'`, and `status = 'DELIVERED'`.
  4. Physical stock decremented with `stock_movements` record (`SALE`).
  5. Payment created in `client_payments` (for CASH/CHECK/TRANSFER) with `payment_allocations` linked to the order.
  6. Client ledger updated if registered client.
  7. Facture optionally created immediately with frozen company and client snapshots.

### 4. UI Design System Adherence
- Build all screens using shared primitives in `src/components/ui/` (`DataTable`, `PageHeader`, `FilterBar`, `StatusPill`, `Badge`, `Card`, `Modal`, `Button`, `FormField`, `Input`, `Select`, `Money`).
- Currency rendered via `<Money :amount="..." />` (non-breaking spaces, "DA").
- Responsive design: tables turn into cards on mobile (<= 768px), touch targets >= 44px.

## Risks / Trade-offs

- **Risk**: Concurrent stock depletion between an online order confirmation and an in-store counter sale.
  - **Mitigation**: Strict `SELECT ... FOR UPDATE` row locking sorted by product ID during both online order status updates and POS checkout.
- **Risk**: Walk-in cashier error causing negative stock.
  - **Mitigation**: Database constraint `CHECK (physical_quantity >= 0)` combined with application-level available stock validation before decrement.
- **Risk**: Missing product images in local development.
  - **Mitigation**: Add proxy rule in `vite.config.ts` for `/uploads` targeting `http://localhost:5000`.
