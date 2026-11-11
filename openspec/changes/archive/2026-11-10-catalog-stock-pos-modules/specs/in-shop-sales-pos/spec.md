## ADDED Requirements

### Requirement: Counter Sales Point of Sale Interface
The system SHALL provide an ergonomic counter sales interface for cashiers to rapidly process physical store walk-in purchases.

#### Scenario: Cashier opens POS screen
- **WHEN** staff accesses `/admin/pos`
- **THEN** the system loads product catalog search, customer selection defaulting to "Client Comptoir", and an empty active sale cart

### Requirement: Available Stock Verification at Counter
The system SHALL verify that selected quantities do not exceed available stock before validating a counter sale.

#### Scenario: Attempt to sell more than available quantity
- **WHEN** cashier attempts to add or checkout 10 items when only 4 are available
- **THEN** the system blocks the action and informs the cashier that available stock is insufficient

### Requirement: Atomic Counter Checkout & Stock Decrement
The system SHALL execute the counter sale atomically, creating an order with status `DELIVERED`, decrementing physical stock immediately, and recording payment.

#### Scenario: Cash walk-in sale completion
- **WHEN** cashier collects cash payment from a walk-in customer and clicks "Valider la Vente"
- **THEN** an order is created, physical stock is decremented with a `SALE` movement, payment is registered in `client_payments`, and a printable counter receipt/bon is displayed

#### Scenario: Credit sale to approved B2B client
- **WHEN** cashier selects an approved registered B2B client and chooses payment method "À Crédit"
- **THEN** the system checks that `current_balance + totalTtc <= credit_limit`, records the sale, debits the client's balance in `client_transactions`, and decrements physical stock
