const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD_URL = process.env.ACCELERATOR_TEST_URL || 'http://127.0.0.1:4873/dashboard';
const report = { build: 'Accelerator-AI-V2-provider-switch', checkedAt: new Date().toISOString(), passed: [], evidence: {}, errors: [] };

function check(value, message) {
  if (!value) throw new Error(message);
  report.passed.push(message);
  console.log('PASS: ' + message);
}

function companionPost(pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const request = http.request({
      hostname: '127.0.0.1',
      port: 4873,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Accelerator-Companion': 'v1',
        'Sec-Fetch-Site': 'same-origin'
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (response.statusCode >= 400) reject(new Error(parsed.error || 'Companion request failed.'));
        else resolve(parsed);
      });
    });
    request.on('error', reject);
    request.end(payload);
  });
}

function startMockModelServer() {
  const evidence = { modelRequests: 0, chatRequests: 0, lastPrompt: '', lastModel: '' };
  const proposal = {
    answer: 'This answer came from the selected local test model and used the current creator context.',
    title: 'Local model route verified',
    target: 'Current creator',
    summary: 'The custom OpenAI-compatible route answered inside the Strategy page.',
    recommendation: 'Keep Codex as default and use this route when a local fallback is useful.',
    decision: 'The local route is usable.',
    rationale: 'The dashboard selected it explicitly and received a structured creator-aware response.',
    nextSteps: ['Switch back to Codex after the test.'],
    watchFor: 'A local server must remain running to stay available.',
    template: '[AUDIENCE] needs [DECISION] because [EVIDENCE].',
    example: 'Dale needs a clearer click promise because packaging is the active constraint.',
    evidence: ['The request included the current dashboard context.'],
    uncertainties: []
  };
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      evidence.modelRequests += 1;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ data: [{ id: 'accelerator-local-test', name: 'Accelerator local test' }] }));
    }
    if (request.method === 'POST' && request.url === '/v1/chat/completions') {
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        evidence.chatRequests += 1;
        evidence.lastModel = body.model || '';
        evidence.lastPrompt = body.messages && body.messages[0] && body.messages[0].content || '';
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: JSON.stringify(proposal) } }] }));
      });
      return;
    }
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end('{}');
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, evidence })));
}

(async () => {
  const mock = await startMockModelServer();
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  let page;
  try {
    await companionPost('/providers/select', { route: 'codex' });
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://pqggobwpazihraeqvspc.supabase.co/**', route => route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{}' }));
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__acceleratorSaveDiagnostics?.().demoMode === true, null, { timeout: 60000 });
    await page.locator('#accelerator-ai-v2-button').click();
    await page.waitForFunction(() => window.__acceleratorAiCompanionDiagnostics?.().connected === true, null, { timeout: 60000 });

    check(await page.locator('[data-ai-provider-card="codex"] [data-ai-provider-model] option').count() >= 2, 'AI Desk lists the real Codex models available to this ChatGPT account.');
    check(await page.locator('[data-ai-provider-card="lmstudio"] [data-ai-provider-save]').count() === 1, 'AI Desk provides an LM Studio setup control.');
    check(await page.locator('[data-ai-provider-card="mlx"] [data-ai-provider-save]').count() === 1, 'AI Desk provides an MLX setup control.');
    check(await page.locator('[data-ai-provider-card="custom"] [data-ai-provider-save]').count() === 1, 'AI Desk provides a custom OpenAI-compatible server setup control.');

    await page.locator('[data-ai-provider-card="custom"] [data-ai-provider-url]').fill('http://127.0.0.1:' + mock.server.address().port + '/v1');
    await page.locator('[data-ai-provider-card="custom"] [data-ai-provider-save]').click();
    await page.waitForFunction(() => window.__acceleratorAiCompanionDiagnostics?.().routes?.custom?.connected === true, null, { timeout: 30000 });
    check(mock.evidence.modelRequests >= 1, 'Test & save verifies the custom server and discovers its loaded model.');

    await page.locator('[data-ai-provider-card="custom"] [data-ai-provider-select]').click();
    await page.waitForFunction(() => window.__acceleratorAiCompanionDiagnostics?.().activeRoute === 'custom', null, { timeout: 30000 });
    const selected = await page.evaluate(() => window.__acceleratorAiCompanionDiagnostics());
    check(selected.route === 'custom' && selected.model === 'accelerator-local-test', 'The dashboard clearly switches to the selected custom model route.');

    await page.evaluate(() => document.getElementById('accelerator-ai-v2-drawer')?.close());
    await page.locator('[data-view="strategy"]').first().click();
    await page.locator('[data-ai-context-action="message-strengthen"]').click();
    await page.locator('[data-ai-context-guide] [data-ai-companion-stage]').waitFor({ state: 'visible', timeout: 30000 });
    check((await page.locator('[data-ai-context-guide] .ai-companion-answer h4').textContent()).includes('Local model route verified'), 'The selected local model answers through the same contextual Strategy workflow.');
    check(mock.evidence.chatRequests === 1 && mock.evidence.lastModel === 'accelerator-local-test', 'The request was sent to the selected local model.');
    check(mock.evidence.lastPrompt.includes('Evan Cole Golf') && mock.evidence.lastPrompt.includes('CURRENT DASHBOARD SURFACE:\nstrategy'), 'The local route receives the same creator and decision context as Codex.');
    check(errors.length === 0, 'Provider setup, switching and local generation create no browser errors.');
    report.evidence = {
      selected,
      mock: {
        modelRequests: mock.evidence.modelRequests,
        chatRequests: mock.evidence.chatRequests,
        lastModel: mock.evidence.lastModel,
        promptIncludedCreator: mock.evidence.lastPrompt.includes('Evan Cole Golf'),
        promptIncludedSurface: mock.evidence.lastPrompt.includes('CURRENT DASHBOARD SURFACE:\nstrategy')
      }
    };
  } catch (error) {
    report.errors.push(error.message);
    console.error(error.stack || error);
  } finally {
    try { await companionPost('/providers/select', { route: 'codex' }); } catch (error) { report.errors.push('Could not restore Codex: ' + error.message); }
    try { await companionPost('/providers/disable', { route: 'custom' }); } catch (error) { report.errors.push('Could not remove the test server: ' + error.message); }
    fs.writeFileSync(path.join(ROOT, 'qa/ai-v2-provider-switch-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    await new Promise(resolve => mock.server.close(resolve));
  }
  if (report.errors.length) process.exit(1);
})();
