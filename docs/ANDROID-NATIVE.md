# POSlite Native Android

## Status

POSlite now has a native Android implementation under `android-native/`. The existing web/PWA build remains in the repository as the stable workflow reference while native Android is validated on real devices.

**Native build baseline:** `9f4acb298eb71cb13da5dcb863c1749acca50507`  
**GitHub Actions run:** `Build POSlite Native Android` run #8 / run ID `33971137411`  
**Build result:** SUCCESS  
**APK artifact:** `POSlite-native-debug`  
**Artifact size:** approximately 12.3 MB  
**Artifact SHA-256 digest (ZIP):** `0d69dc71c99f109b0dad78805256f9cecfb4271b274a1a2cdf0434dce86e52d4`

The debug APK successfully passed Android SDK setup, Gradle setup, `:app:assembleDebug`, and GitHub artifact upload.

## Native Android direction

The Android app is not a WebView wrapper. It uses native Android code and Android-local storage.

Technology:

- Kotlin
- Jetpack Compose UI
- Android SQLite via `SQLiteOpenHelper`
- Android native print framework for receipts
- Android share intents for receipt sharing
- Google Code Scanner Android API for barcode and QR capture during development
- Android API 37 compile SDK, target API 36, minimum API 26
- Android Gradle Plugin 9.4 built-in Kotlin
- Gradle 9.6
- JDK 17

## Native modules implemented in source

### Home

- sales today
- transaction count
- gross profit today
- total credit
- low-stock count
- shortcuts to Sell and Stock In

### Sell / Checkout

- touch-first Android product browser
- name/category/barcode search
- native scan button
- barcode and QR capture path
- automatic product lookup for an assigned barcode
- selectable selling units
- cart
- piece and decimal quantity behavior
- discount
- cash payment
- cash received and change
- optional customer name for cash sale
- credit/utang payment mode
- credit customer selection
- stock validation before checkout
- automatic stock deduction
- stock movement record
- automatic receipt generation

### Products

- add product
- edit product
- no-barcode option
- optional unique barcode
- category
- base unit: piece, gram, or milliliter
- opening stock
- opening cost per base unit
- low-stock threshold
- multiple units/conversions
- separate selling price per unit
- Sell / Buy enable flags per unit
- unused-product delete guard with transaction-history feedback

Examples remain the same as the web model:

- Candy: base `pc`; Piece = 1; Pack = 50
- Rice: base `g`; 250 g = 250; 500 g = 500; 1 kg = 1000

### Purchases / Stock In

- supplier
- multiple purchase lines
- product
- purchasing unit
- quantity
- total line cost
- purchase total
- conversion to base inventory
- weighted-average cost update
- purchase history database record
- stock movement record

### Inventory

- product stock display
- average base cost
- add/remove/set stock adjustments
- adjustment reason

### Credit / Utang

- customer records
- contact
- balance
- credit checkout
- payment recording
- credit ledger storage

### Expenses

- category
- description
- amount
- expense history

### Analytics

- 7/30/90/365 day windows
- Sales
- COGS
- Gross Profit
- Expenses
- Estimated Net
- Purchase Spend

### Receipts / Reports

- native sale receipt history
- customer name
- transaction number
- date/time
- line items
- unit/quantity/price
- subtotal
- discount
- total
- cash/change or credit
- Android print dialog
- Save as PDF through Android print destinations
- Android share intent
- 80 mm-oriented print HTML

### Settings

- store name
- owner
- address
- settings stored locally in SQLite

## Native database

File: `poslite-native.db`

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

The Android database is independent from browser IndexedDB. This avoids coupling the APK to a web browser database.

## GitHub development database

`data/receipts.json` remains development/mock data only. It is not the live Android transaction database.

No GitHub personal access token is embedded in the APK or web source.

For current Android development, operational transactions are stored in the Android device SQLite database.

## Barcode and QR behavior

The native Android development build uses the Google Code Scanner API, which provides Android-native barcode/QR capture without the web `BarcodeDetector` dependency.

Product lookup follows POSlite rules:

- barcode assigned to product -> scan can add the product
- no barcode -> product remains searchable/tappable
- QR capture is available through the same scanner path
- POSlite-generated product QR labels are still a separate planned feature

A later hardening phase can switch to a fully bundled custom CameraX + ML Kit scanner if scanner-model availability without a Google Play services module dependency is required.

## Receipt rule

A receipt is generated only after a successful sale transaction. Receipt rendering never creates a second sale.

Cash sale:

- customer name is optional
- blank customer becomes `Walk-in Customer`
- cash and change appear on the receipt

Credit sale:

- a saved credit customer is required
- the sale increases outstanding balance
- the receipt identifies the credit customer

## Build validation

Workflow: `.github/workflows/android-native-build.yml`

The workflow:

1. checks out the repository
2. installs JDK 17
3. configures current Android command-line tools
4. installs `platforms;android-37.0`
5. configures Gradle 9.6
6. builds `:app:assembleDebug`
7. uploads `app-debug.apk` as `POSlite-native-debug`

Run #8 completed every build step successfully and uploaded the first verified native Android debug APK artifact.

Future native source changes should continue to pass this workflow before being treated as a new stable native baseline.

## Web compatibility

The root web application remains available and is not overwritten by `android-native/`.

This allows:

- continued GitHub Pages testing
- side-by-side behavior comparison
- safer native migration
- rollback/reference while Android features are stabilized

## What “native Android baseline” means

The current milestone means:

- native Android source exists
- native SQLite data layer exists
- core POS workflows compile together
- native barcode/QR capture integration compiles
- native receipt print/share integration compiles
- GitHub Actions can build and package a debug APK

It does **not** yet mean production-ready or fully device-validated. Actual installation and transaction testing on Android hardware is still required.

## Next native hardening tasks

- install and test the generated APK on an actual Android phone
- verify add/edit product, no-barcode product, piece/pack/kilo conversions, purchase, sale, stock, credit, expense, analytics, and receipt end to end
- verify barcode scanning on the target Android device
- verify Android Print / Save PDF receipt flow
- add `.pos` Android import/export compatibility
- add product QR label generation
- fully bundled offline CameraX + ML Kit scanner if required
- direct Bluetooth thermal-printer integration
- void/refund/return flow
- damaged/expired inventory flow
- hold/resume sale
- encrypted backups
- move database work to a proper background repository/coroutine layer after workflow validation
