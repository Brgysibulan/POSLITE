(() => {
  'use strict';

  const DB_NAME = 'POSliteCashLoansDB';
  const DB_VERSION = 1;
  const MODE_KEY = 'poslite-credit-mode';
  let db;
  let loans = [];
  let payments = [];
  let activeFilter = 'open';

  const q = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const php = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const notify = message => {
    if (typeof window.toast === 'function') return window.toast(message);
    const el = q('#toast');
    if (el) {
      el.textContent = message;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2600);
    }
  };

  function req(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('loans')) database.createObjectStore('loans', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('payments')) database.createObjectStore('payments', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function store(name, mode = 'readonly') {
    return db.transaction(name, mode).objectStore(name);
  }

  async function put(name, value) { return req(store(name, 'readwrite').put(value)); }
  async function getAll(name) { return req(store(name).getAll()); }

  function loanPayments(loanId) {
    return payments.filter(p => p.loanId === loanId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function totals(loan) {
    const paid = loanPayments(loan.id).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const principal = Number(loan.principal || 0);
    const fixedInterest = loan.interestMode === 'fixed' ? Number(loan.interestAmount || 0) : 0;
    const expectedTotal = principal + fixedInterest;
    const remaining = Math.max(0, expectedTotal - paid);
    const principalReturned = Math.min(principal, paid);
    const principalOutstanding = Math.max(0, principal - principalReturned);
    const interestCollected = loan.interestMode === 'fixed' ? Math.max(0, Math.min(fixedInterest, paid - principal)) : 0;
    let status = 'Unpaid';
    if (paid > 0 && paid < expectedTotal - 0.005) status = 'Partial';
    if (loan.interestMode === 'pending' && paid >= principal - 0.005) status = 'Interest Pending';
    else if (loan.interestMode !== 'pending' && paid >= expectedTotal - 0.005) status = 'Fully Paid';
    return { paid, principal, fixedInterest, expectedTotal, remaining, principalOutstanding, interestCollected, status };
  }

  function statusClass(status) {
    if (status === 'Fully Paid') return 'paid';
    if (status === 'Partial') return 'partial';
    if (status === 'Interest Pending') return 'pending';
    return 'unpaid';
  }

  function interestLabel(loan) {
    if (loan.interestMode === 'none') return 'No interest';
    if (loan.interestMode === 'fixed') return `Fixed ${php(loan.interestAmount)}`;
    return 'Not set yet';
  }

  async function refresh() {
    [loans, payments] = await Promise.all([getAll('loans'), getAll('payments')]);
    loans.sort((a, b) => new Date(b.loanDate || b.createdAt) - new Date(a.loanDate || a.createdAt));
    render();
  }

  function buildUi() {
    const view = q('#view-credit');
    if (!view || q('#cashLoanModule')) return;

    const existing = Array.from(view.children);
    const goodsPane = document.createElement('div');
    goodsPane.id = 'goodsCreditPane';
    goodsPane.className = 'credit-mode-pane';
    existing.forEach(node => goodsPane.appendChild(node));

    const oldHead = goodsPane.querySelector('.section-head');
    if (oldHead) {
      const title = oldHead.querySelector('h2');
      const sub = oldHead.querySelector('.section-sub');
      if (title) title.textContent = 'Utang sa Paninda';
      if (sub) sub.textContent = 'Customer balances from products sold on credit';
    }

    const master = document.createElement('div');
    master.id = 'cashLoanModule';
    master.innerHTML = `
      <div class="section-head credit-master-head">
        <div><h2>Credit / Utang</h2><p class="section-sub">Separate product credit from cash loans</p></div>
      </div>
      <div class="credit-mode-tabs" role="tablist" aria-label="Credit type">
        <button type="button" class="credit-mode-btn active" data-credit-mode="goods">Utang sa Paninda</button>
        <button type="button" class="credit-mode-btn" data-credit-mode="cash">Pautang na Pera</button>
      </div>`;

    const cashPane = document.createElement('div');
    cashPane.id = 'cashLoanPane';
    cashPane.className = 'credit-mode-pane';
    cashPane.hidden = true;
    cashPane.innerHTML = `
      <div class="cashloan-top">
        <div>
          <h3>Pautang na Pera</h3>
          <p class="muted">Principal repayments are not sales or profit. Only actual interest collected is treated as interest income.</p>
        </div>
        <button type="button" class="primary" id="newCashLoanBtn">New Loan</button>
      </div>
      <div class="cashloan-kpis">
        <article class="cashloan-kpi"><span>Total Pinautang</span><strong id="loanKpiPrincipal">₱0.00</strong></article>
        <article class="cashloan-kpi"><span>Principal Hindi Pa Nabalik</span><strong id="loanKpiPrincipalOut">₱0.00</strong></article>
        <article class="cashloan-kpi"><span>Kabuuang Nabalik</span><strong id="loanKpiCollected">₱0.00</strong></article>
        <article class="cashloan-kpi"><span>Tubong Nakuha</span><strong id="loanKpiInterest">₱0.00</strong></article>
      </div>
      <div class="cashloan-toolbar">
        <input id="cashLoanSearch" type="search" placeholder="Search borrower" autocomplete="off">
        <div class="cashloan-filters">
          <button type="button" data-loan-filter="open" class="active">Open</button>
          <button type="button" data-loan-filter="paid">Paid</button>
          <button type="button" data-loan-filter="all">All</button>
        </div>
      </div>
      <div id="cashLoanList" class="cashloan-list"></div>
      <div class="cashloan-note">Web development prototype. Cash-loan records are stored locally on this device and kept separate from POS sales.</div>`;

    view.append(master, goodsPane, cashPane);
    ensureDialog();

    master.addEventListener('click', e => {
      const btn = e.target.closest('[data-credit-mode]');
      if (btn) setMode(btn.dataset.creditMode);
    });
    q('#newCashLoanBtn')?.addEventListener('click', newLoanDialog);
    q('#cashLoanSearch')?.addEventListener('input', renderList);
    cashPane.addEventListener('click', e => {
      const filter = e.target.closest('[data-loan-filter]');
      if (filter) {
        activeFilter = filter.dataset.loanFilter;
        cashPane.querySelectorAll('[data-loan-filter]').forEach(b => b.classList.toggle('active', b === filter));
        renderList();
        return;
      }
      const action = e.target.closest('[data-loan-action]');
      if (!action) return;
      const loan = loans.find(x => x.id === action.dataset.loanId);
      if (!loan) return;
      if (action.dataset.loanAction === 'payment') paymentDialog(loan);
      if (action.dataset.loanAction === 'interest') interestDialog(loan);
      if (action.dataset.loanAction === 'details') detailsDialog(loan);
    });

    setMode(localStorage.getItem(MODE_KEY) || 'goods');
  }

  function setMode(mode) {
    const value = mode === 'cash' ? 'cash' : 'goods';
    localStorage.setItem(MODE_KEY, value);
    q('#goodsCreditPane').hidden = value !== 'goods';
    q('#cashLoanPane').hidden = value !== 'cash';
    document.querySelectorAll('[data-credit-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.creditMode === value));
    if (value === 'cash') render();
  }

  function render() {
    if (!q('#cashLoanPane')) return;
    let principal = 0;
    let principalOut = 0;
    let collected = 0;
    let interest = 0;
    loans.forEach(loan => {
      const t = totals(loan);
      principal += t.principal;
      principalOut += t.principalOutstanding;
      collected += t.paid;
      interest += t.interestCollected;
    });
    q('#loanKpiPrincipal').textContent = php(principal);
    q('#loanKpiPrincipalOut').textContent = php(principalOut);
    q('#loanKpiCollected').textContent = php(collected);
    q('#loanKpiInterest').textContent = php(interest);
    renderList();
  }

  function renderList() {
    const list = q('#cashLoanList');
    if (!list) return;
    const search = q('#cashLoanSearch')?.value.trim().toLowerCase() || '';
    const filtered = loans.filter(loan => {
      const t = totals(loan);
      const matchesSearch = !search || `${loan.borrowerName} ${loan.contact || ''}`.toLowerCase().includes(search);
      const matchesFilter = activeFilter === 'all' || (activeFilter === 'paid' ? t.status === 'Fully Paid' : t.status !== 'Fully Paid');
      return matchesSearch && matchesFilter;
    });
    list.innerHTML = filtered.length ? filtered.map(loan => {
      const t = totals(loan);
      const canPay = t.status !== 'Fully Paid' && !(loan.interestMode === 'pending' && t.principalOutstanding <= 0.005);
      return `
        <article class="cashloan-card">
          <div class="cashloan-card-head">
            <div><strong>${esc(loan.borrowerName)}</strong><small>${esc(loan.contact || 'No contact')}</small></div>
            <span class="cashloan-status ${statusClass(t.status)}">${esc(t.status)}</span>
          </div>
          <div class="cashloan-money-grid">
            <div><span>Pinautang</span><strong>${php(t.principal)}</strong></div>
            <div><span>Nabalik</span><strong>${php(t.paid)}</strong></div>
            <div><span>Natitira</span><strong>${php(t.remaining)}</strong></div>
            <div><span>Tubo</span><strong>${esc(interestLabel(loan))}</strong></div>
          </div>
          <div class="cashloan-meta"><span>${fmtDate(loan.loanDate)}</span>${loan.dueDate ? `<span>Due ${fmtDate(loan.dueDate)}</span>` : '<span>No due date</span>'}</div>
          ${loan.interestMode === 'pending' && t.principalOutstanding <= 0.005 ? '<div class="cashloan-warning">Principal is fully returned. Set whether there is interest before marking this loan fully paid.</div>' : ''}
          <div class="cashloan-actions">
            <button type="button" class="primary" data-loan-action="payment" data-loan-id="${loan.id}" ${canPay ? '' : 'disabled'}>Record Payment</button>
            <button type="button" class="secondary" data-loan-action="details" data-loan-id="${loan.id}">Details</button>
            <button type="button" class="secondary" data-loan-action="interest" data-loan-id="${loan.id}">${loan.interestMode === 'pending' ? 'Set Interest' : 'Edit Interest'}</button>
          </div>
        </article>`;
    }).join('') : '<div class="panel empty">No cash loans in this view.</div>';
  }

  function ensureDialog() {
    if (q('#cashLoanDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'cashLoanDialog';
    dialog.className = 'cashloan-dialog';
    dialog.innerHTML = '<div class="cashloan-dialog-card"><div class="cashloan-dialog-head"><h3 id="cashLoanDialogTitle">Cash Loan</h3><button type="button" class="icon-btn" data-cash-dialog-close>✕</button></div><div id="cashLoanDialogBody"></div></div>';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', e => {
      if (e.target.closest('[data-cash-dialog-close]')) dialog.close();
    });
    dialog.addEventListener('cancel', () => dialog.close());
  }

  function openDialog(title, html) {
    ensureDialog();
    q('#cashLoanDialogTitle').textContent = title;
    q('#cashLoanDialogBody').innerHTML = html;
    q('#cashLoanDialog').showModal();
  }

  function newLoanDialog() {
    openDialog('New Cash Loan', `
      <form id="newCashLoanForm" class="cashloan-form">
        <label>Borrower name<input name="borrowerName" required maxlength="80" autocomplete="off"></label>
        <label>Contact <span class="muted">(optional)</span><input name="contact" maxlength="50" autocomplete="off"></label>
        <label>Amount loaned / Pinautang<input name="principal" type="number" min="0.01" step="0.01" inputmode="decimal" required></label>
        <label>Interest / Tubo
          <select name="interestMode" id="cashLoanInterestMode">
            <option value="pending">Not set yet / Hindi pa napagdesisyunan</option>
            <option value="none">No interest / Walang tubo</option>
            <option value="fixed">Fixed interest / May nakatakdang tubo</option>
          </select>
        </label>
        <label id="cashLoanInterestAmountWrap" hidden>Fixed interest amount<input name="interestAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></label>
        <div class="cashloan-form-row">
          <label>Loan date<input name="loanDate" type="date" value="${today()}" required></label>
          <label>Due date <span class="muted">(optional)</span><input name="dueDate" type="date"></label>
        </div>
        <label>Notes <span class="muted">(optional)</span><textarea name="notes" rows="3" maxlength="300"></textarea></label>
        <div class="cashloan-dialog-actions"><button type="button" class="secondary" data-cash-dialog-close>Cancel</button><button type="submit" class="primary">Save Loan</button></div>
      </form>`);
    const form = q('#newCashLoanForm');
    const mode = q('#cashLoanInterestMode');
    const wrap = q('#cashLoanInterestAmountWrap');
    const sync = () => { wrap.hidden = mode.value !== 'fixed'; };
    mode.addEventListener('change', sync);
    sync();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(form);
      const principal = Number(data.get('principal') || 0);
      const interestMode = String(data.get('interestMode') || 'pending');
      const interestAmount = interestMode === 'fixed' ? Number(data.get('interestAmount') || 0) : 0;
      if (!(principal > 0)) return notify('Enter a valid loan amount.');
      if (interestMode === 'fixed' && interestAmount < 0) return notify('Interest cannot be negative.');
      const now = new Date().toISOString();
      await put('loans', {
        id: uid('loan'), borrowerName: String(data.get('borrowerName') || '').trim(), contact: String(data.get('contact') || '').trim(),
        principal, interestMode, interestAmount, loanDate: String(data.get('loanDate') || today()), dueDate: String(data.get('dueDate') || ''),
        notes: String(data.get('notes') || '').trim(), createdAt: now, updatedAt: now
      });
      q('#cashLoanDialog').close();
      notify('Cash loan saved.');
      await refresh();
    });
  }

  function paymentDialog(loan) {
    const t = totals(loan);
    if (t.status === 'Fully Paid') return notify('This loan is already fully paid.');
    if (loan.interestMode === 'pending' && t.principalOutstanding <= 0.005) return notify('Set the interest decision first.');
    const maxPayment = Math.max(0, t.remaining);
    openDialog('Record Payment', `
      <div class="cashloan-mini-summary"><strong>${esc(loan.borrowerName)}</strong><span>Remaining: ${php(maxPayment)}</span></div>
      <form id="cashLoanPaymentForm" class="cashloan-form">
        <label>Amount returned<input name="amount" type="number" min="0.01" max="${maxPayment.toFixed(2)}" step="0.01" inputmode="decimal" required></label>
        <label>Payment date<input name="date" type="date" value="${today()}" required></label>
        <label>Note <span class="muted">(optional)</span><input name="note" maxlength="180"></label>
        <div class="cashloan-dialog-actions"><button type="button" class="secondary" data-cash-dialog-close>Cancel</button><button type="submit" class="primary">Record Payment</button></div>
      </form>`);
    const form = q('#cashLoanPaymentForm');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(form);
      const amount = Number(data.get('amount') || 0);
      if (!(amount > 0) || amount > maxPayment + 0.005) return notify('Payment exceeds the remaining balance.');
      await put('payments', { id: uid('pay'), loanId: loan.id, amount, date: String(data.get('date') || today()), note: String(data.get('note') || '').trim(), createdAt: new Date().toISOString() });
      loan.updatedAt = new Date().toISOString();
      await put('loans', loan);
      q('#cashLoanDialog').close();
      notify('Payment recorded.');
      await refresh();
    });
  }

  function interestDialog(loan) {
    const t = totals(loan);
    const minimumInterest = Math.max(0, t.paid - t.principal);
    openDialog('Interest / Tubo', `
      <div class="cashloan-mini-summary"><strong>${esc(loan.borrowerName)}</strong><span>Principal: ${php(t.principal)} · Paid: ${php(t.paid)}</span></div>
      <form id="cashLoanInterestForm" class="cashloan-form">
        <label>Interest decision
          <select name="interestMode" id="editLoanInterestMode">
            <option value="pending" ${loan.interestMode === 'pending' ? 'selected' : ''}>Not set yet</option>
            <option value="none" ${loan.interestMode === 'none' ? 'selected' : ''}>No interest</option>
            <option value="fixed" ${loan.interestMode === 'fixed' ? 'selected' : ''}>Fixed interest</option>
          </select>
        </label>
        <label id="editLoanInterestAmountWrap">Fixed interest amount<input name="interestAmount" type="number" min="${minimumInterest.toFixed(2)}" step="0.01" inputmode="decimal" value="${Number(loan.interestAmount || 0)}"></label>
        ${minimumInterest > 0 ? `<div class="cashloan-warning">At least ${php(minimumInterest)} interest is already reflected by recorded payments, so interest cannot be set lower than that.</div>` : ''}
        <div class="cashloan-dialog-actions"><button type="button" class="secondary" data-cash-dialog-close>Cancel</button><button type="submit" class="primary">Save</button></div>
      </form>`);
    const mode = q('#editLoanInterestMode');
    const wrap = q('#editLoanInterestAmountWrap');
    const sync = () => { wrap.hidden = mode.value !== 'fixed'; };
    mode.addEventListener('change', sync);
    sync();
    q('#cashLoanInterestForm').addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const interestMode = String(data.get('interestMode') || 'pending');
      const interestAmount = interestMode === 'fixed' ? Number(data.get('interestAmount') || 0) : 0;
      if (interestMode === 'none' && t.paid > t.principal + 0.005) return notify('Cannot remove interest because recorded payments already exceed principal.');
      if (interestMode === 'fixed' && interestAmount + 0.005 < minimumInterest) return notify('Interest is lower than interest already collected.');
      loan.interestMode = interestMode;
      loan.interestAmount = interestAmount;
      loan.updatedAt = new Date().toISOString();
      await put('loans', loan);
      q('#cashLoanDialog').close();
      notify('Interest setting updated.');
      await refresh();
    });
  }

  function detailsDialog(loan) {
    const t = totals(loan);
    const history = loanPayments(loan.id);
    openDialog('Loan Details', `
      <div class="cashloan-detail-head"><div><strong>${esc(loan.borrowerName)}</strong><span>${esc(loan.contact || 'No contact')}</span></div><span class="cashloan-status ${statusClass(t.status)}">${esc(t.status)}</span></div>
      <div class="cashloan-detail-grid">
        <div><span>Pinautang</span><strong>${php(t.principal)}</strong></div>
        <div><span>Nabalik</span><strong>${php(t.paid)}</strong></div>
        <div><span>Natitira</span><strong>${php(t.remaining)}</strong></div>
        <div><span>Tubo</span><strong>${esc(interestLabel(loan))}</strong></div>
        <div><span>Interest Collected</span><strong>${php(t.interestCollected)}</strong></div>
        <div><span>Loan Date</span><strong>${fmtDate(loan.loanDate)}</strong></div>
      </div>
      ${loan.notes ? `<div class="cashloan-detail-note"><strong>Notes</strong><p>${esc(loan.notes)}</p></div>` : ''}
      <h4>Payment History</h4>
      <div class="cashloan-payment-history">${history.length ? history.map(p => `<div><span><strong>${php(p.amount)}</strong><small>${fmtDate(p.date)}${p.note ? ` · ${esc(p.note)}` : ''}</small></span></div>`).join('') : '<div class="empty">No payments recorded.</div>'}</div>
      <div class="cashloan-dialog-actions"><button type="button" class="primary" data-cash-dialog-close>Close</button></div>`);
  }

  async function init() {
    try {
      db = await openDb();
      buildUi();
      await refresh();
    } catch (error) {
      console.error('Cash loan module failed to start.', error);
      notify('Cash loan module could not start on this browser.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.POSliteCashLoans = { refresh, setMode };
})();
