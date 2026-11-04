# Single-Store Mini ERP & B2B Online Shop
## Product Specification & Starting Blueprint

> **Version:** 0.1.0 (Starting point, derived from the *Multi-Warehouse Tool Distribution Management System* spec v2.0.0)
> **Market:** Algeria (DZD, TVA 19%, Timbre Fiscal, RC/NIF/NIS/ART)
> **Proposed stack:** Node.js 20 / Express / TypeScript / PostgreSQL + Vue 3 / Pinia / Vite (same as the previous project, so code and patterns can be reused)
> **Design language:** Architectural monochrome (`#171717`, `#f3f3f3`, `#ffffff`), print-optimized documents

---

## 1. Executive Summary

### 1.1 What changes vs. the previous project

| Topic | Multi-Warehouse project | **This project** |
| :--- | :--- | :--- |
| Locations | N warehouses, hub-and-spoke | **One store, one stock** |
| Tenant scoping (`warehouse_id`) | Everywhere | **Removed** (huge simplification) |
| Inter-warehouse transfers, split fulfillment, pickup vouchers, reservations across depots | Yes | **Removed** (reservations are reused for online orders) |
| Roles | ADMIN, SUPER_MANAGER, MANAGER, ACCOUNTANT | **ADMIN, ACCOUNTANT, CLIENT** |
| Clients | Records created by staff | **Self-registered accounts**, approved by admin |
| Sales channel | POS counter | **Online shop** (cart → order → tracking) + optional counter/manual order entry by staff |
| Public access | None | **Public catalog without prices** |
| Kept | Stock engine, immutable client ledger, Factures + Timbre, expenses, HR & payroll, P&L, audit trail, notifications | Same, simplified |

### 1.2 Value proposition
> One system for a single store: a public product showcase, a private B2B ordering portal for approved clients, and a back office (stock, client balances, invoices, expenses, HR, payroll, reports).

### 1.3 Visitor & user model

| Actor | Authenticated | Sees prices | Can order | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Visitor** | No | ❌ | ❌ | Browses products, images, details only. Can register. |
| **Client (PENDING)** | Yes | ❌ | ❌ | Registered, waiting for admin approval. Sees a "pending approval" banner. |
| **Client (ACTIVE)** | Yes | ✅ | ✅ | Full shop access, cart, orders, tracking, own balance/statement/invoices. |
| **Client (REJECTED / SUSPENDED)** | Yes (limited) | ❌ | ❌ | Message shown; admin can reactivate. |
| **ACCOUNTANT** | Yes | ✅ (never purchase prices/margins) | Creates/handles orders | Day-to-day operations. |
| **ADMIN** | Yes | ✅ everything | ✅ | Owner: all modules, approvals, users, config. |

### 1.4 Role permission matrix

| Module | Visitor | Client (active) | ACCOUNTANT | ADMIN |
| :--- | :---: | :---: | :---: | :---: |
| Public catalog (no prices) | R | R | R | R |
| Prices (sale) | – | R | R | RW |
| Purchase price / margins | – | – | ❌ | RW |
| Product management (create/edit/images) | – | – | RW (no purchase price) | RW |
| Stock view | – | availability flag only | R | R |
| Stock adjustment (reason mandatory) | – | – | RW | RW |
| Client account approval | – | – | ❌ (configurable) | RW |
| Cart & place order | – | RW (own) | on behalf of client | on behalf of client |
| Order processing / status updates | – | R (own) | RW | RW |
| Client ledger / payments | – | R (own) | RW | RW |
| Factures | – | R/download (own) | RW | RW |
| Expenses | – | – | R (configurable RW) | RW |
| HR & payroll | – | – | ❌ | RW |
| Reports / P&L / stock valuation | – | – | ❌ | RW |
| Users & roles, settings | – | – | ❌ | RW |
| Audit logs | – | – | ❌ | R |

> **Decision to confirm:** HR/Payroll/P&L restricted to ADMIN only (matches the old Accountant restrictions). Easy to loosen via a permission table.

---

## 2. Core Business Flows

### 2.1 Client onboarding & approval

