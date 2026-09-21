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
  warnings: [],
  errors: [],
  measurements: {},
  routes: {}
};

const pass = message => { report.passed.push(message); console.log(`PASS: ${message}`); };
const check = (value, message) => {
  if (!value) { report.errors.push(message); throw new Error(message); }
  pass(message);
};

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/source')) {
      const response = {
        setHeader: (name, value) => res.setHeader(name, value),
        status: code => ({ send: body => { res.statusCode = code; res.end(body); } })
      };
      sourceHandler(req, response);
      return;
    }
    const requestPath=new URL(req.url,'http://localhost').pathname;
    const file=requestPath==='/favicon.svg'?'favicon.svg':/^(analytics|ai|ui)\/[\w-]+\.js$/.test(requestPath.slice(1))?requestPath.slice(1):'index.html';
    res.statusCode = 200;
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(ROOT, file)));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function literalActions(source) {
  return [...new Set([...source.matchAll(/data-action="([a-zA-Z0-9_-]+)"/g)].map(match => match[1]))].sort();
}

function accountedActions(source, actions) {
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const specialized = new Set(['delete-creator', 'guide-search', 'learn-video', 'switch-creator', 'v16240-use-hook-formula']);
  const mapped = new Set();
  for (const match of source.matchAll(/(?:const\s+)?POP\s*=\s*\{([\s\S]*?)\};/g)) {
    for (const key of match[1].matchAll(/['"]?([a-zA-Z0-9_-]+)['"]?\s*:/g)) mapped.add(key[1]);
  }
  return actions.filter(action => {
    if (specialized.has(action)) return true;
    if (mapped.has(action)) return true;
    const name = escape(action);
    return new RegExp(`(?:a|t\\.dataset\\.action|button\\.dataset\\.action)\\s*===\\s*['"]${name}['"]`).test(source) ||
      new RegExp(`['"]${name}['"]\\s*:`).test(source);
  });
}

(async () => {
  const server = await startServer();
  const address = server.address();
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const runtimeErrors = [];
  let version = 41;
  let saveCount = 0;
  const saveCalls = [];

  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });
  await page.addInitScript(() => {
    localStorage.setItem('sb-pqggobwpazihraeqvspc-auth-token', JSON.stringify({
      access_token: 'full-qa-access-token',
      refresh_token: 'full-qa-refresh-token'
    }));
  });
  await page.route('https://pqggobwpazihraeqvspc.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname.endsWith('/rpc/get_my_workspaces')) return route.fulfill({ status: 200, headers, body: JSON.stringify([{ id: '22222222-2222-4222-8222-222222222222', version }]) });
    if (url.pathname.endsWith('/rpc/get_workspace_state')) return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version, state: {} }]) });
    if (url.pathname.endsWith('/rpc/save_workspace_state')) {
      saveCount += 1;
      saveCalls.push({ at: Date.now(), body: request.postDataJSON() });
      version += 1;
      return route.fulfill({ status: 200, headers, body: JSON.stringify([{ version, updated_at: new Date().toISOString(), conflict: false }]) });
    }
    return route.fulfill({ status: 404, headers, body: '{}' });
  });

  try {
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof window.Accel === 'object' && typeof window.__acceleratorSaveDiagnostics === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(650);

    check(/^Accelerator OS/.test(await page.title()), 'The complete V16.3.6 dashboard loads.');
    const startupDiagnostics = await page.evaluate(() => window.__acceleratorSaveDiagnostics());
    report.measurements.startupDiagnostics = startupDiagnostics;
    report.measurements.startupSaveCalls = saveCalls;
    check(saveCount === 0, `A release load remains read-only and does not write client data. Observed writes: ${saveCount}; source: ${startupDiagnostics.lastCaptureSource || 'none'}`);
    check(await page.locator('link[rel="icon"]').count() === 1, 'The dashboard favicon is present.');

    const source = await (await fetch(`http://127.0.0.1:${address.port}/api/source`)).text();
    const actions = literalActions(source);
    const handled = accountedActions(source, actions);
    const unaccounted = actions.filter(action => !handled.includes(action));
    report.measurements.actionCount = actions.length;
    report.measurements.unaccountedActions = unaccounted;
    check(actions.length >= 140, `The source exposes the expected complete interaction surface (${actions.length} actions).`);
    check(unaccounted.length === 0, `Every literal dashboard action has a matching handler or formula mapping. Missing: ${unaccounted.join(', ')}`);

    const inspectHeader = async width => {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      return page.evaluate(() => {
        const status = document.querySelector('[data-save-label]');
        const selector = document.querySelector('.creator-select');
        const avatar = document.querySelector('.avatar');
        const top = document.querySelector('.topbar');
        const rect = node => node ? node.getBoundingClientRect() : null;
        return {
          bodyOverflow: document.documentElement.scrollWidth - innerWidth,
          status: status ? { text: status.textContent.trim(), clientWidth: status.clientWidth, scrollWidth: status.scrollWidth, rect: rect(status), display: getComputedStyle(status).display } : null,
          selector: rect(selector), avatar: rect(avatar), top: rect(top)
        };
      });
    };

    for (const width of [1500, 1280, 820]) {
      const header = await inspectHeader(width);
      report.measurements[`header${width}`] = header;
      check(header.bodyOverflow <= 1, `The ${width}px dashboard has no page-level horizontal overflow.`);
      check(header.status && header.status.scrollWidth <= header.status.clientWidth + 1 && header.status.display !== 'none', `The full save status remains visible at ${width}px.`);
      if (header.avatar && header.avatar.width > 0) check(Math.abs(header.avatar.width - header.avatar.height) <= 1, `The BR account badge stays circular at ${width}px.`);
      if (header.avatar && header.avatar.width > 0) check(header.avatar.right <= width + 1, `The BR account badge remains inside the viewport at ${width}px.`);
    }

    await page.setViewportSize({ width: 1500, height: 900 });
    const saveStates = [
      'Saving…',
      'Saved just now',
      'Cloud connected',
      'Saved in this browser',
      'Offline - local backup safe',
      'Cloud save failed - retrying; local backup safe',
      'Cloud sign-in required - local backup safe',
      'Cloud unavailable - local backup safe',
      'Cloud changed elsewhere - refresh before saving',
      'Cloud save blocked - data protected'
    ];
    const stableHeader = await page.evaluate(labels => {
      const status = document.querySelector('[data-save-label]');
      const text = status.querySelector('[data-save-text]');
      const nav = document.querySelector('.nav');
      return labels.map(label => {
        text.textContent = label;
        status.title = label;
        const navRect = nav.getBoundingClientRect();
        const statusRect = status.getBoundingClientRect();
        return {
          label,
          navLeft: navRect.left,
          navCenter: navRect.left + navRect.width / 2,
          statusWidth: statusRect.width,
          statusText: text.textContent,
          statusTitle: status.title,
          overflow: getComputedStyle(status).overflow
        };
      });
    }, saveStates);
    report.measurements.stableHeader = stableHeader;
    const navLefts = stableHeader.map(item => item.navLeft);
    const navCenters = stableHeader.map(item => item.navCenter);
    const statusWidths = stableHeader.map(item => item.statusWidth);
    check(Math.max(...navLefts) - Math.min(...navLefts) <= 0.25 && Math.max(...navCenters) - Math.min(...navCenters) <= 0.25, 'The main navigation stays fixed while every save-state message changes.');
    check(Math.max(...statusWidths) - Math.min(...statusWidths) <= 0.25, 'The save-status area keeps one stable desktop footprint.');
    check(stableHeader.every((item, index) => item.statusText === saveStates[index] && item.statusTitle === saveStates[index]), 'Every save-state message remains available in full through its text and tooltip.');
    await page.evaluate(() => { document.querySelector('[data-save-text]').textContent = 'Saved just now'; });

    await page.setViewportSize({ width: 1500, height: 1000 });
    const views = ['home', 'strategy', 'plan', 'videos', 'learn', 'creators', 'calendar', 'library', 'framework'];
    for (const view of views) {
      await page.evaluate(nextView => { state.view = nextView; render(); }, view);
      await page.waitForTimeout(90);
      const result = await page.evaluate(() => ({
        view: state.view,
        textLength: document.querySelector('main')?.innerText.trim().length || 0,
        pageCount: document.querySelectorAll('main .page').length,
        bodyOverflow: document.documentElement.scrollWidth - innerWidth,
        unlabeledButtons: [...document.querySelectorAll('main button')].filter(button => {
          const style = getComputedStyle(button), box = button.getBoundingClientRect();
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
          return visible && !button.textContent.trim() && !button.getAttribute('aria-label') && !button.getAttribute('title');
        }).length
      }));
      report.routes[view] = result;
      check(result.view === view && result.pageCount === 1 && result.textLength > 80, `${view} renders as one meaningful dashboard page.`);
      check(result.bodyOverflow <= 1, `${view} does not force page-level horizontal scrolling on desktop.`);
      check(result.unlabeledButtons === 0, `${view} has no visible unlabeled buttons.`);
    }

    await page.evaluate(() => {
      if (state.creators.length < 2) state.creators.push(blankCreator('Second QA Creator', 'QA'));
      state.view = 'strategy';
      render();
    });
    const switchId = await page.evaluate(() => state.creators.find(item => item.id !== state.currentCreatorId).id);
    await page.locator('[data-action="switch-creator"]').selectOption(switchId);
    await page.waitForTimeout(80);
    check(await page.evaluate(id => state.currentCreatorId === id && state.view === 'home', switchId), 'Switching creators always lands on that creator’s Home.');

    await page.evaluate(() => { state.view = 'creators'; render(); });
    const creatorCountBefore = await page.evaluate(() => state.creators.length);
    await page.locator('[data-action="add-creator"]').click();
    await page.locator('#newCreatorName').fill('Full QA Creator');
    await page.locator('#newCreatorNiche').fill('Dashboard quality assurance');
    await page.locator('#newCreatorUrl').fill('https://www.youtube.com/@fullqa');
    await page.locator('[data-action="save-new-creator"]').click();
    await page.waitForTimeout(80);
    const created = await page.evaluate(() => ({ count: state.creators.length, id: state.currentCreatorId, name: creator().name, view: state.view }));
    check(created.count === creatorCountBefore + 1 && created.name === 'Full QA Creator' && created.view === 'strategy', 'Adding a creator produces a complete creator record and opens its strategy.');

    await page.evaluate(() => { state.view = 'creators'; render(); });
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator(`[data-action="delete-creator"][data-id="${created.id}"]`).click();
    check(await page.evaluate(id => state.creators.some(item => item.id === id), created.id), 'Cancelling creator deletion preserves all creator data.');
    page.once('dialog', dialog => dialog.accept());
    await page.locator(`[data-action="delete-creator"][data-id="${created.id}"]`).click();
    await page.waitForTimeout(80);
    check(await page.evaluate(id => !state.creators.some(item => item.id === id), created.id), 'Confirmed creator deletion removes only the named creator.');

    await page.evaluate(() => { creator().channelUrl = 'https://www.youtube.com/@acceleratorqa'; render(); });
    const validChannel = await page.locator('.top-actions .channel-tool').evaluate(node => ({ tag: node.tagName, href: node.getAttribute('href'), target: node.getAttribute('target'), rel: node.getAttribute('rel') }));
    check(validChannel.tag === 'A' && validChannel.href.includes('youtube.com') && validChannel.target === '_blank' && /noopener/.test(validChannel.rel), 'A valid YouTube channel uses a protected new-tab link.');
    await page.evaluate(() => { creator().channelUrl = ''; render(); });
    const missingChannel = await page.locator('.top-actions .channel-tool').evaluate(node => ({ tag: node.tagName, text: node.textContent.trim(), strikeWidth: getComputedStyle(node, '::after').width }));
    check(missingChannel.tag === 'BUTTON' && !missingChannel.text.includes('+') && parseFloat(missingChannel.strikeWidth) >= 18, 'A missing YouTube channel is visibly slashed and never uses a plus badge.');

    await page.evaluate(() => {
      const current = creator();
      let currentVideo = current.videos?.[0];
      if (!currentVideo) { currentVideo = blankVideo('Formula QA', 'Reach'); current.videos.push(currentVideo); }
      state.currentVideoId = currentVideo.id;
      const hookIndex = VIDEO_FLOW.findIndex(item => item[0] === 'hook');
      currentVideo.flowStep = hookIndex;
      currentVideo.visitedFlow = Math.max(currentVideo.visitedFlow || 0, hookIndex);
      currentVideo.hook.type = 'Problem Recognition';
      state.view = 'planner';
      render();
    });
    await page.waitForTimeout(100);
    check(await page.locator('.v16240-hook-formula').count() >= 1 && await page.locator('.v16241-filled-example').count() >= 1, 'Hook starters show both a fill-in formula and a filled example.');
    await page.locator('[data-action="v16240-use-hook-formula"]').first().click();
    check(await page.evaluate(() => /\[[^\]]+\]/.test(video().hook.draft)), 'Using a hook starter populates an editable bracketed formula.');

    const handoffs = await page.evaluate(() => {
      const c = creator(), v = video();
      return {
        foundation: handoffFoundation(c), direction: handoffDirection(c), month: handoffMonth(c),
        quarter: handoffQuarter(c), video: handoffVideo(c, v), learning: handoffLearning(c, v), calendar: handoffCalendar(c)
      };
    });
    for (const [name, text] of Object.entries(handoffs)) {
      const complete = typeof text === 'string' && (name === 'calendar' ? /No scheduled items yet|\d{4}-\d{2}-\d{2}/.test(text) : text.length > 80);
      check(complete, `${name} handoff generates meaningful saved-state content or a clear empty state.`);
    }
    await page.evaluate(text => v163OpenDocument('Full QA handoff', text, 'full-qa.md'), handoffs.quarter);
    check(await page.locator('[data-action="v163-download-pdf"]').count() === 1, 'Handoff documents expose the designed PDF download.');
    const previewClipping = await page.locator('.v12-doc-preview').evaluate(root => [...root.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      const clipped = (style.overflow === 'hidden' || style.overflow === 'clip') && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1);
      const clamped = style.webkitLineClamp && style.webkitLineClamp !== 'none';
      return box.width > 0 && box.height > 0 && (clipped || clamped || style.textOverflow === 'ellipsis');
    }).map(node => ({ tag: node.tagName, className: node.className, text: node.textContent.trim().slice(0, 80) })));
    report.measurements.previewClipping = previewClipping;
    check(previewClipping.length === 0, 'The on-screen handoff preview shows every line without clamps, ellipses, or clipped overflow.');
    await page.locator('[data-action="close-drawer"]').click();

    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ['home', 'plan', 'videos', 'framework']) {
      await page.evaluate(nextView => { state.view = nextView; render(); }, view);
      await page.waitForTimeout(80);
      const mobile = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        status: document.querySelector('[data-save-label]')?.textContent.trim() || '',
        statusVisible: getComputedStyle(document.querySelector('[data-save-label]')).display !== 'none'
      }));
      check(mobile.overflow <= 1, `${view} remains inside the mobile viewport.`);
      check(mobile.statusVisible && mobile.status.length > 3, `${view} keeps the save status visible on mobile.`);
    }
    await page.evaluate(() => { state.view = 'home'; document.documentElement.style.scrollBehavior = 'auto'; render(); window.scrollTo(0, 0); });
    await page.waitForFunction(() => window.scrollY === 0);
    await page.screenshot({ path: path.join(ROOT, 'qa', 'v1636-mobile-home.png'), fullPage: true });
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.evaluate(() => { state.view = 'home'; document.documentElement.style.scrollBehavior = 'auto'; render(); window.scrollTo(0, 0); });
    await page.waitForFunction(() => window.scrollY === 0);
    await page.screenshot({ path: path.join(ROOT, 'qa', 'v1636-desktop-home.png'), fullPage: true });

    const unexpected = runtimeErrors.filter(message => !/Failed to fetch|favicon/i.test(message));
    report.measurements.runtimeErrors = runtimeErrors;
    check(unexpected.length === 0, `No unexpected browser runtime errors occurred. ${unexpected.join(' | ')}`);
  } catch (error) {
    if (!report.errors.includes(error.message)) report.errors.push(error.message);
    console.error(error.stack || error);
  } finally {
    fs.mkdirSync(path.join(ROOT, 'qa'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'qa', 'v1636-full-release-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  if (report.errors.length) process.exit(1);
})();
