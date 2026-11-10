## Why

The application currently has online B2B order tracking, fiscal invoicing, and client approval, but lacks the core commercial and operations management interfaces:
1. The **Product Catalog** administrative interface is missing, leaving staff unable to add new industrial tools, modify specifications, adjust pricing, or upload imagery.
2. The **Stock & Inventory** management interface is missing, leaving warehouse and store personnel unable to inspect physical vs. reserved quantities, execute stock receipts or physical inventory adjustments, or trace movement history.
3. The **In-Shop Counter Sales (Vente au Comptoir / POS)** interface is missing, leaving physical counter staff unable to serve walk-in customers who purchase tools directly in the store, immediately deduct inventory, record payments, and print receipts or invoices.

Now that the UI primitives and baseline schema are ready, implementing these three interconnected modules will fulfill the full single-store omni-channel vision: managing catalog, unified stock, and serving both online B2B clients and physical walk-in store visitors seamlessly.

## What Changes

- **Product Catalog Management (`/admin/products`)**:
  - Administrative catalog data table with search, category filtering, stock health badges, and pricing views.
  - Creation modal for new products supporting reference, naming, category, multi-tier pricing (purchase, sale, facture), initial stock, box packaging, and VAT.
  - Edition modal for updating technical specifications, prices, description, and storefront visibility.
  - Product image gallery manager with thumbnail processing, upload, primary image selection, and deletion.
- **Stock & Inventory Engine (`/admin/stock`)**:
  - Real-time stock status table detailing Physical Quantity, Reserved Quantity (held by online orders), and Available Quantity (`Physical - Reserved`).
  - Inventory health metrics: Total SKUs, Total Units, Total Inventory Valuation (restricted to ADMIN), Low Stock count, and Out of Stock count.
  - Manual Stock Adjustment workflow with mandatory business reason (e.g., supplier receipt, inventory recount, damaged goods, customer return) generating immutable audit records in `stock_movements`.
  - Comprehensive Stock Movements audit log view filtering by product, movement type, and date.
- **In-Shop Sales & Point of Sale (`/admin/pos`)**:
  - Fast, ergonomic counter checkout interface designed for store cashiers.
  - Dual customer mode: Default anonymous walk-in (`CLT-COMPTOIR`) or registered B2B client lookup (with live balance & credit limit checks).
  - Quick-search catalog picker with available stock guard rails preventing overselling.
  - Real-time cart calculations (HT, 19% VAT, Algerian cash Timbre Fiscal, and TTC).
  - Multi-payment support: Cash (with tendered amount and change calculation), Check, Bank Transfer, or Account Credit (for approved B2B accounts).
  - Atomic checkout executing order creation (`DELIVERED`/`PICKUP`), immediate physical stock decrement (`SALE` movement), ledger/payment registration, and instant printable counter receipt/bon de caisse.
- **Unified Navigation & Routing**:
  - Added "Catalogue Produits", "Gestion des Stocks", and "Vente au Comptoir (POS)" into the `AdminShell` sidebar and Vue Router.
  - Proxied `/uploads` in Vite dev server to display uploaded product imagery correctly in local development.

## Capabilities

### New Capabilities
- `products-catalog`: Administrative interface to browse, filter, create, edit products, manage specifications, prices, and upload gallery images.
- `stock-inventory`: Comprehensive stock management, physical vs reserved breakdown, low-stock threshold alerting, manual stock adjustment with mandatory audit reasons, and movement history tracking.
- `in-shop-sales-pos`: Point of Sale (POS) and counter sales module for immediate in-store customer checkouts, stock deductions, tender reconciliation, and receipt generation.

### Modified Capabilities
<!-- None -->

## Impact
- **Backend**:
  - New route module `backend/src/routes/admin-stock.routes.ts` providing stock overview, adjustment endpoint, and movements audit log.
  - New route module `backend/src/routes/admin-pos.routes.ts` for atomic in-shop counter checkouts.
  - Registered new routes in `backend/src/routes/index.ts`.
- **Frontend**:
  - New views: `frontend/src/views/admin/ProductsCatalogView.vue`, `frontend/src/views/admin/StockInventoryView.vue`, and `frontend/src/views/admin/PosCounterSaleView.vue`.
  - Updated `AdminShell.vue` navigation items and `router/index.ts` routes.
  - Updated `vite.config.ts` to proxy `/uploads` to port 5000.
- **Database**:
  - Uses existing PostgreSQL baseline tables (`products`, `product_images`, `stock`, `stock_movements`, `orders`, `order_items`, `clients`, `client_payments`, `client_transactions`, `factures`). No schema migration needed.
