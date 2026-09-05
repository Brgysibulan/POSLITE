# POSlite Customer Receipt — Development Implementation

## Status

Implemented for the current web development build.

POSlite now generates a customer receipt automatically after a successful sale. The receipt uses the completed sale transaction as its source of truth rather than creating a second inventory or sales system.

## Checkout flow

1. Cashier scans or selects products.
2. Cashier may enter an optional customer name for a cash sale.
3. For credit / utang, the existing saved customer is used.
4. Cashier completes the sale.
5. POSlite waits for the successful sale record to be committed.
6. A receipt opens automatically.
7. Receipt metadata is saved back into the sale record in IndexedDB.

A failed checkout does not generate a receipt.

## Receipt contents

The development receipt includes:

- store name
- store address when configured
- transaction / receipt reference
- date and time
- customer name or Walk-in Customer
- payment type
- product name
- quantity
- selling unit
- unit price
- line amount
- subtotal
- discount when applicable
- total
- cash received and change for cash transactions
- credit amount and current customer balance for credit / utang transactions

## Customer metadata stored with a sale

Receipt support adds the following optional sale metadata:

- `customerName`
- `receiptVersion`
- `receiptIssuedAt`

These fields live on the sale transaction itself. Existing `.pos` full backups already include sales, so this receipt metadata is included automatically without a separate backup schema change.

## Receipt actions

The receipt dialog provides:

- Close
- Share
- Print / Save
- New Sale

The print stylesheet targets an approximately 80 mm thermal receipt layout while still allowing normal browser printing / PDF saving during development.

Bluetooth thermal-printer integration is not implemented yet.

## Development database decision

The repository includes `data/receipts.json` as a development-only mock GitHub data structure.

Important: the public browser app intentionally does **not** write real customer transactions directly into the GitHub repository. Direct GitHub writes from a public web page would require write credentials/token exposure and are not appropriate for the client-side development build.

During current testing:

- GitHub repository = source code + mock/test data structure + documentation
- IndexedDB on the test phone/browser = runtime transaction database
- `.pos` export = portable backup of operational data

This keeps the zero-cost development workflow while avoiding exposed GitHub credentials.

## Files

- `receipt.js` — receipt generation, customer metadata persistence, sharing, printing, and new-sale flow
- `receipt.css` — mobile receipt dialog and thermal print styling
- `data/receipts.json` — development/mock GitHub receipt data structure
- `no-barcode.js` — loads receipt assets into the current web build without modifying the stable checkout implementation
- `sw.js` — caches receipt assets for offline-loaded operation

## Current limitations

- No dedicated receipt-history/reprint screen yet.
- No native Bluetooth thermal-printer integration yet.
- GitHub JSON is a mock/development structure, not a live multi-user transaction database.
- Receipt is marked as a development transaction record and should not be treated as an official tax invoice.

## Next receipt work

Recommended next steps:

1. Add Reprint Receipt from Sales / Reports.
2. Add optional receipt footer/message in Settings.
3. Add 58 mm and 80 mm receipt-size options.
4. Add native Android Bluetooth thermal-printer support later.
5. Add transaction reference QR after QR support is implemented.
