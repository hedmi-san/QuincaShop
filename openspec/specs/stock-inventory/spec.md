# stock-inventory Specification

## Purpose
TBD - created by archiving change catalog-stock-pos-modules. Update Purpose after archive.
## Requirements
### Requirement: Real-time Stock Inventory Overview
The system SHALL provide an inventory view displaying physical quantity, reserved quantity for pending online orders, and net available quantity for each product.

#### Scenario: View stock levels
- **WHEN** staff navigates to `/admin/stock`
- **THEN** the system displays the inventory table with stock health status badges (In Stock, Low Stock, Out of Stock) and summary KPI cards

### Requirement: Manual Stock Adjustment
The system SHALL allow staff to manually adjust product physical quantities with a mandatory explanatory reason and audit note.

#### Scenario: Positive stock adjustment (reception / recount surplus)
- **WHEN** staff submits an adjustment adding 15 units with reason "Réception fournisseur"
- **THEN** physical stock is incremented by 15, available stock increases accordingly, and a `PURCHASE` or `ADJUSTMENT` movement is recorded in `stock_movements`

#### Scenario: Negative stock adjustment (damaged / lost items)
- **WHEN** staff submits an adjustment removing 3 units with reason "Avarie / Casse"
- **THEN** physical stock is decremented by 3, ensuring physical stock does not drop below reserved quantity, and an `ADJUSTMENT` movement is recorded

### Requirement: Stock Movement Audit Log
The system SHALL maintain and display an immutable ledger of all inventory movements.

#### Scenario: Inspect product movement history
- **WHEN** staff switches to the movements tab in `/admin/stock`
- **THEN** the system lists all historical movements (SALE, PURCHASE, ADJUSTMENT, RESERVATION, RELEASE) with timestamp, reference, and author

