(() => {
  'use strict';

  const STORAGE_KEY = 'poslite-ui-config-v1';
  const CONFIG_FORMAT = 'POSliteConfig';
  const CONFIG_VERSION = 1;

  const STANDARD_TERMS = {
    sell: 'Sell',
    sales: 'Sales',
    products: 'Products',
    purchases: 'Purchases',
    inventory: 'Inventory',
    credit: 'Credit / Utang',
    goodsCredit: 'Utang sa Paninda',
    cashLoan: 'Pautang na Pera',
    expenses: 'Expenses',
    analytics: 'Analytics',
    reports: 'Reports',
    grossProfit: 'Gross Profit',
    netProfit: 'Estimated Net Profit',
    purchaseSpend: 'Purchase Spend',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock'
  };

  const SARI_SARI_TERMS = {
    sell: 'Benta',
    sales: 'Halin',
    products: 'Paninda',
    purchases: 'Kumprada',
    inventory: 'Stock ng Paninda',
    credit: 'Utang',
    goodsCredit: 'Utang sa Paninda',
    cashLoan: 'Pautang na Pera',
    expenses: 'Gastos',
    analytics: 'Kita at Tubo',
    reports: 'Talaan',
    grossProfit: 'Tubo sa Paninda',
    netProfit: 'Natirang Tubo',
    purchaseSpend: 'Gastos sa Kumprada',
    lowStock: 'Konti na ang Stock',
    outOfStock: 'Ubos na'
  };

  const TERM_FIELDS = [
    ['sell', 'Sell / Benta'],
    ['sales', 'Sales / Halin'],
    ['products', 'Products / Paninda'],
    ['purchases', 'Purchases / Kumprada'],
    ['inventory', 'Inventory / Stock ng Paninda'],
    ['credit', 'Credit / Utang'],
    ['goodsCredit', 'Product Credit / Utang sa Paninda'],
    ['cashLoan', 'Cash Loan / Pautang na Pera'],
    ['expenses', 'Expenses / Gastos'],
    ['analytics', 'Analytics / Kita at Tubo'],
    ['reports', 'Reports / Talaan'],
    ['grossProfit', 'Gross Profit / Tubo sa Paninda'],
    ['netProfit', 'Net Profit / Natirang Tubo'],
    ['purchaseSpend', 'Purchase Spend / Gastos sa Kumprada'],
    ['lowStock', 'Low Stock / Konti na ang Stock'],
    ['outOfStock', 'Out of Stock / Ubos na']
  ];

  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  let observerQueued = false;
  let mediaQuery = null;

  function notify(message) {
    if (typeof window.toast === 'function') return window.toast(message);
    const el = q('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2600);
  }

  function cleanTerm(value, fallback) {
    const text = String(value ?? '').trim().replace(/\s+/g, ' ');
    return text.slice(0, 60) || fallback;
  }

  function normalizeConfig(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const terms = {};
    for (const [key] of TERM_FIELDS) terms[key] = cleanTerm(source.terms?.[key], STANDARD_TERMS[key]);
    const theme = ['system', 'light', 'dark'].includes(source.appearance?.theme) ? source.appearance.theme : 'system';
    return { appearance: { theme }, terms };
  }

  function readConfig() {
    try {
      return normalizeConfig(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
    } catch {
      return normalizeConfig({});
    }
  }

  function writeConfig(config) {
    const normalized = normalizeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resolveTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(config = readConfig()) {
    const preference = config.appearance.theme;
    const resolved = resolveTheme(preference);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    const themeMeta = q('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = resolved === 'dark' ? '#0d1410' : '#166534';
    const themeSelect = q('#posliteThemeSelect');
    if (themeSelect && themeSelect.value !== preference) themeSelect.value = preference;
  }

  function setText(selector, value) {
    qa(selector).forEach(el => {
      if (el.textContent.trim() !== value) el.textContent = value;
    });
  }

  function setMetricLabel(valueSelector, value) {
    qa(valueSelector).forEach(valueEl => {
      const label = valueEl.closest('.kpi, .cashloan-kpi')?.querySelector('span');
      if (label && label.textContent.trim() !== value) label.textContent = value;
    });
  }

  function applyTerms(config = readConfig()) {
    const t = config.terms;

    setText('.nav-btn[data-view="pos"]', t.sell);
    setText('.bottom-btn[data-view="pos"] small', t.sell);
    setText('#view-pos .section-head h2', t.sell);
    setText('.quick-card[data-jump="pos"] strong', t.sell);

    setText('.nav-btn[data-view="products"]', t.products);
    setText('.bottom-btn[data-view="products"] small', t.products);
    setText('#view-products .section-head h2', t.products);
    setText('.quick-card[data-jump="products"] strong', t.products);

    setText('.nav-btn[data-view="purchases"]', t.purchases);
    setText('#view-purchases .section-head h2', t.purchases);
    setText('.quick-card[data-jump="purchases"] strong', t.purchases);

    setText('.nav-btn[data-view="inventory"]', t.inventory);
    setText('#view-inventory .section-head h2', t.inventory);

    setText('.nav-btn[data-view="credit"]', t.credit);
    setText('#cashLoanModule .credit-master-head h2', t.credit);
    setText('[data-credit-mode="goods"]', t.goodsCredit);
    setText('[data-credit-mode="cash"]', t.cashLoan);
    setText('#goodsCreditPane .section-head h2', t.goodsCredit);
    setText('#cashLoanPane .cashloan-top h3', t.cashLoan);

    setText('.nav-btn[data-view="expenses"]', t.expenses);
    setText('#view-expenses .section-head h2', t.expenses);

    setText('.nav-btn[data-view="analytics"]', t.analytics);
    setText('.bottom-btn[data-view="analytics"] small', t.analytics);
    setText('#view-analytics .section-head h2', t.analytics);

    setText('.nav-btn[data-view="reports"]', t.reports);
    setText('#view-reports .section-head h2', t.reports);

    setMetricLabel('#kpiSales', `${t.sales} Ngayon`);
    setMetricLabel('#kpiProfit', `${t.grossProfit} Ngayon`);
    setMetricLabel('#purchaseMonth', `${t.purchases} This Month`);
    setMetricLabel('#invLow', t.lowStock);
    setMetricLabel('#invOut', t.outOfStock);
    setMetricLabel('#anSales', t.sales);
    setMetricLabel('#anProfit', t.grossProfit);
    setMetricLabel('#anExpenses', t.expenses);
    setMetricLabel('#anNet', t.netProfit);
    setMetricLabel('#anPurchases', t.purchaseSpend);
    setMetricLabel('#reportSales', t.sales);
    setMetricLabel('#reportProfit', t.grossProfit);
    setMetricLabel('#reportExpenses', t.expenses);
    setMetricLabel('#reportNet', t.netProfit);
    setMetricLabel('#reportPurchases', t.purchases);
  }

  function syncForm(config = readConfig()) {
    const theme = q('#posliteThemeSelect');
    if (theme) theme.value = config.appearance.theme;
    for (const [key] of TERM_FIELDS) {
      const input = q(`[data-term-key="${key}"]`);
      if (input) input.value = config.terms[key];
    }
  }

  function configFromForm() {
    const current = readConfig();
    const terms = {};
    for (const [key] of TERM_FIELDS) {
      terms[key] = cleanTerm(q(`[data-term-key="${key}"]`)?.value, current.terms[key]);
    }
    return normalizeConfig({ appearance: { theme: q('#posliteThemeSelect')?.value || 'system' }, terms });
  }

  function applyPreset(preset) {
    const config = readConfig();
    config.terms = { ...(preset === 'sari' ? SARI_SARI_TERMS : STANDARD_TERMS) };
    syncForm(config);
    const saved = writeConfig(config);
    applyTerms(saved);
    notify(preset === 'sari' ? 'Sari-sari terms applied.' : 'Standard terms restored.');
  }

  function saveFromForm() {
    const saved = writeConfig(configFromForm());
    applyTheme(saved);
    applyTerms(saved);
    syncForm(saved);
    notify('Appearance and terms saved.');
  }

  function exportConfig() {
    const config = readConfig();
    const payload = {
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_VERSION,
      exportedAt: new Date().toISOString(),
      appearance: config.appearance,
      terms: config.terms
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poslite-config-${new Date().toISOString().slice(0, 10)}.posconfig`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Config file exported.');
  }

  async function importConfig(file) {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (raw?.format !== CONFIG_FORMAT) throw new Error('Not a POSlite config file.');
      if (Number(raw.schemaVersion || 0) > CONFIG_VERSION) throw new Error('This config was made by a newer POSlite version.');
      const saved = writeConfig({ appearance: raw.appearance, terms: raw.terms });
      applyTheme(saved);
      applyTerms(saved);
      syncForm(saved);
      notify('Config imported and applied.');
    } catch (err) {
      notify(err?.message || 'Could not import config.');
    }
  }

  function buildSettingsPanel() {
    const settings = q('#view-settings');
    if (!settings || q('#poslitePreferencesPanel')) return;
    const host = settings.querySelector('.grid.two') || settings;
    const panel = document.createElement('article');
    panel.className = 'panel poslite-preferences-panel';
    panel.id = 'poslitePreferencesPanel';
    panel.innerHTML = `
      <div class="panel-head poslite-pref-head">
        <div><h3>Appearance & Custom Terms</h3><p class="muted">Make POSlite easier to understand for your store.</p></div>
      </div>
      <div class="poslite-theme-row">
        <label>App appearance
          <select id="posliteThemeSelect">
            <option value="system">System — follow phone</option>
            <option value="light">Light mode</option>
            <option value="dark">Dark mode</option>
          </select>
        </label>
        <div class="poslite-theme-preview" aria-hidden="true"><span>☀</span><span>◐</span><span>☾</span></div>
      </div>
      <div class="poslite-pref-section">
        <div class="poslite-pref-title"><strong>Custom Terms / Wording</strong><span class="muted">Use words your store understands.</span></div>
        <div class="poslite-preset-actions">
          <button type="button" class="secondary" id="useSariTermsBtn">Use Sari-sari Terms</button>
          <button type="button" class="secondary" id="useStandardTermsBtn">Use Standard Terms</button>
        </div>
        <div class="poslite-term-grid">
          ${TERM_FIELDS.map(([key, label]) => `<label>${label}<input data-term-key="${key}" maxlength="60" autocomplete="off"></label>`).join('')}
        </div>
      </div>
      <div class="poslite-config-box">
        <strong>Reusable Store Config</strong>
        <p class="muted">Export only appearance and wording. It does not include sales, products, stock, customers, loans, or other business records.</p>
        <div class="poslite-config-actions">
          <button type="button" class="secondary" id="exportUiConfigBtn">Export Config</button>
          <label class="file-btn">Import Config<input id="importUiConfigInput" type="file" accept=".posconfig,application/json" hidden></label>
        </div>
      </div>
      <button type="button" class="primary full" id="saveUiPreferencesBtn">Save Appearance & Terms</button>`;
    host.appendChild(panel);

    q('#posliteThemeSelect')?.addEventListener('change', () => {
      const preview = normalizeConfig({ appearance: { theme: q('#posliteThemeSelect').value }, terms: readConfig().terms });
      applyTheme(preview);
    });
    q('#useSariTermsBtn')?.addEventListener('click', () => applyPreset('sari'));
    q('#useStandardTermsBtn')?.addEventListener('click', () => applyPreset('standard'));
    q('#saveUiPreferencesBtn')?.addEventListener('click', saveFromForm);
    q('#exportUiConfigBtn')?.addEventListener('click', exportConfig);
    q('#importUiConfigInput')?.addEventListener('change', e => {
      importConfig(e.target.files?.[0]);
      e.target.value = '';
    });
    syncForm();
  }

  function observeDynamicUi() {
    const observer = new MutationObserver(() => {
      if (observerQueued) return;
      observerQueued = true;
      requestAnimationFrame(() => {
        observerQueued = false;
        applyTerms();
        if (!q('#poslitePreferencesPanel')) buildSettingsPanel();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function bindSystemThemeWatcher() {
    if (!window.matchMedia) return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readConfig().appearance.theme === 'system') applyTheme();
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onChange);
    else mediaQuery.addListener?.(onChange);
  }

  function init() {
    const config = readConfig();
    applyTheme(config);
    buildSettingsPanel();
    applyTerms(config);
    bindSystemThemeWatcher();
    observeDynamicUi();
  }

  applyTheme(readConfig());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.POSlitePreferences = {
    getConfig: readConfig,
    apply: () => { const config = readConfig(); applyTheme(config); applyTerms(config); },
    presets: { standard: STANDARD_TERMS, sariSari: SARI_SARI_TERMS }
  };
})();
