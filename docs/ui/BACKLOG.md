# UI Migration & Fix Backlog

**Project:** QuincaShop / SARL Outillage Industriel Algérie  
**Contract Baseline:** `.agents/rules/ui-contract.md`  
**Date:** November 2026

---

## Phase A: Design Foundation & Shared Primitives

- [ ] **A.1 Tokens & Global Styles** (`src/assets/styles/`)
  - [ ] Consolidate CSS variables: semantic color roles (`surface`, `line`, `brand`, `subtle`, `ink`), tints, spacing scale (4/8/12/16/24/32/48), control heights (36/40/44), radii (8 controls, 12 cards, 16 dialogs, 999 pills).
  - [ ] Font scale enforcement (12/13/14/16/20/24/28), eliminate font sizes < 12px.
- [ ] **A.2 Typography & Icon Library**
  - [ ] Install `lucide-vue-next` for standardized currentColor SVG icons.
  - [ ] Create `<AppIcon>` primitive.
- [ ] **A.3 Formatters & Utilities** (`src/lib/` or `src/utils/`)
  - [ ] `formatMoney`: enforce non-breaking space (`\u00A0`), "DA" in UI ("DZD" only in exports), tabular nums.
  - [ ] `formatDate`, `formatDateTime`, `formatPhone`: standardized helpers.
  - [ ] `statusMap.ts`: single mapping covering order, invoice, client, expense, and payroll enums -> i18n label + tone.
  - [ ] Brand constants: single constant `APP_BRAND_NAME = "SARL Outillage Industriel Algérie"`.
- [ ] **A.4 UI Primitives** (`src/components/ui/`)
  - [ ] `Button` (primary/secondary/ghost/danger, sizes, loading, icon slot, aria-label)
  - [ ] `Input`, `Select`, `Textarea` (styled controls, 8px radius, focus-visible)
  - [ ] `FormField` (label above 13px/500, helper, inline error)
  - [ ] `StatusPill` & `Badge` (semantic tints: success, warning, danger, neutral, info)
  - [ ] `Card` (12px radius, clean border, subtle shadow)
  - [ ] `PageHeader` (breadcrumb, title <= 28px, subtitle <= 14px, actions slot)
  - [ ] `FilterBar` (search with SVG icon, filter chips with counts, reset)
  - [ ] `DataTable` (responsive card mode <= 768px, sticky header, nowrap columns, empty/loading/error states)
  - [ ] `EmptyState` (SVG illustration/icon + message + CTA)
  - [ ] `Modal`, `Sheet`, `ConfirmDialog` (focus trap, Esc/overlay close, sticky header/footer)
  - [ ] `Toast`, `Skeleton`, `KeyValueList`, `Money`, `DateTime`, `Phone`
- [ ] **A.5 Application Shells**
  - [ ] `AdminShell`: 250px sidebar with SVG icons, 60px top bar, responsive drawer on mobile, single 24px padding budget (removes 100px dead space).
  - [ ] `StoreShell`: 60px header, responsive category bar, clean footer with high-contrast bottom bar.
  - [ ] `LanguageSwitcher`: text codes ("FR" / "عربي") or SVG icons without Windows emoji flags.
- [ ] **A.6 Living UI Gallery & Verification**
  - [ ] Route `/dev/ui`: showcases all primitives, DataTable edge-cases, form dialogs in LTR and RTL.
  - [ ] Run `/ui-verify /dev/ui` until PASS.

---

## Phase B: Page Migration (Ordered by Business Priority × Severity)

### Batch 1: Core B2B Transactions & Ledger (Highest Severity)
- [ ] **B.1 Admin Factures** (`/admin/factures`) — **Size: L**
  - *Issues:* Actions column clipped, unstyled create modal, table id/amount wrapping, uppercase table headers.
  - *Primitives needed:* `DataTable`, `Button`, `Modal`, `FormField`, `Input`, `Select`, `StatusPill`, `Money`.
- [x] **B.2 Admin Orders** (`/admin/orders`) — **Size: L** [COMPLETED 10/11/2026]
  - *Issues:* Native unstyled buttons & status select, id wrapping, raw status values, ~120px top padding.
  - *Primitives needed:* `DataTable`, `PageHeader`, `FilterBar`, `StatusPill`, `Button`, `Modal`, `Money`.
  - *Verification:* PASS across 6 viewports (360, 390, 768, 1024, 1440, 1920) + RTL. Captured in `docs/ui/shots/after/admin-orders-*.png`.
