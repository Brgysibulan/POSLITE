# POSlite Project Documentation

## Project identity

**Name:** POSlite  
**Current phase:** Web-first MVP  
**Current version:** v0.2.0  
**Primary product direction:** Android smartphone-first  
**Target platform after web stabilization:** Native Android

## Project rule

All development work must be documented. This includes implemented features, changes, technical decisions, database/storage changes, UI changes, `.pos` format changes, Analytics changes, bug fixes, version changes, current progress, and next steps.

Documentation must be updated alongside implementation.

## Product goal

POSlite is a lightweight, offline-first point-of-sale system for sari-sari stores and small retail businesses. It is designed to work primarily from an Android smartphone, remain usable without permanent internet access, and accurately track inventory, purchases, sales, credit, expenses, and profit.

## Platform priority

The current web app is the workflow-validation and operational MVP. UI and business-flow decisions remain smartphone-first so they can transfer cleanly into the future native Android version.

Smartphone-first rules:

- portrait-first layout
- large touch targets
- bottom navigation for common actions
- minimal typing
- no dependency on mouse or keyboard
- fast product search and scan-based selling
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

No cloud database or external application framework is required for normal current operation.

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

## Product and unit model

### Base-unit inventory

Each product has one inventory base unit:

- `pc` — piece
- `g` — gram
- `ml` — milliliter

All sales and purchases are converted into base quantity before stock is changed. The base unit is locked after product creation in the current UI to reduce the risk of corrupting stock and historical conversions.

### Multiple units and conversions

Each selling/purchasing unit stores:

- unit ID
- label
- base-unit conversion quantity
- selling price
- sell-enabled flag
- purchase-enabled flag

Selling price is independent from conversion quantity.

### Candy example

- base unit: piece
- `Piece` = 1 piece
- `Pack` = 50 pieces

Purchasing 4 packs adds 200 pieces. Selling 3 pieces deducts 3 pieces. Selling one pack deducts 50 pieces from the same underlying inventory.

### Rice example

- base unit: gram
- `250 g` = 250 grams
- `500 g` = 500 grams
- `1 kg` = 1,000 grams
- `25 kg Sack` = 25,000 grams

Purchasing two 25 kg sacks adds 50,000 grams. Decimal cart quantities are supported for gram/milliliter products, so selling `1.25` of a 1 kg unit deducts 1,250 grams. Piece-based products remain whole-number based.

## Implemented features — v0.2.0

### Smartphone-first navigation

- Bottom navigation: Home, Sell, Products, Analytics, More
- More drawer: Purchases, Inventory, Credit, Expenses, Reports, Settings
- Responsive desktop/tablet fallback for testing

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
- Dedicated **Ready to Scan Barcode** panel
- Exact barcode + Enter lookup for Bluetooth/USB/keyboard-style scanners
- One-tap scanner-input focus
- Automatic refocus after successful scanner input
- Camera barcode scanning through browser `BarcodeDetector` when supported
- Rear-camera preference on compatible Android browsers
- Retail barcode formats including EAN, UPC, Code 128, Code 39, Codabar, and ITF where supported
- Scan states for Ready, Scanned, Not Found, Out of Stock, unsupported browser, camera permission/error, and missing selling unit
- Successful barcode match automatically adds the product using its first enabled selling unit
- Products without barcodes remain sellable by search and touch selection
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
- Historical item cost captured at time of sale
- Stock movement entry per sold product

### Products

- Add product
- Edit product
- Delete only unused products
- Product name
- Category
- Optional barcode
- Explicit **Product has no barcode** option
- Duplicate barcode validation
- Base unit
- Low-stock threshold in base quantity
- Opening stock and opening cost for new products
- Dynamic selling/purchasing unit conversions
- Unit-specific selling price
- Product Analytics detail shortcut
- Existing v0.1 product records automatically normalized into the v0.2 model

#### Products without barcodes

When **Product has no barcode** is enabled:

- the barcode input is disabled and cleared;
- the product is stored with an empty barcode value;
- no fake barcode is generated;
- the item still works normally in purchases, inventory, costing, sales, credit, reports, analytics, and `.pos` backups;
- the product is sold by searching its name/category or tapping its product card.

An empty barcode remains the canonical representation for an unbarcoded product. This avoids a database migration and preserves v0.2 compatibility. See `docs/NO-BARCODE-PRODUCTS.md`.

### Purchases / Stock In

A purchase supports:

- optional supplier name
- purchase date
- multiple line items
- product
- purchase unit
- quantity
- total cost paid per line
- automatic base-unit conversion
- purchase reference
- purchase total

Saving a purchase converts each line to base quantity, increases stock, recalculates weighted-average cost, stores the purchase record, and creates stock-movement records.

### Weighted-average inventory costing

`Old Inventory Value = Existing Stock × Existing Average Cost`

`New Average Cost = (Old Inventory Value + New Purchase Cost) / (Existing Stock + Purchased Base Quantity)`

Completed sales preserve the historical cost basis used at the time of the transaction.

### Inventory

- Current stock in base units with friendly kg/L display when appropriate
- Low-stock and out-of-stock status
- Inventory value using weighted-average cost
- Manual Add / Remove / Set adjustment
- Adjustment reason/note
- Recent stock-movement ledger

### Stock movement ledger

Implemented movement types include:

- opening stock/manual adjustment
- purchase/stock in
- sale

Movement records include date/time, product, movement type, base quantity change, reference ID when applicable, note, and relevant cost basis.

Future damaged, expired, refund, and return flows should reuse this ledger.

