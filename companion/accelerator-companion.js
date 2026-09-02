#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawn, spawnSync } = require('child_process');
const sourceHandler = require('../api/source');

const HOST = '127.0.0.1';
const PORT = Number(process.env.ACCELERATOR_COMPANION_PORT || 4873);
const CODEX_BIN = process.env.ACCELERATOR_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex';
const DEFAULT_CODEX_MODEL = process.env.ACCELERATOR_CODEX_MODEL || 'gpt-5.6-sol';
const ROOT = path.resolve(__dirname);
const APP_ROOT = path.resolve(__dirname, '..');
const SETTINGS_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Accelerator AI');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'providers.json');
const KEYCHAIN_SERVICE = 'com.blakerice.accelerator-ai';
const V2_WORKSPACE_ID = 'e9953426-0a8d-4890-9cf0-4f4ac4e71c46';
const MAX_BODY_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 180000;
const ALLOWED_SURFACES = new Set(['desk', 'home', 'strategy', 'plan', 'videos', 'planner', 'learn', 'framework', 'creators', 'calendar', 'library']);
const ACTION_DEFINITIONS = {
  'open-question': { mode: 'standard', response: 'decision', instruction: 'Answer the specific question using only the relevant dashboard evidence. Lead with the useful answer, not a tour of the creator record.' },
  'native-draft': { mode: 'standard', response: 'fields', instruction: 'Draft directly into the allowed dashboard fields for the exact decision in front of Blake. Return only allowed field bindings. Preserve useful recorded language, do not overwrite a sound decision merely to make it different, and keep every field concise enough to use as-is.' },
  'next-decision': { mode: 'standard', response: 'decision', instruction: 'Choose the single decision that most needs to become clear now. Connect it to the destination, newest evidence, active constraint, plan and open commitment. Say what to ignore for now.' },
  'diagnosis-check': { mode: 'deep', response: 'decision', instruction: 'Pressure-test the working diagnosis. Identify what supports it, what contradicts it, what remains assumed, and whether to keep, refine or replace it.' },
  'call-prep': { mode: 'standard', response: 'decision', instruction: 'Prepare the next coaching call around one decision. Give the evidence to review, the sharpest question to ask and the commitment that should leave the call.' },
  'audience-sharpen': { mode: 'standard', response: 'decision', instruction: 'Sharpen the exact person and decision moment without rewriting the whole audience profile. Preserve recorded language, separate evidence from assumptions and recommend the one audience clarification that improves downstream content decisions.' },
  'message-strengthen': { mode: 'standard', response: 'formula', instruction: 'Connect the recorded audience tension, desired result, distinctive approach and proof into a tighter message. Return one reusable bracketed formula and one creator-specific filled example.' },
  'business-path': { mode: 'standard', response: 'decision', instruction: 'Check the handoff from useful content to the next useful step and business destination. Identify the weakest transition and the smallest correction.' },
  'plan-coherence': { mode: 'deep', response: 'decision', instruction: 'Check whether the active diagnosis, 90-day direction, current month, video mix and learning question form one coherent test. Recommend only the most important correction.' },
  'month-breakdown': { mode: 'standard', response: 'decision', instruction: 'Turn the active month into the next practical decision: what to focus on, what evidence each planned video should create and what checkpoint changes the plan.' },
  'missing-proof': { mode: 'fast', response: 'decision', instruction: 'Identify the single missing piece of evidence that is most limiting the next decision and the smallest way to collect it.' },
  'plan-report': { mode: 'deep', response: 'learning', instruction: 'Write a concise plan conclusion from recorded evidence only. Keep observation, interpretation and decision distinct, and state what stays, what changes and what remains unknown.' },
  'video-fit': { mode: 'standard', response: 'decision', instruction: 'Check the current video against the active diagnosis, monthly focus, portfolio job, exact viewer, message and business path. Identify the weakest link before more production work is done.' },
  'viewer-sharpen': { mode: 'standard', response: 'decision', instruction: 'Check whether the saved viewer state, moment, problem, desire and language identify one recognizable person for this video. Recommend the one clarification that will improve the promise and package downstream.' },
  'research-check': { mode: 'fast', response: 'decision', instruction: 'Check whether the saved research is enough to support the current video decision. Name the single evidence gap most likely to make the direction generic or derivative.' },
  'promise-check': { mode: 'standard', response: 'decision', instruction: 'Check whether the viewer, problem, result and mechanism form one specific promise that the package, hook and proof can all deliver. Recommend the smallest correction.' },
  'package-directions': { mode: 'deep', response: 'options', instruction: 'Create three genuinely distinct title-and-thumbnail directions grounded in the exact viewer, promise, mechanism, research and active constraint. Keep each option compact and explain its click logic.' },
  'hook-builder': { mode: 'standard', response: 'formula', instruction: 'Build the opening from the saved package, viewer moment, promise, mechanism and proof assets. Return one bracketed hook formula and one creator-specific example that confirms the click and reaches useful content quickly.' },
  'structure-check': { mode: 'standard', response: 'decision', instruction: 'Check whether the saved structure delivers the package promise with clear progression, proof and payoff. Identify the one section or transition most likely to weaken the viewing experience.' },
  'cta-check': { mode: 'standard', response: 'decision', instruction: 'Check whether the saved CTA is a natural continuation of this exact video, viewer moment, job and business path. Recommend one correction to fit, timing or destination.' },
  'production-handoff': { mode: 'standard', response: 'decision', instruction: 'Audit the saved video decisions for production readiness. Name the one missing or contradictory item most likely to create a weak shoot or edit handoff.' },
  'results-interpret': { mode: 'deep', response: 'learning', instruction: 'Interpret only the selected checkpoint evidence in the context of the video job, traffic source, package, opening and same-job comparison. Do not infer a cause that the data cannot support.' },
  'learning-conclusion': { mode: 'standard', response: 'learning', instruction: 'Turn the recorded observation and interpretation into a concise learning conclusion with confidence, a responsible decision and the exact dashboard layer it should change.' },
  'next-experiment': { mode: 'deep', response: 'decision', instruction: 'Choose the smallest next experiment that resolves the most valuable uncertainty. Change one meaningful variable and define the signal that changes the later decision.' },
  'monthly-report': { mode: 'deep', response: 'learning', instruction: 'Create a brief client-ready monthly conclusion from recorded evidence. State what happened, what it likely means, what changes next and which proof is still missing.' },
  'framework-select': { mode: 'standard', response: 'decision', instruction: 'Recommend a framework only when the supplied library context supports it. Explain where it fits in the current decision; otherwise state what library context is missing.' },
  'framework-adapt': { mode: 'standard', response: 'formula', instruction: 'Adapt the supplied framework to the current creator decision. Return one reusable bracketed formula and one filled creator-specific example without changing the framework logic.' },
  'framework-audit': { mode: 'deep', response: 'decision', instruction: 'Use the supplied framework context to challenge one assumption or contradiction in the current plan and give one decision rule.' },
  'portfolio-triage': { mode: 'deep', response: 'options', instruction: 'Rank the three creators who most need coaching attention using active constraint, stalled decision, commitment, plan status and evidence gap—not profile completeness.' },
  'portfolio-risk': { mode: 'deep', response: 'decision', instruction: 'Identify the highest-risk stalled or unsupported creator decision and the smallest intervention Blake should make.' },
  'portfolio-calls': { mode: 'standard', response: 'options', instruction: 'Recommend the next coaching-call order and the one decision each call should resolve.' },
  'schedule-review': { mode: 'standard', response: 'decision', instruction: 'Check whether publish dates, review windows, coaching calls and commitments occur in an order that supports the active decisions. Recommend one scheduling correction.' },
  'capacity-risk': { mode: 'fast', response: 'decision', instruction: 'Identify the clearest capacity or sequencing risk and what to move, combine, defer or protect.' },
  'review-timing': { mode: 'fast', response: 'decision', instruction: 'Recommend the next useful review checkpoint and the evidence that should exist before a decision is made.' },
  'library-route': { mode: 'standard', response: 'decision', instruction: 'Choose a supplied library resource only if it directly answers the current creator decision. State the question it should answer and what should change afterward.' },
  'library-translate': { mode: 'standard', response: 'formula', instruction: 'Translate the supplied library principle into one reusable bracketed checklist and one filled creator-specific example.' },
  'library-gap': { mode: 'deep', response: 'decision', instruction: 'Identify one important decision the supplied dashboard and library context do not adequately support and the smallest useful addition.' }
};
const ALLOWED_ACTIONS = new Set(Object.keys(ACTION_DEFINITIONS));
const ROUTE_DEFINITIONS = {
  codex: { id: 'codex', name: 'Codex / ChatGPT', kind: 'codex' },
  lmstudio: { id: 'lmstudio', name: 'LM Studio', kind: 'openai-compatible', defaultBaseUrl: 'http://127.0.0.1:1234/v1' },
  mlx: { id: 'mlx', name: 'MLX', kind: 'openai-compatible', defaultBaseUrl: 'http://127.0.0.1:8080/v1' },
  custom: { id: 'custom', name: 'Custom model server', kind: 'openai-compatible', defaultBaseUrl: '' }
};

