# POSlite Project Documentation

## Project identity

**Name:** POSlite  
**Current phase:** Web-first MVP  
**Current version:** v0.1.0  
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

POSlite is a lightweight, offline-first point-of-sale system for sari-sari stores and small retail businesses. It should remain easy to operate, responsive on smartphones, and usable without a cloud account or permanent internet connection.

## Platform priority

POSlite is designed primarily for smartphone operation, with Android as the main target platform.

The current web application is the development and workflow-validation version. UI and business-flow decisions should remain smartphone-first so they can transfer cleanly to the native Android version.

Smartphone-first rules:

- portrait-first layout
- large touch targets
- minimal typing
- no dependency on mouse or keyboard
- fast search and scan-based selling
- camera-ready barcode and QR workflows
- local/offline data storage
- Android-friendly `.pos` file import/export
- mobile-friendly Analytics and reports

## Current architecture

### Web application

- HTML
- CSS
- Vanilla JavaScript
- IndexedDB for local operational data
- Service Worker for cached/offline web assets
- Web App Manifest for installable/PWA behavior

No external framework or cloud database is required in v0.1.0.

### Local database stores

1. `products`
2. `sales`
3. `customers`
4. `expenses`
5. `settings`

## Implemented features — v0.1.0

### Dashboard

- Sales Today
- Transaction count
- Estimated Profit
- Total Credit
- Low-stock list
- Recent sales list
- New Sale shortcut

### POS

- Product search
- Category filter
- Product cards
- Cart
- Add/remove quantity
- Stock-aware quantity limits
- Discount
- Cash payment
- Automatic change calculation
- Credit/utang payment mode
- Customer selection for credit
- Complete Sale
- Automatic inventory deduction after sale

### Products

- Add product
- Edit product
- Delete unused product
- Product name
- Category
- Cost price
- Selling price
- Current stock
- Unit
- Low-stock/reorder level
- Search and category filtering

### Inventory

- Current stock display
- Low-stock status
- Out-of-stock status
- Inventory value based on cost
- Add stock
- Remove stock
- Set exact stock

### Credit / Utang

- Customer records
- Optional contact information
- Credit balance
- Credit sale history stored with customer
- Record partial/full payment
- Prevent deletion when customer has balance or linked sales history

### Expenses

- Expense date
- Category
- Description
- Amount
- Today total
- Current month total
- Delete expense

### Analytics

- Selectable 7/30/90-day period
- Total sales
- Gross profit
- Average transaction value
- Expenses
- Product performance ranking
- Best-selling product insight
- Low-stock insight
- Outstanding credit insight
- Estimated net after recorded expenses
- Sales comparison insight when enough data exists
- Visual sales trend

### Reports

- Custom date range
- Sales total
- Gross profit
- Expenses
- Estimated net
- Transaction table
- CSV export

### `.pos` backup and restore

Current backup format identifier:

- `format: POSlite`
- `schemaVersion: 1`
- `backupType: full`
- `appVersion: 0.1.0`

Backup currently contains:

- store settings
- products
- sales
- customers and credit history
- expenses

Import behavior:

1. Read selected `.pos` file.
2. Parse JSON package.
3. Verify POSlite format and schema version.
4. Show record summary.
5. Require user confirmation.
6. Replace current local records with imported records.

### Offline support

- No cloud database required.
- IndexedDB stores business data locally.
- Service Worker caches core web application files.
- Once the served web app is cached, normal app usage can continue offline.

### Quality assurance

- GitHub Actions workflow: `.github/workflows/validate.yml`
- Runs on pushes to `main` and pull requests.
- Checks JavaScript syntax for `app.js` and `sw.js`.
- Confirms required POSlite project and documentation files exist.
- Dialog Cancel/Close controls were corrected so cancelling a form cannot submit or save it accidentally.

## Important limitations of v0.1.0

These are documented intentionally and should not be mistaken for completed features:

- `.pos` backups are not encrypted yet.
- No automatic rotating backup system yet.
- No barcode scanner yet.
- No QR code scanner/generator yet.
- No receipt printer integration yet.
- No advanced parent-unit/tingi conversion yet.
- No purchase/stock-in ledger yet.
- No supplier module yet.
- No per-item profitability engine based on purchase history yet.
- No hold/resume sale yet.
- No void/refund workflow yet.
- No multi-user/PIN permissions yet.
- No native Android implementation yet.

## Planned unit conversion and purchase system

POSlite must support products that are purchased in bulk but sold in smaller units.

### Base-unit model

Each product will have one inventory base unit. All purchases, sales, and stock adjustments will be converted to this base unit before inventory is changed.

Examples:

- Rice: base unit `gram`; sell as 250 g, 500 g, 1 kg, or custom weight; purchase as 25 kg or 50 kg sack.
- Candy: base unit `piece`; sell by piece or pack; purchase by pack or box.
- Coffee: base unit `sachet`; sell by sachet or pack.
- Softdrink: base unit `bottle`; sell by bottle or case.
- Cigarette: base unit `stick`; sell by stick, pack, or ream.

Selling price and conversion quantity are separate. A pack may have a discounted selling price instead of simply being `piece price × quantity`.

### Purchases / Stock In

Purchasing inventory must create a purchase record instead of only increasing stock manually.

A purchase record should include:

- date
- supplier when available
- product
- purchase quantity
- purchase unit
- conversion quantity to base units
- unit purchase cost
- total purchase cost
- resulting base-unit quantity added to inventory

