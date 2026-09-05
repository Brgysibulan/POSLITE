# POSlite Cash Loans / Pautang na Pera

## Purpose

POSlite separates **Utang sa Paninda** from **Pautang na Pera** so store sales, inventory profit, and personal/store cash lending do not get mixed together.

The first implementation is visible in the web app for workflow testing, but the interaction and data model are designed to match the native Android direction.

## Credit modes

### Utang sa Paninda

This remains the existing POS credit flow. Goods are sold, inventory is deducted, the sale counts as sales revenue, and the customer balance is collected later.

### Pautang na Pera

This is a separate cash-loan ledger.

A cash loan records:

- borrower name
- optional contact
- principal / amount loaned
- loan date
- optional due date
- optional notes
- interest setting
- payment history
- total returned
- remaining balance
- payment status

## Interest options

A cash loan supports three interest states:

1. **Not set yet** — no profit is assumed. The principal can be collected first. If the principal becomes fully returned, the loan shows **Interest Pending** until the user decides whether there is interest.
2. **No interest** — the expected total is exactly the principal. When principal is fully returned, status becomes **Fully Paid**.
3. **Fixed interest** — the expected total is principal plus the fixed interest amount.

## Payment statuses

- **Unpaid** — no payment recorded yet.
- **Partial** — some amount has been returned but the expected amount is not yet complete.
- **Interest Pending** — principal has been fully returned but the loan's interest decision is still unset.
- **Fully Paid** — the final expected amount has been returned and there is no unresolved interest decision.

## Accounting rule

Cash-loan principal is **not Sales** and is **not Profit**.

Returning the principal is also **not new income**. It is only the return of money previously loaned out.

For fixed-interest loans, POSlite uses a principal-first view for the current development prototype:

- payments up to the principal amount are principal repayment
- only payments above principal, up to the fixed interest amount, are shown as **Interest Collected**

This prevents the principal from inflating POS sales or store profit analytics.

## Web development storage

The web prototype uses a separate local IndexedDB database:

`POSliteCashLoansDB`

Stores:

- `loans`
- `payments`

This separation avoids changing the existing web POS database schema while the workflow is still being tested.

The cash-loan database is local to the browser/device and is not currently included in the existing `.pos` backup format. Backup integration should be added only after the cash-loan workflow is approved.

## Android direction

The native Android version should use the same user-facing concepts:

- two Credit tabs: Utang sa Paninda / Pautang na Pera
- New Loan
- Record Payment
- Set/Edit Interest
- Details and payment history
- Unpaid / Partial / Interest Pending / Fully Paid
- principal excluded from sales/profit
- actual interest collected tracked separately

The final Android implementation should store cash loans and payments in SQLite and keep them separate from product-credit sales.

## Mobile UI rule

The visible labels should remain simple:

- Pinautang
- Nabalik
- Natitira
- Tubo
- Status

Technical accounting terms should remain behind the interface unless needed in reports or documentation.
