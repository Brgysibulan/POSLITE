# POSlite Project Documentation

## Project identity

**Name:** POSlite  
**Current phase:** Web-first MVP  
**Current version:** v0.1.0  
**Target platform after web stabilization:** Native Android

## Project rule

All development work must be documented. This includes:

- implemented features
- changes and improvements
- technical decisions
- database/storage changes
- UI changes
- `.pos` format changes
- Analytics changes
- bug fixes
- version changes
- current progress and next steps

Documentation must be updated alongside implementation.

## Product goal

POSlite is a lightweight, offline-first point-of-sale system for sari-sari stores and small retail businesses. It should remain easy to operate, responsive on mobile devices, and usable without a cloud account or permanent internet connection.

## Current architecture

### Web application

- HTML
- CSS
- Vanilla JavaScript
- IndexedDB for local operational data
- Service Worker for cached/offline web assets
- Web App Manifest for installable/PWA behavior

No external framework or cloud database is required in v0.1.0.

### Local database stores

1. `products`
2. `sales`
3. `customers`
4. `expenses`
5. `settings`

## Implemented features — v0.1.0

### Dashboard

- Sales Today
- Transaction count
- Estimated Profit
- Total Credit
- Low-stock list
- Recent sales list
- New Sale shortcut

### POS

- Product search
- Category filter
- Product cards
- Cart
- Add/remove quantity
- Stock-aware quantity limits
- Discount
- Cash payment
- Automatic change calculation
- Credit/utang payment mode
- Customer selection for credit
- Complete Sale
- Automatic inventory deduction after sale

### Products

- Add product
- Edit product
- Delete unused product
- Product name
- Category
- Cost price
- Selling price
- Current stock
- Unit
- Low-stock/reorder level
- Search and category filtering

### Inventory

- Current stock display
- Low-stock status
- Out-of-stock status
- Inventory value based on cost
- Add stock
- Remove stock
- Set exact stock

### Credit / Utang

- Customer records
- Optional contact information
- Credit balance
- Credit sale history stored with customer
- Record partial/full payment
- Prevent deletion when customer has balance or linked sales history

### Expenses

- Expense date
- Category
- Description
- Amount
- Today total
- Current month total
- Delete expense

### Analytics

- Selectable 7/30/90-day period
- Total sales
- Gross profit
- Average transaction value
- Expenses
- Product performance ranking
- Best-selling product insight
- Low-stock insight
- Outstanding credit insight
- Estimated net after recorded expenses
- Sales comparison insight when enough data exists
- Visual sales trend

### Reports

- Custom date range
- Sales total
- Gross profit
- Expenses
- Estimated net
- Transaction table
- CSV export

### `.pos` backup and restore

Current backup format identifier:

- `format: POSlite`
- `schemaVersion: 1`
- `backupType: full`
- `appVersion: 0.1.0`

Backup currently contains:

- store settings
- products
- sales
- customers and credit history
- expenses

Import behavior:

1. Read selected `.pos` file.
2. Parse JSON package.
3. Verify POSlite format and schema version.
4. Show record summary.
5. Require user confirmation.
6. Replace current local records with imported records.

### Offline support

- No cloud database required.
- IndexedDB stores business data locally.
- Service Worker caches core web application files.
- Once the served web app is cached, normal app usage can continue offline.

### Quality assurance

- GitHub Actions workflow: `.github/workflows/validate.yml`
- Runs on pushes to `main` and pull requests.
- Checks JavaScript syntax for `app.js` and `sw.js`.
- Confirms required POSlite project and documentation files exist.
- Dialog Cancel/Close controls were corrected so cancelling a form cannot submit or save it accidentally.

## Important limitations of v0.1.0

These are documented intentionally and should not be mistaken for completed features:

- `.pos` backups are not encrypted yet.
- No automatic rotating backup system yet.
- No barcode scanner yet.
- No receipt printer integration yet.
- No advanced parent-unit/tingi conversion yet.
- No supplier module yet.
- No hold/resume sale yet.
- No void/refund workflow yet.
- No multi-user/PIN permissions yet.
- No native Android implementation yet.

## Planned development path

### v0.2

- Improve validation and transaction safeguards
- Sales history detail view
- Better stock movement history
- Product archive instead of destructive deletion where appropriate
- Manual/custom sale item support
- Better customer credit ledger

### v0.3

- Tingi/unit conversion system
- Supplier records
- Stock-in/purchase records
- Restock suggestions based on sales history
- Slow-moving/dead-stock Analytics

### v0.4

- Receipt layout
- Printable receipt
- Barcode support where available
- Improved report exports
- Protected/password-based `.pos` backup design

### Web stable milestone

- UX cleanup
- Data validation audit
- Backup/restore compatibility testing
- Mobile testing
- Offline testing
- Documentation audit

### Android phase

After the web workflow is stable, create a native Android version using:

- Kotlin
- Jetpack Compose
- Room/SQLite
- Android file APIs for `.pos`

The Android version should preserve the documented behavior and data concepts of POSlite rather than redesigning the business logic from zero.

## Design principle

POSlite should prioritize speed and clarity. Common sari-sari store transactions should require as few steps as practical, while preserving accurate inventory, credit, expense, and sales records.
