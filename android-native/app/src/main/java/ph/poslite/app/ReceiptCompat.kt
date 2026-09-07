package ph.poslite.app

import android.content.Context
import android.widget.Toast
import ph.poslite.app.data.SaleReceipt
import ph.poslite.app.data.StoreSettings

/**
 * Compatibility entry points kept for older native callers.
 * Receipt output is JPG-only; there is no PDF/PrintManager path here.
 * Failures are caught so receipt export cannot close SariPOS.
 */
fun printReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    runCatching {
        saveReceiptJpg(context, receipt, settings)
    }.onSuccess {
        Toast.makeText(context, "Naka-save ang receipt JPG sa Pictures/SariPOS.", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, it.message ?: "Hindi ma-save ang receipt JPG.", Toast.LENGTH_LONG).show()
    }
}

fun shareReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    runCatching {
        shareReceiptJpg(context, receipt, settings)
    }.onFailure {
        Toast.makeText(context, it.message ?: "Hindi ma-share ang receipt JPG.", Toast.LENGTH_LONG).show()
    }
}
