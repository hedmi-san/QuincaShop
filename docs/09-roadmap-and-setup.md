# 09 — Setup Guide, Execution Roadmap & Developer Instructions

## 1. Repository Setup & Environment Configuration

### 1.1 Recommended Monorepo Layout
```text
store-erp-shop/
├── package.json               # Root npm scripts (dev, build, lint)
├── docker-compose.yml         # Postgres 15, Web, API, and Headless Chromium
├── docs/                      # Complete copied documentation pack (this folder)
│
├── backend/                   # Node.js 20 + Express + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── server.ts
│       ├── config/            # Environment and constants
│       ├── db/                # PostgreSQL pool, schema, migrations, and seed
│       ├── middleware/        # auth, rbac, activeClient, rateLimit, error
│       ├── routes/            # public, auth, portal, admin
│       ├── services/          # business logic, stock, ledger, facture, pdf
│       └── utils/             # numberToWords, formatters, validation schemas
│
└── frontend/                  # Vue 3 + TypeScript + Vite + Pinia
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.ts
        ├── App.vue
        ├── router/            # Vue Router 4 with navigation guards
        ├── layouts/           # PublicLayout, PortalLayout, DashboardLayout
        ├── stores/            # Pinia stores (auth, cart, shop, orders, admin)
        ├── services/          # Axios API adapters
        ├── components/        # common, documents, portal, admin
        ├── views/             # public, portal, admin, auth
        ├── i18n/              # fr.json, ar.json
        └── assets/styles/     # variables.css, main.css, print.css
```

---

### 1.2 Environment Variables

#### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000

# PostgreSQL Connection
DATABASE_URL=postgres://postgres:root@localhost:5432/single_store_db

# Security & Secrets
JWT_SECRET=super-secure-high-entropy-jwt-secret-key-replace-in-production
JWT_EXPIRES_IN=12h

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5

# Headless PDF Configuration
PUPPETEER_EXECUTABLE_PATH=

# Company Defaults
COMPANY_CURRENCY=DZD
DEFAULT_TVA=19.00
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=/api
VITE_STORE_NAME="SARL Outillage Industriel Algérie"
VITE_DEFAULT_LANGUAGE=fr
```

---

## 2. Phased Implementation Roadmap

```
[Phase 1: DB & Infra] ──► [Phase 2: Auth & Price Masking] ──► [Phase 3: Catalog & Images]
                                                                      │
┌─────────────────────────────────────────────────────────────────────┘
▼
[Phase 4: Client Onboarding] ──► [Phase 5: Cart & Orders] ──► [Phase 6: Ledger & Factures]
                                                                      │
┌─────────────────────────────────────────────────────────────────────┘
▼
[Phase 7: ERP (HR/Payroll/Expenses)] ──► [Phase 8: Reports (P&L)] ──► [Phase 9: i18n & Deploy]
```

### Phase 1: Database & Core Infrastructure
- **Objective:** Provision local PostgreSQL, run `schema.sql` migration, create DB client wrapper with type parsers for NUMERIC, and seed initial system settings, roles, and default admin user.
- **Definition of Done:** `npm run dev:backend` boots, connects to Postgres, and returns `{ success: true, message: "Healthy" }` on `/api/health`.

### Phase 2: Authentication, Security & Price Masking
- **Objective:** Implement JWT login, client self-registration with `status='PENDING'`, and the central `serializeProduct()` data transformer.
- **Definition of Done:** Unauthenticated requests to `/api/public/products` return catalog items with **zero prices or stock quantities**. Logging in as an active client returns sale prices. Logging in as admin returns purchase prices.

### Phase 3: Product Catalog & Category Engine
- **Objective:** Multi-category hierarchy, product creation, Sharp WebP image resizing with thumbnail generation, and public catalog storefront view with debounced trigram search.
- **Definition of Done:** Visitors can browse categories, filter by brand, search references, and view responsive high-resolution photo galleries.

### Phase 4: Client Onboarding & Admin Approval Queue
- **Objective:** Registration form with file upload for RC/NIF documents; back-office pending applications queue; 1-click Approve (assigning `CLT-XXXX` and credit limit) or Reject with reason.
- **Definition of Done:** Approved clients receive an approval notification/email and gain immediate access to wholesale prices.

### Phase 5: B2B Shopping Cart, Order State Machine & Stock Locking
- **Objective:** Persistent shopping cart, checkout validation (credit limit check), order status transitions (`PENDING` → `CONFIRMED` → `READY` → `DELIVERED`), and pessimistic row locking on stock.
- **Definition of Done:** Concurrent checkouts cannot oversell inventory. Clients can inspect real-time visual tracking steppers on `/portal/orders/:id`.

### Phase 6: Financial Sub-Ledger, Facturation & Fiscal Documents
- **Objective:** Double-column client ledger, customer payment (*Versement*) recording, Algerian Facture generation with Timbre Fiscal calculation, French legal amounts in words, and print stylesheet integration.
- **Definition of Done:** Invoices display all mandatory Algerian commercial mentions; thermal receipts and A4 factures print without web chrome; invoices cannot be deleted (only voided with audit log).

### Phase 7: Back-Office ERP (Expenses, HR & Payroll)
- **Objective:** Operating expenses journal (rent, electricity, fuel), employee registry, and monthly payroll calculation with holiday/Eid bonuses.
- **Definition of Done:** Accountants are locked out of HR and expenses; Admins can generate monthly payroll sheets.

### Phase 8: Financial Analytics & Business Intelligence
- **Objective:** Executive dashboard KPIs, asset valuation report (physical stock × purchase cost), Income Statement (Revenue − COGS − Overhead − Payroll = Net Profit), and aging receivables.
- **Definition of Done:** Real-time P&L matches ledger numbers; Excel export downloads `.xlsx` sheets.

### Phase 9: Polish, i18n (French / Arabic RTL) & Production Deployment
- **Objective:** Vue-i18n integration, RTL direction switching, Docker Compose containerization, and automated daily database backup scripts.
- **Definition of Done:** Entire shop and portal can be toggled to Arabic with mirrored RTL layout; app runs smoothly via `docker-compose up`.

---

## 3. Instructions for AI Coding Assistants Working on the New Repo

When pair-programming or delegating tasks in the new repository, follow these cardinal rules:

1. **Maintain Single-Store Simplicity:**
   - Under no circumstances reintroduce `warehouse_id`, inter-depot transfers, or split fulfillment logic. There is only one store and one central stock.
2. **Never Expose Prices to Unauthenticated Users:**
   - Always run product DTOs through `serializeProduct(product, req.user)`. Do not rely on frontend `v-if` alone to hide pricing.
3. **Pessimistic Locking is Mandatory:**
   - Any transaction that decrements or reserves stock must execute `SELECT ... FROM stock WHERE product_id = ANY(...) ORDER BY product_id FOR UPDATE`.
4. **Append-Only Financial Ledger:**
   - Never update or delete rows in `client_transactions` or `stock_movements`. Corrections must be posted as compensating `CREDIT_NOTE`, `PAYMENT`, or `ADJUSTMENT` entries.
5. **Preserve Native Print Styles:**
   - Do not replace the `@media print` stylesheets with third-party canvas or screenshot generators. Native browser printing is crisp, vectorized, and instant.

