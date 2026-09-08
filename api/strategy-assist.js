const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 182990;
const EXPECTED_SHA256 = 'aa0f6be6661b827b64c06760b52daaf55f4bdff134f21608b48ba2d8727ee129';

const encoded = [
  require('../strategy/v184/c00'),
  require('../strategy/v184/c01a'),
  require('../strategy/v184/c01b1'),
  require('../strategy/v184/c01b2'),
  require('../strategy/v184/c01b31'),
  require('../strategy/v184/c01b32'),
  require('../strategy/v184/c01b33'),
  require('../strategy/v184/c01b34'),
  require('../strategy/v184/c01b4'),
  require('../strategy/v184/c01c'),
  require('../strategy/v184/c01d'),
  require('../strategy/v184/c02'),
  require('../strategy/v184/c03'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V184 Native Analytics Control Room verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('V184 Native Analytics Control Room source failed', error);
    res.status(500).send('console.error("V184 Native Analytics Control Room failed to load");');
  }
};
