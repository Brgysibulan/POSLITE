const DB_NAME = 'POSliteDB';
const DB_VERSION = 2;
const APP_VERSION = '0.2.0';
const POS_SCHEMA_VERSION = 2;

let db;
let dialogHandler = null;
let purchaseDraft = [];
let state = {
  products: [],
  sales: [],
  purchases: [],
  movements: [],
  customers: [],
  expenses: [],
  settings: { storeName: 'POSlite Store', owner: '', address: '', defaultLowStock: 5 },
  cart: [],
  reportRows: []
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const num = n => Number(n || 0);
const money = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num(n));
const nowIso = () => new Date().toISOString();
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
const today = () => localDateKey(new Date());
const round4 = n => Math.round((num(n) + Number.EPSILON) * 10000) / 10000;

function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dateInRange(value, from, to) {
  const key = localDateKey(value);
  return key >= from && key <= to;
}
function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      const stores = ['products', 'sales', 'customers', 'expenses', 'settings', 'purchases', 'movements'];
      for (const name of stores) {
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: name === 'settings' ? 'key' : 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function store(name, mode = 'readonly') {
  return db.transaction(name, mode).objectStore(name);
}
async function getAll(name) { return req(store(name).getAll()); }
async function put(name, value) { return req(store(name, 'readwrite').put(value)); }
async function del(name, id) { return req(store(name, 'readwrite').delete(id)); }

function baseUnitLabel(code) {
  return ({ pc: 'Piece', g: 'Gram', ml: 'Milliliter' })[code] || code || 'Piece';
}
function normalizeUnit(u, index = 0) {
  return {
    id: u?.id || `unit-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label: String(u?.label || 'Unit').trim(),
    qtyBase: Math.max(0.0001, num(u?.qtyBase || 1)),
    sellPrice: Math.max(0, num(u?.sellPrice || 0)),
    saleEnabled: u?.saleEnabled !== false,
    purchaseEnabled: u?.purchaseEnabled !== false
  };
}
function normalizeProduct(p) {
  const baseUnit = p.baseUnit || (String(p.unit || '').toLowerCase().includes('gram') ? 'g' : 'pc');
  let units = Array.isArray(p.units) && p.units.length ? p.units.map(normalizeUnit) : [{
    id: 'base',
    label: p.unit || baseUnitLabel(baseUnit),
    qtyBase: 1,
    sellPrice: num(p.price),
    saleEnabled: true,
    purchaseEnabled: true
  }];
  if (!units.some(u => u.saleEnabled)) units[0].saleEnabled = true;
  if (!units.some(u => u.purchaseEnabled)) units[0].purchaseEnabled = true;
  return {
    id: p.id || uid('prd'),
    schemaVersion: 2,
    name: String(p.name || 'Unnamed Product').trim(),
    category: String(p.category || '').trim(),
    barcode: String(p.barcode || '').trim(),
    baseUnit,
    stockBase: Math.max(0, num(p.stockBase ?? p.stock)),
    lowStockBase: Math.max(0, num(p.lowStockBase ?? p.lowStock ?? state.settings.defaultLowStock)),
    avgCostBase: Math.max(0, num(p.avgCostBase ?? p.cost)),
    units,
    createdAt: p.createdAt || nowIso(),
    updatedAt: p.updatedAt || nowIso()
  };
}
function unitById(product, unitId) {
  return normalizeProduct(product).units.find(u => u.id === unitId) || normalizeProduct(product).units[0];
}
function saleUnits(product) {
  return normalizeProduct(product).units.filter(u => u.saleEnabled);
}
function purchaseUnits(product) {
  return normalizeProduct(product).units.filter(u => u.purchaseEnabled);
}
function formatBaseQty(product, qtyBase) {
  const p = normalizeProduct(product);
  const q = num(qtyBase);
  if (p.baseUnit === 'g') {
    if (Math.abs(q) >= 1000) return `${round4(q / 1000)} kg`;
    return `${round4(q)} g`;
  }
  if (p.baseUnit === 'ml') {
    if (Math.abs(q) >= 1000) return `${round4(q / 1000)} L`;
    return `${round4(q)} ml`;
  }
  return `${round4(q)} pc`;
}
function productStockText(product) {
  return formatBaseQty(product, normalizeProduct(product).stockBase);
}
function lineCost(item) {
  return num(item.cost ?? item.unitCost) * num(item.qty);
}
function saleMetrics(sale) {
  const subtotal = num(sale.subtotal || sale.items.reduce((a, i) => a + num(i.price) * num(i.qty), 0));
  const discount = num(sale.discount);
  let sales = 0, cogs = 0;
  for (const item of sale.items || []) {
    const gross = num(item.price) * num(item.qty);
    const share = subtotal > 0 ? discount * (gross / subtotal) : 0;
    sales += Math.max(0, gross - share);
    cogs += lineCost(item);
  }
  return { sales, cogs, profit: sales - cogs };
}
function saleItemMetrics(sale, item) {
  const subtotal = num(sale.subtotal || (sale.items || []).reduce((a, i) => a + num(i.price) * num(i.qty), 0));
  const gross = num(item.price) * num(item.qty);
  const discountShare = subtotal > 0 ? num(sale.discount) * (gross / subtotal) : 0;
  const sales = Math.max(0, gross - discountShare);
  const cogs = lineCost(item);
  return { sales, cogs, profit: sales - cogs };
}

async function init() {
  db = await openDB();
  const saved = await req(store('settings').get('store'));
  if (saved?.value) state.settings = { ...state.settings, ...saved.value };
  else await put('settings', { key: 'store', value: state.settings });
  bindUI();
  setDefaultDates();
  await refreshAll();
  await migrateLegacyProducts();
  updateClock();
  setInterval(updateClock, 30000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
async function migrateLegacyProducts() {
  const legacy = state.products.filter(p => p.schemaVersion !== 2 || p.stockBase === undefined || !Array.isArray(p.units));
  if (!legacy.length) return;
  for (const p of legacy) await put('products', normalizeProduct(p));
  await refreshAll(false);
  toast('Product data upgraded for unit conversions.');
}
async function refreshAll(render = true) {
  [state.products, state.sales, state.purchases, state.movements, state.customers, state.expenses] = await Promise.all(
    ['products', 'sales', 'purchases', 'movements', 'customers', 'expenses'].map(getAll)
  );
  state.products = state.products.map(normalizeProduct).sort((a, b) => a.name.localeCompare(b.name));
  state.sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.purchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.customers.sort((a, b) => a.name.localeCompare(b.name));
  state.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (render) renderAll();
}
function renderAll() {
  renderCategories();
  renderDashboard();
  renderProducts();
  renderPurchases();
  renderInventory();
  renderCustomers();
  renderExpenses();
  renderPOS();
  renderAnalytics();
  runReport();
  renderSettings();
}

function bindUI() {
  $$('.nav-btn,.bottom-btn[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $$('[data-jump]').forEach(b => b.addEventListener('click', () => showView(b.dataset.jump)));
  $('#menuBtn').addEventListener('click', openMenu);
  $('#moreBtn').addEventListener('click', openMenu);
  $('#closeMenuBtn').addEventListener('click', closeMenu);
  $('#scrim').addEventListener('click', closeMenu);

  $('#posSearch').addEventListener('input', renderPOSProducts);
  $('#posSearch').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const code = e.currentTarget.value.trim();
    const exact = state.products.find(p => p.barcode && p.barcode === code);
    if (exact) {
      e.preventDefault();
      const u = saleUnits(exact)[0];
      if (u) addToCart(exact.id, u.id);
      e.currentTarget.select();
    }
  });
  $('#posCategory').addEventListener('change', renderPOSProducts);
  $('#productSearch').addEventListener('input', renderProducts);
  $('#productCategory').addEventListener('change', renderProducts);

  $('#discountInput').addEventListener('input', renderCart);
  $('#cashInput').addEventListener('input', renderCart);
  $('#paymentType').addEventListener('change', () => {
    const credit = $('#paymentType').value === 'credit';
    $('#cashFields').hidden = credit;
    $('#creditFields').hidden = !credit;
    renderCart();
  });
  $('#clearCartBtn').addEventListener('click', () => { state.cart = []; renderCart(); });
  $('#checkoutBtn').addEventListener('click', checkout);

  $('#addProductBtn').addEventListener('click', () => productDialog());
  $('#addPurchaseBtn').addEventListener('click', purchaseDialog);
  $('#stockAdjustBtn').addEventListener('click', () => stockDialog());
  $('#addCustomerBtn').addEventListener('click', customerDialog);
  $('#addExpenseBtn').addEventListener('click', expenseDialog);

  $('#settingsForm').addEventListener('submit', saveSettings);
  $('#exportPosBtn').addEventListener('click', exportPos);
  $('#importPosInput').addEventListener('change', importPos);
  $('#analyticsRange').addEventListener('change', renderAnalytics);
  $('#runReportBtn').addEventListener('click', runReport);
  $('#exportReportBtn').addEventListener('click', exportReportCSV);

  $('#dialogForm').addEventListener('submit', e => {
    e.preventDefault();
    if (dialogHandler) dialogHandler(new FormData(e.currentTarget));
  });
  $('#dialogCloseBtn').addEventListener('click', closeDialog);
  $('#dialogCancelBtn').addEventListener('click', closeDialog);
  $('#detailCloseBtn').addEventListener('click', () => $('#detailDialog').close());

  document.addEventListener('click', async e => {
    const add = e.target.closest('[data-add-product]');
    if (add) {
      const productId = add.dataset.addProduct;
      const select = document.querySelector(`[data-unit-select="${CSS.escape(productId)}"]`);
      return addToCart(productId, select?.value);
    }
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const { action, id } = actionEl.dataset;
    if (action === 'edit-product') productDialog(state.products.find(x => x.id === id));
    if (action === 'delete-product') await deleteProduct(id);
    if (action === 'adjust-product') stockDialog(id);
    if (action === 'pay-credit') paymentDialog(id);
    if (action === 'delete-customer') await deleteCustomer(id);
    if (action === 'delete-expense') await deleteExpense(id);
    if (action === 'product-analysis') showProductAnalysis(id);
    if (action === 'remove-unit-row') actionEl.closest('.unit-row')?.remove();
    if (action === 'add-unit-row') addUnitRow();
    if (action === 'purchase-add-line') addPurchaseDraftLine();
    if (action === 'purchase-remove-line') {
      purchaseDraft.splice(num(actionEl.dataset.index), 1);
      renderPurchaseDraft();
    }
  });
  document.addEventListener('change', e => {
    if (e.target?.id === 'purchaseProductSelect') updatePurchaseUnitSelect();
  });
}
function openMenu() {
  $('#sidebar').classList.add('open');
  $('#scrim').classList.add('show');
}
function closeMenu() {
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('show');
}
function showView(view) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.bottom-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#moreBtn').classList.toggle('active', !['dashboard', 'pos', 'products', 'analytics'].includes(view));
  closeMenu();
  if (view === 'analytics') renderAnalytics();
  if (view === 'reports') runReport();
}
function updateClock() {
  $('#clockText').textContent = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function setDefaultDates() {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  $('#reportFrom').value = localDateKey(first);
  $('#reportTo').value = today();
}
function renderCategories() {
  const cats = [...new Set(state.products.map(p => p.category).filter(Boolean))].sort();
  ['#posCategory', '#productCategory'].forEach(sel => {
    const el = $(sel);
    const current = el.value;
    el.innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    el.value = cats.includes(current) ? current : '';
  });
  $('#creditCustomer').innerHTML = '<option value="">Select customer</option>' + state.customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} — ${money(c.balance)}</option>`).join('');
}

function renderDashboard() {
  const todays = state.sales.filter(s => localDateKey(s.createdAt) === today());
  const sales = todays.reduce((a, s) => a + saleMetrics(s).sales, 0);
  const profit = todays.reduce((a, s) => a + saleMetrics(s).profit, 0);
  const credit = state.customers.reduce((a, c) => a + num(c.balance), 0);
  $('#kpiSales').textContent = money(sales);
  $('#kpiTransactions').textContent = todays.length;
  $('#kpiProfit').textContent = money(profit);
  $('#kpiCredit').textContent = money(credit);

  const low = state.products.filter(p => num(p.stockBase) <= num(p.lowStockBase)).sort((a, b) => a.stockBase - b.stockBase).slice(0, 6);
  $('#lowStockList').innerHTML = low.length ? low.map(p => `<div class="list-row"><div><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(productStockText(p))} left</div></div><span class="badge ${p.stockBase <= 0 ? 'out' : 'low'}">${p.stockBase <= 0 ? 'Out' : 'Low'}</span></div>`).join('') : '<div class="empty">No low-stock products.</div>';

  $('#recentSalesList').innerHTML = state.sales.length ? state.sales.slice(0, 6).map(s => `<div class="list-row"><div><strong>${escapeHtml(s.number)}</strong><div class="muted">${formatDate(s.createdAt)}</div></div><strong>${money(saleMetrics(s).sales)}</strong></div>`).join('') : '<div class="empty">No sales yet.</div>';
}

function filteredProducts() {
  const q = $('#productSearch').value.trim().toLowerCase();
  const cat = $('#productCategory').value;
  return state.products.filter(p => (!q || `${p.name} ${p.category} ${p.barcode}`.toLowerCase().includes(q)) && (!cat || p.category === cat));
}
function renderProducts() {
  const rows = filteredProducts();
  $('#productTableBody').innerHTML = rows.length ? rows.map(p => {
    const unitText = p.units.map(u => `${escapeHtml(u.label)} = ${round4(u.qtyBase)} ${escapeHtml(baseUnitLabel(p.baseUnit))}`).join('<br>');
    return `<tr>
      <td><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(p.category || 'Uncategorized')}</div></td>
      <td>${escapeHtml(p.barcode || '—')}</td>
      <td>${money(p.avgCostBase)} / ${escapeHtml(baseUnitLabel(p.baseUnit))}</td>
      <td>${escapeHtml(productStockText(p))}</td>
      <td class="muted">${unitText}</td>
      <td class="actions"><button class="table-btn" data-action="edit-product" data-id="${p.id}">Edit</button><button class="table-btn primary-mini" data-action="product-analysis" data-id="${p.id}">Analyze</button><button class="table-btn" data-action="delete-product" data-id="${p.id}">Delete</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">No products yet. Add your first product.</td></tr>';
}
function unitRowHtml(unit = null) {
  const u = unit || { id: uid('unit'), label: '', qtyBase: 1, sellPrice: 0, saleEnabled: true, purchaseEnabled: true };
  return `<div class="unit-row">
    <input type="hidden" name="unitId" value="${escapeHtml(u.id)}">
    <label>Unit label<input name="unitLabel" value="${escapeHtml(u.label)}" placeholder="Piece / Pack / 1 kg" required></label>
    <label>Base qty<input name="unitQtyBase" type="number" min="0.0001" step="0.0001" value="${round4(u.qtyBase)}" required></label>
    <label>Selling price<input name="unitSellPrice" type="number" min="0" step="0.01" value="${num(u.sellPrice)}"></label>
    <div>
      <div class="checks"><label class="inline-check"><input name="unitSaleEnabled" type="checkbox" value="${escapeHtml(u.id)}" ${u.saleEnabled ? 'checked' : ''}> Sell</label><label class="inline-check"><input name="unitPurchaseEnabled" type="checkbox" value="${escapeHtml(u.id)}" ${u.purchaseEnabled ? 'checked' : ''}> Buy</label></div>
      <button type="button" class="remove-unit" data-action="remove-unit-row" aria-label="Remove unit">×</button>
    </div>
  </div>`;
}
function addUnitRow(unit = null) {
  const holder = $('#unitRows');
  if (holder) holder.insertAdjacentHTML('beforeend', unitRowHtml(unit));
}
function productDialog(product = null) {
  const p = product ? normalizeProduct(product) : null;
  $('#formDialog').classList.add('wide');
  $('#dialogTitle').textContent = product ? 'Edit Product' : 'Add Product';
  $('#dialogSaveBtn').textContent = 'Save Product';
  $('#dialogFields').innerHTML = `
    <div class="form-row">
      <label>Product name<input name="name" required value="${escapeHtml(p?.name || '')}"></label>
      <label>Category<input name="category" value="${escapeHtml(p?.category || '')}" placeholder="Candy, Rice, Drinks"></label>
    </div>
    <div class="form-row">
      <label>Barcode <input name="barcode" value="${escapeHtml(p?.barcode || '')}" placeholder="Optional — scanner-ready"></label>
      <label>Base unit
        ${p ? `<input value="${escapeHtml(baseUnitLabel(p.baseUnit))}" disabled><input type="hidden" name="baseUnit" value="${escapeHtml(p.baseUnit)}">` : `<select name="baseUnit">
          <option value="pc" selected>Piece</option>
          <option value="g">Gram</option>
          <option value="ml">Milliliter</option>
        </select>`}
      </label>
    </div>
    <div class="form-row">
      <label>Low-stock threshold (base qty)<input name="lowStockBase" type="number" min="0" step="0.0001" value="${p?.lowStockBase ?? state.settings.defaultLowStock}"></label>
      ${p ? `<label>Current stock<input value="${escapeHtml(productStockText(p))}" disabled></label>` : `<label>Opening stock (base qty)<input name="openingStock" type="number" min="0" step="0.0001" value="0"></label>`}
    </div>
    ${p ? '' : `<label>Opening cost per base unit<input name="openingCostBase" type="number" min="0" step="0.0001" value="0"></label>`}
    <div>
      <div class="panel-head"><div><strong>Units & Conversions</strong><div class="muted">Example: Candy Pack = 50 pieces. Rice 1 kg = 1000 grams.</div></div><button type="button" class="secondary" data-action="add-unit-row">Add Unit</button></div>
      <div id="unitRows" class="unit-builder">${(p?.units || [{ id: 'base', label: 'Piece', qtyBase: 1, sellPrice: 0, saleEnabled: true, purchaseEnabled: true }]).map(unitRowHtml).join('')}</div>
    </div>`;
  dialogHandler = async formData => {
    const name = String(formData.get('name') || '').trim();
    const barcode = String(formData.get('barcode') || '').trim();
    if (!name) return toast('Product name is required.');
    if (barcode && state.products.some(x => x.id !== p?.id && x.barcode === barcode)) return toast('That barcode is already assigned to another product.');
    const rows = [...$('#unitRows').querySelectorAll('.unit-row')];
    const units = rows.map(row => {
      const id = row.querySelector('[name="unitId"]').value || uid('unit');
      return {
        id,
        label: row.querySelector('[name="unitLabel"]').value.trim(),
        qtyBase: num(row.querySelector('[name="unitQtyBase"]').value),
        sellPrice: num(row.querySelector('[name="unitSellPrice"]').value),
        saleEnabled: row.querySelector('[name="unitSaleEnabled"]').checked,
        purchaseEnabled: row.querySelector('[name="unitPurchaseEnabled"]').checked
      };
    }).filter(u => u.label && u.qtyBase > 0);
    if (!units.length) return toast('Add at least one unit.');
    if (!units.some(u => u.saleEnabled)) return toast('At least one unit must be enabled for selling.');
    if (!units.some(u => u.purchaseEnabled)) return toast('At least one unit must be enabled for purchasing.');
    const productData = {
      id: p?.id || uid('prd'),
      schemaVersion: 2,
      name,
      category: String(formData.get('category') || '').trim(),
      barcode,
      baseUnit: String(formData.get('baseUnit') || 'pc'),
      stockBase: p?.stockBase ?? num(formData.get('openingStock')),
      lowStockBase: num(formData.get('lowStockBase')),
      avgCostBase: p?.avgCostBase ?? num(formData.get('openingCostBase')),
      units: units.map(normalizeUnit),
      createdAt: p?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    const tx = db.transaction(['products', 'movements'], 'readwrite');
    tx.objectStore('products').put(productData);
    if (!p && productData.stockBase > 0) {
      tx.objectStore('movements').put({
        id: uid('mov'), productId: productData.id, type: 'adjustment', qtyBase: productData.stockBase,
        createdAt: nowIso(), refId: '', note: 'Opening stock', costBase: productData.avgCostBase
      });
    }
    await txDone(tx);
    closeDialog();
    toast(p ? 'Product updated.' : 'Product added.');
    await refreshAll();
  };
  $('#formDialog').showModal();
}
async function deleteProduct(id) {
  const used = state.sales.some(s => (s.items || []).some(i => i.productId === id)) || state.purchases.some(p => (p.items || []).some(i => i.productId === id));
  if (used) return toast('Cannot delete a product already used in sales or purchases.');
  if (!confirm('Delete this unused product?')) return;
  await del('products', id);
  toast('Product deleted.');
  await refreshAll();
}

function renderPOS() {
  renderPOSProducts();
  renderCart();
  renderCategories();
}
function renderPOSProducts() {
  const q = $('#posSearch').value.trim().toLowerCase();
  const cat = $('#posCategory').value;
  const rows = state.products.filter(p => (!q || `${p.name} ${p.category} ${p.barcode}`.toLowerCase().includes(q)) && (!cat || p.category === cat));
  $('#posProductGrid').innerHTML = rows.length ? rows.map(p => {
    const units = saleUnits(p);
    const first = units[0];
    const out = num(p.stockBase) <= 0;
    return `<article class="product-card ${out ? 'disabled' : ''}">
      <div><h4>${escapeHtml(p.name)}</h4><div class="meta">${escapeHtml(p.category || 'Uncategorized')} · ${escapeHtml(productStockText(p))}${p.barcode ? `<br>${escapeHtml(p.barcode)}` : ''}</div></div>
      <div class="price">${first ? money(first.sellPrice) : 'No price'}</div>
      <div class="add-row">
        <select data-unit-select="${p.id}" ${out ? 'disabled' : ''}>${units.map(u => `<option value="${u.id}">${escapeHtml(u.label)} · ${money(u.sellPrice)}</option>`).join('')}</select>
        <button class="add-btn" data-add-product="${p.id}" ${out || !units.length ? 'disabled' : ''}>Add</button>
      </div>
    </article>`;
  }).join('') : '<div class="empty">No products found.</div>';
}
function cartBaseUsed(productId) {
  return state.cart.filter(i => i.productId === productId).reduce((a, i) => a + num(i.qtyBasePerUnit) * num(i.qty), 0);
}
function addToCart(productId, unitId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  const u = unitById(p, unitId);
  if (!u?.saleEnabled) return toast('Select a selling unit.');
  const needed = u.qtyBase;
  if (cartBaseUsed(productId) + needed > num(p.stockBase)) return toast('Not enough stock.');
  const key = `${productId}::${u.id}`;
  const item = state.cart.find(x => x.key === key);
  if (item) item.qty++;
  else state.cart.push({
    key, productId, unitId: u.id, name: p.name, unitLabel: u.label,
    price: num(u.sellPrice), cost: num(p.avgCostBase) * num(u.qtyBase),
    qtyBasePerUnit: num(u.qtyBase), qtyStep: p.baseUnit === 'pc' ? 1 : 0.01, qty: 1
  });
  renderCart();
}
function renderCart() {
  const subtotal = state.cart.reduce((a, i) => a + num(i.price) * num(i.qty), 0);
  const discount = Math.min(Math.max(0, num($('#discountInput').value)), subtotal);
  const total = Math.max(0, subtotal - discount);
  const cash = num($('#cashInput').value);
  const change = Math.max(0, cash - total);
  $('#cartList').innerHTML = state.cart.length ? state.cart.map((i, index) => `<div class="cart-item">
    <div><strong>${escapeHtml(i.name)}</strong><div class="muted">${escapeHtml(i.unitLabel)} · ${money(i.price)} × ${round4(i.qty)}</div></div>
    <div class="cart-controls"><button data-cart="minus" data-index="${index}">−</button><input class="cart-qty-input" data-cart-qty="${index}" type="number" min="${i.qtyStep || 1}" step="${i.qtyStep || 1}" value="${round4(i.qty)}"><button data-cart="plus" data-index="${index}">+</button><button data-cart="remove" data-index="${index}">×</button></div>
  </div>`).join('') : '<div class="empty">Cart is empty.</div>';
  $('#cartSubtotal').textContent = money(subtotal);
  $('#cartTotal').textContent = money(total);
  $('#changeAmount').textContent = money(change);
  $$('[data-cart]').forEach(b => b.onclick = () => {
    const index = num(b.dataset.index);
    const item = state.cart[index];
    if (!item) return;
    const p = state.products.find(x => x.id === item.productId);
    const step = num(item.qtyStep || 1);
    if (b.dataset.cart === 'plus') {
      if (cartBaseUsed(item.productId) + item.qtyBasePerUnit * step > num(p.stockBase)) return toast('Not enough stock.');
      item.qty = round4(num(item.qty) + step);
    }
    if (b.dataset.cart === 'minus') {
      item.qty = round4(num(item.qty) - step);
      if (item.qty <= 0) state.cart.splice(index, 1);
    }
    if (b.dataset.cart === 'remove') state.cart.splice(index, 1);
    renderCart();
  });
  $$('[data-cart-qty]').forEach(input => input.onchange = () => {
    const index = num(input.dataset.cartQty);
    const item = state.cart[index];
    if (!item) return;
    const p = state.products.find(x => x.id === item.productId);
    const step = num(item.qtyStep || 1);
    let wanted = Math.max(step, num(input.value));
    if (step === 1) wanted = Math.max(1, Math.floor(wanted));
    const otherBase = cartBaseUsed(item.productId) - num(item.qty) * num(item.qtyBasePerUnit);
    const maxQty = Math.max(0, (num(p.stockBase) - otherBase) / num(item.qtyBasePerUnit));
    if (wanted > maxQty) {
      wanted = step === 1 ? Math.floor(maxQty) : Math.floor(maxQty / step) * step;
      toast('Quantity adjusted to available stock.');
    }
    if (wanted <= 0) state.cart.splice(index, 1);
    else item.qty = round4(wanted);
    renderCart();
  });
}
async function checkout() {
  if (!state.cart.length) return toast('Add products to the cart.');
  const subtotal = state.cart.reduce((a, i) => a + num(i.price) * num(i.qty), 0);
  const discount = Math.min(Math.max(0, num($('#discountInput').value)), subtotal);
  const total = Math.max(0, subtotal - discount);
  const paymentType = $('#paymentType').value;
  const cash = num($('#cashInput').value);
  const customerId = $('#creditCustomer').value;
  if (paymentType === 'cash' && cash < total) return toast('Cash received is less than the total.');
  if (paymentType === 'credit' && !customerId) return toast('Select a customer for credit sale.');

  for (const p of state.products) {
    const needed = cartBaseUsed(p.id);
    if (needed > num(p.stockBase)) return toast(`Not enough stock for ${p.name}.`);
  }
  const saleId = uid('sale');
  const saleNumber = `POS-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
  const createdAt = nowIso();
  const saleItems = state.cart.map(i => ({
    productId: i.productId, name: i.name, unitId: i.unitId, unitLabel: i.unitLabel,
    price: num(i.price), cost: num(i.cost), qty: num(i.qty),
    qtyBasePerUnit: num(i.qtyBasePerUnit), qtyBase: num(i.qtyBasePerUnit) * num(i.qty)
  }));
  const sale = { id: saleId, number: saleNumber, createdAt, items: saleItems, subtotal, discount, total, paymentType, customerId: paymentType === 'credit' ? customerId : '', cash: paymentType === 'cash' ? cash : 0 };

  const txStores = paymentType === 'credit' ? ['products', 'sales', 'movements', 'customers'] : ['products', 'sales', 'movements'];
  const tx = db.transaction(txStores, 'readwrite');
  const productStore = tx.objectStore('products');
  const movementStore = tx.objectStore('movements');
  const salesStore = tx.objectStore('sales');

  for (const item of saleItems) {
    const p = normalizeProduct(state.products.find(x => x.id === item.productId));
    p.stockBase = Math.max(0, num(p.stockBase) - num(item.qtyBase));
    p.updatedAt = createdAt;
    productStore.put(p);
    movementStore.put({
      id: uid('mov'), productId: p.id, type: 'sale', qtyBase: -num(item.qtyBase),
      createdAt, refId: saleNumber, note: `${item.qty} ${item.unitLabel}`, costBase: p.avgCostBase
    });
  }
  salesStore.put(sale);
  if (paymentType === 'credit') {
    const c = { ...state.customers.find(x => x.id === customerId) };
    c.balance = num(c.balance) + total;
    c.updatedAt = createdAt;
    c.ledger = [...(c.ledger || []), { id: uid('cred'), type: 'sale', amount: total, createdAt, refId: saleNumber }];
    tx.objectStore('customers').put(c);
  }
  await txDone(tx);
  state.cart = [];
  $('#discountInput').value = 0;
  $('#cashInput').value = '';
  $('#paymentType').value = 'cash';
  $('#cashFields').hidden = false;
  $('#creditFields').hidden = true;
  toast(`Sale complete — ${saleNumber}`);
  await refreshAll();
}

function purchaseDialog() {
  if (!state.products.length) return toast('Add a product first.');
  purchaseDraft = [];
  $('#formDialog').classList.add('wide');
  $('#dialogTitle').textContent = 'New Purchase / Stock In';
  $('#dialogSaveBtn').textContent = 'Save Purchase';
  $('#dialogFields').innerHTML = `
    <div class="form-row">
      <label>Supplier<input name="supplier" placeholder="Optional supplier name"></label>
      <label>Purchase date<input name="purchaseDate" type="date" value="${today()}" required></label>
    </div>
    <div class="purchase-builder">
      <div class="purchase-line-grid">
        <label>Product<select id="purchaseProductSelect">${state.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></label>
        <label>Unit<select id="purchaseUnitSelect"></select></label>
        <label>Qty<input id="purchaseQtyInput" type="number" min="0.0001" step="0.0001" value="1"></label>
        <label>Total cost<input id="purchaseCostInput" type="number" min="0" step="0.01" value="0"></label>
        <button type="button" class="secondary" data-action="purchase-add-line">Add</button>
      </div>
      <div class="muted">Total cost is what you paid for that line. POSlite will calculate the cost per base unit automatically.</div>
      <div id="purchaseDraft" class="purchase-draft"></div>
      <div class="summary-box"><div class="line"><span>Purchase total</span><strong id="purchaseDraftTotal">${money(0)}</strong></div></div>
    </div>`;
  updatePurchaseUnitSelect();
  renderPurchaseDraft();
  dialogHandler = async formData => {
    if (!purchaseDraft.length) return toast('Add at least one purchase item.');
    const supplier = String(formData.get('supplier') || '').trim();
    const purchaseDate = String(formData.get('purchaseDate') || today());
    const purchaseId = uid('pur');
    const number = `PUR-${purchaseDate.replace(/\D/g, '')}-${String(Date.now()).slice(-6)}`;
    const createdAt = new Date(`${purchaseDate}T12:00:00`).toISOString();
    const items = purchaseDraft.map(x => ({ ...x }));
    const totalCost = items.reduce((a, i) => a + num(i.totalCost), 0);

    const tx = db.transaction(['products', 'purchases', 'movements'], 'readwrite');
    for (const line of items) {
      const p = normalizeProduct(state.products.find(x => x.id === line.productId));
      const oldStock = num(p.stockBase);
      const oldValue = oldStock * num(p.avgCostBase);
      const incoming = num(line.qtyBase);
      const newStock = oldStock + incoming;
      p.avgCostBase = newStock > 0 ? (oldValue + num(line.totalCost)) / newStock : 0;
      p.stockBase = newStock;
      p.updatedAt = createdAt;
      tx.objectStore('products').put(p);
      tx.objectStore('movements').put({
        id: uid('mov'), productId: p.id, type: 'purchase', qtyBase: incoming,
        createdAt, refId: number, note: `${line.qty} ${line.unitLabel} from ${supplier || 'supplier'}`,
        costBase: incoming > 0 ? num(line.totalCost) / incoming : 0
      });
    }
    tx.objectStore('purchases').put({ id: purchaseId, number, supplier, createdAt, items, totalCost });
    await txDone(tx);
    closeDialog();
    toast(`Purchase saved — ${number}`);
    await refreshAll();
  };
  $('#formDialog').showModal();
}
function updatePurchaseUnitSelect() {
  const p = state.products.find(x => x.id === $('#purchaseProductSelect')?.value) || state.products[0];
  const select = $('#purchaseUnitSelect');
  if (!select || !p) return;
  select.innerHTML = purchaseUnits(p).map(u => `<option value="${u.id}">${escapeHtml(u.label)} = ${round4(u.qtyBase)} ${escapeHtml(baseUnitLabel(p.baseUnit))}</option>`).join('');
}
function addPurchaseDraftLine() {
  const p = state.products.find(x => x.id === $('#purchaseProductSelect')?.value);
  if (!p) return toast('Select a product.');
  const u = unitById(p, $('#purchaseUnitSelect')?.value);
  const qty = num($('#purchaseQtyInput')?.value);
  const totalCost = num($('#purchaseCostInput')?.value);
  if (qty <= 0) return toast('Quantity must be greater than zero.');
  if (totalCost < 0) return toast('Cost cannot be negative.');
  purchaseDraft.push({
    productId: p.id, name: p.name, unitId: u.id, unitLabel: u.label,
    qty, qtyBase: qty * num(u.qtyBase), totalCost
  });
  $('#purchaseQtyInput').value = 1;
  $('#purchaseCostInput').value = 0;
  renderPurchaseDraft();
}
function renderPurchaseDraft() {
  const el = $('#purchaseDraft');
  if (!el) return;
  el.innerHTML = purchaseDraft.length ? purchaseDraft.map((i, index) => `<div class="draft-row">
    <div><strong>${escapeHtml(i.name)}</strong><div class="muted">${round4(i.qty)} ${escapeHtml(i.unitLabel)} = ${round4(i.qtyBase)} base units</div></div>
    <strong>${money(i.totalCost)}</strong>
    <button type="button" class="table-btn" data-action="purchase-remove-line" data-index="${index}">Remove</button>
  </div>`).join('') : '<div class="empty">No items added yet.</div>';
  $('#purchaseDraftTotal').textContent = money(purchaseDraft.reduce((a, i) => a + num(i.totalCost), 0));
}
function renderPurchases() {
  const month = today().slice(0, 7);
  const monthRows = state.purchases.filter(p => localDateKey(p.createdAt).startsWith(month));
  $('#purchaseMonth').textContent = money(monthRows.reduce((a, p) => a + num(p.totalCost), 0));
  $('#purchaseCount').textContent = state.purchases.length;
  $('#purchaseTableBody').innerHTML = state.purchases.length ? state.purchases.map(p => `<tr>
    <td>${formatDate(p.createdAt)}</td><td><strong>${escapeHtml(p.number)}</strong></td><td>${escapeHtml(p.supplier || '—')}</td>
    <td>${(p.items || []).map(i => `${escapeHtml(i.name)} × ${round4(i.qty)} ${escapeHtml(i.unitLabel)}`).join('<br>')}</td><td><strong>${money(p.totalCost)}</strong></td>
  </tr>`).join('') : '<tr><td colspan="5" class="empty">No purchases recorded yet.</td></tr>';
}

function renderInventory() {
  const low = state.products.filter(p => num(p.stockBase) <= num(p.lowStockBase)).length;
  const out = state.products.filter(p => num(p.stockBase) <= 0).length;
  const value = state.products.reduce((a, p) => a + num(p.stockBase) * num(p.avgCostBase), 0);
  $('#invProducts').textContent = state.products.length;
  $('#invLow').textContent = low;
  $('#invOut').textContent = out;
  $('#invValue').textContent = money(value);
  $('#inventoryTableBody').innerHTML = state.products.length ? state.products.map(p => {
    const status = p.stockBase <= 0 ? ['Out of stock', 'out'] : p.stockBase <= p.lowStockBase ? ['Low stock', 'low'] : ['In stock', 'ok'];
    return `<tr><td><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(p.category || '')}</div></td><td>${escapeHtml(productStockText(p))}</td><td>${escapeHtml(formatBaseQty(p, p.lowStockBase))}</td><td><span class="badge ${status[1]}">${status[0]}</span></td><td>${money(p.stockBase * p.avgCostBase)}</td><td><button class="table-btn" data-action="adjust-product" data-id="${p.id}">Adjust</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">No inventory yet.</td></tr>';

  $('#movementTableBody').innerHTML = state.movements.length ? state.movements.slice(0, 50).map(m => {
    const p = state.products.find(x => x.id === m.productId);
    const q = num(m.qtyBase);
    return `<tr><td>${formatDate(m.createdAt)}</td><td>${escapeHtml(p?.name || 'Deleted product')}</td><td><span class="badge ${escapeHtml(m.type)}">${escapeHtml(m.type)}</span></td><td class="${q >= 0 ? 'positive' : 'negative'}">${q >= 0 ? '+' : ''}${escapeHtml(formatBaseQty(p || { baseUnit: 'pc' }, q))}</td><td>${escapeHtml(m.refId || m.note || '—')}<div class="muted">${escapeHtml(m.note || '')}</div></td></tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">No stock movements yet.</td></tr>';
}
function stockDialog(id = '') {
  if (!state.products.length) return toast('Add a product first.');
  const p = state.products.find(x => x.id === id) || state.products[0];
  openDialog('Stock Adjustment', [
    { name: 'productId', label: 'Product', type: 'select', options: state.products.map(x => ({ value: x.id, text: x.name })), value: p.id, required: true },
    { name: 'mode', label: 'Adjustment', type: 'select', options: [{ value: 'add', text: 'Add stock' }, { value: 'remove', text: 'Remove stock' }, { value: 'set', text: 'Set exact stock' }] },
    { name: 'quantity', label: 'Base quantity', type: 'number', step: '0.0001', min: '0', required: true, value: 0 },
    { name: 'note', label: 'Reason / note', value: '' }
  ], async f => {
    const product = normalizeProduct(state.products.find(x => x.id === f.get('productId')));
    if (!product) return toast('Select a product.');
    const q = num(f.get('quantity'));
    const mode = String(f.get('mode'));
    const old = num(product.stockBase);
    let next = old;
    if (mode === 'add') next = old + q;
    if (mode === 'remove') next = Math.max(0, old - q);
    if (mode === 'set') next = q;
    const change = next - old;
    product.stockBase = next;
    product.updatedAt = nowIso();
    const tx = db.transaction(['products', 'movements'], 'readwrite');
    tx.objectStore('products').put(product);
    tx.objectStore('movements').put({
      id: uid('mov'), productId: product.id, type: 'adjustment', qtyBase: change,
      createdAt: nowIso(), refId: '', note: String(f.get('note') || 'Manual adjustment'), costBase: product.avgCostBase
    });
    await txDone(tx);
    closeDialog();
    toast('Inventory adjusted.');
    await refreshAll();
  });
}

function customerDialog() {
  openDialog('Add Customer', [
    { name: 'name', label: 'Customer name', required: true },
    { name: 'contact', label: 'Contact (optional)' }
  ], async f => {
    const name = String(f.get('name') || '').trim();
    if (!name) return toast('Customer name is required.');
    await put('customers', { id: uid('cus'), name, contact: String(f.get('contact') || '').trim(), balance: 0, ledger: [], createdAt: nowIso(), updatedAt: nowIso() });
    closeDialog();
    toast('Customer added.');
    await refreshAll();
  });
}
function renderCustomers() {
  $('#customerTableBody').innerHTML = state.customers.length ? state.customers.map(c => `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.contact || '—')}</td><td><strong>${money(c.balance)}</strong></td><td>${formatDate(c.updatedAt)}</td><td class="actions"><button class="table-btn primary-mini" data-action="pay-credit" data-id="${c.id}">Payment</button><button class="table-btn" data-action="delete-customer" data-id="${c.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty">No credit customers yet.</td></tr>';
}
function paymentDialog(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;
  openDialog(`Credit Payment — ${c.name}`, [
    { name: 'amount', label: `Amount (balance ${money(c.balance)})`, type: 'number', min: '0.01', step: '0.01', required: true }
  ], async f => {
    const amount = Math.min(num(f.get('amount')), num(c.balance));
    if (amount <= 0) return toast('Enter a payment amount.');
    const updated = { ...c, balance: Math.max(0, num(c.balance) - amount), updatedAt: nowIso(), ledger: [...(c.ledger || []), { id: uid('cred'), type: 'payment', amount, createdAt: nowIso(), refId: '' }] };
    await put('customers', updated);
    closeDialog();
    toast('Payment recorded.');
    await refreshAll();
  });
}
async function deleteCustomer(id) {
  const c = state.customers.find(x => x.id === id);
  if (num(c?.balance) > 0 || state.sales.some(s => s.customerId === id)) return toast('Cannot delete a customer with balance or sales history.');
  if (!confirm('Delete this unused customer?')) return;
  await del('customers', id);
  await refreshAll();
}
function expenseDialog() {
  openDialog('Add Expense', [
    { name: 'date', label: 'Date', type: 'date', value: today(), required: true },
    { name: 'category', label: 'Category', value: 'Store Expense', required: true },
    { name: 'description', label: 'Description', required: true },
    { name: 'amount', label: 'Amount', type: 'number', min: '0', step: '0.01', required: true }
  ], async f => {
    const amount = num(f.get('amount'));
    if (amount < 0) return toast('Amount cannot be negative.');
    await put('expenses', { id: uid('exp'), date: String(f.get('date')), category: String(f.get('category') || '').trim(), description: String(f.get('description') || '').trim(), amount, createdAt: nowIso() });
    closeDialog();
    toast('Expense saved.');
    await refreshAll();
  });
}
function renderExpenses() {
  const month = today().slice(0, 7);
  $('#expenseToday').textContent = money(state.expenses.filter(e => e.date === today()).reduce((a, e) => a + num(e.amount), 0));
  $('#expenseMonth').textContent = money(state.expenses.filter(e => String(e.date).startsWith(month)).reduce((a, e) => a + num(e.amount), 0));
  $('#expenseTableBody').innerHTML = state.expenses.length ? state.expenses.map(e => `<tr><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(e.description)}</td><td>${money(e.amount)}</td><td><button class="table-btn" data-action="delete-expense" data-id="${e.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty">No expenses recorded.</td></tr>';
}
async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await del('expenses', id);
  toast('Expense deleted.');
  await refreshAll();
}

function analyticsWindow(days) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end, from: localDateKey(start), to: localDateKey(end) };
}
function aggregateProductProfit(sales) {
  const map = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const p = state.products.find(x => x.id === item.productId);
      const m = saleItemMetrics(sale, item);
      const row = map.get(item.productId) || { productId: item.productId, name: item.name || p?.name || 'Unknown', qtyBase: 0, sales: 0, cogs: 0, profit: 0 };
      const baseQty = item.qtyBase !== undefined ? num(item.qtyBase) : (item.qtyBasePerUnit !== undefined ? num(item.qtyBasePerUnit) * num(item.qty) : num(item.qty));
      row.qtyBase += baseQty;
      row.sales += m.sales;
      row.cogs += m.cogs;
      row.profit += m.profit;
      map.set(item.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit);
}
function renderAnalytics() {
  const days = num($('#analyticsRange').value || 30);
  const { from, to } = analyticsWindow(days);
  const sales = state.sales.filter(s => dateInRange(s.createdAt, from, to));
  const expenses = state.expenses.filter(e => e.date >= from && e.date <= to);
  const purchases = state.purchases.filter(p => dateInRange(p.createdAt, from, to));
  const totals = sales.reduce((a, s) => {
    const m = saleMetrics(s);
    a.sales += m.sales; a.cogs += m.cogs; a.profit += m.profit;
    return a;
  }, { sales: 0, cogs: 0, profit: 0 });
  const expenseTotal = expenses.reduce((a, e) => a + num(e.amount), 0);
  const purchaseTotal = purchases.reduce((a, p) => a + num(p.totalCost), 0);
  const net = totals.profit - expenseTotal;
  $('#anSales').textContent = money(totals.sales);
  $('#anCogs').textContent = money(totals.cogs);
  $('#anProfit').textContent = money(totals.profit);
  $('#anExpenses').textContent = money(expenseTotal);
  $('#anNet').textContent = money(net);
  $('#anPurchases').textContent = money(purchaseTotal);

  const productRows = aggregateProductProfit(sales);
  $('#profitTableBody').innerHTML = productRows.length ? productRows.map(r => {
    const p = state.products.find(x => x.id === r.productId) || { baseUnit: 'pc' };
    const margin = r.sales > 0 ? r.profit / r.sales * 100 : 0;
    return `<tr><td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(formatBaseQty(p, r.qtyBase))}</td><td>${money(r.sales)}</td><td>${money(r.cogs)}</td><td class="${r.profit >= 0 ? 'positive' : 'negative'}"><strong>${money(r.profit)}</strong></td><td>${round4(margin)}%</td><td><button class="table-btn primary-mini" data-action="product-analysis" data-id="${r.productId}">Details</button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">No sales in this period.</td></tr>';

  const insights = [];
  if (productRows.length) {
    const bestProfit = [...productRows].sort((a, b) => b.profit - a.profit)[0];
    const bestSales = [...productRows].sort((a, b) => b.sales - a.sales)[0];
    insights.push(`<div class="insight"><strong>Highest profit:</strong> ${escapeHtml(bestProfit.name)} generated ${money(bestProfit.profit)} gross profit.</div>`);
    if (bestSales.productId !== bestProfit.productId) insights.push(`<div class="insight"><strong>Highest sales:</strong> ${escapeHtml(bestSales.name)} generated ${money(bestSales.sales)} sales.</div>`);
  }
  const low = state.products.filter(p => p.stockBase <= p.lowStockBase);
  if (low.length) insights.push(`<div class="insight"><strong>Restock:</strong> ${low.length} product${low.length === 1 ? '' : 's'} at or below low-stock level.</div>`);
  const credit = state.customers.reduce((a, c) => a + num(c.balance), 0);
  if (credit > 0) insights.push(`<div class="insight"><strong>Credit:</strong> ${money(credit)} is still outstanding. Credit collections are not counted as new sales.</div>`);
  insights.push(`<div class="insight"><strong>Net estimate:</strong> ${money(net)} after recorded operating expenses. Purchase spend is tracked separately because inventory purchases become COGS when items are sold.</div>`);
  $('#insightsList').innerHTML = insights.join('');

  renderSalesChart(sales, from, to);
}
function renderSalesChart(sales, from, to) {
  const days = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(localDateKey(d));
  const recentDays = days.slice(-31);
  const values = recentDays.map(day => sales.filter(s => localDateKey(s.createdAt) === day).reduce((a, s) => a + saleMetrics(s).sales, 0));
  const max = Math.max(1, ...values);
  $('#salesChart').innerHTML = recentDays.map((day, i) => `<div class="bar" title="${day}: ${money(values[i])}" style="height:${Math.max(values[i] ? 5 : 1, values[i] / max * 100)}%"><span>${day.slice(5)}</span></div>`).join('');
}
function showProductAnalysis(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return toast('Product record is no longer available.');
  const relevantSales = state.sales.filter(s => (s.items || []).some(i => i.productId === id));
  const rows = aggregateProductProfit(relevantSales).find(r => r.productId === id) || { qtyBase: 0, sales: 0, cogs: 0, profit: 0 };
  const purchases = state.purchases.flatMap(pur => (pur.items || []).filter(i => i.productId === id).map(i => ({ ...i, purchase: pur })));
  const purchasedQty = purchases.reduce((a, i) => a + num(i.qtyBase), 0);
  const purchasedSpend = purchases.reduce((a, i) => a + num(i.totalCost), 0);
  const margin = rows.sales > 0 ? rows.profit / rows.sales * 100 : 0;
  $('#detailTitle').textContent = p.name;
  $('#detailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-metric"><span>Current stock</span><strong>${escapeHtml(productStockText(p))}</strong></div>
      <div class="detail-metric"><span>Average cost / base</span><strong>${money(p.avgCostBase)}</strong></div>
      <div class="detail-metric"><span>Total sales</span><strong>${money(rows.sales)}</strong></div>
      <div class="detail-metric"><span>Total COGS</span><strong>${money(rows.cogs)}</strong></div>
      <div class="detail-metric"><span>Gross profit</span><strong class="${rows.profit >= 0 ? 'positive' : 'negative'}">${money(rows.profit)}</strong></div>
      <div class="detail-metric"><span>Profit margin</span><strong>${round4(margin)}%</strong></div>
      <div class="detail-metric"><span>Qty sold</span><strong>${escapeHtml(formatBaseQty(p, rows.qtyBase))}</strong></div>
      <div class="detail-metric"><span>Purchased</span><strong>${escapeHtml(formatBaseQty(p, purchasedQty))}</strong></div>
      <div class="detail-metric"><span>Purchase spend</span><strong>${money(purchasedSpend)}</strong></div>
      <div class="detail-metric"><span>Barcode</span><strong>${escapeHtml(p.barcode || '—')}</strong></div>
    </div>
    <h4>Configured Units</h4>
    <div class="table-wrap"><table><thead><tr><th>Unit</th><th>Base Qty</th><th>Sell Price</th><th>Sell</th><th>Buy</th></tr></thead><tbody>${p.units.map(u => `<tr><td>${escapeHtml(u.label)}</td><td>${round4(u.qtyBase)} ${escapeHtml(baseUnitLabel(p.baseUnit))}</td><td>${money(u.sellPrice)}</td><td>${u.saleEnabled ? 'Yes' : 'No'}</td><td>${u.purchaseEnabled ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
  $('#detailDialog').showModal();
}

function runReport() {
  const from = $('#reportFrom').value || today();
  const to = $('#reportTo').value || today();
  if (from > to) return toast('Report start date must be before end date.');
  const sales = state.sales.filter(s => dateInRange(s.createdAt, from, to));
  const expenses = state.expenses.filter(e => e.date >= from && e.date <= to);
  const purchases = state.purchases.filter(p => dateInRange(p.createdAt, from, to));
  const totals = sales.reduce((a, s) => {
    const m = saleMetrics(s);
    a.sales += m.sales; a.cogs += m.cogs; a.profit += m.profit;
    return a;
  }, { sales: 0, cogs: 0, profit: 0 });
  const expenseTotal = expenses.reduce((a, e) => a + num(e.amount), 0);
  const purchaseTotal = purchases.reduce((a, p) => a + num(p.totalCost), 0);
  const net = totals.profit - expenseTotal;
  $('#reportSales').textContent = money(totals.sales);
  $('#reportCogs').textContent = money(totals.cogs);
  $('#reportProfit').textContent = money(totals.profit);
  $('#reportExpenses').textContent = money(expenseTotal);
  $('#reportNet').textContent = money(net);
  $('#reportPurchases').textContent = money(purchaseTotal);
  state.reportRows = sales;
  $('#reportTableBody').innerHTML = sales.length ? sales.map(s => {
    const m = saleMetrics(s);
    return `<tr><td>${formatDate(s.createdAt)}</td><td><strong>${escapeHtml(s.number)}</strong></td><td>${escapeHtml(s.paymentType || 'cash')}</td><td>${(s.items || []).map(i => `${escapeHtml(i.name)} × ${round4(i.qty)} ${escapeHtml(i.unitLabel || '')}`).join('<br>')}</td><td>${money(m.sales)}</td><td class="${m.profit >= 0 ? 'positive' : 'negative'}">${money(m.profit)}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">No sales in this date range.</td></tr>';
}
function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
function exportReportCSV() {
  if (!state.reportRows.length) return toast('No report rows to export.');
  const rows = [['Date', 'Transaction', 'Payment', 'Items', 'Sales', 'COGS', 'Gross Profit']];
  for (const s of state.reportRows) {
    const m = saleMetrics(s);
    rows.push([
      formatDate(s.createdAt), s.number, s.paymentType,
      (s.items || []).map(i => `${i.name} x ${i.qty} ${i.unitLabel || ''}`).join('; '),
      round4(m.sales), round4(m.cogs), round4(m.profit)
    ]);
  }
  downloadBlob(rows.map(r => r.map(csvCell).join(',')).join('\n'), `POSlite-report-${$('#reportFrom').value}-to-${$('#reportTo').value}.csv`, 'text/csv;charset=utf-8');
}

function renderSettings() {
  $('#storeName').value = state.settings.storeName || '';
  $('#storeOwner').value = state.settings.owner || '';
  $('#storeAddress').value = state.settings.address || '';
  $('#defaultLowStock').value = state.settings.defaultLowStock ?? 5;
}
async function saveSettings(e) {
  e.preventDefault();
  state.settings = {
    storeName: $('#storeName').value.trim() || 'POSlite Store',
    owner: $('#storeOwner').value.trim(),
    address: $('#storeAddress').value.trim(),
    defaultLowStock: num($('#defaultLowStock').value)
  };
  await put('settings', { key: 'store', value: state.settings });
  toast('Settings saved.');
}
async function exportPos() {
  const payload = {
    format: 'POSlite',
    schemaVersion: POS_SCHEMA_VERSION,
    backupType: 'full',
    appVersion: APP_VERSION,
    exportedAt: nowIso(),
    settings: state.settings,
    data: {
      products: state.products,
      sales: state.sales,
      purchases: state.purchases,
      movements: state.movements,
      customers: state.customers,
      expenses: state.expenses
    }
  };
  downloadBlob(JSON.stringify(payload, null, 2), `POSlite-backup-${today()}.pos`, 'application/json');
  $('#backupStatus').textContent = `Backup exported ${formatDate(payload.exportedAt)} · schema ${POS_SCHEMA_VERSION}`;
  toast('.pos backup exported.');
}
async function importPos(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== 'POSlite') throw new Error('Not a POSlite backup.');
    if (![1, 2].includes(num(payload.schemaVersion))) throw new Error(`Unsupported POSlite schema version ${payload.schemaVersion}.`);
    const data = payload.data || payload;
    const products = (data.products || []).map(normalizeProduct);
    const sales = data.sales || [];
    const purchases = data.purchases || [];
    const movements = data.movements || [];
    const customers = data.customers || [];
    const expenses = data.expenses || [];
    const summary = `${products.length} products, ${sales.length} sales, ${purchases.length} purchases, ${customers.length} customers, ${expenses.length} expenses`;
    if (!confirm(`Restore this POSlite backup?\n\n${summary}\n\nCurrent local data will be replaced.`)) return;
    const tx = db.transaction(['products', 'sales', 'purchases', 'movements', 'customers', 'expenses', 'settings'], 'readwrite');
    for (const name of ['products', 'sales', 'purchases', 'movements', 'customers', 'expenses']) tx.objectStore(name).clear();
    products.forEach(x => tx.objectStore('products').put(x));
    sales.forEach(x => tx.objectStore('sales').put(x));
    purchases.forEach(x => tx.objectStore('purchases').put(x));
    movements.forEach(x => tx.objectStore('movements').put(x));
    customers.forEach(x => tx.objectStore('customers').put(x));
    expenses.forEach(x => tx.objectStore('expenses').put(x));
    tx.objectStore('settings').put({ key: 'store', value: payload.settings || data.settings || state.settings });
    await txDone(tx);
    state.settings = { ...state.settings, ...(payload.settings || data.settings || {}) };
    $('#backupStatus').textContent = `Restored ${file.name} · source schema ${payload.schemaVersion}`;
    toast('Backup restored.');
    await refreshAll();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Could not import the .pos file.');
  }
}
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function openDialog(title, fields, handler) {
  $('#formDialog').classList.remove('wide');
  $('#dialogTitle').textContent = title;
  $('#dialogSaveBtn').textContent = 'Save';
  $('#dialogFields').innerHTML = fields.map(fieldHtml).join('');
  dialogHandler = handler;
  $('#formDialog').showModal();
}
function fieldHtml(f) {
  if (f.type === 'select') {
    return `<label>${escapeHtml(f.label)}<select name="${escapeHtml(f.name)}" ${f.required ? 'required' : ''}>${(f.options || []).map(o => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(f.value ?? '') ? 'selected' : ''}>${escapeHtml(o.text)}</option>`).join('')}</select></label>`;
  }
  return `<label>${escapeHtml(f.label)}<input name="${escapeHtml(f.name)}" type="${escapeHtml(f.type || 'text')}" value="${escapeHtml(f.value ?? '')}" ${f.required ? 'required' : ''} ${f.min !== undefined ? `min="${escapeHtml(f.min)}"` : ''} ${f.step !== undefined ? `step="${escapeHtml(f.step)}"` : ''}></label>`;
}
function closeDialog() {
  dialogHandler = null;
  purchaseDraft = [];
  $('#formDialog').classList.remove('wide');
  if ($('#formDialog').open) $('#formDialog').close();
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error(err);
    alert('POSlite could not start its local database. Please reload the app.');
  });
});
