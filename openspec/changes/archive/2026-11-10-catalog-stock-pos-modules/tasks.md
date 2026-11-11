## 1. Backend Routes & Services

- [x] 1.1 Create `backend/src/routes/admin-stock.routes.ts` with inventory overview, manual adjustment, and movement history
- [x] 1.2 Create `backend/src/routes/admin-pos.routes.ts` for atomic counter checkout and direct stock decrement
- [x] 1.3 Register stock and POS routes in `backend/src/routes/index.ts`
- [x] 1.4 Update `frontend/vite.config.ts` to proxy `/uploads` to backend server

## 2. Admin Product Catalog Frontend

- [x] 2.1 Create `frontend/src/views/admin/ProductsCatalogView.vue` with search, category filtering, stock indicators, and pricing
- [x] 2.2 Implement Add Product modal with validation, multi-price inputs, and initial stock setup
- [x] 2.3 Implement Edit Product modal with technical specifications and image gallery management

## 3. Stock & Inventory Management Frontend

- [x] 3.1 Create `frontend/src/views/admin/StockInventoryView.vue` with summary KPI metrics and real-time stock table
- [x] 3.2 Implement Stock Adjustment modal with mandatory business reason and quantity validation
- [x] 3.3 Implement Stock Movement history tab with filtering by movement type and product

## 4. In-Shop Counter Sales / POS Frontend

- [x] 4.1 Create `frontend/src/views/admin/PosCounterSaleView.vue` with live search, category pills, and real-time stock badges
- [x] 4.2 Support customer selection (default `CLT-COMPTOIR` walk-in vs. registered B2B client with credit limit check)
- [x] 4.3 Implement payment checkout handling (Cash with change calculation, Check, Transfer, Account Credit)
- [x] 4.4 Implement printable counter receipt / Bon de Vente Comptoir modal

## 5. Navigation, Routing & Verification

- [x] 5.1 Register `/admin/products`, `/admin/stock`, and `/admin/pos` in `frontend/src/router/index.ts`
- [x] 5.2 Add navigation links for "Catalogue Produits", "Gestion des Stocks", and "Vente au Comptoir (POS)" in `AdminShell.vue`
- [x] 5.3 Verify end-to-end integration: catalog CRUD, stock adjustment, online vs in-shop stock synchronisation