const EXACT_ORIGINS = new Set([
  'https://accelerator-os-git-accelerator-ai-v2-think-blake1.vercel.app'
]);

function originAllowed(origin) {
  if (!origin) return false;
  if (EXACT_ORIGINS.has(origin)) return true;
  if (/^https:\/\/accelerator-[a-z0-9]+-think-blake1\.vercel\.app$/.test(origin)) return true;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return true;
  return false;
}

function safeAccount(account) {
  if (!account || typeof account !== 'object') return null;
  return {
    type: account.type || null,
    planType: account.planType || account.chatgptPlanType || null
  };
}

function defaultSettings() {
  return {
    activeRoute: 'codex',
    codexModel: DEFAULT_CODEX_MODEL,
    routingMode: 'auto',
    autoFallback: true,
    routes: {
      lmstudio: { baseUrl: ROUTE_DEFINITIONS.lmstudio.defaultBaseUrl, model: '', configured: false },
      mlx: { baseUrl: ROUTE_DEFINITIONS.mlx.defaultBaseUrl, model: '', configured: false },
      custom: { baseUrl: '', model: '', configured: false }
    }
  };
}

function normalizeBaseUrl(route, value) {
  const definition = ROUTE_DEFINITIONS[route];
  const raw = String(value || definition && definition.defaultBaseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  let parsed;
  try { parsed = new URL(raw); } catch (_) { throw new Error('Enter a valid model server URL.'); }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  if (route !== 'custom' && (!loopback || parsed.protocol !== 'http:')) {
    throw new Error(definition.name + ' must use a local http://127.0.0.1 or http://localhost address.');
  }
  if (route === 'custom' && !(parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback))) {
    throw new Error('Custom servers must use HTTPS, or HTTP on this Mac only.');
  }
  return raw.endsWith('/v1') ? raw : raw + '/v1';
}

