const zlib = require('zlib');

const encoded = [
  require('../strategy/v181/p0'),
  require('../strategy/v181/p1'),
  require('../strategy/v181/p2'),
  require('../strategy/v181/p3'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      cached = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64')).toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('Strategy Assist source failed', error);
    res.status(500).send('console.error("Strategy Assist failed to load");');
  }
};
