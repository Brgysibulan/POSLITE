package ph.poslite.app.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
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
    val lines: List<ReceiptLine>
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
    val purchaseSpend: Double
)

data class StoreSettings(
    val storeName: String = "POSlite Store",
    val owner: String = "",
    val address: String = ""
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
                change_amount REAL NOT NULL DEFAULT 0
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
        db.execSQL(
            """CREATE TABLE settings(
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )""".trimIndent()
        )
        putSetting(db, "store_name", "POSlite Store")
        putSetting(db, "owner", "")
        putSetting(db, "address", "")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

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
        require(name.isNotBlank()) { "Product name is required." }
        require(units.isNotEmpty()) { "At least one unit is required." }
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
        val db = writableDatabase
        db.beginTransaction()
        try {
            val product = getProductRow(db, productId) ?: error("Product not found.")
            val old = product.stockBase
            val next = when (mode) {
                "add" -> old + max(0.0, quantity)
                "remove" -> max(0.0, old - max(0.0, quantity))
                "set" -> max(0.0, quantity)
                else -> old
            }
            db.update("products", ContentValues().apply {
                put("stock_base", next)
                put("updated_at", System.currentTimeMillis())
            }, "id=?", arrayOf(productId.toString()))
            insertMovement(db, productId, "adjustment", next - old, System.currentTimeMillis(), "", note.ifBlank { "Manual adjustment" }, product.avgCostBase)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun recordPurchase(supplier: String, lines: List<PurchaseLineInput>): Long {
        require(lines.isNotEmpty()) { "Add at least one purchase item." }
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
        require(cart.isNotEmpty()) { "Cart is empty." }
        val db = writableDatabase
        val now = System.currentTimeMillis()
        val number = "POS-$now"
        val subtotal = cart.sumOf { it.amount }
        val safeDiscount = discount.coerceIn(0.0, subtotal)
        val total = max(0.0, subtotal - safeDiscount)
        if (paymentType == "cash") require(cash >= total) { "Cash received is less than total." }
        if (paymentType == "credit") require(customerId != null) { "Select a customer for credit sale." }

        db.beginTransaction()
        try {
            val groupedNeeded = cart.groupBy { it.product.id }.mapValues { entry -> entry.value.sumOf { it.qtyBase } }
            groupedNeeded.forEach { (productId, needed) ->
                val p = getProductRow(db, productId) ?: error("Product not found.")
                require(needed <= p.stockBase + 0.0000001) { "Not enough stock for ${p.name}." }
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
            "SELECT id,number,created_at,customer_name,payment_type,subtotal,discount,total,cash,change_amount FROM sales ORDER BY created_at DESC LIMIT ?",
            arrayOf(limit.toString())
        ).use { c ->
            while (c.moveToNext()) {
                val saleId = c.getLong(0)
                val lines = mutableListOf<ReceiptLine>()
                db.rawQuery("SELECT product_name,unit_label,qty,unit_price,amount FROM sale_items WHERE sale_id=? ORDER BY id", arrayOf(saleId.toString())).use { items ->
                    while (items.moveToNext()) lines += ReceiptLine(items.getString(0), items.getString(1), items.getDouble(2), items.getDouble(3), items.getDouble(4))
                }
                rows += SaleReceipt(saleId, c.getString(1), c.getLong(2), c.getString(3), c.getString(4), c.getDouble(5), c.getDouble(6), c.getDouble(7), c.getDouble(8), c.getDouble(9), lines)
            }
        }
        return rows
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

    fun recordCreditPayment(customerId: Long, amount: Double) {
        require(amount > 0) { "Payment must be greater than zero." }
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
        require(amount >= 0) { "Amount cannot be negative." }
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
        val sales = queryDouble(db, "SELECT COALESCE(SUM(total),0) FROM sales WHERE created_at>=?", arrayOf(start.toString()))
        val tx = queryLong(db, "SELECT COUNT(*) FROM sales WHERE created_at>=?", arrayOf(start.toString())).toInt()
        val cogs = queryDouble(db, "SELECT COALESCE(SUM(qty_base*cost_base),0) FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE created_at>=?)", arrayOf(start.toString()))
        val credit = queryDouble(db, "SELECT COALESCE(SUM(balance),0) FROM customers", emptyArray())
        val low = queryLong(db, "SELECT COUNT(*) FROM products WHERE stock_base<=low_stock_base", emptyArray()).toInt()
        return DashboardStats(sales, tx, sales - cogs, credit, low)
    }

    fun getAnalytics(fromMillis: Long): AnalyticsSummary {
        val db = readableDatabase
        val sales = queryDouble(db, "SELECT COALESCE(SUM(total),0) FROM sales WHERE created_at>=?", arrayOf(fromMillis.toString()))
        val cogs = queryDouble(db, "SELECT COALESCE(SUM(si.qty_base*si.cost_base),0) FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at>=?", arrayOf(fromMillis.toString()))
        val expenses = queryDouble(db, "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE created_at>=?", arrayOf(fromMillis.toString()))
        val purchases = queryDouble(db, "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE created_at>=?", arrayOf(fromMillis.toString()))
        return AnalyticsSummary(sales, cogs, sales - cogs, expenses, sales - cogs - expenses, purchases)
    }

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

    companion object {
        private const val DB_NAME = "poslite-native.db"
        private const val DB_VERSION = 1
    }
}