function loadSettings() {
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (saved && ROUTE_DEFINITIONS[saved.activeRoute]) defaults.activeRoute = saved.activeRoute;
    if (saved && saved.codexModel) defaults.codexModel = String(saved.codexModel).slice(0, 160);
    if (saved && ['auto', 'fixed'].includes(saved.routingMode)) defaults.routingMode = saved.routingMode;
    if (saved && typeof saved.autoFallback === 'boolean') defaults.autoFallback = saved.autoFallback;
    for (const route of ['lmstudio', 'mlx', 'custom']) {
      const incoming = saved && saved.routes && saved.routes[route];
      if (!incoming) continue;
      try { defaults.routes[route].baseUrl = normalizeBaseUrl(route, incoming.baseUrl); } catch (_) {}
      defaults.routes[route].model = String(incoming.model || '').trim().slice(0, 200);
      defaults.routes[route].configured = incoming.configured === true;
    }
  } catch (_) {}
  return defaults;
}

function saveSettings(settings) {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), { mode: 0o600 });
  try { fs.chmodSync(SETTINGS_PATH, 0o600); } catch (_) {}
}

function readSecret(route) {
  const result = spawnSync('/usr/bin/security', ['find-generic-password', '-a', route, '-s', KEYCHAIN_SERVICE, '-w'], { encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function saveSecret(route, secret) {
  secret = String(secret || '').trim();
  if (!secret) return;
  const result = spawnSync('/usr/bin/security', ['add-generic-password', '-a', route, '-s', KEYCHAIN_SERVICE, '-w', secret, '-U'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('The API key could not be saved to macOS Keychain.');
}

function deleteSecret(route) {
  spawnSync('/usr/bin/security', ['delete-generic-password', '-a', route, '-s', KEYCHAIN_SERVICE], { encoding: 'utf8' });
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

const BASE_OUTPUT_PROPERTIES = {
  status: { type: 'string', enum: ['ready', 'needs_input'] },
  headline: { type: 'string' },
  recommendation: { type: 'string' },
  why: { type: 'string' },
  nextAction: { type: 'string' },
  confidence: { type: 'string', enum: ['Low', 'Medium', 'High'] },
  evidence: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  missing: { type: 'array', items: { type: 'string' }, maxItems: 3 }
};

function outputSchema(responseType, allowedTargets) {
  const properties = { ...BASE_OUTPUT_PROPERTIES };
  const required = Object.keys(BASE_OUTPUT_PROPERTIES);
  if (responseType === 'options') {
    properties.options = {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          direction: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['label', 'direction', 'why'],
        additionalProperties: false
      }
    };
    required.push('options');
  }
  if (responseType === 'formula') {
    properties.formula = { type: 'string' };
    properties.example = { type: 'string' };
    required.push('formula', 'example');
  }
  if (responseType === 'learning') {
    properties.observation = { type: 'string' };
    properties.interpretation = { type: 'string' };
    properties.decision = { type: 'string' };
    required.push('observation', 'interpretation', 'decision');
  }
  if (responseType === 'fields') {
    const bindings = Array.isArray(allowedTargets) ? allowedTargets.filter(Boolean).slice(0, 16) : [];
    properties.fields = {
      type: 'array',
      minItems: 0,
      maxItems: Math.max(1, Math.min(8, bindings.length || 8)),
      items: {
        type: 'object',
        properties: {
          binding: bindings.length ? { type: 'string', enum: bindings } : { type: 'string' },
          label: { type: 'string' },
          value: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['binding', 'label', 'value', 'why'],
        additionalProperties: false
      }
    };
    required.push('fields');
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

function responseTypeFor(action, question) {
  if (action !== 'open-question') return ACTION_DEFINITIONS[action].response;
  if (/\b(template|formula|hook|title|message|script)\b/i.test(question)) return 'formula';
  if (/\b(result|metric|interpret|learning|conclusion|report)\b/i.test(question)) return 'learning';
  if (/\b(options?|alternatives?|directions?)\b/i.test(question)) return 'options';
  return 'decision';
}

function buildPrompt(question, context, requestMeta, requireJson) {
  const definition = ACTION_DEFINITIONS[requestMeta.action] || ACTION_DEFINITIONS['open-question'];
  const schema = outputSchema(requestMeta.responseType, requestMeta.allowedTargets);
  return [
    'You are the quiet decision assistant inside Accelerator OS.',
    'Use only the relevant dashboard context supplied below. Do not access files, run commands, browse, call tools or add generic YouTube advice.',
    'The decision chain is creator reality -> audience and message -> diagnosis -> monthly focus -> video decisions -> result -> learning -> next decision.',
    'Respect upstream decisions when evaluating downstream work. Do not rewrite the entire system when one link is weak.',
    'Separate recorded evidence, reasonable interpretation and missing information. Never invent metrics, research, audience language, results or library content.',
    'If required evidence is absent, set status to needs_input, keep the answer brief, name at most three missing inputs and make nextAction the smallest useful way to capture them.',
    'The dashboard has already checked action-specific required inputs. If recorded results pass that gate, interpret them cautiously with lower confidence and named limitations instead of refusing to help.',
    'If evidence is sufficient, set status to ready and recommend one clear move. Default to fewer than 90 words across headline, recommendation, why and nextAction.',
    'Use no more than three short evidence items. Confidence reflects the supplied evidence, not writing confidence.',
    'Do not produce a formula, template, options or report unless the response schema explicitly asks for it.',
    requestMeta.responseType === 'fields' ? 'For field drafts, use only bindings listed in context.allowedTargets. Use context.targetFields to understand each label, guide and current value. Return an empty fields array when the evidence cannot responsibly support a draft.' : '',
    'Do not claim you changed dashboard or cloud data. This is a review suggestion only.',
    'ACTION CONTRACT:',
    definition.instruction,
    requireJson ? 'Return only a valid JSON object matching this schema: ' + JSON.stringify(schema) : '',
    '',
    'CURRENT DASHBOARD SURFACE:',
    requestMeta.surface,
    '',
    'TASK DEPTH:',
    requestMeta.taskMode,
    '',
    requestMeta.action === 'open-question' ? 'BLAKE QUESTION:\n' + question : '',
    '',
    'RELEVANT DASHBOARD CONTEXT:',
    JSON.stringify(context)
  ].filter(Boolean).join('\n');
}

function parseProposal(raw, responseType, allowedTargets) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) {
    const match = String(raw || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The selected model returned an unreadable answer.');
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The selected model returned an unreadable answer.');
  const stringValue = key => String(parsed[key] || '').trim();
  const arrayValue = key => Array.isArray(parsed[key]) ? parsed[key].map(item => String(item || '').trim()).filter(Boolean) : [];
  const recommendation = stringValue('recommendation');
  const nextAction = stringValue('nextAction');
  const missing = arrayValue('missing').slice(0, 3);
  const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 3).map(item => ({
    label: String(item && item.label || '').trim(),
    direction: String(item && item.direction || '').trim(),
    why: String(item && item.why || '').trim()
  })).filter(item => item.label || item.direction) : [];
  const allowed = new Set(Array.isArray(allowedTargets) ? allowedTargets : []);
  const fields = Array.isArray(parsed.fields) ? parsed.fields.slice(0, 8).map(item => ({
    binding: String(item && item.binding || '').trim(),
    label: String(item && item.label || '').trim(),
    value: String(item && item.value || '').trim(),
    why: String(item && item.why || '').trim()
  })).filter(item => item.binding && item.value && (!allowed.size || allowed.has(item.binding))) : [];
  const proposal = {
    type: responseType,
    status: stringValue('status') === 'needs_input' ? 'needs_input' : 'ready',
    headline: stringValue('headline') || (missing.length ? 'More evidence needed' : 'AI check'),
    recommendation,
    why: stringValue('why'),
    nextAction,
    confidence: ['Low', 'Medium', 'High'].includes(stringValue('confidence')) ? stringValue('confidence') : 'Low',
    evidence: arrayValue('evidence').slice(0, 3),
    missing,
    options,
    fields,
    formula: stringValue('formula'),
    example: stringValue('example'),
    observation: stringValue('observation'),
    interpretation: stringValue('interpretation'),
    learningDecision: stringValue('decision')
  };
  // Keep the existing review-draft shape compatible while the native UI moves
  // to the smaller task-specific fields above.
  return Object.assign(proposal, {
    answer: recommendation,
    title: proposal.headline,
    target: 'Current creator',
    summary: recommendation,
    decision: proposal.learningDecision || recommendation,
    rationale: proposal.why,
    nextSteps: nextAction ? [nextAction] : [],
    watchFor: '',
    template: proposal.formula,
    uncertainties: missing
  });
}

const settings = loadSettings();

function normalizedEfforts(item) {
  const raw = Array.isArray(item && item.supportedReasoningEfforts) ? item.supportedReasoningEfforts : [];
  return raw.map(value => typeof value === 'string' ? value : (value && (value.reasoningEffort || value.effort || value.value))).filter(Boolean);
}

function pickEffort(model, taskMode) {
  const supported = Array.isArray(model && model.supportedReasoningEfforts) ? model.supportedReasoningEfforts : [];
  const order = taskMode === 'deep'
    ? ['medium', 'high', 'xhigh', 'low', 'minimal']
    : taskMode === 'standard'
      ? ['low', 'medium', 'minimal']
      : ['low', 'minimal', 'medium'];
  return order.find(value => !supported.length || supported.includes(value)) || model && model.defaultReasoningEffort || 'low';
}

class CodexAppServer {
  constructor() {
    this.child = null;
    this.lines = null;
    this.nextId = 1;
    this.pending = new Map();
    this.turns = new Map();
    this.account = null;
    this.models = [];
    this.model = settings.codexModel || DEFAULT_CODEX_MODEL;
    this.ready = false;
    this.starting = null;
    this.lastError = null;
  }

  async start() {
    if (this.ready && this.child && !this.child.killed) return;
    if (this.starting) return this.starting;
    this.starting = this._start();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async _start() {
    this.child = spawn(CODEX_BIN, ['app-server', '--stdio'], {
      cwd: ROOT,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', chunk => {
      const line = String(chunk || '').trim();
      if (line && !line.includes('PATH aliases')) this.lastError = line.slice(-1000);
    });
    this.child.on('exit', (code, signal) => {
      this.ready = false;
      this.lastError = 'Codex stopped' + (code !== null ? ' with code ' + code : '') + (signal ? ' (' + signal + ')' : '');
      for (const pending of this.pending.values()) pending.reject(new Error(this.lastError));
      this.pending.clear();
      for (const turn of this.turns.values()) turn.reject(new Error(this.lastError));
      this.turns.clear();
    });
    this.lines = readline.createInterface({ input: this.child.stdout });
    this.lines.on('line', line => this._onLine(line));
    await this.call('initialize', {
      clientInfo: {
        name: 'accelerator_ai_companion',
        title: 'Accelerator AI Companion',
        version: '0.1.0'
      }
    }, 30000);
    this.notify('initialized', {});
    const accountResult = await this.call('account/read', { refreshToken: false }, 30000);
    this.account = safeAccount(accountResult && accountResult.account);
    if (!this.account || this.account.type !== 'chatgpt') {
      throw new Error('Codex is not signed in with a ChatGPT-managed account.');
    }
    try {
      const modelResult = await this.call('model/list', { limit: 100, includeHidden: false }, 30000);
      this.models = Array.isArray(modelResult && modelResult.data) ? modelResult.data.map(item => ({
        id: item.model || item.id,
        name: item.displayName || item.model || item.id,
        description: item.description || '',
        isDefault: item.isDefault === true,
        defaultReasoningEffort: item.defaultReasoningEffort || 'low',
        supportedReasoningEfforts: normalizedEfforts(item)
      })).filter(item => item.id) : [];
      if (this.models.length && !this.models.some(item => item.id === this.model)) {
        this.model = (this.models.find(item => item.isDefault) || this.models[0]).id;
        settings.codexModel = this.model;
        saveSettings(settings);
      }
    } catch (_) {
      this.models = [{ id: this.model, name: this.model, description: '', isDefault: true, defaultReasoningEffort: 'low', supportedReasoningEfforts: ['low'] }];
    }
    this.ready = true;
    this.lastError = null;
  }

  _send(message) {
    if (!this.child || !this.child.stdin.writable) throw new Error('Codex is not running.');
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }

  notify(method, params) {
    this._send({ method, params: params || {} });
  }

  call(method, params, timeoutMs) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(method + ' timed out.'));
      }, timeoutMs || REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
      this._send({ method, id, params: params || {} });
    });
  }

  _onLine(line) {
    let message;
    try { message = JSON.parse(line); } catch (_) { return; }
    if (Object.prototype.hasOwnProperty.call(message, 'id') && !message.method) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || 'Codex request failed.'));
      else pending.resolve(message.result);
      return;
    }
    if (message.method && Object.prototype.hasOwnProperty.call(message, 'id')) {
      this._send({ id: message.id, error: { code: -32601, message: 'Companion does not support interactive server requests.' } });
      return;
    }
    const params = message.params || {};
    const threadId = params.threadId || (params.thread && params.thread.id);
    const active = threadId ? this.turns.get(threadId) : null;
    if (!active) return;
    if (message.method === 'item/agentMessage/delta' && typeof params.delta === 'string') {
      active.text += params.delta;
    }
    if (message.method === 'item/completed' && params.item && params.item.type === 'agentMessage') {
      const text = params.item.text || params.item.content || '';
      if (typeof text === 'string' && text.length >= active.text.length) active.text = text;
    }
    if (message.method === 'turn/completed') {
      this.turns.delete(threadId);
      if (params.turn && params.turn.status === 'failed') {
        active.reject(new Error((params.turn.error && params.turn.error.message) || 'Codex generation failed.'));
      } else {
        active.resolve(active.text.trim());
      }
    }
  }

  async selectModel(model) {
    await this.start();
    model = String(model || '').trim();
    if (!model || (this.models.length && !this.models.some(item => item.id === model))) {
      throw new Error('Choose a Codex model available to this ChatGPT account.');
    }
    this.model = model;
    settings.codexModel = model;
    saveSettings(settings);
    return this.model;
  }

  routeForTask(taskMode) {
    const selected = this.models.find(item => item.id === this.model) || this.models[0] || { id: this.model, defaultReasoningEffort: 'low', supportedReasoningEfforts: [] };
    if (settings.routingMode !== 'auto') return { model: selected.id, effort: pickEffort(selected, taskMode) };
    const fast = this.models.find(item => /(^|[-_.])(luna|mini|nano|flash|fast)([-_.]|$)/i.test(item.id));
    const strong = this.models.find(item => /gpt-5\.6-sol/i.test(item.id)) || this.models.find(item => /gpt-5\.6-terra/i.test(item.id)) || selected;
    const chosen = taskMode === 'fast' && fast ? fast : (taskMode === 'deep' ? strong : selected);
    return { model: chosen.id, effort: pickEffort(chosen, taskMode) };
  }

  async generate(question, context, requestMeta) {
    await this.start();
    const routed = this.routeForTask(requestMeta.taskMode);
    const threadResult = await this.call('thread/start', {
      model: routed.model,
      cwd: ROOT,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      personality: 'friendly',
      serviceName: 'accelerator_ai_companion',
      ephemeral: true
    });
    const threadId = threadResult && threadResult.thread && threadResult.thread.id;
    if (!threadId) throw new Error('Codex did not create a conversation.');

    const prompt = buildPrompt(question, context, requestMeta, false);

    const turnPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.turns.delete(threadId);
        reject(new Error('Codex took too long to answer.'));
      }, REQUEST_TIMEOUT_MS);
      this.turns.set(threadId, {
        text: '',
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
    });

    try {
      await this.call('turn/start', {
        threadId,
        input: [{ type: 'text', text: prompt }],
        cwd: ROOT,
        approvalPolicy: 'never',
        model: routed.model,
        effort: routed.effort,
        summary: 'concise',
        personality: 'friendly',
        outputSchema: outputSchema(requestMeta.responseType, requestMeta.allowedTargets)
      });
      const raw = await turnPromise;
      return {
        threadId,
        model: routed.model,
        effort: routed.effort,
        taskMode: requestMeta.taskMode,
        responseType: requestMeta.responseType,
        surface: requestMeta.surface,
        action: requestMeta.action,
        proposal: parseProposal(raw, requestMeta.responseType, requestMeta.allowedTargets)
      };
    } finally {
      this.turns.delete(threadId);
    }
  }
}

