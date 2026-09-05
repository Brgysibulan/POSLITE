# POSlite Barcode Scanner

Status: **Implemented in Web MVP v0.2.0 enhancement**

Date: 2026-09-05

## Goal

Make the Sell screen immediately usable with product barcodes while keeping POSlite Android-smartphone-first and offline-first.

## Implemented workflow

The Sell screen now shows a visible **Ready to Scan Barcode** panel.

Two scan paths are supported:

1. **Scanner Input**
   - Focuses the existing POS barcode/search field.
   - Works with Bluetooth/USB barcode scanners that send the barcode as keyboard input followed by Enter.
   - Uses the existing exact-barcode lookup.
   - Successful scans add the product using its first enabled selling unit.
   - The field is prepared again for the next scan so repeated checkout scanning is fast.

2. **Open Camera**
   - Uses the phone's rear camera when available.
   - Uses the browser `BarcodeDetector` API when supported.
   - Targets common retail barcode formats: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Codabar, and ITF when the browser reports support.
   - A matched product is automatically added to the cart using its first enabled selling unit.
   - Camera tracks are stopped after a scan, close, cancel, permission error, or page/background transition.

## Scan states

The scanner panel reports:

- Ready / waiting for barcode
- Successful product scan and cart add
- Barcode not found
- Product out of stock
- Product without an enabled selling unit
- Browser without camera barcode detection support
- Camera permission/start failure

## Inventory behavior

Barcode scanning does not create a second inventory path. It uses the same existing `addToCart()` and checkout workflow, so base-unit stock conversion, per-pack/per-piece behavior, cost basis, stock deduction, credit sale behavior, and Analytics remain unchanged.

For products with multiple selling units, barcode scan currently selects the **first enabled selling unit**. The cashier can still manually choose another configured unit from the product card when needed.

## Offline behavior

`scanner.js` and `scanner.css` are included in the Service Worker asset cache. The scanner interface therefore remains available after POSlite has been cached. Camera use itself depends on browser/device camera capability and permission, not on a cloud service.

## Browser fallback

If camera barcode detection is unavailable, POSlite keeps Scanner Input and manual barcode entry working. The feature does not require an external barcode API or paid service.

## Files

- `scanner.js` — scanner workflow, camera lifecycle, detection, scan feedback, add-to-cart integration
- `scanner.css` — scanner-ready panel and camera overlay styling
- `index.html` — loads scanner assets
- `sw.js` — caches scanner assets offline
- `CHANGELOG.md` — feature history

## Next barcode/QR work

- Improve compatibility testing across Android browsers.
- Optional product-specific default scan unit if needed.
- QR Code scanning/generation remains a separate planned feature.
- Native Android scanner will later use native camera APIs when the stable web workflow is ported to Kotlin/Jetpack Compose.
