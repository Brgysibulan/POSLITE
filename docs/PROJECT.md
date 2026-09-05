# SariPOS Project Documentation

## Project identity

**Name:** SariPOS  
**Former development name:** POSlite  
**Repository:** `Brgysibulan/POSLITE` (kept for compatibility; not renamed yet)  
**Current phase:** Native Android development + Android-first web workflow validation  
**Web reference version:** v0.2.0 plus documented development modules  
**Native Android development version:** v0.3.0-native-dev  
**Primary platform:** Android smartphone  
**First verified native APK baseline:** `9f4acb298eb71cb13da5dcb863c1749acca50507` — build #8 SUCCESS  
**Latest verified native JPG-receipt hotfix baseline:** `8b0ea16b79a073aeed1b43bfdaf9fd335e08e631` — build #12 SUCCESS

## Mandatory project rule

All SariPOS development work must be documented alongside implementation. This includes features, changes, decisions, database/storage behavior, UI changes, config/backup formats, analytics rules, bug fixes, build milestones, current limitations, and next steps.

Master references:

- `docs/PROJECT.md`
- `CHANGELOG.md`
- feature-specific documents under `docs/`

## Product goal

SariPOS is a lightweight, offline-first POS for sari-sari stores and small retail businesses. The final product is Android-smartphone-first and should minimize technical/accounting wording in everyday operation while keeping correct stock, purchasing, sales, credit/utang, cash-loan, expense, receipt, and profit records.

Default user-facing language is sari-sari-store friendly. New web users start with familiar terms such as **Benta, Halin, Paninda, Kumprada, Utang, Gastos,** and **Tubo**, while the wording remains customizable.

## Branding and compatibility rule

The user-facing app/product name is **SariPOS**.

To protect existing development data and build compatibility, some internal technical identifiers may continue using the old `POSlite`/`poslite` name until a controlled migration is implemented. Examples include package names, local database filenames, local-storage keys, legacy backup/config format identifiers, and repository path. These are implementation details and should not be shown as the main product name in the UI.

The web title/branding and Android launcher label use **SariPOS**. The repository name remains `POSLITE` for now so existing GitHub Pages/build links are not broken.

## Platform strategy

SariPOS started as a web/PWA workflow prototype. Native Android development is active under `android-native/`.

The root web application remains a fast test/reference build so store workflows can be reviewed before they are hardened in native Android. The native app is not a WebView wrapper; it uses Kotlin, Jetpack Compose, and an Android-local SQLite database.

Smartphone-first rules:

- portrait-first layouts
- large touch targets
- minimal typing
- scan-assisted selling
- simple store language
- offline operational records
- quick receipt save/share
- fast product lookup
- understandable stock and profit summaries
- safe transaction history

## Native Android architecture

Location: `android-native/`

Technology:

- Kotlin
- Jetpack Compose
- SQLite through `SQLiteOpenHelper`
- Android share/storage APIs
- native Android Canvas/Bitmap JPG receipt generation
- FileProvider for safe JPG sharing
- Google Code Scanner development integration
- Android Gradle Plugin 9.4 built-in Kotlin
- Gradle 9.6
- JDK 17
- Android 17/API 37 compile tooling
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

The native Android operational database is independent from browser IndexedDB during development/testing.

## Web/PWA reference architecture

Location: repository root

Technology:

- HTML
- CSS
- Vanilla JavaScript
- IndexedDB
- browser local storage for UI-only preferences
- Service Worker
- Web App Manifest
- `.pos` schema version 2 backup/restore
- `.posconfig` schema version 1 for reusable appearance/terminology

Main web IndexedDB stores:

1. `products`
2. `sales`
3. `purchases`
4. `movements`
5. `customers`
6. `expenses`
7. `settings`

Cash-loan web prototype records currently use a separate local IndexedDB database so they remain isolated from normal POS sales while the workflow is being validated.

## Core inventory model

Each product has one base inventory unit:

- `pc` — piece
- `g` — gram
- `ml` — milliliter