const codex = new CodexAppServer();

class OpenAiCompatibleRoute {
  constructor(route) {
    this.route = route;
  }

  config(override) {
    const saved = settings.routes[this.route] || {};
    const incoming = override && typeof override === 'object' ? override : {};
    return {
      baseUrl: normalizeBaseUrl(this.route, incoming.baseUrl || saved.baseUrl),
      model: String(incoming.model || saved.model || '').trim().slice(0, 200),
      apiKey: String(incoming.apiKey || readSecret(this.route) || '').trim()
    };
  }

  async models(override, timeoutMs) {
    const config = this.config(override);
    if (!config.baseUrl) throw new Error('Enter the model server address first.');
    const timer = withTimeout(timeoutMs || 7000);
    try {
      const response = await fetch(config.baseUrl + '/models', {
        method: 'GET',
        headers: config.apiKey ? { Authorization: 'Bearer ' + config.apiKey } : {},
        signal: timer.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error && body.error.message || body.error || 'Model server returned ' + response.status + '.');
      const models = Array.isArray(body.data) ? body.data.map(item => ({
        id: String(item && (item.id || item.model) || '').trim(),
        name: String(item && (item.name || item.id || item.model) || '').trim()
      })).filter(item => item.id) : [];
      if (!models.length) throw new Error('The server connected, but it did not report any loaded models.');
      return { config, models };
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('The model server did not respond in time.');
      throw error;
    } finally {
      timer.done();
    }
  }

  async generate(question, context, requestMeta) {
    const available = await this.models();
    const model = available.config.model || available.models[0].id;
    if (!available.models.some(item => item.id === model)) {
      throw new Error('The selected model is not currently loaded on this server.');
    }
    const timer = withTimeout(REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(available.config.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          available.config.apiKey ? { Authorization: 'Bearer ' + available.config.apiKey } : {}
        ),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(question, context, requestMeta, true) }],
          temperature: 0.2
        }),
        signal: timer.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error && body.error.message || body.error || 'Model server returned ' + response.status + '.');
      const content = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
      return {
        threadId: this.route + '-' + Date.now().toString(36),
        model,
        effort: 'provider default',
        taskMode: requestMeta.taskMode,
        responseType: requestMeta.responseType,
        surface: requestMeta.surface,
        action: requestMeta.action,
        proposal: parseProposal(content, requestMeta.responseType, requestMeta.allowedTargets)
      };
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('The selected model took too long to answer.');
      throw error;
    } finally {
      timer.done();
    }
  }
}

