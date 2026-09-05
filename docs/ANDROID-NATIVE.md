# POSlite Native Android

## Status

POSlite now has a native Android implementation under `android-native/`. The existing web/PWA build remains in the repository as the stable workflow reference while native Android is validated on real devices.

**Native build baseline before JPG receipt fix:** `9f4acb298eb71cb13da5dcb863c1749acca50507`  
**Verified GitHub Actions run:** `Build POSlite Native Android` run #8 / run ID `33971137411`  
**Build result:** SUCCESS  
**APK artifact:** `POSlite-native-debug`

A newer Android receipt fix is being validated after a real-device report that the old PDF/print action could close the app.

## Native Android direction

The Android app is not a WebView wrapper. It uses native Android code and Android-local storage.

Technology:

- Kotlin
- Jetpack Compose UI
- Android SQLite via `SQLiteOpenHelper`
- direct Android Canvas/Bitmap receipt rendering
- JPG receipt save/share through MediaStore/FileProvider
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
- lightweight JPG receipt generation
- JPG quality set to about 68% to keep files small on phones
- Android 10+ saves receipts under `Pictures/POSlite`
- older supported Android versions use the app-safe Pictures directory
- JPG sharing through Android share intents
- FileProvider used for safe receipt image sharing
- receipt export/share errors are caught and shown as messages instead of allowing the app to close

### Settings

- store name
- owner
- address
- settings stored locally in SQLite

## Receipt JPG change — 2026-09-05

A real Android-device test reported that the previous `WebView + PrintManager` receipt path could close the application when attempting to generate/save a receipt.

The receipt output design was changed as follows:

1. removed the WebView-based receipt rendering path from `ReceiptTools.kt`
2. removed dependence on Android PrintManager for normal receipt export
3. receipt is now drawn directly using Android `Canvas` and `Bitmap`
4. image output is JPEG rather than PDF
5. JPEG compression quality is approximately 68% for a smaller development/test file
6. Android 10+ uses MediaStore and the `Pictures/POSlite` folder
7. cache/app-specific image files use FileProvider for safe sharing
8. compatibility actions catch save/share errors and display a Toast instead of allowing an uncaught receipt-export exception to close the app

Files added/changed for this fix:

- `android-native/app/src/main/java/ph/poslite/app/ReceiptTools.kt`
- `android-native/app/src/main/java/ph/poslite/app/ReceiptCompat.kt`
- `android-native/app/src/main/AndroidManifest.xml`
- `android-native/app/src/main/res/xml/file_paths.xml`

The sale transaction itself remains separate from receipt rendering. A failed image save/share must not create, duplicate, cancel, or roll back a completed sale.

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

The workflow installs the Android toolchain, runs `:app:assembleDebug`, and uploads `app-debug.apk` as `POSlite-native-debug`.

No Android source change should be treated as the new stable native baseline until this workflow passes.

## Web compatibility

The root web application remains available and is not overwritten by `android-native/`.

This allows continued GitHub Pages testing, side-by-side behavior comparison, and rollback/reference while Android features are stabilized.

## Next native hardening tasks

- install and test the JPG-receipt build on an actual Android phone
- verify full Product -> Stock In -> Sell -> Receipt JPG -> Credit -> Analytics flow
- verify JPG is visible in Pictures/POSlite on Android 10+
- verify Share JPG to common Android apps
- change any remaining legacy UI wording from PDF/Print to JPG-only wording
- add `.pos` Android import/export compatibility
- add product QR label generation
- fully bundled offline CameraX + ML Kit scanner if required
- direct Bluetooth thermal-printer integration later
- void/refund/return flow
- damaged/expired inventory flow
- hold/resume sale
- encrypted backups
