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
      eyebrow: 'Decision support',
      title: 'Decide what matters now',
      description: 'Connect the diagnosis, active month, open commitments and latest evidence before choosing the next move.',
      actions: [
        { id: 'next-decision', label: 'Choose the next decision', prompt: 'Choose the single most important decision Blake should make next for this creator. Explain why it is the constraint right now, what it unlocks, the first concrete move, and what to deliberately ignore until this is resolved.' },
        { id: 'diagnosis-check', label: 'Pressure-test the diagnosis', prompt: 'Pressure-test the current diagnosis against the creator strategy, plan, videos, coaching history and available results. Say what supports it, what contradicts it, what is still an assumption, and whether Blake should keep, refine or replace it.' },
        { id: 'call-prep', label: 'Prepare the next call', prompt: 'Prepare a concise coaching-call decision brief for this creator: the decision that needs to be made, the evidence to review, three sharp questions, the likely coaching focus, and one useful commitment to leave with.' }
      ]
    },
    strategy: {
      eyebrow: 'Strategy partner',
      title: 'Make the strategy more specific',
      description: 'Use the creator record, audience evidence and business path to sharpen the source of truth—not just make the wording sound nicer.',
      actions: [
        { id: 'audience-sharpen', label: 'Sharpen the audience', prompt: 'Audit and improve the audience definition for this creator. Separate evidence from assumptions, identify the exact person and decision moment, preserve useful audience language, name the biggest unknowns, and provide a stronger one-person definition Blake can use.' },
        { id: 'message-strengthen', label: 'Strengthen the message', prompt: 'Strengthen this creator\'s message by connecting the audience tension, desired result, distinctive approach and proof. Give Blake both a reusable bracketed message formula and one fully filled creator-specific example, then explain what changed and why.' },
        { id: 'business-path', label: 'Connect content to business', prompt: 'Review whether the audience, channel promise, content jobs, offer and business path logically connect. Identify the weakest handoff, recommend the next decision, and give one creator-specific example of the improved path.' }
      ]
    },
    plan: {
      eyebrow: 'Planning partner',
      title: 'Turn the diagnosis into a focused plan',
      description: 'Check that the 90-day direction and this month’s work actually resolve the active constraint and create useful evidence.',
      actions: [
        { id: 'plan-coherence', label: 'Review the focus', prompt: 'Review the diagnosis, 90-day chapters, active month and video mix as one system. Identify any weak link, state the clearest focus for this month, what success would look like, and what should not be added yet.' },
        { id: 'month-breakdown', label: 'Break down this month', prompt: 'Turn the active month into a practical decision and execution breakdown for Blake. Include the focus, the sequence of work, what to look for in each video, the evidence to capture, and the checkpoint that determines the next move.' },
        { id: 'missing-proof', label: 'Find missing proof', prompt: 'Find the most important evidence missing from this plan. Separate what is known, inferred and unknown; recommend the smallest useful test or research step; and explain which future decision that evidence will improve.' },
        { id: 'plan-report', label: 'Draft the plan conclusion', prompt: 'Draft a decision-ready plan conclusion using only recorded evidence. Separate observation, interpretation and decision; state what stays, what changes, what remains uncertain, and the next-month focus. Do not invent results.' }
      ]
    },
    videos: {
      eyebrow: 'Creative decision support',
      title: 'Improve the current video in context',
      description: 'Use the creator, active diagnosis, portfolio role and prior learning—not generic YouTube advice.',
      actions: [
        { id: 'video-fit', label: 'Check creator + plan fit', prompt: 'Review the current video against the exact viewer, active constraint, monthly focus, portfolio job and business path. Identify the weakest alignment, recommend the decision to make before producing further, and show the corrected creator-specific direction.' },
        { id: 'package-directions', label: 'Improve the package', prompt: 'Create three distinct title-and-thumbnail directions for the current video grounded in this creator and audience. For each, give the reusable bracketed formula, one fully filled title example, the thumbnail concept, the click mechanism, and the evidence or assumption behind it.' },
        { id: 'hook-builder', label: 'Build the hook', prompt: 'Improve the current video hook. Give a reusable bracketed hook formula and one fully filled creator-specific example, then explain how each line confirms the click, creates useful tension, supplies proof and moves into the content.' },
        { id: 'production-handoff', label: 'Build the handoff', prompt: 'Turn the current video record into a concise creator-ready production handoff. Include the viewer, promise, title/thumbnail relationship, opening, proof assets, structure, CTA and unanswered questions. Flag missing inputs instead of inventing them.' }
      ]
    },
    learn: {
      eyebrow: 'Learning partner',
      title: 'Turn results into the next decision',
      description: 'Keep facts, explanations and decisions separate so one result becomes useful system knowledge instead of a vague takeaway.',
      actions: [
        { id: 'results-interpret', label: 'Interpret the results', prompt: 'Interpret the current video results in context of its job, traffic source, checkpoints and comparable evidence. Separate observed facts, likely explanations, uncertainty and the decision Blake can responsibly make now.' },
        { id: 'learning-conclusion', label: 'Write the conclusion', prompt: 'Write a concise learning conclusion for this video: what happened, what it most likely means, confidence, what not to conclude, what changes next, and where the learning should be routed in the dashboard.' },
        { id: 'next-experiment', label: 'Choose the next experiment', prompt: 'Design the smallest next experiment that resolves the most valuable uncertainty from this creator\'s current evidence. Define the hypothesis, variable, control, success signal, failure signal and the later decision it informs.' },
        { id: 'monthly-report', label: 'Draft the monthly report', prompt: 'Draft a client-ready monthly decision report from the recorded creator data. Include executive conclusion, evidence, wins, misses, learning, implications for strategy and the next plan decision. Clearly label missing evidence and do not invent metrics.' }
      ]
    },
    framework: {
      eyebrow: 'Framework translator',
      title: 'Use the right framework for this creator',
      description: 'Translate the library into the current decision rather than asking Blake to decide which theory applies on his own.',
      actions: [
        { id: 'framework-select', label: 'Choose the best framework', prompt: 'Choose the most useful framework, formula or playbook for this creator\'s current constraint and explain why it fits better than the nearest alternatives. Show exactly where Blake should use it next.' },
        { id: 'framework-adapt', label: 'Adapt a template', prompt: 'Create a reusable bracketed template for the current creator decision and then provide one fully filled creator-specific example. Explain which parts should stay fixed, which parts Blake should replace, and what evidence would improve it.' },
        { id: 'framework-audit', label: 'Challenge the logic', prompt: 'Challenge the current strategy and plan using the framework library. Identify one hidden assumption, one possible contradiction and one decision rule Blake should use before moving forward.' }
      ]
    },
    creators: {
      eyebrow: 'Portfolio partner',
      title: 'See who needs you most',
      description: 'Compare active constraints, current plans, open commitments and evidence gaps across the creator portfolio.',
      actions: [
        { id: 'portfolio-triage', label: 'Triage the portfolio', prompt: 'Triage the creator portfolio. Rank who needs Blake\'s attention first using active constraint, stalled decisions, commitments, plan status and evidence—not profile completeness. Explain the top three and the next action for each.' },
        { id: 'portfolio-risk', label: 'Find stalled decisions', prompt: 'Find creators whose recorded work suggests a stalled, contradictory or unsupported decision. State the risk, the evidence in the dashboard, and the smallest intervention Blake should make.' },
        { id: 'portfolio-calls', label: 'Plan the next calls', prompt: 'Recommend the next coaching-call order across the creator portfolio and give the decision each call should resolve. Keep the recommendations specific to the recorded creator context.' }
      ]
    },
    calendar: {
      eyebrow: 'Execution partner',
      title: 'Make the schedule serve the decisions',
      description: 'Check timing, capacity, review windows and commitments against what each creator actually needs next.',
      actions: [
        { id: 'schedule-review', label: 'Review the next two weeks', prompt: 'Review the next two weeks of recorded creator work, publish dates, reviews, coaching calls and commitments. Identify the priority sequence, missing decision checkpoints and any timing conflict that could weaken the learning loop.' },
        { id: 'capacity-risk', label: 'Find capacity risks', prompt: 'Find likely capacity or sequencing risks between the creator plans, video work, reviews and commitments. Recommend what Blake should move, combine, defer or protect, and explain the decision logic.' },
        { id: 'review-timing', label: 'Set review timing', prompt: 'Recommend the useful review and coaching checkpoints for the active creator based on the current videos and plan. Explain what evidence should exist at each checkpoint before a decision is made.' }
      ]
    },
    library: {
      eyebrow: 'Decision library guide',
      title: 'Find only the depth you need',
      description: 'Use the library as a decision tool for the active creator instead of reading it like a textbook.',
      actions: [
        { id: 'library-route', label: 'Find the right resource', prompt: 'Based on the active creator, current constraint, plan and video, identify the specific decision-library resource Blake should use now, the question it should answer, and what should change after using it.' },
        { id: 'library-translate', label: 'Translate it to this creator', prompt: 'Translate the most relevant library principle into a creator-specific checklist. Include a reusable version and one fully filled example using this creator\'s current work.' },
        { id: 'library-gap', label: 'Find a system gap', prompt: 'Identify an important creator decision that the current dashboard record or decision library does not adequately support. Explain the gap, the risk and the smallest useful addition.' }
      ]
    }
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

  function decisionTrail(value, creator, video) {
    if (!creator) return null;
    const plan = creator.quarterPlan || null;
    const activeMonthNumber = plan && Number(plan.activeMonth || 1);
    const activeMonth = plan && Array.isArray(plan.months) ? plan.months[Math.max(0, activeMonthNumber - 1)] || null : null;
    const drafts = readDrafts().filter(item => item.creatorId === creator.id).slice(0, 5).map(item => ({
      createdAt: item.createdAt || '',
      surface: item.surface || '',
      title: clean(item.title, 160),
      decision: clean(item.decision || item.recommendation, 1000),
      nextSteps: Array.isArray(item.nextSteps) ? item.nextSteps.slice(0, 5).map(step => clean(step, 400)) : [],
      status: item.status || ''
    }));
    return {
      activeDecision: {
        currentConstraint: creator.currentConstraint || '',
        diagnosis: clone(creator.diagnosis || null),
        currentView: value.view || 'home'
      },
      creatorStrategy: {
        strategy: clone(creator.strategy || null),
        audience: clone(creator.audience || null),
        message: clone(creator.message || null),
        business: clone(creator.business || null)
      },
      currentPlan: {
        roadmap: clone(creator.roadmap || null),
        quarterPlan: clone(plan),
        activeMonthNumber: activeMonthNumber || null,
        activeMonth: clone(activeMonth),
        monthExecution: clone(creator.month || null)
      },
      evidenceAndLearning: {
        recentVideoLearnings: clone((creator.learningLog || []).slice(-12)),
        systemLearnings: clone(creator.systemLearnings || null),
        recentMonthReports: clone((creator.monthReports || []).slice(0, 4))
      },
      coachingAndExecution: {
        openCommitments: clone((creator.commitments || []).filter(item => !['done', 'complete', 'completed', 'archived'].includes(String(item.status || '').toLowerCase())).slice(0, 12)),
        recentSessions: clone((creator.sessions || []).slice(-6)),
        parkingLot: clone((creator.parkingLot || []).filter(item => String(item.status || '').toLowerCase() !== 'archived').slice(0, 12))
      },
      reviewedAiDrafts: clone(drafts)
    };
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

  function currentContext() {
    const diagnostics = saveDiagnostics();
    const value = appState();
    if (!value || !diagnostics) return null;
    const demoMode = diagnostics.demoMode === true;
    if (!demoMode && (!diagnostics.cloudStateLoaded || diagnostics.workspaceId !== REQUIRED_WORKSPACE_ID)) return null;
    const creator = creatorFor(value);
    const video = videoFor(value, creator);
    const context = {
      environment: 'accelerator-ai-v2',
      dataSource: demoMode ? 'built-in-demo' : 'isolated-cloud',
      workspaceId: demoMode ? null : REQUIRED_WORKSPACE_ID,
      view: value.view || 'home',
      creator: compactCreator(creator),
      currentVideo: clone(video),
      decisionTrail: decisionTrail(value, creator, video),
      portfolio: ['creators', 'calendar'].includes(value.view) ? portfolioContext(value) : [],
      instruction: demoMode
        ? 'This is demo data. Analyze it only and do not treat it as a real client record.'
        : 'This is private V2 creator data. Analyze it, but do not change dashboard or cloud state.'
    };
    if (JSON.stringify(context).length > 180000) {
      context.creator = compactCreator(creator);
      context.currentVideo = video ? {
        id: video.id,
        title: video.title || '',
        stage: video.stage || '',
        job: video.job || '',
        role: video.role || '',
        viewer: clone(video.viewer || null),
        promise: clone(video.promise || null),
        package: clone(video.package || null),
        hook: clone(video.hook || null),
        analytics: clone(video.analytics || null)
      } : null;
      context.decisionTrail = decisionTrail(value, creator, video);
      context.portfolio = ['creators', 'calendar'].includes(value.view) ? portfolioContext(value) : [];
    }
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
      '.ai-provider-config{display:grid;gap:8px;margin-top:12px}.ai-provider-config label{display:grid;gap:5px;color:#7b8791;font:800 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase}.ai-provider-config input,.ai-provider-config select{width:100%;min-height:38px;border:1px solid #cfd8df;border-radius:9px;background:#fff;padding:8px 10px;color:#17212b;font:650 11px/1.3 Inter,system-ui,sans-serif;box-sizing:border-box}.ai-provider-config-actions{display:flex;flex-wrap:wrap;gap:7px}.ai-provider-config button{min-height:36px;border:1px solid #ccd5dc;border-radius:9px;background:#fff;color:#17212b;padding:8px 10px;font:800 10px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.ai-provider-config button[data-primary="true"]{border-color:#17212b;background:#17212b;color:#fff}.ai-provider-config button:disabled{opacity:.5;cursor:wait}.ai-provider-error{margin-top:8px;color:#a04a3d;font:700 10px/1.4 Inter,system-ui,sans-serif}.ai-provider-note{margin:0;color:#7b8791;font:600 10px/1.4 Inter,system-ui,sans-serif}.ai-provider-message{margin:0 0 11px;padding:10px 12px;border:1px solid #d8e0e6;border-radius:10px;background:#f8fafb;color:#4f5b66;font:700 11px/1.4 Inter,system-ui,sans-serif}.ai-provider-message[data-error="true"]{border-color:#efc7bd;background:#fff1ee;color:#8f382c}.ai-v2-provider[data-active="true"]{border-color:#a9953f;box-shadow:0 0 0 2px rgba(169,149,63,.12)}body.dark .ai-provider-config input,body.dark .ai-provider-config select,body.dark .ai-provider-config button{border-color:#46515a;background:#273039;color:#f5f6f7}',
      'body.dark .ai-context-guide{border-color:#3d4650;background:linear-gradient(135deg,#20272f 0%,#29291f 100%);box-shadow:none}body.dark .ai-context-title{color:#f5f6f7}body.dark .ai-context-description{color:#aab2ba}body.dark .ai-context-status,body.dark .ai-context-basis span,body.dark .ai-context-action,body.dark .ai-context-custom textarea,body.dark .ai-context-result .ai-companion-answer{border-color:#46515a;background:#273039;color:#f5f6f7}body.dark .ai-context-action{color:#f5f6f7}body.dark .ai-proposal-block strong,body.dark .ai-proposal-block p,body.dark .ai-proposal-block ol{color:#dbe0e4}body.dark .ai-proposal-template{background:#353421;color:#f0e6ac!important}',
      '@media(max-width:980px){.ai-context-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}',
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
      proposal.title,
      proposal.answer || proposal.recommendation,
      proposal.decision && 'Decision: ' + proposal.decision,
      proposal.rationale && 'Why: ' + proposal.rationale,
      Array.isArray(proposal.nextSteps) && proposal.nextSteps.length ? 'Next steps:\n- ' + proposal.nextSteps.join('\n- ') : '',
      proposal.watchFor && 'Watch for: ' + proposal.watchFor,
      proposal.template && 'Reusable template:\n' + proposal.template,
      proposal.example && 'Filled example:\n' + proposal.example,
      Array.isArray(proposal.evidence) && proposal.evidence.length ? 'Evidence used:\n- ' + proposal.evidence.join('\n- ') : '',
      Array.isArray(proposal.uncertainties) && proposal.uncertainties.length ? 'Still uncertain:\n- ' + proposal.uncertainties.join('\n- ') : ''
    ].filter(Boolean);
    return lines.join('\n\n');
  }

  function proposalMarkup(result, surface) {
    if (!result) return '';
    if (result.error) return '<div class="ai-companion-error">' + escapeHtml(result.error) + '</div>';
    const proposal = result.proposal || {};
    const nextSteps = Array.isArray(proposal.nextSteps) && proposal.nextSteps.length
      ? '<div class="ai-proposal-block"><span>Next moves</span><ol>' + proposal.nextSteps.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ol></div>'
      : '';
    const template = proposal.template
      ? '<div class="ai-proposal-block"><span>Reusable template</span><p class="ai-proposal-template">' + escapeHtml(proposal.template) + '</p></div>'
      : '';
    const example = proposal.example
      ? '<div class="ai-proposal-block"><span>Filled example</span><p>' + escapeHtml(proposal.example) + '</p></div>'
      : '';
    const evidence = Array.isArray(proposal.evidence) && proposal.evidence.length
      ? '<div class="ai-proposal-block"><span>Evidence used</span><ul>' + proposal.evidence.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>'
      : '';
    const uncertainties = Array.isArray(proposal.uncertainties) && proposal.uncertainties.length
      ? '<div class="ai-proposal-block"><span>Still uncertain</span><ul>' + proposal.uncertainties.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>'
      : '';
    const decision = proposal.decision
      ? '<div class="ai-proposal-block"><span>Decision</span><strong>' + escapeHtml(proposal.decision) + '</strong></div>'
      : '';
    const rationale = proposal.rationale
      ? '<div class="ai-proposal-block"><span>Why</span><p>' + escapeHtml(proposal.rationale) + '</p></div>'
      : '';
    const watchFor = proposal.watchFor
      ? '<div class="ai-proposal-block"><span>Watch for</span><p>' + escapeHtml(proposal.watchFor) + '</p></div>'
      : '';
    return [
      '<article class="ai-companion-answer">',
      '<h4>' + escapeHtml(proposal.title || 'AI recommendation') + (result.staged ? '<em class="ai-context-staged">Staged</em>' : '') + '</h4>',
      '<p>' + escapeHtml(proposal.answer || proposal.recommendation || '') + '</p>',
      decision,
      rationale,
      nextSteps,
      watchFor,
      template,
      example,
      evidence,
      uncertainties,
      '<div class="ai-companion-answer-actions"><button class="ai-companion-stage" type="button" data-ai-companion-stage data-surface="' + escapeHtml(surface || 'desk') + '">' + (result.staged ? 'Staged for review' : 'Stage for review') + '</button><button class="ai-companion-copy" type="button" data-ai-companion-copy data-surface="' + escapeHtml(surface || 'desk') + '">Copy</button></div>',
      '</article>'
    ].join('');
  }

  function surfaceKey() {
    const value = appState();
    const view = clean(value && value.view || 'home', 40).toLowerCase();
    return ACTION_CATALOG[view] ? view : 'home';
  }

  function surfaceBasis(view) {
    const value = appState();
    const creator = creatorFor(value);
    const video = videoFor(value, creator);
    const plan = creator && creator.quarterPlan;
    const activeMonthNumber = plan && Number(plan.activeMonth || 1);
    const activeMonth = plan && Array.isArray(plan.months) ? plan.months[Math.max(0, activeMonthNumber - 1)] : null;
    const chips = [];
    if (creator) chips.push('Creator · ' + (creator.name || 'Current creator'));
    if (creator && creator.currentConstraint) chips.push('Diagnosis · ' + creator.currentConstraint);
    if (activeMonth) chips.push('Month ' + activeMonthNumber + ' · ' + (activeMonth.title || activeMonth.focus || 'Active focus'));
    if (['videos', 'learn'].includes(view) && video) chips.push('Video · ' + (video.package && (video.package.finalTitle || video.package.workingTitle) || video.title || 'Current video'));
    const routed = creator && creator.month && Array.isArray(creator.month.routedLearnings) ? creator.month.routedLearnings.length : 0;
    if (routed) chips.push(routed + ' routed learning' + (routed === 1 ? '' : 's'));
    return chips.slice(0, 4);
  }

  function contextualResultMarkup(view) {
    if (runningSurface === view) {
      return '<div class="ai-context-result"><div class="ai-companion-answer"><h4>Thinking across the creator record…</h4><p>Codex is connecting this page to the audience, diagnosis, plan, videos, coaching history and recorded results.</p></div></div>';
    }
    const result = resultBySurface[view];
    return result ? '<div class="ai-context-result">' + proposalMarkup(result, view) + '</div>' : '';
  }

  function renderContextualGuide() {
    contextualRenderQueued = false;
    const page = document.querySelector('#app main .page');
    if (!page || !page.firstElementChild) return;
    const view = surfaceKey();
    const surface = ACTION_CATALOG[view];
    const value = appState();
    const creator = creatorFor(value);
    let host = page.querySelector(':scope > [data-ai-context-guide]');
    if (!host) {
      host = document.createElement('section');
      host.className = 'ai-context-guide';
      host.setAttribute('data-ai-context-guide', '');
      page.insertBefore(host, page.firstElementChild.nextSibling);
    }
    const result = resultBySurface[view];
    const signature = [view, creator && creator.id, value && value.currentVideoId, companion.connected, companion.checking, runningSurface, result && result.threadId, result && result.error, result && result.staged].join('|');
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    const actions = surface.actions.map(action => '<button class="ai-context-action" type="button" data-ai-context-action="' + escapeHtml(action.id) + '"' + (runningSurface ? ' disabled' : '') + '>' + escapeHtml(action.label) + '</button>').join('');
    const basis = surfaceBasis(view).map(item => '<span>' + escapeHtml(item) + '</span>').join('');
    const statusText = companion.connected ? ((companion.provider || 'AI') + ' ready') : (companion.checking ? 'Connecting…' : 'AI available');
    host.innerHTML = [
      '<div class="ai-context-head"><div><p class="ai-context-eyebrow">' + escapeHtml(surface.eyebrow) + '</p><h2 class="ai-context-title">' + escapeHtml(surface.title) + '</h2><p class="ai-context-description">' + escapeHtml(surface.description) + '</p></div><span class="ai-context-status" data-connected="' + String(companion.connected) + '">' + escapeHtml(statusText) + '</span></div>',
      basis ? '<div class="ai-context-basis">' + basis + '</div>' : '',
      '<div class="ai-context-actions">' + actions + '</div>',
      '<details class="ai-context-custom"><summary>Ask something specific about this page</summary><div class="ai-context-custom-row"><textarea aria-label="Ask AI about this dashboard page" data-ai-context-question placeholder="Ask about this creator, this decision, or what you should look at next…"></textarea><button type="button" data-ai-context-custom-run' + (runningSurface ? ' disabled' : '') + '>Ask AI</button></div></details>',
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
    const signature = JSON.stringify(ordered) + '|' + companion.activeRoute + '|' + providerBusy + '|' + JSON.stringify(providerMessage);
    if (host.dataset.signature === signature) return;
    if (host.contains(document.activeElement) && !providerBusy) return;
    host.dataset.signature = signature;
    const message = providerMessage ? '<p class="ai-provider-message" data-error="' + String(providerMessage.error === true) + '">' + escapeHtml(providerMessage.text) + '</p>' : '';
    host.innerHTML = message + '<div class="ai-v2-provider-grid">' + ordered.map(providerCard).join('') + '</div>';
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
      host.innerHTML = [
        '<div class="ai-v2-connection">',
        '<div class="ai-v2-connection-top"><div><p class="ai-v2-connection-name">' + escapeHtml(usingCompanion ? companion.provider : (connected ? 'Codex browser tools' : 'No AI connected')) + '</p><p class="ai-v2-connection-copy">' + escapeHtml(usingCompanion ? ((companion.activeConnected === false ? 'Using a fallback route. ' : '') + 'Ready to answer throughout this dashboard.') : (companion.checking ? 'Checking the local AI companion…' : 'The local companion is not running on this Mac.')) + '</p></div><span class="ai-v2-status" data-connected="' + String(connected) + '">' + (connected ? 'Connected' : 'Offline') + '</span></div>',
        '<div class="ai-v2-facts"><div class="ai-v2-fact"><span>AI route</span><strong>' + escapeHtml(usingCompanion ? companion.provider : (connected ? 'Codex tools' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Model</span><strong>' + escapeHtml(usingCompanion ? companion.model : (connected ? 'Selected in Codex' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Account</span><strong>' + escapeHtml(usingCompanion ? (companion.route === 'codex' ? ('ChatGPT' + (plan ? ' · ' + plan : '')) : 'Local / connected server') : (connected ? 'Managed by Codex' : 'None')) + '</strong></div><div class="ai-v2-fact"><span>Data</span><strong>' + escapeHtml(dataMode) + '</strong></div></div>',
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

  async function requestAi(question, surface, action) {
    question = clean(question, 4000);
    if (!question) {
      if (surface === 'desk') lastResult = { error: 'Enter a question first.' };
      else resultBySurface[surface] = { error: 'Enter a question first.' };
      return render();
    }
    const context = currentContext();
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
        body: JSON.stringify({ question, context, surface, action })
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
    return requestAi(action.prompt, surface, action.id);
  }

  function askContextualQuestion() {
    const surface = surfaceKey();
    const field = document.querySelector('[data-ai-context-guide] [data-ai-context-question]');
    return requestAi(field && field.value, surface, 'open-question');
  }

  function stageResult(result, surface) {
    const proposal = result && result.proposal;
    if (!proposal) return;
    const drafts = readDrafts();
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

  document.addEventListener('click', event => {
    if (event.target.closest('[data-ai-companion-run]')) askAi();
    const contextualAction = event.target.closest('[data-ai-context-action]');
    if (contextualAction) askContextualAction(contextualAction.dataset.aiContextAction);
    if (event.target.closest('[data-ai-context-custom-run]')) askContextualQuestion();
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