const compatibleRoutes = {
  lmstudio: new OpenAiCompatibleRoute('lmstudio'),
  mlx: new OpenAiCompatibleRoute('mlx'),
  custom: new OpenAiCompatibleRoute('custom')
};

let providerSnapshotCache = { at: 0, value: null };

async function routeSnapshot(force) {
  if (!force && providerSnapshotCache.value && Date.now() - providerSnapshotCache.at < 12000) return providerSnapshotCache.value;
  let codexError = '';
  try { await codex.start(); } catch (error) { codexError = error.message; }
  const routes = {
    codex: {
      id: 'codex',
      name: ROUTE_DEFINITIONS.codex.name,
      connected: codex.ready,
      selected: settings.activeRoute === 'codex',
      model: codex.model,
      models: codex.models,
      account: codex.account,
      error: codexError || codex.lastError || ''
    }
  };
  const localSnapshots = await Promise.all(['lmstudio', 'mlx', 'custom'].map(async route => {
    const saved = settings.routes[route] || {};
    const base = {
      id: route,
      name: ROUTE_DEFINITIONS[route].name,
      connected: false,
      selected: settings.activeRoute === route,
      configured: saved.configured === true,
      baseUrl: saved.baseUrl || ROUTE_DEFINITIONS[route].defaultBaseUrl || '',
      model: saved.model || '',
      models: [],
      hasApiKey: Boolean(readSecret(route)),
      error: ''
    };
    if (base.configured) {
      try {
        const result = await compatibleRoutes[route].models(null, 1500);
        base.connected = true;
        base.models = result.models;
        if (!base.model && base.models[0]) base.model = base.models[0].id;
      } catch (error) {
        base.error = error.message;
      }
    }
    return base;
  }));
  for (const snapshot of localSnapshots) routes[snapshot.id] = snapshot;
  const active = routes[settings.activeRoute] || routes.codex;
  const fallback = Object.values(routes).find(item => item.connected && item.id !== active.id) || null;
  const value = {
    activeRoute: active.id,
    activeConnected: active.connected,
    activeProvider: active.name,
    activeModel: active.model || '',
    fallbackRoute: fallback && fallback.id || null,
    routingMode: settings.routingMode,
    autoFallback: settings.autoFallback,
    routes
  };
  providerSnapshotCache = { at: Date.now(), value };
  return value;
}