Every purchase will also create a stock-movement entry.

### Costing

The planned default costing method is weighted-average cost for normal sari-sari store use.

When a new batch is purchased at a different price, POSlite should calculate a new weighted-average cost from the value and quantity of existing stock plus the value and quantity of the new purchase.

Historical completed sales should preserve the cost basis used at the time of sale so later cost changes do not rewrite old profit results.

### Stock movement ledger

Every inventory movement should be traceable, including:

- purchase / stock in
- sale
- damaged item
- expired item
- manual adjustment
- return or refund when implemented

Credit/utang sales deduct inventory immediately because the goods already left the store. A later credit payment affects money/receivables, not inventory.

## Planned profitability Analytics

Profit analysis must work at both the individual-product level and the whole-store level.

### Per-item profitability

For every product and selected date range, Analytics should calculate:

- quantity sold in base units
- quantity sold grouped by selling unit where useful
- sales revenue
- cost of goods sold (COGS)
- gross profit
- gross margin percentage
- average selling price
- average cost
- current stock quantity
- current stock value
- number of transactions containing the item
- rank by revenue
- rank by gross profit
- sales trend

Core calculation:

`Gross Profit = Sales Revenue - Cost of Goods Sold`

Example concept for candy:

- 100 pieces sold × ₱2 = ₱200 revenue
- recorded cost of sold pieces = ₱120
- gross profit = ₱80

The same product must still be analyzed correctly when some units were sold individually and others were sold as packs because all movements share one base-unit inventory source.

### Whole-store profitability

For a selected day, week, month, year, or custom range, Analytics should calculate:

- total sales revenue
- total COGS
- total gross profit
- recorded operating expenses
- estimated net profit
- total cash sales
- total credit/utang sales
- credit collections
- outstanding credit balance
- purchase spending
- current inventory value
- top products by sales
- top products by gross profit
- low-margin products
- slow-moving/dead-stock products when enough history exists

Core store calculations:

`Gross Profit = Total Sales - Total COGS`

`Estimated Net Profit = Gross Profit - Recorded Operating Expenses`

Credit sales count as sales/profit when the sale occurs, while collections are tracked separately as cash inflow so they are not counted twice as new sales.

### Product Profitability view

Analytics should provide a mobile-friendly product list such as:

`Product | Qty Sold | Revenue | COGS | Gross Profit | Margin`

Tapping a product should open a product detail view with its purchase history, sales history, stock movements, and profitability trend.

### Analytics filters

Planned filters:

- Today
- Yesterday
- This Week
- This Month
- This Year
- Custom Date Range
- Product
- Category

## Planned Barcode and QR Code support

Barcode and QR Code support are official POSlite roadmap features. They are not yet implemented in v0.1.0.

### Barcode plan

- Add an optional barcode field to each product.
- Allow manual barcode entry during product creation/editing.
- Search and identify products by barcode in the POS screen.
- Support camera-based barcode scanning where the web platform allows it.
- Preserve compatibility with external USB/Bluetooth barcode scanners that behave like keyboard input where possible.
- Keep manual product search available as a fallback when a scanner is unavailable.

### QR Code plan

- Add optional QR-based product identification.
- Allow camera-based QR scanning for quick product lookup where supported.
- Generate POSlite QR labels for products that do not have a manufacturer barcode.
- Allow printable QR labels for store-created/custom products in a later release.
- Optionally place a QR code on receipts containing a POSlite transaction/reference ID for quick transaction lookup; sensitive transaction data should not be embedded directly in the QR code.
- Keep QR features fully usable without cloud services whenever technically possible.

### Shared scanning behavior

- Barcode and QR scans should add or locate products quickly without changing the normal POS workflow.
- Duplicate code values must be prevented or clearly flagged.
- Product code data must be included in `.pos` backup/restore once the feature is implemented.
- The future native Android version should preserve the same product barcode/QR data model and add stronger native camera/scanner integration.

## Planned development path

### v0.2

- Improve validation and transaction safeguards
- Sales history detail view
- Better stock movement history
- Product archive instead of destructive deletion where appropriate
- Manual/custom sale item support
- Better customer credit ledger

### v0.3

- Base-unit and tingi/unit conversion system
- Purchases / Stock In records
- Supplier records
- Weighted-average inventory costing
- Product-level profitability Analytics
- Store-level profitability Analytics
- Restock suggestions based on sales history
- Slow-moving/dead-stock Analytics

### v0.4

- Receipt layout
- Printable receipt
- Product barcode field and barcode lookup
- Barcode scanner support where available
- QR code product lookup/scanning
- POSlite QR label generation for custom/unbarcoded products
- Optional receipt transaction-reference QR code
- Improved report exports
- Protected/password-based `.pos` backup design

### Web stable milestone

- UX cleanup
- Data validation audit
- Backup/restore compatibility testing
- Mobile testing
- Offline testing
- Documentation audit

### Android phase

After the web workflow is stable, create a native Android version using:

- Kotlin
- Jetpack Compose
- Room/SQLite
- Android file APIs for `.pos`
- Native camera APIs/libraries for barcode and QR scanning

The Android version should preserve the documented behavior and data concepts of POSlite rather than redesigning the business logic from zero.

## Design principle

POSlite should prioritize speed and clarity. Common sari-sari store transactions should require as few steps as practical, while preserving accurate inventory, purchases, credit, expenses, cost, and sales records.