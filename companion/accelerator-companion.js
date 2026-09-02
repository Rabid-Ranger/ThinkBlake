#!/usr/bin/env node
'use strict';

const http = require('http');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.ACCELERATOR_COMPANION_PORT || 4873);
const CODEX_BIN = process.env.ACCELERATOR_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex';
const MODEL = process.env.ACCELERATOR_CODEX_MODEL || 'gpt-5.6-sol';
const ROOT = path.resolve(__dirname);
const V2_WORKSPACE_ID = 'e9953426-0a8d-4890-9cf0-4f4ac4e71c46';
const MAX_BODY_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 180000;

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

class CodexAppServer {
  constructor() {
    this.child = null;
    this.lines = null;
    this.nextId = 1;
    this.pending = new Map();
    this.turns = new Map();
    this.account = null;
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

  async generate(question, context) {
    await this.start();
    const threadResult = await this.call('thread/start', {
      model: MODEL,
      cwd: ROOT,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      personality: 'friendly',
      serviceName: 'accelerator_ai_companion',
      ephemeral: true
    });
    const threadId = threadResult && threadResult.thread && threadResult.thread.id;
    if (!threadId) throw new Error('Codex did not create a conversation.');

    const prompt = [
      'You are the strategy assistant inside Accelerator OS.',
      'Use only the dashboard context supplied below. Do not access files, run commands, browse, or call tools.',
      'Give Blake one useful, specific recommendation. Do not claim you changed any dashboard or cloud data.',
      'Write for a creator strategist: concise, concrete, evidence-led, and free of filler.',
      '',
      'BLAKE QUESTION:',
      question,
      '',
      'DASHBOARD CONTEXT:',
      JSON.stringify(context)
    ].join('\n');

    const outputSchema = {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        title: { type: 'string' },
        target: { type: 'string' },
        summary: { type: 'string' },
        recommendation: { type: 'string' },
        evidence: { type: 'array', items: { type: 'string' }, maxItems: 6 }
      },
      required: ['answer', 'title', 'target', 'summary', 'recommendation', 'evidence'],
      additionalProperties: false
    };

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
        model: MODEL,
        effort: 'low',
        summary: 'concise',
        personality: 'friendly',
        outputSchema
      });
      const raw = await turnPromise;
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Codex returned an unreadable answer.');
        parsed = JSON.parse(match[0]);
      }
      return { threadId, model: MODEL, proposal: parsed };
    } finally {
      this.turns.delete(threadId);
    }
  }
}

const codex = new CodexAppServer();

function writeCors(req, res) {
  const origin = req.headers.origin;
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
  return (host === HOST || host === 'localhost') &&
    req.headers['x-accelerator-companion'] === 'v1' &&
    originAllowed(req.headers.origin);
}

const server = http.createServer(async (req, res) => {
  if (!writeCors(req, res)) return json(res, 403, { ok: false, error: 'Origin not allowed.' });
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (!requestAllowed(req)) return json(res, 403, { ok: false, error: 'Companion request rejected.' });

  if (req.method === 'GET' && req.url === '/health') {
    try {
      await codex.start();
      return json(res, 200, {
        ok: true,
        connected: codex.ready,
        provider: 'Codex / ChatGPT',
        model: MODEL,
        account: codex.account,
        permissions: { dashboardWrites: false, cloudWrites: false }
      });
    } catch (error) {
      return json(res, 503, { ok: false, connected: false, error: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/chat') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim().slice(0, 4000);
      const context = body.context && typeof body.context === 'object' ? body.context : null;
      if (!question) return json(res, 400, { ok: false, error: 'Enter a question first.' });
      if (!context || !['built-in-demo', 'isolated-cloud'].includes(context.dataSource)) {
        return json(res, 400, { ok: false, error: 'Verified V2 dashboard context is required.' });
      }
      if (context.workspaceId && context.workspaceId !== V2_WORKSPACE_ID) {
        return json(res, 403, { ok: false, error: 'Only the isolated V2 workspace is allowed.' });
      }
      const result = await codex.generate(question, context);
      return json(res, 200, { ok: true, ...result });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }

  return json(res, 404, { ok: false, error: 'Not found.' });
});

server.listen(PORT, HOST, async () => {
  console.log('Accelerator AI Companion listening on http://' + HOST + ':' + PORT);
  try {
    await codex.start();
    console.log('Connected: Codex / ChatGPT · ' + MODEL + (codex.account && codex.account.planType ? ' · ' + codex.account.planType : ''));
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