function clearProviderSnapshot() {
  providerSnapshotCache = { at: 0, value: null };
}

async function configureRoute(route, body) {
  if (!compatibleRoutes[route]) throw new Error('Choose LM Studio, MLX or a custom model server.');
  const baseUrl = normalizeBaseUrl(route, body.baseUrl);
  const apiKey = String(body.apiKey || '').trim();
  const model = String(body.model || '').trim().slice(0, 200);
  const tested = await compatibleRoutes[route].models({ baseUrl, model, apiKey });
  const selectedModel = model || tested.models[0].id;
  if (!tested.models.some(item => item.id === selectedModel)) throw new Error('Choose a model currently reported by this server.');
  settings.routes[route] = { baseUrl, model: selectedModel, configured: true };
  if (apiKey) saveSecret(route, apiKey);
  saveSettings(settings);
  clearProviderSnapshot();
  return routeSnapshot(true);
}

async function selectRoute(route, model) {
  if (!ROUTE_DEFINITIONS[route]) throw new Error('Choose a valid AI route.');
  if (route === 'codex') {
    await codex.selectModel(model || codex.model);
  } else {
    if (!settings.routes[route] || !settings.routes[route].configured) throw new Error('Test and save this model server before selecting it.');
    const tested = await compatibleRoutes[route].models();
    const selectedModel = String(model || settings.routes[route].model || tested.models[0].id).trim();
    if (!tested.models.some(item => item.id === selectedModel)) throw new Error('Choose a model currently reported by this server.');
    settings.routes[route].model = selectedModel;
  }
  settings.activeRoute = route;
  saveSettings(settings);
  clearProviderSnapshot();
  return routeSnapshot(true);
}

