package ph.poslite.app

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.google.android.gms.mlkit.vision.codescanner.GmsBarcodeScanning
import ph.poslite.app.data.AnalyticsSummary
import ph.poslite.app.data.CartLine
import ph.poslite.app.data.Customer
import ph.poslite.app.data.DashboardStats
import ph.poslite.app.data.PosStore
import ph.poslite.app.data.Product
import ph.poslite.app.data.PurchaseLineInput
import ph.poslite.app.data.SaleReceipt
import ph.poslite.app.data.StoreSettings
import ph.poslite.app.data.UnitOption
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max

private enum class Screen { HOME, SELL, PRODUCTS, MORE, PURCHASES, INVENTORY, CREDIT, EXPENSES, ANALYTICS, REPORTS, SETTINGS }

private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(value)
private fun fmtDate(value: Long): String = SimpleDateFormat("MMM d, yyyy h:mm a", Locale("en", "PH")).format(Date(value))
private fun num(value: String): Double = value.toDoubleOrNull() ?: 0.0

private fun stockText(p: Product): String = when (p.baseUnit) {
    "g" -> if (p.stockBase >= 1000) "${trimNumber(p.stockBase / 1000)} kg" else "${trimNumber(p.stockBase)} g"
    "ml" -> if (p.stockBase >= 1000) "${trimNumber(p.stockBase / 1000)} L" else "${trimNumber(p.stockBase)} ml"
    else -> "${trimNumber(p.stockBase)} pc"
}

private fun trimNumber(v: Double): String = if (v % 1.0 == 0.0) v.toLong().toString() else "%.2f".format(Locale.US, v).trimEnd('0').trimEnd('.')

private class PosController(context: Context) {
    val store = PosStore(context.applicationContext)
    var products by mutableStateOf(emptyList<Product>())
        private set
    var customers by mutableStateOf(emptyList<Customer>())
        private set
    var receipts by mutableStateOf(emptyList<SaleReceipt>())
        private set
    var stats by mutableStateOf(DashboardStats(0.0, 0, 0.0, 0.0, 0))
        private set
    var settings by mutableStateOf(StoreSettings())
        private set
    var dataVersion by mutableIntStateOf(0)
        private set
    val cart = mutableStateListOf<CartLine>()
    var activeReceipt by mutableStateOf<SaleReceipt?>(null)

    init { refresh() }

    fun refresh() {
        products = store.getProducts()
        customers = store.getCustomers()
        receipts = store.getRecentReceipts()
        stats = store.getDashboardStats()
        settings = store.getSettings()
        dataVersion++
    }

    fun analytics(days: Int): AnalyticsSummary {
        val from = System.currentTimeMillis() - (days.toLong() - 1L) * 86_400_000L
        return store.getAnalytics(from)
    }

    fun addToCart(product: Product, unit: UnitOption) {
        val used = cart.filter { it.product.id == product.id }.sumOf { it.qtyBase }
        if (used + unit.qtyBase > product.stockBase + 0.0000001) error("Not enough stock.")
        val index = cart.indexOfFirst { it.product.id == product.id && it.unit.id == unit.id }
        if (index >= 0) {
            val line = cart[index]
            cart[index] = line.copy(qty = line.qty + if (product.baseUnit == "pc") 1.0 else 0.01)
        } else {
            cart += CartLine(product, unit, 1.0)
        }
    }

    fun changeCartQty(index: Int, delta: Double) {
        val line = cart.getOrNull(index) ?: return
        val next = max(0.0, line.qty + delta)
        if (next <= 0.000001) {
            cart.removeAt(index)
            return
        }
        val otherBase = cart.filterIndexed { i, it -> i != index && it.product.id == line.product.id }.sumOf { it.qtyBase }
        if (otherBase + line.unit.qtyBase * next > line.product.stockBase + 0.0000001) error("Not enough stock.")
        cart[index] = line.copy(qty = next)
    }

    fun checkout(discount: Double, paymentType: String, customerId: Long?, customerName: String, cash: Double) {
        val receipt = store.completeSale(cart.toList(), discount, paymentType, customerId, customerName, cash)
        cart.clear()
        refresh()
        activeReceipt = receipt
    }
}

