(() => {
  'use strict';

  const RECEIPT_WATCH_MS = 4000;
  let receiptDialog = null;
  let activeSale = null;
  let capturedCustomerName = '';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function php(value) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(value || 0));
  }

  function fmtDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function ensureCustomerNameField() {
    const checkout = document.querySelector('#checkoutBtn');
    if (!checkout || document.querySelector('#receiptCustomerName')) return;
    const label = document.createElement('label');
    label.id = 'receiptCustomerField';
    label.innerHTML = 'Customer name <span class="muted">(optional for cash sale)</span><input id="receiptCustomerName" type="text" maxlength="80" autocomplete="off" placeholder="Walk-in customer">';
    checkout.before(label);
  }

  function ensureReceiptDialog() {
    if (receiptDialog) return receiptDialog;
    receiptDialog = document.createElement('dialog');
    receiptDialog.id = 'receiptDialog';
    receiptDialog.className = 'receipt-dialog';
    receiptDialog.innerHTML = `
      <div class="receipt-shell">
        <div id="receiptPrintable" class="receipt-paper"></div>
        <div class="receipt-actions no-print">
          <button type="button" class="secondary" data-receipt-action="close">Close</button>
          <button type="button" class="secondary" data-receipt-action="share">Share</button>
          <button type="button" class="primary" data-receipt-action="print">Print / Save</button>
          <button type="button" class="primary" data-receipt-action="new">New Sale</button>
        </div>
      </div>`;
    document.body.appendChild(receiptDialog);
    receiptDialog.addEventListener('click', onReceiptAction);
    receiptDialog.addEventListener('cancel', () => closeReceipt());
    return receiptDialog;
  }

  function resolveCustomerName(sale) {
    if (String(sale?.customerName || '').trim()) return String(sale.customerName).trim();
    if (sale.paymentType === 'credit' && sale.customerId) {
      const customer = typeof state !== 'undefined'
        ? state.customers.find(c => c.id === sale.customerId)
        : null;
      return customer?.name || 'Credit Customer';
    }
    return capturedCustomerName || 'Walk-in Customer';
  }

  async function persistReceiptMetadata(sale) {
    if (!sale) return sale;
    const customerName = resolveCustomerName(sale);
    sale.customerName = customerName;
    sale.receiptVersion = 1;
    sale.receiptIssuedAt = sale.receiptIssuedAt || new Date().toISOString();
    if (typeof put === 'function') {
      try {
        await put('sales', sale);
      } catch (err) {
        console.warn('Receipt metadata could not be persisted.', err);
      }
    }
    return sale;
  }

  function renderReceipt(sale) {
    const settings = typeof state !== 'undefined' ? state.settings || {} : {};
    const customerName = resolveCustomerName(sale);
    const items = Array.isArray(sale.items) ? sale.items : [];
    const cash = Number(sale.cash || 0);
    const total = Number(sale.total || 0);
    const change = sale.paymentType === 'cash' ? Math.max(0, cash - total) : 0;
    const creditCustomer = sale.paymentType === 'credit' && typeof state !== 'undefined'
      ? state.customers.find(c => c.id === sale.customerId)
      : null;

    return `
      <header class="receipt-head">
        <h2>${esc(settings.storeName || 'POSlite Store')}</h2>
        ${settings.address ? `<div>${esc(settings.address)}</div>` : ''}
        <strong>SALES RECEIPT</strong>
        <small>POSlite development build — transaction record only</small>
      </header>
      <div class="receipt-meta">
        <div><span>Receipt / Txn</span><strong>${esc(sale.number || sale.id || '—')}</strong></div>
        <div><span>Date</span><strong>${esc(fmtDate(sale.createdAt))}</strong></div>
        <div><span>Customer</span><strong>${esc(customerName)}</strong></div>
        <div><span>Payment</span><strong>${sale.paymentType === 'credit' ? 'Credit / Utang' : 'Cash'}</strong></div>
      </div>
      <div class="receipt-rule"></div>
      <div class="receipt-items">
        ${items.map(item => `
          <div class="receipt-item">
            <div class="receipt-item-main"><strong>${esc(item.name)}</strong><span>${esc(item.qty)} ${esc(item.unitLabel || '')} × ${php(item.price)}</span></div>
            <strong>${php(Number(item.price || 0) * Number(item.qty || 0))}</strong>
          </div>`).join('') || '<div class="receipt-empty">No items</div>'}
      </div>
      <div class="receipt-rule"></div>
      <div class="receipt-totals">
        <div><span>Subtotal</span><strong>${php(sale.subtotal)}</strong></div>
        ${Number(sale.discount || 0) > 0 ? `<div><span>Discount</span><strong>− ${php(sale.discount)}</strong></div>` : ''}
        <div class="receipt-grand"><span>TOTAL</span><strong>${php(sale.total)}</strong></div>
        ${sale.paymentType === 'cash' ? `<div><span>Cash</span><strong>${php(cash)}</strong></div><div><span>Change</span><strong>${php(change)}</strong></div>` : ''}
        ${sale.paymentType === 'credit' ? `<div><span>Credit amount</span><strong>${php(sale.total)}</strong></div>${creditCustomer ? `<div><span>Current balance</span><strong>${php(creditCustomer.balance)}</strong></div>` : ''}` : ''}
      </div>
      <footer class="receipt-foot">
        <strong>Thank you!</strong>
        <small>Keep this receipt for your transaction reference.</small>
      </footer>`;
  }

  async function showReceipt(sale) {
    if (!sale) return;
    activeSale = await persistReceiptMetadata(sale);
    const dialog = ensureReceiptDialog();
    dialog.querySelector('#receiptPrintable').innerHTML = renderReceipt(activeSale);
    if (!dialog.open) dialog.showModal();
  }

  function closeReceipt() {
    if (receiptDialog?.open) receiptDialog.close();
  }

  function receiptShareText(sale) {
    const settings = typeof state !== 'undefined' ? state.settings || {} : {};
    const customerName = resolveCustomerName(sale);
    const lines = [
      settings.storeName || 'POSlite Store',
      `Receipt: ${sale.number || sale.id || '—'}`,
      `Date: ${fmtDate(sale.createdAt)}`,
      `Customer: ${customerName}`,
      ...((sale.items || []).map(item => `${item.name} — ${item.qty} ${item.unitLabel || ''} x ${php(item.price)} = ${php(Number(item.price || 0) * Number(item.qty || 0))}`)),
      `Total: ${php(sale.total)}`,
      `Payment: ${sale.paymentType === 'credit' ? 'Credit / Utang' : 'Cash'}`
    ];
    if (sale.paymentType === 'cash') {
      lines.push(`Cash: ${php(sale.cash)}`);
      lines.push(`Change: ${php(Math.max(0, Number(sale.cash || 0) - Number(sale.total || 0)))}`);
    }
    return lines.join('\n');
  }

  async function onReceiptAction(event) {
    const btn = event.target.closest('[data-receipt-action]');
    if (!btn) return;
    const action = btn.dataset.receiptAction;
    if (action === 'close') closeReceipt();
    if (action === 'print') window.print();
    if (action === 'new') {
      closeReceipt();
      const nameInput = document.querySelector('#receiptCustomerName');
      if (nameInput) nameInput.value = '';
      if (typeof showView === 'function') showView('pos');
      setTimeout(() => document.querySelector('#posSearch')?.focus(), 30);
    }
    if (action === 'share' && activeSale) {
      const text = receiptShareText(activeSale);
      if (navigator.share) {
        try {
          await navigator.share({ title: `Receipt ${activeSale.number || ''}`.trim(), text });
        } catch (err) {
          if (err?.name !== 'AbortError') navigator.clipboard?.writeText(text).catch(() => {});
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text).catch(() => {});
        if (typeof toast === 'function') toast('Receipt copied.');
      }
    }
  }

  function watchForCompletedSale(beforeIds) {
    const started = Date.now();
    const timer = setInterval(() => {
      const sales = typeof state !== 'undefined' && Array.isArray(state.sales) ? state.sales : [];
      const fresh = sales.find(sale => !beforeIds.has(sale.id));
      if (fresh) {
        clearInterval(timer);
        showReceipt(fresh);
        return;
      }
      if (Date.now() - started >= RECEIPT_WATCH_MS) clearInterval(timer);
    }, 100);
  }

  function bindCheckoutReceipt() {
    const checkout = document.querySelector('#checkoutBtn');
    if (!checkout || checkout.dataset.receiptBound === '1') return;
    checkout.dataset.receiptBound = '1';
    checkout.addEventListener('click', () => {
      const beforeIds = new Set((typeof state !== 'undefined' && Array.isArray(state.sales) ? state.sales : []).map(s => s.id));
      capturedCustomerName = document.querySelector('#receiptCustomerName')?.value.trim() || '';
      watchForCompletedSale(beforeIds);
    }, true);
  }

  function initReceiptFeature() {
    ensureCustomerNameField();
    ensureReceiptDialog();
    bindCheckoutReceipt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReceiptFeature);
  } else {
    initReceiptFeature();
  }

  window.POSliteReceipt = { show: showReceipt };
})();
