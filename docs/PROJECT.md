# SariPOS Project Documentation

## Project identity

**Name:** SariPOS  
**Former development name:** POSlite  
**Repository:** `Brgysibulan/POSLITE` (kept for compatibility; not renamed yet)  
**Current phase:** Native Android development + Android-first web workflow validation  
**Web reference version:** v0.2.0 plus documented development modules  
**Native Android development version:** v0.9.0-native-dev
**Primary platform:** Android smartphone  
**First verified native APK baseline:** `9f4acb298eb71cb13da5dcb863c1749acca50507` — build #8 SUCCESS  
**Verified native JPG-receipt hotfix baseline:** `8b0ea16b79a073aeed1b43bfdaf9fd335e08e631` — build #12 SUCCESS  
**Latest verified native SariPOS UI baseline:** `e004dc557de93b6b7664b932c3d50a02b8f81845` — build #15 SUCCESS
**Latest verified native hardening baseline:** `d5de5bc894162d29c81de928d0031125e8129acd` — build #18 SUCCESS
**Verified portrait checkout baseline:** `31a2706b1c11e1c6a7b796a6b6777f7a3202564b` — build #20 SUCCESS
**Verified native data-safety baseline:** `4e5ea36b849b954155c08646b55d789667470804` — build #21 SUCCESS
**Verified native transaction-lifecycle baseline:** `69df5615b2f7eebaa68efbd7c8b724464129d8e9` — build #22 SUCCESS
**Verified native operational-controls baseline:** `c62c7bf3a7bbe454e2a0b9010dd720f0495d4b3c` — build #23 SUCCESS
**Verified native terminology/logo baseline:** `5c18fb2f4d33f40697bd4606c332452b67de9aa0` — build #24 SUCCESS

## Mandatory project rule

All SariPOS development work must be documented alongside implementation. This includes features, changes, decisions, database/storage behavior, UI changes, config/backup formats, analytics rules, bug fixes, build milestones, current limitations, and next steps.

Master references:

- `docs/PROJECT.md`
- `CHANGELOG.md`
- feature-specific documents under `docs/`

## Product goal

SariPOS is a lightweight, offline-first POS for sari-sari stores and small retail businesses. The final product is Android-smartphone-first and should minimize technical/accounting wording in everyday operation while keeping correct stock, purchasing, sales, credit/utang, cash-loan, expense, receipt, and profit records.

Default user-facing language is sari-sari-store friendly. Current native Android screens use familiar terms such as **Benta, Halin, Paninda, Kumprada, Utang, Gastos, Kita at Tubo, Resibo / Talaan,** and **Ayos ng App**. Web users can additionally customize terminology and appearance.

## Branding and compatibility rule

The user-facing app/product name is **SariPOS**.

To protect existing development data and build compatibility, some internal technical identifiers may continue using the old `POSlite`/`poslite` name until a controlled migration is implemented. Examples include package names, local database filenames, local-storage keys, legacy backup/config format identifiers, and repository path. These are implementation details and should not be shown as the main product name in the UI.

The web title/branding, Android launcher label, native Home header, native Settings, and receipt user-facing branding use **SariPOS**. The repository name remains `POSLITE` for now so existing GitHub Pages/build links are not broken.

## About SariPOS

Both the web Settings workflow and the native Android **Ayos ng App** screen include **About SariPOS** so a store owner can quickly understand what the app is for without reading technical documentation.

Purpose shown in the app:

- SariPOS is made for sari-sari stores and small retailers using a smartphone.
- It helps record and monitor Benta/Halin, Kumprada, Paninda/Stock, Utang, Gastos, Resibo, and Kita/Tubo in one simple system.
- The design direction is Android-first, smartphone-friendly, offline/local-first, and uses familiar store language.
- Creator credit shown in Settings: **Created & Developed by Joshua Apal Pudi**.

The native About card was added to Jetpack Compose Settings before verified Android build #15.

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

## Native Android portrait checkout hardening — 2026-09-07

The native **Benta** screen now uses one full-width product column on a phone. The cart count and total remain visible through a persistent action, while cart editing, payment type, discount, cash/change, customer selection, and checkout open in a dedicated Material 3 bottom sheet. This source passed GitHub Actions native build #20.

The same pass adds strict numeric validation at the UI and database boundaries, corrects calendar-day analytics ranges, rejects excessive stock removal, aligns the older-Android FileProvider receipt path with `Pictures/SariPOS`, adds dark system-bar resources, and advances the native development build to `0.4.0-native-dev` / version code 2.

The accounting and inventory engines were intentionally preserved: base-unit conversions, weighted-average cost, COGS snapshots, stock movement records, and credit-sale stock deduction remain unchanged.

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

## Cloud account and license foundation — 2026-09-08