@Composable
fun PosApp() {
    val context = LocalContext.current
    val controller = remember { PosController(context) }
    var screen by remember { mutableStateOf(Screen.HOME) }
    val moreSelected = screen !in listOf(Screen.HOME, Screen.SELL, Screen.PRODUCTS)

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(selected = screen == Screen.HOME, onClick = { screen = Screen.HOME }, icon = { Text("⌂") }, label = { Text("Home") })
                NavigationBarItem(selected = screen == Screen.SELL, onClick = { screen = Screen.SELL }, icon = { Text("＋") }, label = { Text("Sell") })
                NavigationBarItem(selected = screen == Screen.PRODUCTS, onClick = { screen = Screen.PRODUCTS }, icon = { Text("▦") }, label = { Text("Products") })
                NavigationBarItem(selected = moreSelected || screen == Screen.MORE, onClick = { screen = Screen.MORE }, icon = { Text("☰") }, label = { Text("More") })
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (screen) {
                Screen.HOME -> HomeScreen(controller, onSell = { screen = Screen.SELL }, onPurchases = { screen = Screen.PURCHASES })
                Screen.SELL -> SellScreen(controller)
                Screen.PRODUCTS -> ProductsScreen(controller)
                Screen.MORE -> MoreScreen { screen = it }
                Screen.PURCHASES -> PurchaseScreen(controller) { screen = Screen.MORE }
                Screen.INVENTORY -> InventoryScreen(controller) { screen = Screen.MORE }
                Screen.CREDIT -> CreditScreen(controller) { screen = Screen.MORE }
                Screen.EXPENSES -> ExpensesScreen(controller) { screen = Screen.MORE }
                Screen.ANALYTICS -> AnalyticsScreen(controller) { screen = Screen.MORE }
                Screen.REPORTS -> ReportsScreen(controller) { screen = Screen.MORE }
                Screen.SETTINGS -> SettingsScreen(controller) { screen = Screen.MORE }
            }
        }
    }

    controller.activeReceipt?.let { receipt ->
        ReceiptDialog(receipt, controller.settings, onDismiss = { controller.activeReceipt = null })
    }
}

@Composable
private fun Header(title: String, subtitle: String = "", onBack: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            TextButton(onClick = onBack) { Text("‹ Back") }
            Spacer(Modifier.width(4.dp))
        }
        Column {
            Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            if (subtitle.isNotBlank()) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun Stat(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun HomeScreen(c: PosController, onSell: () -> Unit, onPurchases: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)) {
        item { Header("POSlite", "Native Android · offline local data") }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("Sales Today", money(c.stats.salesToday), Modifier.weight(1f))
                Stat("Transactions", c.stats.transactionsToday.toString(), Modifier.weight(1f))
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("Gross Profit", money(c.stats.grossProfitToday), Modifier.weight(1f))
                Stat("Total Credit", money(c.stats.totalCredit), Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSell, modifier = Modifier.weight(1f)) { Text("New Sale") }
                OutlinedButton(onClick = onPurchases, modifier = Modifier.weight(1f)) { Text("Stock In") }
            }
        }
        item {
            Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Inventory", fontWeight = FontWeight.Bold)
                    Text("${c.products.size} products · ${c.stats.lowStock} low/out of stock")
                }
            }
        }
    }
}

