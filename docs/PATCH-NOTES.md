# SariPOS Patch Notes

## Latest patch — Cash Closing, Credit Ledger, and Loss Analytics

**Date:** 2026-09-07
**Track:** `0.7.0-native-dev`
**Status:** Source complete / GitHub Actions and real-device verification pending

### Added

- **Cash Closing** screen with user-entered opening cash and actual counted cash.
- Expected-cash calculation from opening cash + completed cash sales + recorded credit payments − expenses.
- Variance display, optional note, multiple shift closings, and recent closing history.
- Closing periods begin at local midnight or the previous closing timestamp, whichever is later, so multiple shifts do not double-count activity.
- Customer **Ledger** viewer showing credit sales, payments, void reversals, dates, and transaction references.
- Analytics cards for cost-valued damaged and expired inventory loss.
- `cash_closings` table via database migration version 4.
- Native backup schema version 3 including cash closings, with backward restore support for native schema 1 and 2.

### Changed

- Native build advanced to `0.7.0-native-dev` / version code 5.
- **Natirang Tubo** now subtracts damaged and expired inventory loss at the stored movement cost, in addition to normal expenses.

### Cash boundary

- Purchase spending is shown in Analytics but is not subtracted from expected drawer cash because native Kumprada does not yet store whether payment came from the drawer, bank, supplier credit, or another source.
- Cash closing records are immutable snapshots. Later corrections appear in the next closing period instead of silently rewriting a signed-off count.

### Verification checklist

- GitHub Actions Android build: pending.
- Run two closings in one day and confirm the second period starts at the first closing time.
- Compare cash sales, credit payments, expenses, expected cash, actual cash, and variance against manual totals.
- Verify customer ledgers after credit sale, payment, and void reversal.
- Verify damaged/expired costs reduce Natirang Tubo exactly once.
- Restore native backup schemas 1, 2, and 3.

---

## Previous patch — Transaction Correction and Stock Loss Controls

**Date:** 2026-09-07
**Track:** `0.6.0-native-dev`
**Status:** GitHub Actions build successful / real-device verification pending

### Added

- **Void / Return** on completed receipts with a required reason and explicit confirmation.
- Atomic full-sale reversal that restores every sold base-unit quantity and records `sale_void` stock movements.
- Credit-sale reversal that reduces the customer balance and adds a credit-ledger reversal entry.
- Conservative credit safeguard: void is blocked when a customer payment was recorded after that credit sale, because the current ledger cannot safely allocate a payment to one invoice.
- Dedicated **Sirang paninda**, **Expired na paninda**, and **Physical count** inventory actions.
- Sale status, void timestamp, and void reason columns through database migration version 3.
- Voided markings in receipt history, receipt detail, text sharing, and generated JPG receipts.
- Backup schema version 2 for the sale lifecycle fields, while restore still accepts native schema-1 backups and supplies safe defaults.

### Accounting behavior

- Voided sales remain in history for auditability; rows are not deleted.
- Dashboard sales, transaction count, COGS, gross profit, and date-range analytics include only completed sales.
- A full void restores stock at the original sold base quantity. It does not recalculate weighted-average inventory cost.
- Damaged/expired deductions retain the product's current average base cost on their stock-movement record.
- Physical count writes only the difference between previous and counted stock.

### Current boundary

- This patch provides full-sale correction, not partial line-item returns or exchanges.
- Credit void is deliberately blocked after a later customer payment until invoice-level payment allocation is implemented.

### Verification checklist

- GitHub Actions `Build SariPOS Native Android` run #22 passed at commit `69df5615b2f7eebaa68efbd7c8b724464129d8e9`.
- Run ID: `34119598557`.
- Artifact: `SariPOS-native-debug` (`10017672875`).
- Artifact ZIP digest: `sha256:c8966c2417fb23f7663313ab8e9b7242d445e28f0079d439926dfb81393c2bdc`.
- Web/document validation run #115 passed.
- Void cash and credit sales and verify stock, movements, balances, receipt status, dashboard, and analytics.
- Confirm second void attempts are rejected.
- Confirm credit void is rejected after a later customer payment.
- Record damaged, expired, and physical-count changes for piece and gram/kilo products.
- Restore both native backup schema 1 and schema 2.

---

## Previous patch — Native Android Data Safety Foundation

**Date:** 2026-09-07
**Track:** `0.5.0-native-dev`
**Status:** GitHub Actions build successful / real-device verification pending

### Added

- Full native Android `.pos` backup export using the Android system file picker.
- Restore picker with backup validation and a preview of product, sale, purchase, customer, expense, and export-date totals.
- Explicit destructive confirmation before replacing local data.
- Atomic SQLite restore: failed validation or insertion rolls the transaction back and preserves the previous database.
- Persistent draft cart storage so unfinished cart lines recover after app restart or Android process death.
- SQLite schema migration from database version 1 to 2 without recreating existing transaction tables.
- Dedicated backup/restore behavior and test checklist in `docs/BACKUP-RESTORE.md`.

