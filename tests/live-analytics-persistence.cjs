const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sourceHandler = require('../api/source');

const ROOT = path.resolve(__dirname, '..');
const report = {
  build: 'V16.3.6-cloud-first-offline-safety',
  checkedAt: new Date().toISOString(),
  passed: [],
  errors: [],
  scenarios: {}
};

const pass = message => {
  report.passed.push(message);
  console.log(`PASS: ${message}`);
};

const check = (value, message) => {
  if (!value) {
    report.errors.push(message);
    throw new Error(message);
  }
  pass(message);
};

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/source')) {
      sourceHandler(req, {
        setHeader: (name, value) => res.setHeader(name, value),
        status: code => ({ send: body => { res.statusCode = code; res.end(body); } })
      });
      return;
    }
    const file = /^\/(analytics|ai|ui)\/[\w-]+\.js$/.test(req.url)?req.url.slice(1):req.url === '/favicon.svg' ? 'favicon.svg' : 'index.html';
    res.statusCode = 200;
    res.setHeader('Content-Type', file.endsWith('.js')?'application/javascript':file.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(ROOT, file)));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'content-type': 'application/json'
  };
}

async function waitForDiagnostics(page, predicate, timeout = 15000) {
  await page.waitForFunction(condition => {
    if (typeof window.__acceleratorSaveDiagnostics !== 'function') return false;
    return Function('diagnostics', `return (${condition})(diagnostics)`)({
      ...window.__acceleratorSaveDiagnostics()
    });
  }, predicate.toString(), { timeout });
}

function authSession(access = 'qa-access', refresh = 'qa-refresh') {
  return { access_token: access, refresh_token: refresh };
}

function minimalState(id, name) {
  return { currentCreatorId: id, creators: [{ id, name }] };
}