@Composable
private fun SellScreen(c: PosController) {
    val context = LocalContext.current
    val scanner = remember { GmsBarcodeScanning.getClient(context) }
    var search by remember { mutableStateOf("") }
    var discount by remember { mutableStateOf("0") }
    var cash by remember { mutableStateOf("") }
    var customerName by remember { mutableStateOf("") }
    var paymentType by remember { mutableStateOf("cash") }
    var customerId by remember { mutableStateOf<Long?>(null) }
    val filtered = c.products.filter {
        search.isBlank() || it.name.contains(search, true) || it.category.contains(search, true) || (it.barcode?.contains(search, true) == true)
    }
    val subtotal = c.cart.sumOf { it.amount }
    val total = max(0.0, subtotal - num(discount).coerceIn(0.0, subtotal))

    Column(Modifier.fillMaxSize()) {
        Header("Sell", "Native barcode/QR scan + touch checkout")
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(search, { search = it }, label = { Text("Search / barcode") }, modifier = Modifier.weight(1f), singleLine = true)
            Button(onClick = {
                scanner.startScan()
                    .addOnSuccessListener { barcode ->
                        val code = barcode.rawValue.orEmpty()
                        search = code
                        val product = c.products.firstOrNull { !it.barcode.isNullOrBlank() && it.barcode == code }
                        val unit = product?.units?.firstOrNull { it.saleEnabled }
                        if (product != null && unit != null) {
                            runCatching { c.addToCart(product, unit) }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() }
                        } else Toast.makeText(context, "Code not assigned to a product.", Toast.LENGTH_SHORT).show()
                    }
                    .addOnFailureListener { Toast.makeText(context, it.message ?: "Scanner unavailable.", Toast.LENGTH_SHORT).show() }
            }) { Text("Scan") }
        }

        Row(Modifier.fillMaxWidth().weight(1f).padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            LazyColumn(Modifier.weight(1f)) {
                items(filtered, key = { it.id }) { product ->
                    ProductSellCard(product) { unit ->
                        runCatching { c.addToCart(product, unit) }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
            LazyColumn(Modifier.weight(1f)) {
                item { Text("Cart", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                items(c.cart.size) { index ->
                    val line = c.cart[index]
                    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Column(Modifier.padding(10.dp)) {
                            Text(line.product.name, fontWeight = FontWeight.Bold)
                            Text("${line.unit.label} · ${money(line.unit.sellPrice)}")
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                TextButton(onClick = { runCatching { c.changeCartQty(index, -(if (line.product.baseUnit == "pc") 1.0 else 0.01)) } }) { Text("−") }
                                Text(trimNumber(line.qty), modifier = Modifier.padding(horizontal = 4.dp))
                                TextButton(onClick = { runCatching { c.changeCartQty(index, if (line.product.baseUnit == "pc") 1.0 else 0.01) }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() } }) { Text("+") }
                            }
                            Text(money(line.amount), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                item {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    Text("Subtotal ${money(subtotal)}")
                    OutlinedTextField(discount, { discount = it }, label = { Text("Discount") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Text("TOTAL ${money(total)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (paymentType == "cash") Button(onClick = {}) { Text("Cash") } else OutlinedButton(onClick = { paymentType = "cash" }) { Text("Cash") }
                        if (paymentType == "credit") Button(onClick = {}) { Text("Utang") } else OutlinedButton(onClick = { paymentType = "credit" }) { Text("Utang") }
                    }
                    if (paymentType == "cash") {
                        OutlinedTextField(customerName, { customerName = it }, label = { Text("Customer name (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(cash, { cash = it }, label = { Text("Cash received") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        Text("Change ${money(max(0.0, num(cash) - total))}")
                    } else {
                        CustomerPicker(c.customers, customerId) { customerId = it }
                    }
                    Button(
                        onClick = {
                            runCatching { c.checkout(num(discount), paymentType, customerId, customerName, num(cash)) }
                                .onFailure { Toast.makeText(context, it.message, Toast.LENGTH_LONG).show() }
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    ) { Text("Complete Sale") }
                }
            }
        }
    }
}

@Composable
private fun ProductSellCard(product: Product, onAdd: (UnitOption) -> Unit) {
    val units = product.units.filter { it.saleEnabled }
    var selected by remember(product.id, product.units) { mutableStateOf(units.firstOrNull()) }
    var expanded by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Text(product.name, fontWeight = FontWeight.Bold)
            Text("${product.category.ifBlank { "Uncategorized" }} · ${stockText(product)}", style = MaterialTheme.typography.bodySmall)
            Text(product.barcode ?: "No barcode", style = MaterialTheme.typography.labelSmall)
            Box {
                OutlinedButton(onClick = { expanded = true }, enabled = units.isNotEmpty()) { Text(selected?.let { "${it.label} · ${money(it.sellPrice)}" } ?: "No selling unit") }
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    units.forEach { unit -> DropdownMenuItem(text = { Text("${unit.label} · ${money(unit.sellPrice)}") }, onClick = { selected = unit; expanded = false }) }
                }
            }
            Button(onClick = { selected?.let(onAdd) }, enabled = product.stockBase > 0 && selected != null, modifier = Modifier.fillMaxWidth()) { Text("Add") }
        }
    }
}

@Composable
private fun CustomerPicker(customers: List<Customer>, selectedId: Long?, onSelect: (Long?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val selected = customers.firstOrNull { it.id == selectedId }
    Column(Modifier.fillMaxWidth()) {
        Text("Credit customer", style = MaterialTheme.typography.labelMedium)
        Box {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(selected?.let { "${it.name} · ${money(it.balance)}" } ?: "Select customer") }
            DropdownMenu(expanded, { expanded = false }) {
                customers.forEach { customer -> DropdownMenuItem(text = { Text("${customer.name} · ${money(customer.balance)}") }, onClick = { onSelect(customer.id); expanded = false }) }
            }
        }
    }
}

private data class DraftUnit(val label: String, val qtyBase: String, val sellPrice: String, val sell: Boolean = true, val buy: Boolean = true)

@Composable
private fun ProductsScreen(c: PosController) {
    var editing by remember { mutableStateOf<Product?>(null) }
    var addNew by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Header("Products", "No-barcode, piece/pack/kilo conversions") }
            Button(onClick = { addNew = true }, modifier = Modifier.padding(end = 16.dp)) { Text("Add Product") }
        }
        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            items(c.products, key = { it.id }) { p ->
                Card(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Column(Modifier.padding(12.dp)) {
                        Text(p.name, fontWeight = FontWeight.Bold)
                        Text("${p.category.ifBlank { "Uncategorized" }} · ${stockText(p)} · ${p.barcode ?: "No barcode"}")
                        Text(p.units.joinToString(" · ") { "${it.label}=${trimNumber(it.qtyBase)} ${p.baseUnit}" }, style = MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { editing = p }) { Text("Edit") }
                            TextButton(onClick = {
                                val ok = c.store.deleteUnusedProduct(p.id)
                                if (!ok) Toast.makeText(null, "", Toast.LENGTH_SHORT)
                                c.refresh()
                            }) { Text("Delete") }
                        }
                    }
                }
            }
        }
    }
    if (addNew || editing != null) {
        ProductEditor(c, editing, onDismiss = { addNew = false; editing = null })
    }
}

@Composable
private fun ProductEditor(c: PosController, product: Product?, onDismiss: () -> Unit) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(product?.name ?: "") }
    var category by remember { mutableStateOf(product?.category ?: "") }
    var barcode by remember { mutableStateOf(product?.barcode ?: "") }
    var noBarcode by remember { mutableStateOf(product != null && product.barcode.isNullOrBlank()) }
    var baseUnit by remember { mutableStateOf(product?.baseUnit ?: "pc") }
    var lowStock by remember { mutableStateOf((product?.lowStockBase ?: 5.0).toString()) }
    var openingStock by remember { mutableStateOf("0") }
    var openingCost by remember { mutableStateOf("0") }
    var units by remember {
        mutableStateOf(
            product?.units?.map { DraftUnit(it.label, it.qtyBase.toString(), it.sellPrice.toString(), it.saleEnabled, it.purchaseEnabled) }
                ?: listOf(DraftUnit("Piece", "1", "0"))
        )
    }
    Dialog(onDismissRequest = onDismiss) {
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                Text(if (product == null) "Add Product" else "Edit Product", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                OutlinedTextField(name, { name = it }, label = { Text("Product name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(category, { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(noBarcode, { noBarcode = it; if (it) barcode = "" })
                    Text("Product has no barcode")
                }
                OutlinedTextField(barcode, { barcode = it }, enabled = !noBarcode, label = { Text("Barcode") }, modifier = Modifier.fillMaxWidth())
                Text("Base unit")
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("pc" to "Piece", "g" to "Gram", "ml" to "Milliliter").forEach { (code, label) ->
                        if (baseUnit == code) Button(onClick = {}) { Text(label) } else OutlinedButton(onClick = { if (product == null) baseUnit = code }, enabled = product == null) { Text(label) }
                    }
                }
                OutlinedTextField(lowStock, { lowStock = it }, label = { Text("Low stock base qty") }, modifier = Modifier.fillMaxWidth())
                if (product == null) {
                    OutlinedTextField(openingStock, { openingStock = it }, label = { Text("Opening stock base qty") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(openingCost, { openingCost = it }, label = { Text("Opening cost per base") }, modifier = Modifier.fillMaxWidth())
                } else Text("Current stock: ${stockText(product)}")
                Spacer(Modifier.height(8.dp))
                Text("Units & conversions", fontWeight = FontWeight.Bold)
                Text("Example: Pack = 50 pieces; 1 kg = 1000 grams", style = MaterialTheme.typography.bodySmall)
                units.forEachIndexed { index, u ->
                    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Column(Modifier.padding(8.dp)) {
                            OutlinedTextField(u.label, { value -> units = units.toMutableList().also { it[index] = u.copy(label = value) } }, label = { Text("Unit label") }, modifier = Modifier.fillMaxWidth())
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                OutlinedTextField(u.qtyBase, { value -> units = units.toMutableList().also { it[index] = u.copy(qtyBase = value) } }, label = { Text("Base qty") }, modifier = Modifier.weight(1f))
                                OutlinedTextField(u.sellPrice, { value -> units = units.toMutableList().also { it[index] = u.copy(sellPrice = value) } }, label = { Text("Sell price") }, modifier = Modifier.weight(1f))
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(u.sell, { value -> units = units.toMutableList().also { it[index] = u.copy(sell = value) } }); Text("Sell")
                                Checkbox(u.buy, { value -> units = units.toMutableList().also { it[index] = u.copy(buy = value) } }); Text("Buy")
                                if (units.size > 1) TextButton(onClick = { units = units.filterIndexed { i, _ -> i != index } }) { Text("Remove") }
                            }
                        }
                    }
                }
                OutlinedButton(onClick = { units = units + DraftUnit("", "1", "0") }) { Text("Add Unit") }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Button(onClick = {
                        val parsed = units.map { UnitOption(label = it.label.trim(), qtyBase = num(it.qtyBase), sellPrice = num(it.sellPrice), saleEnabled = it.sell, purchaseEnabled = it.buy) }.filter { it.label.isNotBlank() && it.qtyBase > 0 }
                        runCatching {
                            require(parsed.any { it.saleEnabled }) { "At least one selling unit is required." }
                            require(parsed.any { it.purchaseEnabled }) { "At least one purchasing unit is required." }
                            c.store.saveProduct(product?.id, name, category, if (noBarcode) null else barcode, baseUnit, num(lowStock), num(openingStock), num(openingCost), parsed)
                            c.refresh(); onDismiss()
                        }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_LONG).show() }
                    }) { Text("Save") }
                }
            }
        }
    }
}

