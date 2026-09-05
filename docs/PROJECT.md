# POSlite Project Documentation

## Project identity

**Name:** POSlite  
**Current phase:** Native Android development + web reference stabilization  
**Web reference version:** v0.2.0  
**Native Android development version:** v0.3.0-native-dev  
**Primary platform:** Android smartphone  
**First verified native APK baseline:** `9f4acb298eb71cb13da5dcb863c1749acca50507`  
**Native build:** GitHub Actions run #8 — SUCCESS

## Project rule

All development work must be documented. This includes implemented features, changes, technical decisions, database/storage changes, UI changes, `.pos` format changes, Analytics changes, bug fixes, version changes, current progress, and next steps.

Documentation must be updated alongside implementation.

## Product goal

POSlite is a lightweight, offline-first point-of-sale system for sari-sari stores and small retail businesses. It is designed primarily for Android smartphones, should remain usable without permanent internet access for day-to-day operation, and must accurately track inventory, purchases, sales, credit/utang, expenses, receipts, and profit.

## Platform strategy

POSlite started as a web/PWA workflow prototype. The native Android implementation is now active under `android-native/`.

The root web application is deliberately preserved as a stable reference/fallback while the Android APK is tested. The Android app is **not** a WebView wrapper; it is a native Kotlin/Jetpack Compose application with its own local SQLite database.

Smartphone-first rules:

- portrait-first workflow
- large touch targets
- bottom navigation for common actions
- minimal typing
- scan-assisted selling
- local/offline operational data
- simple receipt generation and sharing
- fast product lookup
- clear stock/profit information
- safe transaction history instead of destructive data behavior

## Architecture

### Native Android — active development

Location: `android-native/`

Technology:

- Kotlin
- Jetpack Compose
- Android SQLite through `SQLiteOpenHelper`
- Android Print Framework
- Android share intents
- Google Code Scanner development integration
- Android Gradle Plugin 9.4 built-in Kotlin
- Gradle 9.6
- JDK 17
- Android 17/API 37 compile SDK
- target SDK 36
- minimum SDK 26

Native database file: `poslite-native.db`

Tables:

1. `products`
2. `product_units`
3. `sales`
4. `sale_items`
5. `purchases`
6. `purchase_items`
7. `stock_movements`
8. `customers`
9. `credit_ledger`
10. `expenses`
11. `settings`

### Web/PWA — stable reference

Location: repository root

Technology:

- HTML
- CSS
- Vanilla JavaScript
- IndexedDB database version 2
- Service Worker
- Web App Manifest
- `.pos` schema version 2 backup/restore

Web object stores:

1. `products`
2. `sales`
3. `purchases`
4. `movements`
5. `customers`
6. `expenses`
7. `settings`

The web and Android databases are intentionally separate during migration/testing.

## Core inventory model

### Base units

Each product has one base inventory unit:

- `pc` — piece
- `g` — gram
- `ml` — milliliter

Every purchase and sale is converted to base quantity before stock changes.

### Multiple units

A product can have multiple configured units. Each unit contains:

- label
- base quantity represented by one unit
- selling price
- Sell enabled/disabled
- Buy enabled/disabled

Selling price is independent from conversion quantity.

### Candy example

- base unit: `pc`
- Piece = 1 piece
- Pack = 50 pieces

Buying 4 packs adds 200 pieces. Selling 3 pieces deducts 3. Selling one pack deducts 50 from the same stock source.

### Rice example

- base unit: `g`
- 250 g = 250 grams
- 500 g = 500 grams
- 1 kg = 1,000 grams
- 25 kg Sack = 25,000 grams

Buying two 25 kg sacks adds 50,000 grams. Selling quantity 1.25 of a configured 1 kg unit deducts 1,250 grams.

## Product rules

Implemented in the native Android source:

- add product
- edit product
- optional unique barcode
- explicit no-barcode product support
- category
- piece/gram/milliliter base unit
- opening stock
- opening cost per base unit
- low-stock threshold
- multiple selling/purchasing units
- unit-specific selling price
- delete guard for products already used by transactions

No-barcode products remain searchable and tappable in Sell and do not require fake barcode values.

## Purchases / Stock In

Native Android supports:

- supplier
- multiple purchase lines
- product
- purchase unit
- quantity
- total cost per line
- purchase total
- conversion to base quantity
- weighted-average cost update
- purchase history storage
- stock movement storage

Weighted-average formula:

`Old Inventory Value = Existing Stock × Existing Average Cost`

`New Average Cost = (Old Inventory Value + New Purchase Cost) / (Existing Stock + Purchased Base Quantity)`

## Sell / Checkout

Native Android supports:

- product name/category/barcode search
- native scan action
- barcode/QR capture path
- product lookup by assigned barcode
- selectable selling unit
- cart
- piece and decimal quantity behavior
- stock validation
- discount
- cash payment
- cash received
- automatic change
- optional customer name for cash sale
- credit/utang payment mode
- saved credit customer selection
- automatic stock deduction
- stock movement creation
- sale history creation
- automatic receipt generation after successful checkout

A receipt never creates a second sale. It only displays an already completed transaction.

## Barcode and QR

### Native Android

The development app uses Google Code Scanner for Android-native barcode/QR capture.

Behavior:

- assigned barcode -> scan can find/add product
- no barcode -> search/tap product manually
- QR values can be captured by the scanner path
- POSlite-generated product QR label creation is not implemented yet

A later hardening phase may replace this with bundled CameraX + ML Kit scanning if scanner-model availability without Google Play services dependency is required.

### Web reference

The web build keeps its browser scanner workflow for comparison/testing.

## Credit / Utang

Native Android supports:

- customer records
- optional contact
- outstanding balance
- credit sale
- payment recording
- credit ledger

A credit sale counts as a sale when goods leave inventory. Later collection is not counted as new revenue again.

## Expenses

Native Android supports:

- category
- description
- amount
- expense history

Inventory purchases remain separate from operating expenses.

## Analytics

Native Android selectable periods:

- 7 days
- 30 days
- 90 days
- 365 days

Metrics:

- Sales
- COGS
- Gross Profit
- Expenses
- Estimated Net
- Purchase Spend

Core calculations:

`Gross Profit = Sales - COGS`

`Estimated Net = Gross Profit - Recorded Operating Expenses`

## Receipts

Native receipts include:

- store name/address
- transaction number
- date/time
- customer
- payment type
- items
- quantity/unit
- unit price
- line amount
- subtotal
- discount
- total
- cash/change or credit

Native actions:

- view receipt
- recent receipt history
- Android Share
- Android Print
- Save as PDF through Android print destinations
- 80 mm-oriented print layout

Direct Bluetooth thermal-printer integration remains planned.

## GitHub development/mock data

`data/receipts.json` is development/mock data only.

It is not the Android operational database. No GitHub personal access token is embedded in the Android APK or public web source.

## Web `.pos` backup

The web reference currently supports `.pos` schema version 2 with products, units, purchases, movements, sales, customers, expenses, settings, and barcode values.

Native Android `.pos` import/export compatibility is **not implemented yet** and is a current migration priority.

## Build validation

Native workflow: `.github/workflows/android-native-build.yml`

The verified baseline run #8 successfully completed:

1. repository checkout
2. JDK 17 setup
3. current Android SDK command-line tools setup
4. `platforms;android-37.0` installation
5. Gradle 9.6 setup
6. `:app:assembleDebug`
7. `app-debug.apk` artifact upload

Artifact name: `POSlite-native-debug`

The native build artifact was approximately 12.3 MB.

Future native source changes should pass this workflow before replacing the verified native baseline.

## Current milestone status

Completed at source/build level:

- native Compose application
- native SQLite data layer
- products/no-barcode/unit conversions
- purchases/weighted-average costing
- Sell/cart/cash/change/utang
- inventory adjustments
- credit customers/payments
- expenses
- analytics
- barcode/QR capture integration
- native receipt generation/history/share/print
- successful debug APK build

Still requires real-device validation:

- install APK on target Android phone
- perform full sample purchase/sale workflow
- verify barcode scan behavior on hardware
- verify receipt Print/Save PDF on hardware
- verify local SQLite persistence across app restarts
- assess portrait phone UX and performance

## Remaining native work

- Android `.pos` import/export
- POSlite QR label generation
- direct Bluetooth thermal-printer support
- hold/resume sale
- void/refund/return
- damaged/expired stock workflow
- encrypted/protected backups
- optional fully bundled offline scanner
- background repository/coroutine layer for database work after workflow validation
- release signing/versioning after development stabilizes

## Documentation index

- `docs/PROJECT.md` — master project status and rules
- `docs/ANDROID-NATIVE.md` — detailed native Android architecture/build status
- `docs/BARCODE-SCANNER.md` — web scanner implementation notes
- `docs/NO-BARCODE-PRODUCTS.md` — no-barcode behavior
- `docs/RECEIPTS.md` — receipt behavior
- `CHANGELOG.md` — implementation history
- `README.md` — repository overview and current status

## Design principle

POSlite should prioritize **speed, clarity, accurate stock, and understandable profit**. Common sari-sari store transactions should take as few taps as practical while preserving trustworthy purchase, inventory, credit, expense, receipt, cost, and sales records.
