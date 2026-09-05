# Changelog

All notable SariPOS development changes are documented here. Historical entries may still use the former development name **POSlite**.

## [Unreleased] - 2026-09-05

### Added

- User-facing product/app name changed to **SariPOS**.
- New `brand.js` compatibility layer for web branding and friendlier store wording without changing existing database keys or operational records.
- New web users default to sari-sari-store terminology such as **Benta, Halin, Paninda, Kumprada, Utang, Gastos,** and **Tubo** while still allowing full customization.
- Android launcher label changed to **SariPOS** while keeping the existing package/theme identifiers for build compatibility.
- Web development prototype for **Pautang na Pera / Cash Loans**, kept separate from product-credit/utang sales.
- Cash-loan borrower, principal, optional contact, loan date, optional due date, notes, payment history, and automatic Unpaid / Partial / Interest Pending / Fully Paid status.
- Cash-loan interest modes: not set yet, no interest, or fixed interest amount.
- Cash-loan summary for total principal loaned, principal still outstanding, total returned, and actual interest collected.
- `Settings → Appearance & Custom Terms` for store-specific wording.
- Appearance choices: **System — follow phone**, **Light mode**, and **Dark mode**.
- Editable terminology for Sell/Benta, Sales/Halin, Products/Paninda, Purchases/Kumprada, Inventory/Stock ng Paninda, Credit/Utang, product credit, cash loans, Expenses/Gastos, Analytics/Kita at Tubo, Reports/Talaan, Gross Profit/Tubo sa Paninda, Net Profit/Natirang Tubo, purchase spending, low stock, and out of stock.
- One-tap **Sari-sari Terms** and **Standard Terms** presets.
- Reusable `.posconfig` export/import containing only appearance and terminology, with no sales, products, stock, customers, loans, or other business records.
- `docs/CASH-LOANS.md` and `docs/CUSTOMIZATION.md` documentation.
- `preferences.js`, `preferences.css`, and `brand.js` cached for offline web use.

### Changed

- Web app manifest now installs/displays as **SariPOS**.
- Settings wording is made friendlier for sari-sari store users, including **Ayos ng App** and **Itsura at Mga Tawag** presentation.
- Existing saved terminology/theme preferences are preserved; sari-sari defaults apply only when no UI config exists yet.
- GitHub repository name remains `POSLITE` for now to avoid breaking current GitHub Pages/build links.
- Internal compatibility identifiers such as existing database/package/local-storage names are not force-renamed yet.
- Cash-loan principal repayments are kept outside Sales and Profit; only actual collected interest is treated as loan interest income.
- Native Android receipt output changed from the WebView/Android PrintManager/PDF path to native Android bitmap/JPG generation.
- Native receipt JPG uses lightweight compression and safe Android sharing/storage handling.
- Web Service Worker cache now includes cash-loan, appearance/custom-term, and SariPOS branding assets.

### Fixed

- Native Android receipt output is guarded so save/share failures provide feedback instead of closing the app through the previous print/PDF path.
- Added Android FileProvider handling for safe JPG receipt sharing.

## [0.3.0-native-dev] - 2026-09-05

### Added

- Native Android application under `android-native/` while preserving the working web/PWA build as a stable reference and fallback.
- Kotlin + Jetpack Compose Android UI with smartphone-first navigation for Home, Sell, Products, and More.
- Native SQLite operational database `poslite-native.db` independent from browser IndexedDB.
- Native Android database tables for products, product units, sales, sale items, purchases, purchase items, stock movements, customers, credit ledger, expenses, and settings.
- Native product management with optional/no barcode, piece/gram/milliliter base units, multiple sell/buy conversions, prices, opening stock/cost, and low-stock thresholds.
- Native Sell workflow with product search, unit selection, cart, stock validation, discount, cash/change, optional cash-customer name, and credit/utang checkout.
- Android-native barcode/QR capture path using Google Code Scanner during development.
- Native Purchases / Stock In with unit conversion, weighted-average inventory costing, purchase history, and stock movement recording.
- Native Inventory adjustments with Add, Remove, Set, and reason/note.
- Native customer credit/utang records and payment recording.
- Native expense recording.
- Native 7/30/90/365-day Analytics for Sales, COGS, Gross Profit, Expenses, Estimated Net, and Purchase Spend.
- Native sale receipt generation after successful checkout, recent receipt history, JPG save/share output, and Android-local receipt handling.
- Native store settings for store name, owner, and address.
- GitHub Actions workflow `.github/workflows/android-native-build.yml` that builds `:app:assembleDebug` and uploads the debug APK when successful.
- Native Android implementation documentation in `docs/ANDROID-NATIVE.md`.