@Composable
private fun MoreScreen(open: (Screen) -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item { Header("More", "Native Android modules") }
        items(listOf(
            Screen.PURCHASES to "Purchases / Stock In",
            Screen.INVENTORY to "Inventory",
            Screen.CREDIT to "Credit / Utang",
            Screen.EXPENSES to "Expenses",
            Screen.ANALYTICS to "Analytics",
            Screen.REPORTS to "Receipts / Reports",
            Screen.SETTINGS to "Settings"
        )) { (screen, label) ->
            Button(onClick = { open(screen) }, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp)) { Text(label) }
        }
    }
}

private data class PurchaseDraft(val product: Product, val unit: UnitOption, val qty: Double, val totalCost: Double)

@Composable
private fun PurchaseScreen(c: PosController, back: () -> Unit) {
    val context = LocalContext.current
    var supplier by remember { mutableStateOf("") }
    var selectedProduct by remember(c.products) { mutableStateOf(c.products.firstOrNull()) }
    var selectedUnit by remember(selectedProduct) { mutableStateOf(selectedProduct?.units?.firstOrNull { it.purchaseEnabled }) }
    var qty by remember { mutableStateOf("1") }
    var cost by remember { mutableStateOf("0") }
    var draft by remember { mutableStateOf(emptyList<PurchaseDraft>()) }
    Column(Modifier.fillMaxSize()) {
        Header("Purchases / Stock In", "Weighted-average cost + stock movement", back)
        Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
            OutlinedTextField(supplier, { supplier = it }, label = { Text("Supplier (optional)") }, modifier = Modifier.fillMaxWidth())
            PickerButton("Product", selectedProduct?.name ?: "Select product", c.products.map { it.name }) { index -> selectedProduct = c.products[index]; selectedUnit = selectedProduct?.units?.firstOrNull { it.purchaseEnabled } }
            val buyUnits = selectedProduct?.units?.filter { it.purchaseEnabled }.orEmpty()
            PickerButton("Unit", selectedUnit?.label ?: "Select unit", buyUnits.map { it.label }) { index -> selectedUnit = buyUnits[index] }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(qty, { qty = it }, label = { Text("Qty") }, modifier = Modifier.weight(1f))
                OutlinedTextField(cost, { cost = it }, label = { Text("Total cost") }, modifier = Modifier.weight(1f))
            }
            Button(onClick = {
                val p = selectedProduct; val u = selectedUnit
                if (p != null && u != null && num(qty) > 0) {
                    draft = draft + PurchaseDraft(p, u, num(qty), num(cost)); qty = "1"; cost = "0"
                }
            }) { Text("Add Purchase Item") }
            draft.forEachIndexed { i, line ->
                Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(line.product.name, fontWeight = FontWeight.Bold); Text("${trimNumber(line.qty)} ${line.unit.label} · ${money(line.totalCost)}") }
                        TextButton(onClick = { draft = draft.filterIndexed { index, _ -> index != i } }) { Text("Remove") }
                    }
                }
            }
            Text("Purchase total: ${money(draft.sumOf { it.totalCost })}", fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 8.dp))
            Button(onClick = {
                runCatching {
                    c.store.recordPurchase(supplier, draft.map { PurchaseLineInput(it.product.id, it.unit.id, it.qty, it.totalCost) }); draft = emptyList(); supplier = ""; c.refresh()
                }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_LONG).show() }
            }, enabled = draft.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Save Purchase") }
        }
    }
}

