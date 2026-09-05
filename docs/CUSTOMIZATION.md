# POSlite Appearance and Custom Terms

## Purpose

POSlite can use store-friendly wording instead of forcing accounting or technical labels. The same Settings panel also controls the app appearance.

This feature is designed for sari-sari stores and other small stores where terms such as `Kumprada`, `Halin`, `Paninda`, `Tubo`, and `Gastos` may be easier to understand than `Purchases`, `Sales`, `Inventory`, `Gross Profit`, and `Expenses`.

## Settings location

Open **Settings → Appearance & Custom Terms**.

## Appearance choices

- **System — follow phone**: automatically follows the Android/device light or dark setting.
- **Light mode**: always uses the light/white interface.
- **Dark mode**: always uses the dark interface.

The selected preference is stored locally and is applied again when POSlite is reopened.

## Custom terms

The following visible concepts can be renamed:

- Sell / Benta
- Sales / Halin
- Products / Paninda
- Purchases / Kumprada
- Inventory / Stock ng Paninda
- Credit / Utang
- Product Credit / Utang sa Paninda
- Cash Loan / Pautang na Pera
- Expenses / Gastos
- Analytics / Kita at Tubo
- Reports / Talaan
- Gross Profit / Tubo sa Paninda
- Net Profit / Natirang Tubo
- Purchase Spend / Gastos sa Kumprada
- Low Stock / Konti na ang Stock
- Out of Stock / Ubos na

Changing a term changes only the wording shown in the app. It does not change inventory, sales, costing, credit, analytics, or database calculations.

## Presets

### Sari-sari Terms

One tap applies a store-friendly preset:

- Sell → Benta
- Sales → Halin
- Products → Paninda
- Purchases → Kumprada
- Inventory → Stock ng Paninda
- Credit → Utang
- Expenses → Gastos
- Analytics → Kita at Tubo
- Reports → Talaan
- Gross Profit → Tubo sa Paninda
- Net Profit → Natirang Tubo

Every field remains editable after applying the preset.

### Standard Terms

Restores the standard POS/accounting wording.

## Reusable `.posconfig` file

**Export Config** downloads a `.posconfig` file.

The config contains only:

- theme preference
- custom terminology
- config schema/version metadata

It does **not** contain:

- products
- stock
- purchases
- sales
- receipts
- customers
- product credit
- cash loans
- loan payments
- expenses
- store transaction history

This makes the config safe to reuse as a template for another POSlite installation or another store without copying business records.

## Import Config

Use **Import Config** and select a POSlite `.posconfig` file. POSlite validates the file format and config version, saves the terminology and appearance locally, and applies them immediately.

A config made by a newer unsupported schema is rejected instead of being silently misread.

## Storage

Web prototype preferences are stored in browser local storage under `poslite-ui-config-v1`.

The reusable config schema is currently version `1` and identifies itself as `POSliteConfig`.

## Android direction

The web Settings implementation is the interaction prototype for the native Android app. The native Android version should use the same concepts and `.posconfig` schema so a store can reuse its terminology and appearance configuration across POSlite clients.

## Technical files

- `preferences.js` — config model, presets, theme selection, term application, export/import
- `preferences.css` — Appearance & Terms Settings UI plus dark-mode styling
- `no-barcode.js` — currently loads the preferences assets in the web build
- `sw.js` — caches preferences assets for offline use

## Design rule

Custom terminology is presentation-only. Internal IDs and accounting rules remain stable so changing `Sales` to `Halin`, for example, cannot alter the sales calculation itself.
