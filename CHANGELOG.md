# Changelog

All notable POSlite development changes are documented here.

## [0.2.0] - 2026-09-05

### Added

- Android smartphone-first web interface with mobile bottom navigation: Home, Sell, Products, Analytics, and More.
- More navigation drawer for Purchases, Inventory, Credit, Expenses, Reports, and Settings.
- IndexedDB database version 2 with new `purchases` and `movements` stores.
- Base-unit inventory model supporting piece, gram, and milliliter products.
- Multiple selling and purchasing units per product with configurable base conversion quantity and selling price.
- Common sari-sari store unit patterns such as piece/pack/box and gram/250 g/500 g/1 kg/sack.
- Decimal quantity selling for weight/liquid products while keeping piece products whole-number based.
- Optional barcode field for products.
- Duplicate barcode validation.
- Barcode-aware search and exact barcode + Enter lookup for keyboard-style scanners.
- Purchases / Stock In workflow with supplier, date, multiple line items, product, purchase unit, quantity, line cost, purchase total, and generated purchase reference.
- Automatic purchase-unit to base-unit stock conversion.
- Weighted-average inventory costing after purchases.
- Historical cost basis captured on completed sales.
- Stock movement ledger for opening stock/manual adjustments, purchases, and sales.
- Manual stock adjustment notes/reasons.
- Product Profitability Analytics with quantity sold, sales, COGS, gross profit, and margin.
- Product Analytics detail view with current stock, weighted cost, sales, COGS, profit, margin, purchased quantity, purchase spend, barcode, and configured units.
- Whole-store Analytics with Sales, COGS, Gross Profit, Expenses, Estimated Net Profit, Purchase Spend, product insights, low-stock insight, credit insight, and sales trend.
- Reports expanded with COGS, gross profit, expenses, estimated net, purchase spending, and transaction profit.
- CSV report export now includes COGS and gross profit.
- `.pos` schema version 2 including products/unit conversions, barcode, purchases, stock movements, sales, customers, expenses, and settings.
- `.pos` schema-1 import compatibility and automatic legacy product normalization.
- Service Worker cache bumped to `poslite-v0.2.0`.

### Changed

- Product stock now uses a single base-unit source rather than treating pack/piece/kilo as separate inventories.
- Purchase spending is tracked separately from operating expenses; inventory cost becomes COGS when the item is sold.
- Gross Profit is calculated as Sales minus COGS.
- Estimated Net Profit is calculated as Gross Profit minus recorded operating expenses.
- Credit/utang sales count when goods leave inventory; later collections are not counted again as new sales.
- Transaction discounts are allocated proportionally across items for product-level profitability calculations.
- Existing v0.1 products are normalized into the v0.2 base-unit data model.
- Product base unit is locked after creation in the current interface to protect existing stock and historical conversions.
- Web UI is now optimized primarily for portrait smartphone use while retaining desktop/tablet support.

### Fixed

- Same-product multi-unit sales now deduct stock cumulatively. Example: selling Candy by both Piece and Pack in one checkout deducts both quantities from the single base inventory instead of allowing one line to overwrite the other.
- Repeated lines for the same product in one purchase now accumulate stock and weighted-average cost correctly instead of recalculating each line from the original pre-purchase stock.
- Legacy product migration now checks and writes the raw IndexedDB product records so normalized v0.2 product data is actually persisted rather than only normalized in memory.

### Known limitations

- Camera barcode scanning is not implemented yet.
- QR Code scanning/generation is not implemented yet.
- `.pos` backups are not encrypted yet.
- Automatic rotating backup is not implemented yet.
- Supplier master/profile management is not implemented yet; supplier is currently recorded as free text on purchases.
- Dedicated damaged/expired stock workflows are not implemented yet.
- Hold/resume sale and void/refund/return workflows are not implemented yet.
- Receipt printing and Bluetooth thermal-printer support are not implemented yet.
- Multi-user/PIN permissions are not implemented yet.
- Native Android implementation is still a future phase after web stabilization.

## [0.1.0] - 2026-09-05

### Added

- Initial POSlite web MVP.
- Responsive desktop, tablet, and mobile interface.
- Dashboard with daily sales, transaction count, estimated profit, credit balance, low-stock products, and recent sales.
- Product management with category, cost, price, stock, unit, and low-stock level.
- POS checkout cart with quantity controls, discount, cash payment, automatic change, and customer credit/utang sale mode.
- Automatic stock deduction after completed sales.
- Inventory view with low-stock/out-of-stock status, inventory value, and stock adjustments.
- Customer credit/utang records and payment recording.
- Expense recording with daily and monthly totals.
- Analytics module with 7/30/90-day range, sales, gross profit, average ticket, expenses, product performance, business insights, and sales trend.
- Reports with date filtering and CSV export.
- IndexedDB offline local database.
- `.pos` full backup export and restore import using POSlite schema version 1.
- Web App Manifest and Service Worker for installable/offline web use.
- Master project documentation and mandatory documentation rule.
- GitHub Actions validation workflow that checks `app.js`, `sw.js`, and required project files on pushes and pull requests.

### Fixed

- Dialog Cancel and Close controls are explicitly non-submitting so they cannot accidentally trigger a form save.

### Technical decisions

- Web-first development before native Android implementation.
- POSlite is Android smartphone-first; the web build remains the workflow/prototype base.
- Vanilla HTML/CSS/JavaScript was selected for the initial MVP.
- IndexedDB was selected instead of `localStorage` for operational data.
- `.pos` was defined as POSlite's portable backup extension.
- Native Android remains the target after web stabilization, planned with Kotlin, Jetpack Compose, and Room/SQLite.
- Basic automated syntax/file validation is kept in the repository to protect the working web baseline.
- Barcode and QR Code support became official roadmap items.
- The base-unit inventory, purchase, weighted-costing, and product-profitability work was planned here and implemented in v0.2.0.