```
Visitor ─► Register (form) ─► status = PENDING ─► Admin notified
                                             │
                  ┌──────────────────────────┴───────────────────────┐
                  ▼                                                  ▼
          Admin APPROVES                                     Admin REJECTS (reason)
   status = ACTIVE, client code created                    status = REJECTED, client informed
   (optional: credit limit, price list)
                  │
                  ▼
        Client logs in ─► sees prices ─► cart ─► orders
```

**Registration fields:** company/full name, contact person, phone, email (unique login), password, address, wilaya, and optional legal info (RC, NIF, NIS, ART, activity) with optional document upload (RC / NIF scan).
**Rules**
- Email verification (recommended) before the account enters the admin queue.
- A PENDING client can log in but all price/order endpoints return `403 ACCOUNT_NOT_ACTIVE`.
- Admin actions (approve / reject / suspend / reactivate) are audited and trigger a notification (+ optional email/SMS).
- Admin can also create a client account directly (for walk-in or phone customers).

### 2.2 Public catalog (visitor mode)
- Categories, search, product pages: images (gallery), name, reference, brand, description, specs.
- **Prices are never sent by the API to unauthenticated or non-active users** (stripped server-side; not just hidden in the UI).
- "Add to cart" replaced by "Login / Register to see prices and order".
- Stock shown only as a badge (`In stock` / `Low` / `Out of stock`), never exact quantities to clients.
- SEO-friendly pages (consider SSR/prerender or meta tags later).

### 2.3 Cart & order lifecycle

```
CART ─► Place order ─► PENDING ─► CONFIRMED ─► PREPARING ─► READY ─► DELIVERED / PICKED_UP ─► COMPLETED
                         │            │
                         └─► CANCELLED (by client while PENDING, or by staff with reason)
                                      └─► REJECTED (out of stock, etc.)
```

- **Cart** is persisted per client (DB), survives devices.
- **Place order:** validates account ACTIVE, product active, availability; re-prices server-side (client prices are never trusted); creates `orders` + `order_items` with locked unit prices.
- **Stock handling (recommended):** on `CONFIRMED` → reserve stock (`reserved_quantity`); on delivery/pickup → decrement physical + release reservation; on cancel → release. Everything under `SELECT ... FOR UPDATE`.
- **Tracking:** client sees order list + timeline (`order_status_history` with timestamps, staff note, visible to client).
- **Fulfillment type:** `PICKUP` (at store) or `DELIVERY` (address, fee optional).
- **Payment:** `CASH`, `CHECK`, `TRANSFER`, `ON_CREDIT` (added to balance). Online payment gateway (CIB/Edahabia via SATIM) = future phase.
- **Order edits:** by staff before PREPARING; stock and ledger recalculated by delta (reuse old sale reconciliation logic).
- Notifications on each status change (in-app bell; email/SMS optional).

### 2.4 Stock engine (simplified)
```
Available = physical_quantity − reserved_quantity     (CHECK >= 0 on both)
```
- One row per product (no warehouse). All changes produce an immutable `stock_movements` row: `SALE`, `PURCHASE` (supplier receipt), `ADJUSTMENT` (reason mandatory), `RESERVATION`, `RELEASE`, `RETURN`.
- Low-stock alerts via `min_stock_alert`.
- **New vs. old:** simple *purchase receipts* (goods in) to feed stock and purchase cost (see §3.5 for optional suppliers).

### 2.5 Client balance & ledger
Reuse the immutable double-column ledger unchanged (minus `warehouse_id`):

`running_balance = previous + debit − credit`

| Event | Debit | Credit |
| :--- | :---: | :---: |
| Order invoiced / delivered on credit | total | – |
| Payment (*Versement*) | – | amount |
| Credit note (*Avoir*) / return | – | amount |
| Refund of advance | amount | – |

- Client sees own balance + printable *Extrait de compte*; admin/accountant record payments, allocate to orders.
- Optional **credit limit** per client: blocks `ON_CREDIT` orders beyond limit.

