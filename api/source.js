const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_SHA256 = '99ce557694fcf9a8421c57ccd01f47b898dda4f7bd7a73be0d4a579eecd4f4a7';
const EXPECTED_BYTES = 838014;
const encoded = [
  require('../bundles/v1631/v16_0'),
  require('../bundles/v1631/v16_1'),
  require('../bundles/v1631/v16_2'),
  require('../bundles/v1631/v16_3'),
  require('../bundles/v1631/v16_4'),
  require('../bundles/v1631/v16_5'),
  require('../bundles/v1631/v16_6'),
  require('../bundles/v1631/v16_7'),
  require('../bundles/v1631/v16_8'),
  require('../bundles/v1631/v16_9'),
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
<script id="accelerator-v1631-persistence-bridge">
(() => {
  if (window.__acceleratorPersistenceBridge) return;
  window.__acceleratorPersistenceBridge = true;

  const REF = 'pqggobwpazihraeqvspc';
  const SUPABASE_URL = 'https://' + REF + '.supabase.co';
  const API_KEY = 'sb_publishable_VgGebMpW9tBcCiQlRdnzpA__rbATAaT';
  const AUTH_KEY = 'sb-' + REF + '-auth-token';
  const LOCAL_KEY = 'accelerator-os-v1631-state-backup';
  const LOCAL_META_KEY = LOCAL_KEY + '-meta';

  let workspaceId = null;
  let remoteVersion = 0;
  let accessToken = null;
  let refreshToken = null;
  let ready = false;
  let applying = false;
  let lastSerialized = '';
  let saveTimer = null;

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
    if (!current) return false;
    return setGlobalState(current);
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

  function replaceState(next) {
    if (!next || typeof next !== 'object') return false;
    applying = true;
    try {
      if (!setGlobalState(next)) return false;
      const current = appState();
      if (!current) return false;
      lastSerialized = JSON.stringify(current);
      try {
        localStorage.setItem(LOCAL_KEY, lastSerialized);
        localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ savedAt: Date.now(), source: 'restore' }));
      } catch (_) {}
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

  async function saveRemote(serialized) {
    if (!workspaceId || !accessToken || !serialized) return false;
    let parsed;
    try { parsed = normalizeWithApp(JSON.parse(serialized)); } catch (_) { return false; }

    let result = await rpc('save_workspace_state', {
      p_workspace_id: workspaceId,
      p_expected_version: remoteVersion,
      p_state: parsed
    });
    if (!result.ok || !Array.isArray(result.data) || !result.data.length) return false;

    let row = result.data[0];
    if (row.conflict) {
      remoteVersion = Number(row.version || remoteVersion || 0);
      result = await rpc('save_workspace_state', {
        p_workspace_id: workspaceId,
        p_expected_version: remoteVersion,
        p_state: parsed
      });
      if (!result.ok || !Array.isArray(result.data) || !result.data.length) return false;
      row = result.data[0];
    }
    if (!row.conflict) {
      remoteVersion = Number(row.version || remoteVersion + 1);
      return true;
    }
    return false;
  }

  async function connectCloud() {
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
      if (!replaceState(cloudState)) return false;
      const repaired = appState();
      if (repaired) {
        const serialized = JSON.stringify(repaired);
        await saveRemote(serialized);
        lastSerialized = JSON.stringify(appState() || repaired);
      }
    }
    return true;
  }

  function persistSnapshot(serialized) {
    try {
      localStorage.setItem(LOCAL_KEY, serialized);
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ savedAt: Date.now(), source: 'app' }));
    } catch (_) {}
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRemote(serialized), 700);
  }

  function observeState() {
    setInterval(() => {
      if (!ready || applying) return;
      const current = appState();
      if (!current) return;
      let serialized;
      try { serialized = JSON.stringify(current); } catch (_) { return; }
      if (!serialized || serialized === lastSerialized) return;
      lastSerialized = serialized;
      persistSnapshot(serialized);
    }, 400);
  }

  async function boot() {
    for (let i = 0; i < 100 && !appState(); i++) await new Promise(r => setTimeout(r, 40));
    if (!appState()) return;

    normalizeCurrentState();
    installRenderGuard();
    rerender();

    let restoredFromCloud = false;
    try { restoredFromCloud = await connectCloud(); } catch (_) {}

    if (!restoredFromCloud) {
      try {
        const local = localStorage.getItem(LOCAL_KEY);
        if (local) replaceState(JSON.parse(local));
      } catch (_) {}
    }

    normalizeCurrentState();
    rerender();

    const current = appState();
    if (current) {
      try { lastSerialized = JSON.stringify(current); } catch (_) {}
    }
    ready = true;
    observeState();
  }

  window.addEventListener('pagehide', () => {
    const current = appState();
    if (!current) return;
    try {
      const serialized = JSON.stringify(current);
      localStorage.setItem(LOCAL_KEY, serialized);
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ savedAt: Date.now(), source: 'pagehide' }));
    } catch (_) {}
  });

  boot();
})();
</script>`;

function injectPersistence(html) {
  if (html.includes('id="accelerator-v1631-persistence-bridge"')) return html;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody < 0) return html + PERSISTENCE_BRIDGE;
  return html.slice(0, closingBody) + PERSISTENCE_BRIDGE + '\n' + html.slice(closingBody);
}

module.exports = function handler(_req, res) {
  try {
    const html = injectPersistence(source());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'V16.3.1-persistence-fix-4');
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
