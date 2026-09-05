# POSlite Patch Notes

## Latest patch — Sari-sari Terms, Theme & Reusable Config

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

### Validation

- Web validation includes syntax checking for `preferences.js` and required customization assets/documentation.
- The feature is smartphone-first and intended to be reviewed on the web build before native Android parity is implemented.

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
- Android 10+ saved receipts target **Pictures/POSlite**.
- Receipt sharing sends the JPG image.
- Receipt output remains independent from sale creation, so saving/sharing never creates a duplicate sale.

### Verified native build

- Workflow: **Build POSlite Native Android**
- Hotfix run: **#12**
- Run ID: `33972988985`
- Result: **SUCCESS**
- Artifact: `POSlite-native-debug`
- Artifact SHA-256 (ZIP): `7ca1eae993443e8273a9a8caf2064b74f0beb06accd32ec55a838a5c02faaa87`

---

## Documentation rule

Every POSlite feature, bug fix, technical decision, build milestone, database/config change, and user-visible behavior change must be documented alongside development. `CHANGELOG.md` and `docs/PROJECT.md` remain the master project history/status references.
