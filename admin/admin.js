import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const $ = (id) => document.getElementById(id);
const setupCard = $('setupCard');
const loginCard = $('loginCard');
const dashboard = $('dashboard');
const notice = $('notice');
let client = null;
let data = { profiles: [], stores: [], licenses: [], devices: [], plans: [], payments: [] };

function getConfig() {
  return {
    url: localStorage.getItem('saripos.supabase.url') || '',
    key: localStorage.getItem('saripos.supabase.publishableKey') || ''
  };
}

function setNotice(message, error = false) {
  notice.textContent = message;
  notice.style.color = error ? '#b42318' : '#166534';
}

function initializeClient() {
  const config = getConfig();
  if (!config.url.startsWith('https://') || !config.key.startsWith('sb_')) return false;
  client = createClient(config.url, config.key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
  return true;
}

async function invoke(body) {
  const { data: result, error } = await client.functions.invoke('admin-license', { body });
  if (error) throw new Error(error.context?.body?.error || error.message || 'Admin request failed.');
  if (result?.error) throw new Error(result.error);
  return result;
}

async function boot() {
  const config = getConfig();
  $('projectUrl').value = config.url;
  $('publishableKey').value = config.key;
  if (!initializeClient()) return;
  setupCard.classList.add('hidden');
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    loginCard.classList.remove('hidden');
    return;
  }
  $('signOutButton').classList.remove('hidden');
  await loadDashboard();
}

async function loadDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  setNotice('Loading…');
  try {
    data = await invoke({ action: 'list' });
    render();
    setNotice('Updated.');
  } catch (error) {
    dashboard.classList.add('hidden');
    loginCard.classList.remove('hidden');
    setNotice(error.message, true);
    alert(`Hindi mabuksan ang admin dashboard: ${error.message}`);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function render() {
  const pending = data.profiles.filter((profile) => profile.account_status === 'pending');
  $('pendingCount').textContent = pending.length;
  $('licenseCount').textContent = data.licenses.length;
  $('deviceCount').textContent = data.devices.filter((device) => device.status === 'active').length;
  $('pendingAccounts').innerHTML = pending.length ? pending.map((profile) => `
    <form class="account approve-form" data-user-id="${profile.id}">
      <h3>${escapeHtml(profile.display_name || 'New customer')}</h3>
      <div class="muted">${escapeHtml(profile.email || '')}</div>
      <label>Store name<input name="storeName" required maxlength="120" value="${escapeHtml(profile.display_name ? `${profile.display_name} Store` : 'SariPOS Store')}"></label>
      <div class="grid">
        <label>Package<select name="planCode">${data.plans.filter((p) => p.is_active).map((p) => `<option value="${p.code}">${escapeHtml(p.display_name)}</option>`).join('')}</select></label>
        <label>Device limit<input name="maxDevices" type="number" min="1" placeholder="Plan default"></label>
        <label>Offline days<input name="offlineGraceDays" type="number" min="1" placeholder="Plan default"></label>
        <label>Backup limit<input name="backupLimit" type="number" min="0" placeholder="Plan default"></label>
      </div>
      <label>Custom expiration<input name="expiresAt" type="date"></label>
      <button type="submit">Approve & Activate</button>
    </form>`).join('') : '<p>Walang pending account.</p>';

  const stores = Object.fromEntries(data.stores.map((store) => [store.id, store]));
  $('licensesBody').innerHTML = data.licenses.map((license) => `<tr>
    <td>${escapeHtml(stores[license.store_id]?.name || license.store_id)}</td>
    <td>${escapeHtml(license.plan_code)}</td><td>${escapeHtml(license.status)}</td>
    <td>${license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'No expiry'}</td>
    <td>${data.devices.filter((device) => device.license_id === license.id && device.status === 'active').length}</td>
    <td>
      <button class="license-status ${license.status === 'active' ? 'danger' : ''}" data-license-id="${license.id}" data-status="${license.status === 'active' ? 'suspended' : 'active'}">${license.status === 'active' ? 'Suspend' : 'Activate'}</button>
      <button class="edit-license ghost" data-license-id="${license.id}" data-plan="${escapeHtml(license.plan_code)}" data-expiry="${escapeHtml(license.expires_at || '')}" data-devices="${license.max_devices_override ?? ''}">Edit</button>
      <button class="record-payment ghost" data-store-id="${license.store_id}" data-license-id="${license.id}">Payment</button>
    </td>
  </tr>`).join('');

  $('devicesBody').innerHTML = data.devices.map((device) => `<tr><td>${escapeHtml(device.device_name)}</td><td>${escapeHtml(device.status)}</td><td>${new Date(device.last_seen_at).toLocaleString()}</td><td>${device.status === 'active' ? `<button class="revoke-device danger" data-device-id="${device.id}">Revoke</button>` : ''}</td></tr>`).join('');
}

$('saveConfigButton').addEventListener('click', () => {
  const url = $('projectUrl').value.trim().replace(/\/$/, '');
  const key = $('publishableKey').value.trim();
  if (!url.startsWith('https://') || !key.startsWith('sb_')) return alert('Invalid project URL or publishable key.');
  localStorage.setItem('saripos.supabase.url', url);
  localStorage.setItem('saripos.supabase.publishableKey', key);
  location.reload();
});

$('changeConfigButton').addEventListener('click', () => {
  loginCard.classList.add('hidden');
  setupCard.classList.remove('hidden');
});

$('googleLoginButton').addEventListener('click', async () => {
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0].split('?')[0] } });
  if (error) alert(error.message);
});

