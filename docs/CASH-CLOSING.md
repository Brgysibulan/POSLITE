# SariPOS Native Cash Closing

## Purpose

The `0.7.0-native-dev` track adds a simple offline drawer count for a sari-sari store. It helps the owner compare the cash that should be present with the amount physically counted, without requiring an online account or subscription.

## Period rule

A closing period starts at the later of:

- local midnight; or
- the previous cash closing timestamp.

This supports more than one shift/closing per day and prevents transactions from being counted again in the next period. Each saved closing is an immutable snapshot; later activity belongs to the next period.

## Expected cash formula

`Expected cash = Opening cash + Completed cash sales + Credit payments − Expenses`

Voided sales are excluded. Credit sales are excluded until paid; recorded credit payments are included as cash received.

Purchase spending is not included because current Kumprada records do not identify the payment source. Automatically subtracting every purchase could be wrong when it was paid by bank transfer, supplier credit, personal cash, or another source. Purchase payment source is required before this can safely affect the drawer.

## Saved fields

- period start and closing timestamp
- opening cash
- completed cash sales
- credit payments
- expenses
- expected cash
- actual counted cash
- variance (`actual − expected`)
- optional note

Records are stored in `cash_closings`, included in native backup schema 3, and shown in recent closing history.

## Related improvements

- Utang now provides a per-customer ledger for sales, payments, and void reversals.
- Analytics shows damaged and expired losses using saved stock-movement cost.
- Estimated net profit subtracts expenses plus those inventory losses.

## Device-test checklist

1. Enter opening cash, record cash sales, a credit payment, and expenses, then compare expected cash manually.
2. Save an exact count and confirm zero variance.
3. Save another closing later the same day and confirm only activity after the earlier close is included.
4. Void a cash sale before closing and confirm it is excluded.
5. Record a credit sale and confirm it is excluded; record its payment and confirm the payment is included.
6. Add purchase spending and confirm it remains visible in Analytics but does not silently change drawer expectation.
7. Export/restore backup schema 3 and confirm closing history remains intact.
