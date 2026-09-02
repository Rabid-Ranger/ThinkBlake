const crypto = require('crypto');
const zlib = require('zlib');
const buildAiCompanionBridge = require('./ai-companion-bridge');

const EXPECTED_SHA256 = '1c40a1614db82031e3ebc2e23df28e28fbe7889d828edbb489ab4f24eba6d8e1';
const EXPECTED_BYTES = 844146;
const V2_WORKSPACE_ID = 'e9953426-0a8d-4890-9cf0-4f4ac4e71c46';
const AI_COMPANION_BRIDGE = buildAiCompanionBridge(V2_WORKSPACE_ID);
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
  verifiedSource = bytes.toString('utf8')
    // V2 must never read, rotate, or delete the production origin's browser
    // backups. The raw app owns this native key; the persistence bridge below
    // owns the rest of the cloud-first safety keys.
    .replaceAll('accelerator.mainline.v11.cleancore', 'accelerator.ai-v2.mainline.v11.cleancore')
    .replaceAll('accelerator.mainline.v10.reconciled', 'accelerator.ai-v2.mainline.v10.reconciled')
    .replaceAll('accelerator.mainline.v9.protocol', 'accelerator.ai-v2.mainline.v9.protocol')
    .replaceAll('accelerator.mainline.v8.flowclarity', 'accelerator.ai-v2.mainline.v8.flowclarity')
    .replaceAll('accelerator.mainline.v7.usability', 'accelerator.ai-v2.mainline.v7.usability')
    .replaceAll('accelerator.mainline.v6.protocolflow', 'accelerator.ai-v2.mainline.v6.protocolflow');
  return verifiedSource;
}

