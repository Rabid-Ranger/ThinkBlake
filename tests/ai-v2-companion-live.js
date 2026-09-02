const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sourceHandler = require('../api/source');

const ROOT = path.resolve(__dirname, '..');
const TARGET_URL = process.env.ACCELERATOR_TEST_URL || '';
const report = { build: 'Accelerator-AI-V2-companion-live', checkedAt: new Date().toISOString(), passed: [], evidence: {}, errors: [] };

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
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const errors = [];
  let page = null;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    if (TARGET_URL.startsWith('https://') && process.env.ACCELERATOR_GRANT_LOCAL_NETWORK === '1') {
      const session = await context.newCDPSession(page);
      const target = await session.send('Target.getTargetInfo');
      await session.send('Browser.grantPermissions', {
        origin: new URL(TARGET_URL).origin,
        permissions: ['loopbackNetwork'],
        browserContextId: target.targetInfo.browserContextId
      });
    }
    page.on('pageerror', error => errors.push('pageerror: ' + error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
    const saveCalls = [];
    const chatCalls = [];
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

    const pageUrl = TARGET_URL || ('http://127.0.0.1:' + server.address().port + '/');
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__acceleratorSaveDiagnostics?.().demoMode === true, null, { timeout: 60000 });
    await page.locator('#accelerator-ai-v2-button').click();
    await page.waitForFunction(() => window.__acceleratorAiCompanionDiagnostics?.().connected === true, null, { timeout: 60000 });
    const diagnostics = await page.evaluate(() => window.__acceleratorAiCompanionDiagnostics());
    check(diagnostics.provider === 'Codex / ChatGPT', 'The browser sees the real Codex / ChatGPT companion.');
    check(diagnostics.model === 'gpt-5.6-sol', 'The browser shows the actual configured Codex model.');
    check(diagnostics.account && diagnostics.account.type === 'chatgpt', 'The browser confirms ChatGPT-managed authentication without receiving credentials.');

    check((await page.locator('#accelerator-ai-v2-button').textContent()).includes('Codex / ChatGPT'), 'The AI control visibly reports the active Codex / ChatGPT route.');
    await page.evaluate(() => document.getElementById('accelerator-ai-v2-drawer')?.close());

    const surfaces = ['home', 'strategy', 'plan', 'videos', 'learn', 'framework', 'creators', 'calendar', 'library'];
    for (const surface of surfaces) {
      await page.locator('[data-view="' + surface + '"]').first().click();
      await page.locator('[data-ai-context-guide]').waitFor({ state: 'visible' });
      check(await page.locator('[data-ai-context-action]').count() >= 3, 'The ' + surface + ' page exposes its own creator-aware AI decisions.');
    }

    await page.locator('[data-view="strategy"]').first().click();
    await page.locator('[data-ai-context-action="message-strengthen"]').click();
    await page.locator('[data-ai-context-guide] [data-ai-companion-stage]').waitFor({ state: 'visible', timeout: 180000 });
    const answer = await page.locator('[data-ai-context-guide] .ai-companion-answer > p').first().textContent();
    check(Boolean(answer && answer.trim().length > 40), 'A real AI answer renders directly inside the Strategy page.');
    check(await page.locator('[data-ai-context-guide] .ai-proposal-template').count() === 1, 'Formula requests include a reusable template.');
    check(await page.locator('[data-ai-context-guide] .ai-proposal-block').filter({ hasText: 'Filled example' }).count() === 1, 'Formula requests also include a filled creator-specific example.');
    check(chatCalls.length === 1 && chatCalls[0].surface === 'strategy' && chatCalls[0].action === 'message-strengthen', 'The request identifies the exact dashboard surface and decision type.');
    check(Boolean(chatCalls[0].context?.decisionTrail?.creatorStrategy?.audience), 'The AI request carries the creator strategy and audience context.');
    check(Boolean(chatCalls[0].context?.decisionTrail?.currentPlan), 'The AI request carries the diagnosis and active plan context.');
    check(Array.isArray(chatCalls[0].context?.portfolio), 'The AI request carries portfolio context for cross-creator decisions.');
    report.evidence.answer = answer;
    report.evidence.request = { surface: chatCalls[0].surface, action: chatCalls[0].action, creator: chatCalls[0].context?.creator?.name };

    await page.locator('[data-ai-context-guide] [data-ai-companion-stage]').click();
    await page.locator('[data-ai-context-guide] .ai-context-staged').waitFor({ state: 'visible' });
    await page.locator('#accelerator-ai-v2-button').click();
    await page.locator('.ai-v2-card').first().waitFor({ state: 'visible', timeout: 10000 });
    check(await page.locator('.ai-v2-card').count() >= 1, 'The inline AI answer stages as a review draft in AI Desk.');
    check(saveCalls.length === 0, 'Generating and staging the AI answer makes no cloud save request.');
    check(await page.evaluate(() => Boolean(localStorage.getItem('accelerator-ai-v2-proposal-drafts'))), 'The staged result stays in the V2 browser-only draft key.');
    check(errors.length === 0, 'The complete browser flow has no runtime or console errors.');
    await page.screenshot({ path: path.join(ROOT, 'qa/ai-v2-companion-live.png'), fullPage: true });
  } catch (error) {
    report.errors.push(error.message);
    report.evidence.browserErrors = errors;
    if (page) {
      report.evidence.connection = await page.evaluate(() => window.__acceleratorAiCompanionDiagnostics?.() || null).catch(() => null);
    }
    console.error(error.stack || error);
    console.error(JSON.stringify(report.evidence, null, 2));
  } finally {
    fs.writeFileSync(path.join(ROOT, 'qa/ai-v2-companion-live-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
  if (report.errors.length) process.exit(1);
})();
