const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sourceHandler = require('../api/source');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PDF = '/Users/blakerice/Documents/Codex/2026-08-28/th/outputs/Accelerator-OS-V16.3.2-PDF-Design-QA.pdf';
const report = {
  build: 'V16.3.2-safe-save-dashboard-pdf',
  checkedAt: new Date().toISOString(),
  passed: [],
  errors: [],
  saveCalls: []
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

const waitUntil = async (predicate, timeout = 10000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('Timed out waiting for the save queue.');
};

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/source')) {
      const response = {
        setHeader: (name, value) => res.setHeader(name, value),
        status: code => ({
          send: body => {
            res.statusCode = code;
            res.end(body);
          }
        })
      };
      sourceHandler(req, response);
      return;
    }

    const file = req.url === '/favicon.svg' ? 'favicon.svg' : 'index.html';
    const type = file.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8';
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.end(fs.readFileSync(path.join(ROOT, file)));
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await startServer();
  const address = server.address();
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  let version = 7;
  let activeSaves = 0;
  let maxConcurrentSaves = 0;
  let failNextSave = false;

  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });

  await page.addInitScript(() => {
    localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify({
      access_token: 'qa-access-token',
      refresh_token: 'qa-refresh-token'
    }));
  });

  await page.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'content-type': 'application/json'
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors, body: '' });
      return;
    }

    if (url.pathname.endsWith('/rpc/get_my_workspaces')) {
      await route.fulfill({
        status: 200,
        headers: cors,
        body: JSON.stringify([{ id: '11111111-1111-4111-8111-111111111111', version }])
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/get_workspace_state')) {
      await route.fulfill({
        status: 200,
        headers: cors,
        body: JSON.stringify([{ version, state: {} }])
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/save_workspace_state')) {
      const body = request.postDataJSON();
      const call = {
        expectedVersion: body.p_expected_version,
        creatorName: body.p_state?.creators?.[0]?.name || '',
        startedAt: Date.now()
      };
      report.saveCalls.push(call);
      activeSaves += 1;
      maxConcurrentSaves = Math.max(maxConcurrentSaves, activeSaves);
      await new Promise(resolve => setTimeout(resolve, report.saveCalls.length === 1 ? 650 : 80));

      if (failNextSave) {
        failNextSave = false;
        activeSaves -= 1;
        call.status = 503;
        await route.fulfill({ status: 503, headers: cors, body: JSON.stringify({ message: 'temporary QA failure' }) });
        return;
      }

      version += 1;
      activeSaves -= 1;
      call.status = 200;
      call.returnedVersion = version;
      await route.fulfill({
        status: 200,
        headers: cors,
        body: JSON.stringify([{ version, updated_at: new Date().toISOString(), conflict: false }])
      });
      return;
    }

    await route.fulfill({ status: 404, headers: cors, body: '{}' });
  });

  try {
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof window.__acceleratorSaveDiagnostics === 'function' && typeof window.__v163BuildPdf === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(500);

    check(await page.title() === 'Accelerator OS V16.3.2 - Safe Saving + Dashboard PDFs', 'The V16.3.2 application source loads without a startup error.');
    check((await page.evaluate(() => window.__acceleratorSaveDiagnostics())).remoteVersion === 7, 'The save bridge reads the current cloud version before allowing writes.');
    check(report.saveCalls.length === 0, 'Loading a software update does not write or replace workspace data.');

    const firstEditAt = Date.now();
    await page.evaluate(() => {
      state.creators[0].name = 'Save Queue QA One';
      save();
      render();
    });
    await page.waitForTimeout(180);
    const localOne = await page.evaluate(() => JSON.parse(localStorage.getItem('accelerator-os-state-backup')).creators[0].name);
    check(localOne === 'Save Queue QA One', 'The browser backup captures an edit immediately.');

    await waitUntil(() => report.saveCalls.length >= 1);
    check(report.saveCalls[0].startedAt - firstEditAt < 900, 'The first cloud save starts in under one second.');

    await page.evaluate(() => {
      state.creators[0].name = 'Save Queue QA Two';
      save();
      render();
    });
    await waitUntil(() => report.saveCalls.length >= 2 && report.saveCalls[1].status === 200, 10000);
    await page.waitForTimeout(160);
    check(maxConcurrentSaves === 1, 'Rapid edits are serialized so older responses cannot overwrite newer data.');
    check(report.saveCalls[0].expectedVersion === 7 && report.saveCalls[1].expectedVersion === 8, 'Queued saves use optimistic versions in order.');
    check(report.saveCalls[1].creatorName === 'Save Queue QA Two', 'The newest queued state is the state saved last.');

    failNextSave = true;
    await page.evaluate(() => {
      state.creators[0].name = 'Save Queue QA Retry';
      save();
      render();
    });
    await waitUntil(() => report.saveCalls.some(call => call.status === 503), 10000);
    await waitUntil(() => report.saveCalls.filter(call => call.creatorName === 'Save Queue QA Retry' && call.status === 200).length === 1, 15000);
    await page.waitForTimeout(160);
    const diagnostics = await page.evaluate(() => window.__acceleratorSaveDiagnostics());
    check(diagnostics.pending === false && diagnostics.saveBlocked === false, 'A temporary cloud error retries without requiring another edit.');
    check(diagnostics.localBackup === true, 'The stable browser backup remains available across application versions.');

    const markdown = `# Jordan Lee - 90-Day Creator Handoff

## Working Diagnosis
Packaging / weak click

Audience: Golfers 55-72 who want more consistency, distance, and enjoyment without rebuilding their swing.
Business goal: Qualified coaching leads
Capacity: 4 videos per month
Active focus: Make the click obvious

## Month 1 - ACTIVE

### Coaching focus
Translate useful ideas into one clear promise and one immediately legible visual.

- Choose one exact viewer tension before writing a title.
- Build three title and thumbnail directions around the same promise.
- Confirm that the opening line pays off the click immediately.

### Video portfolio
Mix: 2 Reach | 1 Trust | 1 Convert
Decision: Keep the strongest qualified-click pattern and carry it into Month 2.

## What to favor

Video types: How-To, Mistakes, Start Here, Comparison
Learning question: Which promise and visual pattern earns the strongest qualified click?

## Month 2

### Coaching focus
Turn the strongest Month 1 package into a repeatable series without repeating the same video.

- Repeat the viewer problem, not the surface phrasing.
- Preserve proof and specificity.
- Review click quality before expanding.

## Month 3

### Coaching focus
Connect proven attention to the next best viewer decision.

Pathway: One relevant next video plus one low-friction business action.
Review: Repeat, Repackage, Expand, Modify, or Stop.

## Coach handoff

Owner: Coach and creator
Next decision: Select the Month 1 slate and confirm the first package.
Status: Ready to use`;

    const bytes = await page.evaluate(async payload => {
      const blob = window.__v163BuildPdf(payload.title, payload.text, payload.creator);
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { title: 'Jordan Lee - 90-Day Creator Handoff', text: markdown, creator: 'Jordan Lee' });

    fs.mkdirSync(path.dirname(OUTPUT_PDF), { recursive: true });
    fs.writeFileSync(OUTPUT_PDF, Buffer.from(bytes));
    check(Buffer.from(bytes).subarray(0, 8).toString() === '%PDF-1.4', 'The dashboard creates a valid PDF download.');
    check(bytes.length > 8000, 'The PDF contains the complete designed handoff rather than a blank shell.');
    const unexpectedRuntimeErrors = runtimeErrors.filter(message => !/503 \(Service Unavailable\)/.test(message));
    check(unexpectedRuntimeErrors.length === 0, `No unexpected browser runtime errors occurred. ${unexpectedRuntimeErrors.join(' | ')}`);
  } catch (error) {
    if (!report.errors.includes(error.message)) report.errors.push(error.message);
    console.error(error.stack || error);
  } finally {
    fs.mkdirSync(path.join(ROOT, 'qa'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'qa', 'v1632-persistence-pdf-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  if (report.errors.length) process.exit(1);
})();
