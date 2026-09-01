const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sourceHandler = require('../api/source');

const ROOT = path.resolve(__dirname, '..');
const V2_WORKSPACE_ID = 'e9953426-0a8d-4890-9cf0-4f4ac4e71c46';
const PROD_WORKSPACE_ID = '6bf9ac31-6980-4b5b-88cb-fd9aa0054bed';
const report = { build: 'Accelerator-AI-V2', checkedAt: new Date().toISOString(), passed: [], errors: [] };

function check(value, message) {
  if (!value) throw new Error(message);
  report.passed.push(message);
  console.log('PASS: ' + message);
}

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/source')) {
      sourceHandler(req, {
        setHeader: (name, value) => res.setHeader(name, value),
        status: code => ({ send: body => { res.statusCode = code; res.end(body); } })
      });
      return;
    }
    const file = req.url === '/favicon.svg' ? 'favicon.svg' : 'index.html';
    res.statusCode = 200;
    res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(ROOT, file)));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function configurePage(page, workspaceRows) {
  const saveCalls = [];
  await page.addInitScript(() => {
    localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify({
      access_token: 'qa-access-token',
      refresh_token: 'qa-refresh-token'
    }));
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async tool => {
          window.__qaRegisteredTools = window.__qaRegisteredTools || {};
          window.__qaRegisteredTools[tool.name] = tool;
        }
      }
    });
  });
  await page.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (pathname.endsWith('/rpc/get_my_workspaces')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify(workspaceRows) });
    }
    if (pathname.endsWith('/rpc/get_workspace_state')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: 19, state: {} }]) });
    }
    if (pathname.endsWith('/rpc/save_workspace_state')) {
      saveCalls.push(request.postDataJSON());
      return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: 20, conflict: false }]) });
    }
    return route.fulfill({ status: 404, headers, body: '{}' });
  });
  return saveCalls;
}