Every purchase and sale is converted to base quantity before stock changes.

A product can have multiple configured units containing a label, base quantity, selling price, Sell flag, and Buy flag.

Example — candy:

- base: piece
- Piece = 1
- Pack = 50
- buying 4 packs adds 200 pieces
- selling 3 pieces deducts 3
- selling 1 pack deducts 50

Example — rice:

- base: gram
- 250 g = 250
- 500 g = 500
- 1 kg = 1000
- selling 1.25 of the 1 kg unit deducts 1250 g

## Products

Implemented rules include:

- add/edit product
- optional unique barcode
- explicit no-barcode support
- category
- piece/gram/milliliter base unit
- opening stock and cost
- low-stock threshold
- multiple sell/buy units and conversions
- selling price per configured unit
- transaction-history protection for used products

No-barcode items remain searchable/tappable and never require a fake barcode.

## Purchases / Stock In

Implemented rules include supplier, multiple lines, purchasing unit, quantity, cost, purchase total, base-unit conversion, stock movement history, and weighted-average inventory cost.

Formula:

`Old Inventory Value = Existing Stock × Existing Average Cost`

`New Average Cost = (Old Inventory Value + New Purchase Cost) / (Existing Stock + Purchased Base Quantity)`

## Sell / Checkout

Native Android includes product search, native scan action, barcode/QR capture path, cart, selectable selling unit, stock validation, discount, cash/change, optional cash-customer name, credit/utang checkout, stock deduction, movement record, sale history, and automatic receipt generation after a successful sale.

Receipt rendering never creates a second sale.

## Barcode and QR

Native Android development uses Google Code Scanner for barcode/QR capture.

- assigned barcode → scanner can find the item
- no barcode → manual search/tap remains available
- QR values can be captured
- SariPOS-generated product QR labels remain planned

The web reference keeps browser-based barcode scanning for workflow comparison.

## Credit and cash loans

### Utang sa Paninda

Normal product credit remains part of POS sales:

- saved customer
- outstanding balance
- credit sale
- payment collection
- credit ledger

A product-credit sale counts as Sales when the goods leave inventory. Later collection is not new Sales again.

### Pautang na Pera — web workflow prototype

Cash loans are deliberately separate from product sales.

The web prototype supports:

- borrower
- contact
- principal / Pinautang
- loan date
- optional due date
- notes
- interest mode: not set yet / no interest / fixed interest
- payment history
- total returned
- remaining amount
- automatic Unpaid / Partial / Interest Pending / Fully Paid status

Accounting rule:

- principal given out is not a sale
- principal returned is not profit
- only actual collected interest can be treated as loan interest income

The approved cash-loan workflow will be ported into the native Android SQLite model after web UX review.

See `docs/CASH-LOANS.md`.

## Expenses and analytics

Operating expenses remain separate from inventory purchases.

Core metrics:

- Sales
- COGS
- Gross Profit
- Expenses
- Estimated Net
- Purchase Spend

Core calculations:

`Gross Profit = Sales - COGS`

`Estimated Net = Gross Profit - Recorded Operating Expenses`

Cash-loan principal movements must not inflate Sales or Profit.

## Receipts

Native Android receipt content includes store information, transaction number, date/time, customer, payment type, items, quantity/unit, price, subtotal, discount, total, and cash/change or credit information.

Current native receipt output:

- receipt history/view
- direct native bitmap rendering
- lightweight JPG generation
- Save JPG
- Share JPG
- safe FileProvider sharing
- save/share failures handled without relying on the previous WebView/PrintManager PDF path

On Android 10+ saved receipt images currently target the compatibility folder `Pictures/POSlite`; this internal path can be migrated later without affecting the SariPOS user-facing name.

Direct Bluetooth thermal-printer support remains planned.

## Appearance and custom terminology — web workflow prototype

Settings now includes a user-friendly **Itsura at Mga Tawag** area.

Appearance:

- System — follow phone
- Light mode
- Dark mode

Editable wording includes common concepts such as:

