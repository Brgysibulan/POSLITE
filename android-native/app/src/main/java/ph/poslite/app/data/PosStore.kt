package ph.poslite.app.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max

data class UnitOption(
    val id: Long = 0,
    val productId: Long = 0,
    val label: String,
    val qtyBase: Double,
    val sellPrice: Double,
    val saleEnabled: Boolean = true,
    val purchaseEnabled: Boolean = true
)

data class Product(
    val id: Long,
    val name: String,
    val category: String,
    val barcode: String?,
    val baseUnit: String,
    val stockBase: Double,
    val lowStockBase: Double,
    val avgCostBase: Double,
    val units: List<UnitOption> = emptyList()
)

data class CartLine(
    val product: Product,
    val unit: UnitOption,
    val qty: Double
) {
    val qtyBase: Double get() = unit.qtyBase * qty
    val amount: Double get() = unit.sellPrice * qty
}

data class PurchaseLineInput(
    val productId: Long,
    val unitId: Long,
    val qty: Double,
    val totalCost: Double
)

data class Customer(
    val id: Long,
    val name: String,
    val contact: String,
    val balance: Double
)

data class CreditEntry(
    val id: Long,
    val type: String,
    val amount: Double,
    val createdAt: Long,
    val reference: String
)

data class Expense(
    val id: Long,
    val createdAt: Long,
    val category: String,
    val description: String,
    val amount: Double
)

data class ReceiptLine(
    val productName: String,
    val unitLabel: String,
    val qty: Double,
    val unitPrice: Double,
    val amount: Double
)

data class SaleReceipt(
    val id: Long,
    val number: String,
    val createdAt: Long,
    val customerName: String,
    val paymentType: String,
    val subtotal: Double,
    val discount: Double,
    val total: Double,
    val cash: Double,
    val change: Double,
    val lines: List<ReceiptLine>,
    val status: String = "completed",
    val voidReason: String = ""
)

data class DashboardStats(
    val salesToday: Double,
    val transactionsToday: Int,
    val grossProfitToday: Double,
    val totalCredit: Double,
    val lowStock: Int
)

data class AnalyticsSummary(
    val sales: Double,
    val cogs: Double,
    val grossProfit: Double,
    val expenses: Double,
    val estimatedNet: Double,
    val purchaseSpend: Double,
    val damagedLoss: Double,
    val expiredLoss: Double
)

data class CashClosing(
    val id: Long,
    val periodStart: Long,
    val closedAt: Long,
    val openingCash: Double,
    val cashSales: Double,
    val creditPayments: Double,
    val expenses: Double,
    val expectedCash: Double,
    val actualCash: Double,
    val variance: Double,
    val note: String
)

data class CashClosingPreview(
    val periodStart: Long,
    val cashSales: Double,
    val creditPayments: Double,
    val expenses: Double,
    val expectedCash: Double
)

data class StoreSettings(
    val storeName: String = "POSlite Store",
    val owner: String = "",
    val address: String = ""
)

data class UiTerms(
    val home: String = "Home",
    val sell: String = "Benta",
    val products: String = "Paninda",
    val more: String = "Iba Pa",
    val purchases: String = "Kumprada / Stock In",
    val inventory: String = "Stock ng Paninda",
    val credit: String = "Utang",
    val expenses: String = "Gastos",
    val analytics: String = "Kita at Tubo",
    val cashClosing: String = "Cash Closing",
    val reports: String = "Resibo / Talaan",
    val settings: String = "Ayos ng App",
    val back: String = "Balik",
    val newSale: String = "Bagong Benta"
) {
    companion object {
        fun english() = UiTerms(
            home = "Home",
            sell = "Sell",
            products = "Products",
            more = "More",
            purchases = "Purchases / Stock In",
            inventory = "Inventory",
            credit = "Credit",
            expenses = "Expenses",
            analytics = "Analytics & Profit",
            cashClosing = "Cash Closing",
            reports = "Receipts / Reports",
            settings = "Settings",
            back = "Back",
            newSale = "New Sale"
        )
    }
}

data class BackupPreview(
    val products: Int,
    val sales: Int,
    val purchases: Int,
    val customers: Int,
    val expenses: Int,
    val exportedAt: Long
)