async function disableRoute(route) {
  if (!compatibleRoutes[route]) throw new Error('Choose a local or custom model route to forget.');
  if (settings.activeRoute === route) settings.activeRoute = 'codex';
  settings.routes[route] = {
    baseUrl: ROUTE_DEFINITIONS[route].defaultBaseUrl || '',
    model: '',
    configured: false
  };
  deleteSecret(route);
  saveSettings(settings);
  clearProviderSnapshot();
  return routeSnapshot(true);
}

async function setRoutingMode(mode) {
  mode = String(mode || '').trim().toLowerCase();
  if (!['auto', 'fixed'].includes(mode)) throw new Error('Choose automatic or fixed model routing.');
  settings.routingMode = mode;
  saveSettings(settings);
  clearProviderSnapshot();
  return routeSnapshot(true);
}

async function generateWithRoute(question, context, requestMeta) {
  const activeRoute = settings.activeRoute;
  const candidates = [activeRoute];
  if (settings.autoFallback) {
    for (const route of ['codex', 'lmstudio', 'mlx', 'custom']) {
      if (!candidates.includes(route) && (route === 'codex' || settings.routes[route] && settings.routes[route].configured)) candidates.push(route);
    }
  }
  const errors = [];
  for (const route of candidates) {
    try {
      const result = route === 'codex'
        ? await codex.generate(question, context, requestMeta)
        : await compatibleRoutes[route].generate(question, context, requestMeta);
      return Object.assign(result, {
        route,
        provider: ROUTE_DEFINITIONS[route].name,
        fallbackFrom: route === activeRoute ? null : activeRoute
      });
    } catch (error) {
      errors.push(ROUTE_DEFINITIONS[route].name + ': ' + error.message);
    }
  }
  throw new Error('No AI route could answer. ' + errors.join(' '));
}

function writeCors(req, res) {
  const origin = req.headers.origin;
  const host = String(req.headers.host || '').split(':')[0];
  const localSameOrigin = !origin && (host === HOST || host === 'localhost') && req.headers['sec-fetch-site'] === 'same-origin';
  if (localSameOrigin) return true;
  if (!originAllowed(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Accelerator-Companion');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Vary', 'Origin');
  return true;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (_) { reject(new Error('Request body must be valid JSON.')); }
    });
    req.on('error', reject);
  });
}

