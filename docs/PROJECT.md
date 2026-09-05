# POSlite Project Documentation

## Project identity

**Name:** POSlite  
**Current phase:** Web-first MVP  
**Current version:** v0.2.0  
**Primary product direction:** Android smartphone-first  
**Target platform after web stabilization:** Native Android

## Project rule

All development work must be documented. This includes:

- implemented features
- changes and improvements
- technical decisions
- database/storage changes
- UI changes
- `.pos` format changes
- Analytics changes
- bug fixes
- version changes
- current progress and next steps

Documentation must be updated alongside implementation.

## Product goal

POSlite is a lightweight, offline-first point-of-sale system for sari-sari stores and small retail businesses. It should remain easy to operate from a smartphone, usable without permanent internet access, and capable of tracking inventory, purchases, sales, credit, expenses, and profit accurately.

## Platform priority

POSlite is designed primarily for **Android smartphone operation**.

The current web application is the development and workflow-validation version. UI and business-flow decisions should remain smartphone-first so the validated behavior can transfer cleanly to the future native Android version.

Smartphone-first rules:

- portrait-first layout
- large touch targets
- bottom navigation for common actions
- minimal typing
- no dependency on mouse or keyboard
- fast product search and future scan-based selling
- camera-ready barcode and QR workflows
- local/offline operational data
- Android-friendly `.pos` import/export
- mobile-friendly Analytics and reports

## Current architecture — v0.2.0

### Web application

- HTML
- CSS
- Vanilla JavaScript
- IndexedDB for local operational data
- Service Worker for cached/offline web assets
- Web App Manifest for installable/PWA behavior

No cloud database or external application framework is required for current operation.

### IndexedDB database version 2

Object stores:

1. `products`
2. `sales`
3. `purchases`
4. `movements`
5. `customers`
6. `expenses`
7. `settings`

The database version was increased from 1 to 2 to add purchase and stock-movement records.

## Implemented product and unit model

### Base-unit inventory

Each product has one inventory base unit. Supported base-unit types in v0.2 are:

- `pc` — piece
- `g` — gram
- `ml` — milliliter

All sales and purchases are converted into the product's base quantity before stock is changed.

The base unit is locked after product creation in the current UI to reduce the risk of corrupting existing stock and historical conversions.

### Multiple units and conversions

A product may have multiple units. Every unit stores:

- unit ID
- label
- number of base units represented by one unit
- selling price
- whether the unit is allowed for selling
- whether the unit is allowed for purchasing

Selling price is separate from conversion quantity. A pack may therefore have its own selling price instead of always being `piece price × quantity`.

### Candy example

Candy can use:

- base unit: piece
- `Piece` = 1 piece
- `Pack` = 50 pieces

Purchasing 4 packs adds 200 pieces. Selling 3 pieces deducts 3 pieces. Selling one pack deducts 50 pieces from the same underlying inventory.

### Rice example

Rice can use:

- base unit: gram
- `250 g` = 250 grams
- `500 g` = 500 grams
- `1 kg` = 1,000 grams
- `25 kg Sack` = 25,000 grams

Purchasing two 25 kg sacks adds 50,000 grams.

The POS cart supports decimal quantities for gram/milliliter products. If `1 kg` is configured as a 1,000-gram selling unit, selling quantity `1.25` deducts 1,250 grams.

Piece-based products use whole-number cart quantities.

## Implemented features — v0.2.0

### Smartphone-first navigation

- Mobile bottom navigation:
  - Home
  - Sell
  - Products
  - Analytics
  - More
- More opens the remaining modules:
  - Purchases
  - Inventory
  - Credit
  - Expenses
  - Reports
  - Settings
- Responsive desktop/tablet fallback remains available for web testing.

### Dashboard / Home

- Sales Today
- Transaction count
- Gross Profit Today
- Total Credit
- Low-stock list
- Recent sales
- Quick shortcuts for Sell, Stock In, Products, and Analytics

### POS / Sell

- Product search
- Category filtering
- Barcode-aware search
- Exact barcode + Enter lookup for keyboard-style scanner input
- Product cards optimized for touch
- Selling-unit selector per product
- Cart
- Whole-number quantity for piece products
- Decimal quantity for gram/milliliter products
- Stock-aware quantity limits using base quantities
- Discount
- Cash payment
- Automatic change calculation
- Credit/utang sale mode
- Customer selection for credit
- Complete Sale
- Automatic stock deduction in base units
- Historical item cost captured at the time of sale
- Stock movement entry created for each sold product

