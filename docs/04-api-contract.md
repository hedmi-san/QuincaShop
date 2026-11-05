# 04 — REST API Specification & Contract

## 1. General API Principles & Standards

- **Base URL:** `/api`
- **Transport:** HTTPS only. All requests and responses use `Content-Type: application/json`.
- **Authentication:** Bearer token in HTTP header: `Authorization: Bearer <JWT_TOKEN>`
- **Standard Envelope:** Every response adheres to a predictable envelope:

```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

// Error Response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable uppercase identifier
    message: string;        // Human-readable localized or descriptive text
    details?: any;          // Validation breakdown (e.g. zod issues)
  };
}
```

---

## 2. Server-Side Price Masking & Data Projection Engine

To protect wholesale pricing and business margins, product serialization is enforced strictly on the server:

```typescript
export function serializeProduct(product: ProductRow, user?: UserContext | null) {
  // Base public fields available to anyone (including unauthenticated visitors)
  const base = {
    id: product.id,
    reference: product.reference,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    specs: product.specs,
    unit: product.unit,
    box_size: product.box_size,
    category_id: product.category_id,
    images: product.images || [],
    primary_image: product.primary_image || null,
    // Stock is never exposed as a number to visitors or clients
    availability: product.physical_quantity - product.reserved_quantity > 0 
      ? 'IN_STOCK' 
      : 'OUT_OF_STOCK'
  };

  // 1. Visitors or Clients who are NOT ACTIVE: NEVER return prices or stock numbers
  if (!user || user.role === 'CLIENT' && user.clientStatus !== 'ACTIVE') {
    return base;
  }

  // 2. ACTIVE Clients: Expose sale price and VAT, but NEVER purchase price or exact stock
  if (user.role === 'CLIENT' && user.clientStatus === 'ACTIVE') {
    return {
      ...base,
      sale_price: Number(product.sale_price),
      tva: Number(product.tva),
      price_ttc: Math.round(Number(product.sale_price) * (1 + Number(product.tva) / 100) * 100) / 100,
      min_order_qty: product.min_order_qty
    };
  }

  // 3. ACCOUNTANT: Sees sale prices and EXACT physical stock, but NEVER purchase costs
  if (user.role === 'ACCOUNTANT') {
    return {
      ...base,
      sale_price: Number(product.sale_price),
      facture_price: product.facture_price ? Number(product.facture_price) : null,
      tva: Number(product.tva),
      physical_quantity: product.physical_quantity,
      reserved_quantity: product.reserved_quantity,
      available_quantity: product.physical_quantity - product.reserved_quantity,
      min_stock_alert: product.min_stock_alert,
      published: product.published,
      active: product.active
    };
  }

  // 4. ADMIN: Full visibility including purchase cost and margins
  if (user.role === 'ADMIN') {
    return {
      ...base,
      purchase_price: Number(product.purchase_price),
      sale_price: Number(product.sale_price),
      facture_price: product.facture_price ? Number(product.facture_price) : null,
      tva: Number(product.tva),
      margin_amount: Number(product.sale_price) - Number(product.purchase_price),
      margin_percent: Number(product.purchase_price) > 0 
        ? Math.round(((Number(product.sale_price) - Number(product.purchase_price)) / Number(product.purchase_price)) * 10000) / 100 
        : 0,
      physical_quantity: product.physical_quantity,
      reserved_quantity: product.reserved_quantity,
      available_quantity: product.physical_quantity - product.reserved_quantity,
      min_stock_alert: product.min_stock_alert,
      published: product.published,
      active: product.active
    };
  }

  return base;
}
```

---

## 3. Detailed Endpoint Contracts

### 3.1 Public Showcase Routes (No Authentication Required)

| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/public/categories` | — | Returns active category hierarchy (nested trees). |
| `GET` | `/public/products` | `?category=&search=&brand=&page=1&pageSize=24` | Paginated product list. Stripped of prices and stock quantities. |
| `GET` | `/public/products/:slug` | — | Product detail with image gallery and specs. Stripped of prices. |
| `GET` | `/public/store-info` | — | Public store contact coordinates, opening hours, address. |

---

### 3.2 Authentication & Account Routes

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Client self-service registration. Creates user and linked `clients` row with `status='PENDING'`. | Public |
| `POST` | `/auth/login` | Validates email & password. Returns JWT token, user info, role, and client status. | Public |
| `POST` | `/auth/verify-email` | Validates email token (`token`). Activates email verification flag. | Public |
| `POST` | `/auth/forgot-password`| Sends password reset link/token. | Public |
| `POST` | `/auth/reset-password` | Sets new password using valid reset token. | Public |
| `GET` | `/auth/me` | Returns current authenticated user state, permissions, and refreshed client status. | Authenticated |

#### Sample Registration Payload (`POST /api/auth/register`):
```json
{
  "email": "contact@btp-algerie.dz",
  "password": "StrongPassword2026!",
  "fullName": "Karim Bouzid",
  "phone": "0550123456",
  "companyName": "SARL BTP Outillage Algérie",
  "contactPerson": "Karim Bouzid",
  "address": "Zone Industrielle Oued Smar, Lot 14",
  "wilaya": "Alger",
  "rc": "16/00-1234567B19",
  "nif": "001916001234567",
  "art": "16120000000",
  "nis": "123456789012345",
  "activite": "Commerce de gros d'outillage industriel"
}
```

---

### 3.3 B2B Client Portal Routes (Requires `role='CLIENT'` AND `status='ACTIVE'`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/portal/products` | Catalog listing including `sale_price`, `tva`, and `price_ttc`. |
| `GET` | `/portal/products/:id` | Catalog item detail with prices. |
| `GET` | `/portal/cart` | Retrieve persisted cart items, quantities, and real-time total estimation. |
| `PUT` | `/portal/cart/items/:productId` | Upsert cart item quantity (`{ "quantity": 10 }`). |
| `DELETE`| `/portal/cart/items/:productId` | Remove item from cart. |
| `DELETE`| `/portal/cart` | Clear entire cart. |
| `POST` | `/portal/orders` | Checkout cart: creates order, snapshots line prices, sets status to `PENDING`. |
| `GET` | `/portal/orders` | Paginated list of client's past orders with status badges and payment state. |
| `GET` | `/portal/orders/:id` | Complete order detail, item snapshots, status history timeline, and linked facture if issued. |
| `POST` | `/portal/orders/:id/cancel` | Cancel order (allowed only while order is in `PENDING` status). |
| `GET` | `/portal/me/balance` | Returns client's current balance (*Solde*) and credit limit. |
| `GET` | `/portal/me/statement` | Paginated financial statement (*Extrait de Compte*) with debit/credit ledger rows. |
| `GET` | `/portal/me/factures` | List of legal tax invoices issued for this client. |
| `GET` | `/portal/me/factures/:id/pdf`| Stream binary PDF of official Facture or Bon de Livraison. |

---

### 3.4 Administrative & Operations Routes (`role IN ('ADMIN', 'ACCOUNTANT')`)

#### Client Management
- `GET /admin/clients`: Filterable client directory (`?status=PENDING&search=SARL`).
- `GET /admin/clients/:id`: Full profile, legal IDs, uploaded document scans, balance, and order history.
- `POST /admin/clients`: Manual client creation by staff (e.g. for walk-in accounts).
- `PATCH /admin/clients/:id/approve`: Approve client. Assigns `code` (e.g. `CLT-0045`), sets `credit_limit`. *(Admin only)*
- `PATCH /admin/clients/:id/reject`: Rejects application with `{ "reason": "Missing tax registry documents" }`. *(Admin only)*
- `PATCH /admin/clients/:id/suspend`: Suspends account with mandatory reason. *(Admin only)*
- `PATCH /admin/clients/:id/reactivate`: Restores suspended account to `ACTIVE`. *(Admin only)*
- `GET /admin/clients/:id/ledger`: Retrieve client's complete transaction sub-ledger.
- `POST /admin/clients/:id/payments`: Register a customer payment (*Versement*):
  ```json
  {
    "amount": 150000.00,
    "method": "CHECK",
    "reference": "CHQ-BNA-8829103",
    "paymentDate": "2026-11-04",
    "allocatedOrderIds": [12, 14]
  }
  ```
- `POST /admin/clients/:id/refund`: Issue cash refund for clients holding advance credit balance.

#### Product Catalog Administration
- `POST /admin/products`: Create catalog item with references, prices, TVA, and specs.
- `PUT /admin/products/:id`: Update product info and prices. *(Accountants cannot edit purchase price)*
- `DELETE /admin/products/:id`: Soft delete (`active = false`).
- `PATCH /admin/products/:id/publish`: Toggle online storefront visibility (`published = true/false`).
- `POST /admin/products/:id/images`: Upload image file (multipart/form-data). Sharp automatically creates thumbnails.
- `DELETE /admin/products/images/:imageId`: Delete product photo.
- `POST /admin/products/images/:imageId/set-primary`: Designate primary storefront thumbnail.
- `POST /admin/products/import-excel`: Ingest catalog spreadsheet.
- `GET /admin/products/export-excel`: Download complete catalog as `.xlsx`.
- `CRUD /admin/categories`: Create, edit, and reorder categories.

