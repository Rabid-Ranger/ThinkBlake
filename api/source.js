const zlib = require('zlib');

const BASE_WRAPPER_URL = 'https://raw.githubusercontent.com/Rabid-Ranger/ThinkBlake/389143af88dc63bd503391e7889d4669ed1c0d4f/index.html';
const V75_CSS_URL = 'https://raw.githubusercontent.com/Rabid-Ranger/ThinkBlake/883a7be3fd18ed1dfd6bfaa8f86c0f59fae9a520/patches/v75-reference-system.css';
const V75_JS_URL = 'https://raw.githubusercontent.com/Rabid-Ranger/ThinkBlake/883a7be3fd18ed1dfd6bfaa8f86c0f59fae9a520/patches/v75-reference-system.js';
const GUIDE_IDS = new Set([
  'v74-guide-research',
  'v74-guide-titles',
  'v74-guide-thumbtips',
  'v74-guide-thumbstrategies',
  'v74-guide-hooks',
  'v74-guide-story',
  'v74-guide-retention',
  'v74-guide-cta',
  'v74-guide-loader'
]);
let composedPromise;

async function fetchText(url) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'user-agent': 'Accelerator-OS-V75' }
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function decodeWrapper(wrapper) {
  const match = wrapper.match(/atob\('([^']+)'\)/s);
  if (!match) throw new Error('The pinned V74 payload was not found.');
  return zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
}

function removeOldUiLayers(source) {
  return source.replace(
    /<(style|script)\b[^>]*\bid="(v72-[^"]+|v73-[^"]+|v74-[^"]+)"[^>]*>[\s\S]*?<\/\1>/gi,
    (full, tag, id) => GUIDE_IDS.has(id) ? full : ''
  );
}

async function composeSource() {
  const [wrapper, cssRaw, jsRaw] = await Promise.all([
    fetchText(BASE_WRAPPER_URL),
    fetchText(V75_CSS_URL),
    fetchText(V75_JS_URL)
  ]);

  let source = removeOldUiLayers(decodeWrapper(wrapper));
  source = source
    .replace(
      /<meta content="Accelerator OS V52\.1 V74:[^"]+" name="description"\/>/,
      '<meta content="Accelerator OS V52.1 V75: full app-wide rebuild using the supplied vidIQ planner component system." name="description"/>'
    )
    .replace(
      '<title>Accelerator OS V52.1 Reference UI V74</title>',
      '<title>Accelerator OS V52.1 Full Reference UI V75</title>'
    );

  const css = cssRaw.replace(/<\/style/gi, '<\\/style');
  const js = jsRaw.replace(/<\/script/gi, '<\\/script');
  const addition = `<style id="v75-reference-system-style">${css}</style>\n<script id="v75-reference-system-script">${js}</script>`;
  const closingBody = source.lastIndexOf('</body>');
  if (closingBody < 0) throw new Error('The pinned source has no closing body tag.');
  return `${source.slice(0, closingBody)}${addition}\n${source.slice(closingBody)}`;
}

function getSource() {
  if (!composedPromise) {
    composedPromise = composeSource().catch(error => {
      composedPromise = null;
      throw error;
    });
  }
  return composedPromise;
}

module.exports = async function handler(req, res) {
  try {
    const source = await getSource();
    const lines = source.split('\n');
    const query = typeof req.query.q === 'string' ? req.query.q : '';

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Accelerator-Build', 'V52.1-reference-ui-v75');
    res.setHeader('X-Accelerator-Source-Length', String(source.length));

    if (query) {
      const needle = query.toLowerCase();
      const context = Math.min(20, Math.max(0, Number.parseInt(req.query.context || '6', 10) || 6));
      const matches = [];
      for (let index = 0; index < lines.length && matches.length < 30; index += 1) {
        if (!lines[index].toLowerCase().includes(needle)) continue;
        const startLine = Math.max(0, index - context);
        const endLine = Math.min(lines.length, index + context + 1);
        matches.push({
          line: index + 1,
          startLine: startLine + 1,
          endLine,
          text: lines.slice(startLine, endLine).map((line, offset) => `${startLine + offset + 1}: ${line}`).join('\n')
        });
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).json({ query, lineCount: lines.length, sourceLength: source.length, matches });
      return;
    }

    if (req.query.lineStart || req.query.lineEnd) {
      const requestedStartLine = Number.parseInt(req.query.lineStart || '1', 10);
      const requestedEndLine = Number.parseInt(req.query.lineEnd || String(lines.length), 10);
      const startLine = Math.max(1, Number.isFinite(requestedStartLine) ? requestedStartLine : 1);
      const endLine = Math.min(lines.length, Math.max(startLine, Number.isFinite(requestedEndLine) ? requestedEndLine : lines.length), startLine + 499);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(lines.slice(startLine - 1, endLine).map((line, offset) => `${startLine + offset}: ${line}`).join('\n'));
      return;
    }

    if (req.query.start || req.query.end) {
      const requestedStart = Number.parseInt(req.query.start || '0', 10);
      const requestedEnd = Number.parseInt(req.query.end || String(source.length), 10);
      const start = Number.isFinite(requestedStart) ? Math.max(0, requestedStart) : 0;
      const end = Number.isFinite(requestedEnd) ? Math.min(source.length, Math.max(start, requestedEnd)) : source.length;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(source.slice(start, Math.min(end, start + 50000)));
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(source);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send(error && error.stack ? error.stack : String(error));
  }
};