@Composable
private fun PickerButton(label: String, value: String, options: List<String>, select: (Int) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Box {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth(), enabled = options.isNotEmpty()) { Text(value) }
            DropdownMenu(expanded, { expanded = false }) {
                options.forEachIndexed { index, text -> DropdownMenuItem(text = { Text(text) }, onClick = { select(index); expanded = false }) }
            }
        }
    }
}

@Composable
private fun InventoryScreen(c: PosController, back: () -> Unit) {
    var adjusting by remember { mutableStateOf<Product?>(null) }
    Column(Modifier.fillMaxSize()) {
        Header("Inventory", "Base-unit stock and adjustments", back)
        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            items(c.products, key = { it.id }) { p ->
                Card(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(p.name, fontWeight = FontWeight.Bold); Text(stockText(p)); Text("Avg cost ${money(p.avgCostBase)} / ${p.baseUnit}", style = MaterialTheme.typography.bodySmall) }
                        OutlinedButton(onClick = { adjusting = p }) { Text("Adjust") }
                    }
                }
            }
        }
    }
    adjusting?.let { product -> AdjustmentDialog(c, product) { adjusting = null } }
}

@Composable
private fun AdjustmentDialog(c: PosController, product: Product, dismiss: () -> Unit) {
    val context = LocalContext.current
    var mode by remember { mutableStateOf("add") }
    var qty by remember { mutableStateOf("0") }
    var note by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = dismiss,
        title = { Text("Adjust ${product.name}") },
        text = {
            Column {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf("add" to "Add", "remove" to "Remove", "set" to "Set").forEach { (m, label) -> if (mode == m) Button(onClick = {}) { Text(label) } else OutlinedButton(onClick = { mode = m }) { Text(label) } }
                }
                OutlinedTextField(qty, { qty = it }, label = { Text("Base quantity") })
                OutlinedTextField(note, { note = it }, label = { Text("Reason / note") })
            }
        },
        confirmButton = { Button(onClick = { runCatching { c.store.adjustStock(product.id, mode, num(qty), note); c.refresh(); dismiss() }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() } }) { Text("Save") } },
        dismissButton = { TextButton(onClick = dismiss) { Text("Cancel") } }
    )
}

