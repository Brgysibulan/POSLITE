package ph.poslite.app

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import ph.poslite.app.data.SaleReceipt
import ph.poslite.app.data.StoreSettings
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val RECEIPT_WIDTH = 576
private const val RECEIPT_MARGIN = 28f
private const val JPG_QUALITY = 68

private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(value)
private fun dateTime(value: Long): String = SimpleDateFormat("MMM d, yyyy h:mm a", Locale("en", "PH")).format(Date(value))
private fun qty(value: Double): String = if (value % 1.0 == 0.0) value.toLong().toString() else "%.2f".format(Locale.US, value).trimEnd('0').trimEnd('.')
private fun safeName(value: String): String = value.replace(Regex("[^A-Za-z0-9._-]"), "-")

private enum class Align { LEFT, CENTER, RIGHT }

private data class ReceiptDrawLine(
    val text: String,
    val size: Float = 22f,
    val bold: Boolean = false,
    val align: Align = Align.LEFT,
    val gapBefore: Float = 0f
)

fun receiptText(receipt: SaleReceipt, settings: StoreSettings): String = buildString {
    appendLine(settings.storeName.ifBlank { "SariPOS Store" })
    if (settings.address.isNotBlank()) appendLine(settings.address)
    appendLine("SALES RECEIPT")
    appendLine("Receipt: ${receipt.number}")
    appendLine("Date: ${dateTime(receipt.createdAt)}")
    appendLine("Customer: ${receipt.customerName}")
    appendLine("Payment: ${if (receipt.paymentType == "credit") "Credit / Utang" else "Cash"}")
    appendLine("------------------------------")
    receipt.lines.forEach { line ->
        appendLine(line.productName)
        appendLine("${qty(line.qty)} ${line.unitLabel} x ${money(line.unitPrice)} = ${money(line.amount)}")
    }
    appendLine("------------------------------")
    appendLine("Subtotal: ${money(receipt.subtotal)}")
    if (receipt.discount > 0) appendLine("Discount: -${money(receipt.discount)}")
    appendLine("TOTAL: ${money(receipt.total)}")
    if (receipt.paymentType == "cash") {
        appendLine("Cash: ${money(receipt.cash)}")
        appendLine("Change: ${money(receipt.change)}")
    } else {
        appendLine("Credit / Utang: ${money(receipt.total)}")
    }
    appendLine("Thank you!")
}

private fun receiptDrawLines(receipt: SaleReceipt, settings: StoreSettings): List<ReceiptDrawLine> = buildList {
    add(ReceiptDrawLine(settings.storeName.ifBlank { "SariPOS Store" }, size = 31f, bold = true, align = Align.CENTER))
    if (settings.address.isNotBlank()) add(ReceiptDrawLine(settings.address, size = 18f, align = Align.CENTER, gapBefore = 2f))
    add(ReceiptDrawLine("SALES RECEIPT", size = 24f, bold = true, align = Align.CENTER, gapBefore = 12f))
    add(ReceiptDrawLine("Receipt: ${receipt.number}", gapBefore = 12f))
    add(ReceiptDrawLine("Date: ${dateTime(receipt.createdAt)}", size = 19f))
    add(ReceiptDrawLine("Customer: ${receipt.customerName}", size = 19f))
    add(ReceiptDrawLine("Payment: ${if (receipt.paymentType == "credit") "Credit / Utang" else "Cash"}", size = 19f))
    add(ReceiptDrawLine("--------------------------------", size = 20f, align = Align.CENTER, gapBefore = 8f))

    receipt.lines.forEach { line ->
        add(ReceiptDrawLine(line.productName, size = 22f, bold = true, gapBefore = 7f))
        add(ReceiptDrawLine("${qty(line.qty)} ${line.unitLabel} x ${money(line.unitPrice)}", size = 19f))
        add(ReceiptDrawLine(money(line.amount), size = 20f, bold = true, align = Align.RIGHT))
    }

    add(ReceiptDrawLine("--------------------------------", size = 20f, align = Align.CENTER, gapBefore = 8f))
    add(ReceiptDrawLine("Subtotal  ${money(receipt.subtotal)}", size = 21f, align = Align.RIGHT))
    if (receipt.discount > 0) add(ReceiptDrawLine("Discount  -${money(receipt.discount)}", size = 21f, align = Align.RIGHT))
    add(ReceiptDrawLine("TOTAL  ${money(receipt.total)}", size = 29f, bold = true, align = Align.RIGHT, gapBefore = 8f))
    if (receipt.paymentType == "cash") {
        add(ReceiptDrawLine("Cash  ${money(receipt.cash)}", size = 21f, align = Align.RIGHT))
        add(ReceiptDrawLine("Change  ${money(receipt.change)}", size = 21f, align = Align.RIGHT))
    } else {
        add(ReceiptDrawLine("Credit / Utang  ${money(receipt.total)}", size = 21f, align = Align.RIGHT))
    }
    add(ReceiptDrawLine("Thank you!", size = 24f, bold = true, align = Align.CENTER, gapBefore = 18f))
    add(ReceiptDrawLine("SariPOS", size = 16f, align = Align.CENTER))
}

private fun configuredPaint(line: ReceiptDrawLine): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.BLACK
    textSize = line.size
    typeface = Typeface.create(Typeface.MONOSPACE, if (line.bold) Typeface.BOLD else Typeface.NORMAL)
}