### 2.6 Algerian fiscal invoicing (Factures)
Same as previous project: issued from a completed order; legal header (RC/NIF/NIS/ART), client legal info, HT / TVA / **Timbre Fiscal** (cash only, 1% with legal min/max) / TTC, amount in French words, driver/truck info optional. Never deleted: voided (*Annulée*) with user, timestamp, mandatory reason. Sequential numbering per year (`FAC-2026-0001`). Clients can download their own invoices (PDF/print).
Also supported: *Bon de livraison* and *Proforma* (new, cheap to add using same layout).

### 2.7 Expenses
Categories: `ELECTRICITY, WATER, RENT, FUEL, MAINTENANCE, TRANSPORTATION, SUPPLIES, OTHER`. Feeds P&L.

### 2.8 HR & Payroll
Employees (name, NIN, phone, position, hire date, base salary, status) and monthly `salaries` (base, bonus1, bonus2, advances/deductions, total, paid date). Feeds P&L. Optional later: attendance, leave, salary advances (*avances sur salaire*) deducted from payroll.

### 2.9 Reports & analytics
- Dashboard: orders by status, pending client approvals, low stock, today's revenue, outstanding client debts.
- Stock valuation (Σ physical × purchase_price), Income statement (Revenue − COGS − Expenses − Payroll), top products, top clients, aging of receivables.
- Excel export (SheetJS) for catalog, stock, statements.

### 2.10 Notifications & audit
- Events: `CLIENT_REGISTERED` (→ admin), `CLIENT_APPROVED/REJECTED` (→ client), `ORDER_PLACED` (→ staff), `ORDER_STATUS_CHANGED` (→ client), `LOW_STOCK` (→ staff), `PAYMENT_RECORDED` (→ client).
- Immutable `audit_logs` (user, action, entity, old/new JSON, IP).

---

## 3. Architecture

### 3.1 Stack & structure
```
┌──────────────────────── Vue 3 SPA ─────────────────────────┐
│ Public shop (no prices) │ Client portal │ Back office (staff)│
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JSON REST (JWT)
┌──────────────────────────▼──────────────────────────────────┐
│ Express + TS: helmet, cors, rate-limit, auth, RBAC, status  │
│ guard, price-visibility serializer, services, audit, notif. │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
         PostgreSQL (pg, transactions, FOR UPDATE, pg_trgm)
         + file storage for images (local disk / S3 / Cloudinary)
```

### 3.2 Critical security rules
1. **Price masking server-side:** a single `serializeProduct(user)` function decides which fields leave the API. Visitors, PENDING, REJECTED, SUSPENDED clients never receive `sale_price`. Accountants never receive `purchase_price`.
2. **Client isolation (IDOR):** clients can only access their own cart, orders, invoices, ledger (`WHERE client_id = req.user.client_id`).
3. **Account status guard** middleware `requireActiveClient`.
4. Server-side price recompute on every order; never trust client totals.
5. Rate limiting on login/register, bcrypt, strong password rules, optional email verification, file upload validation (type/size) for images and documents.
6. Stock under `FOR UPDATE`; ledger and audit append-only.

### 3.3 Design system
Reuse previous monochrome theme and print stylesheet. Public shop should be more visual (large product imagery, clean grid) while the back office stays dense and keyboard-friendly. Add RTL/Arabic + French i18n from day one (vue-i18n) — recommended for Algerian market.

---

## 4. Database Schema (draft)

Removed: `warehouses`, `transfers`, `transfer_items`, `sale_fulfillment_lines`, all `warehouse_id` columns. Changed: `stock` is 1:1 with product.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE roles (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL);  -- ADMIN, ACCOUNTANT, CLIENT

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE,                       -- assigned on approval: CLT-0042
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(150), email VARCHAR(100),
  address TEXT, wilaya VARCHAR(50),
  rc VARCHAR(100), nif VARCHAR(100), art VARCHAR(100), nis VARCHAR(100),
  num_fiscal VARCHAR(100), activite TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','REJECTED','SUSPENDED')),
  status_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,     -- walk-in "CLT-COMPTOIR"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_documents (                   -- RC / NIF scans
  id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL, file_url TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(120) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id), sort_order INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE,
  brand VARCHAR(100),
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  specs JSONB,                                   -- flexible technical details
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,   -- ADMIN only
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0,       -- active clients + staff only
  facture_price NUMERIC(14,2),
  min_order_qty INTEGER NOT NULL DEFAULT 1,
  min_stock_alert INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL DEFAULT 'PIECE',
  box_size INTEGER NOT NULL DEFAULT 0,
  tva NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  published BOOLEAN NOT NULL DEFAULT TRUE,       -- visible in the public shop
  active BOOLEAN NOT NULL DEFAULT TRUE,          -- soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_trgm ON products USING gin ((name || ' ' || reference) gin_trgm_ops);