function requestAllowed(req) {
  const host = String(req.headers.host || '').split(':')[0];
  const localSameOrigin = !req.headers.origin && req.headers['sec-fetch-site'] === 'same-origin';
  return (host === HOST || host === 'localhost') &&
    req.headers['x-accelerator-companion'] === 'v1' &&
    (originAllowed(req.headers.origin) || localSameOrigin);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && (pathname === '/' || pathname === '/dashboard' || pathname === '/index.html')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(fs.readFileSync(path.join(APP_ROOT, 'index.html')));
  }
  if (req.method === 'GET' && pathname === '/favicon.svg') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end(fs.readFileSync(path.join(APP_ROOT, 'favicon.svg')));
  }
  if (req.method === 'GET' && pathname === '/api/source') {
    return sourceHandler(req, {
      setHeader: (name, value) => res.setHeader(name, value),
      status: code => ({ send: body => { res.statusCode = code; res.end(body); } })
    });
  }
  if (!writeCors(req, res)) return json(res, 403, { ok: false, error: 'Origin not allowed.' });
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (!requestAllowed(req)) return json(res, 403, { ok: false, error: 'Companion request rejected.' });

  if (req.method === 'GET' && pathname === '/health') {
    try {
      const snapshot = await routeSnapshot(false);
      const active = snapshot.routes[snapshot.activeRoute];
      const fallback = snapshot.fallbackRoute && snapshot.routes[snapshot.fallbackRoute];
      const usable = active && active.connected ? active : fallback;
      if (!usable) throw new Error('No AI route is currently connected.');
      return json(res, 200, {
        ok: true,
        connected: true,
        provider: usable.name,
        model: usable.model,
        route: usable.id,
        activeRoute: snapshot.activeRoute,
        activeConnected: snapshot.activeConnected,
        fallbackRoute: snapshot.fallbackRoute,
        routingMode: snapshot.routingMode,
        autoFallback: snapshot.autoFallback,
        routes: snapshot.routes,
        account: codex.account,
        permissions: { dashboardWrites: false, cloudWrites: false }
      });
    } catch (error) {
      return json(res, 503, { ok: false, connected: false, error: error.message });
    }
  }

  if (req.method === 'GET' && pathname === '/providers') {
    try {
      return json(res, 200, { ok: true, ...(await routeSnapshot(true)) });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/providers/test') {
    try {
      const body = await readBody(req);
      const route = String(body.route || '').trim().toLowerCase();
      if (route === 'codex') {
        await codex.start();
        return json(res, 200, { ok: true, route, connected: codex.ready, models: codex.models, model: codex.model });
      }
      if (!compatibleRoutes[route]) return json(res, 400, { ok: false, error: 'Choose a valid local or custom model route.' });
      const tested = await compatibleRoutes[route].models({ baseUrl: body.baseUrl, model: body.model, apiKey: body.apiKey });
      return json(res, 200, { ok: true, route, connected: true, models: tested.models, model: tested.config.model || tested.models[0].id });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/providers/configure') {
    try {
      const body = await readBody(req);
      const route = String(body.route || '').trim().toLowerCase();
      const snapshot = await configureRoute(route, body);
      return json(res, 200, { ok: true, ...snapshot });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/providers/select') {
    try {
      const body = await readBody(req);
      const route = String(body.route || '').trim().toLowerCase();
      const snapshot = await selectRoute(route, body.model);
      return json(res, 200, { ok: true, ...snapshot });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/providers/disable') {
    try {
      const body = await readBody(req);
      const route = String(body.route || '').trim().toLowerCase();
      const snapshot = await disableRoute(route);
      return json(res, 200, { ok: true, ...snapshot });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/routing') {
    try {
      const body = await readBody(req);
      const snapshot = await setRoutingMode(body.mode);
      return json(res, 200, { ok: true, ...snapshot });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && pathname === '/chat') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim().slice(0, 4000);
      const context = body.context && typeof body.context === 'object' ? body.context : null;
      const surface = String(body.surface || context && context.view || 'desk').trim().toLowerCase().slice(0, 40);
      const action = String(body.action || 'open-question').trim().toLowerCase().slice(0, 80);
      if (!ALLOWED_SURFACES.has(surface) || !ALLOWED_ACTIONS.has(action)) {
        return json(res, 400, { ok: false, error: 'This dashboard AI action is not allowed.' });
      }
      if (action === 'open-question' && !question) return json(res, 400, { ok: false, error: 'Enter a question first.' });
      if (!context || !['built-in-demo', 'isolated-cloud'].includes(context.dataSource)) {
        return json(res, 400, { ok: false, error: 'Verified V2 dashboard context is required.' });
      }
      if (context.workspaceId && context.workspaceId !== V2_WORKSPACE_ID) {
        return json(res, 403, { ok: false, error: 'Only the isolated V2 workspace is allowed.' });
      }
      const definition = ACTION_DEFINITIONS[action];
      const requestedDepth = String(body.depth || 'auto').trim().toLowerCase();
      const taskMode = requestedDepth === 'deep' ? 'deep' : (requestedDepth === 'fast' ? 'fast' : definition.mode);
      const responseType = responseTypeFor(action, question);
      const allowedTargets = Array.isArray(context.allowedTargets)
        ? context.allowedTargets.map(item => String(item || '').trim()).filter(Boolean).slice(0, 16)
        : [];
      if (responseType === 'fields' && !allowedTargets.length) {
        return json(res, 400, { ok: false, error: 'This draft does not identify any dashboard fields.' });
      }
      const requestMeta = { surface, action, taskMode, responseType, allowedTargets };
      const missing = Array.isArray(context.readiness && context.readiness.missing)
        ? context.readiness.missing.map(item => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      if (missing.length) {
        const proposal = parseProposal({
          status: 'needs_input',
          headline: 'Add the missing evidence first',
          recommendation: 'There is not enough recorded information to make this decision responsibly yet.',
          why: 'Using AI now would turn a gap in the dashboard into an unsupported guess.',
          nextAction: String(context.readiness.nextAction || 'Add the missing information, then run this check again.'),
          confidence: 'Low',
          evidence: [],
          missing,
          ...(responseType === 'options' ? { options: [] } : {}),
          ...(responseType === 'formula' ? { formula: '', example: '' } : {}),
          ...(responseType === 'learning' ? { observation: '', interpretation: '', decision: '' } : {}),
          ...(responseType === 'fields' ? { fields: [] } : {})
        }, responseType, allowedTargets);
        return json(res, 200, {
          ok: true,
          route: 'dashboard',
          provider: 'Dashboard check',
          model: 'No AI call',
          effort: 'none',
          taskMode: 'instant',
          responseType,
          surface,
          action,
          proposal
        });
      }
      const result = await generateWithRoute(question, context, requestMeta);
      if (['results-interpret', 'learning-conclusion', 'next-experiment'].includes(action) && result.proposal && result.proposal.status === 'needs_input') {
        result.proposal.status = 'ready';
      }
      return json(res, 200, { ok: true, ...result });
    } catch (error) {
      console.error('AI request failed: ' + error.message);
      return json(res, 500, { ok: false, error: error.message });
    }
  }

  return json(res, 404, { ok: false, error: 'Not found.' });
});

server.listen(PORT, HOST, async () => {
  console.log('Accelerator AI Companion listening on http://' + HOST + ':' + PORT);
  try {
    await codex.start();
    console.log('Connected: Codex / ChatGPT · ' + codex.model + (codex.account && codex.account.planType ? ' · ' + codex.account.planType : ''));
  } catch (error) {
    console.error('Codex connection failed: ' + error.message);
  }
});

function shutdown() {
  server.close(() => process.exit(0));
  if (codex.child && !codex.child.killed) codex.child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