@Composable
private fun CreditScreen(c: PosController, back: () -> Unit) {
    var addCustomer by remember { mutableStateOf(false) }
    var paymentCustomer by remember { mutableStateOf<Customer?>(null) }
    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Header("Credit / Utang", "Customer balances and payments", back) }
            Button(onClick = { addCustomer = true }, modifier = Modifier.padding(end = 16.dp)) { Text("Add") }
        }
        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            items(c.customers, key = { it.id }) { customer ->
                Card(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(customer.name, fontWeight = FontWeight.Bold); Text(customer.contact); Text("Balance ${money(customer.balance)}") }
                        OutlinedButton(onClick = { paymentCustomer = customer }, enabled = customer.balance > 0) { Text("Payment") }
                    }
                }
            }
        }
    }
    if (addCustomer) CustomerDialog(c) { addCustomer = false }
    paymentCustomer?.let { CustomerPaymentDialog(c, it) { paymentCustomer = null } }
}

@Composable
private fun CustomerDialog(c: PosController, dismiss: () -> Unit) {
    val context = LocalContext.current
    var name by remember { mutableStateOf("") }; var contact by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = dismiss, title = { Text("Add Customer") }, text = { Column { OutlinedTextField(name, { name = it }, label = { Text("Name") }); OutlinedTextField(contact, { contact = it }, label = { Text("Contact") }) } }, confirmButton = { Button(onClick = { runCatching { c.store.addCustomer(name, contact); c.refresh(); dismiss() }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() } }) { Text("Save") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Cancel") } })
}

@Composable
private fun CustomerPaymentDialog(c: PosController, customer: Customer, dismiss: () -> Unit) {
    val context = LocalContext.current
    var amount by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = dismiss, title = { Text("Payment — ${customer.name}") }, text = { Column { Text("Balance ${money(customer.balance)}"); OutlinedTextField(amount, { amount = it }, label = { Text("Amount") }) } }, confirmButton = { Button(onClick = { runCatching { c.store.recordCreditPayment(customer.id, num(amount)); c.refresh(); dismiss() }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() } }) { Text("Record") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Cancel") } })
}

@Composable
private fun ExpensesScreen(c: PosController, back: () -> Unit) {
    var add by remember { mutableStateOf(false) }
    val expenses = remember(c.dataVersion) { c.store.getExpenses() }
    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Header("Expenses", "Operating expenses", back) }
            Button(onClick = { add = true }, modifier = Modifier.padding(end = 16.dp)) { Text("Add") }
        }
        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            items(expenses, key = { it.id }) { e ->
                Card(Modifier.fillMaxWidth().padding(bottom = 8.dp)) { Column(Modifier.padding(12.dp)) { Text(e.description, fontWeight = FontWeight.Bold); Text("${e.category} · ${fmtDate(e.createdAt)}"); Text(money(e.amount)) } }
            }
        }
    }
    if (add) ExpenseDialog(c) { add = false }
}

