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
<script id="accelerator-v1636-persistence-bridge">
(() => {
  if (window.__acceleratorPersistenceBridge) return;
  window.__acceleratorPersistenceBridge = true;
  document.title = 'Accelerator OS V16.3.6 - Cloud-First Data Safety';

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
  const PENDING_KEY = 'accelerator-os-unsynced-draft';
  const PENDING_META_KEY = PENDING_KEY + '-meta';
  const DEMO_MARKER_KEY = 'accelerator-os-demo-mode';
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
  let pendingBaseVersion = null;
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
  let cloudStateLoaded = false;
  let syncConflict = false;
  let demoMode = false;
  let localWorkspaceAvailable = false;
  let latestCloudState = null;
  let conflictCloudVersion = null;
  let authDialogAutoOpened = false;
  let saveLabelGuardScheduled = false;
  let reconnectInFlight = false;

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
    if (value.includes('demo mode')) return 'demo';
    if (value.includes('sign-in required')) return 'auth';
    if (value.includes('blocked')) return 'blocked';
    if (value.includes('changed elsewhere') || value.includes('needs review') || value.includes('paused')) return 'conflict';
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
        const actionable = cloudAuthRequired || syncConflict || demoMode;
        el.setAttribute('role', actionable ? 'button' : 'status');
        el.setAttribute('aria-live', 'polite');
        textNode.textContent = lastStatusText;
        el.dataset.saveState = saveStateName(lastStatusText);
        el.title = lastStatusText;
        if (actionable) {
          el.tabIndex = 0;
          el.setAttribute('aria-label', lastStatusText + (syncConflict ? '. Activate to review.' : '. Activate to sign in.'));
        } else {
          el.removeAttribute('tabindex');
          el.removeAttribute('aria-label');
        }
        if (!el.dataset.cloudAuthWired) {
          el.dataset.cloudAuthWired = 'true';
          el.addEventListener('click', () => {
            if (syncConflict) openSyncConflictDialog();
            else if (cloudAuthRequired || demoMode) openCloudAuthDialog();
          });
          el.addEventListener('keydown', event => {
            if (!(cloudAuthRequired || syncConflict || demoMode) || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            if (syncConflict) openSyncConflictDialog();
            else openCloudAuthDialog();
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

  function ensureStartupShield() {
    let shield = document.getElementById('accelerator-startup-shield');
    if (shield) return shield;
    ensureCloudAuthUi();
    shield = document.createElement('section');
    shield.id = 'accelerator-startup-shield';
    shield.className = 'accelerator-startup-shield';
    shield.setAttribute('role', 'status');
    shield.setAttribute('aria-live', 'polite');
    shield.innerHTML = [
      '<div class="accelerator-startup-card">',
      '<span class="accelerator-startup-mark" aria-hidden="true">A</span>',
      '<h1 data-startup-title>Loading your cloud workspace…</h1>',
      '<p data-startup-copy>Checking the latest saved version before the dashboard becomes editable.</p>',
      '<div class="accelerator-startup-actions" hidden><button class="accelerator-startup-retry" type="button">Retry cloud</button><button class="accelerator-startup-demo" type="button">View demo</button></div>',
      '</div>'
    ].join('');
    shield.querySelector('.accelerator-startup-retry').addEventListener('click', () => { void retryCloudLoad(); });
    shield.querySelector('.accelerator-startup-demo').addEventListener('click', enterDemoMode);
    document.body.appendChild(shield);
    return shield;
  }

  function showStartupShield(title = 'Loading your cloud workspace…', copy = 'Checking the latest saved version before the dashboard becomes editable.', actions = false) {
    document.body.dataset.acceleratorCloudGate = 'true';
    const shield = ensureStartupShield();
    shield.querySelector('[data-startup-title]').textContent = title;
    shield.querySelector('[data-startup-copy]').textContent = copy;
    shield.querySelector('.accelerator-startup-actions').hidden = !actions;
  }

  function hideStartupShield() {
    delete document.body.dataset.acceleratorCloudGate;
    const shield = document.getElementById('accelerator-startup-shield');
    if (shield) shield.remove();
  }

  function setCloudAuthLocalOption(hasLocalWorkspace) {
    const dialog = ensureCloudAuthUi();
    const alternative = dialog.querySelector('[data-cloud-auth-close]');
    const copy = dialog.querySelector('.accelerator-cloud-auth-copy');
    const safe = dialog.querySelector('.accelerator-cloud-auth-safe span:last-child');
    if (alternative) {
      alternative.textContent = hasLocalWorkspace ? 'Work locally' : 'View demo';
      alternative.dataset.localWorkspace = hasLocalWorkspace ? 'true' : 'false';
    }
    copy.textContent = hasLocalWorkspace
      ? 'Connect this browser to load the current cloud workspace. You can keep working from the protected browser copy, but it will not replace cloud data automatically.'
      : 'Connect this browser to load the current cloud workspace. The built-in examples are available only in Demo Mode and can never sync into your account.';
    safe.innerHTML = hasLocalWorkspace
      ? '<strong>Your browser copy is safe.</strong> Signing in restores cloud data before the app is allowed to write anything.'
      : '<strong>Cloud stays authoritative.</strong> No example or unverified browser data can be uploaded during sign-in.';
  }

  function ensureCloudAuthUi() {
    let dialog = document.getElementById('accelerator-cloud-auth-dialog');
    if (dialog) return dialog;

    const style = document.createElement('style');
    style.id = 'accelerator-cloud-auth-styles';
    style.textContent = [
      '.save-label[data-save-state="auth"]{cursor:pointer}',
      '.save-label[data-save-state="auth"] .save-dot{background:#d36b55}',
      '.save-label[data-save-state="conflict"],.save-label[data-save-state="demo"]{cursor:pointer}',
      '.save-label[data-save-state="conflict"] .save-dot{background:#d36b55}.save-label[data-save-state="demo"] .save-dot{background:#d5b83f}',
      'body[data-accelerator-cloud-gate="true"]>*:not(#accelerator-startup-shield):not(#accelerator-cloud-auth-dialog):not(#accelerator-password-recovery-dialog):not(#accelerator-sync-conflict-dialog):not(script):not(style){visibility:hidden!important}',
      '.accelerator-startup-shield{box-sizing:border-box;position:fixed;inset:0;z-index:99996;display:grid;place-items:center;background:#f6f8fa;color:#17212b;padding:24px}',
      '.accelerator-startup-card{width:min(520px,100%);text-align:center}',
      '.accelerator-startup-mark{display:inline-grid;place-items:center;width:48px;height:48px;margin-bottom:22px;border-radius:15px;background:#17212b;color:#fff;font:900 20px/1 Inter,system-ui,sans-serif}',
      '.accelerator-startup-card h1{margin:0;color:#17212b;font:850 36px/1.04 Inter,system-ui,sans-serif;letter-spacing:-.04em}',
      '.accelerator-startup-card p{margin:13px auto 0;max-width:460px;color:#66717d;font:500 15px/1.5 Inter,system-ui,sans-serif}',
      '.accelerator-startup-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:22px}.accelerator-startup-actions[hidden]{display:none}',
      '.accelerator-startup-actions button{min-height:46px;border-radius:12px;padding:10px 16px;font:800 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.accelerator-startup-retry{border:1px solid #17212b;background:#17212b;color:#fff}.accelerator-startup-demo{border:1px solid #cfd8df;background:#fff;color:#26313b}',
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
      '.accelerator-cloud-auth-actions{display:grid;gap:10px;margin-top:4px}',
      '.accelerator-cloud-auth-forgot{justify-self:start;border:0;background:transparent;color:#355d78;padding:2px 0;font:750 12px/1.3 Inter,system-ui,sans-serif;cursor:pointer;text-decoration:underline}',
      '.accelerator-cloud-auth-actions button{min-height:46px;border-radius:12px;padding:10px 16px;font:800 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.accelerator-cloud-auth-submit{border:1px solid #17212b;background:#17212b;color:#fff}',
      '.accelerator-cloud-auth-local{border:1px solid #cfd8df;background:#fff;color:#26313b}',
      '.accelerator-cloud-auth-message{min-height:20px;margin:14px 0 0;color:#66717d;font:600 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-message[data-type="error"]{color:#b44435}',
      '.accelerator-cloud-auth-safe{display:flex;gap:8px;align-items:flex-start;margin:18px 0 0;padding-top:16px;border-top:1px solid #dce3e8;color:#66717d;font:500 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-cloud-auth-safe strong{color:#26313b}',
      '.accelerator-sync-conflict{width:min(520px,calc(100% - 28px));border:1px solid #e0d49a;border-radius:24px;padding:0;background:#fffdf4;color:#17212b;box-shadow:0 28px 90px rgba(23,33,43,.24)}',
      '.accelerator-sync-conflict::backdrop{background:rgba(23,33,43,.58);backdrop-filter:blur(4px)}',
      '.accelerator-sync-conflict-card{padding:26px}.accelerator-sync-conflict h2{margin:0;color:#17212b;font:800 30px/1.08 Inter,system-ui,sans-serif;letter-spacing:-.035em}',
      '.accelerator-sync-conflict-copy{margin:12px 0 0;color:#66717d;font:500 15px/1.5 Inter,system-ui,sans-serif}',
      '.accelerator-sync-conflict-detail{margin:16px 0 0;padding:13px 14px;border:1px solid #eadfbd;border-radius:12px;background:#fff;color:#4e5862;font:650 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-sync-conflict-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}.accelerator-sync-conflict-actions button{min-height:46px;border-radius:12px;padding:10px 14px;font:800 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.accelerator-conflict-cloud{grid-column:1/-1;border:1px solid #17212b;background:#17212b;color:#fff}.accelerator-conflict-review,.accelerator-conflict-download{border:1px solid #cfd8df;background:#fff;color:#26313b}',
      '.accelerator-sync-conflict-message{min-height:18px;margin:12px 0 0;color:#b44435;font:650 12px/1.45 Inter,system-ui,sans-serif}',
      '.accelerator-recovery-notice{box-sizing:border-box;position:fixed;right:18px;bottom:18px;z-index:99998;width:min(360px,calc(100% - 36px));display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;border:1px solid #dcc65e;border-radius:16px;background:#fff9df;color:#17212b;padding:14px 14px 14px 16px;box-shadow:0 18px 55px rgba(23,33,43,.2)}',
      '.accelerator-recovery-notice strong{display:block;margin-bottom:3px;font:800 13px/1.25 Inter,system-ui,sans-serif}.accelerator-recovery-notice span{display:block;color:#66717d;font:500 12px/1.4 Inter,system-ui,sans-serif}',
      '.accelerator-recovery-actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.accelerator-recovery-actions button{min-height:36px;border-radius:10px;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '#accelerator-recovery-copy{border:1px solid #17212b;background:#17212b;color:#fff}.accelerator-recovery-dismiss{border:1px solid #d8d1a7;background:#fffdf2;color:#4e5862}',
      '@media(max-width:520px){.accelerator-startup-card h1{font-size:31px}.accelerator-cloud-auth,.accelerator-sync-conflict{width:calc(100% - 20px);border-radius:20px}.accelerator-cloud-auth-card,.accelerator-sync-conflict-card{padding:22px 18px}.accelerator-cloud-auth h2,.accelerator-sync-conflict h2{font-size:27px}.accelerator-cloud-auth-actions,.accelerator-sync-conflict-actions{grid-template-columns:1fr}.accelerator-cloud-auth-local{order:2}.accelerator-conflict-cloud{grid-column:auto}.accelerator-recovery-notice{right:10px;bottom:10px;width:calc(100% - 20px)}}'
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
      '<p class="accelerator-cloud-auth-copy">Connect this browser to load the current cloud workspace and keep future changes synced.</p>',
      '<form class="accelerator-cloud-auth-form" id="accelerator-cloud-auth-form">',
      '<label>Email<input name="email" type="email" inputmode="email" autocomplete="email" required></label>',
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>',
      '<div class="accelerator-cloud-auth-actions"><button class="accelerator-cloud-auth-submit" type="submit">Connect cloud</button></div>',
      '<button class="accelerator-cloud-auth-forgot" type="button" data-cloud-auth-reset>Forgot password?</button>',
      '</form>',
      '<p class="accelerator-cloud-auth-message" id="accelerator-cloud-auth-message" role="status" aria-live="polite"></p>',
      '<p class="accelerator-cloud-auth-safe"><span aria-hidden="true">●</span><span><strong>Your browser copy is safe.</strong> Signing in restores cloud data before the app is allowed to write anything.</span></p>',
      '</section>'
    ].join('');
    document.body.appendChild(dialog);

    dialog.querySelector('[data-cloud-auth-reset]').addEventListener('click', () => {
      const email = String(new FormData(dialog.querySelector('#accelerator-cloud-auth-form')).get('email') || '').trim();
      void requestPasswordReset(email);
    });
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

  function clearDemoArtifacts() {
    try {
      localStorage.removeItem(DEMO_MARKER_KEY);
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(LOCAL_META_KEY);
      localStorage.removeItem(LOCAL_PREVIOUS_KEY);
      localStorage.removeItem(LOCAL_PREVIOUS_META_KEY);
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(PENDING_META_KEY);
      for (const key of NATIVE_KEYS) localStorage.removeItem(key);
    } catch (_) {}
  }

  function enterDemoMode() {
    if (!localWorkspaceAvailable) clearDemoArtifacts();
    demoMode = true;
    cloudAuthRequired = true;
    cloudStateLoaded = false;
    saveBlocked = true;
    pendingSerialized = '';
    pendingBaseVersion = null;
    clearPendingDraft();
    try { localStorage.setItem(DEMO_MARKER_KEY, 'true'); } catch (_) {}
    closeCloudAuthDialog();
    hideStartupShield();
    const current = appState();
    if (current) {
      try { lastObservedSerialized = JSON.stringify(current); } catch (_) {}
    }
    setSaveLabel('Demo mode - not synced');
  }

  function handleCloudAuthAlternative(event) {
    const hasLocal = event.currentTarget.dataset.localWorkspace === 'true';
    if (!hasLocal) {
      enterDemoMode();
      return;
    }
    closeCloudAuthDialog();
    hideStartupShield();
    setSaveLabel('Cloud sign-in required - local backup safe');
  }

  async function requestPasswordReset(email) {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setCloudAuthMessage('Enter the email for your existing Accelerator OS account first.', 'error');
      return false;
    }
    setCloudAuthMessage('Sending password-reset email…');
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/recover', {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect_to: window.location.origin + '/?accelerator_recovery=1' })
      });
      if (!response.ok) throw new Error('reset request failed');
      setCloudAuthMessage('Check that inbox for a password-reset email. Open its link in this browser to choose a new password.');
      return true;
    } catch (_) {
      setCloudAuthMessage('Could not request a reset right now. Please try again in a moment.', 'error');
      return false;
    }
  }

  function recoverySessionFromUrl() {
    try {
      if (!new URLSearchParams(window.location.search).has('accelerator_recovery')) return null;
      const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      if (hash.get('type') !== 'recovery' || !hash.get('access_token')) return null;
      return { access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') || null };
    } catch (_) { return null; }
  }

  function ensurePasswordRecoveryUi() {
    let dialog = document.getElementById('accelerator-password-recovery-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'accelerator-password-recovery-dialog';
    dialog.className = 'accelerator-cloud-auth';
    dialog.innerHTML = '<section class="accelerator-cloud-auth-card"><p class="accelerator-cloud-auth-kicker">Account recovery</p><h2>Choose a new password</h2><p class="accelerator-cloud-auth-copy">This restores access to your existing cloud workspace. It does not create a new account or change dashboard data.</p><form class="accelerator-cloud-auth-form" id="accelerator-password-recovery-form"><label>New password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label>Confirm new password<input name="confirmation" type="password" autocomplete="new-password" minlength="8" required></label><div class="accelerator-cloud-auth-actions"><button class="accelerator-cloud-auth-submit" type="submit">Save new password</button></div></form><p class="accelerator-cloud-auth-message" id="accelerator-password-recovery-message" role="status" aria-live="polite"></p></section>';
    document.body.appendChild(dialog);
    dialog.querySelector('#accelerator-password-recovery-form').addEventListener('submit', event => { event.preventDefault(); const form=new FormData(event.currentTarget); void completePasswordRecovery(String(form.get('password')||''),String(form.get('confirmation')||'')); });
    return dialog;
  }

  async function completePasswordRecovery(password, confirmation) {
    const dialog=ensurePasswordRecoveryUi(),message=dialog.querySelector('#accelerator-password-recovery-message'),submit=dialog.querySelector('.accelerator-cloud-auth-submit');
    if (password.length < 8) { message.textContent='Use at least 8 characters.'; message.dataset.type='error'; return false; }
    if (password !== confirmation) { message.textContent='Those passwords do not match.'; message.dataset.type='error'; return false; }
    if (!accessToken) { message.textContent='This recovery link is no longer valid. Request another password reset.'; message.dataset.type='error'; return false; }
    submit.disabled=true; message.textContent='Saving new password…'; delete message.dataset.type;
    try {
      const response=await fetch(SUPABASE_URL+'/auth/v1/user',{method:'PUT',headers:{apikey:API_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({password})});
      if(!response.ok) throw new Error('password update failed');
      try { localStorage.setItem(AUTH_KEY,JSON.stringify({access_token:accessToken,refresh_token:refreshToken})); history.replaceState({},document.title,window.location.pathname); } catch (_) {}
      cloudAuthRequired=false;
      const candidateState=appState(),recoveryCandidate=candidateState?{value:clone(candidateState),key:'password-recovery'}:readFallbackState();
      const connected=await connectCloud({restoreState:true,recoveryCandidate,forceRecoveryCandidate:true});
      if(!connected) throw new Error('cloud connection failed');
      message.textContent='Password updated. Loading your cloud workspace…'; setTimeout(()=>{try{dialog.close()}catch(_){dialog.removeAttribute('open')}hideStartupShield();},350); return true;
    } catch (_) { message.textContent='Could not finish recovery. Request another reset link and try again.'; message.dataset.type='error'; return false; }
    finally { submit.disabled=false; }
  }

  function ensureSyncConflictUi() {
    let dialog = document.getElementById('accelerator-sync-conflict-dialog');
    if (dialog) return dialog;
    ensureCloudAuthUi();
    dialog = document.createElement('dialog');
    dialog.id = 'accelerator-sync-conflict-dialog';
    dialog.className = 'accelerator-sync-conflict';
    dialog.setAttribute('aria-labelledby', 'accelerator-sync-conflict-title');
    dialog.innerHTML = [
      '<section class="accelerator-sync-conflict-card">',
      '<p class="accelerator-cloud-auth-kicker">Cloud data protected</p>',
      '<h2 id="accelerator-sync-conflict-title">This browser and cloud both changed</h2>',
      '<p class="accelerator-sync-conflict-copy">Your local edits were not uploaded. Cloud saving is paused so a browser copy cannot silently replace newer work from another device.</p>',
      '<p class="accelerator-sync-conflict-detail" data-conflict-detail></p>',
      '<div class="accelerator-sync-conflict-actions">',
      '<button class="accelerator-conflict-cloud" type="button">Use latest cloud</button>',
      '<button class="accelerator-conflict-review" type="button">Review local changes</button>',
      '<button class="accelerator-conflict-download" type="button">Download local copy</button>',
      '</div>',
      '<p class="accelerator-sync-conflict-message" role="status" aria-live="polite"></p>',
      '</section>'
    ].join('');
    dialog.querySelector('.accelerator-conflict-cloud').addEventListener('click', () => { void resolveConflictWithCloud(); });
    dialog.querySelector('.accelerator-conflict-review').addEventListener('click', () => {
      closeSyncConflictDialog();
      hideStartupShield();
      setSaveLabel('Cloud paused - local changes need review');
    });
    dialog.querySelector('.accelerator-conflict-download').addEventListener('click', downloadPendingCopy);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeSyncConflictDialog();
      hideStartupShield();
      setSaveLabel('Cloud paused - local changes need review');
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openSyncConflictDialog() {
    if (!syncConflict) return;
    const dialog = ensureSyncConflictUi();
    const base = Number.isInteger(pendingBaseVersion) ? String(pendingBaseVersion) : 'unknown';
    const cloud = Number.isInteger(conflictCloudVersion) ? String(conflictCloudVersion) : 'newer';
    dialog.querySelector('[data-conflict-detail]').textContent = 'Local draft started from cloud version ' + base + '. Current cloud version is ' + cloud + '.';
    dialog.querySelector('.accelerator-sync-conflict-message').textContent = '';
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  function closeSyncConflictDialog() {
    const dialog = document.getElementById('accelerator-sync-conflict-dialog');
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function markCloudAuthRequired({ clearStored = false, open = false } = {}) {
    const fallback = readFallbackState();
    localWorkspaceAvailable = !!fallback;
    cloudAuthRequired = true;
    cloudStateLoaded = false;
    workspaceId = null;
    accessToken = null;
    refreshToken = null;
    saveBlocked = true;
    clearTimeout(retryTimer);
    if (clearStored) {
      try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
    }
    setSaveLabel(demoMode ? 'Demo mode - not synced' : 'Cloud sign-in required - local backup safe');
    if (open && !authDialogAutoOpened) {
      authDialogAutoOpened = true;
      setCloudAuthLocalOption(localWorkspaceAvailable);
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
      const recoveryCandidate = !demoMode && localWorkspaceAvailable && candidateState
        ? { value: clone(candidateState), key: 'cloud-auth-reconnect' }
        : (!demoMode ? readFallbackState() : null);
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (_) {}
      accessToken = session.access_token;
      refreshToken = session.refresh_token;
      cloudAuthRequired = false;
      if (demoMode) clearDemoArtifacts();
      demoMode = false;
      saveBlocked = false;
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

      clearPendingDraft();
      syncConflict = false;
      authDialogAutoOpened = false;
      hideStartupShield();

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

  function downloadSerializedCopy(raw, filename) {
    try {
      if (!raw) return;
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (_) {}
  }

  function downloadRecoveryCopy() {
    let raw = '';
    try { raw = localStorage.getItem(RECOVERY_KEY) || ''; } catch (_) {}
    downloadSerializedCopy(raw, 'accelerator-recovery-copy-' + new Date().toISOString().slice(0, 10) + '.json');
  }

  function downloadPendingCopy() {
    let raw = pendingSerialized;
    try { raw = localStorage.getItem(PENDING_KEY) || raw || localStorage.getItem(RECOVERY_KEY) || ''; } catch (_) {}
    downloadSerializedCopy(raw, 'accelerator-local-draft-' + new Date().toISOString().slice(0, 10) + '.json');
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
      try { window.dispatchEvent(new CustomEvent('accelerator:state-replaced', { detail: { source: sourceName } })); } catch (_) {}
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

  function readLocalMeta() {
    try {
      const raw = localStorage.getItem(LOCAL_META_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function readPendingDraft() {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const metaRaw = localStorage.getItem(PENDING_META_KEY);
      const meta = metaRaw ? JSON.parse(metaRaw) : {};
      const value = normalizeWithApp(JSON.parse(raw));
      const base = Number(meta && meta.baseVersion);
      return {
        value,
        serialized: JSON.stringify(value),
        key: PENDING_KEY,
        baseVersion: Number.isInteger(base) && base >= 0 ? base : null,
        savedAt: Number(meta && meta.savedAt || 0)
      };
    } catch (_) { return null; }
  }

  function clearPendingDraft() {
    pendingSerialized = '';
    pendingBaseVersion = null;
    try {
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(PENDING_META_KEY);
    } catch (_) {}
  }

  function derivePendingBaseVersion() {
    if (Number.isInteger(pendingBaseVersion) && pendingBaseVersion >= 0) return pendingBaseVersion;
    if (cloudStateLoaded && Number.isInteger(remoteVersion) && remoteVersion >= 0) return remoteVersion;
    const meta = readLocalMeta();
    const stored = Number(meta.cloudVersion);
    return Number.isInteger(stored) && stored >= 0 ? stored : null;
  }

  function persistPendingDraft(serialized) {
    try {
      localStorage.setItem(PENDING_KEY, serialized);
      localStorage.setItem(PENDING_META_KEY, JSON.stringify({
        savedAt: Date.now(),
        baseVersion: Number.isInteger(pendingBaseVersion) ? pendingBaseVersion : null,
        source: 'offline-or-unconfirmed-edit'
      }));
    } catch (_) {}
  }

  function readFallbackState() {
    const candidates = [LOCAL_KEY, LOCAL_PREVIOUS_KEY, ...NATIVE_KEYS];
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

  function markSyncConflict(candidate, cloudState, cloudVersion) {
    if (!candidate || !candidate.value) return false;
    const normalizedLocal = normalizeWithApp(candidate.value);
    pendingSerialized = candidate.serialized || JSON.stringify(normalizedLocal);
    pendingBaseVersion = Number.isInteger(candidate.baseVersion) ? candidate.baseVersion : null;
    persistPendingDraft(pendingSerialized);
    latestCloudState = clone(cloudState || {});
    conflictCloudVersion = Number.isInteger(cloudVersion) ? cloudVersion : remoteVersion;
    preserveRecoveryCandidate({ value: normalizedLocal, key: candidate.key || PENDING_KEY }, cloudState, true);
    replaceState(normalizedLocal, 'conflict-local-review');
    syncConflict = true;
    saveBlocked = true;
    setSaveLabel('Cloud paused - local changes need review');
    setTimeout(openSyncConflictDialog, 0);
    return true;
  }

  function reconcilePendingWithCloud(candidate, cloudState, cloudVersion, restoreState = true) {
    if (!candidate || !candidate.value) return 'none';
    const normalizedLocal = normalizeWithApp(candidate.value);
    const localSerialized = candidate.serialized || JSON.stringify(normalizedLocal);
    const cloudSerialized = JSON.stringify(cloudState || {});
    const baseVersion = Number.isInteger(candidate.baseVersion) ? candidate.baseVersion : null;

    if (localSerialized === cloudSerialized) {
      clearPendingDraft();
      return 'already-synced';
    }

    if (baseVersion !== null && baseVersion === cloudVersion) {
      pendingSerialized = localSerialized;
      pendingBaseVersion = baseVersion;
      persistPendingDraft(pendingSerialized);
      if (restoreState) replaceState(normalizedLocal, 'offline-draft-resume');
      syncConflict = false;
      saveBlocked = false;
      return 'resume';
    }

    markSyncConflict({
      value: normalizedLocal,
      serialized: localSerialized,
      key: candidate.key || PENDING_KEY,
      baseVersion
    }, cloudState, cloudVersion);
    return 'conflict';
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

  async function saveRemote(serialized, expectedVersion = pendingBaseVersion) {
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
      p_expected_version: Number.isInteger(expectedVersion) ? expectedVersion : remoteVersion,
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
      markSyncConflict({
        value: parsed,
        serialized,
        key: PENDING_KEY,
        baseVersion: Number.isInteger(expectedVersion) ? expectedVersion : null
      }, latestCloudState || {}, remoteVersion);
      return { ok: false, conflict: true };
    }

    remoteVersion = Number(row.version || remoteVersion + 1);
    remoteShape = shapeOf(parsed);
    return { ok: true };
  }

  async function connectCloud({
    restoreState = true,
    recoveryCandidate = null,
    forceRecoveryCandidate = false,
    pendingCandidate = null,
    reconcilePending = false
  } = {}) {
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
    cloudStateLoaded = true;
    latestCloudState = clone(normalizedCloud);
    lastCloudSerialized = JSON.stringify(normalizedCloud);
    remoteShape = shapeOf(normalizedCloud);
    preserveRecoveryCandidate(recoveryCandidate, normalizedCloud, forceRecoveryCandidate);
    let pendingOutcome = 'none';
    if (reconcilePending && pendingCandidate) {
      pendingOutcome = reconcilePendingWithCloud(pendingCandidate, normalizedCloud, remoteVersion, restoreState);
    }
    if (pendingOutcome === 'none' || pendingOutcome === 'already-synced') {
      if (normalizedCloud && Object.keys(normalizedCloud).length) {
        if (restoreState && !replaceState(normalizedCloud, 'cloud')) return false;
      }
    }
    cloudAuthRequired = false;
    if (pendingOutcome !== 'conflict') {
      syncConflict = false;
      saveBlocked = false;
      setSaveLabel(pendingOutcome === 'resume' ? 'Offline changes ready to sync' : 'Cloud connected');
    }
    return true;
  }

  function persistLocalSnapshot(serialized, sourceName = 'app') {
    try {
      const now = Date.now();
      const previous = localStorage.getItem(LOCAL_KEY);
      const previousMeta = readLocalMeta();
      if (previous && previous !== serialized && now - lastLocalRotationAt >= 30000) {
        localStorage.setItem(LOCAL_PREVIOUS_KEY, previous);
        localStorage.setItem(LOCAL_PREVIOUS_META_KEY, localStorage.getItem(LOCAL_META_KEY) || JSON.stringify({ savedAt: now, source: 'rotation' }));
        lastLocalRotationAt = now;
      }
      const cloudVersion = Number.isInteger(pendingBaseVersion)
        ? pendingBaseVersion
        : (cloudStateLoaded && Number.isInteger(remoteVersion)
          ? remoteVersion
          : (Number.isInteger(Number(previousMeta.cloudVersion)) ? Number(previousMeta.cloudVersion) : null));
      localStorage.setItem(LOCAL_KEY, serialized);
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify({
        savedAt: now,
        source: sourceName,
        cloudVersion,
        syncState: cloudStateLoaded && serialized === lastCloudSerialized ? 'synced' : 'local'
      }));
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
    if (demoMode || syncConflict) return;
    if (!workspaceId || !cloudStateLoaded) {
      void retryCloudLoad({ background: true });
      return;
    }
    if (pendingSerialized === lastCloudSerialized) {
      const synced = pendingSerialized;
      clearPendingDraft();
      persistLocalSnapshot(synced, 'cloud-confirmed');
      setSaveLabel('Saved just now');
      return;
    }

    const target = pendingSerialized;
    const targetBaseVersion = pendingBaseVersion;
    saveInFlight = true;
    setSaveLabel('Saving…');
    const result = await saveRemote(target, targetBaseVersion);
    saveInFlight = false;

    if (result.ok) {
      lastCloudSerialized = target;
      lastCloudSavedAt = Date.now();
      retryCount = 0;
      clearTimeout(retryTimer);
      if (pendingSerialized === target) {
        clearPendingDraft();
        persistLocalSnapshot(target, 'cloud-confirmed');
      } else {
        pendingBaseVersion = remoteVersion;
        persistPendingDraft(pendingSerialized);
        persistLocalSnapshot(pendingSerialized, 'queued-after-cloud-confirmation');
      }
      setSaveLabel('Saved just now');
      try { window.dispatchEvent(new CustomEvent('accelerator:cloud-saved', { detail: { version: remoteVersion } })); } catch (_) {}
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
    if (demoMode) {
      lastObservedSerialized = serialized;
      setSaveLabel('Demo mode - not synced');
      return;
    }
    persistLocalSnapshot(serialized, 'app');
    lastObservedSerialized = serialized;
    if (!pendingSerialized) pendingBaseVersion = derivePendingBaseVersion();
    pendingSerialized = serialized;
    persistPendingDraft(serialized);
    if (syncConflict) {
      saveBlocked = true;
      setSaveLabel('Cloud paused - local changes need review');
      return;
    }
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

  function currentPendingCandidate() {
    const stored = readPendingDraft();
    if (stored) return stored;
    if (!pendingSerialized) return null;
    try {
      return {
        value: normalizeWithApp(JSON.parse(pendingSerialized)),
        serialized: pendingSerialized,
        key: PENDING_KEY,
        baseVersion: Number.isInteger(pendingBaseVersion) ? pendingBaseVersion : null
      };
    } catch (_) { return null; }
  }

  async function retryCloudLoad({ background = false } = {}) {
    if (reconnectInFlight || demoMode) return false;
    if (syncConflict) {
      openSyncConflictDialog();
      return false;
    }
    reconnectInFlight = true;
    if (!background) showStartupShield();
    try {
      const pendingCandidate = currentPendingCandidate();
      const fallback = readFallbackState();
      localWorkspaceAvailable = !!fallback;
      const connected = await connectCloud({
        restoreState: true,
        recoveryCandidate: pendingCandidate ? null : fallback,
        pendingCandidate,
        reconcilePending: !!pendingCandidate
      });

      if (connected) {
        const current = appState();
        if (current) {
          lastObservedSerialized = JSON.stringify(current);
          if (!pendingSerialized) {
            lastCloudSerialized = lastObservedSerialized;
            persistLocalSnapshot(lastObservedSerialized, 'cloud');
          } else {
            persistLocalSnapshot(lastObservedSerialized, 'offline-draft-resume');
          }
        }
        if (syncConflict) {
          openSyncConflictDialog();
          return false;
        }
        hideStartupShield();
        if (pendingSerialized && ready) queueMicrotask(() => { void drainSaveQueue(); });
        return true;
      }

      if (cloudAuthRequired) {
        setCloudAuthLocalOption(localWorkspaceAvailable);
        showStartupShield(
          'Connect to your cloud workspace',
          localWorkspaceAvailable
            ? 'A protected browser copy is available, but cloud must load before it can become shared data.'
            : 'Sign in to load your real workspace. Built-in examples stay isolated in Demo Mode.',
          false
        );
        openCloudAuthDialog({ automatic: true });
        return false;
      }

      if (fallback) {
        replaceState(fallback.value, 'offline-fallback');
        hideStartupShield();
        setSaveLabel(navigator.onLine === false ? 'Offline - local backup safe' : 'Cloud unavailable - local backup safe');
        return false;
      }

      showStartupShield(
        'Cloud workspace could not load',
        'Nothing has been uploaded. Retry the cloud connection, or open the isolated demo without affecting your account.',
        true
      );
      setSaveLabel('Cloud unavailable - no workspace loaded');
      return false;
    } catch (_) {
      showStartupShield(
        'Cloud workspace could not load',
        'Nothing has been uploaded. Retry the cloud connection, or open the isolated demo without affecting your account.',
        true
      );
      setSaveLabel('Cloud unavailable - no workspace loaded');
      return false;
    } finally {
      reconnectInFlight = false;
    }
  }

  async function resolveConflictWithCloud() {
    const dialog = ensureSyncConflictUi();
    const button = dialog.querySelector('.accelerator-conflict-cloud');
    const message = dialog.querySelector('.accelerator-sync-conflict-message');
    const candidate = currentPendingCandidate() || (appState() ? { value: clone(appState()), key: 'conflict-local-state' } : null);
    button.disabled = true;
    message.textContent = 'Loading the latest cloud workspace…';
    try {
      const connected = await connectCloud({
        restoreState: true,
        recoveryCandidate: candidate,
        forceRecoveryCandidate: true,
        reconcilePending: false
      });
      if (!connected) {
        message.textContent = 'Cloud is still unavailable. Your local copy remains protected.';
        return false;
      }
      clearPendingDraft();
      syncConflict = false;
      conflictCloudVersion = null;
      saveBlocked = false;
      const current = appState();
      if (current) {
        lastObservedSerialized = JSON.stringify(current);
        lastCloudSerialized = lastObservedSerialized;
        persistLocalSnapshot(lastObservedSerialized, 'cloud-conflict-resolution');
      }
      closeSyncConflictDialog();
      hideStartupShield();
      setSaveLabel('Cloud connected');
      return true;
    } catch (_) {
      message.textContent = 'Cloud is still unavailable. Your local copy remains protected.';
      return false;
    } finally {
      button.disabled = false;
    }
  }

  async function boot() {
    showStartupShield();
    for (let i = 0; i < 100 && !appState(); i++) await new Promise(r => setTimeout(r, 40));
    if (!appState()) return;

    normalizeCurrentState();
    installRenderGuard();
    installSaveLabelGuard();
    window.__acceleratorApplySaveLabel = applySaveLabel;
    window.__acceleratorCaptureStateChange = captureStateChange;
    installSaveHook();
    rerender();

    let resumeDemo = false;
    try { resumeDemo = localStorage.getItem(DEMO_MARKER_KEY) === 'true'; } catch (_) {}
    readStoredSession();
    const recoverySession = recoverySessionFromUrl();
    if (recoverySession) {
      accessToken = recoverySession.access_token;
      refreshToken = recoverySession.refresh_token;
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(recoverySession)); } catch (_) {}
      cloudAuthRequired = false;
      const dialog = ensurePasswordRecoveryUi();
      if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    } else if (resumeDemo && !accessToken && !refreshToken) {
      localWorkspaceAvailable = false;
      enterDemoMode();
    } else {
      if (resumeDemo) clearDemoArtifacts();
      await retryCloudLoad({ background: false });
    }

    normalizeCurrentState();
    rerender();

    const current = appState();
    if (current) {
      try {
        lastObservedSerialized = JSON.stringify(current);
        if (!demoMode && !pendingSerialized && (cloudStateLoaded || localWorkspaceAvailable)) {
          if (cloudStateLoaded) lastCloudSerialized = lastObservedSerialized;
          persistLocalSnapshot(lastObservedSerialized, cloudStateLoaded ? 'cloud' : 'offline-fallback');
        }
      } catch (_) {}
    }

    // Deployment/startup code is never allowed to immediately write cloud state.
    // Only a state change after boot can arm a save.
    armedAt = Date.now();
    observerArmedAt = Date.now() + 1500;
    ready = true;
    observeState();
    if (pendingSerialized && cloudStateLoaded && !syncConflict && !cloudAuthRequired) {
      queueMicrotask(() => { void drainSaveQueue(); });
    }
    applySaveLabel();
  }

  window.addEventListener('online', async () => {
    if (demoMode) {
      setSaveLabel('Demo mode - not synced');
      return;
    }
    if (cloudAuthRequired) {
      setSaveLabel('Cloud sign-in required - local backup safe');
      return;
    }
    if (syncConflict) {
      setSaveLabel('Cloud paused - local changes need review');
      openSyncConflictDialog();
      return;
    }
    await retryCloudLoad({ background: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (demoMode) return;
    const current = appState();
    if (!current) return;
    try {
      const serialized = JSON.stringify(current);
      persistLocalSnapshot(serialized, 'visibility-hidden');
      if (serialized !== lastCloudSerialized) {
        if (!pendingSerialized) pendingBaseVersion = derivePendingBaseVersion();
        pendingSerialized = serialized;
        persistPendingDraft(serialized);
        clearTimeout(saveTimer);
        if (!cloudAuthRequired && !syncConflict) void drainSaveQueue();
      }
    } catch (_) {}
  });

  window.addEventListener('pagehide', () => {
    if (demoMode) return;
    const current = appState();
    if (!current) return;
    try {
      const serialized = JSON.stringify(current);
      persistLocalSnapshot(serialized, 'pagehide');
      if (serialized !== lastCloudSerialized) {
        if (!pendingSerialized) pendingBaseVersion = derivePendingBaseVersion();
        pendingSerialized = serialized;
        persistPendingDraft(serialized);
        if (!cloudAuthRequired && !syncConflict) void drainSaveQueue();
      }
    } catch (_) {}
  });

  window.__acceleratorSaveDiagnostics = () => ({
    workspaceId,
    remoteVersion,
    pendingBaseVersion,
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
    cloudStateLoaded,
    syncConflict,
    demoMode,
    cloudGate: document.body.dataset.acceleratorCloudGate === 'true',
    pendingDraft: !!localStorage.getItem(PENDING_KEY),
    retryCount
  });

  window.__acceleratorOpenCloudSignIn = openCloudAuthDialog;

  boot();
})();
</script>`;


const PACKAGING_BRIDGE = String.raw`
<script id="accelerator-v1637-packaging-bridge">
(() => {
  if (window.__acceleratorPackagingLab) return;
  window.__acceleratorPackagingLab = true;
  document.title = 'Accelerator OS V16.3.7 - Cloud-First Packaging Lab';
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const binding = name => { try { return (0,eval)('typeof '+name+'!=="undefined" ? '+name+' : undefined'); } catch (_) { return undefined; } };
  const current = () => { const f=binding('creator'); return typeof f==='function' ? f() : null; };
  const appSave = () => { const f=binding('save'); if(typeof f==='function') f('Saved'); };
  const say = text => { const f=binding('toast'); if(typeof f==='function') f(text); };
  const drawer = (title,body,actions) => { const f=binding('openDrawer'); if(typeof f==='function') f(title,body,actions); };
  const id = () => 'pkg_'+Math.random().toString(36).slice(2,10);
  const now = () => new Date().toISOString().slice(0,10);
  const val = name => String(document.getElementById(name)?.value || '').trim();
  const checked = name => !!document.getElementById(name)?.checked;
  const ANGLES=[['Desired Result','I want that.','Desire, proof'],['Problem','That is happening to me.','Recognition, risk'],['Mistake','Am I doing this wrong?','Loss, correction'],['Risk / Consequence','I do not want that to happen.','Risk, stakes'],['Hidden Cause','Wait, that is why?','Curiosity, risk'],['Proof / Evidence','Did this really work?','Proof, trust'],['Transformation','How did that become this?','Desire, proof'],['Comparison / Decision','Which one should I choose?','Decision tension'],['Belief Shift','What I thought might be wrong.','Novelty, identity'],['Story / Conflict','What happened?','Conflict, curiosity'],['Challenge / Journey','Can they actually do this?','Stakes, story'],['Identity / Relevance','This is specifically for someone like me.','Recognition'],['Single Moment','What happened in this particular moment?','Curiosity, stakes'],['Novelty / Surprise','I have not seen this before.','Novelty']];
  const TITLES=[['Hidden Cause','The Real Reason [PROBLEM] Keeps Happening','Use when the viewer knows the pain but not the mechanism.'],['Wrong Fix','You Are Fixing the Wrong Part of [THING]','Pairs well with proof or attention-circle visuals.'],['Mistake','The [MISTAKE] That Is Costing You [RESULT]','Use when one behavior creates a meaningful consequence.'],['Desired Result','How to [RESULT] Without [PAIN]','Use when the payoff is specific and visible.'],['Risk','Do Not [ACTION] Until You Know This','Use sparingly when the consequence is real and accurate.'],['Proof','I Tested [NUMBER] [THINGS]. Here Is What Worked','Use when the evidence is the hook.'],['Decision','X vs Y: Which Is Better for [VIEWER]?','Use when the viewer is actively choosing.'],['Belief Shift','Why [COMMON ADVICE] Does Not Work','Use when the video responsibly challenges an existing belief.'],['Single Moment','The Moment [THING] Finally Changed','Use when one scene represents the whole reason to watch.']];
  const FORMATS=[['Problem / Risk','Problem State','Something is visibly wrong here.','Problem, Mistake, Risk'],['Problem / Risk','Do Not Do This','A behavior is dangerous or counterproductive.','Mistake, Risk'],['Problem / Risk','Common Enemy','There is one opposing force to notice.','Risk, Belief Shift'],['Change / Progress','Before & After','The payoff is visible.','Desired Result, Transformation'],['Change / Progress','2-Panel Progress','A clean state change happened.','Transformation'],['Change / Progress','Mid Progression','The viewer sees the middle of change.','Challenge, Story'],['Comparison / Choice','Options','The viewer must choose between paths.','Decision'],['Comparison / Choice','VS','Two choices compete.','Decision, Comparison'],['Comparison / Choice','Ranking','The order itself is the curiosity.','Proof, Decision'],['Curiosity / Focus','Attention Circle','One detail matters.','Hidden Cause, Diagnosis'],['Curiosity / Focus','X-Ray','Show the hidden mechanism.','Hidden Cause, Proof'],['Curiosity / Focus','Extreme Close-Up','Make one visual clue impossible to miss.','Hidden Cause'],['Action / Conflict','A Affects B','One thing visibly causes another.','Hidden Cause, Belief Shift'],['Action / Conflict','Mid Action','Freeze the decisive moment.','Single Moment, Story'],['Action / Conflict','Impact Frame','Show the exact moment of consequence.','Single Moment, Risk'],['Proof','Large Number','The number is the evidence.','Proof, Result'],['Proof','Comment / Post','The source quote is the proof object.','Proof, Story'],['Person / Emotion','Reaction','The emotion carries the promise.','Story, Identity'],['Person / Emotion','Split Head','Show internal conflict or contrast.','Belief Shift'],['Scene / Experience','POV','Put the viewer inside the moment.','Identity, Experience'],['Scene / Experience','Raw Picture','Realness is the reason to click.','Story, Proof']];
  const SOURCES=['Own channel','Same niche','Adjacent niche','Outside YouTube','Client call','Studio analytics','No reference yet'];
  const VISUALS=[
    {family:'Problem / Consequence',name:'Problem State',serves:'Problem, Mistake, Risk',title:'Why It Still Hurts',thumb:'BAD POSITION',note:'Show the visible symptom. Title explains why it matters.',mock:'problem'},
    {family:'Transformation / Progress',name:'Before & After',serves:'Desired Result, Transformation',title:'Fix It In 10 Minutes',thumb:'BEFORE  →  AFTER',note:'Make the change obvious before they read anything.',mock:'before'},
    {family:'Curiosity / Focus',name:'Attention Circle',serves:'Hidden Cause, Diagnosis',title:'This Tiny Detail Changes Everything',thumb:'LOOK HERE',note:'One circled clue creates the open loop.',mock:'circle'},
    {family:'Curiosity / Mechanism',name:'X-Ray / Hidden Mechanism',serves:'Hidden Cause, Proof',title:'The Real Reason It Fails',thumb:'HIDDEN CAUSE',note:'Reveal the invisible mechanism behind the problem.',mock:'xray'},
    {family:'Comparison / Choice',name:'VS / Options',serves:'Decision, Comparison',title:'Which One Works Better?',thumb:'A  VS  B',note:'Give the viewer a decision they already care about.',mock:'vs'},
    {family:'Proof / Evidence',name:'Large Number / Proof Object',serves:'Proof, Result',title:'I Tested 47 Examples',thumb:'47 TESTS',note:'The number or proof object is the reason to believe.',mock:'number'},
    {family:'Person / Emotion',name:'Reaction / Identity',serves:'Story, Identity',title:'I Was Wrong About This',thumb:'WAIT…',note:'Use a face or posture to sell the emotional moment.',mock:'reaction'},
    {family:'Action / Cause & Effect',name:'A Affects B',serves:'Hidden Cause, Belief Shift',title:'This Is Killing Your Results',thumb:'A → B',note:'Show one thing visibly causing another.',mock:'cause'},
    {family:'Scene / Experience',name:'POV / Raw Picture',serves:'Identity, Experience, Story',title:'What It Actually Feels Like',thumb:'POV',note:'Let the viewer feel like they are inside the moment.',mock:'pov'},
    {family:'Journey / Challenge',name:'Mid-Progression',serves:'Challenge, Story',title:'Can We Finish This?',thumb:'DAY 14 / 30',note:'Show the story in progress, before the outcome is known.',mock:'progress'}
  ];
  function store(c){ if(!c)return null; c.packagingLab=c.packagingLab&&typeof c.packagingLab==='object'?c.packagingLab:{}; if(!Array.isArray(c.packagingLab.tests))c.packagingLab.tests=[]; return c.packagingLab; }
  function tests(){ return store(current())?.tests || []; }
  const button=(a,label,kind='')=>'<button class="btn '+kind+'" data-pkg="'+a+'">'+E(label)+'</button>';
  const opt=(items,v)=>items.map(z=>'<option '+(z===v?'selected':'')+'>'+E(z)+'</option>').join('');
  const q=(name,label,v,ph='')=>'<label class="pkg-field"><span>'+E(label)+'</span><input id="'+name+'" value="'+E(v||'')+'" placeholder="'+E(ph)+'"></label>';
  const ta=(name,label,v,ph='')=>'<label class="pkg-field"><span>'+E(label)+'</span><textarea id="'+name+'" placeholder="'+E(ph)+'">'+E(v||'')+'</textarea></label>';
  const sel=(name,label,v,items)=>'<label class="pkg-field"><span>'+E(label)+'</span><select id="'+name+'">'+opt(items,v)+'</select></label>';
  const ck=(name,label,on)=>'<label class="pkg-check"><input id="'+name+'" type="checkbox" '+(on?'checked':'')+'> <span>'+E(label)+'</span></label>';
  function brief(x){const p=x.primary||{};return ['Purpose: '+(x.thumbnailMessage||x.promise||'Clarify the reason to click.'),'Angle: '+(x.angle||x.argument||'Not chosen'),'Title: '+(p.title||''),'Thumbnail message: '+(p.message||x.thumbnailMessage||''),'Visual format: '+(p.format||x.visualFormat||''),'Primary subject / focal point: '+(x.assetPlan||''),'Opening must confirm: '+(x.openingPromise||''),'Avoid: '+(x.avoid||'Do not repeat the title in the thumbnail or imply the wrong cause.')].join('\n');}
  function lab(){ const c=current(); if(!c)return; const xs=tests(),live=xs.filter(x=>!x.outcome).length,done=xs.filter(x=>x.outcome).length;
    const rows=xs.length?xs.slice().reverse().map(x=>'<div class="pkg-row"><div><b>'+E(x.topic||'Untitled package')+'</b><span>'+E((x.angle||x.argument||'Angle not chosen')+' · '+(x.surface||'Mixed')+' · '+(x.testDecision||x.intent||'No test decision'))+'</span><small>'+E(x.hypothesis||'No hypothesis yet.')+'</small></div><div><em>'+E(x.outcome?(x.confidence||'Signal'):'Package')+'</em>'+button('edit:'+x.id,'Open')+button('brief:'+x.id,'Brief','ghost')+(x.outcome?'':button('outcome:'+x.id,'Result','ghost'))+'</div></div>').join(''):'<div class="pkg-empty"><b>No package is open.</b><span>Start with the angle, build one complete package, then decide if a test would teach anything useful.</span></div>';
    drawer('Packaging Lab','<div class="pkg-hero"><div class="kicker">Packaging system</div><h2>Choose the angle, build the package, then decide what is worth learning.</h2><p>The Playbook gives strategies and examples. The Builder turns one video into an executable title/thumbnail/asset plan. Results become creator-specific evidence.</p></div><div class="pkg-stats"><div><span>Open packages</span><b>'+live+'</b></div><div><span>Recorded results</span><b>'+done+'</b></div><div><span>Evidence ladder</span><b>Signal -> Pattern</b></div></div><div class="pkg-flow"><div><b>1. Angle</b><span>What aspect of the video are we selling?</span></div><div><b>2. Package</b><span>Title, thumbnail message, visual format, assets.</span></div><div><b>3. Test</b><span>Only if there is one useful question.</span></div><div><b>4. Learn</b><span>Save signal, boundary, next question.</span></div></div><div class="pkg-start"><b>Working rule</b><p>Do not test because the button exists. Test because the result will answer the next useful question.</p>'+button('new','Build package','dark')+' '+button('playbook','Open Playbook','ghost')+'</div><div class="pkg-section"><div class="kicker">Saved packages</div><h3>What '+E(c.name)+' is learning</h3>'+rows+'</div>',button('dna','Packaging DNA','ghost')+' '+button('playbook','Playbook','ghost')+' '+button('examples','Good / bad pairings','ghost'));
  }
  function editor(key){ const old=key==='new'?null:tests().find(x=>x.id===key);const p=old?.primary||old?.control||{};const x=old||{id:id(),createdAt:now(),audience:'Mixed',surface:'Home / Suggested',angle:'Hidden Cause',driver:'Curiosity + risk',titleFamily:'Hidden Cause',testDecision:'No test - publish strongest package',researchSource:'No reference yet'};window.__pkgEdit=x.id;
    drawer(old?'Edit package':'Build package','<div class="pkg-hero"><div class="kicker">Builder</div><h2>Do not separate title drafts from thumbnail drafts. Build complete packages.</h2><p>Use the Playbook if you need options, then lock one coherent package and asset plan.</p></div><div class="pkg-grid">'+q('pkg-topic','Video / topic',x.topic,'e.g. Senior iron compression')+sel('pkg-audience','Audience state',x.audience,['Core','Casual','New','Mixed'])+sel('pkg-surface','Likely surface',x.surface,['Search','Home / Suggested','Mixed','Known audience'])+sel('pkg-source','Reference source',x.researchSource,SOURCES)+ta('pkg-borrow','What are we borrowing from the reference?',x.borrow,'Visual language, structure, proof object, framing, etc.')+sel('pkg-angle','Angle',x.angle||x.argument,ANGLES.map(a=>a[0]))+q('pkg-driver','Click driver',x.driver,'Curiosity, risk, proof, identity...')+sel('pkg-titlefamily','Title strategy',x.titleFamily,TITLES.map(a=>a[0]))+ta('pkg-promise','Viewer promise',x.promise,'What does the right viewer expect from the click?')+q('pkg-title','Title frame',p.title,'Draft title or direction')+q('pkg-message','Thumbnail message',p.message||x.thumbnailMessage,'What the image communicates')+sel('pkg-format','Visual format',p.format||x.visualFormat,FORMATS.map(a=>a[1]))+ta('pkg-asset','Thumbnail asset plan',x.assetPlan,'What must be photographed, captured, or found before editing?')+ta('pkg-opening','Opening promise handoff',x.openingPromise,'What must the first 5-30 seconds confirm?')+ta('pkg-avoid','Avoid',x.avoid,'What would mislead, repeat the title, or point at the wrong thing?')+sel('pkg-test','Test decision',x.testDecision,['No test - publish strongest package','Whole package / discovery test','Title test','Thumbnail concept test','Execution test','Validation test'])+q('pkg-variable','Major variable being tested',x.majorVariable,'One thing only, if testing')+ta('pkg-hypothesis','Hypothesis / learning question',x.hypothesis,'We think this viewer may respond more strongly to... because...')+'</div><div class="pkg-checks"><div class="kicker">Package check</div>'+ck('pkg-rightviewer','The right viewer understands why to click',x.rightViewer)+ck('pkg-stranger','A stranger understands why this is interesting',x.strangerCheck)+ck('pkg-pair','Title and thumbnail add different information',x.pairCheck)+ck('pkg-accurate','The package is accurate to the video',x.accuracyCheck)+ck('pkg-hook','The opening can immediately keep the promise',x.hookCheck)+'</div><div class="pkg-note"><b>Native test outcome:</b> YouTube picks winners by watch-time share. CTR and retention explain context; they do not replace the native result.</div>',button('lab','Cancel','ghost')+' '+button('save','Save package','dark')+' '+button('playbook','Playbook','ghost'));
  }
  function saveTest(){const c=current(),s=store(c);if(!s)return;const k=window.__pkgEdit||id(),old=s.tests.find(x=>x.id===k);const x={id:k,createdAt:old?.createdAt||now(),updatedAt:now(),topic:val('pkg-topic'),audience:val('pkg-audience'),surface:val('pkg-surface'),researchSource:val('pkg-source'),borrow:val('pkg-borrow'),angle:val('pkg-angle'),driver:val('pkg-driver'),titleFamily:val('pkg-titlefamily'),promise:val('pkg-promise'),primary:{title:val('pkg-title'),message:val('pkg-message'),format:val('pkg-format')},thumbnailMessage:val('pkg-message'),visualFormat:val('pkg-format'),assetPlan:val('pkg-asset'),openingPromise:val('pkg-opening'),avoid:val('pkg-avoid'),testDecision:val('pkg-test'),majorVariable:val('pkg-variable'),hypothesis:val('pkg-hypothesis'),rightViewer:checked('pkg-rightviewer'),strangerCheck:checked('pkg-stranger'),pairCheck:checked('pkg-pair'),accuracyCheck:checked('pkg-accurate'),hookCheck:checked('pkg-hook'),outcome:old?.outcome||null,boundary:old?.boundary||''};if(old)Object.assign(old,x);else s.tests.push(x);appSave();say('Package saved');lab();}
  function outcome(key){const x=tests().find(y=>y.id===key);if(!x)return lab();window.__pkgEdit=key;const o=x.outcome||{};const f=(n,l,v,p='')=>'<label class="pkg-field"><span>'+E(l)+'</span><input id="'+n+'" value="'+E(v||'')+'" placeholder="'+E(p)+'"></label>',a=(n,l,v,p='')=>'<label class="pkg-field"><span>'+E(l)+'</span><textarea id="'+n+'" placeholder="'+E(p)+'">'+E(v||'')+'</textarea></label>';
    drawer('Record result','<div class="pkg-hero"><div class="kicker">Keep the learning honest</div><h2>Save the signal without turning it into a rule too early.</h2><p>The result should say what happened, what it may mean, where it may not apply, and what question is worth testing next.</p></div><div class="pkg-fields"><label class="pkg-field"><span>Native YouTube outcome</span><select id="pkg-winner">'+opt(['Package won','Package lost','No clear winner','Not tested'],o.winner||'Not tested')+'</select></label>'+f('pkg-watch','Watch-time share / native result',o.watchTime,'e.g. Package won 58% watch time')+f('pkg-ctr','CTR context',o.ctr,'Optional directional context')+f('pkg-retention','Retention / quality guardrail',o.retention,'Optional opening or quality context')+a('pkg-observation','Observation',o.observation||o.note,'What happened without over-interpreting it?')+a('pkg-interpret','Interpretation',o.interpretation,'What might this mean for this creator?')+f('pkg-next','Next useful question',o.nextQuestion,'What should this result make us try next?')+sel('pkg-confidence','Evidence level',o.confidence||'Signal',['Signal','Emerging pattern','Pattern','Working principle'])+a('pkg-boundary','Boundary / when not to use it',x.boundary,'Where might this lesson be less reliable?')+'</div>',button('lab','Cancel','ghost')+' '+button('save-outcome','Save result','dark'));
  }
  function saveOutcome(){const x=tests().find(y=>y.id===window.__pkgEdit);if(!x)return lab();x.outcome={winner:val('pkg-winner'),watchTime:val('pkg-watch'),ctr:val('pkg-ctr'),retention:val('pkg-retention'),observation:val('pkg-observation'),interpretation:val('pkg-interpret'),nextQuestion:val('pkg-next'),confidence:val('pkg-confidence'),recordedAt:now()};x.confidence=val('pkg-confidence');x.boundary=val('pkg-boundary');x.updatedAt=now();appSave();say('Result saved');dna();}
  function dna(){const xs=tests().filter(x=>x.outcome),g={};xs.forEach(x=>{const k=x.angle||x.argument||'Unspecified angle';(g[k]||(g[k]=[])).push(x)});const rows=Object.entries(g).map(([k,a])=>{const x=a[a.length-1],stage=x.confidence||(a.length>=3?'Pattern':a.length>=2?'Emerging pattern':'Signal');return '<div class="pkg-dna"><b>'+E(k)+'</b><span>'+E(stage)+' · '+a.length+' result'+(a.length===1?'':'s')+'</span><p>'+E(x.outcome.interpretation||x.outcome.observation||'Result recorded; interpretation still needed.')+'</p><small>'+E(x.boundary?'Boundary: '+x.boundary:'Boundary still needs to be defined.')+'</small><small>'+E(x.outcome.nextQuestion?'Next: '+x.outcome.nextQuestion:'Next question not set.')+'</small></div>'}).join('')||'<div class="pkg-empty"><b>No creator evidence yet.</b><span>Record a result to begin replacing generic advice with this creator audience evidence.</span></div>';drawer('Packaging DNA','<div class="pkg-hero"><div class="kicker">Creator learning</div><h2>External playbooks should slowly give way to this creator’s evidence.</h2><p>Signal -> Pattern -> Working principle -> Boundary. One winning upload never becomes law.</p></div><div class="pkg-section">'+rows+'</div>',button('lab','Back','ghost'));}
  function briefView(key){const x=tests().find(y=>y.id===key);if(!x)return lab();const text=brief(x);drawer('Thumbnail brief','<div class="pkg-hero"><div class="kicker">Handoff</div><h2>This is the package someone can execute.</h2><p>Use this for a creator, designer, editor, or your own planning before filming.</p></div><pre class="pkg-brief">'+E(text)+'</pre>',button('edit:'+x.id,'Edit package','ghost')+' '+button('copy-brief:'+x.id,'Copy brief','dark'));}
  function copyBrief(key){const x=tests().find(y=>y.id===key);if(!x)return;const text=brief(x);try{navigator.clipboard.writeText(text);say('Brief copied');}catch(_){drawer('Thumbnail brief','<pre class="pkg-brief">'+E(text)+'</pre>',button('lab','Back','ghost'));}}
  function playbook(){drawer('Packaging Playbook','<div class="pkg-hero"><div class="kicker">Strategy before format</div><h2>Pick the angle first. Then choose the title frame and visual language.</h2><p>Same video, different angle, different package. Format is the visual expression, not the strategy itself.</p></div><div class="pkg-section"><div class="kicker">Angles</div><div class="pkg-cards">'+ANGLES.map(a=>'<div><b>'+E(a[0])+'</b><p>'+E(a[1])+'</p><small>'+E(a[2])+'</small></div>').join('')+'</div></div><div class="pkg-section"><div class="kicker">Title families</div><div class="pkg-cards">'+TITLES.map(a=>'<div><b>'+E(a[0])+'</b><p>'+E(a[1])+'</p><small>'+E(a[2])+'</small></div>').join('')+'</div></div>',button('formats','Visual formats','ghost')+' '+button('examples','Good / bad pairings','ghost')+' '+button('lab','Back','ghost'));}
  function visualCard(v){return '<div class="pkg-visual-card"><div class="pkg-thumb pkg-'+E(v.mock)+'"><span class="shape one"></span><span class="shape two"></span><span class="shape three"></span><b>'+E(v.thumb)+'</b></div><div><small>'+E(v.family)+'</small><h3>'+E(v.name)+'</h3><p>'+E(v.note)+'</p><span>Example title: '+E(v.title)+'</span><span>Serves: '+E(v.serves)+'</span></div></div>';}
  function formats(){drawer('Visual examples','<div class="pkg-hero"><div class="kicker">Visual examples</div><h2>Show the strategy, not just the label.</h2><p>These are quick visual examples you can screen-share with a creator. Use them to explain what the thumbnail is trying to communicate, then replace the mockup with the real asset or saved reference.</p></div><div class="pkg-visuals">'+VISUALS.map(visualCard).join('')+'</div><div class="pkg-section"><div class="kicker">Text reference</div><div class="pkg-formats">'+FORMATS.map(x=>'<div><small>'+E(x[0])+'</small><b>'+E(x[1])+'</b><p>'+E(x[2])+'</p><small>Serves: '+E(x[3])+'</small></div>').join('')+'</div></div><div class="pkg-note"><b>Build order:</b> angle -> title strategy -> thumbnail message -> visual format -> asset plan -> opening promise.</div>',button('playbook','Back to Playbook','ghost'));}
  function examples(){drawer('Same video, different packaging','<div class="pkg-hero"><div class="kicker">Teach relationships, not aesthetics</div><h2>Good packaging makes title and thumbnail complete each other.</h2><p>Bad pairings often repeat the same information in both places. The visual should add a clue, proof object, emotion, or contrast the title does not already say.</p></div><div class="pkg-pair-grid"><div class="pkg-pair"><div class="pkg-thumb pkg-problem"><span class="shape one"></span><span class="shape two"></span><b>UNEXPECTED BILL</b></div><b>Risk package</b><span>Title: 7 Closing Costs First-Time Buyers Do Not Expect</span><small>Thumbnail: unexpected bill / problem state</small></div><div class="pkg-pair"><div class="pkg-thumb pkg-number"><span class="shape one"></span><b>$18,400</b></div><b>Desired-result package</b><span>Title: How Much Money You Actually Need to Close</span><small>Thumbnail: large number / proof object</small></div><div class="pkg-pair"><div class="pkg-thumb pkg-circle"><span class="shape one"></span><span class="shape two"></span><b>LOOK HERE</b></div><b>Hidden-cause package</b><span>Title: Your Down Payment Is Not the Only Cash You Need</span><small>Thumbnail: attention circle on closing statement</small></div><div class="pkg-pair bad"><div class="pkg-thumb pkg-vs"><b>5 DISTANCE MISTAKES</b></div><b>Bad redundant pairing</b><span>Title: 5 Mistakes Killing Your Golf Distance</span><small>Both title and thumbnail say the same thing.</small></div><div class="pkg-pair good"><div class="pkg-thumb pkg-cause"><span class="shape one"></span><span class="shape two"></span><b>TOO FAR?</b></div><b>Better pairing</b><span>Title: 5 Mistakes Killing Your Golf Distance</span><small>Thumbnail shows Jake visibly too far from the ball. Title sets category; image gives a clue.</small></div></div>',button('formats','More visual examples','ghost')+' '+button('playbook','Back to Playbook','ghost'));}
  document.addEventListener('click',e=>{const t=e.target.closest('[data-pkg]');if(!t)return;e.preventDefault();const a=t.dataset.pkg;if(a==='lab')lab();else if(a==='new')editor('new');else if(a.startsWith('edit:'))editor(a.slice(5));else if(a==='save')saveTest();else if(a.startsWith('outcome:'))outcome(a.slice(8));else if(a==='save-outcome')saveOutcome();else if(a==='dna')dna();else if(a==='playbook')playbook();else if(a==='formats')formats();else if(a==='examples')examples();else if(a.startsWith('brief:'))briefView(a.slice(6));else if(a.startsWith('copy-brief:'))copyBrief(a.slice(11));});
  function inject(){const nav=document.querySelector('.v11-primary-nav,.nav');if(nav&&!document.getElementById('accelerator-packaging-lab')){const b=document.createElement('button');b.id='accelerator-packaging-lab';b.type='button';b.dataset.pkg='lab';b.textContent='Packaging';b.title='Build and retain creator-specific packaging learnings';const before=[...nav.querySelectorAll('button')].find(x=>x.dataset.view==='learn');nav.insertBefore(b,before||null);} }
  const st=document.createElement('style');st.id='accelerator-packaging-lab-style';st.textContent='#accelerator-packaging-lab{white-space:nowrap}.pkg-hero{padding:0 0 14px;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent);margin-bottom:14px}.pkg-hero h2{font-size:20px;margin:3px 0 7px}.pkg-hero p{margin:0;line-height:1.5;font-size:12px;opacity:.75}.pkg-stats,.pkg-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.pkg-flow{grid-template-columns:repeat(4,1fr)}.pkg-stats>div,.pkg-flow>div,.pkg-start,.pkg-section,.pkg-checks,.pkg-cards>div,.pkg-formats>div,.pkg-examples>div,.pkg-visual-card,.pkg-pair{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:10px;padding:11px}.pkg-stats span,.pkg-flow span,.pkg-row span,.pkg-row small,.pkg-dna span,.pkg-dna small,.pkg-formats small,.pkg-cards small,.pkg-examples small,.pkg-examples span,.pkg-visual-card small,.pkg-visual-card span,.pkg-pair span,.pkg-pair small{display:block;font-size:10px;opacity:.65}.pkg-stats b{display:block;font-size:14px;margin-top:3px}.pkg-start{margin:12px 0}.pkg-start p,.pkg-dna p,.pkg-formats p,.pkg-cards p,.pkg-visual-card p{font-size:12px;line-height:1.4}.pkg-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:11px 0;border-bottom:1px solid color-mix(in srgb,currentColor 10%,transparent)}.pkg-row>div:first-child{display:grid;gap:3px}.pkg-row b{font-size:13px}.pkg-row>div:last-child{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.pkg-row em{font-size:10px;text-transform:uppercase;font-style:normal;opacity:.6}.pkg-empty{display:grid;gap:4px;padding:12px 0}.pkg-empty span{font-size:12px;opacity:.7}.pkg-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pkg-field{display:grid;gap:4px}.pkg-field span{font-size:11px;font-weight:700;opacity:.7}.pkg-field input,.pkg-field textarea,.pkg-field select{width:100%;box-sizing:border-box;padding:9px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px;background:color-mix(in srgb,currentColor 4%,transparent);color:inherit;font:inherit}.pkg-field textarea{min-height:70px}.pkg-checks{display:grid;gap:7px;margin-top:12px}.pkg-check{display:flex;gap:7px;align-items:flex-start;font-size:12px;line-height:1.35}.pkg-note{margin-top:12px;padding:10px;border-left:3px solid currentColor;background:color-mix(in srgb,currentColor 4%,transparent);font-size:12px;line-height:1.45}.pkg-dna{padding:10px 0;border-bottom:1px solid color-mix(in srgb,currentColor 10%,transparent)}.pkg-dna b{display:block}.pkg-dna p{margin:5px 0}.pkg-formats,.pkg-cards,.pkg-examples,.pkg-visuals,.pkg-pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pkg-formats p,.pkg-cards p{margin:5px 0 8px}.pkg-visual-card{display:grid;grid-template-columns:168px 1fr;gap:12px;align-items:start}.pkg-visual-card h3{margin:2px 0 5px;font-size:14px}.pkg-thumb{height:92px;border-radius:9px;position:relative;overflow:hidden;background:#18232b;color:white;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);display:flex;align-items:flex-end;padding:9px;box-sizing:border-box}.pkg-thumb b{position:relative;z-index:3;font-size:16px;letter-spacing:.03em;text-shadow:0 2px 8px rgba(0,0,0,.35);line-height:1}.pkg-thumb .shape{position:absolute;display:block;border-radius:999px;background:rgba(255,255,255,.22);box-shadow:0 8px 18px rgba(0,0,0,.2)}.pkg-thumb .one{width:55px;height:55px;left:14px;top:18px}.pkg-thumb .two{width:76px;height:40px;right:12px;top:27px;border-radius:12px}.pkg-thumb .three{width:30px;height:30px;right:54px;bottom:12px}.pkg-problem{background:linear-gradient(135deg,#24313b,#7b2d2d)}.pkg-problem .one{background:#f0d7b8}.pkg-problem .two{background:#d84a3a}.pkg-before{background:linear-gradient(90deg,#57312c 0 49%,#203e31 51%)}.pkg-before:after{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,.65)}.pkg-circle{background:linear-gradient(135deg,#202d37,#3b4755)}.pkg-circle .one{background:transparent;border:5px solid #f3c84b;width:52px;height:52px;left:82px;top:18px}.pkg-circle .two{background:#b8c2cc;width:58px;height:24px;left:28px;top:35px;border-radius:5px}.pkg-xray{background:linear-gradient(135deg,#102b3d,#214b5f)}.pkg-xray .one{background:#73d6ff;width:54px;height:70px;left:52px;top:12px;border-radius:20px;opacity:.55}.pkg-vs{background:linear-gradient(90deg,#243f66 0 49%,#63322f 51%)}.pkg-number{background:linear-gradient(135deg,#18232b,#274f3a)}.pkg-number b{font-size:26px}.pkg-reaction{background:linear-gradient(135deg,#35253c,#5a3944)}.pkg-reaction .one{background:#e3b795;width:58px;height:58px;left:20px;top:15px}.pkg-cause{background:linear-gradient(135deg,#233245,#4a2d2d)}.pkg-cause:after{content:"→";position:absolute;left:76px;top:28px;font-size:34px;font-weight:900;color:#ffd057}.pkg-cause .one{background:#d6dce2;width:38px;height:38px;left:28px;top:27px}.pkg-cause .two{background:#e35b4f;width:48px;height:48px;right:28px;top:22px}.pkg-pov{background:linear-gradient(135deg,#283d30,#59683b)}.pkg-pov:before{content:"";position:absolute;left:-20px;right:-20px;bottom:-22px;height:55px;background:rgba(255,255,255,.2);transform:rotate(-4deg)}.pkg-progress{background:linear-gradient(135deg,#25334d,#283f32)}.pkg-progress .one{left:16px;top:42px;width:34px;height:34px;background:#a33}.pkg-progress .two{left:66px;top:28px;width:42px;height:42px;background:#d5a63c}.pkg-progress .three{right:18px;top:13px;width:50px;height:50px;background:#5cae76}.pkg-pair{display:grid;gap:8px}.pkg-pair.bad{border-color:rgba(220,70,60,.45)}.pkg-pair.good{border-color:rgba(70,150,105,.55)}.pkg-brief{white-space:pre-wrap;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:10px;padding:12px;font:12px/1.5 ui-monospace,monospace;background:color-mix(in srgb,currentColor 4%,transparent)}@media(max-width:820px){.pkg-stats,.pkg-flow,.pkg-grid,.pkg-formats,.pkg-cards,.pkg-examples,.pkg-visuals,.pkg-pair-grid{grid-template-columns:1fr}.pkg-visual-card{grid-template-columns:1fr}.pkg-row{grid-template-columns:1fr}.pkg-row>div:last-child{justify-content:flex-start}}';document.head.appendChild(st);inject();new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

function injectPersistence(html) {
  if (html.includes('id="accelerator-v1637-packaging-bridge"')) return html;
  const closingBody = html.lastIndexOf('</body>');
  const bridges = PERSISTENCE_BRIDGE + '\n' + PACKAGING_BRIDGE;
  if (closingBody < 0) return html + bridges;
  return html.slice(0, closingBody) + bridges + '\n' + html.slice(closingBody);
}

module.exports = function handler(_req, res) {
  try {
    const html = injectPersistence(source());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'V16.3.7-cloud-first-packaging-lab');
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
