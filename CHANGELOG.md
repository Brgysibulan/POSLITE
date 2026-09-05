# Changelog

All notable POSlite development changes are documented here.

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

- Dialog Cancel and Close controls are now explicitly non-submitting so they cannot accidentally trigger a form save.

### Technical decisions

- Web-first development before native Android implementation.
- POSlite is now explicitly Android smartphone-first; the web build remains the workflow/prototype base and should use portrait-first, touch-first, minimal-typing design decisions.
- Vanilla HTML/CSS/JavaScript for the initial MVP.
- IndexedDB selected instead of `localStorage` for operational data.
- `.pos` defined as POSlite's portable backup extension.
- Native Android remains the target after web stabilization, planned with Kotlin, Jetpack Compose, and Room/SQLite.
- Basic automated syntax/file validation is kept in the repository to protect the working web baseline.
- Barcode and QR Code support are official roadmap items.
- Planned barcode support includes product barcode fields, barcode search, camera scanning where supported, and compatibility with keyboard-style USB/Bluetooth scanners.
- Planned QR Code support includes QR product lookup, POSlite-generated QR labels for custom/unbarcoded products, and optional receipt transaction-reference QR codes.
- Barcode/QR identifiers will be included in `.pos` backup/restore after the scanning feature is implemented.
- A base-unit inventory model is now part of the roadmap so products can be purchased in bulk and sold by smaller units such as kilo, half-kilo, pack, piece, sachet, bottle, case, stick, or ream.
- Purchases/Stock In will be recorded as transactions with supplier, quantity, purchase unit, converted base quantity, purchase cost, and stock movement history.
- Weighted-average cost is the planned default costing method for inventory purchases, while completed sales preserve their historical cost basis.
- Profitability Analytics is planned at both per-product and whole-store level, including revenue, COGS, gross profit, margin, expenses, estimated net profit, inventory value, and product rankings.
- Credit sales will count as sales when goods leave inventory; later credit collections will be tracked separately as cash inflow to avoid double-counting revenue.

### Known limitations

- `.pos` backups are not encrypted yet.
- Advanced tingi/unit conversion is not implemented yet.
- Purchases/Stock In ledger and weighted-average costing are planned but not yet implemented.
- Per-item and full-store profitability Analytics based on purchase history are planned but not yet implemented.
- Barcode scanning is planned but not yet implemented.
- QR Code scanning/generation is planned but not yet implemented.
- Supplier, receipt printer, hold sale, void/refund, and multi-user permission features are planned for later versions.