class PosStore(context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE products(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                barcode TEXT UNIQUE,
                base_unit TEXT NOT NULL DEFAULT 'pc',
                stock_base REAL NOT NULL DEFAULT 0,
                low_stock_base REAL NOT NULL DEFAULT 5,
                avg_cost_base REAL NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE product_units(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                qty_base REAL NOT NULL,
                sell_price REAL NOT NULL DEFAULT 0,
                sale_enabled INTEGER NOT NULL DEFAULT 1,
                purchase_enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE sales(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                subtotal REAL NOT NULL,
                discount REAL NOT NULL,
                total REAL NOT NULL,
                payment_type TEXT NOT NULL,
                customer_id INTEGER,
                customer_name TEXT NOT NULL DEFAULT '',
                cash REAL NOT NULL DEFAULT 0,
                change_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'completed',
                voided_at INTEGER,
                void_reason TEXT NOT NULL DEFAULT ''
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE sale_items(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                unit_label TEXT NOT NULL,
                qty REAL NOT NULL,
                qty_base REAL NOT NULL,
                unit_price REAL NOT NULL,
                cost_base REAL NOT NULL,
                amount REAL NOT NULL
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE purchases(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL UNIQUE,
                supplier TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                total_cost REAL NOT NULL
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE purchase_items(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                unit_label TEXT NOT NULL,
                qty REAL NOT NULL,
                qty_base REAL NOT NULL,
                total_cost REAL NOT NULL
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE stock_movements(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL,
                qty_base REAL NOT NULL,
                created_at INTEGER NOT NULL,
                reference TEXT NOT NULL DEFAULT '',
                note TEXT NOT NULL DEFAULT '',
                cost_base REAL NOT NULL DEFAULT 0
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE customers(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT NOT NULL DEFAULT '',
                balance REAL NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE credit_ledger(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                entry_type TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at INTEGER NOT NULL,
                reference TEXT NOT NULL DEFAULT ''
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE expenses(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at INTEGER NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL
            )""".trimIndent()
        )
        createCashClosingsTable(db)
        db.execSQL(
            """CREATE TABLE settings(
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )""".trimIndent()
        )
        createDraftCartTable(db)
        putSetting(db, "store_name", "POSlite Store")
        putSetting(db, "owner", "")
        putSetting(db, "address", "")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) createDraftCartTable(db)
        if (oldVersion < 3) {
            db.execSQL("ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'")
            db.execSQL("ALTER TABLE sales ADD COLUMN voided_at INTEGER")
            db.execSQL("ALTER TABLE sales ADD COLUMN void_reason TEXT NOT NULL DEFAULT ''")
        }
        if (oldVersion < 4) createCashClosingsTable(db)
    }

    private fun createDraftCartTable(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS draft_cart(
                product_id INTEGER NOT NULL,
                unit_id INTEGER NOT NULL,
                qty REAL NOT NULL,
                PRIMARY KEY(product_id, unit_id),
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY(unit_id) REFERENCES product_units(id) ON DELETE CASCADE
            )""".trimIndent()
        )
    }

    private fun createCashClosingsTable(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE IF NOT EXISTS cash_closings(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                period_start INTEGER NOT NULL,
                closed_at INTEGER NOT NULL,
                opening_cash REAL NOT NULL,
                cash_sales REAL NOT NULL,
                credit_payments REAL NOT NULL,
                expenses REAL NOT NULL,
                expected_cash REAL NOT NULL,
                actual_cash REAL NOT NULL,
                variance REAL NOT NULL,
                note TEXT NOT NULL DEFAULT ''
            )""".trimIndent()
        )
    }

    fun saveDraftCart(lines: List<CartLine>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("draft_cart", null, null)
            lines.filter { it.qty > 0 }.forEach { line ->
                db.insertOrThrow("draft_cart", null, ContentValues().apply {
                    put("product_id", line.product.id)
                    put("unit_id", line.unit.id)
                    put("qty", line.qty)
                })
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getDraftCart(): List<CartLine> {
        val db = readableDatabase
        val rows = mutableListOf<CartLine>()
        db.rawQuery("SELECT product_id,unit_id,qty FROM draft_cart ORDER BY rowid", null).use { c ->
            while (c.moveToNext()) {
                val product = getProductRow(db, c.getLong(0)) ?: continue
                val unit = getUnitRow(db, c.getLong(1)) ?: continue
                val qty = c.getDouble(2)
                if (qty > 0 && unit.productId == product.id && unit.qtyBase * qty <= product.stockBase + 0.0000001) {
                    rows += CartLine(product, unit, qty)
                }
            }
        }
        return rows
    }

    fun clearDraftCart() {
        writableDatabase.delete("draft_cart", null, null)
    }

    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.setForeignKeyConstraintsEnabled(true)
    }

    fun getProducts(): List<Product> {
        val db = readableDatabase
        val products = mutableListOf<Product>()
        db.rawQuery(
            "SELECT id,name,category,barcode,base_unit,stock_base,low_stock_base,avg_cost_base FROM products ORDER BY name COLLATE NOCASE",
            null
        ).use { c ->
            while (c.moveToNext()) {
                val id = c.getLong(0)
                products += Product(
                    id = id,
                    name = c.getString(1),
                    category = c.getString(2),
                    barcode = if (c.isNull(3)) null else c.getString(3),
                    baseUnit = c.getString(4),
                    stockBase = c.getDouble(5),
                    lowStockBase = c.getDouble(6),
                    avgCostBase = c.getDouble(7),
                    units = getUnits(db, id)
                )
            }
        }
        return products
    }

    private fun getUnits(db: SQLiteDatabase, productId: Long): List<UnitOption> {
        val rows = mutableListOf<UnitOption>()
        db.rawQuery(
            "SELECT id,label,qty_base,sell_price,sale_enabled,purchase_enabled FROM product_units WHERE product_id=? ORDER BY id",
            arrayOf(productId.toString())
        ).use { c ->
            while (c.moveToNext()) {
                rows += UnitOption(
                    id = c.getLong(0),
                    productId = productId,
                    label = c.getString(1),
                    qtyBase = c.getDouble(2),
                    sellPrice = c.getDouble(3),
                    saleEnabled = c.getInt(4) == 1,
                    purchaseEnabled = c.getInt(5) == 1
                )
            }
        }
        return rows
    }

    fun saveProduct(
        existingId: Long?,
        name: String,
        category: String,
        barcode: String?,
        baseUnit: String,
        lowStockBase: Double,
        openingStock: Double,
        openingCostBase: Double,
        units: List<UnitOption>
    ): Long {
        require(name.isNotBlank()) { "Kailangan ang pangalan ng paninda." }
        require(baseUnit in setOf("pc", "g", "ml")) { "Hindi valid ang pangunahing sukat." }
        require(lowStockBase >= 0 && openingStock >= 0 && openingCostBase >= 0) { "Hindi puwedeng negative ang stock o puhunan." }
        require(units.isNotEmpty()) { "Kailangan ng kahit isang unit." }
        require(units.all { it.label.isNotBlank() && it.qtyBase > 0 && it.sellPrice >= 0 }) { "May invalid na unit, quantity, o presyo." }
        val now = System.currentTimeMillis()
        val db = writableDatabase
        db.beginTransaction()
        try {
            val values = ContentValues().apply {
                put("name", name.trim())
                put("category", category.trim())
                if (barcode.isNullOrBlank()) putNull("barcode") else put("barcode", barcode.trim())
                put("base_unit", baseUnit)
                put("low_stock_base", max(0.0, lowStockBase))
                put("updated_at", now)
                if (existingId == null) {
                    put("stock_base", max(0.0, openingStock))
                    put("avg_cost_base", max(0.0, openingCostBase))
                    put("created_at", now)
                }
            }
            val productId = if (existingId == null) {
                db.insertOrThrow("products", null, values)
            } else {
                db.update("products", values, "id=?", arrayOf(existingId.toString()))
                existingId
            }
            db.delete("product_units", "product_id=?", arrayOf(productId.toString()))
            units.forEach { unit ->
                db.insertOrThrow("product_units", null, ContentValues().apply {
                    put("product_id", productId)
                    put("label", unit.label.trim())
                    put("qty_base", max(0.0001, unit.qtyBase))
                    put("sell_price", max(0.0, unit.sellPrice))
                    put("sale_enabled", if (unit.saleEnabled) 1 else 0)
                    put("purchase_enabled", if (unit.purchaseEnabled) 1 else 0)
                })
            }
            if (existingId == null && openingStock > 0) {
                insertMovement(db, productId, "opening", openingStock, now, "", "Opening stock", openingCostBase)
            }
            db.setTransactionSuccessful()
            return productId
        } finally {
            db.endTransaction()
        }
    }

    fun deleteUnusedProduct(productId: Long): Boolean {
        val db = writableDatabase
        val used = queryLong(db, "SELECT COUNT(*) FROM sale_items WHERE product_id=?", arrayOf(productId.toString())) > 0 ||
            queryLong(db, "SELECT COUNT(*) FROM purchase_items WHERE product_id=?", arrayOf(productId.toString())) > 0
        if (used) return false
        db.delete("products", "id=?", arrayOf(productId.toString()))
        return true
    }

    fun adjustStock(productId: Long, mode: String, quantity: Double, note: String) {
        require(mode in setOf("add", "remove", "set")) { "Hindi valid ang paraan ng pag-adjust." }
        require(quantity >= 0 && (mode == "set" || quantity > 0)) { "Maglagay ng valid na dami." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val product = getProductRow(db, productId) ?: error("Product not found.")
            val old = product.stockBase
            val next = when (mode) {
                "add" -> old + max(0.0, quantity)
                "remove", "damaged", "expired" -> {
                    require(quantity <= old + 0.0000001) { "Mas mataas ang ibabawas kaysa kasalukuyang stock." }
                    old - quantity
                }
                "set", "count" -> max(0.0, quantity)
                else -> error("Hindi valid ang stock action.")
            }
            db.update("products", ContentValues().apply {
                put("stock_base", next)
                put("updated_at", System.currentTimeMillis())
            }, "id=?", arrayOf(productId.toString()))
            val movementType = when (mode) {
                "damaged" -> "damaged"
                "expired" -> "expired"
                "count" -> "stock_count"
                else -> "adjustment"
            }
            val defaultNote = when (mode) {
                "damaged" -> "Sirang paninda"
                "expired" -> "Expired na paninda"
                "count" -> "Physical stock count"
                else -> "Manual adjustment"
            }
            insertMovement(db, productId, movementType, next - old, System.currentTimeMillis(), "", note.ifBlank { defaultNote }, product.avgCostBase)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun recordPurchase(supplier: String, lines: List<PurchaseLineInput>): Long {
        require(lines.isNotEmpty()) { "Magdagdag ng kahit isang biniling paninda." }
        require(lines.all { it.qty > 0 && it.totalCost > 0 }) { "Lahat ng kumprada ay kailangang may valid na dami at kabuuang bili." }
        val db = writableDatabase
        val now = System.currentTimeMillis()
        val number = "PUR-$now"
        val total = lines.sumOf { max(0.0, it.totalCost) }
        db.beginTransaction()
        try {
            val purchaseId = db.insertOrThrow("purchases", null, ContentValues().apply {
                put("number", number)
                put("supplier", supplier.trim())
                put("created_at", now)
                put("total_cost", total)
            })
            lines.forEach { line ->
                val product = getProductRow(db, line.productId) ?: error("Product not found.")
                val unit = getUnitRow(db, line.unitId) ?: error("Unit not found.")
                val incoming = max(0.0, line.qty) * unit.qtyBase
                val oldStock = product.stockBase
                val newStock = oldStock + incoming
                val oldValue = oldStock * product.avgCostBase
                val newAvg = if (newStock > 0) (oldValue + max(0.0, line.totalCost)) / newStock else 0.0
                db.update("products", ContentValues().apply {
                    put("stock_base", newStock)
                    put("avg_cost_base", newAvg)
                    put("updated_at", now)
                }, "id=?", arrayOf(product.id.toString()))
                db.insertOrThrow("purchase_items", null, ContentValues().apply {
                    put("purchase_id", purchaseId)
                    put("product_id", product.id)
                    put("unit_label", unit.label)
                    put("qty", line.qty)
                    put("qty_base", incoming)
                    put("total_cost", line.totalCost)
                })
                insertMovement(db, product.id, "purchase", incoming, now, number, "${line.qty} ${unit.label} from ${supplier.ifBlank { "supplier" }}", if (incoming > 0) line.totalCost / incoming else 0.0)
            }
            db.setTransactionSuccessful()
            return purchaseId
        } finally {
            db.endTransaction()
        }
    }

    fun completeSale(
        cart: List<CartLine>,
        discount: Double,
        paymentType: String,
        customerId: Long?,
        customerName: String,
        cash: Double
    ): SaleReceipt {
        require(cart.isNotEmpty()) { "Walang laman ang listahan ng benta." }
        require(paymentType in setOf("cash", "credit")) { "Hindi valid ang paraan ng bayad." }
        require(cart.all { it.qty > 0 && it.qtyBase > 0 && it.amount >= 0 }) { "May invalid na quantity sa listahan." }
        val db = writableDatabase
        val now = System.currentTimeMillis()
        val number = "POS-$now"
        val subtotal = cart.sumOf { it.amount }
        val safeDiscount = discount.coerceIn(0.0, subtotal)
        val total = max(0.0, subtotal - safeDiscount)
        if (paymentType == "cash") require(cash >= total) { "Kulang ang natanggap na cash." }
        if (paymentType == "credit") require(customerId != null) { "Pumili ng customer para sa utang." }

        db.beginTransaction()
        try {
            val groupedNeeded = cart.groupBy { it.product.id }.mapValues { entry -> entry.value.sumOf { it.qtyBase } }
            groupedNeeded.forEach { (productId, needed) ->
                val p = getProductRow(db, productId) ?: error("Product not found.")
                require(needed <= p.stockBase + 0.0000001) { "Hindi sapat ang stock ng ${p.name}." }
            }
            val resolvedCustomer = if (paymentType == "credit" && customerId != null) getCustomerRow(db, customerId) else null
            val finalCustomerName = when {
                paymentType == "credit" -> resolvedCustomer?.name ?: "Credit Customer"
                customerName.isNotBlank() -> customerName.trim()
                else -> "Walk-in Customer"
            }
            val change = if (paymentType == "cash") max(0.0, cash - total) else 0.0
            val saleId = db.insertOrThrow("sales", null, ContentValues().apply {
                put("number", number)
                put("created_at", now)
                put("subtotal", subtotal)
                put("discount", safeDiscount)
                put("total", total)
                put("payment_type", paymentType)
                if (customerId == null) putNull("customer_id") else put("customer_id", customerId)
                put("customer_name", finalCustomerName)
                put("cash", if (paymentType == "cash") cash else 0.0)
                put("change_amount", change)
            })
            val receiptLines = mutableListOf<ReceiptLine>()
            cart.forEach { line ->
                val p = getProductRow(db, line.product.id) ?: error("Product not found.")
                val nextStock = max(0.0, p.stockBase - line.qtyBase)
                db.update("products", ContentValues().apply {
                    put("stock_base", nextStock)
                    put("updated_at", now)
                }, "id=?", arrayOf(p.id.toString()))
                db.insertOrThrow("sale_items", null, ContentValues().apply {
                    put("sale_id", saleId)
                    put("product_id", p.id)
                    put("product_name", p.name)
                    put("unit_label", line.unit.label)
                    put("qty", line.qty)
                    put("qty_base", line.qtyBase)
                    put("unit_price", line.unit.sellPrice)
                    put("cost_base", p.avgCostBase)
                    put("amount", line.amount)
                })
                insertMovement(db, p.id, "sale", -line.qtyBase, now, number, "${line.qty} ${line.unit.label}", p.avgCostBase)
                receiptLines += ReceiptLine(p.name, line.unit.label, line.qty, line.unit.sellPrice, line.amount)
            }
            if (paymentType == "credit" && customerId != null) {
                val customer = resolvedCustomer ?: error("Customer not found.")
                db.update("customers", ContentValues().apply {
                    put("balance", customer.balance + total)
                    put("updated_at", now)
                }, "id=?", arrayOf(customerId.toString()))
                db.insertOrThrow("credit_ledger", null, ContentValues().apply {
                    put("customer_id", customerId)
                    put("entry_type", "sale")
                    put("amount", total)
                    put("created_at", now)
                    put("reference", number)
                })
            }
            db.delete("draft_cart", null, null)
            db.setTransactionSuccessful()
            return SaleReceipt(saleId, number, now, finalCustomerName, paymentType, subtotal, safeDiscount, total, if (paymentType == "cash") cash else 0.0, change, receiptLines)
        } finally {
            db.endTransaction()
        }
    }

    fun getRecentReceipts(limit: Int = 30): List<SaleReceipt> {
        val db = readableDatabase
        val rows = mutableListOf<SaleReceipt>()
        db.rawQuery(
            "SELECT id,number,created_at,customer_name,payment_type,subtotal,discount,total,cash,change_amount,status,void_reason FROM sales ORDER BY created_at DESC LIMIT ?",
            arrayOf(limit.toString())
        ).use { c ->
            while (c.moveToNext()) {
                val saleId = c.getLong(0)
                val lines = mutableListOf<ReceiptLine>()
                db.rawQuery("SELECT product_name,unit_label,qty,unit_price,amount FROM sale_items WHERE sale_id=? ORDER BY id", arrayOf(saleId.toString())).use { items ->
                    while (items.moveToNext()) lines += ReceiptLine(items.getString(0), items.getString(1), items.getDouble(2), items.getDouble(3), items.getDouble(4))
                }
                rows += SaleReceipt(saleId, c.getString(1), c.getLong(2), c.getString(3), c.getString(4), c.getDouble(5), c.getDouble(6), c.getDouble(7), c.getDouble(8), c.getDouble(9), lines, c.getString(10), c.getString(11))
            }
        }
        return rows
    }

    fun voidSale(saleId: Long, reason: String) {
        require(reason.isNotBlank()) { "Maglagay ng dahilan ng void/return." }
        val db = writableDatabase
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            var total = 0.0
            var paymentType = ""
            var customerId: Long? = null
            var saleNumber = ""
            var saleCreatedAt = 0L
            db.rawQuery("SELECT total,payment_type,customer_id,status,number,created_at FROM sales WHERE id=?", arrayOf(saleId.toString())).use { c ->
                require(c.moveToFirst()) { "Hindi makita ang benta." }
                require(c.getString(3) == "completed") { "Na-void na ang bentang ito." }
                total = c.getDouble(0)
                paymentType = c.getString(1)
                customerId = if (c.isNull(2)) null else c.getLong(2)
                saleNumber = c.getString(4)
                saleCreatedAt = c.getLong(5)
            }
            db.rawQuery("SELECT product_id,qty_base,cost_base FROM sale_items WHERE sale_id=?", arrayOf(saleId.toString())).use { items ->
                while (items.moveToNext()) {
                    val productId = items.getLong(0)
                    val qtyBase = items.getDouble(1)
                    val product = getProductRow(db, productId) ?: error("May nawawalang paninda sa benta.")
                    db.update("products", ContentValues().apply {
                        put("stock_base", product.stockBase + qtyBase)
                        put("updated_at", now)
                    }, "id=?", arrayOf(productId.toString()))
                    insertMovement(db, productId, "sale_void", qtyBase, now, "VOID-$saleNumber", reason.trim(), items.getDouble(2))
                }
            }
            if (paymentType == "credit") {
                val id = customerId ?: error("Walang customer ang credit sale.")
                val customer = getCustomerRow(db, id) ?: error("Hindi makita ang customer.")
                val laterPayments = queryLong(
                    db,
                    "SELECT COUNT(*) FROM credit_ledger WHERE customer_id=? AND entry_type='payment' AND created_at>=?",
                    arrayOf(id.toString(), saleCreatedAt.toString())
                )
                require(laterPayments == 0L) { "Hindi ma-void: may sumunod nang bayad sa account ng customer. I-review muna ang ledger." }
                require(customer.balance + 0.0000001 >= total) { "Hindi ma-void: may naitalang bayad na para sa utang na ito." }
                db.update("customers", ContentValues().apply {
                    put("balance", max(0.0, customer.balance - total))
                    put("updated_at", now)
                }, "id=?", arrayOf(id.toString()))
                db.insertOrThrow("credit_ledger", null, ContentValues().apply {
                    put("customer_id", id)
                    put("entry_type", "sale_void")
                    put("amount", -total)
                    put("created_at", now)
                    put("reference", "VOID-$saleNumber")
                })
            }
            db.update("sales", ContentValues().apply {
                put("status", "voided")
                put("voided_at", now)
                put("void_reason", reason.trim())
            }, "id=?", arrayOf(saleId.toString()))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getCustomers(): List<Customer> {
        val rows = mutableListOf<Customer>()
        readableDatabase.rawQuery("SELECT id,name,contact,balance FROM customers ORDER BY name COLLATE NOCASE", null).use { c ->
            while (c.moveToNext()) rows += Customer(c.getLong(0), c.getString(1), c.getString(2), c.getDouble(3))
        }
        return rows
    }

    fun addCustomer(name: String, contact: String): Long {
        require(name.isNotBlank()) { "Customer name is required." }
        val now = System.currentTimeMillis()
        return writableDatabase.insertOrThrow("customers", null, ContentValues().apply {
            put("name", name.trim())
            put("contact", contact.trim())
            put("balance", 0.0)
            put("created_at", now)
            put("updated_at", now)
        })
    }

    fun getCreditLedger(customerId: Long): List<CreditEntry> {
        val rows = mutableListOf<CreditEntry>()
        readableDatabase.rawQuery("SELECT id,entry_type,amount,created_at,reference FROM credit_ledger WHERE customer_id=? ORDER BY created_at DESC,id DESC", arrayOf(customerId.toString())).use { c ->
            while (c.moveToNext()) rows += CreditEntry(c.getLong(0), c.getString(1), c.getDouble(2), c.getLong(3), c.getString(4))
        }
        return rows
    }

    fun recordCreditPayment(customerId: Long, amount: Double) {
        require(amount > 0) { "Ang bayad ay dapat higit sa zero." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val c = getCustomerRow(db, customerId) ?: error("Customer not found.")
            val applied = amount.coerceAtMost(c.balance)
            db.update("customers", ContentValues().apply {
                put("balance", max(0.0, c.balance - applied))
                put("updated_at", System.currentTimeMillis())
            }, "id=?", arrayOf(customerId.toString()))
            db.insertOrThrow("credit_ledger", null, ContentValues().apply {
                put("customer_id", customerId)
                put("entry_type", "payment")
                put("amount", applied)
                put("created_at", System.currentTimeMillis())
                put("reference", "")
            })
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getExpenses(): List<Expense> {
        val rows = mutableListOf<Expense>()
        readableDatabase.rawQuery("SELECT id,created_at,category,description,amount FROM expenses ORDER BY created_at DESC", null).use { c ->
            while (c.moveToNext()) rows += Expense(c.getLong(0), c.getLong(1), c.getString(2), c.getString(3), c.getDouble(4))
        }
        return rows
    }

    fun addExpense(category: String, description: String, amount: Double): Long {
        require(description.isNotBlank()) { "Description is required." }
        require(amount > 0) { "Ang halaga ay dapat higit sa zero." }
        return writableDatabase.insertOrThrow("expenses", null, ContentValues().apply {
            put("created_at", System.currentTimeMillis())
            put("category", category.ifBlank { "Store Expense" })
            put("description", description.trim())
            put("amount", amount)
        })
    }

    fun getDashboardStats(): DashboardStats {
        val db = readableDatabase
        val start = startOfToday()
        val sales = queryDouble(db, "SELECT COALESCE(SUM(total),0) FROM sales WHERE status='completed' AND created_at>=?", arrayOf(start.toString()))
        val tx = queryLong(db, "SELECT COUNT(*) FROM sales WHERE status='completed' AND created_at>=?", arrayOf(start.toString())).toInt()
        val cogs = queryDouble(db, "SELECT COALESCE(SUM(qty_base*cost_base),0) FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE status='completed' AND created_at>=?)", arrayOf(start.toString()))
        val credit = queryDouble(db, "SELECT COALESCE(SUM(balance),0) FROM customers", emptyArray())
        val low = queryLong(db, "SELECT COUNT(*) FROM products WHERE stock_base<=low_stock_base", emptyArray()).toInt()
        return DashboardStats(sales, tx, sales - cogs, credit, low)
    }

    fun getAnalytics(fromMillis: Long): AnalyticsSummary {
        val db = readableDatabase
        val sales = queryDouble(db, "SELECT COALESCE(SUM(total),0) FROM sales WHERE status='completed' AND created_at>=?", arrayOf(fromMillis.toString()))
        val cogs = queryDouble(db, "SELECT COALESCE(SUM(si.qty_base*si.cost_base),0) FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.status='completed' AND s.created_at>=?", arrayOf(fromMillis.toString()))
        val expenses = queryDouble(db, "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE created_at>=?", arrayOf(fromMillis.toString()))
        val purchases = queryDouble(db, "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE created_at>=?", arrayOf(fromMillis.toString()))
        val damaged = -queryDouble(db, "SELECT COALESCE(SUM(qty_base*cost_base),0) FROM stock_movements WHERE movement_type='damaged' AND created_at>=?", arrayOf(fromMillis.toString()))
        val expired = -queryDouble(db, "SELECT COALESCE(SUM(qty_base*cost_base),0) FROM stock_movements WHERE movement_type='expired' AND created_at>=?", arrayOf(fromMillis.toString()))
        return AnalyticsSummary(sales, cogs, sales - cogs, expenses, sales - cogs - expenses - damaged - expired, purchases, damaged, expired)
    }

    fun previewCashClosing(openingCash: Double): CashClosingPreview {
        require(openingCash >= 0 && openingCash.isFinite()) { "Hindi valid ang panimulang cash." }
        val db = readableDatabase
        val lastClosing = getRecentCashClosings(1).firstOrNull()
        val periodStart = max(startOfToday(), lastClosing?.closedAt ?: 0L)
        val cashSales = queryDouble(db, "SELECT COALESCE(SUM(total),0) FROM sales WHERE status='completed' AND payment_type='cash' AND created_at>=?", arrayOf(periodStart.toString()))
        val creditPayments = queryDouble(db, "SELECT COALESCE(SUM(amount),0) FROM credit_ledger WHERE entry_type='payment' AND created_at>=?", arrayOf(periodStart.toString()))
        val expenses = queryDouble(db, "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE created_at>=?", arrayOf(periodStart.toString()))
        return CashClosingPreview(periodStart, cashSales, creditPayments, expenses, openingCash + cashSales + creditPayments - expenses)
    }

    fun recordCashClosing(openingCash: Double, actualCash: Double, note: String): CashClosing {
        require(actualCash >= 0 && actualCash.isFinite()) { "Hindi valid ang aktuwal na cash." }
        val preview = previewCashClosing(openingCash)
        val now = System.currentTimeMillis()
        val variance = actualCash - preview.expectedCash
        val id = writableDatabase.insertOrThrow("cash_closings", null, ContentValues().apply {
            put("period_start", preview.periodStart)
            put("closed_at", now)
            put("opening_cash", openingCash)
            put("cash_sales", preview.cashSales)
            put("credit_payments", preview.creditPayments)
            put("expenses", preview.expenses)
            put("expected_cash", preview.expectedCash)
            put("actual_cash", actualCash)
            put("variance", variance)
            put("note", note.trim())
        })
        return getCashClosing(id) ?: error("Hindi mabasa ang na-save na cash closing #$id.")
    }

    fun getRecentCashClosings(limit: Int = 14): List<CashClosing> {
        val rows = mutableListOf<CashClosing>()
        readableDatabase.rawQuery("SELECT id,period_start,closed_at,opening_cash,cash_sales,credit_payments,expenses,expected_cash,actual_cash,variance,note FROM cash_closings ORDER BY closed_at DESC LIMIT ?", arrayOf(limit.toString())).use { c ->
            while (c.moveToNext()) rows += cashClosingRow(c)
        }
        return rows
    }

    private fun getCashClosing(id: Long): CashClosing? {
        readableDatabase.rawQuery("SELECT id,period_start,closed_at,opening_cash,cash_sales,credit_payments,expenses,expected_cash,actual_cash,variance,note FROM cash_closings WHERE id=?", arrayOf(id.toString())).use { c ->
            return if (c.moveToFirst()) cashClosingRow(c) else null
        }
    }

    private fun cashClosingRow(c: android.database.Cursor) = CashClosing(c.getLong(0), c.getLong(1), c.getLong(2), c.getDouble(3), c.getDouble(4), c.getDouble(5), c.getDouble(6), c.getDouble(7), c.getDouble(8), c.getDouble(9), c.getString(10))

    fun getSettings(): StoreSettings = StoreSettings(
        storeName = getSetting("store_name").ifBlank { "POSlite Store" },
        owner = getSetting("owner"),
        address = getSetting("address")
    )

    fun saveSettings(settings: StoreSettings) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            putSetting(db, "store_name", settings.storeName.ifBlank { "POSlite Store" })
            putSetting(db, "owner", settings.owner)
            putSetting(db, "address", settings.address)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getUiTerms(): UiTerms {
        val defaults = UiTerms()
        fun term(key: String, fallback: String) = getSetting("term_$key").trim().ifBlank { fallback }
        return UiTerms(
            home = term("home", defaults.home),
            sell = term("sell", defaults.sell),
            products = term("products", defaults.products),
            more = term("more", defaults.more),
            purchases = term("purchases", defaults.purchases),
            inventory = term("inventory", defaults.inventory),
            credit = term("credit", defaults.credit),
            expenses = term("expenses", defaults.expenses),
            analytics = term("analytics", defaults.analytics),
            cashClosing = term("cash_closing", defaults.cashClosing),
            reports = term("reports", defaults.reports),
            settings = term("settings", defaults.settings),
            back = term("back", defaults.back),
            newSale = term("new_sale", defaults.newSale)
        )
    }

    fun saveUiTerms(terms: UiTerms) {
        val values = linkedMapOf(
            "home" to terms.home,
            "sell" to terms.sell,
            "products" to terms.products,
            "more" to terms.more,
            "purchases" to terms.purchases,
            "inventory" to terms.inventory,
            "credit" to terms.credit,
            "expenses" to terms.expenses,
            "analytics" to terms.analytics,
            "cash_closing" to terms.cashClosing,
            "reports" to terms.reports,
            "settings" to terms.settings,
            "back" to terms.back,
            "new_sale" to terms.newSale
        )
        require(values.values.all { it.isNotBlank() }) { "Hindi puwedeng blank ang translation term." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            values.forEach { (key, value) -> putSetting(db, "term_$key", value.trim()) }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    private fun getSetting(key: String): String {
        readableDatabase.rawQuery("SELECT value FROM settings WHERE key=?", arrayOf(key)).use { c ->
            return if (c.moveToFirst()) c.getString(0) else ""
        }
    }

    private fun putSetting(db: SQLiteDatabase, key: String, value: String) {
        db.insertWithOnConflict("settings", null, ContentValues().apply {
            put("key", key)
            put("value", value)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    private fun insertMovement(db: SQLiteDatabase, productId: Long, type: String, qtyBase: Double, createdAt: Long, reference: String, note: String, costBase: Double) {
        db.insertOrThrow("stock_movements", null, ContentValues().apply {
            put("product_id", productId)
            put("movement_type", type)
            put("qty_base", qtyBase)
            put("created_at", createdAt)
            put("reference", reference)
            put("note", note)
            put("cost_base", costBase)
        })
    }

    private fun getProductRow(db: SQLiteDatabase, id: Long): Product? {
        db.rawQuery("SELECT id,name,category,barcode,base_unit,stock_base,low_stock_base,avg_cost_base FROM products WHERE id=?", arrayOf(id.toString())).use { c ->
            if (!c.moveToFirst()) return null
            return Product(c.getLong(0), c.getString(1), c.getString(2), if (c.isNull(3)) null else c.getString(3), c.getString(4), c.getDouble(5), c.getDouble(6), c.getDouble(7), getUnits(db, id))
        }
    }

    private fun getUnitRow(db: SQLiteDatabase, id: Long): UnitOption? {
        db.rawQuery("SELECT id,product_id,label,qty_base,sell_price,sale_enabled,purchase_enabled FROM product_units WHERE id=?", arrayOf(id.toString())).use { c ->
            if (!c.moveToFirst()) return null
            return UnitOption(c.getLong(0), c.getLong(1), c.getString(2), c.getDouble(3), c.getDouble(4), c.getInt(5) == 1, c.getInt(6) == 1)
        }
    }

    private fun getCustomerRow(db: SQLiteDatabase, id: Long): Customer? {
        db.rawQuery("SELECT id,name,contact,balance FROM customers WHERE id=?", arrayOf(id.toString())).use { c ->
            if (!c.moveToFirst()) return null
            return Customer(c.getLong(0), c.getString(1), c.getString(2), c.getDouble(3))
        }
    }

    private fun queryDouble(db: SQLiteDatabase, sql: String, args: Array<String>): Double {
        db.rawQuery(sql, args).use { c -> return if (c.moveToFirst()) c.getDouble(0) else 0.0 }
    }

    private fun queryLong(db: SQLiteDatabase, sql: String, args: Array<String>): Long {
        db.rawQuery(sql, args).use { c -> return if (c.moveToFirst()) c.getLong(0) else 0L }
    }

    private fun startOfToday(): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
        cal.set(java.util.Calendar.MINUTE, 0)
        cal.set(java.util.Calendar.SECOND, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    fun exportBackup(): String {
        val db = readableDatabase
        val tables = JSONObject()
        BACKUP_TABLES.forEach { (table, columns) ->
            val rows = JSONArray()
            db.query(table, columns, null, null, null, null, null).use { cursor ->
                while (cursor.moveToNext()) {
                    val row = JSONObject()
                    columns.forEachIndexed { index, column ->
                        when (cursor.getType(index)) {
                            android.database.Cursor.FIELD_TYPE_NULL -> row.put(column, JSONObject.NULL)
                            android.database.Cursor.FIELD_TYPE_INTEGER -> row.put(column, cursor.getLong(index))
                            android.database.Cursor.FIELD_TYPE_FLOAT -> row.put(column, cursor.getDouble(index))
                            android.database.Cursor.FIELD_TYPE_BLOB -> error("Hindi suportado ang binary database field sa backup.")
                            else -> row.put(column, cursor.getString(index))
                        }
                    }
                    rows.put(row)
                }
            }
            tables.put(table, rows)
        }
        return JSONObject().apply {
            put("format", BACKUP_FORMAT)
            put("schemaVersion", BACKUP_SCHEMA)
            put("appVersion", "0.8.0-native-dev")
            put("exportedAt", System.currentTimeMillis())
            put("tables", tables)
        }.toString(2)
    }

    fun previewBackup(text: String): BackupPreview {
        val root = parseBackup(text)
        val tables = root.getJSONObject("tables")
        return BackupPreview(
            products = tables.getJSONArray("products").length(),
            sales = tables.getJSONArray("sales").length(),
            purchases = tables.getJSONArray("purchases").length(),
            customers = tables.getJSONArray("customers").length(),
            expenses = tables.getJSONArray("expenses").length(),
            exportedAt = root.optLong("exportedAt")
        )
    }

    fun restoreBackup(text: String) {
        val root = parseBackup(text)
        val tables = root.getJSONObject("tables")
        val db = writableDatabase
        db.beginTransaction()
        try {
            BACKUP_DELETE_ORDER.forEach { db.delete(it, null, null) }
            BACKUP_TABLES.forEach { (table, columns) ->
                val rows = tables.optJSONArray(table) ?: JSONArray()
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    val values = ContentValues()
                    columns.forEach { column ->
                        if (row.has(column) && row.isNull(column)) {
                            values.putNull(column)
                        } else if (row.has(column)) {
                            when (val value = row.get(column)) {
                                is Int -> values.put(column, value)
                                is Long -> values.put(column, value)
                                is Double -> values.put(column, value)
                                is Boolean -> values.put(column, if (value) 1 else 0)
                                else -> values.put(column, value.toString())
                            }
                        }
                    }
                    db.insertOrThrow(table, null, values)
                }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    private fun parseBackup(text: String): JSONObject {
        val root = runCatching { JSONObject(text) }.getOrElse { error("Hindi mabasa ang .pos file.") }
        require(root.optString("format") == BACKUP_FORMAT) { "Hindi ito SariPOS Android backup." }
        val schema = root.optInt("schemaVersion")
        require(schema in 1..BACKUP_SCHEMA) { "Hindi suportado ang backup version na ito." }
        val tables = root.optJSONObject("tables") ?: error("Kulang ang backup data.")
        BACKUP_TABLES.forEach { (table, _) ->
            if (table != "cash_closings" || schema >= 3) require(tables.optJSONArray(table) != null) { "Kulang ang $table sa backup." }
        }
        return root
    }

    companion object {
        private const val DB_NAME = "poslite-native.db"
        private const val DB_VERSION = 4
        private const val BACKUP_FORMAT = "SariPOS-Android"
        private const val BACKUP_SCHEMA = 3

        private val BACKUP_TABLES = linkedMapOf(
            "products" to arrayOf("id", "name", "category", "barcode", "base_unit", "stock_base", "low_stock_base", "avg_cost_base", "created_at", "updated_at"),
            "product_units" to arrayOf("id", "product_id", "label", "qty_base", "sell_price", "sale_enabled", "purchase_enabled"),
            "customers" to arrayOf("id", "name", "contact", "balance", "created_at", "updated_at"),
            "sales" to arrayOf("id", "number", "created_at", "subtotal", "discount", "total", "payment_type", "customer_id", "customer_name", "cash", "change_amount", "status", "voided_at", "void_reason"),
            "sale_items" to arrayOf("id", "sale_id", "product_id", "product_name", "unit_label", "qty", "qty_base", "unit_price", "cost_base", "amount"),
            "purchases" to arrayOf("id", "number", "supplier", "created_at", "total_cost"),
            "purchase_items" to arrayOf("id", "purchase_id", "product_id", "unit_label", "qty", "qty_base", "total_cost"),
            "stock_movements" to arrayOf("id", "product_id", "movement_type", "qty_base", "created_at", "reference", "note", "cost_base"),
            "credit_ledger" to arrayOf("id", "customer_id", "entry_type", "amount", "created_at", "reference"),
            "expenses" to arrayOf("id", "created_at", "category", "description", "amount"),
            "cash_closings" to arrayOf("id", "period_start", "closed_at", "opening_cash", "cash_sales", "credit_payments", "expenses", "expected_cash", "actual_cash", "variance", "note"),
            "settings" to arrayOf("key", "value"),
            "draft_cart" to arrayOf("product_id", "unit_id", "qty")
        )

        private val BACKUP_DELETE_ORDER = listOf(
            "draft_cart", "credit_ledger", "sale_items", "purchase_items", "stock_movements",
            "sales", "purchases", "expenses", "cash_closings", "product_units", "customers", "products", "settings"
        )
    }
}