CREATE TABLE product_images (
  id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, thumb_url TEXT, alt TEXT, sort_order INTEGER DEFAULT 0, is_primary BOOLEAN DEFAULT FALSE
);

CREATE TABLE stock (
  product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  physical_quantity INTEGER NOT NULL DEFAULT 0 CHECK (physical_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type VARCHAR(30) NOT NULL,            -- SALE, PURCHASE, ADJUSTMENT, RESERVATION, RELEASE, RETURN
  quantity_change INTEGER NOT NULL, reference VARCHAR(100) NOT NULL, notes TEXT,
  created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers & purchase receipts (optional phase 2)
CREATE TABLE suppliers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(100), address TEXT, balance NUMERIC(14,2) DEFAULT 0);
CREATE TABLE purchases (id SERIAL PRIMARY KEY, supplier_id INTEGER REFERENCES suppliers(id), purchase_date DATE NOT NULL, total NUMERIC(14,2) NOT NULL, notes TEXT, created_by INTEGER REFERENCES users(id));
CREATE TABLE purchase_items (id SERIAL PRIMARY KEY, purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id), quantity INTEGER NOT NULL, unit_cost NUMERIC(14,2) NOT NULL);

-- Cart
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (client_id, product_id)
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,      -- CMD-2026-00001
  client_id INTEGER NOT NULL REFERENCES clients(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CONFIRMED','PREPARING','READY','DELIVERED','COMPLETED','CANCELLED','REJECTED')),
  fulfillment_type VARCHAR(10) NOT NULL DEFAULT 'PICKUP' CHECK (fulfillment_type IN ('PICKUP','DELIVERY')),
  delivery_address TEXT,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'ON_CREDIT',   -- CASH, CHECK, TRANSFER, ON_CREDIT
  subtotal_ht NUMERIC(14,2) NOT NULL, total_tva NUMERIC(14,2) NOT NULL, total_ttc NUMERIC(14,2) NOT NULL,
  client_note TEXT, staff_note TEXT,
  channel VARCHAR(10) NOT NULL DEFAULT 'ONLINE',             -- ONLINE, STAFF
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL, reference VARCHAR(50) NOT NULL,   -- snapshot
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL,              -- locked price (history immutable)
  purchase_price_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,   -- for COGS
  tva NUMERIC(5,2) NOT NULL
);

