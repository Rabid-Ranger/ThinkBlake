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
const ALLOWED_SURFACES = new Set(['desk', 'home', 'strategy', 'plan', 'videos', 'learn', 'framework', 'creators', 'calendar', 'library']);
const ALLOWED_ACTIONS = new Set([
  'open-question', 'next-decision', 'diagnosis-check', 'call-prep',
  'audience-sharpen', 'message-strengthen', 'business-path',
  'plan-coherence', 'month-breakdown', 'missing-proof', 'plan-report',
  'video-fit', 'package-directions', 'hook-builder', 'production-handoff',
  'results-interpret', 'learning-conclusion', 'next-experiment', 'monthly-report',
  'framework-select', 'framework-adapt', 'framework-audit',
  'portfolio-triage', 'portfolio-risk', 'portfolio-calls',
  'schedule-review', 'capacity-risk', 'review-timing',
  'library-route', 'library-translate', 'library-gap'
]);
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

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    title: { type: 'string' },
    target: { type: 'string' },
    summary: { type: 'string' },
    recommendation: { type: 'string' },
    decision: { type: 'string' },
    rationale: { type: 'string' },
    nextSteps: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    watchFor: { type: 'string' },
    template: { type: 'string' },
    example: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    uncertainties: { type: 'array', items: { type: 'string' }, maxItems: 6 }
  },
  required: ['answer', 'title', 'target', 'summary', 'recommendation', 'decision', 'rationale', 'nextSteps', 'watchFor', 'template', 'example', 'evidence', 'uncertainties'],
  additionalProperties: false
};

function buildPrompt(question, context, requestMeta, requireJson) {
  return [
    'You are the strategy assistant inside Accelerator OS.',
    'Use only the dashboard context supplied below. Do not access files, run commands, browse, or call tools.',
    'Think the way Blake uses this system: creator reality -> diagnosis -> focus -> content decision -> result -> learning -> next decision.',
    'Carry relevant decisions forward. Connect your answer to the recorded audience, message, business path, diagnosis, plan, video job, coaching history and results instead of treating this page in isolation.',
    'Separate recorded evidence, reasonable interpretation and missing information. Never turn an assumption into a fact and never invent metrics, research, audience language or results.',
    'Give Blake a decisive, creator-specific recommendation with concrete next moves. Say what not to decide yet when focus matters.',
    'When the request involves a template, formula, message, package, hook or framework, always provide BOTH a reusable bracketed template and one fully filled creator-specific example.',
    'When the request involves results, learning, a conclusion, handoff or report, keep observation, interpretation, confidence and decision distinct. Flag missing proof rather than filling it in.',
    'Do not claim you changed any dashboard or cloud data. Every output is a review draft until Blake explicitly uses it.',
    'Write for a creator strategist: concise, concrete, evidence-led, natural, and free of filler or generic YouTube advice.',
    'Keep the answer field under 350 words. Use the dedicated decision, rationale, nextSteps, template, example, evidence and uncertainties fields instead of repeating them at length in the answer.',
    requireJson ? 'Return only a valid JSON object matching this schema: ' + JSON.stringify(OUTPUT_SCHEMA) : '',
    '',
    'CURRENT DASHBOARD SURFACE:',
    requestMeta.surface,
    '',
    'DECISION-SUPPORT ACTION:',
    requestMeta.action,
    '',
    'BLAKE QUESTION:',
    question,
    '',
    'DASHBOARD CONTEXT:',
    JSON.stringify(context)
  ].filter(Boolean).join('\n');
}

function parseProposal(raw) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) {
    const match = String(raw || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The selected model returned an unreadable answer.');
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The selected model returned an unreadable answer.');
  const stringValue = key => String(parsed[key] || '').trim();
  const arrayValue = key => Array.isArray(parsed[key]) ? parsed[key].map(item => String(item || '').trim()).filter(Boolean) : [];
  return {
    answer: stringValue('answer') || stringValue('recommendation') || stringValue('summary'),
    title: stringValue('title') || 'AI recommendation',
    target: stringValue('target') || 'Current creator',
    summary: stringValue('summary') || stringValue('answer'),
    recommendation: stringValue('recommendation') || stringValue('answer'),
    decision: stringValue('decision'),
    rationale: stringValue('rationale'),
    nextSteps: arrayValue('nextSteps').slice(0, 6),
    watchFor: stringValue('watchFor'),
    template: stringValue('template'),
    example: stringValue('example'),
    evidence: arrayValue('evidence').slice(0, 8),
    uncertainties: arrayValue('uncertainties').slice(0, 6)
  };
}

const settings = loadSettings();

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
        defaultReasoningEffort: item.defaultReasoningEffort || 'low'
      })).filter(item => item.id) : [];
      if (this.models.length && !this.models.some(item => item.id === this.model)) {
        this.model = (this.models.find(item => item.isDefault) || this.models[0]).id;
        settings.codexModel = this.model;
        saveSettings(settings);
      }
    } catch (_) {
      this.models = [{ id: this.model, name: this.model, description: '', isDefault: true, defaultReasoningEffort: 'low' }];
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

  async generate(question, context, requestMeta) {
    await this.start();
    const threadResult = await this.call('thread/start', {
      model: this.model,
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
        model: this.model,
        effort: 'low',
        summary: 'concise',
        personality: 'friendly',
        outputSchema: OUTPUT_SCHEMA
      });
      const raw = await turnPromise;
      return { threadId, model: this.model, surface: requestMeta.surface, action: requestMeta.action, proposal: parseProposal(raw) };
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
        surface: requestMeta.surface,
        action: requestMeta.action,
        proposal: parseProposal(content)
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

  if (req.method === 'POST' && pathname === '/chat') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim().slice(0, 4000);
      const context = body.context && typeof body.context === 'object' ? body.context : null;
      const surface = String(body.surface || context && context.view || 'desk').trim().toLowerCase().slice(0, 40);
      const action = String(body.action || 'open-question').trim().toLowerCase().slice(0, 80);
      if (!question) return json(res, 400, { ok: false, error: 'Enter a question first.' });
      if (!ALLOWED_SURFACES.has(surface) || !ALLOWED_ACTIONS.has(action)) {
        return json(res, 400, { ok: false, error: 'This dashboard AI action is not allowed.' });
      }
      if (!context || !['built-in-demo', 'isolated-cloud'].includes(context.dataSource)) {
        return json(res, 400, { ok: false, error: 'Verified V2 dashboard context is required.' });
      }
      if (context.workspaceId && context.workspaceId !== V2_WORKSPACE_ID) {
        return json(res, 403, { ok: false, error: 'Only the isolated V2 workspace is allowed.' });
      }
      const result = await generateWithRoute(question, context, { surface, action });
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
