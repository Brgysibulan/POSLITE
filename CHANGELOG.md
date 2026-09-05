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
- Vanilla HTML/CSS/JavaScript for the initial MVP.
- IndexedDB selected instead of `localStorage` for operational data.
- `.pos` defined as POSlite's portable backup extension.
- Native Android remains the target after web stabilization, planned with Kotlin, Jetpack Compose, and Room/SQLite.
- Basic automated syntax/file validation is kept in the repository to protect the working web baseline.

### Known limitations

- `.pos` backups are not encrypted yet.
- Advanced tingi/unit conversion is not implemented yet.
- Supplier, barcode, receipt printer, hold sale, void/refund, and multi-user permission features are planned for later versions.