### Changed

- Native Android development build advanced to `0.5.0-native-dev` / version code 3.
- Successful checkout now clears both the visible cart and its saved draft.
- Settings now explains that restore replaces the current phone data and recommends a backup before changing/resetting a phone.

### Data-format decision

- Native backup format: `SariPOS-Android`, schema version 1.
- The backup includes every current native operational table plus the unfinished draft cart.
- This release does not claim compatibility with web/PWA `POSlite` schema 1/2 `.pos` files. Cross-platform conversion remains separate work.

### Preserved

- Weighted-average inventory cost, base-unit conversions, saved sale-item COGS, immediate stock deduction for credit sales, existing package name, and existing SQLite filename.

### Verification checklist

- GitHub Actions `Build SariPOS Native Android` run #21 passed at commit `4e5ea36b849b954155c08646b55d789667470804`.
- Run ID: `34118596450`.
- Artifact: `SariPOS-native-debug` (`10017300710`).
- Artifact ZIP digest: `sha256:6e1a51aff17d060ad3ab866e9fecf9d3ce543ef1339efd18b1ac4c2ea26958bd`.
- Web/document validation run #113 also passed.
- Export a populated store, inspect the file, alter local data, restore, and compare all module totals.
- Force-stop with a non-empty cart, reopen, and confirm valid cart lines recover.
- Try a malformed, incomplete, web-format, and unsupported-schema backup; current data must remain unchanged.
- Upgrade an existing version-code-2 install and confirm old products and transactions remain available.

---

## Previous patch — Native Android Portrait Checkout Hardening

**Date:** 2026-09-07
**Track:** `0.4.0-native-dev`
**Status:** GitHub Actions build successful / real-device verification next

### Added

- Portrait-first native **Benta** workflow with a full-width search/scanner row and full-width product list.
- Persistent cart summary showing cart line count and current total.
- Separate Material 3 bottom-sheet cart and checkout so products and checkout are no longer squeezed into two phone columns.
- Decimal Android keyboards for transaction amounts, quantities, costs, stock adjustments, credit payments, and expenses.
- Strict reusable number validation with sari-sari-friendly error feedback.
- Night resource styling so Android system/status/navigation bars match SariPOS dark mode.

### Changed

- Successful barcode/QR product lookup now returns to the complete product list after adding the scanned item.
- Android development version advanced from `0.3.0-native-dev` / version code 1 to `0.4.0-native-dev` / version code 2.
- Analytics windows now begin at local midnight for the first included calendar day instead of subtracting raw 24-hour blocks from the current time.
- Product, purchase, stock adjustment, credit payment, and expense forms reject invalid values instead of silently converting invalid text to zero.
- Several remaining Android action labels were changed to clearer Filipino wording.

### Fixed

- Added the required Material 3 experimental API opt-in after build #19 correctly rejected the new bottom-sheet call during Kotlin compilation.
- Fixed the older-Android receipt FileProvider mismatch: receipt code writes to `Pictures/SariPOS`, and the allowed provider path now points to the same folder instead of the legacy `Pictures/POSlite` folder.
- Stock removal now rejects a quantity greater than available stock instead of silently clamping stock to zero.
- Purchase records now require positive quantity and purchase cost.
- Expense records now require a positive amount.
- Checkout now validates payment type, cart quantities, discount, and cash before saving.

### Preserved

- Base-unit piece/pack and gram/kilo conversion rules.
- Weighted-average inventory costing and COGS behavior.
- Immediate stock deduction for product-credit sales.
- Existing package name, SQLite filename, and web/PWA reference build for compatibility.

### Verification checklist

- GitHub Actions `Build SariPOS Native Android` run #20 passed at commit `31a2706b1c11e1c6a7b796a6b6777f7a3202564b`.
- Run ID: `34116453362`.
- Artifact: `SariPOS-native-debug` (`10016481499`).
- Artifact ZIP digest: `sha256:aa0134d6ffe070d65b05003fe75522976802771ebb0037a445804feb31c40ab3`.
- Test on a portrait Android phone: search/scan → add products → open cart → cash/utang checkout → JPG receipt.
- Test Save/Share JPG on Android 8–9 and Android 10+.
- Test invalid and negative inputs across products, purchases, stock, credit payments, expenses, discount, and cash.

---

## Latest patch — Native Android User-Friendly SariPOS UI

**Date:** 2026-09-05  
**Track:** `0.3.0-native-dev`  
**Status:** Built successfully / Android device testing next

### Added

- Native Android **About SariPOS** card inside **Ayos ng App / Settings**.
- App purpose text for sari-sari stores and small retailers.
- Creator credit: **Created & Developed by Joshua Apal Pudi**.
- Friendlier Android wording throughout major store workflows, including **Benta, Halin, Paninda, Kumprada, Utang, Gastos, Kita at Tubo, Resibo / Talaan,** and **Ayos ng App**.
- More understandable product-entry labels for starting stock, purchase cost, selling units, and stock warnings.