The optional configured build uses Supabase Auth for Google/Facebook login and server-controlled licenses. New social accounts remain pending until an administrator assigns a store and plan. Plans and per-store overrides control validity, active-device count, signed offline allowance, feature access, backup count, and retention. Device claiming occurs inside a locked PostgreSQL function so simultaneous activations cannot exceed the purchased allowance.

The offline license is RSA-signed on the server, bound to the account/store/device, verified in Android, and encrypted at rest with Android Keystore. Private keys and Supabase secret/service-role keys never belong in the APK or browser dashboard.

Cloud backup accepts only validated `SariPOS-Android` database JSON through an Edge Function. It is not a general file-upload folder. Storage paths are server-generated beneath the authenticated user and store, the bucket is private, and downloads are revalidated and checksum-checked. See `docs/CLOUD-AUTH-LICENSING.md`.

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
12. `draft_cart`
13. `cash_closings`

The native Android operational database is independent from browser IndexedDB during development/testing.

## Native Android data safety foundation — 2026-09-07

The `0.5.0-native-dev` track adds an Android-owned full-database backup and restore workflow in **Ayos ng App**. Export uses the Android system document picker, so the store owner chooses where the `.pos` file is saved without storage permission workarounds. Import validates the format and schema and shows record counts before the user confirms replacement.

Restore deletes and reinserts the supported native tables inside one SQLite transaction. Any invalid row or insertion failure rolls the entire operation back. The format is `SariPOS-Android`; current schema version 3 includes products, units, customers, sales/items and lifecycle fields, purchases/items, stock movements, credit ledger, expenses, cash closings, settings, and the draft cart. Native schema-1 and schema-2 backups remain accepted.

Database version 2 introduces `draft_cart`. Existing version-1 native installs receive a non-destructive `CREATE TABLE IF NOT EXISTS` migration. Cart updates are saved locally after add/remove/quantity changes, restored on app startup, and cleared in the same database transaction as a successful checkout.

The native backup is not the same as the web/PWA `POSlite` schema 1/2 format. Native-to-web cross-import remains unimplemented and must not be implied by the shared `.pos` extension. See `docs/BACKUP-RESTORE.md`.

## Native transaction correction and stock loss controls — 2026-09-07

Database version 3 adds sale lifecycle fields without deleting or recreating existing sales. A completed receipt can be fully voided/returned with a required reason. The reversal restores base-unit stock, records separate `sale_void` movements, retains the original sale/items for audit, and excludes the voided sale from dashboard and analytics totals.

Credit-sale void also reverses the customer's outstanding balance and writes a negative `sale_void` ledger entry. Because the current credit ledger does not allocate payments to individual invoices, the app conservatively blocks a credit void if any customer payment occurred after the sale. This prevents silent balance corruption until invoice-level allocation exists.

Inventory adjustment now distinguishes normal add/remove, damaged goods, expired goods, and physical counts. These use movement types `adjustment`, `damaged`, `expired`, and `stock_count`, keeping loss reasons visible in the database audit trail. See `docs/TRANSACTION-LIFECYCLE.md`.

## Native cash closing, credit ledger, and loss analytics — 2026-09-07

Database version 4 adds immutable `cash_closings` snapshots. Each closing stores its period start and close time, opening cash, completed cash sales, credit payments, expenses, expected cash, actual counted cash, variance, and note. A new period starts at local midnight or the last closing time, whichever is later, allowing multiple shifts without double-counting.

Expected cash intentionally excludes purchase spending because the current purchase record does not say whether a supplier was paid from the drawer, bank, credit, or another source. That payment-source field must exist before Kumprada can safely change drawer cash.

The Utang screen now exposes each customer's chronological ledger. Analytics separately values damaged and expired deductions using movement quantity × saved movement cost, and **Natirang Tubo** subtracts both loss categories. Native backup schema 3 adds cash closings while remaining able to restore native schema 1/2. See `docs/CASH-CLOSING.md`.

## Native editable terminology and S logo — 2026-09-07

The `0.8.0-native-dev` track ports the core terminology customization workflow into the native Android app. Fourteen navigation/menu/action labels can be edited individually or replaced with the Sari-sari or English preset. Saved terms update the bottom navigation, More menu, principal screen titles, Back action, New Sale button, and Home purchase shortcut.

Terms are presentation-only `term_*` values in the existing settings table. They do not rename database tables, internal transaction types, package IDs, or accounting concepts. Because native backup already includes settings, custom terms travel with a full `.pos` backup without a schema change.

Android launcher branding now uses a white **S** on a black background for both normal and round adaptive icons. Home shows the same black-and-white badge beside the SariPOS name. See `docs/CUSTOMIZATION.md`.

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

The native UI now presents the main product fields with simpler sari-sari-store wording such as **Paninda, Panimulang stock, Puhunan, Presyo ng benta, Benta,** and **Kumprada**, while internal stock calculations remain unchanged.