@Composable
private fun ExpenseDialog(c: PosController, dismiss: () -> Unit) {
    val context = LocalContext.current
    var category by remember { mutableStateOf("Store Expense") }; var desc by remember { mutableStateOf("") }; var amount by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = dismiss, title = { Text("Add Expense") }, text = { Column { OutlinedTextField(category, { category = it }, label = { Text("Category") }); OutlinedTextField(desc, { desc = it }, label = { Text("Description") }); OutlinedTextField(amount, { amount = it }, label = { Text("Amount") }) } }, confirmButton = { Button(onClick = { runCatching { c.store.addExpense(category, desc, num(amount)); c.refresh(); dismiss() }.onFailure { Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show() } }) { Text("Save") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Cancel") } })
}

@Composable
private fun AnalyticsScreen(c: PosController, back: () -> Unit) {
    var days by remember { mutableIntStateOf(30) }
    val summary = remember(c.dataVersion, days) { c.analytics(days) }
    LazyColumn(Modifier.fillMaxSize()) {
        item { Header("Analytics", "Sales, COGS, gross profit, expenses and net", back) }
        item {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(7, 30, 90, 365).forEach { d -> if (days == d) Button(onClick = {}) { Text("${d}d") } else OutlinedButton(onClick = { days = d }) { Text("${d}d") } }
            }
        }
        item { AnalyticsCards(summary) }
    }
}

@Composable
private fun AnalyticsCards(a: AnalyticsSummary) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Stat("Sales", money(a.sales), Modifier.fillMaxWidth())
        Stat("COGS", money(a.cogs), Modifier.fillMaxWidth())
        Stat("Gross Profit", money(a.grossProfit), Modifier.fillMaxWidth())
        Stat("Expenses", money(a.expenses), Modifier.fillMaxWidth())
        Stat("Estimated Net", money(a.estimatedNet), Modifier.fillMaxWidth())
        Stat("Purchase Spend", money(a.purchaseSpend), Modifier.fillMaxWidth())
    }
}

