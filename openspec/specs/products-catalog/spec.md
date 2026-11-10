# products-catalog Specification

## Purpose
TBD - created by archiving change catalog-stock-pos-modules. Update Purpose after archive.
## Requirements
### Requirement: Admin Product Catalog Listing
The system SHALL provide an administrative view displaying products with pagination, thumbnail preview, reference, name, brand, category, physical stock level, sale price, and published status.

#### Scenario: View product catalog
- **WHEN** an authenticated staff member navigates to `/admin/products`
- **THEN** the system displays the paginated product table with current stock and pricing information

#### Scenario: Filter catalog by search term
- **WHEN** staff enters a keyword in the filter bar
- **THEN** the system returns matching products by reference, name, or brand

### Requirement: Product Creation
The system SHALL allow administrators to create a new product specifying reference, name, category, brand, sale price, purchase price, VAT rate, box quantity, and initial stock.

#### Scenario: Successful product creation
- **WHEN** admin submits the product creation form with valid details and initial stock
- **THEN** the system inserts the product record, initializes stock with the given quantity, logs an `INITIAL` stock movement, and displays a success notification

### Requirement: Product Edition
The system SHALL allow staff to edit product details, including pricing, technical specifications, description, and storefront visibility.

#### Scenario: Update product details
- **WHEN** staff modifies a product's sale price and technical specifications and saves
- **THEN** the system updates the product record and reflects the changes immediately in the catalog

### Requirement: Product Image Management
The system SHALL allow staff to upload product images, set a primary thumbnail, and delete obsolete pictures.

#### Scenario: Upload and set primary image
- **WHEN** staff uploads an image file for a product and marks it as primary
- **THEN** the system optimizes and stores thumbnail and full-size WebP versions, setting it as the main image across store and admin views