$('signOutButton').addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });
$('refreshButton').addEventListener('click', loadDashboard);

$('pendingAccounts').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  form.querySelector('button').disabled = true;
  try {
    await invoke({ action: 'approve', userId: form.dataset.userId, ...values });
    await loadDashboard();
  } catch (error) { alert(error.message); }
  finally { form.querySelector('button').disabled = false; }
});

$('licensesBody').addEventListener('click', async (event) => {
  const statusButton = event.target.closest('.license-status');
  const editButton = event.target.closest('.edit-license');
  const paymentButton = event.target.closest('.record-payment');
  const button = statusButton || editButton || paymentButton;
  if (!button) return;
  button.disabled = true;
  try {
    if (statusButton) {
      await invoke({ action: 'set-license', licenseId: button.dataset.licenseId, status: button.dataset.status });
    } else if (editButton) {
      const planCodes = data.plans.filter((plan) => plan.is_active).map((plan) => plan.code).join(', ');
      const planCode = prompt(`Package (${planCodes})`, button.dataset.plan);
      if (planCode === null) return;
      const maxDevicesText = prompt('Device limit (blank = package default)', button.dataset.devices);
      if (maxDevicesText === null) return;
      const currentExpiry = button.dataset.expiry ? button.dataset.expiry.slice(0, 10) : '';
      const expiresAt = prompt('Expiration YYYY-MM-DD (blank = no expiry)', currentExpiry);
      if (expiresAt === null) return;
      await invoke({
        action: 'set-license', licenseId: button.dataset.licenseId, status: 'active',
        planCode: planCode.trim(), maxDevices: maxDevicesText.trim() ? Number(maxDevicesText) : null,
        expiresAt: expiresAt.trim() || null
      });
    } else {
      const amount = prompt('Amount paid in PHP (example: 499.00)');
      if (amount === null) return;
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Invalid payment amount.');
      const reference = prompt('Payment reference (optional)', '') ?? '';
      await invoke({
        action: 'record-payment', storeId: button.dataset.storeId, licenseId: button.dataset.licenseId,
        amountCentavos: Math.round(parsed * 100), paymentMethod: 'manual', reference
      });
    }
    await loadDashboard();
  } catch (error) { alert(error.message); }
  finally { button.disabled = false; }
});

$('devicesBody').addEventListener('click', async (event) => {
  const button = event.target.closest('.revoke-device');
  if (!button || !confirm('Revoke this device?')) return;
  button.disabled = true;
  try { await invoke({ action: 'revoke-device', deviceId: button.dataset.deviceId }); await loadDashboard(); }
  catch (error) { alert(error.message); button.disabled = false; }
});

boot();
