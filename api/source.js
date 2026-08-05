const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = function handler(req, res) {
  try {
    const wrapper = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const match = wrapper.match(/atob\('([^']+)'\)/s);
    if (!match) {
      res.status(500).send('Compressed Accelerator payload was not found.');
      return;
    }

    const source = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
    const lines = source.split('\n');
    const query = typeof req.query.q === 'string' ? req.query.q : '';

    res.setHeader('Cache-Control', 'no-store');
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
      res.status(200).json({query, lineCount: lines.length, sourceLength: source.length, matches});
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

    const requestedStart = Number.parseInt(req.query.start || '0', 10);
    const requestedEnd = Number.parseInt(req.query.end || String(source.length), 10);
    const start = Number.isFinite(requestedStart) ? Math.max(0, requestedStart) : 0;
    const end = Number.isFinite(requestedEnd) ? Math.min(source.length, Math.max(start, requestedEnd)) : source.length;
    const safeEnd = Math.min(end, start + 50000);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(source.slice(start, safeEnd));
  } catch (error) {
    res.status(500).send(error && error.stack ? error.stack : String(error));
  }
};