### Products

- Add product
- Edit product
- Delete only unused products
- Product name
- Category
- Optional barcode
- Duplicate barcode validation
- Base unit
- Low-stock threshold in base quantity
- Opening stock and opening cost for new products
- Dynamic selling/purchasing unit conversions
- Unit-specific selling price
- Product Analytics detail shortcut
- Existing v0.1 product records automatically normalized into the v0.2 model

### Purchases / Stock In

Purchasing inventory is now a real transaction rather than only a manual stock increase.

A purchase supports:

- supplier name (optional free text)
- purchase date
- multiple line items
- product
- purchase unit
- quantity
- total cost paid for each line
- automatic conversion to base quantity
- purchase reference number
- purchase total

Saving a purchase:

1. Converts each line into its base-unit quantity.
2. Adds that quantity to product stock.
3. Recalculates weighted-average cost.
4. Creates a purchase-history record.
5. Creates a stock-movement record.

### Weighted-average inventory costing

POSlite v0.2 uses weighted-average cost.

For a purchase:

`Old Inventory Value = Existing Stock × Existing Average Cost`

`New Average Cost = (Old Inventory Value + New Purchase Cost) / (Existing Stock + Purchased Base Quantity)`

This gives a practical ongoing cost basis for sari-sari store inventory when supplier prices change.

Completed sales preserve the cost basis used at the time of the transaction. Later purchase-cost changes therefore do not rewrite historical profit.

### Inventory

- Current stock in base units with friendly display such as kg/L when appropriate
- Low-stock status
- Out-of-stock status
- Current inventory value using weighted-average cost
- Manual Add / Remove / Set stock adjustment
- Adjustment reason/note
- Recent stock-movement ledger

### Stock movement ledger

Every implemented inventory movement can be traced:

- opening stock / manual adjustment
- purchase / stock in
- sale

Movement records contain:

- date/time
- product
- movement type
- base-unit quantity change
- reference ID when applicable
- note
- relevant cost basis

Future damaged, expired, refund, and return flows should reuse this ledger instead of creating a separate inventory system.

### Credit / Utang

- Customer records
- Optional contact
- Outstanding balance
- Credit sale records
- Partial or full payment
- Payment ledger
- Credit sale deducts inventory immediately because goods have left the store
- Credit sale is counted as revenue when the sale occurs
- Later customer payment is treated as collection, not a second sale
- Customer deletion blocked when linked history/balance exists

### Expenses

- Expense date
- Category
- Description
- Amount
- Today total
- Current month total
- Delete expense

Inventory purchases are deliberately kept separate from operating expenses.

### Analytics

Selectable periods:

- Last 7 days
- Last 30 days
- Last 90 days
- Last 365 days

Whole-store metrics:

- Sales
- Cost of Goods Sold (COGS)
- Gross Profit
- Recorded Operating Expenses
- Estimated Net Profit
- Purchase Spend
- Outstanding Credit insight
- Low-stock insight
- Highest-profit product
- Highest-sales product
- Sales trend

Core calculations:

`Gross Profit = Sales Revenue - COGS`

`Estimated Net Profit = Gross Profit - Recorded Operating Expenses`

Purchase spend is shown separately because buying inventory does not immediately mean the full purchase is an expense of the same sales period; the inventory cost becomes COGS as goods are sold.

### Product Profitability

For the selected Analytics period, POSlite calculates per product:

- quantity sold in base units
- sales revenue
- COGS
- gross profit
- gross margin percentage

Discounts on a transaction are allocated proportionally across its products when computing product-level revenue/profit.

Tapping/choosing product details shows:

- current stock
- average cost per base unit
- total recorded sales
- total COGS
- gross profit
- margin
- quantity sold
- purchased quantity
- purchase spending
- barcode
- configured unit conversions

### Reports

Custom date range reports calculate:

- Sales
- COGS
- Gross Profit
- Expenses
- Estimated Net
- Purchase Spend
- transaction-level sales and profit

CSV export includes transaction date, reference, payment type, items, sales, COGS, and gross profit.

## Barcode implementation status

