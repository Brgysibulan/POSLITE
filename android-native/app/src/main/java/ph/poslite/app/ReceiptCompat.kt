package ph.poslite.app

import android.content.Context
import android.widget.Toast
import ph.poslite.app.data.SaleReceipt
import ph.poslite.app.data.StoreSettings

/**
 * Compatibility entry points used by the current receipt dialog.
 * The old print/PDF action now saves a lightweight JPG instead.
 * All failures are caught so a receipt export problem cannot close the POS app.
 */
fun printReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    runCatching {
        saveReceiptJpg(context, receipt, settings)
    }.onSuccess {
        Toast.makeText(context, "Receipt JPG saved to Pictures/POSlite.", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, it.message ?: "Could not save receipt JPG.", Toast.LENGTH_LONG).show()
    }
}

fun shareReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    runCatching {
        shareReceiptJpg(context, receipt, settings)
    }.onFailure {
        Toast.makeText(context, it.message ?: "Could not share receipt JPG.", Toast.LENGTH_LONG).show()
    }
}
