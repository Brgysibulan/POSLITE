# POSlite

POSlite is an offline-first point-of-sale system designed for sari-sari stores and similar micro-retail businesses.

## Current development status

- **Web reference:** v0.2.0 at repository root
- **Native Android development:** v0.3.0-native-dev under `android-native/`
- **Primary product direction:** Android smartphone-first
- **First verified native APK baseline:** commit `9f4acb298eb71cb13da5dcb863c1749acca50507`
- **Native Android build:** GitHub Actions run #8 — SUCCESS
- **APK artifact:** `POSlite-native-debug`

The existing web/PWA application remains the stable workflow reference while the native Android implementation is tested on real devices. The Android app is a real Kotlin/Jetpack Compose application, not a WebView wrapper.

## Native Android stack

- Kotlin
- Jetpack Compose
- Android SQLite (`poslite-native.db`)
- Android Print Framework / Save as PDF
- Android share intents
- Google Code Scanner development integration for barcode/QR capture
- Android Gradle Plugin 9.4 built-in Kotlin
- Gradle 9.6
- JDK 17
- Android 17/API 37 compile tooling

## Native Android functions implemented

- Home dashboard with sales today, transactions, gross profit, total credit, and low-stock count
- Sell / checkout with search, native scan action, selling-unit selection, cart, discount, cash/change, and credit/utang
- Optional customer name for cash sales and saved customer requirement for credit sales
- Products with optional/no barcode, categories, piece/gram/milliliter base units, low-stock threshold, opening stock/cost, and multiple sell/buy unit conversions
- Purchases / Stock In with supplier, multiple lines, unit conversions, weighted-average costing, and stock movements
- Inventory with base-unit stock and Add / Remove / Set adjustments
- Credit / Utang customers, balances, and payment recording
- Expenses
- Analytics for 7/30/90/365 days: Sales, COGS, Gross Profit, Expenses, Estimated Net, and Purchase Spend
- Native receipt generation after successful checkout
- Receipt history, Android Share, Print, and Save-as-PDF path with an 80 mm-oriented layout
- Store settings stored locally in SQLite

## Native Android database

The Android app uses local SQLite rather than browser IndexedDB.

Tables:

- `products`
- `product_units`
- `sales`
- `sale_items`
- `purchases`
- `purchase_items`
- `stock_movements`
- `customers`
- `credit_ledger`
- `expenses`
- `settings`

GitHub JSON files such as `data/receipts.json` are development/mock data only. No GitHub personal access token is embedded in the web or Android application.

## Inventory and unit model

Every product has one base unit and every purchase/sale converts to that base quantity before inventory changes.

### Candy example

- Base unit: `piece`
- Piece = 1 piece
- Pack = 50 pieces

Buying 4 packs adds 200 pieces. Selling 3 pieces deducts 3; selling one pack deducts 50 from the same stock source.

### Rice example

- Base unit: `gram`
- 250 g = 250 grams
- 500 g = 500 grams
- 1 kg = 1,000 grams
- 25 kg sack = 25,000 grams

Buying two 25 kg sacks adds 50,000 grams. Selling 1.25 of a configured 1 kg unit deducts 1,250 grams.

Selling price remains independent from conversion quantity, so a pack or kilo can have its own selling price.

## Purchase costing and profit

POSlite uses weighted-average inventory cost.

`Gross Profit = Sales Revenue - Cost of Goods Sold (COGS)`

`Estimated Net Profit = Gross Profit - Recorded Operating Expenses`

Inventory purchases are tracked separately from operating expenses. Their cost becomes COGS as inventory is sold. Credit/utang sales count when goods leave inventory; later collections are not counted again as new sales.

## Barcode / QR behavior

### Native Android

The development app has a native scan action using Google Code Scanner. A scanned value is matched against the product barcode field and a matching product can be added to the cart.

Products without printed barcodes remain fully usable through name/category search and touch selection.

The scanner can capture QR values as well, but POSlite-generated product QR label creation is still a separate planned feature.

### Web reference

The root web build keeps its browser-based scanner workflow and offline IndexedDB data for continued testing/comparison.

## Receipts

Native Android receipts include:

- store name/address
- transaction number
- date/time
- customer
- payment type
- item name
- quantity/unit
- unit price
- line amount
- subtotal
- discount
- total
- cash/change or credit

Receipts can be viewed from recent receipt history, shared through Android, or sent through Android Print / Save as PDF.

Direct Bluetooth thermal-printer integration remains a later native hardening feature.

## Android build validation

Workflow: `.github/workflows/android-native-build.yml`

The first verified native build completed successfully on run #8. It passed Android SDK setup, Gradle setup, `:app:assembleDebug`, and artifact upload.

The uploaded artifact is `POSlite-native-debug`. Future native source changes must continue to pass this workflow before they replace the current native baseline.

## Web/PWA reference

The root application remains available for GitHub Pages testing and workflow comparison. Its main architecture is:

- HTML/CSS/Vanilla JavaScript
- IndexedDB
- Service Worker / PWA
- `.pos` schema version 2 backup/restore

This web build is intentionally preserved while the native Android app is stabilized.

## Remaining native priorities

1. Install and test the verified debug APK on an actual Android phone.
2. Test Products → Purchase → Sell → Receipt → Credit → Analytics end to end using real sample transactions.
3. Test barcode scanning on the target Android device.
4. Add Android `.pos` import/export compatibility.
5. Add POSlite-generated product QR labels.
6. Harden scanner behavior; optionally move to a fully bundled CameraX + ML Kit scanner if complete offline model availability is required.
7. Add direct Bluetooth thermal-printer integration.
8. Add hold/resume, void/refund/return, and damaged/expired inventory workflows.
9. Add encrypted/protected backups.

## Documentation

- `docs/PROJECT.md` — master project documentation
- `docs/ANDROID-NATIVE.md` — native Android architecture, successful build baseline, and migration status
- `docs/BARCODE-SCANNER.md` — scanner behavior
- `docs/RECEIPTS.md` — receipt behavior
- `CHANGELOG.md` — implementation history

## Documentation rule

Every implemented POSlite feature, change, technical decision, bug fix, database change, backup-format change, Analytics change, and project milestone must be documented alongside development.
