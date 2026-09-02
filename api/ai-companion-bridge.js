'use strict';

module.exports = function buildAiCompanionBridge(workspaceId) {
  return String.raw`
<script id="accelerator-ai-companion-bridge">
(() => {
  if (window.__acceleratorAiCompanionBridge) return;
  window.__acceleratorAiCompanionBridge = true;

  const COMPANION_URL = 'http://127.0.0.1:4873';
  const REQUIRED_WORKSPACE_ID = '${workspaceId}';
  const DRAFT_KEY = 'accelerator-ai-v2-proposal-drafts';
  let companion = { connected: false, checking: false, error: '', provider: '', model: '', account: null };
  let lastResult = null;
  let running = false;
  let healthTimer = null;

  function readBinding(name) {
    try { return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined'); }
    catch (_) { return undefined; }
  }

  function appState() {
    const value = readBinding('state');
    return value && typeof value === 'object' ? value : null;
  }

  function saveDiagnostics() {
    try { return window.__acceleratorSaveDiagnostics?.() || null; }
    catch (_) { return null; }
  }

  function clean(value, max) {
    return String(value || '').trim().slice(0, max);
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return null; }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  }

  function currentContext() {
    const diagnostics = saveDiagnostics();
    const value = appState();
    if (!value || !diagnostics) return null;
    const demoMode = diagnostics.demoMode === true;
    if (!demoMode && (!diagnostics.cloudStateLoaded || diagnostics.workspaceId !== REQUIRED_WORKSPACE_ID)) return null;
    const creator = (value.creators || []).find(item => item.id === value.currentCreatorId) || (value.creators || [])[0] || null;
    const video = (creator && creator.videos || []).find(item => item.id === value.currentVideoId) || (creator && creator.videos || [])[0] || null;
    const context = {
      environment: 'accelerator-ai-v2',
      dataSource: demoMode ? 'built-in-demo' : 'isolated-cloud',
      workspaceId: demoMode ? null : REQUIRED_WORKSPACE_ID,
      view: value.view || 'home',
      creator: clone(creator),
      currentVideo: clone(video),
      instruction: demoMode
        ? 'This is demo data. Analyze it only and do not treat it as a real client record.'
        : 'This is private V2 creator data. Analyze it, but do not change dashboard or cloud state.'
    };
    if (JSON.stringify(context).length > 440000) {
      context.creator = creator ? {
        id: creator.id,
        name: creator.name,
        niche: creator.niche || '',
        currentConstraint: creator.currentConstraint || '',
        stage: creator.stage || '',
        plan: clone(creator.plan || creator.strategy || null),
        videoCount: Array.isArray(creator.videos) ? creator.videos.length : 0
      } : null;
    }
    return context;
  }

  async function companionFetch(path, options) {
    const response = await fetch(COMPANION_URL + path, Object.assign({
      cache: 'no-store',
      targetAddressSpace: 'local',
      headers: { 'X-Accelerator-Companion': 'v1' }
    }, options || {}, {
      headers: Object.assign(
        { 'X-Accelerator-Companion': 'v1' },
        options && options.headers || {}
      )
    }));
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || 'The local AI companion did not respond.');
    return body;
  }

  async function checkCompanion() {
    try {
      const result = await companionFetch('/health');
      companion = Object.assign({ checking: false, error: '' }, result, { connected: result.connected === true });
    } catch (error) {
      companion = { connected: false, checking: false, error: error.message, provider: '', model: '', account: null };
    }
    render();
    if (companion.connected && !healthTimer) {
      healthTimer = setInterval(checkCompanion, 5000);
    }
    if (!companion.connected && healthTimer) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
    return companion.connected;
  }

  function inheritedConnection() {
    try { return window.__acceleratorAiV2Diagnostics?.().connection || null; }
    catch (_) { return null; }
  }

  function installStyles() {
    if (document.getElementById('accelerator-ai-companion-styles')) return;
    const style = document.createElement('style');
    style.id = 'accelerator-ai-companion-styles';
    style.textContent = [
      '.ai-companion-compose{padding:17px;border:1px solid #d8e0e6;border-radius:17px;background:#fff}',
      '.ai-companion-compose label{display:block;margin-bottom:8px;font:800 12px/1.3 Inter,system-ui,sans-serif;color:#17212b}',
      '.ai-companion-compose textarea{display:block;width:100%;min-height:96px;resize:vertical;border:1px solid #cfd8df;border-radius:12px;background:#fff;padding:12px;color:#17212b;font:550 13px/1.5 Inter,system-ui,sans-serif;box-sizing:border-box}',
      '.ai-companion-compose textarea:focus{outline:3px solid rgba(181,161,77,.2);border-color:#a9953f}',
      '.ai-companion-controls{display:flex;align-items:center;gap:10px;margin-top:10px}.ai-companion-run{min-height:40px;border:1px solid #17212b;border-radius:10px;background:#17212b;color:#fff;padding:9px 14px;font:800 12px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-companion-run:disabled{opacity:.55;cursor:wait}.ai-companion-help{color:#75808a;font:600 11px/1.4 Inter,system-ui,sans-serif}',
      '.ai-companion-output{margin-top:13px}.ai-companion-output[hidden]{display:none}.ai-companion-answer{padding:15px;border:1px solid #dce3e8;border-radius:14px;background:#f8fafb}.ai-companion-answer h4{margin:0 0 8px;font:850 16px/1.3 Inter,system-ui,sans-serif}.ai-companion-answer p{margin:0;color:#4f5b66;font:550 13px/1.55 Inter,system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}.ai-companion-answer ul{margin:10px 0 0;padding-left:20px;color:#5c6873;font:550 12px/1.5 Inter,system-ui,sans-serif}.ai-companion-answer-actions{display:flex;gap:8px;margin-top:12px}.ai-companion-stage{min-height:36px;border:1px solid #17212b;border-radius:9px;background:#17212b;color:#fff;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-companion-error{padding:12px;border:1px solid #efc7bd;border-radius:12px;background:#fff1ee;color:#8f382c;font:650 12px/1.45 Inter,system-ui,sans-serif}',
      '@media(max-width:620px){.ai-companion-controls{align-items:stretch;flex-direction:column}.ai-companion-run{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureCompose() {
    const dialog = document.getElementById('accelerator-ai-v2-drawer');
    if (!dialog || dialog.querySelector('[data-ai-companion-compose]')) return;
    const routeSection = dialog.querySelector('[data-ai-v2-providers]')?.closest('.ai-v2-section');
    if (!routeSection) return;
    const section = document.createElement('section');
    section.className = 'ai-v2-section';
    section.setAttribute('data-ai-companion-compose', '');
    section.innerHTML = [
      '<div class="ai-v2-section-head"><h3>Ask Accelerator AI</h3><p class="ai-v2-section-note">Uses the creator currently open</p></div>',
      '<div class="ai-companion-compose">',
      '<label for="accelerator-ai-question">What do you want help deciding?</label>',
      '<textarea id="accelerator-ai-question">Using the current creator and video, what is the single most important next decision—and why?</textarea>',
      '<div class="ai-companion-controls"><button class="ai-companion-run" type="button" data-ai-companion-run>Ask AI</button><span class="ai-companion-help">Nothing is applied automatically.</span></div>',
      '<div class="ai-companion-output" data-ai-companion-output hidden></div>',
      '</div>'
    ].join('');
    routeSection.parentNode.insertBefore(section, routeSection);
  }

  function renderOutput() {
    const host = document.querySelector('[data-ai-companion-output]');
    if (!host) return;
    if (running) {
      host.hidden = false;
      host.innerHTML = '<div class="ai-companion-answer"><h4>Thinking…</h4><p>Codex is reading the current dashboard context.</p></div>';
      return;
    }
    if (!lastResult) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    if (lastResult.error) {
      host.innerHTML = '<div class="ai-companion-error">' + escapeHtml(lastResult.error) + '</div>';
      return;
    }
    const proposal = lastResult.proposal || {};
    const evidence = Array.isArray(proposal.evidence) && proposal.evidence.length
      ? '<ul>' + proposal.evidence.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
      : '';
    host.innerHTML = '<article class="ai-companion-answer"><h4>' + escapeHtml(proposal.title || 'AI recommendation') + '</h4><p>' + escapeHtml(proposal.answer || proposal.recommendation || '') + '</p>' + evidence + '<div class="ai-companion-answer-actions"><button class="ai-companion-stage" type="button" data-ai-companion-stage>Stage for review</button></div></article>';
  }

  function render() {
    installStyles();
    ensureCompose();
    const inherited = inheritedConnection();
    const connected = companion.connected || Boolean(inherited && inherited.connected);
    const usingCompanion = companion.connected;
    const button = document.getElementById('accelerator-ai-v2-button');
    if (button) {
      button.dataset.connected = String(connected);
      button.textContent = usingCompanion ? 'AI Desk · Codex ready' : (connected ? 'AI Desk · Codex tools' : 'AI Desk · Offline');
    }
    const safety = document.querySelector('#accelerator-ai-v2-drawer .ai-v2-safety');
    if (safety) {
      safety.innerHTML = usingCompanion
        ? '<strong>AI is ready on this Mac.</strong> It uses your ChatGPT-managed Codex sign-in. It can read the V2 creator you have open and return review drafts, but it cannot silently edit or cloud-save dashboard data.'
        : '<strong>AI is offline.</strong> Start the Accelerator AI Companion on this Mac, then this page reconnects automatically. The dashboard itself still works normally.';
    }
    const host = document.querySelector('[data-ai-v2-connection]');
    if (host) {
      const dataMode = saveDiagnostics()?.demoMode ? 'built-in demo' : (saveDiagnostics()?.cloudStateLoaded ? 'isolated V2 cloud' : 'not loaded');
      const plan = companion.account && companion.account.planType ? companion.account.planType : '';
      host.innerHTML = [
        '<div class="ai-v2-connection">',
        '<div class="ai-v2-connection-top"><div><p class="ai-v2-connection-name">' + escapeHtml(usingCompanion ? 'Codex / ChatGPT companion' : (connected ? 'Codex browser tools' : 'No AI connected')) + '</p><p class="ai-v2-connection-copy">' + escapeHtml(usingCompanion ? 'Ready to answer inside this dashboard.' : (companion.checking ? 'Checking the local AI companion…' : 'The local companion is not running on this Mac.')) + '</p></div><span class="ai-v2-status" data-connected="' + String(connected) + '">' + (connected ? 'Connected' : 'Offline') + '</span></div>',
        '<div class="ai-v2-facts"><div class="ai-v2-fact"><span>AI route</span><strong>' + escapeHtml(usingCompanion ? companion.provider : (connected ? 'Codex tools' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Model</span><strong>' + escapeHtml(usingCompanion ? companion.model : (connected ? 'Selected in Codex' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Account</span><strong>' + escapeHtml(usingCompanion ? ('ChatGPT' + (plan ? ' · ' + plan : '')) : (connected ? 'Managed by Codex' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Data</span><strong>' + escapeHtml(dataMode) + '</strong></div></div>',
        '<ul class="ai-v2-permissions"><li>Read the current V2 creator and video</li><li>Generate and stage recommendations</li><li data-no="true">Cannot silently edit dashboard data</li><li data-no="true">Cannot write to cloud through AI</li></ul>',
        usingCompanion ? '' : '<div class="ai-v2-try"><code>Chrome may ask once for permission to connect this V2 page to the AI companion on your Mac.</code><a class="ai-v2-mini-button" href="http://127.0.0.1:4873/dashboard" target="_blank" rel="noopener">Open local AI version</a></div>',
        '</div>'
      ].join('');
    }
    const providers = document.querySelector('[data-ai-v2-providers]');
    if (providers) {
      providers.innerHTML = '<div class="ai-v2-provider-grid">' + [
        { name: 'Codex / ChatGPT', tag: usingCompanion ? 'Active now' : 'Offline', copy: usingCompanion ? 'Connected through your ChatGPT-managed Codex sign-in.' : 'Start the local companion to use your ChatGPT plan.', active: usingCompanion },
        { name: 'LM Studio', tag: 'Not running', copy: 'LM Studio is installed and can be added later when its local model server is running.', active: false },
        { name: 'MLX', tag: 'Available later', copy: 'A local MLX model can use the same safe companion route.', active: false },
        { name: 'Custom model server', tag: 'Available later', copy: 'An OpenAI-compatible local server can be added without changing dashboard data.', active: false }
      ].map(provider => '<article class="ai-v2-provider" data-active="' + String(provider.active) + '"><div class="ai-v2-provider-top"><strong>' + escapeHtml(provider.name) + '</strong><span class="ai-v2-provider-tag">' + escapeHtml(provider.tag) + '</span></div><small>' + escapeHtml(provider.copy) + '</small></article>').join('') + '</div>';
    }
    const run = document.querySelector('[data-ai-companion-run]');
    if (run) {
      run.disabled = running || !usingCompanion;
      run.textContent = running ? 'Thinking…' : (usingCompanion ? 'Ask AI' : 'Companion offline');
    }
    renderOutput();
  }

  async function askAi() {
    const field = document.getElementById('accelerator-ai-question');
    const question = clean(field && field.value, 4000);
    if (!question) {
      lastResult = { error: 'Enter a question first.' };
      return render();
    }
    const context = currentContext();
    if (!context) {
      lastResult = { error: 'The V2 creator context is not ready yet.' };
      return render();
    }
    running = true;
    lastResult = null;
    render();
    try {
      lastResult = await companionFetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context })
      });
    } catch (error) {
      lastResult = { error: error.message };
      await checkCompanion();
    } finally {
      running = false;
      render();
    }
  }

  function stageLastResult() {
    const proposal = lastResult && lastResult.proposal;
    if (!proposal) return;
    let drafts = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      drafts = Array.isArray(parsed) ? parsed : [];
    } catch (_) {}
    const context = currentContext();
    drafts.unshift({
      id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      creatorId: context && context.creator ? context.creator.id : null,
      creatorName: context && context.creator ? context.creator.name : '',
      title: clean(proposal.title || 'AI recommendation', 120),
      target: clean(proposal.target || 'Current creator', 120),
      summary: clean(proposal.summary || proposal.answer, 1200),
      recommendation: clean(proposal.recommendation || proposal.answer, 3000),
      evidence: Array.isArray(proposal.evidence) ? proposal.evidence.map(item => clean(item, 500)).filter(Boolean).slice(0, 8) : [],
      status: 'Draft - not applied'
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts.slice(0, 25)));
    const dialog = document.getElementById('accelerator-ai-v2-drawer');
    if (dialog && dialog.open) dialog.close();
    document.getElementById('accelerator-ai-v2-button')?.click();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-ai-companion-run]')) askAi();
    if (event.target.closest('[data-ai-companion-stage]')) stageLastResult();
    if (event.target.closest('#accelerator-ai-v2-button')) {
      if (!companion.connected) {
        companion.checking = true;
        setTimeout(() => { render(); checkCompanion(); }, 0);
      } else {
        setTimeout(render, 0);
      }
    }
  });

  const originalDiagnostics = window.__acceleratorAiV2Diagnostics;
  window.__acceleratorAiCompanionDiagnostics = () => ({
    url: COMPANION_URL,
    connected: companion.connected,
    checking: companion.checking,
    provider: companion.provider || null,
    model: companion.model || null,
    account: companion.account || null,
    lastError: companion.error || null,
    running,
    hasResult: Boolean(lastResult && lastResult.ok)
  });
  if (typeof originalDiagnostics === 'function') {
    window.__acceleratorAiV2Diagnostics = () => {
      const base = originalDiagnostics();
      return Object.assign({}, base, { companion: window.__acceleratorAiCompanionDiagnostics() });
    };
  }

  function boot() {
    installStyles();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
</script>`;
};