#### Inventory & Procurement
- `GET /admin/stock`: Real-time inventory table (`physical_quantity`, `reserved_quantity`, `available`).
- `POST /admin/stock/adjust`: Manual inventory count adjustment:
  ```json
  {
    "productId": 42,
    "quantityChange": -3,
    "reason": "Damaged goods during pallet unloading",
    "reference": "ADJ-INV-2026-004"
  }
  ```
- `GET /admin/stock/movements`: Audit log of all stock movements with user and reason filters.
- `POST /admin/purchases`: Goods receipt from supplier (increments physical stock, records purchase cost).

#### Order Processing & Counter Sales
- `GET /admin/orders`: Filterable orders board (`?status=PENDING&page=1`).
- `GET /admin/orders/:id`: Full order breakdown with client coordinates.
- `POST /admin/orders`: Direct manual order creation by staff (POS counter sale or phone order).
- `PATCH /admin/orders/:id/status`: Transition order status:
  ```json
  {
    "status": "CONFIRMED",
    "note": "Payment terms validated by accounting",
    "visibleToClient": true
  }
  ```
- `PUT /admin/orders/:id`: Edit order quantities/items prior to staging (recalculates stock delta).
- `POST /admin/orders/:id/cancel`: Cancel order and release reserved stock.

#### Invoicing & Fiscal Compliance (Facturation)
- `POST /admin/orders/:id/facture`: Generate official fiscal invoice:
  ```json
  {
    "docType": "FACTURE",
    "paymentMode": "ESPECE",
    "transportMode": "CAMIONNETTE",
    "truckNumber": "01234-116-16",
    "driverName": "Mourad Haddad"
  }
  ```
- `GET /admin/factures`: Invoices list with totals, tax summary, and void status.
- `GET /admin/factures/:id`: Detailed invoice view with legal French amounts and timbre breakdown.
- `POST /admin/factures/:id/annuler`: Void facture with mandatory reason:
  ```json
  { "voidReason": "Client error on billing entity - Replaced by FAC-2026-0089" }
  ```

#### Operating Expenses, HR & Payroll *(Admin Only)*
- `CRUD /admin/expenses`: Manage overhead expenses (Rent, Fuel, Electricity, etc.).
- `CRUD /admin/employees`: Employee directory, NIN, contract details, and base salary.
- `GET /admin/salaries?period=2026-11-01`: View payroll sheet for target month.
- `POST /admin/salaries/generate`: Auto-generate payroll draft from active employee contracts.
- `PATCH /admin/salaries/:id`: Add holiday/Eid bonuses (`bonus1`, `bonus2`), record salary settlement.

#### Executive Reports & Analytics *(Admin Only)*
- `GET /admin/reports/dashboard`: Executive KPI cards (Today's revenue, month-to-date sales, pending client approvals count, low stock alert counter, total outstanding client receivables).
- `GET /admin/reports/income-statement?from=2026-01-01&to=2026-12-31`: Consolidated P&L (Gross Revenue, COGS, Gross Margin, Total Expenses, Total Payroll, Net Operating Profit).
- `GET /admin/reports/stock-valuation`: Asset valuation report based on current purchase costs.
- `GET /admin/reports/receivables`: Debt aging report (*Balance Âgée*) categorized by overdue intervals.

#### System Administration & Audit Logs *(Admin Only)*
- `GET /admin/audit-logs`: Searchable, filterable system audit trail with old/new JSON snapshots.
- `GET /admin/settings`: Retrieve company legal parameters and tax rules.
- `PUT /admin/settings`: Update company contact information, logo, and fiscal stamp rules.
- `CRUD /admin/users`: Manage staff accounts (Admins and Accountants).

---

## 4. Machine-Readable API Error Codes

| Error Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `AUTH_INVALID_CREDENTIALS` | 401 | Incorrect email or password. |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT session has expired; client must refresh or re-login. |
| `FORBIDDEN_ROLE` | 403 | User role is insufficient for this endpoint. |
| `ACCOUNT_PENDING_APPROVAL` | 403 | Client account exists but has not been approved by an administrator. |
| `ACCOUNT_SUSPENDED` | 403 | Client account has been suspended by management. |
| `INSUFFICIENT_STOCK` | 422 | Requested product quantity exceeds available inventory. |
| `CREDIT_LIMIT_EXCEEDED` | 422 | Order total exceeds customer's authorized credit balance. |
| `INVALID_STATE_TRANSITION` | 422 | Attempted illegal order transition (e.g. `DELIVERED` to `PENDING`). |
| `FACTURE_ALREADY_EXISTS` | 409 | A non-voided Facture is already registered for this order. |
| `FACTURE_ALREADY_VOIDED` | 422 | Invoice has already been cancelled. |
| `ENTITY_NOT_FOUND` | 404 | Requested record ID does not exist. |
| `VALIDATION_FAILED` | 400 | Payload failed schema validation (Zod error details included). |

