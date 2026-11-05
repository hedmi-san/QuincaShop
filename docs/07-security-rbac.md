# 07 — Security, Hardening & Role-Based Access Control (RBAC)

## 1. Threat Model & Key Security Boundaries

Because this system combines a **public showcase**, an **authenticated B2B wholesale ordering portal**, and a **back-office ERP**, several distinct threat surfaces must be protected:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POTENTIAL ATTACK SURFACE                          │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│ Threat Vector            │ Potential Impact         │ System Defense        │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 1. Wholesale Price Leak  │ Competitors or visitors  │ Server-side DTO       │
│                          │ scrape wholesale margins │ serializer strips all │
│                          │ and confidential prices. │ prices from API.      │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 2. Horizontal IDOR       │ Client A views invoices  │ Strict `client_id`    │
│                          │ or orders of Client B.   │ scoping middleware.   │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 3. Price Tampering       │ Malicious client sends   │ Order totals and      │
│                          │ custom `unit_price` in   │ prices recomputed     │
│                          │ checkout payload.        │ 100% from DB state.   │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 4. Inventory Race        │ Concurrent checkouts     │ Row-level pessimistic │
│    Condition             │ cause negative stock.    │ lock (FOR UPDATE).    │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 5. Vertical Escalation   │ Accountant attempts to   │ Strict RBAC route     │
│                          │ access payroll / P&L.    │ guards & DB masking.  │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. Comprehensive RBAC Matrix

| System Domain / Action | VISITOR | CLIENT (PENDING) | CLIENT (ACTIVE) | ACCOUNTANT | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Catalog (Photos, Specs, Stock Badge)** | View | View | View | View | View |
| **Wholesale Sale Prices (`sale_price`)** | ❌ | ❌ | View | View | View / Edit |
| **Cost Prices & Profit Margins (`purchase_price`)** | ❌ | ❌ | ❌ | ❌ | View / Edit |
| **Shopping Cart & Place Orders** | ❌ | ❌ | Own cart only | On client behalf | On client behalf |
| **Order Status Workflow (Confirm/Prepare/Deliver)**| ❌ | ❌ | ❌ | Full Execute | Full Execute |
| **Cancel Own Order** | ❌ | ❌ | Pending only | Any un-staged | Any un-staged |
| **Client Approval & Credit Limit Setup** | ❌ | ❌ | ❌ | ❌ | Full Execute |
| **Client Financial Ledger & Statement** | ❌ | ❌ | View Own | View / Post | View / Post |
| **Register Client Payments (Versements)** | ❌ | ❌ | ❌ | Full Execute | Full Execute |
| **Generate & Print Facture Fiscale** | ❌ | ❌ | View / Download Own | Full Execute | Full Execute |
| **Void Facture Fiscale (*Annulation*)** | ❌ | ❌ | ❌ | Execute (Audited) | Execute (Audited) |
| **Inventory Adjustments & Write-Offs** | ❌ | ❌ | ❌ | With Reason | With Reason |
| **Operating Expenses (Loyer, Électricité, etc.)**| ❌ | ❌ | ❌ | ❌ | View / Edit |
| **Employee Registry & Monthly Payroll** | ❌ | ❌ | ❌ | ❌ | View / Edit |
| **Executive Reports & Income Statement (P&L)** | ❌ | ❌ | ❌ | ❌ | Full Access |
| **System Settings & User Management** | ❌ | ❌ | ❌ | ❌ | Full Access |
| **Audit Logs Inspection** | ❌ | ❌ | ❌ | ❌ | Read-Only |

---

## 3. Core Security Middlewares Implementation

### 3.1 Active Client Verification Guard (`requireActiveClient.ts`)

Verifies that an authenticated client account is currently in `ACTIVE` status in the database (ensuring instant revocation if suspended by admin):

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { query } from '../db/database.js';

export async function requireActiveClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  // Staff roles (ADMIN, ACCOUNTANT) bypass client status check
  if (req.user.role === 'ADMIN' || req.user.role === 'ACCOUNTANT') {
    return next();
  }

  if (req.user.role === 'CLIENT') {
    const result = await query(
      `SELECT status FROM clients WHERE user_id = $1`,
      [req.user.id]
    );

    const client = result.rows[0];
    if (!client || client.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: {
          code: client?.status === 'PENDING' ? 'ACCOUNT_PENDING_APPROVAL' : 'ACCOUNT_SUSPENDED',
          message: 'Your account is not active for commercial orders.'
        }
      });
      return;
    }

    return next();
  }

  res.status(403).json({ success: false, error: { code: 'FORBIDDEN_ROLE', message: 'Access denied' } });
}
```

### 3.2 Horizontal IDOR Protection Guard (`enforceClientOwnership.ts`)

Ensures clients can only query or mutate resources belonging to their own account:

```typescript
export function enforceClientOwnership(paramName: string = 'clientId') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Staff have global visibility
    if (req.user.role === 'ADMIN' || req.user.role === 'ACCOUNTANT') {
      return next();
    }

    const requestedClientId = Number(req.params[paramName] || req.query[paramName] || req.body[paramName]);
    if (req.user.clientId !== requestedClientId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_RESOURCE', message: 'You do not have permission to access this client account' }
      });
      return;
    }

    next();
  };
}
```

---

## 4. Production Hardening Checklist

1. **Parameter Tampering Immunity:**
   - In `POST /api/portal/orders`, the API reads line items from `cart_items`, looks up current `sale_price` and `tva` directly from the `products` table, and computes line subtotals server-side.
   - Any prices, taxes, or total sums passed from the client frontend are discarded.
2. **SQL Injection Defense:**
   - 100% of database queries use parameterized SQL `$1, $2, ...` through connection pooling (`pg`). No raw string interpolation.
3. **Password Security:**
   - Hashed using `bcryptjs` with work factor 12.
   - Passwords must be at least 8 characters and contain at least one uppercase letter and one number.
4. **Brute-Force Rate Limiting:**
   - Implemented via `express-rate-limit`:
     - `/api/auth/login`: 5 attempts per IP per 15 minutes.
     - `/api/auth/register`: 3 attempts per IP per hour.
5. **HTTP Header Hardening:**
   - Configured via `helmet`:
     - Content Security Policy (CSP).
     - Strict-Transport-Security (HSTS).
     - X-Content-Type-Options: nosniff.
     - X-Frame-Options: DENY (prevents clickjacking).
6. **File Upload Hardening (`multer` + `sharp`):**
   - File extensions validated against allowed types (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`).
   - Magic bytes / MIME-type verification (preventing executable uploads disguised as images).
   - Maximum upload size capped at 5 MB.
   - Images re-encoded to WebP via Sharp to strip potential malicious metadata.

