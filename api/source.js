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
    const requestedStart = Number.parseInt(req.query.start || '0', 10);
    const requestedEnd = Number.parseInt(req.query.end || String(source.length), 10);
    const start = Number.isFinite(requestedStart) ? Math.max(0, requestedStart) : 0;
    const end = Number.isFinite(requestedEnd) ? Math.min(source.length, Math.max(start, requestedEnd)) : source.length;
    const safeEnd = Math.min(end, start + 50000);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accelerator-Source-Length', String(source.length));
    res.status(200).send(source.slice(start, safeEnd));
  } catch (error) {
    res.status(500).send(error && error.stack ? error.stack : String(error));
  }
};