CREATE TABLE order_status_history (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, note TEXT, visible_to_client BOOLEAN DEFAULT TRUE,
  changed_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger & payments (unchanged logic)
CREATE TABLE client_transactions (
  id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  type VARCHAR(30) NOT NULL,                     -- INVOICE, PAYMENT, CREDIT_NOTE, REFUND, ADJUSTMENT
  reference_type VARCHAR(30), reference_id INTEGER,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  running_balance NUMERIC(14,2) NOT NULL, description TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_payments (
  id SERIAL PRIMARY KEY, payment_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id), order_id INTEGER REFERENCES orders(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0), method VARCHAR(20) NOT NULL,   -- CASH, CHECK, TRANSFER
  reference TEXT, payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Factures
CREATE TABLE factures (
  id SERIAL PRIMARY KEY, facture_number VARCHAR(30) NOT NULL UNIQUE,
  order_id INTEGER NOT NULL REFERENCES orders(id), client_id INTEGER NOT NULL REFERENCES clients(id),
  doc_type VARCHAR(15) NOT NULL DEFAULT 'FACTURE',            -- FACTURE, PROFORMA, BON_LIVRAISON
  payment_mode VARCHAR(20) NOT NULL,
  total_ht NUMERIC(14,2) NOT NULL, total_tva NUMERIC(14,2) NOT NULL,
  timbre NUMERIC(14,2) NOT NULL DEFAULT 0, total_ttc NUMERIC(14,2) NOT NULL,
  transport_mode VARCHAR(50), truck_number VARCHAR(50), driver_name VARCHAR(100),
  status VARCHAR(10) NOT NULL DEFAULT 'ISSUED',               -- ISSUED, VOIDED
  voided_at TIMESTAMPTZ, voided_by INTEGER REFERENCES users(id), void_reason TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE facture_items (
  id SERIAL PRIMARY KEY, facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  reference VARCHAR(50), designation VARCHAR(255), unit VARCHAR(50),
  quantity INTEGER NOT NULL, unit_price_ht NUMERIC(14,2) NOT NULL, tva NUMERIC(5,2) NOT NULL
);

-- Expenses, HR, payroll
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY, category VARCHAR(30) NOT NULL, amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT, expense_date DATE NOT NULL, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE employees (
  id SERIAL PRIMARY KEY, full_name VARCHAR(150) NOT NULL, nin VARCHAR(50), phone VARCHAR(50),
  position VARCHAR(100), hire_date DATE, base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE salaries (
  id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id),
  period DATE NOT NULL,                          -- first day of month
  base_salary NUMERIC(14,2) NOT NULL, bonus1 NUMERIC(14,2) DEFAULT 0, bonus2 NUMERIC(14,2) DEFAULT 0,
  deductions NUMERIC(14,2) DEFAULT 0, total NUMERIC(14,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE, payment_date DATE, UNIQUE (employee_id, period)
);

-- Notifications, audit, settings
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), role_target VARCHAR(30),
  type VARCHAR(50) NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT,
  is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(50), entity_id INTEGER, old_values JSONB, new_values JSONB,
  description TEXT, ip_address VARCHAR(60), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE settings (key VARCHAR(80) PRIMARY KEY, value JSONB NOT NULL);   -- company legal info, timbre rules, numbering
```

**Key indexes:** `orders(client_id, created_at DESC)`, `orders(status)`, `client_transactions(client_id, id)`, `clients(status)`, `stock_movements(product_id, created_at)`, trigram on products/clients.

---

## 5. REST API Surface (draft)

All under `/api`. Standard envelope `{ success, data | error, details }`.

| Area | Endpoints |
| :--- | :--- |
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me` |
| **Public catalog** (no auth, no prices) | `GET /public/products`, `GET /public/products/:slug`, `GET /public/categories` |
| **Shop** (ACTIVE client) | `GET /shop/products` (with prices), `GET /shop/products/:id` |
| **Cart** (ACTIVE client) | `GET /cart`, `PUT /cart/items/:productId`, `DELETE /cart/items/:productId`, `DELETE /cart` |
| **Orders (client)** | `POST /orders` (from cart), `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`, `POST /orders/:id/reorder` |
| **Orders (staff)** | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `PUT /admin/orders/:id`, `POST /admin/orders` (on behalf of client) |
| **Client account** | `GET/PUT /me/profile`, `GET /me/balance`, `GET /me/statement?from&to`, `GET /me/invoices`, `GET /me/invoices/:id/pdf` |
| **Clients (staff)** | `GET /admin/clients?status=PENDING`, `POST /admin/clients`, `PATCH /admin/clients/:id/approve`, `/reject`, `/suspend`, `/reactivate`, `PUT /admin/clients/:id`, `GET /admin/clients/:id/ledger`, `POST /admin/clients/:id/payments` |
| **Catalog admin** | `POST/PUT/DELETE /admin/products`, `POST /admin/products/:id/images`, `PATCH /admin/products/:id/publish`, `POST /admin/products/import` (xlsx), `GET /admin/products/export`, `CRUD /admin/categories` |
| **Stock** | `GET /admin/stock`, `POST /admin/stock/adjust` (reason required), `GET /admin/stock/movements`, `POST /admin/purchases` |
| **Factures** | `POST /admin/orders/:id/facture`, `GET /admin/factures`, `GET /admin/factures/:id`, `POST /admin/factures/:id/void` |
| **Expenses** | `CRUD /admin/expenses` |
| **HR** | `CRUD /admin/employees`, `GET/POST /admin/salaries`, `POST /admin/salaries/generate?period=` |
| **Reports** | `GET /admin/reports/dashboard`, `/income-statement`, `/stock-valuation`, `/receivables`, `/top-products`, `/top-clients` |
| **Misc** | `GET /notifications`, `PATCH /notifications/:id/read`, `GET /admin/audit-logs`, `GET/PUT /admin/settings`, `CRUD /admin/users` |

---

## 6. Frontend Map

**Public (visitor):** Home, Catalog (filters/search), Product page (gallery, details, "Login to see prices"), Login, Register, Forgot password, Contact.
**Client portal:** Shop (with prices), Cart, Checkout, My orders + tracking timeline, My account (profile, balance, statement, invoices), Notifications. Pending banner for non-active accounts.
**Back office (ADMIN / ACCOUNTANT):** Dashboard, Pending clients queue, Clients + ledger, Orders board (kanban by status), Products & images, Stock & movements, Purchases, Factures, Payments, Expenses, HR & Payroll (admin), Reports (admin), Users & settings (admin), Audit log (admin).

Route guards: `public`, `requiresAuth`, `requiresActiveClient`, `requiresStaff`, `requiresAdmin`.

---

## 7. Proposed Repository Structure
```
project/
├── backend/src/
│   ├── config/ (db, env)         ├── middleware/ (auth, rbac, activeClient, rateLimit, error, upload)
│   ├── routes/ (public, auth, shop, cart, orders, admin/*)
│   ├── services/ (stock, order, ledger, facture, timbre, notification, audit, serializers)
│   ├── db/ (schema.sql, migrations/, seed.ts)
│   └── utils/ (numberToFrenchWords, numbering, pdf)
├── frontend/src/
│   ├── views/ (public/, client/, admin/)   ├── components/   ├── stores/ (auth, cart, shop, orders, ...)
│   ├── router/   ├── i18n/ (fr, ar)   ├── styles/ (theme, print)
└── docs/
```

### Reuse from previous project
Copy/adapt: auth & JWT, error wrapper, audit, notifications, stock engine (drop warehouse param), ledger service, facture/timbre/number-to-words, expenses, HR/payroll, reports (drop warehouse filter), theme and print CSS, Excel import/export.
Drop: warehouses, transfers, pickup vouchers, split fulfillment, warehouse switcher, SUPER_MANAGER/MANAGER roles.

---

## 8. Phased Roadmap

| Phase | Scope |
| :--- | :--- |
| **1 – Foundation** | Repo, DB schema, auth (3 roles), settings, seed admin, audit log |
| **2 – Catalog** | Categories, products, image upload, public catalog without prices |
| **3 – Client accounts** | Register, email verify, admin approval queue, price visibility by status |
| **4 – Ordering** | Cart, checkout, order lifecycle, stock reservation, tracking timeline, notifications |
| **5 – Finance** | Ledger, payments, statements, factures/timbre/PDF, credit limit |
| **6 – Back office ERP** | Purchases/suppliers, expenses, HR, payroll |
| **7 – Reporting** | Dashboard, P&L, stock valuation, receivables, exports |
| **8 – Polish** | i18n FR/AR + RTL, SEO, email/SMS, backups, deployment, (optional) online payment (SATIM) |

---

## 9. Open Questions (to confirm before coding)

1. Can the **accountant** approve client accounts, or admin only?
2. Should **payroll / HR / P&L** be admin-only (assumed) or visible to accountant?
3. **Delivery** or pickup only? Delivery fees?
4. **Single price** for all clients, or price lists / per-client discounts?
5. Order payment: credit (balance) allowed for every client, or only with a credit limit set by admin?
6. Should stock be **reserved at order placement** or at admin confirmation (assumed: at confirmation)?
7. Can clients order out-of-stock items (backorder)?
8. Languages: French only, or French + Arabic (RTL)?
9. Notifications by **email / SMS / WhatsApp**, or in-app only?
10. Hosting & image storage (local VPS disk, Cloudinary, S3)?
11. Do you need **suppliers & purchase tracking** in v1?
12. Is the store **VAT-registered with Timbre** on every invoice, as in the previous project?

