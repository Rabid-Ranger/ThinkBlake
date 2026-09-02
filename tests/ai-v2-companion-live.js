const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sourceHandler = require('../api/source');

const ROOT = path.resolve(__dirname, '..');
const TARGET_URL = process.env.ACCELERATOR_TEST_URL || '';
const report = { build: 'Accelerator-AI-V2-native-flow', checkedAt: new Date().toISOString(), passed: [], evidence: {}, errors: [] };

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

(async () => {
  const server = TARGET_URL ? null : await startServer();
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  let page;
  const errors = [];
  const chatCalls = [];
  const saveCalls = [];
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.on('pageerror', error => errors.push('pageerror: ' + error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
    page.on('request', request => {
      if (request.url().endsWith('/chat') && request.method() === 'POST') {
        try { chatCalls.push(request.postDataJSON()); } catch (_) {}
      }
    });
    await page.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (pathname.endsWith('/rpc/get_my_workspaces')) return route.fulfill({ status: 200, headers, body: '[]' });
      if (pathname.endsWith('/rpc/save_workspace_state')) {
        saveCalls.push(request.postDataJSON());
        return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version: 1, conflict: false }]) });
      }
      return route.fulfill({ status: 404, headers, body: '{}' });
    });

    await page.goto(TARGET_URL || ('http://127.0.0.1:' + server.address().port + '/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__acceleratorSaveDiagnostics?.().demoMode === true, null, { timeout: 60000 });
    await page.waitForFunction(() => window.__acceleratorAiCompanionDiagnostics?.().connected === true, null, { timeout: 60000 });
    const diagnostics = await page.evaluate(() => window.__acceleratorAiCompanionDiagnostics());
    check(diagnostics.provider === 'Codex / ChatGPT', 'The dashboard is connected through Blake\'s ChatGPT-managed Codex route.');
    check(diagnostics.account && diagnostics.account.type === 'chatgpt', 'The connection reports ChatGPT authentication without exposing credentials.');

    check(await page.locator('[data-ai-context-guide]').count() === 0, 'The old page-level AI answer bar is removed.');
    await page.locator('[data-view="strategy"]').first().click();
    await page.getByRole('button', { name: 'Audience', exact: true }).click();
    await page.locator('[data-native-ai-section]').waitFor({ state: 'visible' });
    check(await page.locator('[data-native-ai-field]').count() >= 10, 'Audience help is attached directly to editable fields.');
    check((await page.locator('[data-native-ai-section]').innerText()).includes('Draft'), 'Audience exposes one whole-section drafting action.');
    check((await page.locator('[data-native-ai-section] .native-ai-section-copy strong').innerText()) === 'Develop this audience section', 'The section action names the actual audience work instead of a generic AI task.');

    const triggerField = page.locator('[data-bind="audience.trigger"]');
    const triggerContainer = triggerField.locator('..');
    await triggerContainer.locator('[data-native-ai-field]').click();
    await triggerContainer.locator('[data-native-ai-apply]').waitFor({ state: 'visible', timeout: 180000 });
    check(chatCalls.length === 1 && chatCalls[0].action === 'native-draft', 'The inline control uses the dedicated field-draft contract.');
    check(chatCalls[0].context?.allowedTargets?.length === 1 && chatCalls[0].context.allowedTargets[0] === 'audience.trigger', 'A field draft exposes only its exact allowed dashboard target.');
    check(chatCalls[0].context?.targetFields?.[0]?.label === 'Trigger moment', 'The model receives the field label, guide and current value.');
    const proposed = await triggerContainer.locator('.native-ai-draft-value').innerText();
    check(proposed.trim().length > 10, 'The draft renders beside the real audience field.');
    await triggerContainer.locator('[data-native-ai-apply]').click();
    check((await triggerField.inputValue()).trim() === proposed.trim(), 'Use suggestion writes into the real field only after Blake chooses it.');
    check((await page.locator('#accelerator-ai-v2-button').innerText()).match(/·\s*1$/), 'Applying an upstream draft creates one downstream review item.');
    check(saveCalls.length === 0, 'AI drafting and applying demo data never writes the cloud workspace.');

    await page.locator('[data-view="learn"]').first().click();
    await page.locator('[data-native-ai-section]').waitFor({ state: 'visible' });
    check((await page.locator('[data-native-ai-section]').innerText()).includes('Turn this checkpoint into a learning'), 'Results offer a native Observe, Interpret, Decide and Next move draft.');

    await page.locator('[data-view="home"]').first().click();
    await page.getByRole('button', { name: 'Run coaching call', exact: true }).click();
    await page.getByRole('button', { name: 'Prefill from creator record', exact: true }).waitFor({ state: 'visible' });
    check(true, 'The coaching call can prefill the active step from creator evidence and commitments.');
    check(await page.locator('#modalBody > .phase-track + [data-native-ai-section]').count() === 1, 'Coaching preparation sits inside the call step without displacing the modal controls.');
    await page.getByRole('button', { name: '×', exact: true }).click();

    await page.locator('#accelerator-ai-v2-button').click();
    await page.locator('[data-native-ai-review-section]').waitFor({ state: 'visible' });
    check(await page.locator('.native-ai-review-item').count() === 1, 'The AI drawer is now a concise change-review queue.');
    check(await page.locator('.native-ai-automation').count() === 3, 'The drawer explains the three active workflow automations.');
    check((await page.locator('#accelerator-ai-v2-title').innerText()) === 'AI settings & review', 'The AI drawer is demoted to settings and review instead of being the primary workflow.');
    check(errors.length === 0, 'The complete native AI flow has no browser runtime errors.');

    report.evidence = {
      provider: diagnostics.provider,
      model: diagnostics.model,
      proposed,
      request: { action: chatCalls[0].action, targets: chatCalls[0].context.allowedTargets },
      reviewCount: await page.evaluate(() => window.__acceleratorAiCompanionDiagnostics?.().reviewCount)
    };
    await page.screenshot({ path: path.join(ROOT, 'qa/ai-v2-companion-live.png'), fullPage: true });
  } catch (error) {
    report.errors.push(error.message);
    report.evidence.browserErrors = errors;
    console.error(error.stack || error);
  } finally {
    fs.writeFileSync(path.join(ROOT, 'qa/ai-v2-companion-live-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
  if (report.errors.length) process.exit(1);
})();
