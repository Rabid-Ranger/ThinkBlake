const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 244001;
const EXPECTED_SHA256 = '70f3a39b6b4635cc21aa6766f946242b308c562f8653fa96366ae1d5cc574646';

const encoded = [
  require('../strategy/v1852/c00'),
  require('../strategy/v1852/c01'),
  require('../strategy/v1852/c02'),
  require('../strategy/v1852/r00'),
  require('../strategy/v1852/r01'),
  require('../strategy/v1852/r02'),
  require('../strategy/v1852/r03'),
  require('../strategy/v1852/r04'),
  require('../strategy/v1852/r05'),
  require('../strategy/v1852/r06'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V185.2 Adaptive Baselines verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('V185.2 Adaptive Baselines source failed', error);
    res.status(500).send('console.error("V185.2 Adaptive Baselines failed to load");');
  }
};
