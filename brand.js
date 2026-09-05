(() => {
  'use strict';

  const BRAND = 'SariPOS';
  const CONFIG_KEY = 'poslite-ui-config-v1';
  const DEFAULT_SARI_TERMS = {
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

  function applyBrand() {
    document.title = BRAND;
    const topBrand = document.querySelector('.topbar h1');
    if (topBrand) topBrand.textContent = BRAND;
    const drawerBrand = document.querySelector('.sidebar-head strong');
    if (drawerBrand) drawerBrand.textContent = BRAND;

    const settingsNav = document.querySelector('.nav-btn[data-view="settings"]');
    if (settingsNav) settingsNav.textContent = 'Ayos ng App';
    const settingsTitle = document.querySelector('#view-settings .section-head h2');
    if (settingsTitle) settingsTitle.textContent = 'Ayos ng App';
    const settingsSub = document.querySelector('#view-settings .section-sub');
    if (settingsSub) settingsSub.textContent = 'Pangalan ng tindahan, itsura, mga tawag, at backup';

    const panel = document.querySelector('#poslitePreferencesPanel');
    if (panel) {
      const heading = panel.querySelector('h3');
      if (heading) heading.textContent = 'Itsura at Mga Tawag';
      const subtitle = panel.querySelector('.poslite-pref-head .muted');
      if (subtitle) subtitle.textContent = 'Gawing mas madaling intindihin ang SariPOS para sa tindahan mo.';
      const themeLabel = panel.querySelector('.poslite-theme-row label');
      if (themeLabel && themeLabel.childNodes[0]) themeLabel.childNodes[0].textContent = 'Itsura ng App ';
      const customTitle = panel.querySelector('.poslite-pref-title strong');
      if (customTitle) customTitle.textContent = 'Mga Tawag sa App';
      const customHelp = panel.querySelector('.poslite-pref-title .muted');
      if (customHelp) customHelp.textContent = 'Palitan ang terms ayon sa nakasanayan sa tindahan.';
      const sariBtn = panel.querySelector('#useSariTermsBtn');
      if (sariBtn) sariBtn.textContent = 'Gamitin ang Sari-sari Terms';
      const standardBtn = panel.querySelector('#useStandardTermsBtn');
      if (standardBtn) standardBtn.textContent = 'Gamitin ang Standard Terms';
      const configTitle = panel.querySelector('.poslite-config-box strong');
      if (configTitle) configTitle.textContent = 'Config para sa Ibang Tindahan';
      const configHelp = panel.querySelector('.poslite-config-box .muted');
      if (configHelp) configHelp.textContent = 'Itsura at mga tawag lang ang mase-save. Walang kasamang benta, paninda, stock, customer, utang, o pautang.';
      const exportBtn = panel.querySelector('#exportUiConfigBtn');
      if (exportBtn) exportBtn.textContent = 'I-save Config';
      const importLabel = panel.querySelector('label.file-btn');
      if (importLabel && importLabel.childNodes[0]) importLabel.childNodes[0].textContent = 'Gamitin Config';
      const saveBtn = panel.querySelector('#saveUiPreferencesBtn');
      if (saveBtn) saveBtn.textContent = 'I-save ang Itsura at Mga Tawag';
    }
  }

  function setFriendlyDefaultsForNewUser() {
    if (localStorage.getItem(CONFIG_KEY)) return;
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      appearance: { theme: 'system' },
      terms: DEFAULT_SARI_TERMS
    }));
    window.POSlitePreferences?.apply?.();
  }

  function init() {
    setFriendlyDefaultsForNewUser();
    applyBrand();
    const observer = new MutationObserver(() => applyBrand());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
