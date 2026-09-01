const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_SHA256 = '337f94699f99b0cb696b5d5064dad625dbeaaa604896fb4cf9a049a239103415';
const EXPECTED_BYTES = 839942;
const encoded = [
  require('../bundles/v1632/v16_0'),
  require('../bundles/v1632/v16_1'),
  require('../bundles/v1632/v16_2'),
  require('../bundles/v1632/v16_3'),
  require('../bundles/v1632/v16_4'),
  require('../bundles/v1632/v16_5'),
  require('../bundles/v1632/v16_6'),
  require('../bundles/v1632/v16_7'),
  require('../bundles/v1632/v16_8'),
  require('../bundles/v1632/v16_9'),
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
<script id="accelerator-v1632-persistence-bridge">
(() => {
  if (window.__acceleratorPersistenceBridge) return;
  window.__acceleratorPersistenceBridge = true;

  const REF = 'pqggobwpazihraeqvspc';
  const SUPABASE_URL = 'https://' + REF + '.supabase.co';
  const API_KEY = 'sb_publishable_VgGebMpW9tBcCiQlRdnzpA__rbATAaT';
  const AUTH_KEY = 'sb-' + REF + '-auth-token';
  // Stable across software builds: deployments must never strand the latest browser backup.
  const LOCAL_KEY = 'accelerator-os-state-backup';
  const LOCAL_META_KEY = LOCAL_KEY + '-meta';
  const LOCAL_PREVIOUS_KEY = LOCAL_KEY + '-previous';
  const LOCAL_PREVIOUS_META_KEY = LOCAL_PREVIOUS_KEY + '-meta';
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
  let armedAt = 0;
  let remoteShape = { creators: 0, bytes: 0 };

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

  function setSaveLabel(text) {
    try {
      const el = document.querySelector('[data-save-label], #saveLabel, .save-label');
      if (el) el.textContent = text;
    } catch (_) {}
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
      (0, eval)("render = function acceleratorSafeRender(){ try { if (typeof normalize === 'function') state = normalize(state); } catch (_) {} return window.__acceleratorNativeRender.apply(this, arguments); };");
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

  function readStoredSession() {
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
      if (!response.ok) return false;
      const session = await response.json();
      accessToken = session.access_token || null;
      refreshToken = session.refresh_token || refreshToken;
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (_) {}
      return !!accessToken;
    } catch (_) { return false; }
  }

  async function rpc(name, body, retry = true) {
    if (!accessToken) return { ok: false, status: 401, data: null };
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
      if (response.status === 401 && retry && await refreshSession()) return rpc(name, body, false);
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
      return { ok: response.ok, status: response.status, data };
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
    if (!workspaceId || !accessToken || !serialized) return { ok: false, retryable: true };
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

  async function connectCloud({ restoreState = true } = {}) {
    readStoredSession();
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
    if (cloudState && typeof cloudState === 'object' && Object.keys(cloudState).length) {
      const normalizedCloud = normalizeWithApp(cloudState);
      remoteShape = shapeOf(normalizedCloud);
      if (restoreState && !replaceState(normalizedCloud, 'cloud')) return false;
    }
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
      retryCount = 0;
      clearTimeout(retryTimer);
      if (pendingSerialized === target) pendingSerialized = '';
      setSaveLabel('Saved just now');
      if (pendingSerialized) queueMicrotask(() => { void drainSaveQueue(); });
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
    setSaveLabel('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void drainSaveQueue(); }, immediate ? 0 : 250);
  }

  function observeState() {
    setInterval(() => {
      if (!ready || applying || Date.now() < armedAt) return;
      const current = appState();
      if (!current) return;
      let serialized;
      try { serialized = JSON.stringify(current); } catch (_) { return; }
      if (!serialized || serialized === lastObservedSerialized) return;
      queueSnapshot(serialized);
    }, 120);
  }

  async function boot() {
    for (let i = 0; i < 100 && !appState(); i++) await new Promise(r => setTimeout(r, 40));
    if (!appState()) return;

    normalizeCurrentState();
    installRenderGuard();
    rerender();

    let restoredFromCloud = false;
    try { restoredFromCloud = await connectCloud(); } catch (_) {}

    // Local data is fallback only. It NEVER overwrites a successfully loaded cloud state on boot.
    if (!restoredFromCloud) {
      const fallback = readFallbackState();
      if (fallback) replaceState(fallback.value, 'offline-fallback');
      setSaveLabel('Offline - local backup');
    }

    normalizeCurrentState();
    rerender();

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
    armedAt = Date.now() + 300;
    ready = true;
    observeState();
  }

  window.addEventListener('online', async () => {
    saveBlocked = false;
    if (!workspaceId) {
      try { await connectCloud({ restoreState: !pendingSerialized }); } catch (_) {}
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
    previousLocalBackup: !!localStorage.getItem(LOCAL_PREVIOUS_KEY)
  });

  boot();
})();
</script>`;

function injectPersistence(html) {
  if (html.includes('id="accelerator-v1632-persistence-bridge"')) return html;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody < 0) return html + PERSISTENCE_BRIDGE;
  return html.slice(0, closingBody) + PERSISTENCE_BRIDGE + '\n' + html.slice(closingBody);
}

module.exports = function handler(_req, res) {
  try {
    const html = injectPersistence(source());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'V16.3.2-safe-save-dashboard-pdf');
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
