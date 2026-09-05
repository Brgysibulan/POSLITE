# POSlite

POSlite is an offline-first point-of-sale web application designed for small sari-sari stores and similar micro-retail businesses.

## Current version

**Web MVP v0.1.0**

The current phase is intentionally web-first. The long-term target is a native Android application after the workflow, data model, and interface are stable.

## Core features

- Dashboard with daily sales, transactions, estimated profit, credit balance, low-stock items, and recent sales
- POS checkout with product search, category filtering, cart quantity controls, discount, cash payment, automatic change, and credit/utang sales
- Product management with category, cost, selling price, stock, unit, and reorder level
- Inventory monitoring and stock adjustments
- Customer credit/utang records and partial/full payment recording
- Expense recording
- Sales reports with date filtering
- CSV report export
- Offline Analytics including sales, gross profit, average ticket, expenses, product performance, low-stock insight, credit insight, and sales trend
- Portable `.pos` full backup and restore
- Responsive interface for desktop, tablet, and mobile
- Installable/offline web app support through a service worker

## Offline data architecture

POSlite stores operational data locally using **IndexedDB**. No cloud database, account, or internet connection is required for normal POS operation after the app has been loaded/cached.

Local object stores:

- `products`
- `sales`
- `customers`
- `expenses`
- `settings`

## `.pos` backup format

A `.pos` file is POSlite's portable backup package. In v0.1.0 it is a structured JSON document saved with the `.pos` extension.

It contains:

- format identifier
- schema version
- app version
- creation date/time
- store settings
- products
- sales history
- customers and credit balances
- expenses

Import validates the POSlite format and schema version before replacing the local data.

> Important: v0.1.0 backups are portable and structured but are not yet encrypted. Password-protected/encrypted backups are planned for a later version.

## Running the web version

Serve the repository through GitHub Pages or any static web server. No build process or external package installation is required.

Files:

- `index.html` — application structure
- `styles.css` — responsive UI
- `app.js` — IndexedDB, POS logic, reports, Analytics, backup/restore
- `manifest.webmanifest` — installable web app metadata
- `sw.js` — offline caching
- `docs/PROJECT.md` — project plan, decisions, and implementation documentation
- `CHANGELOG.md` — version history

## Development direction

1. Stabilize the web MVP.
2. Improve transaction, inventory, credit, and reporting workflows.
3. Harden `.pos` backup validation and add protected backups.
4. Add advanced sari-sari store unit conversion/tingi support.
5. Add barcode and receipt-related features.
6. Convert the stable system into a native Android application using Kotlin/Jetpack Compose and Room/SQLite while preserving the documented POSlite behavior.

## Documentation rule

Every implemented POSlite feature, change, technical decision, bug fix, and project milestone must be documented alongside development. See `docs/PROJECT.md` and `CHANGELOG.md`.
