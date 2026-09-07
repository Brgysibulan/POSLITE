# SariPOS Native Android Backup and Restore

## Status

Implemented in the `0.5.0-native-dev` source track. GitHub Actions compile/build and Android real-device verification are required before release promotion.

## User workflow

Open **Ayos ng App → Backup at Restore**.

- **I-export ang .pos Backup** opens the Android system document picker and suggests `SariPOS-backup-YYYY-MM-DD.pos`.
- **Mag-restore mula sa .pos** opens the Android system file picker.
- A valid file shows product, sale, purchase, customer, expense, and export-date details before confirmation.
- **Palitan at I-restore** replaces the current local database. **Kanselahin** makes no change.

No internet connection or monthly service is required. The system picker lets the user choose an available phone folder or a storage provider already configured on the device.

## Native file contract

- File extension: `.pos`
- `format`: `SariPOS-Android`
- `schemaVersion`: `1`
- Human-readable JSON payload
- Exported tables: `products`, `product_units`, `customers`, `sales`, `sale_items`, `purchases`, `purchase_items`, `stock_movements`, `credit_ledger`, `expenses`, `settings`, and `draft_cart`

IDs and historical values are preserved. This keeps sale-item cost snapshots, transaction references, customer balances, movement history, settings, and configured product-unit conversions intact.

## Restore guarantees

The app validates the outer JSON, format identifier, schema version, and presence of every required table before offering confirmation. Replacement runs in one SQLite transaction. If an insertion or constraint check fails, SQLite rolls the operation back, leaving the pre-restore database intact.

The restore action is intentionally explicit and destructive only after confirmation. Users should export a current backup before restoring older data.

## Draft cart recovery

SQLite database version 2 adds `draft_cart` through a non-destructive migration. Cart lines are persisted after add, quantity change, or removal. On startup, the app restores only lines whose product/unit still exists and whose quantity is within available stock. Successful checkout clears the saved draft inside the same transaction as the sale, stock movement, and credit update so an app interruption cannot leave a completed sale queued for accidental resubmission.

## Compatibility limitation

The root web/PWA build uses `format: POSlite` and a different schema/data shape. Native `SariPOS-Android` schema-1 restore intentionally rejects those files instead of guessing field mappings and risking incorrect cost, stock, or credit data. Cross-platform conversion is planned but is not part of this release.

## Device-test checklist

1. Upgrade an Android install containing version-1 data; confirm all existing modules still open.
2. Create products with piece/pack and gram/kilo conversions, purchases, cash and credit sales, payments, expenses, and an unfinished cart.
3. Export a `.pos` backup to local phone storage.
4. Change local data, restore the file, and compare product stock/cost, histories, balances, settings, and draft cart.
5. Complete a restored cart and confirm it does not return after relaunch.
6. Cancel from both Android file pickers and confirm there is no state change.
7. Attempt malformed JSON, a missing-table file, an unsupported schema, and a web/PWA `.pos` file; confirm each is rejected and current data is preserved.
8. Force an insertion/constraint failure with a deliberately inconsistent test backup; confirm rollback preserves all old records.

## Next data-safety work

- Add automated migration/round-trip instrumentation tests.
- Add optional encrypted/password-protected export without introducing a subscription.
- Design an explicit, tested web-to-native conversion path.
- Add backup freshness reminders and a last-successful-backup indicator.