Barcode support is partially implemented and the data model is now barcode-ready.

Implemented:

- optional product barcode field
- duplicate barcode validation
- barcode included in product search
- exact barcode + Enter lookup in Sell/POS for keyboard-style scanners
- barcode data included in `.pos` schema 2 backups

Not yet implemented:

- camera barcode scanning
- dedicated scanner overlay
- Android native scanner integration

## QR Code plan

QR Code remains an official roadmap feature and is not yet implemented.

Planned:

- camera QR scanning
- QR product lookup
- POSlite-generated QR labels for unbarcoded/custom products
- printable QR labels
- optional receipt/reference QR
- offline operation wherever technically possible

Sensitive transaction data should not be embedded directly in a receipt QR. A local POSlite reference ID is preferred.

## `.pos` backup and restore — schema version 2

Current identifier:

- `format: POSlite`
- `schemaVersion: 2`
- `backupType: full`
- `appVersion: 0.2.0`

The v0.2 backup contains:

- store settings
- products
- base units and conversion units
- barcode values
- inventory/cost state
- sales
- purchases
- stock movements
- customers and credit history
- expenses

Import behavior:

1. Read selected `.pos` file.
2. Parse JSON package.
3. Verify POSlite format.
4. Accept supported schema version 1 or 2.
5. Show record summary.
6. Require user confirmation.
7. Replace current local records.
8. Normalize legacy product data into the v0.2 base-unit model.

Current limitation: backups are not encrypted yet.

## Backward compatibility

The v0.2 application includes a migration path for legacy v0.1 products.

Old fields such as:

- `stock`
- `cost`
- `price`
- `unit`

are normalized into:

- `stockBase`
- `avgCostBase`
- a base unit
- a default conversion/selling unit

Schema-1 `.pos` backups are accepted by the v0.2 importer.

## Offline support

- No cloud database is required for normal operation.
- IndexedDB stores business data locally.
- Service Worker caches core web files.
- Cache version for this release is `poslite-v0.2.0`.
- `.pos` files provide manual portable backup/restore.

## Quality assurance

- GitHub Actions workflow: `.github/workflows/validate.yml`
- Runs on pushes to `main` and pull requests.
- Checks JavaScript syntax for `app.js` and `sw.js`.
- Confirms required project/documentation files exist.
- Form Cancel/Close controls remain non-submitting.
- v0.2 JavaScript was syntax-checked during implementation before push.

## Important limitations of v0.2.0

These are not completed features:

- no camera barcode scanner yet
- no QR scanner/generator yet
- no encrypted/password-protected `.pos` backups yet
- no automatic rotating backup system yet
- no supplier master/profile module yet; purchase supplier is free text
- no damaged/expired dedicated workflow yet; manual adjustment can record a reason
- no hold/resume sale yet
- no void/refund/return workflow yet
- no receipt printer integration yet
- no multi-user/PIN permission system yet
- no native Android app implementation yet

## Planned development path

### v0.3

- transaction safeguards and more validation
- detailed sales-history view
- richer purchase-history detail view
- richer customer credit ledger view
- dedicated damaged/expired stock movements
- product archive instead of destructive delete where appropriate
- manual/custom sale items when needed
- restock suggestions based on sales velocity
- slow-moving/dead-stock Analytics
- category profitability

### v0.4

- camera barcode scanning
- QR Code product scanning
- POSlite QR label generation
- printable/mobile receipt layout
- optional receipt transaction-reference QR
- improved report exports
- protected/password-based `.pos` backup design

### Web stable milestone

- mobile UX cleanup
- transaction/data integrity audit
- v1/v2 `.pos` compatibility testing
- phone-browser testing
- offline/service-worker testing
- documentation audit

### Native Android phase

After the web workflow is stable, create the native Android version using:

- Kotlin
- Jetpack Compose
- Room/SQLite
- Android file APIs for `.pos`
- native camera APIs/libraries for barcode and QR scanning
- optional Bluetooth thermal-printer integration later

The Android version must preserve the documented POSlite business behavior and data concepts rather than redesigning the system from zero.

## Design principle

POSlite should prioritize **speed, clarity, accurate stock, and understandable profit**. Common sari-sari store transactions should take as few taps as practical while preserving trustworthy purchase, inventory, credit, expense, cost, and sales records.
