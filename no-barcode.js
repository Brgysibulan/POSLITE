(() => {
  const originalProductDialog = window.productDialog;
  if (typeof originalProductDialog !== 'function') return;

  function addNoBarcodeOption(product) {
    const barcodeInput = document.querySelector('#dialogFields input[name="barcode"]');
    if (!barcodeInput) return;

    const barcodeLabel = barcodeInput.closest('label');
    if (!barcodeLabel || barcodeLabel.querySelector('.no-barcode-option')) return;

    const option = document.createElement('span');
    option.className = 'no-barcode-option';
    option.innerHTML = `
      <span class="inline-check no-barcode-check">
        <input id="noBarcodeToggle" type="checkbox" ${product && !String(product.barcode || '').trim() ? 'checked' : ''}>
        <strong>Product has no barcode</strong>
      </span>
      <span class="muted">Use this for loose items, repacked goods, produce, or products without a printed barcode. You can still search and tap the product in Sell.</span>
    `;
    barcodeLabel.appendChild(option);

    const toggle = option.querySelector('#noBarcodeToggle');
    const sync = () => {
      const noBarcode = toggle.checked;
      barcodeInput.disabled = noBarcode;
      barcodeInput.placeholder = noBarcode ? 'No barcode — manual/search sale' : 'Optional — scanner-ready';
      if (noBarcode) barcodeInput.value = '';
      option.classList.toggle('active', noBarcode);
    };

    toggle.addEventListener('change', sync);
    sync();
  }

  window.productDialog = function productDialogWithNoBarcode(product = null) {
    originalProductDialog(product);
    addNoBarcodeOption(product);
  };
})();

(() => {
  if (!document.querySelector('link[data-poslite-receipt-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './receipt.css';
    link.dataset.posliteReceiptStyle = '1';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-poslite-receipt-script]')) {
    const script = document.createElement('script');
    script.src = './receipt.js';
    script.async = false;
    script.dataset.posliteReceiptScript = '1';
    document.body.appendChild(script);
  }
})();