(async () => {
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  try {
    // Scenario 1: a clean browser cannot mistake bundled examples for real data.
    const cleanContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const cleanPage = await cleanContext.newPage();
    const cleanRuntimeErrors = [];
    const cleanRequests = [];
    let cleanVersion = 110;
    let cleanSaveCount = 0; const analyticsSaveBodies=[];
    cleanPage.on('pageerror', error => cleanRuntimeErrors.push(error.message));
    cleanPage.on('console', message => {
      const text = message.text();
      if (message.type() === 'error' && !text.includes('Failed to load resource')) cleanRuntimeErrors.push(text);
    });
    await cleanPage.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = corsHeaders();
      cleanRequests.push(url.pathname + url.search);
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({ ...authSession('clean-access', 'clean-refresh'), expires_in: 3600, token_type: 'bearer', user: { id: 'qa-user' } })
        });
      }
      if (url.pathname.endsWith('/rpc/get_my_workspaces')) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ id: '11111111-1111-4111-8111-111111111111', version: cleanVersion }]) });
      }
      if (url.pathname.endsWith('/rpc/get_workspace_state')) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: cleanVersion, state: minimalState('cloud-clean', 'Cloud Clean Workspace') }]) });
      }
      if (url.pathname.endsWith('/rpc/save_workspace_state')) {
        cleanSaveCount += 1; analyticsSaveBodies.push(request.postDataJSON());
        cleanVersion += 1;
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: cleanVersion, conflict: false }]) });
      }
      return route.fulfill({ status: 404, headers, body: '{}' });
    });

    await cleanPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForDiagnostics(cleanPage, diagnostics => diagnostics.authRequired === true && diagnostics.cloudGate === true);
    await cleanPage.waitForTimeout(250);
    check(await cleanPage.title() === 'Accelerator OS V16.3.6 - Cloud-First Data Safety', 'The cloud-first release loads.');
    check(cleanRequests.length === 0, 'A clean signed-out browser makes no cloud RPC requests.');
    check(await cleanPage.locator('[data-cloud-auth-close]').innerText() === 'View demo', 'A clean browser offers explicit Demo Mode instead of presenting examples as local data.');
    check(await cleanPage.evaluate(() => document.body.dataset.acceleratorCloudGate === 'true'), 'Bundled examples remain behind the cloud startup gate.');
    const cleanGeometry = await cleanPage.evaluate(() => {
      const dialog = document.getElementById('accelerator-cloud-auth-dialog').getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        dialogLeft: dialog.left,
        dialogRight: dialog.right,
        viewport: innerWidth
      };
    });
    check(cleanGeometry.pageOverflow <= 1 && cleanGeometry.dialogLeft >= 0 && cleanGeometry.dialogRight <= cleanGeometry.viewport + 1, 'The cloud gate and sign-in choice fit a 390 px phone.');
    await cleanPage.screenshot({ path: path.join(ROOT, 'qa', 'v1636-mobile-cloud-gate.png'), fullPage: true });

    await cleanPage.locator('[data-cloud-auth-close]').click();
    await waitForDiagnostics(cleanPage, diagnostics => diagnostics.demoMode === true && diagnostics.cloudGate === false);
    await cleanPage.evaluate(() => {
      state.creators[0].name = 'Isolated Demo Edit';
      save();
      render();
    });
    await cleanPage.waitForTimeout(500);
    const demoStorage = await cleanPage.evaluate(() => ({
      marker: localStorage.getItem('accelerator-os-demo-mode'),
      realBackup: localStorage.getItem('accelerator-os-state-backup'),
      pending: localStorage.getItem('accelerator-os-unsynced-draft')
    }));
    check(demoStorage.marker === 'true' && demoStorage.realBackup === null && demoStorage.pending === null, 'Demo changes remain isolated from real backup and pending-sync storage.');
    check(cleanSaveCount === 0, 'Demo Mode never writes to cloud.');

    await cleanPage.locator('[data-save-label]').click();
    await cleanPage.locator('input[name="email"]').fill('qa@example.com');
    await cleanPage.locator('input[name="password"]').fill('correct-password');
    await cleanPage.locator('.accelerator-cloud-auth-submit').click();
    await waitForDiagnostics(cleanPage, diagnostics => diagnostics.authRequired === false && diagnostics.workspaceId !== null && diagnostics.demoMode === false);
    await cleanPage.waitForTimeout(500);
    check(await cleanPage.evaluate(() => state.creators[0].name) === 'Cloud Clean Workspace', 'Signing in from Demo Mode restores cloud instead of uploading examples.');
    check(cleanSaveCount === 0, 'Demo-to-cloud sign-in remains read-only.');
    check(await cleanPage.evaluate(() => localStorage.getItem('accelerator-os-recovery-copy')) === null, 'Bundled demo data is not mislabeled as a recovery copy.');
    check(cleanRuntimeErrors.length === 0, `The clean-browser flow has no runtime errors: ${cleanRuntimeErrors.join(' | ')}`);
    await cleanPage.screenshot({ path: path.join(ROOT, 'qa', 'v1636-mobile-cloud-connected.png'), fullPage: true });
    report.scenarios.cleanBrowser = { requests: cleanRequests, saveCount: cleanSaveCount };
    await cleanPage.evaluate(()=>{state.creators[0].analyticsFoundation={observations:[{id:'qa-evidence',metrics:{views:123,ctr:null}}],policies:[],baselines:[],reviews:[],events:[]};save();});
    await cleanPage.waitForTimeout(1200);
    check(analyticsSaveBodies.at(-1)?.p_state.creators[0].analyticsFoundation.observations[0].metrics.views===123,'Analytics evidence is included in the authenticated version-guarded save.');
    check(analyticsSaveBodies.at(-1)?.p_state.creators[0].analyticsFoundation.observations[0].metrics.ctr===null,'Unavailable analytics remains null in cloud payloads.');
    await cleanContext.close();

    // Scenario 2: an offline edit resumes only after cloud is re-read and unchanged.
    const resumeContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const resumePage = await resumeContext.newPage();
    let resumeReachable = false;
    let resumeVersion = 220;
    let resumeSaveCount = 0;
    const resumeOrder = [];
    const resumeSaveBodies = [];
    await resumePage.addInitScript(({ session, local, meta }) => {
      localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify(session));
      localStorage.setItem('accelerator-os-state-backup', JSON.stringify(local));
      localStorage.setItem('accelerator-os-state-backup-meta', JSON.stringify(meta));
    }, {
      session: authSession('resume-access', 'resume-refresh'),
      local: minimalState('resume-local', 'Last Synced Local'),
      meta: { savedAt: Date.now(), source: 'cloud', cloudVersion: 220, syncState: 'synced' }
    });
    await resumePage.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = corsHeaders();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (!resumeReachable) return route.fulfill({ status: 503, headers, body: JSON.stringify({ message: 'offline' }) });
      if (url.pathname.endsWith('/rpc/get_my_workspaces')) {
        resumeOrder.push('get_my_workspaces');
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ id: '22222222-2222-4222-8222-222222222222', version: resumeVersion }]) });
      }
      if (url.pathname.endsWith('/rpc/get_workspace_state')) {
        resumeOrder.push('get_workspace_state');
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: resumeVersion, state: minimalState('resume-local', 'Last Synced Local') }]) });
      }
      if (url.pathname.endsWith('/rpc/save_workspace_state')) {
        resumeOrder.push('save_workspace_state');
        resumeSaveCount += 1;
        const body = request.postDataJSON();
        resumeSaveBodies.push(body);
        resumeVersion += 1;
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: resumeVersion, conflict: false }]) });
      }
      return route.fulfill({ status: 404, headers, body: '{}' });
    });

    await resumePage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForDiagnostics(resumePage, diagnostics => diagnostics.cloudStateLoaded === false && diagnostics.cloudGate === false);
    await resumePage.evaluate(() => {
      state.creators[0].name = 'Authenticated Offline Edit';
      save();
      render();
    });
    await waitForDiagnostics(resumePage, diagnostics => diagnostics.pendingDraft === true && diagnostics.pendingBaseVersion === 220);
    check(resumeSaveCount === 0, 'An authenticated offline edit stays local while cloud is unreachable.');
    resumeReachable = true;
    await resumePage.evaluate(() => window.dispatchEvent(new Event('online')));
    await waitForDiagnostics(resumePage, diagnostics => diagnostics.pending === false && diagnostics.remoteVersion === 221 && diagnostics.statusText === 'Saved just now');
    check(resumeOrder.slice(-3).join(' > ') === 'get_my_workspaces > get_workspace_state > save_workspace_state', 'Reconnect reads the latest cloud workspace before uploading a queued edit.');
    check(resumeSaveCount === 1 && resumeSaveBodies[0].p_expected_version === 220, 'An unchanged cloud accepts the offline edit against its original base version exactly once.');
    check(resumeSaveBodies[0].p_state.creators[0].name === 'Authenticated Offline Edit', 'The safely resumed write contains the intended offline edit.');
    check(await resumePage.evaluate(() => localStorage.getItem('accelerator-os-unsynced-draft')) === null, 'The durable pending draft clears only after cloud confirms the save.');
    report.scenarios.safeResume = { order: resumeOrder, saveBodies: resumeSaveBodies };
    await resumeContext.close();

    // Scenario 3: a newer cloud version blocks the stale browser snapshot.
    const conflictContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const conflictPage = await conflictContext.newPage();
    let conflictReachable = false;
    let conflictVersion = 331;
    let conflictSaveCount = 0;
    let conflictCloudName = 'Newer Laptop Change';
    await conflictPage.addInitScript(({ session, local, meta }) => {
      localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify(session));
      localStorage.setItem('accelerator-os-state-backup', JSON.stringify(local));
      localStorage.setItem('accelerator-os-state-backup-meta', JSON.stringify(meta));
    }, {
      session: authSession('conflict-access', 'conflict-refresh'),
      local: minimalState('conflict-local', 'Cloud Version 330 Local'),
      meta: { savedAt: Date.now(), source: 'cloud', cloudVersion: 330, syncState: 'synced' }
    });
    await conflictPage.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = corsHeaders();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (!conflictReachable) return route.fulfill({ status: 503, headers, body: JSON.stringify({ message: 'offline' }) });
      if (url.pathname.endsWith('/rpc/get_my_workspaces')) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ id: '33333333-3333-4333-8333-333333333333', version: conflictVersion }]) });
      }
      if (url.pathname.endsWith('/rpc/get_workspace_state')) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: conflictVersion, state: minimalState('conflict-cloud', conflictCloudName) }]) });
      }
      if (url.pathname.endsWith('/rpc/save_workspace_state')) {
        conflictSaveCount += 1;
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: conflictVersion + 1, conflict: false }]) });
      }
      return route.fulfill({ status: 404, headers, body: '{}' });
    });

    await conflictPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForDiagnostics(conflictPage, diagnostics => diagnostics.cloudStateLoaded === false && diagnostics.cloudGate === false);
    await conflictPage.evaluate(() => {
      state.creators[0].name = 'Phone Offline Draft';
      save();
      render();
    });
    await waitForDiagnostics(conflictPage, diagnostics => diagnostics.pendingBaseVersion === 330 && diagnostics.pendingDraft === true);
    conflictReachable = true;
    await conflictPage.evaluate(() => window.dispatchEvent(new Event('online')));
    await waitForDiagnostics(conflictPage, diagnostics => diagnostics.syncConflict === true && diagnostics.saveBlocked === true);
    check(conflictSaveCount === 0, 'A stale offline browser performs zero cloud writes after another device advanced the workspace.');
    check(await conflictPage.evaluate(() => state.creators[0].name) === 'Phone Offline Draft', 'The local draft remains open for review instead of disappearing.');
    check(await conflictPage.locator('#accelerator-sync-conflict-dialog').evaluate(node => node.open), 'A clear conflict decision opens automatically.');
    check((await conflictPage.locator('[data-conflict-detail]').innerText()).includes('330') && (await conflictPage.locator('[data-conflict-detail]').innerText()).includes('331'), 'The conflict explains the local base and current cloud versions.');
    const conflictGeometry = await conflictPage.evaluate(() => {
      const dialog = document.getElementById('accelerator-sync-conflict-dialog').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - innerWidth, left: dialog.left, right: dialog.right, viewport: innerWidth };
    });
    check(conflictGeometry.overflow <= 1 && conflictGeometry.left >= 0 && conflictGeometry.right <= conflictGeometry.viewport + 1, 'The conflict decision fits a 390 px phone.');
    await conflictPage.screenshot({ path: path.join(ROOT, 'qa', 'v1636-mobile-sync-conflict.png'), fullPage: true });
    const downloadPromise = conflictPage.waitForEvent('download');
    await conflictPage.locator('.accelerator-conflict-download').click();
    const download = await downloadPromise;
    check((await download.suggestedFilename()).startsWith('accelerator-local-draft-'), 'The local conflict copy can be downloaded before resolving.');
    await conflictPage.locator('.accelerator-conflict-review').click();
    check(await conflictPage.locator('[data-save-text]').innerText() === 'Cloud paused - local changes need review', 'Reviewing locally leaves cloud saving visibly paused.');
    await conflictPage.locator('[data-save-label]').click();
    await conflictPage.locator('.accelerator-conflict-cloud').click();
    await waitForDiagnostics(conflictPage, diagnostics => diagnostics.syncConflict === false && diagnostics.pendingDraft === false && diagnostics.statusText === 'Cloud connected');
    check(await conflictPage.evaluate(() => state.creators[0].name) === conflictCloudName, 'Choosing latest cloud explicitly restores the newer cloud workspace.');
    check(conflictSaveCount === 0, 'Resolving with cloud never uploads the stale whole-browser snapshot.');
    check(await conflictPage.evaluate(() => JSON.parse(localStorage.getItem('accelerator-os-recovery-copy')).creators[0].name) === 'Phone Offline Draft', 'The discarded local draft remains protected as a recovery copy.');
    report.scenarios.conflict = { saveCount: conflictSaveCount, cloudVersion: conflictVersion };
    await conflictContext.close();

    // Scenario 4: a legacy/unknown-base pending draft is never guessed safe.
    const unknownContext = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    const unknownPage = await unknownContext.newPage();
    let unknownSaveCount = 0;
    await unknownPage.addInitScript(({ session, local }) => {
      localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify(session));
      localStorage.setItem('accelerator-os-state-backup', JSON.stringify(local));
      localStorage.setItem('accelerator-os-unsynced-draft', JSON.stringify(local));
      localStorage.setItem('accelerator-os-unsynced-draft-meta', JSON.stringify({ savedAt: Date.now(), source: 'legacy-unknown' }));
    }, {
      session: authSession('unknown-access', 'unknown-refresh'),
      local: minimalState('unknown-local', 'Unknown Base Local Draft')
    });
    await unknownPage.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = corsHeaders();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (url.pathname.endsWith('/rpc/get_my_workspaces')) return route.fulfill({ status: 200, headers, body: JSON.stringify([{ id: '44444444-4444-4444-8444-444444444444', version: 440 }]) });
      if (url.pathname.endsWith('/rpc/get_workspace_state')) return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: 440, state: minimalState('unknown-cloud', 'Known Cloud State') }]) });
      if (url.pathname.endsWith('/rpc/save_workspace_state')) {
        unknownSaveCount += 1;
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: 441, conflict: false }]) });
      }
      return route.fulfill({ status: 404, headers, body: '{}' });
    });
    await unknownPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForDiagnostics(unknownPage, diagnostics => diagnostics.syncConflict === true && diagnostics.pendingBaseVersion === null);
    check(unknownSaveCount === 0, 'A legacy pending draft with no trustworthy cloud base performs zero writes.');
    check((await unknownPage.locator('[data-conflict-detail]').innerText()).includes('unknown'), 'Unknown-base recovery is explained instead of silently guessed safe.');
    await unknownContext.close();

    fs.mkdirSync(path.join(ROOT, 'qa'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'qa', 'v1636-cloud-first-offline-safety-report.json'), JSON.stringify(report, null, 2));
    console.log(`Completed ${report.passed.length} cloud-first safety checks.`);
  } catch (error) {
    report.errors.push(error.stack || error.message);
    fs.mkdirSync(path.join(ROOT, 'qa'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'qa', 'v1636-cloud-first-offline-safety-report.json'), JSON.stringify(report, null, 2));
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
