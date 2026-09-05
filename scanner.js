(() => {
  const search = document.querySelector('#posSearch');
  const browser = document.querySelector('.product-browser');
  if (!search || !browser) return;

  let stream = null;
  let detector = null;
  let scanLoopActive = false;
  let lastDetectAt = 0;

  const panel = document.createElement('section');
  panel.className = 'barcode-ready-panel';
  panel.setAttribute('aria-label', 'Barcode scanner');
  panel.innerHTML = `
    <div class="barcode-ready-main">
      <span class="barcode-ready-dot" aria-hidden="true"></span>
      <div>
        <strong>Ready to Scan Barcode</strong>
        <div class="barcode-ready-help">Use the phone camera or a Bluetooth/USB barcode scanner.</div>
      </div>
    </div>
    <div class="barcode-ready-actions">
      <button type="button" class="secondary" id="barcodeInputBtn">Scanner Input</button>
      <button type="button" class="primary" id="barcodeCameraBtn">Open Camera</button>
    </div>
    <div class="barcode-scan-status ready" id="barcodeScanStatus" role="status" aria-live="polite">Waiting for a barcode…</div>`;
  browser.prepend(panel);

  const dialog = document.createElement('dialog');
  dialog.id = 'barcodeScannerDialog';
  dialog.className = 'barcode-scanner-dialog';
  dialog.innerHTML = `
    <div class="barcode-scanner-card">
      <div class="barcode-scanner-head">
        <div>
          <strong>Scan Product Barcode</strong>
          <div class="barcode-ready-help">Point the rear camera at the barcode.</div>
        </div>
        <button type="button" class="icon-btn" id="barcodeScannerClose" aria-label="Close barcode scanner">✕</button>
      </div>
      <div class="barcode-video-wrap">
        <video id="barcodeScannerVideo" playsinline muted></video>
        <div class="barcode-guide" aria-hidden="true"><span></span></div>
      </div>
      <div class="barcode-camera-message" id="barcodeCameraMessage">Starting camera…</div>
    </div>`;
  document.body.appendChild(dialog);

  const status = document.querySelector('#barcodeScanStatus');
  const inputBtn = document.querySelector('#barcodeInputBtn');
  const cameraBtn = document.querySelector('#barcodeCameraBtn');
  const closeBtn = document.querySelector('#barcodeScannerClose');
  const video = document.querySelector('#barcodeScannerVideo');
  const cameraMessage = document.querySelector('#barcodeCameraMessage');

  function setStatus(kind, message) {
    status.className = `barcode-scan-status ${kind}`;
    status.textContent = message;
  }

  function focusScannerInput(selectExisting = true) {
    if (!document.querySelector('#view-pos')?.classList.contains('active') && typeof showView === 'function') showView('pos');
    search.placeholder = 'Scan barcode or search product';
    search.focus({ preventScroll: false });
    if (selectExisting) search.select();
    setStatus('ready', 'Ready — scan a barcode now.');
  }

  function exactProduct(code) {
    const normalized = String(code || '').trim();
    if (!normalized || typeof state === 'undefined') return null;
    return state.products.find(product => product.barcode && product.barcode === normalized) || null;
  }

  function addScannedProduct(code, source = 'Barcode') {
    const normalized = String(code || '').trim();
    const product = exactProduct(normalized);
    if (!product) {
      setStatus('error', `${source} not found: ${normalized || 'empty code'}`);
      if (typeof toast === 'function') toast('Barcode not found.');
      return false;
    }

    const units = typeof saleUnits === 'function' ? saleUnits(product) : [];
    const unit = units[0];
    if (!unit) {
      setStatus('error', `${product.name} has no selling unit.`);
      if (typeof toast === 'function') toast('Product has no selling unit.');
      return false;
    }

    if (Number(product.stockBase || 0) <= 0) {
      setStatus('error', `${product.name} is out of stock.`);
      if (typeof toast === 'function') toast('Product is out of stock.');
      return false;
    }

    if (typeof addToCart === 'function') addToCart(product.id, unit.id);
    setStatus('success', `Scanned: ${product.name} — added to cart.`);
    if (typeof toast === 'function') toast(`${product.name} added to cart.`);
    search.value = '';
    if (typeof renderPOSProducts === 'function') renderPOSProducts();
    setTimeout(() => focusScannerInput(false), 350);
    return true;
  }

  // The main POS app already handles exact barcode + Enter and adds one item.
  // This listener adds scanner feedback and immediately prepares the field for the next scan.
  search.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const code = event.currentTarget.value.trim();
    if (!code) return;
    const product = exactProduct(code);
    if (product) {
      setStatus('success', `Scanned: ${product.name} — added to cart.`);
      setTimeout(() => {
        search.value = '';
        if (typeof renderPOSProducts === 'function') renderPOSProducts();
        focusScannerInput(false);
      }, 60);
    } else {
      setStatus('error', `Barcode not found: ${code}`);
      setTimeout(() => search.select(), 60);
    }
  });

  inputBtn.addEventListener('click', () => focusScannerInput(true));

  function stopCamera() {
    scanLoopActive = false;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  async function supportedBarcodeFormats() {
    const preferred = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf'];
    if (!('BarcodeDetector' in window)) return [];
    if (typeof BarcodeDetector.getSupportedFormats !== 'function') return preferred;
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      return preferred.filter(format => supported.includes(format));
    } catch {
      return preferred;
    }
  }

  async function openCameraScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error', 'Camera access is not available in this browser. Use Scanner Input instead.');
      return;
    }
    if (!('BarcodeDetector' in window)) {
      setStatus('error', 'Camera barcode detection is not supported here. Use Scanner Input or Chrome on Android.');
      if (typeof toast === 'function') toast('Camera barcode detection is not supported by this browser.');
      return;
    }

    const formats = await supportedBarcodeFormats();
    if (!formats.length) {
      setStatus('error', 'No supported retail barcode format was detected.');
      return;
    }

    try {
      detector = new BarcodeDetector({ formats });
      cameraMessage.textContent = 'Starting camera…';
      dialog.showModal();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = stream;
      await video.play();
      cameraMessage.textContent = 'Ready — keep the barcode inside the guide.';
      setStatus('ready', 'Camera scanner is ready.');
      scanLoopActive = true;
      lastDetectAt = 0;
      requestAnimationFrame(scanFrame);
    } catch (error) {
      stopCamera();
      if (dialog.open) dialog.close();
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setStatus('error', denied ? 'Camera permission was not allowed. Use Scanner Input or allow camera access.' : 'Could not start the camera scanner.');
      if (typeof toast === 'function') toast(denied ? 'Camera permission is required for barcode scanning.' : 'Could not start barcode camera.');
    }
  }

  async function scanFrame(timestamp) {
    if (!scanLoopActive || !dialog.open || !detector || !video) return;
    if (timestamp - lastDetectAt < 140) {
      requestAnimationFrame(scanFrame);
      return;
    }
    lastDetectAt = timestamp;

    try {
      const results = await detector.detect(video);
      const result = results.find(item => item.rawValue);
      if (result?.rawValue) {
        const code = String(result.rawValue).trim();
        cameraMessage.textContent = `Detected ${code}`;
        stopCamera();
        if (dialog.open) dialog.close();
        addScannedProduct(code, 'Barcode');
        return;
      }
    } catch {
      // Ignore individual detection-frame failures and keep scanning.
    }
    if (scanLoopActive) requestAnimationFrame(scanFrame);
  }

  cameraBtn.addEventListener('click', openCameraScanner);
  closeBtn.addEventListener('click', () => {
    stopCamera();
    if (dialog.open) dialog.close();
    focusScannerInput(false);
  });
  dialog.addEventListener('close', stopCamera);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    stopCamera();
    dialog.close();
    focusScannerInput(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) {
      stopCamera();
      dialog.close();
    }
  });

  document.querySelectorAll('[data-view="pos"], [data-jump="pos"]').forEach(button => {
    button.addEventListener('click', () => setTimeout(() => focusScannerInput(false), 120));
  });
})();