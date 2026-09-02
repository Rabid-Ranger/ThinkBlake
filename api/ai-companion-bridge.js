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
  const ACTION_CATALOG = {
    home: {
      cue: 'Check the decision chain before adding work.',
      primary: 'next-decision',
      actions: [
        { id: 'next-decision', label: 'Check the next decision', context: 'whole' },
        { id: 'diagnosis-check', label: 'Pressure-test diagnosis', context: 'whole' },
        { id: 'call-prep', label: 'Prep the next call', context: 'coaching' }
      ]
    },
    strategy: {
      cue: 'Use the audience, message and business path as one source of truth.',
      primary: 'audience-sharpen',
      actions: [
        { id: 'audience-sharpen', label: 'Check audience clarity', context: 'audience' },
        { id: 'message-strengthen', label: 'Connect audience to message', context: 'message' },
        { id: 'business-path', label: 'Check the business path', context: 'business' }
      ]
    },
    plan: {
      cue: 'Check whether this month is actually testing the diagnosis.',
      primary: 'plan-coherence',
      actions: [
        { id: 'plan-coherence', label: 'Check the monthly focus', context: 'plan' },
        { id: 'month-breakdown', label: 'Choose the next plan move', context: 'plan' },
        { id: 'missing-proof', label: 'Find the missing proof', context: 'plan' },
        { id: 'plan-report', label: 'Conclude the month', context: 'learning' }
      ]
    },
    videos: {
      cue: 'Choose the next piece of video work from the plan—not from a generic idea list.',
      primary: 'video-fit',
      actions: [
        { id: 'video-fit', label: 'Check the next video', context: 'video' },
        { id: 'package-directions', label: 'Create package directions', context: 'package' }
      ]
    },
    planner: {
      cue: 'Check this decision against everything it inherits upstream.',
      primary: 'video-fit',
      actions: [
        { id: 'video-fit', label: 'Check this video decision', context: 'video' },
        { id: 'viewer-sharpen', label: 'Check the exact viewer', context: 'package' },
        { id: 'research-check', label: 'Check the research proof', context: 'package' },
        { id: 'promise-check', label: 'Check the promise', context: 'package' },
        { id: 'package-directions', label: 'Create package directions', context: 'package' },
        { id: 'hook-builder', label: 'Build from package to hook', context: 'hook' },
        { id: 'structure-check', label: 'Check the structure', context: 'handoff' },
        { id: 'cta-check', label: 'Check the CTA fit', context: 'business' },
        { id: 'production-handoff', label: 'Check production readiness', context: 'handoff' }
      ]
    },
    learn: {
      cue: 'Interpret only what the selected checkpoint can actually support.',
      primary: 'results-interpret',
      actions: [
        { id: 'results-interpret', label: 'Interpret this checkpoint', context: 'learning' },
        { id: 'learning-conclusion', label: 'Write the learning', context: 'learning' },
        { id: 'next-experiment', label: 'Choose the next test', context: 'learning' },
        { id: 'monthly-report', label: 'Draft the monthly conclusion', context: 'learning' }
      ]
    },
    framework: {
      cue: 'Apply a framework only when it fits the decision already in front of you.',
      primary: 'framework-select',
      actions: [
        { id: 'framework-select', label: 'Check framework fit', context: 'framework' },
        { id: 'framework-adapt', label: 'Adapt the selected formula', context: 'framework' },
        { id: 'framework-audit', label: 'Challenge the logic', context: 'framework' }
      ]
    },
    creators: {
      cue: 'Triage by stalled decisions and evidence—not profile completeness.',
      primary: 'portfolio-triage',
      actions: [
        { id: 'portfolio-triage', label: 'Triage the portfolio', context: 'portfolio' },
        { id: 'portfolio-risk', label: 'Find the clearest risk', context: 'portfolio' },
        { id: 'portfolio-calls', label: 'Order the next calls', context: 'portfolio' }
      ]
    },
    calendar: {
      cue: 'Use timing to create evidence and close decisions.',
      primary: 'review-timing',
      actions: [
        { id: 'review-timing', label: 'Check the next review', context: 'calendar' },
        { id: 'schedule-review', label: 'Review the next two weeks', context: 'calendar' },
        { id: 'capacity-risk', label: 'Check capacity', context: 'calendar' }
      ]
    },
    library: {
      cue: 'Use the library to answer a live decision, not as an extra reading list.',
      primary: 'library-route',
      actions: [
        { id: 'library-route', label: 'Find the relevant resource', context: 'framework' },
        { id: 'library-translate', label: 'Apply the selected resource', context: 'framework' },
        { id: 'library-gap', label: 'Check for a system gap', context: 'framework' }
      ]
    }
  };
  const STRATEGY_PRIMARY = { audience: 'audience-sharpen', message: 'message-strengthen', business: 'business-path', snapshot: 'audience-sharpen', notes: 'call-prep' };
  const VIDEO_STEP_PRIMARY = {
    job: 'video-fit', role: 'video-fit', viewer: 'viewer-sharpen', research: 'research-check', type: 'video-fit',
    promise: 'promise-check', package: 'package-directions', hook: 'hook-builder', structure: 'structure-check',
    cta: 'cta-check', handoff: 'production-handoff', publish: 'review-timing', final: 'production-handoff'
  };
  let companion = { connected: false, checking: false, error: '', provider: '', model: '', account: null };
  let lastResult = null;
  let running = false;
  let runningSurface = '';
  let resultBySurface = {};
  let contextualRenderQueued = false;
  let providerBusy = '';
  let providerMessage = null;
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

  function creatorFor(value) {
    return value && ((value.creators || []).find(item => item.id === value.currentCreatorId) || (value.creators || [])[0]) || null;
  }

  function videoFor(value, creator) {
    return creator && ((creator.videos || []).find(item => item.id === value.currentVideoId) || (creator.videos || [])[0]) || null;
  }

  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function portfolioContext(value) {
    return (value.creators || []).map(item => {
      const plan = item.quarterPlan || null;
      const activeMonthNumber = plan && Number(plan.activeMonth || 1);
      const activeMonth = plan && Array.isArray(plan.months) ? plan.months[Math.max(0, activeMonthNumber - 1)] || null : null;
      return {
        id: item.id,
        name: item.name || '',
        niche: item.niche || '',
        currentConstraint: item.currentConstraint || '',
        diagnosis: clone(item.diagnosis && item.diagnosis.result || null),
        activeMonth: clone(activeMonth),
        openCommitments: (item.commitments || []).filter(commitment => !['done', 'complete', 'completed', 'archived'].includes(String(commitment.status || '').toLowerCase())).length,
        latestSession: clone((item.sessions || []).slice(-1)[0] || null),
        latestLearning: clone((item.learningLog || []).slice(-1)[0] || null),
        videos: (item.videos || []).length
      };
    });
  }

  function compactCreator(creator) {
    if (!creator) return null;
    return {
      id: creator.id,
      name: creator.name || '',
      channelName: creator.channelName || '',
      niche: creator.niche || '',
      health: creator.health || '',
      currentConstraint: creator.currentConstraint || '',
      diagnosis: clone(creator.diagnosis || null),
      notes: clean(creator.notes, 6000)
    };
  }

  function activePlanContext(creator) {
    const plan = creator && creator.quarterPlan || null;
    const activeMonthNumber = plan && Number(plan.activeMonth || 1);
    const activeMonth = plan && Array.isArray(plan.months) ? plan.months[Math.max(0, activeMonthNumber - 1)] || null : null;
    return {
      diagnosis: clone(creator && creator.diagnosis || null),
      currentConstraint: creator && creator.currentConstraint || '',
      roadmap: clone(creator && creator.roadmap || null),
      quarterPlan: clone(plan),
      activeMonthNumber: activeMonthNumber || null,
      activeMonth: clone(activeMonth),
      monthExecution: clone(creator && creator.month || null)
    };
  }

  function videoStep(video) {
    const flow = readBinding('VIDEO_FLOW');
    const item = Array.isArray(flow) && video ? flow[Math.max(0, Number(video.flowStep || 0))] : null;
    return Array.isArray(item) ? item[0] : '';
  }

  function actionMeta(actionId, view) {
    const catalog = ACTION_CATALOG[view] || ACTION_CATALOG.home;
    return (catalog.actions || []).find(item => item.id === actionId) || { id: actionId, label: 'AI check', context: 'whole' };
  }

  function comparableVideos(creator, video) {
    if (!creator || !video) return [];
    return (creator.videos || []).filter(item => item.id !== video.id && item.job === video.job).slice(-6).map(item => ({
      id: item.id,
      title: item.package && (item.package.finalTitle || item.package.workingTitle) || item.title || '',
      job: item.job || '',
      role: item.role || '',
      package: clone(item.package || null),
      hook: clone(item.hook || null),
      analytics: clone(item.analytics || null)
    }));
  }

  function compactVideos(creator) {
    return (creator && creator.videos || []).slice(-12).map(item => ({
      id: item.id,
      title: item.package && (item.package.finalTitle || item.package.workingTitle) || item.title || '',
      stage: item.stage || '',
      job: item.job || '',
      role: item.role || '',
      publishDate: item.cta && item.cta.publishDate || item.publishDate || '',
      nextMove: item.analytics && item.analytics.nextMove || '',
      decision: item.analytics && item.analytics.decision || ''
    }));
  }

  function libraryContext(value) {
    const library = readBinding('LIBRARY');
    if (!Array.isArray(library)) return [];
    const category = value && value.guideCat || '';
    return library.filter(item => !category || item.cat === category).slice(0, 12).map(item => ({
      category: item.cat || '',
      type: item.type || '',
      title: item.title || '',
      use: clean(item.use, 500),
      why: clean(item.why, 500),
      formulaOrFlow: clean(item.flow, 900)
    }));
  }

  function readinessFor(actionId, value, creator, video) {
    const missing = [];
    let nextAction = '';
    const has = value => String(value || '').trim().length > 0;
    const require = (condition, label) => { if (!condition && missing.length < 3) missing.push(label); };
    if (['plan-coherence', 'month-breakdown', 'missing-proof'].includes(actionId)) {
      require(creator && creator.diagnosis && creator.diagnosis.result, 'a completed diagnosis');
      require(creator && creator.quarterPlan, 'an active 90-day plan');
      nextAction = 'Finish or confirm the diagnosis and active month, then run this check again.';
    }
    if (actionId === 'message-strengthen') {
      require(creator && (has(creator.audience && creator.audience.onePerson) || has(creator.strategy && creator.strategy.audience)), 'the exact audience');
      require(creator && has(creator.audience && (creator.audience.deeperProblem || creator.audience.situation)), 'the audience tension or trigger');
      nextAction = 'Add the exact person and their real tension in Strategy → Audience.';
    }
    if (actionId === 'business-path') {
      require(creator && has(creator.strategy && creator.strategy.businessGoal), 'the business goal');
      require(creator && (has(creator.strategy && creator.strategy.offer) || has(creator.business && creator.business.path)), 'the offer or next useful step');
      nextAction = 'Define the business goal and the next useful step in Strategy → Business.';
    }
    if (['video-fit', 'viewer-sharpen', 'research-check', 'promise-check', 'package-directions', 'hook-builder', 'structure-check', 'cta-check', 'production-handoff'].includes(actionId)) {
      require(video, 'a selected video');
      nextAction = 'Open or create the video you want to work on.';
    }
    if (actionId === 'viewer-sharpen') {
      require(video && has(video.viewer && (video.viewer.moment || video.viewer.problem)), 'the viewer moment or problem');
      nextAction = 'Add the viewer moment or problem first, then sharpen who this video is for.';
    }
    if (actionId === 'research-check') {
      const refs = video && video.research && Array.isArray(video.research.refs) ? video.research.refs : [];
      require(video && ((video.research && video.research.methods || []).length || refs.some(item => has(item && (item.title || item.note)))), 'at least one research source or evidence note');
      nextAction = 'Add one relevant source, audience signal or packaging reference before judging the direction.';
    }
    if (actionId === 'promise-check') {
      require(video && has(video.viewer && video.viewer.problem), 'the viewer problem');
      require(video && has(video.promise && video.promise.result), 'the promised result');
      nextAction = 'Define the viewer problem and result before checking the promise.';
    }
    if (actionId === 'package-directions') {
      require(video && has(video.viewer && video.viewer.problem), 'the exact viewer problem');
      require(video && has(video.promise && video.promise.result), 'the promised result');
      require(video && has(video.promise && video.promise.mechanism), 'the mechanism or better clue');
      nextAction = 'Complete Viewer and Promise first so package ideas are not generic.';
    }
    if (actionId === 'hook-builder') {
      require(video && has(video.package && (video.package.finalTitle || video.package.workingTitle)), 'a working title');
      require(video && has(video.package && video.package.thumbnailConcept), 'the thumbnail concept');
      require(video && has(video.promise && video.promise.result), 'the saved promise');
      nextAction = 'Finish the promise and package, then build the hook from what the click promised.';
    }
    if (actionId === 'structure-check') {
      require(video && has(video.hook && video.hook.draft), 'the saved hook');
      require(video && has(video.structure && (video.structure.type || video.structure.notes)), 'the planned structure');
      nextAction = 'Save the hook and basic progression before checking the viewing experience.';
    }
    if (actionId === 'cta-check') {
      require(video && has(video.cta && (video.cta.endType || video.cta.endDraft)), 'the planned CTA');
      require(creator && (has(creator.strategy && creator.strategy.offer) || has(creator.business && creator.business.path)), 'the next useful step or business path');
      nextAction = 'Define the CTA and its real destination before checking fit.';
    }
    if (['results-interpret', 'learning-conclusion', 'next-experiment'].includes(actionId)) {
      const windowKey = value && value.learnWindow || '_7d';
      const checkpoint = video && video.analytics && video.analytics[windowKey] || {};
      const metricEvidence = Object.entries(checkpoint).some(([key, metric]) => key !== 'notes' && has(metric));
      const writtenEvidence = has(checkpoint.notes) || has(video && video.analytics && video.analytics.observe);
      require(video, 'a selected video');
      require(metricEvidence || writtenEvidence, 'checkpoint metrics or a factual observation');
      nextAction = 'Add the selected checkpoint metrics or write what was observed—facts only—then interpret it.';
    }
    if (['plan-report', 'monthly-report'].includes(actionId)) {
      const evidence = (creator && creator.videos || []).some(item => has(item.analytics && (item.analytics.observe || item.analytics.decision)) || ['_24h', '_7d', '_28d'].some(key => Object.values(item.analytics && item.analytics[key] || {}).some(has)));
      require(evidence, 'recorded video results or learning');
      nextAction = 'Record at least one checkpoint observation before drafting a conclusion.';
    }
    return { missing, nextAction };
  }

  function relevantContext(profile, value, creator, video) {
    const plan = activePlanContext(creator);
    const shared = {
      creator: compactCreator(creator),
      currentDecision: {
        view: value.view || 'home',
        strategyTab: value.strategyTab || creator && creator.strategyTab || '',
        videoStep: videoStep(video),
        learningWindow: value.learnWindow || '_7d',
        activeConstraint: creator && creator.currentConstraint || '',
        activeMonth: clone(plan.activeMonth)
      }
    };
    const strategy = {
      strategy: clone(creator && creator.strategy || null),
      audience: clone(creator && creator.audience || null),
      message: clone(creator && creator.message || null),
      business: clone(creator && creator.business || null)
    };
    if (profile === 'audience') return { ...shared, audience: strategy.audience, strategy: strategy.strategy, diagnosis: clone(creator && creator.diagnosis || null), currentVideoViewer: clone(video && video.viewer || null) };
    if (profile === 'message') return { ...shared, audience: strategy.audience, message: strategy.message, businessGoal: strategy.strategy && strategy.strategy.businessGoal, offer: strategy.strategy && strategy.strategy.offer, currentVideo: video ? { viewer: clone(video.viewer), promise: clone(video.promise) } : null };
    if (profile === 'business') return { ...shared, audience: strategy.audience, message: strategy.message, business: strategy.business, strategy: strategy.strategy, currentVideo: video ? { job: video.job, role: video.role, cta: clone(video.cta) } : null };
    if (profile === 'plan') return { ...shared, strategy, plan, recentLearnings: clone((creator && creator.learningLog || []).slice(-10)), videos: compactVideos(creator) };
    if (profile === 'package') return { ...shared, audience: strategy.audience, message: strategy.message, plan, video: video ? { job: video.job, role: video.role, viewer: clone(video.viewer), research: clone(video.research), archetype: video.archetype, promise: clone(video.promise), package: clone(video.package) } : null, comparableVideos: comparableVideos(creator, video) };
    if (profile === 'hook') return { ...shared, audience: strategy.audience, message: strategy.message, plan, video: video ? { job: video.job, role: video.role, viewer: clone(video.viewer), promise: clone(video.promise), package: clone(video.package), hook: clone(video.hook), structure: clone(video.structure), proofAssets: video.handoff && video.handoff.assets || '' } : null, comparableVideos: comparableVideos(creator, video).map(item => ({ title: item.title, hook: item.hook, analytics: item.analytics })) };
    if (profile === 'handoff' || profile === 'video') return { ...shared, strategy, plan, video: clone(video), comparableVideos: comparableVideos(creator, video) };
    if (profile === 'learning') {
      const windowKey = value.learnWindow || '_7d';
      return { ...shared, plan, strategy: { audience: strategy.audience, message: strategy.message, business: strategy.business }, selectedCheckpoint: windowKey, video: clone(video), comparableVideos: comparableVideos(creator, video), recentLearnings: clone((creator && creator.learningLog || []).slice(-10)) };
    }
    if (profile === 'portfolio') return { ...shared, portfolio: portfolioContext(value) };
    if (profile === 'calendar') return { ...shared, plan, videos: compactVideos(creator), events: clone(creator && creator.events || []), commitments: clone((creator && creator.commitments || []).filter(item => !item.done)) };
    if (profile === 'coaching') return { ...shared, strategy, plan, openCommitments: clone((creator && creator.commitments || []).filter(item => !item.done)), recentSessions: clone((creator && creator.sessions || []).slice(-6)), videos: compactVideos(creator) };
    if (profile === 'framework') return { ...shared, strategy, plan, currentVideo: clone(video), availableLibraryItems: libraryContext(value) };
    return { ...shared, strategy, plan, currentVideo: clone(video), videos: compactVideos(creator), recentSessions: clone((creator && creator.sessions || []).slice(-4)), openCommitments: clone((creator && creator.commitments || []).filter(item => !item.done)), recentLearnings: clone((creator && creator.learningLog || []).slice(-8)) };
  }

  function currentContext(actionId) {
    const diagnostics = saveDiagnostics();
    const value = appState();
    if (!value || !diagnostics) return null;
    const demoMode = diagnostics.demoMode === true;
    if (!demoMode && (!diagnostics.cloudStateLoaded || diagnostics.workspaceId !== REQUIRED_WORKSPACE_ID)) return null;
    const creator = creatorFor(value);
    const video = videoFor(value, creator);
    const view = surfaceKey();
    const meta = actionMeta(actionId || 'open-question', view);
    const context = {
      environment: 'accelerator-ai-v2',
      dataSource: demoMode ? 'built-in-demo' : 'isolated-cloud',
      workspaceId: demoMode ? null : REQUIRED_WORKSPACE_ID,
      view,
      action: actionId || 'open-question',
      contextProfile: meta.context || 'whole',
      readiness: readinessFor(actionId || 'open-question', value, creator, video),
      relevant: relevantContext(meta.context || 'whole', value, creator, video),
      instruction: demoMode
        ? 'This is demo data. Analyze it only and do not treat it as a real client record.'
        : 'This is private V2 creator data. Analyze it, but do not change dashboard or cloud state.'
    };
    return context;
  }

  async function companionFetch(path, options) {
    const response = await fetch(COMPANION_URL + path, Object.assign({
      cache: 'no-store',
      targetAddressSpace: 'loopback',
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
      '.ai-proposal-block{margin-top:13px;padding-top:13px;border-top:1px solid #dce3e8}.ai-proposal-block:first-of-type{margin-top:10px}.ai-proposal-block span{display:block;margin-bottom:5px;color:#87929c;font:800 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}.ai-proposal-block strong,.ai-proposal-block p{display:block;margin:0;color:#27333e;font:650 13px/1.55 Inter,system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}.ai-proposal-block ol{margin:6px 0 0;padding-left:20px;color:#35424d;font:650 13px/1.55 Inter,system-ui,sans-serif}.ai-proposal-template{padding:12px;border-radius:10px;background:#f2efe1;color:#3f3921!important}.ai-companion-copy{min-height:36px;border:1px solid #cfd8df;border-radius:9px;background:#fff;color:#17212b;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}',
      '.ai-context-guide{margin:22px 0 30px;padding:22px;border:1px solid #d6dde3;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#fbfaf4 100%);box-shadow:0 12px 34px rgba(29,39,49,.055)}',
      '.ai-context-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.ai-context-eyebrow{margin:0 0 7px;color:#857633;font:850 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}.ai-context-title{margin:0;color:#17212b;font:850 22px/1.15 Inter,system-ui,sans-serif;letter-spacing:-.025em}.ai-context-description{max-width:760px;margin:8px 0 0;color:#687480;font:550 13px/1.55 Inter,system-ui,sans-serif}.ai-context-status{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;min-height:30px;border:1px solid #dce2e6;border-radius:999px;background:#fff;padding:6px 10px;color:#65717b;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}.ai-context-status:before{content:"";width:7px;height:7px;border-radius:50%;background:#a6afb6}.ai-context-status[data-connected="true"]:before{background:#59965a}.ai-context-basis{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}.ai-context-basis span{display:inline-flex;align-items:center;max-width:100%;min-height:28px;border:1px solid #e0e5e9;border-radius:999px;background:#fff;padding:5px 9px;color:#63707b;font:750 10px/1.2 Inter,system-ui,sans-serif;overflow-wrap:anywhere}.ai-context-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:17px}.ai-context-action{min-height:47px;border:1px solid #ccd5dc;border-radius:11px;background:#fff;color:#17212b;padding:10px 12px;text-align:left;font:800 12px/1.35 Inter,system-ui,sans-serif;cursor:pointer;transition:border-color .16s ease,transform .16s ease,box-shadow .16s ease}.ai-context-action:hover{border-color:#a9953f;box-shadow:0 5px 14px rgba(38,43,39,.07);transform:translateY(-1px)}.ai-context-action:focus-visible{outline:3px solid rgba(181,161,77,.22);outline-offset:2px}.ai-context-action:disabled{opacity:.55;cursor:wait;transform:none}.ai-context-custom{margin-top:12px}.ai-context-custom summary{width:max-content;color:#687480;font:800 11px/1.3 Inter,system-ui,sans-serif;cursor:pointer}.ai-context-custom-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:9px}.ai-context-custom textarea{min-height:58px;resize:vertical;border:1px solid #cfd8df;border-radius:10px;background:#fff;padding:10px 11px;color:#17212b;font:550 12px/1.45 Inter,system-ui,sans-serif;box-sizing:border-box}.ai-context-custom button{border:1px solid #17212b;border-radius:10px;background:#17212b;color:#fff;padding:9px 13px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-context-result{margin-top:16px}.ai-context-result .ai-companion-answer{background:#fff}.ai-context-staged{display:inline-flex;align-items:center;margin-left:6px;color:#4e8151;font:800 10px/1.2 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}',
      '.ai-assist{margin:14px 0 20px}.ai-assist-row{position:relative;display:flex;align-items:center;gap:10px;min-height:48px;border:1px solid #d7dee4;border-radius:13px;background:#fff;padding:7px 8px 7px 12px;box-shadow:0 4px 16px rgba(29,39,49,.035)}.ai-assist-identity{display:flex;align-items:center;gap:9px;min-width:0;margin-right:auto}.ai-assist-mark{display:grid;place-items:center;flex:0 0 24px;width:24px;height:24px;border-radius:8px;background:#f1e9bf;color:#6f622c;font:900 11px/1 Inter,system-ui,sans-serif}.ai-assist-copy{min-width:0}.ai-assist-copy strong{display:block;color:#17212b;font:850 11px/1.25 Inter,system-ui,sans-serif}.ai-assist-copy span{display:block;max-width:520px;margin-top:2px;color:#7b8690;font:600 10px/1.3 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ai-assist-run{min-height:34px;border:1px solid #17212b;border-radius:9px;background:#17212b;color:#fff;padding:8px 11px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}.ai-assist-run:disabled{opacity:.5;cursor:wait}.ai-assist-more{position:relative}.ai-assist-more summary{display:grid;place-items:center;width:34px;height:34px;border:1px solid #d4dce2;border-radius:9px;color:#66727c;font:900 15px/1 Inter,system-ui,sans-serif;cursor:pointer;list-style:none}.ai-assist-more summary::-webkit-details-marker{display:none}.ai-assist-menu{position:absolute;z-index:20;right:0;top:40px;width:240px;border:1px solid #d6dde3;border-radius:12px;background:#fff;padding:6px;box-shadow:0 16px 38px rgba(25,34,43,.14)}.ai-assist-menu button{display:block;width:100%;border:0;border-radius:8px;background:transparent;padding:9px 10px;color:#27333e;text-align:left;font:750 11px/1.3 Inter,system-ui,sans-serif;cursor:pointer}.ai-assist-menu button:hover{background:#f3f5f6}.ai-assist-result{margin-top:8px}.ai-assist-card{border:1px solid #d6dde3;border-radius:13px;background:#fff;padding:14px 15px}.ai-assist-card[data-status="needs_input"]{border-color:#e3d59a;background:#fffdf5}.ai-assist-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-bottom:7px;color:#85909a;font:800 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}.ai-assist-meta i{width:4px;height:4px;border-radius:50%;background:#b9c1c7}.ai-assist-card h4{margin:0;color:#17212b;font:850 15px/1.3 Inter,system-ui,sans-serif}.ai-assist-recommendation{max-width:900px;margin:6px 0 0;color:#4f5b66;font:600 12px/1.5 Inter,system-ui,sans-serif}.ai-assist-next{display:flex;gap:8px;align-items:flex-start;margin-top:10px;padding:9px 10px;border-radius:9px;background:#f5f7f8;color:#35424d;font:700 11px/1.4 Inter,system-ui,sans-serif}.ai-assist-next span{flex:0 0 auto;color:#7c8790;font:850 9px/1.5 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}.ai-assist-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.ai-assist-option{border:1px solid #dde3e7;border-radius:9px;padding:10px}.ai-assist-option strong{display:block;font:850 11px/1.3 Inter,system-ui,sans-serif}.ai-assist-option p{margin:4px 0 0;color:#5f6a74;font:600 10px/1.4 Inter,system-ui,sans-serif}.ai-assist-formula,.ai-assist-learning{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ai-assist-unit{border:1px solid #dde3e7;border-radius:9px;padding:10px}.ai-assist-unit span{display:block;margin-bottom:4px;color:#87929c;font:850 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}.ai-assist-unit p{margin:0;color:#35424d;font:650 11px/1.45 Inter,system-ui,sans-serif;white-space:pre-wrap}.ai-assist-unit[data-formula="true"]{background:#f7f2dc}.ai-assist-details{margin-top:9px}.ai-assist-details summary{width:max-content;color:#687480;font:800 10px/1.3 Inter,system-ui,sans-serif;cursor:pointer}.ai-assist-detail-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:7px}.ai-assist-detail-body div{border-left:2px solid #e0e5e9;padding-left:9px}.ai-assist-detail-body span{display:block;color:#87929c;font:850 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}.ai-assist-detail-body p,.ai-assist-detail-body ul{margin:4px 0 0;padding-left:0;color:#53606b;font:600 10px/1.45 Inter,system-ui,sans-serif;list-style-position:inside}.ai-assist-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.ai-assist-actions button{min-height:32px;border:1px solid #d0d8de;border-radius:8px;background:#fff;color:#27333e;padding:7px 9px;font:800 10px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-assist-actions button[data-primary="true"]{border-color:#17212b;background:#17212b;color:#fff}',
      '.ai-provider-config{display:grid;gap:8px;margin-top:12px}.ai-provider-config label{display:grid;gap:5px;color:#7b8791;font:800 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase}.ai-provider-config input,.ai-provider-config select{width:100%;min-height:38px;border:1px solid #cfd8df;border-radius:9px;background:#fff;padding:8px 10px;color:#17212b;font:650 11px/1.3 Inter,system-ui,sans-serif;box-sizing:border-box}.ai-provider-config-actions{display:flex;flex-wrap:wrap;gap:7px}.ai-provider-config button{min-height:36px;border:1px solid #ccd5dc;border-radius:9px;background:#fff;color:#17212b;padding:8px 10px;font:800 10px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-provider-config button[data-primary="true"]{border-color:#17212b;background:#17212b;color:#fff}.ai-provider-config button:disabled{opacity:.5;cursor:wait}.ai-provider-error{margin-top:8px;color:#a04a3d;font:700 10px/1.4 Inter,system-ui,sans-serif}.ai-provider-note{margin:0;color:#7b8791;font:600 10px/1.4 Inter,system-ui,sans-serif}.ai-provider-message{margin:0 0 11px;padding:10px 12px;border:1px solid #d8e0e6;border-radius:10px;background:#f8fafb;color:#4f5b66;font:700 11px/1.4 Inter,system-ui,sans-serif}.ai-provider-message[data-error="true"]{border-color:#efc7bd;background:#fff1ee;color:#8f382c}.ai-v2-provider[data-active="true"]{border-color:#a9953f;box-shadow:0 0 0 2px rgba(169,149,63,.12)}body.dark .ai-provider-config input,body.dark .ai-provider-config select,body.dark .ai-provider-config button{border-color:#46515a;background:#273039;color:#f5f6f7}',
      '.ai-routing-control{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 12px;padding:11px 12px;border:1px solid #d8e0e6;border-radius:11px;background:#f8fafb}.ai-routing-control strong{display:block;color:#17212b;font:850 11px/1.3 Inter,system-ui,sans-serif}.ai-routing-control p{margin:3px 0 0;color:#77838d;font:600 10px/1.4 Inter,system-ui,sans-serif}.ai-routing-actions{display:flex;gap:6px}.ai-routing-actions button{min-height:32px;border:1px solid #ccd5dc;border-radius:8px;background:#fff;color:#27333e;padding:7px 9px;font:800 9px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-routing-actions button[data-active="true"]{border-color:#17212b;background:#17212b;color:#fff}body.dark .ai-routing-control,body.dark .ai-routing-actions button{border-color:#46515a;background:#273039;color:#f5f6f7}body.dark .ai-routing-control strong{color:#f5f6f7}',
      'body.dark .ai-context-guide{border-color:#3d4650;background:linear-gradient(135deg,#20272f 0%,#29291f 100%);box-shadow:none}body.dark .ai-context-title{color:#f5f6f7}body.dark .ai-context-description{color:#aab2ba}body.dark .ai-context-status,body.dark .ai-context-basis span,body.dark .ai-context-action,body.dark .ai-context-custom textarea,body.dark .ai-context-result .ai-companion-answer{border-color:#46515a;background:#273039;color:#f5f6f7}body.dark .ai-context-action{color:#f5f6f7}body.dark .ai-proposal-block strong,body.dark .ai-proposal-block p,body.dark .ai-proposal-block ol{color:#dbe0e4}body.dark .ai-proposal-template{background:#353421;color:#f0e6ac!important}',
      'body.dark .ai-assist-row,body.dark .ai-assist-card,body.dark .ai-assist-menu,body.dark .ai-assist-option,body.dark .ai-assist-unit,body.dark .ai-assist-actions button{border-color:#46515a;background:#273039;color:#f5f6f7}body.dark .ai-assist-copy strong,body.dark .ai-assist-card h4,body.dark .ai-assist-option strong{color:#f5f6f7}body.dark .ai-assist-copy span,body.dark .ai-assist-recommendation,body.dark .ai-assist-option p,body.dark .ai-assist-unit p,body.dark .ai-assist-detail-body p,body.dark .ai-assist-detail-body ul{color:#c8d0d6}body.dark .ai-assist-next{background:#20272f;color:#dbe0e4}body.dark .ai-assist-unit[data-formula="true"]{background:#353421}body.dark .ai-assist-menu button{color:#edf0f2}body.dark .ai-assist-menu button:hover{background:#333d46}',
      '@media(max-width:980px){.ai-context-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:760px){.ai-assist-row{align-items:flex-start;flex-wrap:wrap}.ai-assist-identity{flex-basis:100%}.ai-assist-run{flex:1}.ai-assist-menu{right:-2px}.ai-assist-options,.ai-assist-formula,.ai-assist-learning,.ai-assist-detail-body{grid-template-columns:1fr}.ai-assist-copy span{white-space:normal}.ai-assist-card{padding:13px}}',
      '@media(max-width:620px){.ai-companion-controls{align-items:stretch;flex-direction:column}.ai-companion-run{width:100%}.ai-context-guide{margin:18px 0 24px;padding:17px;border-radius:15px}.ai-context-head{display:block}.ai-context-status{margin-top:12px}.ai-context-title{font-size:19px}.ai-context-actions{grid-template-columns:1fr}.ai-context-custom-row{grid-template-columns:1fr}.ai-context-custom button{min-height:42px}.ai-companion-answer-actions{flex-wrap:wrap}}'
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

  function proposalText(proposal) {
    if (!proposal) return '';
    const lines = [
      proposal.headline || proposal.title,
      proposal.recommendation || proposal.answer,
      proposal.observation && 'Observation: ' + proposal.observation,
      proposal.interpretation && 'Interpretation: ' + proposal.interpretation,
      proposal.learningDecision && 'Decision: ' + proposal.learningDecision,
      (proposal.why || proposal.rationale) && 'Why: ' + (proposal.why || proposal.rationale),
      proposal.nextAction && 'Next: ' + proposal.nextAction,
      Array.isArray(proposal.options) && proposal.options.length ? 'Options:\n' + proposal.options.map(item => '- ' + item.label + ': ' + item.direction).join('\n') : '',
      (proposal.formula || proposal.template) && 'Fill-in formula:\n' + (proposal.formula || proposal.template),
      proposal.example && 'Filled example:\n' + proposal.example,
      Array.isArray(proposal.evidence) && proposal.evidence.length ? 'Evidence used:\n- ' + proposal.evidence.join('\n- ') : '',
      Array.isArray(proposal.missing || proposal.uncertainties) && (proposal.missing || proposal.uncertainties).length ? 'Still missing:\n- ' + (proposal.missing || proposal.uncertainties).join('\n- ') : ''
    ].filter(Boolean);
    return lines.join('\n\n');
  }

  function proposalMarkup(result, surface) {
    if (!result) return '';
    if (result.error) return '<div class="ai-companion-error">' + escapeHtml(result.error) + '</div>';
    const proposal = result.proposal || {};
    const status = proposal.status || 'ready';
    const type = proposal.type || result.responseType || 'decision';
    const evidenceItems = Array.isArray(proposal.evidence) ? proposal.evidence.slice(0, 3) : [];
    const missingItems = Array.isArray(proposal.missing || proposal.uncertainties) ? (proposal.missing || proposal.uncertainties).slice(0, 3) : [];
    const options = Array.isArray(proposal.options) && proposal.options.length
      ? '<div class="ai-assist-options">' + proposal.options.slice(0, 3).map(item => '<div class="ai-assist-option"><strong>' + escapeHtml(item.label || 'Direction') + '</strong><p>' + escapeHtml(item.direction || '') + '</p>' + (item.why ? '<p><b>Why:</b> ' + escapeHtml(item.why) + '</p>' : '') + '</div>').join('') + '</div>'
      : '';
    const formula = type === 'formula' && (proposal.formula || proposal.template || proposal.example)
      ? '<div class="ai-assist-formula"><div class="ai-assist-unit" data-formula="true"><span>Fill-in formula</span><p class="ai-proposal-template">' + escapeHtml(proposal.formula || proposal.template || '') + '</p></div><div class="ai-assist-unit"><span>Filled example</span><p>' + escapeHtml(proposal.example || '') + '</p></div></div>'
      : '';
    const learning = type === 'learning' && (proposal.observation || proposal.interpretation || proposal.learningDecision || proposal.decision)
      ? '<div class="ai-assist-learning"><div class="ai-assist-unit"><span>Observation</span><p>' + escapeHtml(proposal.observation || 'Not enough recorded yet.') + '</p></div><div class="ai-assist-unit"><span>Interpretation</span><p>' + escapeHtml(proposal.interpretation || 'Not supported yet.') + '</p></div><div class="ai-assist-unit"><span>Decision</span><p>' + escapeHtml(proposal.learningDecision || proposal.decision || 'No responsible decision yet.') + '</p></div></div>'
      : '';
    const why = proposal.why || proposal.rationale || '';
    const detailBlocks = [
      why ? '<div><span>Why</span><p>' + escapeHtml(why) + '</p></div>' : '',
      evidenceItems.length ? '<div><span>Based on</span><ul>' + evidenceItems.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' : '',
      missingItems.length ? '<div><span>Still missing</span><ul>' + missingItems.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' : ''
    ].filter(Boolean).join('');
    const details = detailBlocks ? '<details class="ai-assist-details"><summary>Why this answer</summary><div class="ai-assist-detail-body">' + detailBlocks + '</div></details>' : '';
    const routeLabel = result.provider || (result.route === 'dashboard' ? 'Dashboard check' : 'AI');
    const modelLabel = result.model && result.model !== 'No AI call' ? result.model : '';
    const modeLabel = result.taskMode && result.taskMode !== 'instant' ? result.taskMode : 'instant';
    const nextAction = proposal.nextAction || (Array.isArray(proposal.nextSteps) && proposal.nextSteps[0]) || '';
    const deepButton = status === 'ready' && result.taskMode !== 'deep' && result.route !== 'dashboard'
      ? '<button type="button" data-ai-companion-deep data-surface="' + escapeHtml(surface || 'desk') + '" data-action="' + escapeHtml(result.action || 'open-question') + '">Think deeper</button>'
      : '';
    return [
      '<article class="ai-assist-card" data-status="' + escapeHtml(status) + '">',
      '<div class="ai-assist-meta"><span>' + escapeHtml(routeLabel) + '</span>' + (modelLabel ? '<i></i><span>' + escapeHtml(modelLabel) + '</span>' : '') + '<i></i><span>' + escapeHtml(modeLabel) + '</span>' + (proposal.confidence ? '<i></i><span>' + escapeHtml(proposal.confidence) + ' confidence</span>' : '') + (result.staged ? '<i></i><span>Kept for review</span>' : '') + '</div>',
      '<h4>' + escapeHtml(proposal.headline || proposal.title || 'AI check') + '</h4>',
      '<p class="ai-assist-recommendation">' + escapeHtml(proposal.recommendation || proposal.answer || '') + '</p>',
      options,
      formula,
      learning,
      nextAction ? '<div class="ai-assist-next"><span>Next</span><div>' + escapeHtml(nextAction) + '</div></div>' : '',
      details,
      '<div class="ai-assist-actions"><button type="button" data-ai-companion-stage data-primary="true" data-surface="' + escapeHtml(surface || 'desk') + '">' + (result.staged ? 'Kept for review' : 'Keep for review') + '</button><button type="button" data-ai-companion-copy data-surface="' + escapeHtml(surface || 'desk') + '">Copy</button>' + deepButton + '</div>',
      '</article>'
    ].join('');
  }

  function surfaceKey() {
    const value = appState();
    const view = clean(value && value.view || 'home', 40).toLowerCase();
    return ACTION_CATALOG[view] ? view : 'home';
  }

  function contextualResultMarkup(view) {
    if (runningSurface === view) {
      return '<div class="ai-assist-result"><article class="ai-assist-card"><div class="ai-assist-meta"><span>Working</span></div><h4>Checking the relevant decisions…</h4><p class="ai-assist-recommendation">Using only the context this decision inherits.</p></article></div>';
    }
    const result = resultBySurface[view];
    return result ? '<div class="ai-assist-result">' + proposalMarkup(result, view) + '</div>' : '';
  }

  function primaryActionFor(view, value, creator, video) {
    const catalog = ACTION_CATALOG[view] || ACTION_CATALOG.home;
    let id = catalog.primary;
    if (view === 'strategy') id = STRATEGY_PRIMARY[value.strategyTab || creator && creator.strategyTab || 'snapshot'] || id;
    if (view === 'planner') id = VIDEO_STEP_PRIMARY[videoStep(video)] || id;
    return (catalog.actions || []).find(item => item.id === id) || catalog.actions[0];
  }

  function placeAssist(host, page, view) {
    let anchor = null;
    if (view === 'planner') anchor = page.querySelector('.decision-head');
    if (view === 'learn') {
      anchor = [...page.querySelectorAll('.section-head')].find(item => /Learning loop/i.test(item.textContent || '')) || null;
    }
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling !== host) anchor.parentNode.insertBefore(host, anchor.nextSibling);
      return;
    }
    const first = page.firstElementChild;
    if (first && first.nextSibling !== host) page.insertBefore(host, first.nextSibling);
  }

  function renderContextualGuide() {
    contextualRenderQueued = false;
    const page = document.querySelector('#app main .page');
    if (!page || !page.firstElementChild) return;
    const view = surfaceKey();
    const surface = ACTION_CATALOG[view];
    const value = appState();
    const creator = creatorFor(value);
    const video = videoFor(value, creator);
    let host = page.querySelector('[data-ai-context-guide]');
    if (!host) {
      host = document.createElement('aside');
      host.className = 'ai-assist';
      host.setAttribute('data-ai-context-guide', '');
    }
    placeAssist(host, page, view);
    const result = resultBySurface[view];
    const primary = primaryActionFor(view, value, creator, video);
    const signature = [view, creator && creator.id, value && value.currentVideoId, videoStep(video), value && value.strategyTab, creator && creator.strategyTab, value && value.learnWindow, companion.connected, companion.checking, runningSurface, result && (result.threadId || result.model), result && result.error, result && result.staged, primary && primary.id].join('|');
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    const otherActions = (surface.actions || []).filter(action => action.id !== primary.id).map(action => '<button type="button" data-ai-context-action="' + escapeHtml(action.id) + '"' + (runningSurface ? ' disabled' : '') + '>' + escapeHtml(action.label) + '</button>').join('');
    const statusText = companion.connected ? (companion.routingMode === 'auto' ? 'Auto routing' : (companion.model || 'AI ready')) : (companion.checking ? 'Connecting' : 'AI offline');
    host.innerHTML = [
      '<div class="ai-assist-row">',
      '<div class="ai-assist-identity"><span class="ai-assist-mark" aria-hidden="true">A</span><div class="ai-assist-copy"><strong>AI assist · ' + escapeHtml(statusText) + '</strong><span>' + escapeHtml(surface.cue) + '</span></div></div>',
      '<button class="ai-assist-run" type="button" data-ai-context-action="' + escapeHtml(primary.id) + '"' + (runningSurface ? ' disabled' : '') + '>' + escapeHtml(runningSurface === view ? 'Checking…' : primary.label) + '</button>',
      otherActions ? '<details class="ai-assist-more"><summary aria-label="Other AI checks">•••</summary><div class="ai-assist-menu">' + otherActions + '</div></details>' : '',
      '</div>',
      contextualResultMarkup(view)
    ].join('');
  }

  function scheduleContextualRender() {
    if (contextualRenderQueued) return;
    contextualRenderQueued = true;
    requestAnimationFrame(renderContextualGuide);
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
    host.innerHTML = proposalMarkup(lastResult, 'desk');
  }

  function modelField(route) {
    const models = Array.isArray(route.models) ? route.models : [];
    if (models.length) {
      return '<label>Model<select data-ai-provider-model>' + models.map(model => '<option value="' + escapeHtml(model.id) + '"' + (model.id === route.model ? ' selected' : '') + '>' + escapeHtml(model.name || model.id) + '</option>').join('') + '</select></label>';
    }
    return '<label>Model<input data-ai-provider-model value="' + escapeHtml(route.model || '') + '" placeholder="Auto-detect the loaded model"></label>';
  }

  function providerCard(route) {
    const selected = route.selected === true || companion.activeRoute === route.id;
    const connected = route.connected === true;
    const status = selected && connected ? 'Active now' : (selected ? 'Selected · offline' : (connected ? 'Connected' : (route.configured ? 'Not running' : 'Set up')));
    const busy = providerBusy === route.id;
    if (route.id === 'codex') {
      return [
        '<article class="ai-v2-provider" data-active="' + String(selected) + '" data-ai-provider-card="codex">',
        '<div class="ai-v2-provider-top"><strong>Codex / ChatGPT</strong><span class="ai-v2-provider-tag">' + escapeHtml(status) + '</span></div>',
        '<small>' + escapeHtml(connected ? 'Uses your ChatGPT-managed Codex sign-in. Choose any model available to this account.' : (route.error || 'Codex is not connected.')) + '</small>',
        '<div class="ai-provider-config">' + modelField(route) + '<div class="ai-provider-config-actions"><button type="button" data-ai-provider-select="codex" data-primary="true"' + (busy || !connected ? ' disabled' : '') + '>' + (busy ? 'Switching…' : (selected ? 'Use selected model' : 'Use Codex')) + '</button></div></div>',
        '</article>'
      ].join('');
    }
    const copy = route.id === 'lmstudio'
      ? 'Start LM Studio’s local server, then test and save it here.'
      : (route.id === 'mlx' ? 'Start your OpenAI-compatible MLX server, then test it here.' : 'Connect any OpenAI-compatible local or HTTPS model server.');
    return [
      '<article class="ai-v2-provider" data-active="' + String(selected) + '" data-ai-provider-card="' + escapeHtml(route.id) + '">',
      '<div class="ai-v2-provider-top"><strong>' + escapeHtml(route.name) + '</strong><span class="ai-v2-provider-tag">' + escapeHtml(status) + '</span></div>',
      '<small>' + escapeHtml(copy) + '</small>',
      '<div class="ai-provider-config">',
      '<label>Server address<input data-ai-provider-url value="' + escapeHtml(route.baseUrl || '') + '" placeholder="http://127.0.0.1:1234/v1"></label>',
      modelField(route),
      route.id === 'custom' ? '<label>API key · optional<input data-ai-provider-key type="password" value="" placeholder="Stored in macOS Keychain"></label>' : '',
      '<div class="ai-provider-config-actions"><button type="button" data-ai-provider-save="' + escapeHtml(route.id) + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Testing…' : 'Test & save') + '</button><button type="button" data-ai-provider-select="' + escapeHtml(route.id) + '" data-primary="true"' + (busy || !connected ? ' disabled' : '') + '>Use this route</button>' + (route.configured ? '<button type="button" data-ai-provider-forget="' + escapeHtml(route.id) + '"' + (busy ? ' disabled' : '') + '>Forget</button>' : '') + '</div>',
      route.error ? '<p class="ai-provider-error">' + escapeHtml(route.error) + '</p>' : '<p class="ai-provider-note">' + (route.hasApiKey ? 'API key is stored securely in macOS Keychain.' : 'No key is stored for this route.') + '</p>',
      '</div></article>'
    ].join('');
  }

  function renderProviders() {
    const host = document.querySelector('[data-ai-v2-providers]');
    if (!host) return;
    const routes = companion.routes || {};
    const ordered = ['codex', 'lmstudio', 'mlx', 'custom'].map(id => routes[id]).filter(Boolean);
    if (!ordered.length) return;
    const signature = JSON.stringify(ordered) + '|' + companion.activeRoute + '|' + companion.routingMode + '|' + providerBusy + '|' + JSON.stringify(providerMessage);
    if (host.dataset.signature === signature) return;
    if (host.contains(document.activeElement) && !providerBusy) return;
    host.dataset.signature = signature;
    const message = providerMessage ? '<p class="ai-provider-message" data-error="' + String(providerMessage.error === true) + '">' + escapeHtml(providerMessage.text) + '</p>' : '';
    const auto = companion.routingMode !== 'fixed';
    const routing = '<div class="ai-routing-control"><div><strong>How models are chosen</strong><p>' + (auto ? 'Automatic uses a faster model for quick checks and more reasoning for diagnosis, plans and results.' : 'Fixed keeps every request on the model selected below.') + '</p></div><div class="ai-routing-actions"><button type="button" data-ai-routing-set="auto" data-active="' + String(auto) + '">Automatic</button><button type="button" data-ai-routing-set="fixed" data-active="' + String(!auto) + '">Fixed</button></div></div>';
    host.innerHTML = message + routing + '<div class="ai-v2-provider-grid">' + ordered.map(providerCard).join('') + '</div>';
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
      button.textContent = usingCompanion ? 'AI · ' + (companion.provider || 'Connected') : (connected ? 'AI · Codex tools' : 'AI · Offline');
    }
    const safety = document.querySelector('#accelerator-ai-v2-drawer .ai-v2-safety');
    if (safety) {
      safety.innerHTML = usingCompanion
        ? '<strong>' + escapeHtml(companion.provider || 'AI') + ' is ready on this Mac.</strong> The active route is always shown below. AI can read the V2 creator you have open and return review drafts, but it cannot silently edit or cloud-save dashboard data.'
        : '<strong>AI is offline.</strong> Start the Accelerator AI Companion on this Mac, then this page reconnects automatically. The dashboard itself still works normally.';
    }
    const host = document.querySelector('[data-ai-v2-connection]');
    if (host) {
      const dataMode = saveDiagnostics()?.demoMode ? 'built-in demo' : (saveDiagnostics()?.cloudStateLoaded ? 'isolated V2 cloud' : 'not loaded');
      const plan = companion.account && companion.account.planType ? companion.account.planType : '';
      const modelDisplay = usingCompanion && companion.routingMode === 'auto' ? 'Automatic by task' : (usingCompanion ? companion.model : (connected ? 'Selected in Codex' : 'None'));
      host.innerHTML = [
        '<div class="ai-v2-connection">',
        '<div class="ai-v2-connection-top"><div><p class="ai-v2-connection-name">' + escapeHtml(usingCompanion ? companion.provider : (connected ? 'Codex browser tools' : 'No AI connected')) + '</p><p class="ai-v2-connection-copy">' + escapeHtml(usingCompanion ? ((companion.activeConnected === false ? 'Using a fallback route. ' : '') + 'Ready to answer throughout this dashboard.') : (companion.checking ? 'Checking the local AI companion…' : 'The local companion is not running on this Mac.')) + '</p></div><span class="ai-v2-status" data-connected="' + String(connected) + '">' + (connected ? 'Connected' : 'Offline') + '</span></div>',
        '<div class="ai-v2-facts"><div class="ai-v2-fact"><span>AI route</span><strong>' + escapeHtml(usingCompanion ? companion.provider : (connected ? 'Codex tools' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Model</span><strong>' + escapeHtml(modelDisplay) + '</strong></div><div class="ai-v2-fact"><span>Account</span><strong>' + escapeHtml(usingCompanion ? (companion.route === 'codex' ? ('ChatGPT' + (plan ? ' · ' + plan : '')) : 'Local / connected server') : (connected ? 'Managed by Codex' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Data</span><strong>' + escapeHtml(dataMode) + '</strong></div></div>',
        '<ul class="ai-v2-permissions"><li>Read the current V2 creator and video</li><li>Generate and stage recommendations</li><li data-no="true">Cannot silently edit dashboard data</li><li data-no="true">Cannot write to cloud through AI</li></ul>',
        usingCompanion ? '' : '<div class="ai-v2-try"><code>Chrome may ask once for permission to connect this V2 page to the AI companion on your Mac.</code><a class="ai-v2-mini-button" href="http://127.0.0.1:4873/dashboard" target="_blank" rel="noopener">Open local AI version</a></div>',
        '</div>'
      ].join('');
    }
    renderProviders();
    const run = document.querySelector('[data-ai-companion-run]');
    if (run) {
      run.disabled = running || !usingCompanion;
      run.textContent = running ? 'Thinking…' : (usingCompanion ? 'Ask AI' : 'Companion offline');
    }
    renderOutput();
    scheduleContextualRender();
  }

  async function requestAi(question, surface, action, depth) {
    question = clean(question, 4000);
    if (action === 'open-question' && !question) {
      if (surface === 'desk') lastResult = { error: 'Enter a question first.' };
      else resultBySurface[surface] = { error: 'Enter a question first.' };
      return render();
    }
    const context = currentContext(action);
    if (!context) {
      if (surface === 'desk') lastResult = { error: 'The V2 creator context is not ready yet.' };
      else resultBySurface[surface] = { error: 'The V2 creator context is not ready yet.' };
      return render();
    }
    if (!companion.connected) {
      companion.checking = true;
      render();
      const ready = await checkCompanion();
      if (!ready) {
        const error = { error: companion.error || 'Accelerator AI is not connected on this Mac.' };
        if (surface === 'desk') lastResult = error;
        else resultBySurface[surface] = error;
        return render();
      }
    }
    if (surface === 'desk') {
      running = true;
      lastResult = null;
    } else {
      runningSurface = surface;
      resultBySurface[surface] = null;
    }
    render();
    try {
      const result = await companionFetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, surface, action, depth: depth || 'auto' })
      });
      if (surface === 'desk') lastResult = result;
      else resultBySurface[surface] = result;
    } catch (error) {
      if (surface === 'desk') lastResult = { error: error.message };
      else resultBySurface[surface] = { error: error.message };
      await checkCompanion();
    } finally {
      if (surface === 'desk') running = false;
      else runningSurface = '';
      render();
    }
  }

  function askAi() {
    const field = document.getElementById('accelerator-ai-question');
    return requestAi(field && field.value, 'desk', 'open-question');
  }

  function askContextualAction(actionId) {
    const surface = surfaceKey();
    const action = (ACTION_CATALOG[surface].actions || []).find(item => item.id === actionId);
    if (!action) return;
    return requestAi(action.label, surface, action.id, 'auto');
  }

  function askDeeper(surface, actionId) {
    const result = resultForSurface(surface);
    const question = actionId === 'open-question' && surface === 'desk'
      ? document.getElementById('accelerator-ai-question')?.value || ''
      : actionMeta(actionId, surface).label;
    return requestAi(question, surface, actionId, 'deep');
  }

  function stageResult(result, surface) {
    const proposal = result && result.proposal;
    if (!proposal) return;
    const drafts = readDrafts();
    const creator = creatorFor(appState());
    drafts.unshift({
      id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      creatorId: creator ? creator.id : null,
      creatorName: creator ? creator.name : '',
      title: clean(proposal.title || 'AI recommendation', 120),
      target: clean(proposal.target || 'Current creator', 120),
      summary: clean(proposal.summary || proposal.answer, 1200),
      recommendation: clean(proposal.recommendation || proposal.answer, 3000),
      evidence: Array.isArray(proposal.evidence) ? proposal.evidence.map(item => clean(item, 500)).filter(Boolean).slice(0, 8) : [],
      decision: clean(proposal.decision, 1200),
      rationale: clean(proposal.rationale, 1600),
      nextSteps: Array.isArray(proposal.nextSteps) ? proposal.nextSteps.map(item => clean(item, 500)).filter(Boolean).slice(0, 8) : [],
      watchFor: clean(proposal.watchFor, 1000),
      template: clean(proposal.template, 1800),
      example: clean(proposal.example, 2400),
      uncertainties: Array.isArray(proposal.uncertainties) ? proposal.uncertainties.map(item => clean(item, 500)).filter(Boolean).slice(0, 8) : [],
      surface: surface || 'desk',
      action: clean(result.action, 80),
      status: 'Draft - not applied'
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts.slice(0, 25)));
    result.staged = true;
    render();
    if (surface === 'desk') {
      const dialog = document.getElementById('accelerator-ai-v2-drawer');
      if (dialog && dialog.open) dialog.close();
      document.getElementById('accelerator-ai-v2-button')?.click();
    }
  }

  function resultForSurface(surface) {
    return surface === 'desk' ? lastResult : resultBySurface[surface];
  }

  async function copyResult(surface) {
    const result = resultForSurface(surface);
    const text = proposalText(result && result.proposal);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const toastFn = readBinding('toast');
      if (typeof toastFn === 'function') toastFn('AI recommendation copied');
    } catch (_) {}
  }

  function providerFormValues(route) {
    const card = document.querySelector('[data-ai-provider-card="' + route + '"]');
    return {
      route,
      baseUrl: clean(card && card.querySelector('[data-ai-provider-url]') && card.querySelector('[data-ai-provider-url]').value, 500),
      model: clean(card && card.querySelector('[data-ai-provider-model]') && card.querySelector('[data-ai-provider-model]').value, 200),
      apiKey: clean(card && card.querySelector('[data-ai-provider-key]') && card.querySelector('[data-ai-provider-key]').value, 1000)
    };
  }

  async function saveProvider(route) {
    const values = providerFormValues(route);
    providerBusy = route;
    providerMessage = null;
    render();
    try {
      await companionFetch('/providers/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      providerMessage = { error: false, text: 'Connected and saved ' + (route === 'lmstudio' ? 'LM Studio' : (route === 'mlx' ? 'MLX' : 'the custom model server')) + '. You can select it now.' };
      await checkCompanion();
    } catch (error) {
      providerMessage = { error: true, text: error.message };
    } finally {
      providerBusy = '';
      render();
    }
  }

  async function selectProvider(route) {
    const values = providerFormValues(route);
    providerBusy = route;
    providerMessage = null;
    render();
    try {
      await companionFetch('/providers/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route, model: values.model })
      });
      providerMessage = { error: false, text: (route === 'codex' ? 'Codex' : (route === 'lmstudio' ? 'LM Studio' : (route === 'mlx' ? 'MLX' : 'Custom server'))) + ' is now the active AI route.' };
      await checkCompanion();
    } catch (error) {
      providerMessage = { error: true, text: error.message };
    } finally {
      providerBusy = '';
      render();
    }
  }

  async function forgetProvider(route) {
    providerBusy = route;
    providerMessage = null;
    render();
    try {
      await companionFetch('/providers/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route })
      });
      providerMessage = { error: false, text: 'Removed the saved ' + (route === 'lmstudio' ? 'LM Studio' : (route === 'mlx' ? 'MLX' : 'custom server')) + ' connection.' };
      await checkCompanion();
    } catch (error) {
      providerMessage = { error: true, text: error.message };
    } finally {
      providerBusy = '';
      render();
    }
  }

  async function setRoutingMode(mode) {
    providerBusy = 'routing';
    providerMessage = null;
    render();
    try {
      await companionFetch('/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      providerMessage = { error: false, text: mode === 'auto' ? 'Automatic routing is on. Each dashboard task now gets the appropriate speed and reasoning depth.' : 'Fixed routing is on. Every task will use the model selected below.' };
      await checkCompanion();
    } catch (error) {
      providerMessage = { error: true, text: error.message };
    } finally {
      providerBusy = '';
      render();
    }
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-ai-companion-run]')) askAi();
    const contextualAction = event.target.closest('[data-ai-context-action]');
    if (contextualAction) {
      contextualAction.closest('details')?.removeAttribute('open');
      askContextualAction(contextualAction.dataset.aiContextAction);
    }
    const deep = event.target.closest('[data-ai-companion-deep]');
    if (deep) askDeeper(deep.dataset.surface || 'desk', deep.dataset.action || 'open-question');
    const stage = event.target.closest('[data-ai-companion-stage]');
    if (stage) {
      const surface = stage.dataset.surface || 'desk';
      stageResult(resultForSurface(surface), surface);
    }
    const copy = event.target.closest('[data-ai-companion-copy]');
    if (copy) copyResult(copy.dataset.surface || 'desk');
    const providerSave = event.target.closest('[data-ai-provider-save]');
    if (providerSave) saveProvider(providerSave.dataset.aiProviderSave);
    const providerSelect = event.target.closest('[data-ai-provider-select]');
    if (providerSelect) selectProvider(providerSelect.dataset.aiProviderSelect);
    const providerForget = event.target.closest('[data-ai-provider-forget]');
    if (providerForget) forgetProvider(providerForget.dataset.aiProviderForget);
    const routingMode = event.target.closest('[data-ai-routing-set]');
    if (routingMode) setRoutingMode(routingMode.dataset.aiRoutingSet);
    if (event.target.closest('#accelerator-ai-v2-button')) {
      if (!companion.connected) {
        companion.checking = true;
        setTimeout(() => { render(); checkCompanion(); }, 0);
      } else {
        setTimeout(render, 0);
      }
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.closest('[data-ai-v2-providers]')) event.preventDefault();
  });

  const originalDiagnostics = window.__acceleratorAiV2Diagnostics;
  window.__acceleratorAiCompanionDiagnostics = () => ({
    url: COMPANION_URL,
    connected: companion.connected,
    checking: companion.checking,
    provider: companion.provider || null,
    model: companion.model || null,
    route: companion.route || null,
    activeRoute: companion.activeRoute || null,
    routingMode: companion.routingMode || null,
    fallbackRoute: companion.fallbackRoute || null,
    routes: companion.routes || null,
    account: companion.account || null,
    lastError: companion.error || null,
    running,
    runningSurface: runningSurface || null,
    hasResult: Boolean(lastResult && lastResult.ok),
    contextualSurfaces: Object.keys(ACTION_CATALOG),
    contextualResults: Object.keys(resultBySurface).filter(key => Boolean(resultBySurface[key] && resultBySurface[key].ok))
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
    const app = document.getElementById('app');
    if (app) {
      new MutationObserver(scheduleContextualRender).observe(app, { childList: true, subtree: true });
    }
    if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
      companion.checking = true;
      setTimeout(checkCompanion, 100);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
</script>`;
};
