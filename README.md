# POSlite

POSlite is an offline-first point-of-sale web application designed for sari-sari stores and similar micro-retail businesses.

## Current version

**Web MVP v0.2.0**

POSlite is currently web-first for rapid development and testing, but the product direction is **Android smartphone-first**. The stable workflow and data model will later be carried into a native Android app.

## Core features

- Smartphone-first responsive interface with mobile bottom navigation
- Dashboard with daily sales, transactions, gross profit, credit balance, low-stock items, and recent sales
- POS checkout with product search, barcode lookup readiness, unit selection, cart controls, discount, cash payment, automatic change, and credit/utang sales
- Base-unit inventory model for piece, gram, and milliliter products
- Multiple selling/purchasing units per product such as piece, pack, box, sachet, bottle, case, 250 g, 500 g, 1 kg, sack, and similar conversions
- Decimal quantity selling for weight/liquid products, such as 1.25 kg of rice
- Product barcode field with duplicate-code protection and exact barcode lookup by Enter/keyboard-style scanner input
- Purchases / Stock In records with supplier, date, multiple line items, purchase unit, quantity, and total cost
- Automatic stock addition from purchases
- Weighted-average inventory costing after each purchase
- Stock movement ledger for purchases, sales, opening stock, and manual adjustments
- Customer credit/utang records and partial/full payment recording
- Operating expense recording kept separate from inventory purchases
- Analytics with Sales, COGS, Gross Profit, Expenses, Estimated Net Profit, and Purchase Spend
- Product Profitability table with quantity sold, sales, cost, gross profit, and margin
- Per-product detail view with stock, average cost, purchase totals, sales totals, profit, margin, barcode, and configured units
- Date-range reports with Sales, COGS, Gross Profit, Expenses, Estimated Net, and Purchases
- CSV report export
- Portable `.pos` full backup and restore using POSlite schema version 2
- Automatic compatibility migration for older v0.1 product records / schema-1 backups
- IndexedDB local database and Service Worker offline caching

## Inventory and unit model

Each product has one **base unit**. Every purchase and sale is converted to that base unit before stock is changed.

Examples:

### Candy

- Base unit: `piece`
- Piece = 1 piece
- Pack = 50 pieces

If 4 packs are purchased, POSlite adds 200 pieces to inventory. Selling 3 pieces deducts 3; selling one pack deducts 50 from the same stock source.

### Rice

- Base unit: `gram`
- 250 g = 250 grams
- 500 g = 500 grams
- 1 kg = 1,000 grams
- 25 kg sack = 25,000 grams

If two 25 kg sacks are purchased, POSlite adds 50,000 grams. Selling 1.25 of the configured 1 kg unit deducts 1,250 grams.

Selling price is independent from conversion quantity, so a pack can have its own discounted selling price.

## Purchase costing and profit

POSlite uses **weighted-average cost** for inventory purchases.

When new stock is purchased at a different price, the current inventory value and incoming purchase value are combined to calculate a new average cost per base unit.

Completed sales preserve their cost basis at the time of sale so future supplier-price changes do not rewrite old profit results.

Core calculations:

`Gross Profit = Sales Revenue - Cost of Goods Sold (COGS)`

`Estimated Net Profit = Gross Profit - Recorded Operating Expenses`

Purchase spending is shown separately from operating expenses. Buying inventory increases stock; its cost becomes COGS when the inventory is sold.

Credit/utang sales count as sales when the goods leave the store. Later customer payments are collections and are not counted again as new sales.

## Offline data architecture

POSlite stores operational data locally using **IndexedDB**. No cloud database or user account is required for normal operation after the web app has been loaded/cached.

Local object stores in database version 2:

- `products`
- `sales`
- `purchases`
- `movements`
- `customers`
- `expenses`
- `settings`

## `.pos` backup format

A `.pos` file is POSlite's portable backup package. In v0.2.0 it uses **schema version 2** and contains:

- POSlite format identifier
- schema version
- app version
- export date/time
- store settings
- products and unit conversions
- barcode identifiers
- current inventory/cost data
- sales history
- purchase history
- stock movements
- customers and credit records
- expenses

The importer accepts schema version 1 and 2 backups. Older product data is normalized into the v0.2 base-unit structure during import/use.

> Important: `.pos` backups are not encrypted yet. Password-protected/encrypted backups remain planned.

## Barcode and QR status

### Barcode

The v0.2 product model is barcode-ready:

- optional barcode field
- duplicate barcode validation
- search by barcode
- exact barcode + Enter lookup for keyboard-style scanner input

Camera barcode scanning is not implemented yet.

### QR Code

QR scanning and POSlite-generated QR labels remain planned features. They will be designed for offline Android smartphone use.

## Running the web version

Serve the repository through GitHub Pages or another static HTTPS web server. No build process or external package installation is required.

Core files:

- `index.html` — application structure and mobile navigation
- `styles.css` — smartphone/desktop responsive UI
- `app.js` — IndexedDB, products, units, purchases, POS, stock ledger, Analytics, reports, and `.pos` backup logic
- `manifest.webmanifest` — installable web app metadata
- `sw.js` — offline asset caching
- `docs/PROJECT.md` — master project plan and implementation documentation
- `CHANGELOG.md` — version history

## Next priorities

1. Harden v0.2 transaction and migration testing.
2. Add richer sales/purchase/credit detail histories.
3. Add camera barcode scanning and QR Code support.
4. Add printable/mobile receipt workflows and optional Bluetooth printer support later.
5. Add protected/encrypted `.pos` backups.
6. Stabilize the web workflow and convert it into a native Android application using Kotlin, Jetpack Compose, Room/SQLite, native file APIs, and native camera scanning.

## Documentation rule

Every implemented POSlite feature, change, technical decision, bug fix, database change, `.pos` format change, Analytics change, and project milestone must be documented alongside development. See `docs/PROJECT.md` and `CHANGELOG.md`.
