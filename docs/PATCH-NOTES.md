# POSlite Patch Notes

## Latest patch — Native Android JPG Receipt Hotfix

**Date:** 2026-09-05  
**Track:** `0.3.0-native-dev`  
**Status:** Development / device-testing build

### Fixed

- Replaced the receipt WebView + Android PrintManager/PDF path that could cause the app to close during receipt output on some Android devices.
- Receipt output is now generated directly as a native Android bitmap/JPG instead of PDF.
- Added guarded save/share error handling so receipt output failures show feedback instead of closing the app.
- Added Android FileProvider configuration for safe JPG sharing to other apps.

### Changed

- Receipt file format: **PDF → JPG**.
- JPG compression quality is approximately **68%** to keep receipt files lightweight for smartphone use.
- On Android 10 and newer, saved receipts are written to **Pictures/POSlite**.
- On older supported Android versions, receipt images use an app-safe Pictures location.
- Receipt sharing now sends the generated JPG image rather than relying on the Android print/PDF workflow.
- Sale records remain stored in SQLite independently of receipt image generation; saving/sharing a receipt does not create another sale.

### Verified build

- Native Android workflow: **Build POSlite Native Android**
- Verified hotfix run: **#12**
- Run ID: `33972988985`
- Result: **SUCCESS**
- Artifact: `POSlite-native-debug`
- Artifact SHA-256 (ZIP): `7ca1eae993443e8273a9a8caf2064b74f0beb06accd32ec55a838a5c02faaa87`

### Previous native fixes included in the current development line

- Correct Android 17/API 37 SDK package setup in CI.
- AGP 9.4 built-in Kotlin migration.
- Correct Google Code Scanner import and native barcode/QR scanner compilation.
- Material3 receipt-history card compile fix.
- Product delete protection feedback for products already used by transactions.
- Native SQLite POS data layer for products, sales, purchases, stock movements, credit, expenses, receipts, and settings.

### Still to validate on a real Android phone

- Complete Sale → receipt dialog → Save JPG.
- Complete Sale → Share JPG.
- Receipt image readability for short and long item lists.
- Barcode/QR scan behavior on the target Android device.
- Product → Purchase/Stock In → Sell → Inventory → Analytics end-to-end totals.
- Credit/utang sale and payment flow.

### Planned follow-up

- Rename any remaining old receipt UI wording from **Print / Save PDF** to **Save JPG** and **Share JPG** everywhere it still appears.
- Add Android `.pos` import/export compatibility.
- Add POSlite-generated product QR labels.
- Add direct Bluetooth thermal-printer support later.
- Add void/refund/return and damaged/expired inventory workflows.

---

## Documentation rule

Every POSlite feature, bug fix, technical decision, build milestone, database change, and user-visible behavior change must be documented alongside development. This patch-note file records user-facing development patches; `CHANGELOG.md`, `docs/PROJECT.md`, and `docs/ANDROID-NATIVE.md` remain the master history and architecture references.