private fun wrapText(text: String, paint: Paint, maxWidth: Float): List<String> {
    if (text.isBlank()) return listOf("")
    val words = text.trim().split(Regex("\\s+"))
    val result = mutableListOf<String>()
    var current = ""

    fun splitLongWord(word: String): List<String> {
        if (paint.measureText(word) <= maxWidth) return listOf(word)
        val chunks = mutableListOf<String>()
        var chunk = ""
        word.forEach { ch ->
            val next = chunk + ch
            if (chunk.isNotEmpty() && paint.measureText(next) > maxWidth) {
                chunks += chunk
                chunk = ch.toString()
            } else chunk = next
        }
        if (chunk.isNotEmpty()) chunks += chunk
        return chunks
    }

    words.forEach { word ->
        val parts = splitLongWord(word)
        parts.forEachIndexed { index, part ->
            val candidate = when {
                current.isBlank() -> part
                index > 0 -> part
                else -> "$current $part"
            }
            if (paint.measureText(candidate) <= maxWidth) {
                current = candidate
            } else {
                if (current.isNotBlank()) result += current
                current = part
            }
        }
    }
    if (current.isNotBlank()) result += current
    return if (result.isEmpty()) listOf(text) else result
}

private fun renderReceiptBitmap(receipt: SaleReceipt, settings: StoreSettings): Bitmap {
    val lines = receiptDrawLines(receipt, settings)
    val maxWidth = RECEIPT_WIDTH - (RECEIPT_MARGIN * 2f)
    val prepared = lines.map { line ->
        val paint = configuredPaint(line)
        Triple(line, paint, wrapText(line.text, paint, maxWidth))
    }
    val contentHeight = prepared.sumOf { (line, paint, wrapped) ->
        val lineHeight = paint.fontSpacing.coerceAtLeast(line.size * 1.22f)
        (line.gapBefore + (wrapped.size * lineHeight)).toDouble()
    }.toFloat()
    val height = (RECEIPT_MARGIN * 2 + contentHeight + 18f).toInt().coerceAtLeast(420)
    val bitmap = Bitmap.createBitmap(RECEIPT_WIDTH, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)

    var y = RECEIPT_MARGIN
    prepared.forEach { (line, paint, wrapped) ->
        y += line.gapBefore
        val lineHeight = paint.fontSpacing.coerceAtLeast(line.size * 1.22f)
        paint.textAlign = when (line.align) {
            Align.LEFT -> Paint.Align.LEFT
            Align.CENTER -> Paint.Align.CENTER
            Align.RIGHT -> Paint.Align.RIGHT
        }
        val x = when (line.align) {
            Align.LEFT -> RECEIPT_MARGIN
            Align.CENTER -> RECEIPT_WIDTH / 2f
            Align.RIGHT -> RECEIPT_WIDTH - RECEIPT_MARGIN
        }
        wrapped.forEach { text ->
            y += lineHeight - paint.fontMetrics.descent
            canvas.drawText(text, x, y, paint)
            y += paint.fontMetrics.descent
        }
    }
    return bitmap
}

private fun writeJpg(bitmap: Bitmap, stream: OutputStream) {
    stream.use {
        check(bitmap.compress(Bitmap.CompressFormat.JPEG, JPG_QUALITY, it)) { "Could not encode receipt JPG." }
        it.flush()
    }
}

fun saveReceiptJpg(context: Context, receipt: SaleReceipt, settings: StoreSettings): Uri {
    val bitmap = renderReceiptBitmap(receipt, settings)
    val fileName = "SariPOS-${safeName(receipt.number)}.jpg"
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/SariPOS")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: error("Could not create receipt image.")
            try {
                resolver.openOutputStream(uri)?.let { writeJpg(bitmap, it) }
                    ?: error("Could not write receipt image.")
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                return uri
            } catch (e: Exception) {
                resolver.delete(uri, null, null)
                throw e
            }
        }

        val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "SariPOS").apply { mkdirs() }
        val file = File(dir, fileName)
        writeJpg(bitmap, FileOutputStream(file))
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    } finally {
        bitmap.recycle()
    }
}

private fun createShareReceiptJpg(context: Context, receipt: SaleReceipt, settings: StoreSettings): Uri {
    val bitmap = renderReceiptBitmap(receipt, settings)
    try {
        val dir = File(context.cacheDir, "receipts").apply { mkdirs() }
        val file = File(dir, "SariPOS-${safeName(receipt.number)}.jpg")
        writeJpg(bitmap, FileOutputStream(file))
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    } finally {
        bitmap.recycle()
    }
}

fun shareReceiptJpg(context: Context, receipt: SaleReceipt, settings: StoreSettings) {
    val uri = createShareReceiptJpg(context, receipt, settings)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/jpeg"
        putExtra(Intent.EXTRA_SUBJECT, "SariPOS Receipt ${receipt.number}")
        putExtra(Intent.EXTRA_TEXT, "SariPOS receipt ${receipt.number} · ${money(receipt.total)}")
        putExtra(Intent.EXTRA_STREAM, uri)
        clipData = android.content.ClipData.newRawUri("SariPOS receipt", uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share receipt JPG"))
}