### Changed

- Native Home branding now shows **SariPOS** instead of the old POSlite development name.
- Main Android navigation now uses store-friendly labels such as **Benta, Paninda,** and **Iba Pa**.
- Native receipt dialog now explicitly uses **Save JPG** and **Share JPG** instead of the old PDF wording.
- Receipt save/share calls now connect directly to `saveReceiptJpg` and `shareReceiptJpg`.
- JPG receipt user-facing branding, filename, share subject, and footer now use **SariPOS**.
- Android 10+ receipt images now save under **Pictures/SariPOS**.
- Internal package/database compatibility identifiers may still retain `poslite` where changing them would risk existing data/build compatibility.

### Fixed

- Removed the stale native Compose calls to the old `printReceipt` / `shareReceipt` path that no longer matched the JPG receipt implementation.
- Receipt save/share failures are guarded with Android feedback instead of closing the app.

### Verified native build

- Workflow: **Build POSlite Native Android**
- Latest run: **#15**
- Run ID: `33976320017`
- Head commit: `e004dc557de93b6b7664b932c3d50a02b8f81845`
- Result: **SUCCESS**
- Artifact: `POSlite-native-debug`
- Artifact ID: `9972426146`
- Artifact ZIP SHA-256: `9929ea484e0c75330b4467c53650d54683e32ad0fecfb4cf470df8385bae7d71`
- Extracted APK SHA-256: `56b27115b33e89809550dd29160a6b7ef3605f78d6ca7da881647768c046eba4`

### Device-test checklist

- Install/open SariPOS on an Android phone.
- Add a Paninda and verify simple labels.
- Record a Kumprada / Stock In.
- Complete a Benta and confirm stock deduction.
- Open the generated Resibo and test **Save JPG** and **Share JPG**.
- Check that the JPG appears under **Pictures/SariPOS** on Android 10+.
- Open **Ayos ng App** and verify the About SariPOS creator/purpose card.

---

## Previous patch — Sari-sari Terms, Theme & Reusable Config

**Date:** 2026-09-05  
**Track:** Web workflow prototype feeding `0.3.0-native-dev`  
**Status:** Development / Android-first web validation

### Added

- **Settings → Appearance & Custom Terms**.
- Appearance choices: **System — follow phone**, **Light mode**, and **Dark mode**.
- Editable store wording for Benta/Sell, Halin/Sales, Paninda/Products, Kumprada/Purchases, Stock/Inventory, Utang/Credit, Pautang na Pera, Gastos/Expenses, Kita at Tubo/Analytics, Talaan/Reports, Tubo sa Paninda/Gross Profit, Natirang Tubo/Net Profit, and stock-warning terms.
- One-tap **Sari-sari Terms** preset.
- One-tap **Standard Terms** reset.
- Reusable `.posconfig` export/import for appearance and wording only.
- `.posconfig` explicitly excludes products, stock, purchases, sales, customers, loans, payments, expenses, receipts, and transaction history.
- Dark-mode styling for main POS panels, navigation, forms, dialogs, product/cart elements, and cash-loan UI while keeping receipt paper white/readable.
- Offline caching for `preferences.js` and `preferences.css`.
- Documentation in `docs/CUSTOMIZATION.md`.

### Design decisions

- Custom terminology is presentation-only and cannot alter internal accounting or inventory rules.
- `System` appearance follows the device/Android color-scheme preference.
- `.pos` remains business-data backup; `.posconfig` is reusable appearance/wording only.
- The web implementation is the workflow prototype for the future native Android Settings port using the same config concepts.

### Cash-loan workflow included in current web test line

- Credit now separates **Utang sa Paninda** from **Pautang na Pera**.
- Cash loans support principal, optional interest, payments, remaining balance, and Unpaid / Partial / Interest Pending / Fully Paid status.
- Principal returned is not treated as Sales or Profit; only actual collected interest is loan interest income.

---

## Previous patch — Native Android JPG Receipt Hotfix

### Fixed

- Replaced the receipt WebView + Android PrintManager/PDF path that could cause the app to close during receipt output on some Android devices.
- Receipt output is generated directly as a native Android bitmap/JPG.
- Added guarded save/share error handling.
- Added Android FileProvider configuration for safe JPG sharing.

### Changed

- Receipt format: **PDF → JPG**.
- JPG compression quality is approximately **68%** for lightweight smartphone receipts.
- Receipt sharing sends the JPG image.
- Receipt output remains independent from sale creation, so saving/sharing never creates a duplicate sale.

### Verified native build

- Workflow: **Build POSlite Native Android**
- Hotfix run: **#12**
- Run ID: `33972988985`
- Result: **SUCCESS**

---

## Documentation rule

Every SariPOS feature, bug fix, technical decision, build milestone, database/config change, and user-visible behavior change must be documented alongside development. `CHANGELOG.md` and `docs/PROJECT.md` remain the master project history/status references.