const PERSISTENCE_BRIDGE = String.raw`
<script id="accelerator-v1636-persistence-bridge">
(() => {
  if (window.__acceleratorPersistenceBridge) return;
  window.__acceleratorPersistenceBridge = true;
  document.title = 'Accelerator AI V2 - Isolated Test Workspace';

  const REF = 'pqggobwpazihraeqvspc';
  const SUPABASE_URL = 'https://' + REF + '.supabase.co';
  const API_KEY = 'sb_publishable_VgGebMpW9tBcCiQlRdnzpA__rbATAaT';
  const AUTH_KEY = 'sb-' + REF + '-auth-token';
  const REQUIRED_WORKSPACE_ID = '${V2_WORKSPACE_ID}';
  // Stable across software builds: deployments must never strand the latest browser backup.
  const LOCAL_KEY = 'accelerator-ai-v2-state-backup';
  const LOCAL_META_KEY = LOCAL_KEY + '-meta';
  const LOCAL_PREVIOUS_KEY = LOCAL_KEY + '-previous';
  const LOCAL_PREVIOUS_META_KEY = LOCAL_PREVIOUS_KEY + '-meta';
  const RECOVERY_KEY = 'accelerator-ai-v2-recovery-copy';
  const RECOVERY_META_KEY = RECOVERY_KEY + '-meta';
  const PENDING_KEY = 'accelerator-ai-v2-unsynced-draft';
  const PENDING_META_KEY = PENDING_KEY + '-meta';
  const DEMO_MARKER_KEY = 'accelerator-ai-v2-demo-mode';
  const NATIVE_KEYS = [
    'accelerator-ai-v2-v1631-state-backup',
    'accelerator.ai-v2.mainline.v11.cleancore',
    'accelerator.ai-v2.mainline.v10.reconciled',
    'accelerator.ai-v2.mainline.v9.protocol',
    'accelerator.ai-v2.mainline.v8.flowclarity',
    'accelerator.ai-v2.mainline.v7.usability',
    'accelerator.ai-v2.mainline.v6.protocolflow'
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
    alternative.textContent = hasLocalWorkspace ? 'Work locally' : 'View demo';
    alternative.dataset.localWorkspace = hasLocalWorkspace ? 'true' : 'false';
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
      'body[data-accelerator-cloud-gate="true"]>*:not(#accelerator-startup-shield):not(#accelerator-cloud-auth-dialog):not(#accelerator-sync-conflict-dialog):not(script):not(style){visibility:hidden!important}',
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
      '.accelerator-cloud-auth-actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:4px}',
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
      '<div class="accelerator-cloud-auth-actions"><button class="accelerator-cloud-auth-submit" type="submit">Connect cloud</button><button class="accelerator-cloud-auth-local" type="button" data-cloud-auth-close>Work locally</button></div>',
      '</form>',
      '<p class="accelerator-cloud-auth-message" id="accelerator-cloud-auth-message" role="status" aria-live="polite"></p>',
      '<p class="accelerator-cloud-auth-safe"><span aria-hidden="true">●</span><span><strong>Your browser copy is safe.</strong> Signing in restores cloud data before the app is allowed to write anything.</span></p>',
      '</section>'
    ].join('');
    document.body.appendChild(dialog);

    dialog.querySelector('[data-cloud-auth-close]').addEventListener('click', handleCloudAuthAlternative);
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

    const workspaces = await rpc('get_my_workspaces', {});
    if (!workspaces.ok || !Array.isArray(workspaces.data) || !workspaces.data.length) return false;

    // Hard isolation boundary: V2 may never fall back to production or create a
    // replacement workspace. A missing test workspace must fail closed.
    const requiredWorkspace = workspaces.data.find(row => row && row.id === REQUIRED_WORKSPACE_ID);
    if (!requiredWorkspace) {
      console.error('Accelerator AI V2 workspace is unavailable. Production fallback is disabled.');
      return false;
    }
    workspaceId = requiredWorkspace.id;
    remoteVersion = Number(requiredWorkspace.version || 0);

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
    // V2 is a test surface. A fresh browser opens directly in read-only demo
    // mode instead of blocking behind the cloud sign-in dialog. Existing
    // authenticated browsers still load the isolated V2 cloud workspace.
    if (!accessToken && !refreshToken) {
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
    appMode: 'accelerator-ai-v2',
    requiredWorkspaceId: REQUIRED_WORKSPACE_ID,
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

const AI_V2_BRIDGE = String.raw`
<script id="accelerator-ai-v2-webmcp-bridge">
(() => {
  if (window.__acceleratorAiV2Bridge) return;
  window.__acceleratorAiV2Bridge = true;

  const REQUIRED_WORKSPACE_ID = '${V2_WORKSPACE_ID}';
  const DRAFT_KEY = 'accelerator-ai-v2-proposal-drafts';
  const SETTINGS_KEY = 'accelerator-ai-v2-ai-settings';
  const ACTIVITY_KEY = 'accelerator-ai-v2-ai-activity';
  const TOOL_NAMES = [
    'accelerator_get_ai_connection_status',
    'accelerator_get_current_context',
    'accelerator_get_current_creator_record',
    'accelerator_get_current_video_record',
    'accelerator_list_staged_proposals',
    'accelerator_stage_proposal'
  ];
  let registered = false;

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

  function saveDiagnostics() {
    try {
      return typeof window.__acceleratorSaveDiagnostics === 'function'
        ? window.__acceleratorSaveDiagnostics()
        : null;
    } catch (_) { return null; }
  }

  function readSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeSettings(next) {
    const value = Object.assign({}, readSettings(), next || {});
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
    renderConnection();
    return value;
  }

  function readActivity() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }

  function recordActivity(toolName, detail) {
    const item = {
      toolName,
      detail: cleanText(detail, 180),
      at: new Date().toISOString()
    };
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(item));
    renderConnection();
    return item;
  }

  function getAiConnectionStatus() {
    const settings = readSettings();
    const webMcpAvailable = typeof document.modelContext?.registerTool === 'function';
    const diagnostics = saveDiagnostics();
    const dataMode = diagnostics && diagnostics.demoMode
      ? 'built-in demo'
      : (diagnostics && diagnostics.cloudStateLoaded ? 'isolated V2 cloud' : 'not loaded');
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      activeConnection: registered ? 'codex-browser-tools' : null,
      preferredProvider: settings.preferredProvider || 'codex-browser-tools',
      connected: registered,
      webMcpAvailable,
      dataMode,
      displayName: registered ? 'Codex browser tools' : 'No AI connected to this page',
      model: {
        display: registered ? 'Selected in Codex' : 'None',
        visibleToDashboard: false,
        explanation: 'Codex does not expose the active model name to the website.'
      },
      account: {
        display: registered ? 'Managed by Codex' : 'None',
        visibleToDashboard: false,
        explanation: 'Your ChatGPT account and plan remain inside Codex and are not shared with this website.'
      },
      access: {
        canReadCurrentV2Context: registered && dataMode !== 'not loaded',
        canReadCurrentCreator: registered,
        canReadCurrentVideo: registered,
        canStageBrowserOnlyDrafts: registered,
        canWriteDashboardOrCloud: false,
        canRunPromptInsideDashboard: false
      },
      alternatives: [
        { id: 'lm-studio', name: 'LM Studio', status: 'companion-required' },
        { id: 'mlx', name: 'MLX', status: 'companion-required' },
        { id: 'custom-openai-compatible', name: 'Custom server', status: 'companion-required' }
      ],
      lastActivity: readActivity()
    };
  }

  function verifiedState() {
    const diagnostics = saveDiagnostics();
    const value = appState();
    if (diagnostics && diagnostics.demoMode && value) {
      return {
        ready: true,
        state: value,
        diagnostics,
        dataSource: 'built-in-demo',
        workspaceId: null
      };
    }
    if (!diagnostics || !diagnostics.cloudStateLoaded) {
      return { ready: false, reason: 'The isolated V2 cloud workspace has not finished loading.' };
    }
    if (diagnostics.workspaceId !== REQUIRED_WORKSPACE_ID) {
      return { ready: false, reason: 'The required V2 workspace is not active. Production fallback is disabled.' };
    }
    if (!value) return { ready: false, reason: 'Dashboard state is unavailable.' };
    return {
      ready: true,
      state: value,
      diagnostics,
      dataSource: 'isolated-cloud',
      workspaceId: REQUIRED_WORKSPACE_ID
    };
  }

  function currentCreator(value) {
    return (value.creators || []).find(item => item.id === value.currentCreatorId) || (value.creators || [])[0] || null;
  }

  function currentVideo(value, creator) {
    return (creator && creator.videos || []).find(item => item.id === value.currentVideoId) || (creator && creator.videos || [])[0] || null;
  }

  function unavailable(result) {
    return {
      ok: false,
      environment: 'accelerator-ai-v2',
      workspaceId: REQUIRED_WORKSPACE_ID,
      reason: result.reason
    };
  }

  function getCurrentContext() {
    const result = verifiedState();
    if (!result.ready) return unavailable(result);
    const value = result.state;
    const creator = currentCreator(value);
    const video = currentVideo(value, creator);
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      workspaceId: result.workspaceId,
      dataSource: result.dataSource,
      view: value.view || 'home',
      creator: creator ? {
        id: creator.id,
        name: creator.name,
        niche: creator.niche || '',
        currentConstraint: creator.currentConstraint || '',
        creatorStage: creator.stage || '',
        videoCount: Array.isArray(creator.videos) ? creator.videos.length : 0
      } : null,
      currentVideo: video ? {
        id: video.id,
        title: video.title || '',
        job: video.job || '',
        stage: video.stage || '',
        role: video.role || ''
      } : null,
      creatorCount: Array.isArray(value.creators) ? value.creators.length : 0,
      cloudVersion: result.dataSource === 'isolated-cloud' ? result.diagnostics.remoteVersion : null,
      instruction: result.dataSource === 'built-in-demo'
        ? 'This is built-in demo data for testing. Stage recommendations for Blake to review and never treat demo content as a real client record.'
        : 'Treat this as private creator data. Analyze it, but stage recommendations for Blake to review instead of changing dashboard state.'
    };
  }

  function getCurrentCreatorRecord() {
    const result = verifiedState();
    if (!result.ready) return unavailable(result);
    const creator = currentCreator(result.state);
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      workspaceId: result.workspaceId,
      dataSource: result.dataSource,
      view: result.state.view || 'home',
      creator: creator ? clone(creator) : null,
      instruction: 'This record is read-only through site tools. Use accelerator_stage_proposal for recommendations.'
    };
  }

  function getCurrentVideoRecord() {
    const result = verifiedState();
    if (!result.ready) return unavailable(result);
    const creator = currentCreator(result.state);
    const video = currentVideo(result.state, creator);
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      workspaceId: result.workspaceId,
      dataSource: result.dataSource,
      creator: creator ? { id: creator.id, name: creator.name } : null,
      video: video ? clone(video) : null,
      instruction: 'This record is read-only through site tools. Use accelerator_stage_proposal for recommendations.'
    };
  }

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 25) : [];
    } catch (_) { return []; }
  }

  function writeDrafts(items) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(items.slice(0, 25)));
    renderDrafts();
  }

  function cleanText(value, max) {
    return String(value || '').trim().slice(0, max);
  }

  function stageProposal(input) {
    const context = getCurrentContext();
    const item = {
      id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      creatorId: context.ok && context.creator ? context.creator.id : null,
      creatorName: context.ok && context.creator ? context.creator.name : '',
      title: cleanText(input && input.title, 120),
      target: cleanText(input && input.target, 120),
      summary: cleanText(input && input.summary, 1200),
      recommendation: cleanText(input && input.recommendation, 3000),
      evidence: Array.isArray(input && input.evidence)
        ? input.evidence.map(value => cleanText(value, 500)).filter(Boolean).slice(0, 8)
        : [],
      status: 'Draft - not applied'
    };
    if (!item.title || !item.target || !item.summary || !item.recommendation) {
      return { ok: false, reason: 'title, target, summary, and recommendation are required.' };
    }
    const drafts = readDrafts();
    drafts.unshift(item);
    writeDrafts(drafts);
    openDrawer();
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      proposalId: item.id,
      status: item.status,
      storedIn: 'this browser only',
      cloudStateChanged: false,
      nextStep: 'Blake can review, copy, or discard the proposal from the AI Desk.'
    };
  }

  function listStagedProposals() {
    return {
      ok: true,
      environment: 'accelerator-ai-v2',
      cloudStateChanged: false,
      proposals: readDrafts()
    };
  }

  function installUi() {
    if (document.getElementById('accelerator-ai-v2-button')) return;
    const style = document.createElement('style');
    style.id = 'accelerator-ai-v2-styles';
    style.textContent = [
      '#accelerator-ai-v2-button{position:fixed;right:18px;bottom:18px;z-index:99990;min-height:46px;border:1px solid #17212b;border-radius:999px;background:#17212b;color:#fff;padding:10px 16px;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;box-shadow:0 12px 32px rgba(23,33,43,.2);white-space:nowrap}',
      '#accelerator-ai-v2-button::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:999px;background:#e4775d;vertical-align:1px}#accelerator-ai-v2-button[data-connected="true"]::before{background:#8eb48d;box-shadow:0 0 0 3px rgba(142,180,141,.18)}',
      '#accelerator-ai-v2-drawer{width:min(760px,calc(100% - 24px));max-height:min(880px,calc(100% - 24px));overflow:auto;border:1px solid #d9e0e6;border-radius:24px;padding:0;background:#f8fafb;color:#17212b;box-shadow:0 28px 90px rgba(23,33,43,.26)}',
      '#accelerator-ai-v2-drawer::backdrop{background:rgba(23,33,43,.58);backdrop-filter:blur(4px)}',
      '.ai-v2-shell{padding:25px}.ai-v2-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #dce3e8}',
      '.ai-v2-kicker{margin:0 0 6px;color:#8a7630;font:850 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}.ai-v2-head h2{margin:0;font:850 30px/1.05 Inter,system-ui,sans-serif;letter-spacing:-.035em}.ai-v2-close{width:42px;height:42px;border:1px solid #cfd8df;border-radius:12px;background:#fff;color:#17212b;font:800 20px/1 Inter,system-ui,sans-serif;cursor:pointer}',
      '.ai-v2-safety{margin:16px 0;padding:14px;border:1px solid #eadfbd;border-radius:14px;background:#fff9df;color:#58616a;font:550 13px/1.5 Inter,system-ui,sans-serif}.ai-v2-safety strong{color:#17212b}',
      '.ai-v2-section{margin-top:18px}.ai-v2-section-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:10px}.ai-v2-section h3{margin:0;font:850 18px/1.25 Inter,system-ui,sans-serif}.ai-v2-section-note{margin:0;color:#7a858f;font:650 11px/1.35 Inter,system-ui,sans-serif}',
      '.ai-v2-connection{padding:17px;border:1px solid #d8e0e6;border-radius:17px;background:#fff}.ai-v2-connection-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.ai-v2-connection-name{margin:0 0 5px;font:850 19px/1.2 Inter,system-ui,sans-serif}.ai-v2-connection-copy{margin:0;color:#66717c;font:550 13px/1.45 Inter,system-ui,sans-serif}.ai-v2-status{display:inline-flex;align-items:center;gap:7px;flex:none;border-radius:999px;padding:7px 10px;background:#fff1ee;color:#9c3f31;font:850 10px/1 Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}.ai-v2-status::before{content:"";width:7px;height:7px;border-radius:999px;background:#e4775d}.ai-v2-status[data-connected="true"]{background:#edf6ec;color:#426a42}.ai-v2-status[data-connected="true"]::before{background:#78a776}',
      '.ai-v2-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin-top:15px;overflow:hidden;border:1px solid #e0e6eb;border-radius:13px;background:#e0e6eb}.ai-v2-fact{min-width:0;padding:12px;background:#f9fbfc}.ai-v2-fact span{display:block;margin-bottom:5px;color:#89939d;font:850 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}.ai-v2-fact strong{display:block;font:750 12px/1.35 Inter,system-ui,sans-serif;overflow-wrap:anywhere}',
      '.ai-v2-permissions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:13px 0 0;padding:0;list-style:none}.ai-v2-permissions li{position:relative;padding-left:18px;color:#5f6a75;font:600 12px/1.4 Inter,system-ui,sans-serif}.ai-v2-permissions li::before{position:absolute;left:0;top:1px;color:#5d8b5d;font-weight:900;content:"✓"}.ai-v2-permissions li[data-no="true"]::before{color:#b25343;content:"×"}',
      '.ai-v2-try{display:flex;gap:10px;align-items:center;margin-top:14px;padding:12px;border:1px dashed #c8d2da;border-radius:13px;background:#f8fafb}.ai-v2-try code{min-width:0;flex:1;color:#46515c;font:600 12px/1.4 Inter,system-ui,sans-serif;white-space:normal}.ai-v2-mini-button{flex:none;min-height:34px;border:1px solid #17212b;border-radius:9px;background:#17212b;color:#fff;padding:7px 10px;font:800 10px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.ai-v2-provider-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ai-v2-provider{padding:13px;border:1px solid #dce3e8;border-radius:14px;background:#fff}.ai-v2-provider[data-active="true"]{border-color:#b5a14d;box-shadow:inset 0 0 0 1px #b5a14d}.ai-v2-provider-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.ai-v2-provider strong{font:800 13px/1.3 Inter,system-ui,sans-serif}.ai-v2-provider small{display:block;margin-top:5px;color:#6f7a85;font:550 11px/1.4 Inter,system-ui,sans-serif}.ai-v2-provider-tag{color:#89939d;font:850 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}.ai-v2-provider[data-active="true"] .ai-v2-provider-tag{color:#75651e}',
      '.ai-v2-activity{margin:10px 0 0;color:#69747e;font:600 11px/1.4 Inter,system-ui,sans-serif}.ai-v2-activity strong{color:#17212b}',
      '.ai-v2-divider{height:1px;margin:20px 0;background:#dce3e8}',
      '.ai-v2-empty{padding:20px 0;color:#6f7a85;font:550 14px/1.5 Inter,system-ui,sans-serif}.ai-v2-list{display:grid;gap:12px}.ai-v2-card{padding:16px;border:1px solid #dce3e8;border-radius:16px;background:#fff}.ai-v2-card h3{margin:0 0 6px;font:800 17px/1.25 Inter,system-ui,sans-serif}.ai-v2-meta{margin:0 0 10px;color:#8a7630;font:800 10px/1.25 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase}.ai-v2-card p{margin:0 0 9px;color:#56616c;font:550 13px/1.45 Inter,system-ui,sans-serif;white-space:pre-wrap}.ai-v2-card strong{color:#17212b}.ai-v2-evidence{margin:8px 0 0;padding-left:18px;color:#56616c;font:550 12px/1.4 Inter,system-ui,sans-serif}.ai-v2-actions{display:flex;gap:8px;margin-top:13px}.ai-v2-actions button{min-height:36px;border-radius:10px;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-v2-copy{border:1px solid #17212b;background:#17212b;color:#fff}.ai-v2-discard{border:1px solid #cfd8df;background:#fff;color:#56616c}',
      '@media(max-width:620px){#accelerator-ai-v2-button{right:10px;bottom:10px}#accelerator-ai-v2-drawer{width:calc(100% - 16px);max-height:calc(100% - 16px);border-radius:19px}.ai-v2-shell{padding:20px 16px}.ai-v2-head h2{font-size:27px}.ai-v2-connection-top{display:block}.ai-v2-status{margin-top:10px}.ai-v2-facts{grid-template-columns:1fr}.ai-v2-permissions{grid-template-columns:1fr}.ai-v2-provider-grid{grid-template-columns:1fr}.ai-v2-try{align-items:flex-start;flex-direction:column}.ai-v2-mini-button{width:100%}}'
    ].join('');
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.id = 'accelerator-ai-v2-button';
    button.type = 'button';
    button.textContent = 'AI Desk · Checking';
    button.setAttribute('aria-label', 'Open Accelerator AI Desk');
    button.addEventListener('click', openDrawer);
    document.body.appendChild(button);

    const dialog = document.createElement('dialog');
    dialog.id = 'accelerator-ai-v2-drawer';
    dialog.setAttribute('aria-labelledby', 'accelerator-ai-v2-title');
    dialog.innerHTML = [
      '<section class="ai-v2-shell">',
      '<header class="ai-v2-head"><div><p class="ai-v2-kicker">Isolated test workspace</p><h2 id="accelerator-ai-v2-title">AI Desk</h2></div><button class="ai-v2-close" type="button" aria-label="Close">×</button></header>',
      '<p class="ai-v2-safety"><strong>The honest version:</strong> AI is not running inside this dashboard. When you open it in the Codex browser, Codex can use the safe tools this page provides. The page cannot see your ChatGPT account, plan, or selected model.</p>',
      '<section class="ai-v2-section"><div class="ai-v2-section-head"><h3>Current connection</h3><p class="ai-v2-section-note">Live browser status</p></div><div data-ai-v2-connection></div></section>',
      '<section class="ai-v2-section"><div class="ai-v2-section-head"><h3>AI routes</h3><p class="ai-v2-section-note">Only real connections show active</p></div><div data-ai-v2-providers></div></section>',
      '<div class="ai-v2-divider"></div>',
      '<section class="ai-v2-section"><div class="ai-v2-section-head"><h3>Staged recommendations</h3><p class="ai-v2-section-note">Browser-only · never auto-applied</p></div>',
      '<div data-ai-v2-drafts></div>',
      '</section>',
      '</section>'
    ].join('');
    dialog.querySelector('.ai-v2-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const copyButton = event.target.closest('[data-ai-copy]');
      const discardButton = event.target.closest('[data-ai-discard]');
      const promptButton = event.target.closest('[data-ai-copy-prompt]');
      if (copyButton) {
        const item = readDrafts().find(draft => draft.id === copyButton.dataset.aiCopy);
        if (item && navigator.clipboard) navigator.clipboard.writeText(item.recommendation).catch(() => {});
      }
      if (discardButton) writeDrafts(readDrafts().filter(draft => draft.id !== discardButton.dataset.aiDiscard));
      if (promptButton && navigator.clipboard) {
        navigator.clipboard.writeText(promptButton.dataset.aiCopyPrompt || '').catch(() => {});
        promptButton.textContent = 'Copied';
        setTimeout(() => { promptButton.textContent = 'Copy prompt'; }, 1200);
      }
    });
    document.body.appendChild(dialog);
    renderConnection();
    renderDrafts();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  }

  function formatActivity(activity) {
    if (!activity || !activity.at) return 'No AI tool calls recorded in this browser yet.';
    const date = new Date(activity.at);
    const when = Number.isNaN(date.getTime()) ? activity.at : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    return '<strong>Last AI activity:</strong> ' + escapeHtml(activity.detail || activity.toolName) + ' · ' + escapeHtml(when);
  }

  function renderConnection() {
    const status = getAiConnectionStatus();
    const button = document.getElementById('accelerator-ai-v2-button');
    if (button) {
      button.dataset.connected = String(status.connected);
      button.textContent = status.connected ? 'AI Desk · Codex connected' : 'AI Desk · Not connected';
    }
    const host = document.querySelector('[data-ai-v2-connection]');
    if (host) {
      const prompt = 'Read the current Accelerator creator context, identify the most important next decision, and stage one evidence-based recommendation for my review. Do not change dashboard or cloud data.';
      host.innerHTML = [
        '<div class="ai-v2-connection">',
        '<div class="ai-v2-connection-top"><div><p class="ai-v2-connection-name">' + escapeHtml(status.displayName) + '</p><p class="ai-v2-connection-copy">' + (status.connected ? 'Codex can discover this page’s six safe tools while this dashboard is open in the Codex browser.' : 'This browser has not exposed the dashboard tools to an AI agent. The dashboard still works normally without AI.') + '</p></div><span class="ai-v2-status" data-connected="' + String(status.connected) + '">' + (status.connected ? 'Connected' : 'Not connected') + '</span></div>',
        '<div class="ai-v2-facts"><div class="ai-v2-fact"><span>AI route</span><strong>' + escapeHtml(status.connected ? 'Codex / ChatGPT' : 'None') + '</strong></div><div class="ai-v2-fact"><span>Model</span><strong>' + escapeHtml(status.model.display) + '</strong></div><div class="ai-v2-fact"><span>Account</span><strong>' + escapeHtml(status.account.display) + '</strong></div><div class="ai-v2-fact"><span>Data</span><strong>' + escapeHtml(status.dataMode) + '</strong></div></div>',
        '<ul class="ai-v2-permissions"><li>Read the current V2 creator and video</li><li>Stage recommendations for review</li><li data-no="true">Cannot silently edit dashboard data</li><li data-no="true">Cannot write to cloud through AI tools</li></ul>',
        '<p class="ai-v2-activity">' + formatActivity(status.lastActivity) + '</p>',
        status.connected ? '<div class="ai-v2-try"><code>' + escapeHtml(prompt) + '</code><button class="ai-v2-mini-button" type="button" data-ai-copy-prompt="' + escapeHtml(prompt) + '">Copy prompt</button></div>' : '<div class="ai-v2-try"><code>Open this exact page in the Codex built-in browser. When site tools are enabled, this card will change to Connected automatically.</code></div>',
        '</div>'
      ].join('');
    }
    const providers = document.querySelector('[data-ai-v2-providers]');
    if (providers) {
      providers.innerHTML = '<div class="ai-v2-provider-grid">' + [
        { name: 'Codex / ChatGPT', tag: status.connected ? 'Active now' : 'Open in Codex', copy: 'Uses your Codex session and ChatGPT-managed sign-in. The model is selected in Codex, not on this page.', active: status.connected },
        { name: 'LM Studio', tag: 'Companion needed', copy: 'A local companion must safely connect this page to the LM Studio server running on your computer.', active: false },
        { name: 'MLX', tag: 'Companion needed', copy: 'A local companion must safely connect this page to your MLX model server. Vercel cannot reach your Mac by itself.', active: false },
        { name: 'Custom model server', tag: 'Companion needed', copy: 'An OpenAI-compatible local or remote endpoint can be routed through the same companion after pairing.', active: false }
      ].map(provider => '<article class="ai-v2-provider" data-active="' + String(provider.active) + '"><div class="ai-v2-provider-top"><strong>' + escapeHtml(provider.name) + '</strong><span class="ai-v2-provider-tag">' + escapeHtml(provider.tag) + '</span></div><small>' + escapeHtml(provider.copy) + '</small></article>').join('') + '</div>';
    }
  }

  function renderDrafts() {
    const host = document.querySelector('[data-ai-v2-drafts]');
    if (!host) return;
    const drafts = readDrafts();
    if (!drafts.length) {
      host.innerHTML = '<p class="ai-v2-empty">No staged proposals yet. Open this page in Codex, ask it to inspect the active creator, then ask it to stage a recommendation.</p>';
      return;
    }
    host.innerHTML = '<div class="ai-v2-list">' + drafts.map(item => {
      const evidence = item.evidence.length
        ? '<ul class="ai-v2-evidence">' + item.evidence.map(value => '<li>' + escapeHtml(value) + '</li>').join('') + '</ul>'
        : '';
      return '<article class="ai-v2-card"><p class="ai-v2-meta">' + escapeHtml(item.creatorName || 'Workspace') + ' · ' + escapeHtml(item.target) + ' · Not applied</p><h3>' + escapeHtml(item.title) + '</h3><p><strong>Why:</strong> ' + escapeHtml(item.summary) + '</p><p><strong>Recommendation:</strong> ' + escapeHtml(item.recommendation) + '</p>' + evidence + '<div class="ai-v2-actions"><button class="ai-v2-copy" type="button" data-ai-copy="' + escapeHtml(item.id) + '">Copy recommendation</button><button class="ai-v2-discard" type="button" data-ai-discard="' + escapeHtml(item.id) + '">Discard</button></div></article>';
    }).join('') + '</div>';
  }

  function openDrawer() {
    installUi();
    renderDrafts();
    const dialog = document.getElementById('accelerator-ai-v2-drawer');
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  function runTool(toolName, detail, action) {
    const result = action();
    recordActivity(toolName, detail);
    return result;
  }

  async function registerTools() {
    if (registered || typeof document.modelContext?.registerTool !== 'function') return false;
    const register = tool => document.modelContext.registerTool(tool);
    await register({
      name: 'accelerator_get_ai_connection_status',
      description: 'Read how AI is connected to Accelerator AI V2, what model and account details are visible to the dashboard, and what permissions the site tools have. This never changes data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => runTool('accelerator_get_ai_connection_status', 'Codex checked the AI connection and permissions.', () => getAiConnectionStatus())
    });
    await register({
      name: 'accelerator_get_current_context',
      description: 'Read the active Accelerator AI V2 view, creator summary, current video summary, and isolated cloud version. This never changes data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => runTool('accelerator_get_current_context', 'Codex read the active dashboard context.', () => getCurrentContext())
    });
    await register({
      name: 'accelerator_get_current_creator_record',
      description: 'Read the complete active creator record from the isolated Accelerator AI V2 cloud workspace for diagnosis and planning. This never changes data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => runTool('accelerator_get_current_creator_record', 'Codex read the current creator record.', () => getCurrentCreatorRecord())
    });
    await register({
      name: 'accelerator_get_current_video_record',
      description: 'Read the complete current video record and its creator from the isolated Accelerator AI V2 cloud workspace. This never changes data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => runTool('accelerator_get_current_video_record', 'Codex read the current video record.', () => getCurrentVideoRecord())
    });
    await register({
      name: 'accelerator_list_staged_proposals',
      description: 'List AI proposal drafts stored in this browser. These drafts are separate from dashboard and cloud state.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => runTool('accelerator_list_staged_proposals', 'Codex checked staged recommendation drafts.', () => listStagedProposals())
    });
    await register({
      name: 'accelerator_stage_proposal',
      description: 'Stage a recommendation for Blake to review in the AI V2 drawer. This writes only a local proposal draft and does not change dashboard or cloud data.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          target: { type: 'string', minLength: 1, maxLength: 120, description: 'Where the recommendation belongs, such as Strategy, Plan Month 1, or a video title.' },
          summary: { type: 'string', minLength: 1, maxLength: 1200 },
          recommendation: { type: 'string', minLength: 1, maxLength: 3000 },
          evidence: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 500 } }
        },
        required: ['title', 'target', 'summary', 'recommendation'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: async input => runTool('accelerator_stage_proposal', 'Codex staged a browser-only recommendation.', () => stageProposal(input))
    });
    registered = true;
    document.documentElement.dataset.acceleratorSiteTools = 'ready';
    renderConnection();
    return true;
  }

  async function boot() {
    installUi();
    for (let attempt = 0; attempt < 100 && !registered; attempt += 1) {
      if (await registerTools()) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  window.__acceleratorAiV2Diagnostics = () => ({
    environment: 'accelerator-ai-v2',
    requiredWorkspaceId: REQUIRED_WORKSPACE_ID,
    registered,
    toolNames: TOOL_NAMES.slice(),
    connection: getAiConnectionStatus(),
    draftCount: readDrafts().length,
    cloud: saveDiagnostics()
  });

  boot();
})();
</script>`;

function injectPersistence(html) {
  if (html.includes('id="accelerator-v1636-persistence-bridge"')) return html;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody < 0) return html + PERSISTENCE_BRIDGE + AI_V2_BRIDGE + AI_COMPANION_BRIDGE;
  return html.slice(0, closingBody) + PERSISTENCE_BRIDGE + '\n' + AI_V2_BRIDGE + '\n' + AI_COMPANION_BRIDGE + '\n' + html.slice(closingBody);
}

module.exports = function handler(_req, res) {
  try {
    const html = injectPersistence(source());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'Accelerator-AI-V2-isolated-webmcp');
    res.setHeader('X-Accelerator-Workspace', V2_WORKSPACE_ID);
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
