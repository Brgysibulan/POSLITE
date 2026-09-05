# Products Without Barcodes

POSlite supports products that do not have a printed manufacturer barcode.

## Product setup

In Add Product or Edit Product, use **Product has no barcode** when the item has no usable barcode.

When enabled:

- the Barcode field is disabled and cleared;
- the product is saved with an empty barcode value;
- no fake or duplicate barcode is generated;
- inventory, purchases, costing, sales, credit, reports, and analytics continue to work normally.

## Selling an unbarcoded product

Products without barcodes are sold through the normal Sell screen by:

1. searching the product by name or category; or
2. tapping its product card and choosing the selling unit.

The barcode scanner only applies to products that actually have barcode values.

## Examples

This option is appropriate for loose/repacked goods, produce, local products, or any item that does not have a printed barcode.

## Design decision

POSlite treats an empty barcode as the canonical representation of a product with no barcode. No database migration or new barcode schema is required, preserving compatibility with v0.2 product data and `.pos` backups.