- [ ] **B.3 Admin Client Ledger** (`/admin/clients/:id/ledger`) — **Size: L**
  - *Issues:* 0,00 DA balance shown in red (`text-danger`), table wrapping, unstyled payment modal, reconciliation summary.
  - *Primitives needed:* `PageHeader`, `Card`, `DataTable`, `Money`, `Modal`, `FormField`, `Button`.

### Batch 2: Client Acquisition & Account Management
- [ ] **B.4 Admin Pending Clients** (`/admin/clients/pending`) — **Size: M**
  - *Issues:* Raw enum values (`PENDING`, `ACTIVE`, `REJECTED`), unstyled approval/rejection modals, native filter tabs.
  - *Primitives needed:* `PageHeader`, `FilterBar`, `DataTable`, `StatusPill`, `Modal`, `FormField`, `Button`.
- [ ] **B.5 Admin Client Detail** (`/admin/clients/:id`) — **Size: M**
  - *Issues:* Raw status badge, ad-hoc cards, inline action buttons without confirm dialogs.
  - *Primitives needed:* `PageHeader`, `Card`, `KeyValueList`, `StatusPill`, `ConfirmDialog`, `Button`.
- [ ] **B.6 Register View** (`/register`) — **Size: M**
  - *Issues:* Unstyled file inputs, micro fonts (< 12px), multi-step hierarchy, mobile touch targets.
  - *Primitives needed:* `Card`, `FormField`, `Input`, `Button`.

### Batch 3: Storefront & Authentication
- [ ] **B.7 Storefront Catalog** (`/`) — **Size: M**
  - *Issues:* Horizontal category overflow on mobile, giant `⚙️` image placeholders, admin margin display cleanup, brand inconsistency.
  - *Primitives needed:* `Card`, `StatusPill`, `Money`, `Button`, `Skeleton`, `EmptyState`.
- [ ] **B.8 Storefront Product Detail** (`/products/:slug`) — **Size: M**
  - *Issues:* Giant `🛠️` placeholder, admin cost visibility cleanup, specification list formatting.
  - *Primitives needed:* `Card`, `Money`, `Badge`, `Button`, `KeyValueList`.
- [ ] **B.9 Auth Login** (`/login`) — **Size: S**
  - *Issues:* Sub-12px labels, form container centering, password visibility toggle.
  - *Primitives needed:* `Card`, `FormField`, `Input`, `Button`.

### Batch 4: Client Self-Service Portal
- [ ] **B.10 Portal Orders** (`/portal/orders`) — **Size: M**
  - *Issues:* Table wrapping, missing mobile card transformation, status pills.
  - *Primitives needed:* `PageHeader`, `DataTable`, `StatusPill`, `Money`.
- [ ] **B.11 Portal Factures** (`/portal/me/factures`) — **Size: M**
  - *Issues:* Table wrapping, unstyled search input, invoice download actions.
  - *Primitives needed:* `PageHeader`, `DataTable`, `StatusPill`, `Money`, `Button`.
- [ ] **B.12 Portal Statement** (`/portal/me/statement`) — **Size: M**
  - *Issues:* Running balance wrapping, date range filter layout, print formatting.
  - *Primitives needed:* `PageHeader`, `FilterBar`, `DataTable`, `Money`.
- [ ] **B.13 Portal Cart** (`/portal/cart`) — **Size: M**
  - *Issues:* Cart empty state, payment option cards, subtotal summary alignment.
  - *Primitives needed:* `Card`, `Money`, `Button`, `EmptyState`.

### Batch 5: Back-Office Operations & Financial Reporting
- [ ] **B.14 Admin Expenses** (`/admin/expenses`) — **Size: M**
  - *Issues:* Table wrapping, native date inputs, unstyled expense modal.
  - *Primitives needed:* `PageHeader`, `FilterBar`, `DataTable`, `Modal`, `FormField`, `Money`.
- [ ] **B.15 Admin Employees** (`/admin/hr/employees`) — **Size: M**
  - *Issues:* Table wrapping, unstyled employee modal, status pills.
  - *Primitives needed:* `PageHeader`, `FilterBar`, `DataTable`, `Modal`, `FormField`, `StatusPill`.
- [ ] **B.16 Admin Payroll** (`/admin/hr/payroll`) — **Size: M**
  - *Issues:* Dense table wrapping, paid/unpaid styling, calculation alignment.
  - *Primitives needed:* `PageHeader`, `DataTable`, `Money`, `StatusPill`, `Modal`.
- [ ] **B.17 Admin Reports Dashboard** (`/admin/reports`) — **Size: L**
  - *Issues:* Dense P&L layout, KPI card alignment, aging table formatting, sub-12px labels.
  - *Primitives needed:* `PageHeader`, `Card`, `DataTable`, `Money`, `FilterBar`.

