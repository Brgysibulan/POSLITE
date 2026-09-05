# SariPOS Patch Notes

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
