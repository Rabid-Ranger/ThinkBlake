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
    const minimumActions = { videos: 2 };
    for (const surface of surfaces) {
      await page.locator('[data-view="' + surface + '"]').first().click();
      await page.locator('[data-ai-context-guide]').waitFor({ state: 'visible' });
      check(await page.locator('[data-ai-context-action]').count() >= (minimumActions[surface] || 3), 'The ' + surface + ' page exposes its own creator-aware AI decisions.');
    }

    await page.locator('[data-view="strategy"]').first().click();
    await page.getByRole('button', { name: 'Message', exact: true }).click();
    await page.locator('[data-ai-context-action="message-strengthen"]').waitFor({ state: 'visible' });
    check(await page.locator('[data-ai-context-action="message-strengthen"]').count() === 1, 'The Strategy assist follows the active Message decision instead of showing a generic prompt.');
    await page.locator('[data-ai-context-action="message-strengthen"]').click();
    await page.locator('[data-ai-context-guide] [data-ai-companion-stage]').waitFor({ state: 'visible', timeout: 180000 });
    const answer = await page.locator('[data-ai-context-guide] .ai-assist-recommendation').first().textContent();
    check(Boolean(answer && answer.trim().length > 40), 'A real AI answer renders directly inside the Strategy page.');
    check(await page.locator('[data-ai-context-guide] .ai-proposal-template').count() === 1, 'Formula requests include a reusable template.');
    check(await page.locator('[data-ai-context-guide] .ai-assist-unit').filter({ hasText: 'Filled example' }).count() === 1, 'Formula requests also include a filled creator-specific example.');
    check(await page.locator('[data-ai-context-guide] .ai-assist-options').count() === 0, 'A message formula does not include unrelated option or report sections.');
    check(chatCalls.length === 1 && chatCalls[0].surface === 'strategy' && chatCalls[0].action === 'message-strengthen', 'The request identifies the exact dashboard surface and decision type.');
    check(chatCalls[0].context?.contextProfile === 'message', 'The request uses the narrow Message context profile.');
    check(Boolean(chatCalls[0].context?.relevant?.audience), 'The AI request carries the audience evidence inherited by the message.');
    check(Boolean(chatCalls[0].context?.relevant?.message), 'The AI request carries the saved message decisions.');
    check(!('portfolio' in (chatCalls[0].context?.relevant || {})), 'The Message request excludes unrelated portfolio data.');
    report.evidence.answer = answer;
    report.evidence.request = { surface: chatCalls[0].surface, action: chatCalls[0].action, creator: chatCalls[0].context?.relevant?.creator?.name, profile: chatCalls[0].context?.contextProfile };

    await page.locator('[data-ai-context-guide] [data-ai-companion-stage]').click();
    await page.locator('[data-ai-context-guide] .ai-assist-meta').filter({ hasText: 'Kept for review' }).waitFor({ state: 'visible' });
    await page.locator('#accelerator-ai-v2-button').click();
    await page.locator('.ai-v2-card').first().waitFor({ state: 'visible', timeout: 10000 });
    check(await page.locator('.ai-v2-card').count() >= 1, 'The inline AI answer stages as a review draft in AI Desk.');
    check(saveCalls.length === 0, 'Generating and staging the AI answer makes no cloud save request.');
    check(await page.evaluate(() => Boolean(localStorage.getItem('accelerator-ai-v2-proposal-drafts'))), 'The staged result stays in the V2 browser-only draft key.');

    await page.evaluate(() => document.getElementById('accelerator-ai-v2-drawer')?.close());
    await page.locator('[data-view="videos"]').first().click();
    await page.locator('[data-action="open-video"]').first().click();
    await page.locator('[data-ai-context-guide]').waitFor({ state: 'visible' });
    check(await page.locator('[data-ai-context-action="package-directions"]').count() === 1, 'The video builder exposes package-specific help on its planner surface.');
    const plannerRequest = await page.evaluate(() => {
      const diagnostic = window.__acceleratorAiCompanionDiagnostics?.();
      return diagnostic?.contextualSurfaces?.includes('planner');
    });
    check(plannerRequest === true, 'The planner is a first-class AI surface and cannot fall back to Home prompts.');

    await page.locator('[data-view="learn"]').first().click();
    const learnSelect = page.locator('main select').first();
    if (await learnSelect.count()) await learnSelect.selectOption({ index: 0 });
    const beforeMissingCheck = chatCalls.length;
    const missingResponsePromise = page.waitForResponse(response => response.url().endsWith('/chat') && response.request().method() === 'POST');
    await page.locator('[data-ai-context-action="results-interpret"]').click();
    const missingPayload = await (await missingResponsePromise).json();
    await page.locator('[data-ai-context-guide] .ai-assist-card[data-status="needs_input"]').waitFor({ state: 'visible', timeout: 10000 });
    check(chatCalls.length === beforeMissingCheck + 1, 'The missing-evidence check reaches only the local companion gate.');
    check(missingPayload.route === 'dashboard' && missingPayload.model === 'No AI call', 'Missing results are blocked before any model is invoked.');
    const missingResponse = await page.locator('[data-ai-context-guide]').innerText();
    check(missingResponse.includes('DASHBOARD CHECK') && missingResponse.includes('Add the missing evidence first'), 'Missing results produce an instant dashboard check instead of a fabricated interpretation.');
    check(await page.locator('[data-ai-context-guide] .ai-proposal-template').count() === 0, 'Missing results never produce an irrelevant template.');

    if (await learnSelect.locator('option').count() >= 3) {
      await learnSelect.selectOption({ index: 2 });
      await page.waitForFunction(() => document.querySelector('main select')?.selectedIndex === 2);
      const resultResponsePromise = page.waitForResponse(response => response.url().endsWith('/chat') && response.request().method() === 'POST', { timeout: 210000 });
      await page.locator('[data-ai-context-action="results-interpret"]').click();
      const resultPayload = await (await resultResponsePromise).json();
      check(resultPayload.ok === true && resultPayload.responseType === 'learning', 'Recorded results use the dedicated learning response contract.');
      check(resultPayload.proposal?.status === 'ready', 'Recorded results are interpreted with explicit limitations instead of being refused after passing the evidence gate.');
      await page.locator('[data-ai-context-guide] .ai-assist-learning').waitFor({ state: 'visible', timeout: 10000 });
      check(await page.locator('[data-ai-context-guide] .ai-assist-unit').filter({ hasText: 'Observation' }).count() === 1, 'Recorded results render as an explicit observation.');
      check(await page.locator('[data-ai-context-guide] .ai-assist-unit').filter({ hasText: 'Interpretation' }).count() === 1, 'Recorded results keep interpretation separate from observation.');
      check(await page.locator('[data-ai-context-guide] .ai-assist-unit').filter({ hasText: 'Decision' }).count() === 1, 'Recorded results end in a responsible decision.');
      check(await page.locator('[data-ai-context-guide] .ai-proposal-template').count() === 0, 'A results interpretation never renders a formula template.');
    }

    await page.locator('[data-view="calendar"]').first().click();
    await page.locator('[data-ai-context-action="review-timing"]').click();
    await page.locator('[data-ai-context-guide] .ai-assist-card[data-status="ready"] .ai-assist-meta').filter({ hasText: 'FAST' }).waitFor({ state: 'visible', timeout: 180000 });
    const fastMeta = await page.locator('[data-ai-context-guide] .ai-assist-meta').innerText();
    check(fastMeta.includes('GPT-5.6-LUNA'), 'Automatic routing sends a narrow timing check to the available fast Codex model.');
    report.evidence.fastRoute = fastMeta;
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