## Purchases / Stock In

Implemented rules include supplier, multiple lines, purchasing unit, quantity, cost, purchase total, base-unit conversion, stock movement history, and weighted-average inventory cost.

Formula:

`Old Inventory Value = Existing Stock × Existing Average Cost`

`New Average Cost = (Old Inventory Value + New Purchase Cost) / (Existing Stock + Purchased Base Quantity)`

Native user-facing wording presents this workflow as **Kumprada / Stock In** with labels such as **Pinagbilhan / Supplier, Paninda, Dami, Kabuuang bili,** and **I-save ang Kumprada**.

## Sell / Checkout

Native Android includes product search, native scan action, barcode/QR capture path, cart, selectable selling unit, stock validation, discount, cash/change, optional cash-customer name, credit/utang checkout, stock deduction, movement record, sale history, and automatic receipt generation after a successful sale.

Receipt rendering never creates a second sale.

The current native screen uses store-friendly wording such as **Benta, Halin, Bayad na cash, Sukli, Utang,** and **Kumpletuhin ang Benta**.

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

- Sales / Halin
- COGS / Puhunan ng Nabenta
- Gross Profit / Tubo sa Paninda
- Expenses / Gastos
- Estimated Net / Natirang Tubo
- Purchase Spend / Gastos sa Kumprada

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
- **Save JPG**
- **Share JPG**
- safe FileProvider sharing
- save/share failures handled without relying on the previous WebView/PrintManager PDF path
- SariPOS user-facing filename/footer/share branding

Android 10+ saved receipt images target **Pictures/SariPOS**. Older supported Android versions use the app-safe external Pictures area under the SariPOS folder.

The stale Compose calls/labels for `Print / Save PDF` were removed before build #14, and the final receipt branding was verified in build #15.

Direct Bluetooth thermal-printer support remains planned.

## Appearance and custom terminology — web workflow prototype

Settings on the web includes a user-friendly **Itsura at Mga Tawag** area.

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

Native Android now uses sari-sari-friendly default labels, but the full native **Light/Dark/System + custom-term editor + `.posconfig` import/export** is still pending.

See `docs/CUSTOMIZATION.md`.

## Reusable `.posconfig`

The web UI configuration can be exported/imported as `.posconfig` schema version 1.

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

Native Android now has its own `SariPOS-Android` schema-3 `.pos` export/restore with backward support for native schemas 1 and 2. Conversion compatibility with the separate web `POSlite` schema-2 backup remains planned.

## Development/mock GitHub data

`data/receipts.json` is development/mock data only and is not a live Android transaction database.

No GitHub personal access token is embedded in the public web source or Android APK.

## Build validation

Native workflow: `.github/workflows/android-native-build.yml`

Verified milestones:

- build #8 — first complete native APK baseline
- build #12 — JPG receipt crash-path hotfix
- build #14 — user-friendly SariPOS Compose wording + direct JPG receipt actions
- build #15 — final SariPOS JPG receipt branding; **SUCCESS**, run ID `33976320017`, artifact `POSlite-native-debug`

Build #15 head commit: `e004dc557de93b6b7664b932c3d50a02b8f81845`.

Web workflow: `.github/workflows/validate.yml`

It checks JavaScript syntax and required project/documentation assets including scanner, receipt, cash-loan, preferences, SariPOS branding, and About modules.

Future source changes should pass the applicable workflow before being treated as a verified baseline.

## Current milestone status

Native source/build level:

- SariPOS app/Home branding
- Compose application
- local SQLite POS data layer
- products/no-barcode/unit conversions
- purchases/weighted-average costing
- Sell/cart/cash/change/product credit
- inventory adjustments
- expenses and analytics
- barcode/QR capture integration
- JPG receipt generation/save/share
- sari-sari-friendly Android wording across core screens
- native About SariPOS purpose/creator card
- Android launcher label renamed to SariPOS
- verified build #15 debug APK artifact

Web workflow-validation additions:

- SariPOS user-facing branding
- default sari-sari-friendly wording for new users
- About SariPOS purpose/creator card
- cash-loan operation
- simple sari-sari terminology
- Light/Dark/System appearance
- customizable wording
- reusable `.posconfig`

Still requires native/device work:

- real Android phone end-to-end transaction testing
- native cash-loan port after web workflow approval
- native Light/Dark/System appearance and custom-term settings
- native `.posconfig` import/export
- Android `.pos` import/export
- product QR label generation
- direct Bluetooth thermal-printer support
- named multi-cart hold/resume beyond automatic recovery of the current cart
- partial line-item returns, exchanges, and refund tender tracking beyond full-sale void/return
- dedicated stock-loss analytics for the implemented damaged/expired movements
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