### Credit / Utang

- Customer records
- Optional contact
- Outstanding balance
- Credit sale records
- Partial/full payment
- Payment ledger
- Credit sale deducts inventory immediately
- Credit sale counts as revenue when goods leave inventory
- Later collection is not counted as another sale
- Customer deletion blocked when linked history/balance exists

### Expenses

- Date
- Category
- Description
- Amount
- Today total
- Current month total
- Delete expense

Inventory purchases remain separate from operating expenses.

### Analytics

Selectable periods:

- 7 days
- 30 days
- 90 days
- 365 days

Whole-store metrics:

- Sales
- COGS
- Gross Profit
- Operating Expenses
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

### Product Profitability

Per product:

- quantity sold in base units
- sales revenue
- COGS
- gross profit
- margin percentage

Transaction discounts are allocated proportionally across items for product-level profitability.

Product detail includes current stock, average cost, sales, COGS, profit, margin, quantity sold, purchased quantity, purchase spend, barcode/no-barcode state, and configured units.

### Reports

Date-range reports calculate Sales, COGS, Gross Profit, Expenses, Estimated Net, Purchase Spend, and transaction-level sales/profit. CSV export includes transaction date, reference, payment type, items, sales, COGS, and gross profit.

## Barcode implementation status

Implemented:

- optional product barcode
- explicit no-barcode product option
- duplicate barcode validation
- barcode included in product search
- exact barcode + Enter lookup
- dedicated scanner-ready input panel
- automatic repeat-scan refocus
- browser camera barcode scanning when `BarcodeDetector` is supported
- rear-camera preference
- scan success/error/not-found/out-of-stock feedback
- automatic add-to-cart after successful barcode detection
- barcode data in `.pos` schema 2 backups

Compatibility behavior:

- unsupported camera browsers fall back to scanner input/manual search;
- products without barcodes use normal search/tap selling;
- no-barcode products do not require generated fake codes.

See `docs/BARCODE-SCANNER.md` and `docs/NO-BARCODE-PRODUCTS.md`.

## QR Code plan

QR remains an official roadmap item and is not yet implemented.

Planned:

- camera QR scanning
- QR product lookup
- POSlite-generated QR labels for custom/unbarcoded products when desired
- printable QR labels
- optional receipt/reference QR
- offline operation wherever technically possible

Sensitive transaction data should not be embedded directly in receipt QR. A local POSlite reference ID is preferred.

## `.pos` backup and restore — schema version 2

Current identifier:

- `format: POSlite`
- `schemaVersion: 2`
- `backupType: full`
- `appVersion: 0.2.0`

The backup contains store settings, products, units/conversions, barcode values including empty values for no-barcode products, inventory/cost state, sales, purchases, stock movements, customers/credit history, and expenses.

Schema-1 backups remain accepted and legacy products are normalized to the v0.2 model.

Current limitation: `.pos` backups are not encrypted yet.

## Offline support

- No cloud database required for normal operation
- IndexedDB stores business data locally
- Service Worker caches core web files
- Current cache version: `poslite-v0.2.0-scan2`
- Cached scanner/no-barcode assets include `scanner.js`, `scanner.css`, and `no-barcode.js`
- `.pos` files provide manual portable backup/restore

## Quality assurance

GitHub Actions workflow: `.github/workflows/validate.yml`

It runs on pushes to `main` and pull requests and currently:

- syntax-checks `app.js`
- syntax-checks `scanner.js`
- syntax-checks `no-barcode.js`
- syntax-checks `sw.js`
- confirms required core files
- confirms scanner and no-barcode documentation files
- confirms project and changelog documentation

## Important limitations of v0.2.0

- Camera barcode scanning depends on browser `BarcodeDetector` support
- No QR scanner/generator yet
- No encrypted/password-protected `.pos` backups yet
- No automatic rotating backup system yet
- No supplier master/profile module yet; supplier is free text
- No dedicated damaged/expired workflow yet; manual adjustment can record a reason
- No hold/resume sale yet
- No void/refund/return workflow yet
- No receipt printer integration yet
- No multi-user/PIN permission system yet
- No native Android app implementation yet

## Planned development path

### v0.3

- transaction safeguards and more validation
- detailed sales history
- richer purchase history
- richer customer credit ledger
- dedicated damaged/expired stock movements
- product archive instead of destructive delete where appropriate
- manual/custom sale items when needed
- restock suggestions based on sales velocity
- slow-moving/dead-stock Analytics
- category profitability

### v0.4

- QR Code product scanning
- POSlite QR label generation
- printable/mobile receipt layout
- optional receipt transaction-reference QR
- improved report exports
- protected/password-based `.pos` backup design
- broader camera barcode compatibility fallback if needed

### Web stable milestone

- mobile UX cleanup
- transaction/data integrity audit
- v1/v2 `.pos` compatibility testing
- phone-browser testing
- barcode camera compatibility testing
- offline/service-worker testing
- documentation audit

### Native Android phase

After the web workflow is stable, create the native Android version using Kotlin, Jetpack Compose, Room/SQLite, Android file APIs for `.pos`, native camera APIs/libraries for barcode and QR scanning, and optional Bluetooth thermal-printer integration later.

The Android version must preserve documented POSlite business behavior and data concepts rather than redesigning the system from zero.

## Design principle

POSlite should prioritize **speed, clarity, accurate stock, and understandable profit**. Common sari-sari store transactions should take as few taps as practical while preserving trustworthy purchase, inventory, credit, expense, cost, and sales records.
