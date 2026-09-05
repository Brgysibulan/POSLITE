(() => {
  'use strict';

  const ABOUT_ID = 'sariposAboutPanel';

  function buildAboutPanel() {
    const settings = document.querySelector('#view-settings');
    if (!settings || document.getElementById(ABOUT_ID)) return;

    const host = settings.querySelector('.grid.two') || settings;
    const panel = document.createElement('article');
    panel.className = 'panel saripos-about-panel';
    panel.id = ABOUT_ID;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>About SariPOS</h3>
          <p class="muted">Simple POS para sa sari-sari store at maliit na tindahan.</p>
        </div>
      </div>
      <div class="stack">
        <div>
          <strong>Purpose</strong>
          <p class="muted">Ginawa ang SariPOS para gawing mas simple ang araw-araw na operasyon ng tindahan gamit lang ang smartphone. Tinutulungan nitong ma-record at masundan ang Benta/Halin, Kumprada, Paninda at Stock, Utang, Gastos, Resibo, at Kita o Tubo sa isang madaling gamitin na system.</p>
        </div>
        <div>
          <strong>Design goal</strong>
          <p class="muted">Android-first, smartphone-friendly, offline/local-first, at gumagamit ng mga salitang madaling maintindihan ng karaniwang sari-sari store owner.</p>
        </div>
        <div>
          <strong>Created & Developed by</strong>
          <p><strong>Joshua Apal Pudi</strong></p>
        </div>
      </div>`;

    host.appendChild(panel);
  }

  function init() {
    buildAboutPanel();
    const observer = new MutationObserver(() => buildAboutPanel());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
