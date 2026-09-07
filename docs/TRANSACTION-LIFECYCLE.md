# SariPOS Native Transaction Lifecycle

## Full-sale void / return

Implemented in the `0.6.0-native-dev` source track. Open **Resibo / Talaan**, find a completed receipt, and choose **Void / Return**. The user must enter a reason and confirm the reversal.

The reversal runs in one SQLite transaction:

1. Verify the sale exists and is still `completed`.
2. Restore each sale item's exact base-unit quantity to stock.
3. Add a `sale_void` stock movement using the original saved item cost.
4. Reverse the customer balance and add a credit-ledger entry when it was a credit sale.
5. Mark the sale `voided` with timestamp and reason.

Any failure rolls back every step. The original sale and item rows remain available as an audit record. A voided sale cannot be voided again.

## Credit safeguard

The current credit ledger stores customer-level payments rather than invoice allocations. If any payment was recorded for the customer after the selected credit sale, SariPOS blocks the void instead of guessing which sale that payment settled. Invoice-level payment allocation is required before that case can be safely automated.

## Reporting rule

Dashboard and analytics queries include only `completed` sales. This removes both revenue and original item COGS from business totals after a void while preserving the historical rows. Receipt history and JPG/text receipt output visibly mark voided transactions and show the reason.

## Stock loss and count actions

- **Dagdag stock** — normal positive adjustment.
- **Bawas stock** — normal negative adjustment.
- **Sirang paninda** — deducts stock and records movement type `damaged`.
- **Expired na paninda** — deducts stock and records movement type `expired`.
- **Physical count** — sets stock to the counted base quantity and records only the resulting difference as `stock_count`.

All negative actions reject quantities above current stock. Damaged/expired movements preserve current average base cost for later loss reporting. Piece/pack and gram/kilo conversion/accounting rules are unchanged.

## Current scope and next steps

This is a full-sale reversal. Partial item returns, exchanges, refund tender tracking, manager PIN/role authorization, and invoice-level credit payment allocation remain future lifecycle work. They should be added as explicit records rather than editing or deleting historical rows.