### Changed

- Android is no longer only a future roadmap item; native Android development is now active in the repository.
- The web/PWA app remains available at repository root and is intentionally not replaced while native Android is validated.
- Android operational data uses local SQLite. `data/receipts.json` remains development/mock data only and is not the live Android transaction database.
- Native Android build configuration was migrated to Android Gradle Plugin 9.4 built-in Kotlin, Gradle 9.6, JDK 17, and Android 17/API 37 compile tooling.

### Fixed during native build bring-up

- Corrected Android 17 SDK package installation in CI to `platforms;android-37.0` using current Android command-line tools.
- Migrated away from deprecated AGP 9 Kotlin opt-out configuration.
- Corrected Google Code Scanner package import in the Compose Sell screen.
- Corrected clickable Material3 receipt-card argument ordering.
- Improved product deletion feedback when a product is protected by transaction history.

### Native development limitations

- Native Android `.pos` import/export compatibility is not implemented yet.
- POSlite-generated product QR labels are not implemented yet.
- Direct Bluetooth thermal-printer integration is not implemented yet; current native receipt output is JPG save/share.
- Google Code Scanner can depend on a Google Play services scanner module; a fully bundled CameraX + ML Kit offline scanner remains a hardening option.
- Hold/resume sale, void/refund/return, and dedicated damaged/expired workflows are not implemented yet.
- Native build must pass the APK workflow before this development milestone is treated as a stable Android baseline.
- Actual-device Android UX testing is still required after a successful APK build.

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
- Explicit **Product has no barcode** option in Add/Edit Product for loose, repacked, local, produce, or other items without printed barcodes.
- No-barcode products remain fully usable in Sell through product-name/category search and touch selection without requiring a fake barcode.
- Duplicate barcode validation.
- Barcode-aware search and exact barcode + Enter lookup for keyboard-style scanners.
- Dedicated **Ready to Scan Barcode** panel on the Sell screen.
- One-tap scanner-input focus for Bluetooth/USB barcode scanners, including automatic ready-state refocus after a successful scan.
- Android-oriented phone camera barcode scanning using the browser `BarcodeDetector` API when supported, with rear-camera preference and retail barcode formats such as EAN, UPC, Code 128, Code 39, Codabar, and ITF.
- Scan feedback states for waiting, successful add-to-cart, barcode not found, out-of-stock, missing selling unit, unsupported browser, and camera-permission errors.
- Automatic add-to-cart after a successful camera barcode match using the product's first enabled selling unit.
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
- Service Worker cache bumped to `poslite-v0.2.0-scan2` and now includes `scanner.js`, `scanner.css`, and `no-barcode.js` for offline-loaded scanner and no-barcode UI behavior.

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
- Barcode scanning now has an explicit scanner-ready workflow instead of relying only on the general search box.
- Empty barcode remains the canonical stored value for products without barcodes, preserving v0.2 database and `.pos` backup compatibility without a schema migration.

### Fixed

- Same-product multi-unit sales now deduct stock cumulatively. Example: selling Candy by both Piece and Pack in one checkout deducts both quantities from the single base inventory instead of allowing one line to overwrite the other.
- Repeated lines for the same product in one purchase now accumulate stock and weighted-average cost correctly instead of recalculating each line from the original pre-purchase stock.
- Legacy product migration now checks and writes the raw IndexedDB product records so normalized v0.2 product data is actually persisted rather than only normalized in memory.

### Known limitations

- Camera barcode scanning depends on browser support for `BarcodeDetector`; unsupported browsers fall back to scanner-input/manual barcode entry.
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
