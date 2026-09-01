const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_SHA256 = '1c40a1614db82031e3ebc2e23df28e28fbe7889d828edbb489ab4f24eba6d8e1';
const EXPECTED_BYTES = 844146;
const encoded = [
  require('../bundles/v1634/v16_0'),
  require('../bundles/v1634/v16_1'),
  require('../bundles/v1634/v16_2'),
  require('../bundles/v1634/v16_3'),
  require('../bundles/v1634/v16_4'),
  require('../bundles/v1634/v16_5'),
  require('../bundles/v1634/v16_6'),
  require('../bundles/v1634/v16_7'),
  require('../bundles/v1634/v16_8'),
  require('../bundles/v1634/v16_9'),
].join('');

let verifiedSource;

function source() {
  if (verifiedSource) return verifiedSource;
  const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
    throw new Error(`Accelerator source verification failed: ${bytes.length} bytes, ${hash}`);
  }
  verifiedSource = bytes.toString('utf8');
  return verifiedSource;
}

const PERSISTENCE_BRIDGE = String.raw`
<script id="accelerator-v1635-persistence-bridge">
(() => {
  if (window.__acceleratorPersistenceBridge) return;
  window.__acceleratorPersistenceBridge = true;
  document.title = 'Accelerator OS V16.3.5 - Mobile Cloud Reconnect';

  const REF = 'pqggobwpazihraeqvspc';
  const SUPABASE_URL = 'https://' + REF + '.supabase.co';
  const API_KEY = 'sb_publishable_VgGebMpW9tBcCiQlRdnzpA__rbATAaT';
  const AUTH_KEY = 'sb-' + REF + '-auth-token';
  // Stable across software builds: deployments must never strand the latest browser backup.
  const LOCAL_KEY = 'accelerator-os-state-backup';
  const LOCAL_META_KEY = LOCAL_KEY + '-meta';
  const LOCAL_PREVIOUS_KEY = LOCAL_KEY + '-previous';
  const LOCAL_PREVIOUS_META_KEY = LOCAL_PREVIOUS_KEY + '-meta';
  const RECOVERY_KEY = 'accelerator-os-recovery-copy';
  const RECOVERY_META_KEY = RECOVERY_KEY + '-meta';
  const NATIVE_KEYS = [
    'accelerator-os-v1631-state-backup',
    'accelerator.mainline.v11.cleancore',
    'accelerator.mainline.v10.reconciled',
    'accelerator.mainline.v9.protocol',
    'accelerator.mainline.v8.flowclarity',
    'accelerator.mainline.v7.usability',
    'accelerator.mainline.v6.protocolflow'
  ];

  let workspaceId = null;
  let remoteVersion = 0;
  let accessToken = null;
  let refreshToken = null;
  let ready = false;
  let applying = false;
  let lastObservedSerialized = '';
  let lastCloudSerialized = '';
  let pendingSerialized = '';
  let saveTimer = null;
  let retryTimer = null;
  let retryCount = 0;
  let saveInFlight = false;
  let saveBlocked = false;
  let lastLocalRotationAt = 0;
  let recoveryAvailable = false;
  let armedAt = 0;
  let observerArmedAt = 0;
  let remoteShape = { creators: 0, bytes: 0 };
  let lastStatusText = 'Saved';
  let lastLocalSavedAt = 0;
  let lastCloudSavedAt = 0;
  let lastCaptureSource = '';
  let cloudAuthRequired = false;
  let authDialogAutoOpened = false;
  let saveLabelGuardScheduled = false;

  function readBinding(name) {
    try { return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined'); }
    catch (_) { return undefined; }
  }

  function appState() {
    const value = readBinding('state');
    return value && typeof value === 'object' ? value : null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function creatorCount(value) {
    return Array.isArray(value && value.creators) ? value.creators.length : 0;
  }

  function stateBytes(value) {
    try { return JSON.stringify(value).length; } catch (_) { return 0; }
  }

  function shapeOf(value) {
    return { creators: creatorCount(value), bytes: stateBytes(value) };
  }

  function saveStateName(text) {
    const value = String(text || '').toLowerCase();
    if (value.includes('sign-in required')) return 'auth';
    if (value.includes('blocked')) return 'blocked';
    if (value.includes('changed elsewhere')) return 'conflict';
    if (value.includes('failed')) return 'error';
    if (value.includes('offline')) return 'offline';
    if (value.includes('saving')) return 'saving';
    return 'saved';
  }

  function applySaveLabel() {
    try {
      const el = document.querySelector('[data-save-label], #saveLabel, .save-label');
      if (el) {
        let textNode = el.querySelector('[data-save-text]');
        if (!textNode) {
          el.textContent = '';
          const dot = document.createElement('i');
          dot.className = 'save-dot';
          dot.setAttribute('aria-hidden', 'true');
          textNode = document.createElement('span');
          textNode.setAttribute('data-save-text', '');
          el.append(dot, textNode);
        }
        el.setAttribute('data-save-label', '');
        el.setAttribute('role', cloudAuthRequired ? 'button' : 'status');
        el.setAttribute('aria-live', 'polite');
        textNode.textContent = lastStatusText;
        el.dataset.saveState = saveStateName(lastStatusText);
        el.title = lastStatusText;
        if (cloudAuthRequired) {
          el.tabIndex = 0;
          el.setAttribute('aria-label', lastStatusText + '. Activate to sign in.');
        } else {
          el.removeAttribute('tabindex');
          el.removeAttribute('aria-label');
        }
        if (!el.dataset.cloudAuthWired) {
          el.dataset.cloudAuthWired = 'true';
          el.addEventListener('click', () => {
            if (cloudAuthRequired) openCloudAuthDialog();
          });
          el.addEventListener('keydown', event => {
            if (!cloudAuthRequired || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            openCloudAuthDialog();
          });
        }
      }
      ensureRecoveryNotice(el);
    } catch (_) {}
  }

  function setSaveLabel(text) {
    lastStatusText = String(text || 'Saved');
    applySaveLabel();
  }

  function installSaveLabelGuard() {
    if (window.__acceleratorSaveLabelGuard || !document.body) return;
    window.__acceleratorSaveLabelGuard = new MutationObserver(() => {
      if (saveLabelGuardScheduled) return;
      const textNode = document.querySelector('[data-save-text]');
      if (!textNode || textNode.textContent === lastStatusText) return;
      saveLabelGuardScheduled = true;
      queueMicrotask(() => {
        saveLabelGuardScheduled = false;
        applySaveLabel();
      });
    });
    window.__acceleratorSaveLabelGuard.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function ensureCloudAuthUi() {
    let dialog = document.getElementById('accelerator-cloud-auth-dialog');
    if (dialog) return dialog;

    const style = document.createElement('style');
    style.id = 'accelerator-cloud-auth-styles';
    style.textContent = [
      '.save-label[data-save-state="auth"]{cursor:pointer}',
      '.save-label[data-save-state="auth"] .save-dot{background:#d36b55}',
      '.accelerator-cloud-auth{width:min(460px,calc(100% - 28px));border:1px solid #d9e0e6;border-radius:24px;padding:0;background:#f8fafb;color:#17212b;box-shadow:0 28px 90px rgba(23,33,43,.24)}',
      '.accelerator-cloud-auth::backdrop{background:rgba(23,33,43,.58);backdrop-filter:blur(4px)}',
      '.accelerator-cloud-auth-card{padding:26px}',
      '.accelerator-cloud-auth-kicker{margin:0 0 8px;color:#77838f;font:800 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}',
      '.accelerator-cloud-auth h2{margin:0;color:#17212b;font:800 30px/1.05 Inter,system-ui,sans-serif;letter-spacing:-.035em}',
      '.accelerator-cloud-auth-copy{margin:12px 0 20px;color:#66717d;font:500 15px/1.5 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-form{display:grid;gap:14px}',
      '.accelerator-cloud-auth-form label{display:grid;gap:7px;color:#26313b;font:750 12px/1.2 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-form input{box-sizing:border-box;width:100%;min-height:48px;border:1px solid #cfd8df;border-radius:12px;background:#fff;color:#17212b;padding:11px 13px;font:500 16px/1.3 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-form input:focus{outline:0;border-color:#5487a1;box-shadow:0 0 0 3px rgba(84,135,161,.16)}',
      '.accelerator-cloud-auth-actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:4px}',
      '.accelerator-cloud-auth-actions button{min-height:46px;border-radius:12px;padding:10px 16px;font:800 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.accelerator-cloud-auth-submit{border:1px solid #17212b;background:#17212b;color:#fff}',
      '.accelerator-cloud-auth-local{border:1px solid #cfd8df;background:#fff;color:#26313b}',
      '.accelerator-cloud-auth-message{min-height:20px;margin:14px 0 0;color:#66717d;font:600 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-message[data-type="error"]{color:#b44435}',
      '.accelerator-cloud-auth-safe{display:flex;gap:8px;align-items:flex-start;margin:18px 0 0;padding-top:16px;border-top:1px solid #dce3e8;color:#66717d;font:500 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-safe strong{color:#26313b}',
      '.accelerator-recovery-notice{box-sizing:border-box;position:fixed;right:18px;bottom:18px;z-index:99998;width:min(360px,calc(100% - 36px));display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;border:1px solid #dcc65e;border-radius:16px;background:#fff9df;color:#17212b;padding:14px 14px 14px 16px;box-shadow:0 18px 55px rgba(23,33,43,.2)}',
      '.accelerator-recovery-notice strong{display:block;margin-bottom:3px;font:800 13px/1.25 Inter,system-ui,sans-serif}.accelerator-recovery-notice span{display:block;color:#66717d;font:500 12px/1.4 Inter,system-ui,sans-serif}',
      '.accelerator-recovery-actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.accelerator-recovery-actions button{min-height:36px;border-radius:10px;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '#accelerator-recovery-copy{border:1px solid #17212b;background:#17212b;color:#fff}.accelerator-recovery-dismiss{border:1px solid #d8d1a7;background:#fffdf2;color:#4e5862}',
      '@media(max-width:520px){.accelerator-cloud-auth{width:calc(100% - 20px);border-radius:20px}.accelerator-cloud-auth-card{padding:22px 18px}.accelerator-cloud-auth h2{font-size:27px}.accelerator-cloud-auth-actions{grid-template-columns:1fr}.accelerator-cloud-auth-local{order:2}.accelerator-recovery-notice{right:10px;bottom:10px;width:calc(100% - 20px)}}'
    ].join('');
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.id = 'accelerator-cloud-auth-dialog';
    dialog.className = 'accelerator-cloud-auth';
    dialog.setAttribute('aria-labelledby', 'accelerator-cloud-auth-title');
    dialog.innerHTML = [
      '<section class="accelerator-cloud-auth-card">',
      '<p class="accelerator-cloud-auth-kicker">Secure cloud workspace</p>',
      '<h2 id="accelerator-cloud-auth-title">Connect this browser</h2>',
      '<p class="accelerator-cloud-auth-copy">Your laptop and phone each need their own sign-in. Connect this browser to load the current cloud workspace and keep future changes synced.</p>',
      '<form class="accelerator-cloud-auth-form" id="accelerator-cloud-auth-form">',
      '<label>Email<input name="email" type="email" inputmode="email" autocomplete="email" required></label>',
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>',
      '<div class="accelerator-cloud-auth-actions"><button class="accelerator-cloud-auth-submit" type="submit">Connect cloud</button><button class="accelerator-cloud-auth-local" type="button" data-cloud-auth-close>Work locally</button></div>',
      '</form>',
      '<p class="accelerator-cloud-auth-message" id="accelerator-cloud-auth-message" role="status" aria-live="polite"></p>',
      '<p class="accelerator-cloud-auth-safe"><span aria-hidden="true">●</span><span><strong>Your phone copy is safe.</strong> Signing in restores cloud data before the app is allowed to write anything.</span></p>',
      '</section>'
    ].join('');
    document.body.appendChild(dialog);

    dialog.querySelector('[data-cloud-auth-close]').addEventListener('click', closeCloudAuthDialog);
    dialog.querySelector('#accelerator-cloud-auth-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void signInToCloud(String(form.get('email') || '').trim(), String(form.get('password') || ''));
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeCloudAuthDialog();
    });
    return dialog;
  }

  function setCloudAuthMessage(text, type = '') {
    const dialog = ensureCloudAuthUi();
    const message = dialog.querySelector('#accelerator-cloud-auth-message');
    message.textContent = String(text || '');
    if (type) message.dataset.type = type;
    else delete message.dataset.type;
  }

  function openCloudAuthDialog({ automatic = false } = {}) {
    const dialog = ensureCloudAuthUi();
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!automatic) {
      const email = dialog.querySelector('input[name="email"]');
      if (email) setTimeout(() => email.focus(), 0);
    }
  }

  function closeCloudAuthDialog() {
    const dialog = document.getElementById('accelerator-cloud-auth-dialog');
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function markCloudAuthRequired({ clearStored = false, open = false } = {}) {
    cloudAuthRequired = true;
    workspaceId = null;
    accessToken = null;
    refreshToken = null;
    saveBlocked = true;
    clearTimeout(retryTimer);
    if (clearStored) {
      try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
    }
    setSaveLabel('Cloud sign-in required - local backup safe');
    if (open && !authDialogAutoOpened) {
      authDialogAutoOpened = true;
      setTimeout(() => openCloudAuthDialog({ automatic: true }), 180);
    }
  }

  async function signInToCloud(email, password) {
    if (!email || !password) {
      setCloudAuthMessage('Enter the email and password used for Accelerator OS.', 'error');
      return false;
    }

    const dialog = ensureCloudAuthUi();
    const submit = dialog.querySelector('.accelerator-cloud-auth-submit');
    submit.disabled = true;
    setCloudAuthMessage('Connecting this browser…');
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const text = await response.text();
      let session = null;
      try { session = text ? JSON.parse(text) : null; } catch (_) {}
      if (!response.ok || !session || !session.access_token || !session.refresh_token) {
        const message = response.status === 400 || response.status === 401
          ? 'That email or password did not match. Try the login you use on your laptop.'
          : 'Cloud sign-in is temporarily unavailable. Your phone copy is still safe.';
        setCloudAuthMessage(message, 'error');
        return false;
      }

      const candidateState = appState();
      const recoveryCandidate = candidateState
        ? { value: clone(candidateState), key: 'cloud-auth-reconnect' }
        : readFallbackState();
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (_) {}
      accessToken = session.access_token;
      refreshToken = session.refresh_token;
      cloudAuthRequired = false;
      saveBlocked = false;
      pendingSerialized = '';
      clearTimeout(saveTimer);
      clearTimeout(retryTimer);

      const connected = await connectCloud({
        restoreState: true,
        recoveryCandidate,
        forceRecoveryCandidate: true
      });
      if (!connected) {
        if (!cloudAuthRequired) {
          setSaveLabel('Cloud unavailable - local backup safe');
          setCloudAuthMessage('Signed in, but the cloud workspace could not load. Try again in a moment.', 'error');
        }
        return false;
      }

      const current = appState();
      if (current) {
        lastObservedSerialized = JSON.stringify(current);
        lastCloudSerialized = lastObservedSerialized;
        persistLocalSnapshot(lastObservedSerialized, 'cloud-auth-restore');
      }
      const passwordInput = dialog.querySelector('input[name="password"]');
      if (passwordInput) passwordInput.value = '';
      setCloudAuthMessage('Connected. This browser is now saving to cloud.');
      setSaveLabel('Cloud connected');
      setTimeout(closeCloudAuthDialog, 450);
      return true;
    } catch (_) {
      setCloudAuthMessage('Cloud sign-in is temporarily unavailable. Your phone copy is still safe.', 'error');
      setSaveLabel('Cloud unavailable - local backup safe');
      return false;
    } finally {
      submit.disabled = false;
    }
  }

  function downloadRecoveryCopy() {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return;
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accelerator-recovery-copy-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (_) {}
  }

  function ensureRecoveryNotice() {
    if (!recoveryAvailable || !document.body) return;
    if (document.getElementById('accelerator-recovery-copy')) return;
    ensureCloudAuthUi();
    const notice = document.createElement('aside');
    notice.className = 'accelerator-recovery-notice';
    notice.id = 'accelerator-recovery-notice';
    notice.setAttribute('role', 'status');
    notice.innerHTML = [
      '<div><strong>Browser copy protected</strong><span>A different local copy was kept before cloud data loaded.</span></div>',
      '<div class="accelerator-recovery-actions"><button id="accelerator-recovery-copy" type="button">Download recovery copy</button><button class="accelerator-recovery-dismiss" type="button">Dismiss</button></div>'
    ].join('');
    const download = notice.querySelector('#accelerator-recovery-copy');
    download.title = 'Download the protected browser copy before deciding whether to import it.';
    download.addEventListener('click', downloadRecoveryCopy);
    notice.querySelector('.accelerator-recovery-dismiss').addEventListener('click', () => notice.remove());
    document.body.appendChild(notice);
  }

  function normalizeWithApp(value) {
    if (!value || typeof value !== 'object') return value;
    try {
      window.__acceleratorNormalizeCandidate = clone(value);
      const normalized = (0, eval)(
        'typeof normalize === "function" ? normalize(window.__acceleratorNormalizeCandidate) : window.__acceleratorNormalizeCandidate'
      );
      delete window.__acceleratorNormalizeCandidate;
      return normalized;
    } catch (_) {
      try { delete window.__acceleratorNormalizeCandidate; } catch (_) {}
      return clone(value);
    }
  }

  function setGlobalState(value) {
    if (!value || typeof value !== 'object') return false;
    try {
      window.__acceleratorRestoreCandidate = normalizeWithApp(value);
      const applied = (0, eval)(
        'typeof state !== "undefined" ? (state = window.__acceleratorRestoreCandidate, true) : false'
      );
      delete window.__acceleratorRestoreCandidate;
      return !!applied;
    } catch (_) {
      try { delete window.__acceleratorRestoreCandidate; } catch (_) {}
      return false;
    }
  }

  function normalizeCurrentState() {
    const current = appState();
    return current ? setGlobalState(current) : false;
  }

  function rerender() {
    try {
      const fn = readBinding('render');
      if (typeof fn === 'function') { fn(); return true; }
    } catch (_) {}
    try {
      const fn = readBinding('renderApp');
      if (typeof fn === 'function') { fn(); return true; }
    } catch (_) {}
    return false;
  }

  function replaceState(next, sourceName = 'restore') {
    if (!next || typeof next !== 'object') return false;
    applying = true;
    try {
      if (!setGlobalState(next)) return false;
      const current = appState();
      if (!current) return false;
      lastObservedSerialized = JSON.stringify(current);
      persistLocalSnapshot(lastObservedSerialized, sourceName);
      rerender();
      return true;
    } finally {
      setTimeout(() => { applying = false; }, 0);
    }
  }

  function installRenderGuard() {
    try {
      const original = readBinding('render');
      if (typeof original !== 'function' || window.__acceleratorNativeRender) return;
      window.__acceleratorNativeRender = original;
      (0, eval)("render = function acceleratorSafeRender(){ try { if (typeof normalize === 'function') state = normalize(state); } catch (_) {} const out = window.__acceleratorNativeRender.apply(this, arguments); queueMicrotask(() => window.__acceleratorApplySaveLabel()); return out; };");
    } catch (_) {}
  }

  function captureStateChange(source = 'observer') {
    if (!ready || applying || Date.now() < armedAt) return false;
    const current = appState();
    if (!current) return false;
    let serialized;
    try { serialized = JSON.stringify(current); } catch (_) { return false; }
    if (!serialized || serialized === lastObservedSerialized) return false;
    lastCaptureSource = source;
    queueSnapshot(serialized);
    return true;
  }

  function installSaveHook() {
    try {
      const original = readBinding('save');
      if (typeof original !== 'function' || window.__acceleratorNativeSave) return;
      window.__acceleratorNativeSave = original;
      (0, eval)("save = function acceleratorImmediateSave(){ const out = window.__acceleratorNativeSave.apply(this, arguments); const source = (new Error('dashboard save')).stack || 'dashboard save'; queueMicrotask(() => window.__acceleratorCaptureStateChange(source)); return out; };");
    } catch (_) {}
  }

  function readFallbackState() {
    const candidates = [LOCAL_KEY, LOCAL_PREVIOUS_KEY, RECOVERY_KEY, ...NATIVE_KEYS];
    let best = null;
    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const value = normalizeWithApp(JSON.parse(raw));
        const score = creatorCount(value) * 1000000000 + stateBytes(value);
        if (!best || score > best.score) best = { value, key, score };
      } catch (_) {}
    }
    return best;
  }

  function preserveRecoveryCandidate(candidate, cloudState, force = false) {
    if (!candidate || !candidate.value) return false;
    const localShape = shapeOf(candidate.value);
    const cloudShape = shapeOf(cloudState || {});
    const materiallyRicher = localShape.creators > cloudShape.creators ||
      (localShape.creators > 0 &&
       localShape.creators === cloudShape.creators &&
       cloudShape.bytes > 0 &&
       localShape.bytes > Math.floor(cloudShape.bytes * 1.35));
    let different = false;
    try { different = JSON.stringify(candidate.value) !== JSON.stringify(cloudState || {}); } catch (_) {}
    if (!materiallyRicher && !(force && different)) return false;

    try {
      const existing = localStorage.getItem(RECOVERY_KEY);
      let keepExisting = false;
      if (existing) {
        const existingValue = normalizeWithApp(JSON.parse(existing));
        const existingShape = shapeOf(existingValue);
        keepExisting = existingShape.creators > localShape.creators ||
          (existingShape.creators === localShape.creators && existingShape.bytes >= localShape.bytes);
      }
      if (!keepExisting) {
        localStorage.setItem(RECOVERY_KEY, JSON.stringify(candidate.value));
        localStorage.setItem(RECOVERY_META_KEY, JSON.stringify({
          savedAt: Date.now(),
          sourceKey: candidate.key,
          localShape,
          cloudShape
        }));
      }
      recoveryAvailable = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  function readStoredSession() {
    accessToken = null;
    refreshToken = null;
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const session = parsed && parsed.currentSession ? parsed.currentSession : parsed;
      accessToken = session && session.access_token || null;
      refreshToken = session && session.refresh_token || null;
    } catch (_) {}
  }

  async function refreshSession() {
    if (!refreshToken) return false;
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          markCloudAuthRequired({ clearStored: true });
        }
        return false;
      }
      const session = await response.json();
      accessToken = session.access_token || null;
      refreshToken = session.refresh_token || refreshToken;
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (_) {}
      cloudAuthRequired = false;
      return !!accessToken;
    } catch (_) { return false; }
  }

  async function rpc(name, body, retry = true) {
    if (!accessToken) return { ok: false, status: 401, data: null, authRequired: cloudAuthRequired };
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: {
          apikey: API_KEY,
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body || {})
      });
      if (response.status === 401 && retry) {
        if (await refreshSession()) return rpc(name, body, false);
        if (cloudAuthRequired) return { ok: false, status: 401, data: null, authRequired: true };
      }
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
      return { ok: response.ok, status: response.status, data, authRequired: response.status === 401 && cloudAuthRequired };
    } catch (_) {
      return { ok: false, status: 0, data: null };
    }
  }

  function suspiciousDestructiveSave(parsed) {
    const next = shapeOf(parsed);
    if (remoteShape.creators >= 4 &&
        next.creators <= Math.max(1, Math.floor(remoteShape.creators * 0.50)) &&
        next.creators <= remoteShape.creators - 2) return true;
    if (remoteShape.bytes >= 50000 &&
        next.bytes < Math.floor(remoteShape.bytes * 0.25) &&
        next.creators < remoteShape.creators) return true;
    return false;
  }

  async function saveRemote(serialized) {
    if (!serialized) return { ok: false, retryable: false };
    if (cloudAuthRequired || !accessToken) return { ok: false, retryable: false, authRequired: true };
    if (!workspaceId) return { ok: false, retryable: true };
    let parsed;
    try { parsed = normalizeWithApp(JSON.parse(serialized)); }
    catch (_) { return { ok: false, retryable: false }; }

    // Client-side circuit breaker. The database has the same guard independently.
    if (suspiciousDestructiveSave(parsed)) {
      setSaveLabel('Cloud save blocked - data protected');
      console.error('Accelerator OS blocked a destructive cloud save.');
      return { ok: false, blocked: true };
    }

    const result = await rpc('save_workspace_state', {
      p_workspace_id: workspaceId,
      p_expected_version: remoteVersion,
      p_state: parsed
    });

    if (!result.ok) {
      if (result.authRequired) return { ok: false, retryable: false, authRequired: true };
      const detail = JSON.stringify(result.data || '').toLowerCase();
      const protectedSave = result.status === 409 || /destructive|creator_collapse|size_collapse|23514/.test(detail);
      if (protectedSave) {
        setSaveLabel('Cloud save blocked - data protected');
        return { ok: false, blocked: true };
      }
      return { ok: false, retryable: true, status: result.status };
    }
    if (!Array.isArray(result.data) || !result.data.length) {
      return { ok: false, retryable: true };
    }

    const row = result.data[0];
    if (row.conflict) {
      // Never blindly retry over a newer cloud version. That is a data-loss path.
      remoteVersion = Number(row.version || remoteVersion || 0);
      setSaveLabel('Cloud changed elsewhere - refresh before saving');
      return { ok: false, conflict: true };
    }

    remoteVersion = Number(row.version || remoteVersion + 1);
    remoteShape = shapeOf(parsed);
    return { ok: true };
  }

  async function connectCloud({ restoreState = true, recoveryCandidate = null, forceRecoveryCandidate = false } = {}) {
    readStoredSession();
    if (!accessToken && !refreshToken) {
      markCloudAuthRequired();
      return false;
    }
    if (!accessToken && !(await refreshSession())) return false;

    let workspaces = await rpc('get_my_workspaces', {});
    if (!workspaces.ok || !Array.isArray(workspaces.data) || !workspaces.data.length) {
      const ensured = await rpc('ensure_personal_workspace', { p_name: 'Blake' });
      if (!ensured.ok) return false;
      workspaces = await rpc('get_my_workspaces', {});
    }
    if (!workspaces.ok || !Array.isArray(workspaces.data) || !workspaces.data.length) return false;

    workspaceId = workspaces.data[0].id;
    remoteVersion = Number(workspaces.data[0].version || 0);

    const remote = await rpc('get_workspace_state', { p_workspace_id: workspaceId });
    if (!remote.ok || !Array.isArray(remote.data) || !remote.data.length) return false;

    remoteVersion = Number(remote.data[0].version || remoteVersion || 0);
    const cloudState = remote.data[0].state;
    const normalizedCloud = cloudState && typeof cloudState === 'object'
      ? normalizeWithApp(cloudState)
      : {};
    remoteShape = shapeOf(normalizedCloud);
    preserveRecoveryCandidate(recoveryCandidate, normalizedCloud, forceRecoveryCandidate);
    if (normalizedCloud && Object.keys(normalizedCloud).length) {
      if (restoreState && !replaceState(normalizedCloud, 'cloud')) return false;
    }
    cloudAuthRequired = false;
    saveBlocked = false;
    setSaveLabel('Cloud connected');
    return true;
  }

  function persistLocalSnapshot(serialized, sourceName = 'app') {
    try {
      const now = Date.now();
      const previous = localStorage.getItem(LOCAL_KEY);
      if (previous && previous !== serialized && now - lastLocalRotationAt >= 30000) {
        localStorage.setItem(LOCAL_PREVIOUS_KEY, previous);
        localStorage.setItem(LOCAL_PREVIOUS_META_KEY, localStorage.getItem(LOCAL_META_KEY) || JSON.stringify({ savedAt: now, source: 'rotation' }));
        lastLocalRotationAt = now;
      }
      localStorage.setItem(LOCAL_KEY, serialized);
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ savedAt: now, source: sourceName }));
      lastLocalSavedAt = now;
    } catch (_) {}
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    const delay = Math.min(10000, 1000 * Math.pow(2, Math.min(retryCount, 3)));
    retryCount += 1;
    retryTimer = setTimeout(() => { void drainSaveQueue(); }, delay);
  }

  async function drainSaveQueue() {
    if (saveInFlight || saveBlocked || !pendingSerialized) return;
    if (pendingSerialized === lastCloudSerialized) {
      pendingSerialized = '';
      setSaveLabel('Saved just now');
      return;
    }

    const target = pendingSerialized;
    saveInFlight = true;
    setSaveLabel('Saving…');
    const result = await saveRemote(target);
    saveInFlight = false;

    if (result.ok) {
      lastCloudSerialized = target;
      lastCloudSavedAt = Date.now();
      retryCount = 0;
      clearTimeout(retryTimer);
      if (pendingSerialized === target) pendingSerialized = '';
      setSaveLabel('Saved just now');
      if (pendingSerialized) queueMicrotask(() => { void drainSaveQueue(); });
      return;
    }

    if (result.authRequired) {
      markCloudAuthRequired({ clearStored: true, open: true });
      return;
    }

    if (result.blocked || result.conflict || result.retryable === false) {
      saveBlocked = true;
      return;
    }

    setSaveLabel(navigator.onLine === false
      ? 'Offline - local backup safe'
      : 'Cloud save failed - retrying; local backup safe');
    scheduleRetry();
  }

  function queueSnapshot(serialized, { immediate = false } = {}) {
    persistLocalSnapshot(serialized, 'app');
    lastObservedSerialized = serialized;
    pendingSerialized = serialized;
    if (cloudAuthRequired) {
      setSaveLabel('Cloud sign-in required - local backup safe');
      return;
    }
    setSaveLabel('Saving…');
    clearTimeout(saveTimer);
    // The native app records its own local-save timestamp after 120 ms. Wait
    // through one observer cycle so one edit becomes one ordered cloud write.
    saveTimer = setTimeout(() => { void drainSaveQueue(); }, immediate ? 0 : 280);
  }

  function observeState() {
    setInterval(() => {
      if (!ready || applying) return;
      const current = appState();
      if (!current) return;
      let serialized;
      try { serialized = JSON.stringify(current); } catch (_) { return; }
      if (Date.now() < observerArmedAt) {
        lastObservedSerialized = serialized;
        return;
      }
      if (!serialized || serialized === lastObservedSerialized) return;
      lastCaptureSource = 'observer';
      queueSnapshot(serialized);
    }, 120);
  }

  async function boot() {
    for (let i = 0; i < 100 && !appState(); i++) await new Promise(r => setTimeout(r, 40));
    if (!appState()) return;

    normalizeCurrentState();
    installRenderGuard();
    installSaveLabelGuard();
    window.__acceleratorApplySaveLabel = applySaveLabel;
    window.__acceleratorCaptureStateChange = captureStateChange;
    installSaveHook();
    rerender();

    const preCloudFallback = readFallbackState();
    let restoredFromCloud = false;
    try { restoredFromCloud = await connectCloud({ recoveryCandidate: preCloudFallback }); } catch (_) {}

    // Local data is fallback only. It NEVER overwrites a successfully loaded cloud state on boot.
    if (!restoredFromCloud) {
      const fallback = readFallbackState();
      if (fallback) replaceState(fallback.value, 'offline-fallback');
      setSaveLabel(cloudAuthRequired && navigator.onLine !== false
        ? 'Cloud sign-in required - local backup safe'
        : (navigator.onLine === false ? 'Offline - local backup safe' : 'Cloud unavailable - local backup safe'));
    }

    normalizeCurrentState();
    rerender();
    setSaveLabel(restoredFromCloud
      ? 'Cloud connected'
      : (cloudAuthRequired && navigator.onLine !== false
        ? 'Cloud sign-in required - local backup safe'
        : (navigator.onLine === false ? 'Offline - local backup safe' : 'Cloud unavailable - local backup safe')));

    const current = appState();
    if (current) {
      try {
        lastObservedSerialized = JSON.stringify(current);
        lastCloudSerialized = restoredFromCloud ? lastObservedSerialized : '';
        persistLocalSnapshot(lastObservedSerialized, restoredFromCloud ? 'cloud' : 'offline-fallback');
      } catch (_) {}
    }

    // Deployment/startup code is never allowed to immediately write cloud state.
    // Only a state change after boot can arm a save.
    armedAt = Date.now();
    observerArmedAt = Date.now() + 1500;
    ready = true;
    observeState();
    if (cloudAuthRequired && navigator.onLine !== false) markCloudAuthRequired({ open: true });
  }

  window.addEventListener('online', async () => {
    if (cloudAuthRequired) {
      setSaveLabel('Cloud sign-in required - local backup safe');
      return;
    }
    saveBlocked = false;
    if (!workspaceId) {
      try { await connectCloud({ restoreState: !pendingSerialized, recoveryCandidate: readFallbackState() }); } catch (_) {}
    }
    if (pendingSerialized) void drainSaveQueue();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    const current = appState();
    if (!current) return;
    try {
      const serialized = JSON.stringify(current);
      persistLocalSnapshot(serialized, 'visibility-hidden');
      if (serialized !== lastCloudSerialized) {
        pendingSerialized = serialized;
        clearTimeout(saveTimer);
        void drainSaveQueue();
      }
    } catch (_) {}
  });

  window.addEventListener('pagehide', () => {
    const current = appState();
    if (!current) return;
    try {
      const serialized = JSON.stringify(current);
      persistLocalSnapshot(serialized, 'pagehide');
      if (serialized !== lastCloudSerialized) {
        pendingSerialized = serialized;
        void drainSaveQueue();
      }
    } catch (_) {}
  });

  window.__acceleratorSaveDiagnostics = () => ({
    workspaceId,
    remoteVersion,
    saveInFlight,
    saveBlocked,
    pending: !!pendingSerialized,
    localBackup: !!localStorage.getItem(LOCAL_KEY),
    previousLocalBackup: !!localStorage.getItem(LOCAL_PREVIOUS_KEY),
    recoveryAvailable: recoveryAvailable || !!localStorage.getItem(RECOVERY_KEY),
    statusText: lastStatusText,
    lastLocalSavedAt,
    lastCloudSavedAt,
    lastCaptureSource,
    authRequired: cloudAuthRequired,
    retryCount
  });

  window.__acceleratorOpenCloudSignIn = openCloudAuthDialog;

  boot();
})();
</script>`;

function injectPersistence(html) {
  if (html.includes('id="accelerator-v1635-persistence-bridge"')) return html;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody < 0) return html + PERSISTENCE_BRIDGE;
  return html.slice(0, closingBody) + PERSISTENCE_BRIDGE + '\n' + html.slice(closingBody);
}

module.exports = function handler(_req, res) {
  try {
    const html = injectPersistence(source());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'V16.3.5-mobile-cloud-reconnect');
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
