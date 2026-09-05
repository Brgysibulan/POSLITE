package ph.poslite.app

import android.content.Context
import android.content.Intent
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import ph.poslite.app.data.SaleReceipt
import ph.poslite.app.data.StoreSettings
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(value)
private fun dateTime(value: Long): String = SimpleDateFormat("MMM d, yyyy h:mm a", Locale("en", "PH")).format(Date(value))
private fun htmlEsc(value: String): String = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")

fun receiptText(receipt: SaleReceipt, settings: StoreSettings): String = buildString {
    appendLine(settings.storeName)
    if (settings.address.isNotBlank()) appendLine(settings.address)
    appendLine("SALES RECEIPT")
    appendLine("Receipt: ${receipt.number}")
    appendLine("Date: ${dateTime(receipt.createdAt)}")
    appendLine("Customer: ${receipt.customerName}")
    appendLine("Payment: ${if (receipt.paymentType == "credit") "Credit / Utang" else "Cash"}")
    appendLine("------------------------------")
    receipt.lines.forEach { line ->
        appendLine(line.productName)
        appendLine("${line.qty} ${line.unitLabel} x ${money(line.unitPrice)} = ${money(line.amount)}")
    }
    appendLine("------------------------------")
    appendLine("Subtotal: ${money(receipt.subtotal)}")
    if (receipt.discount > 0) appendLine("Discount: -${money(receipt.discount)}")
    appendLine("TOTAL: ${money(receipt.total)}")
    if (receipt.paymentType == "cash") {
        appendLine("Cash: ${money(receipt.cash)}")
        appendLine("Change: ${money(receipt.change)}")
    }
    appendLine("Thank you!")
}

fun shareReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "POSlite Receipt ${receipt.number}")
        putExtra(Intent.EXTRA_TEXT, receiptText(receipt, settings))
    }
    context.startActivity(Intent.createChooser(intent, "Share receipt"))
}

fun printReceipt(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    val rows = receipt.lines.joinToString("") { line ->
        "<tr><td><b>${htmlEsc(line.productName)}</b><br><small>${line.qty} ${htmlEsc(line.unitLabel)} × ${money(line.unitPrice)}</small></td><td style='text-align:right'>${money(line.amount)}</td></tr>"
    }
    val cashRows = if (receipt.paymentType == "cash") {
        "<tr><td>Cash</td><td>${money(receipt.cash)}</td></tr><tr><td>Change</td><td>${money(receipt.change)}</td></tr>"
    } else "<tr><td>Credit / Utang</td><td>${money(receipt.total)}</td></tr>"
    val html = """
        <html><head><meta name='viewport' content='width=device-width,initial-scale=1'>
        <style>@page{size:80mm auto;margin:3mm}body{font-family:monospace;width:72mm;margin:0 auto;font-size:11px}h2,p{text-align:center;margin:3px}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}.rule{border-top:1px dashed #000;margin:6px 0}.total{font-size:15px;font-weight:bold}small{font-size:9px}</style></head>
        <body><h2>${htmlEsc(settings.storeName)}</h2>${if (settings.address.isNotBlank()) "<p>${htmlEsc(settings.address)}</p>" else ""}<p><b>SALES RECEIPT</b></p>
        <table><tr><td>Receipt</td><td style='text-align:right'>${htmlEsc(receipt.number)}</td></tr><tr><td>Date</td><td style='text-align:right'>${dateTime(receipt.createdAt)}</td></tr><tr><td>Customer</td><td style='text-align:right'>${htmlEsc(receipt.customerName)}</td></tr></table>
        <div class='rule'></div><table>$rows</table><div class='rule'></div>
        <table><tr><td>Subtotal</td><td style='text-align:right'>${money(receipt.subtotal)}</td></tr>${if (receipt.discount > 0) "<tr><td>Discount</td><td style='text-align:right'>-${money(receipt.discount)}</td></tr>" else ""}<tr class='total'><td>TOTAL</td><td style='text-align:right'>${money(receipt.total)}</td></tr>$cashRows</table>
        <div class='rule'></div><p><b>Thank you!</b></p><p><small>POSlite native Android development build</small></p></body></html>
    """.trimIndent()

    val webView = WebView(context)
    webView.settings.javaScriptEnabled = false
    webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
    webView.webViewClient = object : android.webkit.WebViewClient() {
        override fun onPageFinished(view: WebView?, url: String?) {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            val adapter = webView.createPrintDocumentAdapter("POSlite-${receipt.number}")
            printManager.print("POSlite ${receipt.number}", adapter, PrintAttributes.Builder().build())
        }
    }
}