- Sell → Benta
- Sales → Halin
- Products → Paninda
- Purchases → Kumprada
- Inventory → Stock ng Paninda
- Credit → Utang
- Expenses → Gastos
- Analytics → Kita at Tubo
- Gross Profit → Tubo sa Paninda
- Net Profit → Natirang Tubo

A Sari-sari preset and Standard preset are provided, and every term remains individually editable. New users default to the Sari-sari preset; existing saved preferences are preserved.

Changing wording is presentation-only. It does not change internal IDs, database meaning, stock calculations, or accounting formulas.

See `docs/CUSTOMIZATION.md`.

## Reusable `.posconfig`

The UI configuration can be exported/imported as `.posconfig` schema version 1.

It contains only:

- appearance theme preference
- custom terminology
- format/version metadata

It does not contain products, purchases, sales, stock, customers, credit balances, cash loans, loan payments, expenses, receipts, or other business records.

This separation allows one store's wording/theme template to be reused by another installation without copying operational data.

Native Android should use the same config concepts/schema when the customization UI is ported.

## Web `.pos` business backup

`.pos` schema version 2 remains the web business-data backup for products, units, purchases, movements, sales, customers, expenses, settings, and barcode values.

`.pos` and `.posconfig` serve different purposes:

- `.pos` = business/operational data backup
- `.posconfig` = reusable appearance and wording only

Native Android `.pos` import/export compatibility remains planned.

## Development/mock GitHub data

`data/receipts.json` is development/mock data only and is not a live Android transaction database.

No GitHub personal access token is embedded in the public web source or Android APK.

## Build validation

Native workflow: `.github/workflows/android-native-build.yml`

The first complete native APK baseline was build #8. The JPG-receipt hotfix was subsequently verified in native build #12, including APK artifact upload.

Web workflow: `.github/workflows/validate.yml`

It checks JavaScript syntax and required project/documentation assets including scanner, receipt, cash-loan, preferences, and SariPOS branding modules.

Future source changes should pass the applicable workflow before being treated as a verified baseline.

## Current milestone status

Native source/build level:

- Compose application
- local SQLite POS data layer
- products/no-barcode/unit conversions
- purchases/weighted-average costing
- Sell/cart/cash/change/product credit
- inventory adjustments
- expenses and analytics
- barcode/QR capture integration
- JPG receipt generation/save/share
- Android launcher label renamed to SariPOS
- successful debug APK builds

Web workflow-validation additions:

- SariPOS user-facing branding
- default sari-sari-friendly wording for new users
- cash-loan operation
- simple sari-sari terminology
- Light/Dark/System appearance
- customizable wording
- reusable `.posconfig`

Still requires native/device work:

- real Android phone end-to-end transaction testing
- finish replacing remaining old development-name text inside native Compose screens
- native cash-loan port after web workflow approval
- native appearance/custom-term settings and `.posconfig` import/export
- Android `.pos` import/export
- product QR label generation
- direct Bluetooth thermal-printer support
- hold/resume sale
- void/refund/return
- damaged/expired stock workflow
- encrypted/protected backups
- optional fully bundled scanner
- release signing/versioning after stabilization

## Documentation index

- `docs/PROJECT.md` — master status/rules
- `docs/ANDROID-NATIVE.md` — native architecture/build status
- `docs/BARCODE-SCANNER.md` — scanner notes
- `docs/NO-BARCODE-PRODUCTS.md` — no-barcode behavior
- `docs/RECEIPTS.md` — receipt behavior
- `docs/CASH-LOANS.md` — cash-loan workflow and accounting rules
- `docs/CUSTOMIZATION.md` — themes, custom terms, `.posconfig`
- `docs/PATCH-NOTES.md` — development patch summary
- `CHANGELOG.md` — implementation history
- `README.md` — repository overview

## Design principle

SariPOS should prioritize **speed, clarity, accurate stock, and understandable profit**. Common sari-sari store transactions should use familiar words and as few taps as practical while preserving trustworthy accounting and transaction records.