@Composable
private fun ReportsScreen(c: PosController, back: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Header("Receipts / Reports", "Recent native Android transaction receipts", back)
        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            items(c.receipts, key = { it.id }) { r ->
                Card(Modifier.fillMaxWidth().padding(bottom = 8.dp), onClick = { c.activeReceipt = r }) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(r.number, fontWeight = FontWeight.Bold); Text("${fmtDate(r.createdAt)} · ${r.customerName}") }
                        Text(money(r.total), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(c: PosController, back: () -> Unit) {
    val context = LocalContext.current
    var storeName by remember(c.settings) { mutableStateOf(c.settings.storeName) }
    var owner by remember(c.settings) { mutableStateOf(c.settings.owner) }
    var address by remember(c.settings) { mutableStateOf(c.settings.address) }
    Column(Modifier.fillMaxSize()) {
        Header("Settings", "Native Android store profile", back)
        Column(Modifier.padding(16.dp)) {
            OutlinedTextField(storeName, { storeName = it }, label = { Text("Store name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(owner, { owner = it }, label = { Text("Owner") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(address, { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { c.store.saveSettings(StoreSettings(storeName, owner, address)); c.refresh(); Toast.makeText(context, "Settings saved.", Toast.LENGTH_SHORT).show() }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Save Settings") }
            Text("Database: SQLite on this Android device. GitHub JSON remains development/mock data only.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp))
        }
    }
}

@Composable
private fun ReceiptDialog(receipt: SaleReceipt, settings: StoreSettings, onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Receipt ${receipt.number}") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text(settings.storeName, fontWeight = FontWeight.Bold)
                Text(fmtDate(receipt.createdAt))
                Text("Customer: ${receipt.customerName}")
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                receipt.lines.forEach { line -> Row(Modifier.fillMaxWidth()) { Column(Modifier.weight(1f)) { Text(line.productName, fontWeight = FontWeight.Bold); Text("${trimNumber(line.qty)} ${line.unitLabel} × ${money(line.unitPrice)}") }; Text(money(line.amount)) } }
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                Text("Subtotal ${money(receipt.subtotal)}")
                if (receipt.discount > 0) Text("Discount -${money(receipt.discount)}")
                Text("TOTAL ${money(receipt.total)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                if (receipt.paymentType == "cash") { Text("Cash ${money(receipt.cash)}"); Text("Change ${money(receipt.change)}") } else Text("Credit / Utang ${money(receipt.total)}")
            }
        },
        confirmButton = { Button(onClick = { printReceipt(context, receipt, settings) }) { Text("Print / Save PDF") } },
        dismissButton = { Row { TextButton(onClick = { shareReceipt(context, receipt, settings) }) { Text("Share") }; TextButton(onClick = onDismiss) { Text("Close") } } }
    )
}