(async () => {
  const server = await startServer();
  const address = server.address();
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const runtimeErrors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => runtimeErrors.push('pageerror: ' + error.message));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push('console: ' + message.text()); });
    const saveCalls = await configurePage(page, [
      { id: PROD_WORKSPACE_ID, version: 1337, name: 'Blake' },
      { id: V2_WORKSPACE_ID, version: 19, name: 'Accelerator AI V2 Test' }
    ]);
    await page.goto('http://127.0.0.1:' + address.port + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__acceleratorAiV2Diagnostics?.().registered === true && window.__acceleratorSaveDiagnostics?.().cloudStateLoaded === true, null, { timeout: 60000 });
    await page.waitForTimeout(1800);

    const diagnostics = await page.evaluate(() => window.__acceleratorAiV2Diagnostics());
    check(diagnostics.cloud.workspaceId === V2_WORKSPACE_ID, 'V2 connects only to the fixed isolated cloud workspace.');
    check(diagnostics.cloud.requiredWorkspaceId === V2_WORKSPACE_ID, 'Save diagnostics expose the required V2 workspace boundary.');
    check(saveCalls.length === 0, 'Loading V2 never writes cloud state.');
    check(diagnostics.toolNames.length === 5 && diagnostics.registered, 'All five WebMCP site tools register in a supported browser.');
    check(await page.locator('#accelerator-ai-v2-button').isVisible(), 'The AI V2 boundary and proposal drawer are visibly available.');

    const creatorSwitcher = page.locator('[data-action="switch-creator"]');
    check(await creatorSwitcher.count() === 1, 'The inherited creator switcher is available in V2.');
    await creatorSwitcher.selectOption({ index: 1 });
    await page.waitForTimeout(1200);
    check(await page.evaluate(() => state.view) === 'home', 'Switching creators returns V2 to Home.');
    check(saveCalls.length === 1 && saveCalls[0].p_workspace_id === V2_WORKSPACE_ID, 'A real dashboard edit saves only to the fixed V2 workspace.');

    const context = await page.evaluate(() => window.__qaRegisteredTools.accelerator_get_current_context.execute({}));
    check(context.ok && context.workspaceId === V2_WORKSPACE_ID, 'The context tool returns only verified V2 cloud data.');
    check(context.creator && context.creator.id, 'The context tool identifies the active creator.');

    const savesBeforeProposal = saveCalls.length;
    const proposal = await page.evaluate(() => window.__qaRegisteredTools.accelerator_stage_proposal.execute({
      title: 'Clarify the Month 1 proof target',
      target: 'Plan - Month 1',
      summary: 'The active plan needs one observable result that can be reviewed after four videos.',
      recommendation: 'Define the proof target as: [observable viewer behavior] improves across [four comparable videos].',
      evidence: ['Current plan is diagnosis-led.', 'The proposal must remain a draft until Blake reviews it.']
    }));
    check(proposal.ok && proposal.cloudStateChanged === false, 'The proposal tool explicitly reports that cloud state was not changed.');
    await page.waitForTimeout(600);
    check(saveCalls.length === savesBeforeProposal, 'Staging a proposal cannot trigger a cloud save.');
    check(await page.locator('#accelerator-ai-v2-drawer').getAttribute('open') !== null, 'A staged proposal opens the review drawer.');
    check(await page.locator('.ai-v2-card').count() === 1, 'The staged proposal is readable in the drawer without truncation.');

    const storage = await page.evaluate(() => ({
      v2Draft: !!localStorage.getItem('accelerator-ai-v2-proposal-drafts'),
      productionBackup: localStorage.getItem('accelerator-os-state-backup'),
      productionNative: localStorage.getItem('accelerator.mainline.v11.cleancore'),
      v2Backup: !!localStorage.getItem('accelerator-ai-v2-state-backup'),
      v2Native: !!localStorage.getItem('accelerator.ai-v2.mainline.v11.cleancore')
    }));
    check(storage.v2Draft && storage.v2Backup && storage.v2Native, 'V2 writes only its namespaced browser draft and backup keys.');
    check(storage.productionBackup === null && storage.productionNative === null, 'V2 never creates or rotates production browser keys.');
    await page.screenshot({ path: path.join(ROOT, 'qa/ai-v2-desktop.png'), fullPage: true });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const mobileErrors = [];
    mobile.on('pageerror', error => mobileErrors.push(error.message));
    const mobileSaves = await configurePage(mobile, [{ id: V2_WORKSPACE_ID, version: 19, name: 'Accelerator AI V2 Test' }]);
    await mobile.goto('http://127.0.0.1:' + address.port + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mobile.waitForFunction(() => window.__acceleratorAiV2Diagnostics?.().registered === true && window.__acceleratorSaveDiagnostics?.().cloudStateLoaded === true, null, { timeout: 60000 });
    await mobile.locator('#accelerator-ai-v2-button').click();
    const mobileBox = await mobile.locator('#accelerator-ai-v2-drawer').boundingBox();
    check(mobileBox && mobileBox.width <= 390 && mobileBox.height <= 844, 'The AI V2 drawer fits the mobile viewport.');
    check(mobileSaves.length === 0 && mobileErrors.length === 0, 'Mobile startup is read-only and has no runtime errors.');
    await mobile.screenshot({ path: path.join(ROOT, 'qa/ai-v2-mobile.png'), fullPage: true });

    const blocked = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const blockedSaves = await configurePage(blocked, [{ id: PROD_WORKSPACE_ID, version: 1337, name: 'Blake' }]);
    await blocked.goto('http://127.0.0.1:' + address.port + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await blocked.waitForFunction(() => window.__acceleratorAiV2Diagnostics?.().registered === true, null, { timeout: 60000 });
    await blocked.waitForTimeout(500);
    const blockedResult = await blocked.evaluate(async () => ({
      diagnostics: window.__acceleratorSaveDiagnostics(),
      context: await window.__qaRegisteredTools.accelerator_get_current_context.execute({})
    }));
    check(blockedResult.diagnostics.workspaceId === null && blockedResult.diagnostics.cloudStateLoaded === false, 'V2 fails closed when its isolated workspace is missing.');
    check(blockedResult.context.ok === false && blockedSaves.length === 0, 'Missing V2 access never falls back to production and never saves.');

    check(runtimeErrors.length === 0, 'Desktop V2 has no runtime or console errors.');
  } catch (error) {
    report.errors.push(error.message);
    console.error(error.stack || error);
  } finally {
    fs.writeFileSync(path.join(ROOT, 'qa/ai-v2-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (report.errors.length) process.exit(1);
})();
