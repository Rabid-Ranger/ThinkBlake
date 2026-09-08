const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 132483;
const EXPECTED_SHA256 = '26b4d1391b24a415dffeaeb494bff0efd8e7fd77a95f3ca9fb8087a3e83bf4fd';

const encoded = [
  require('../strategy/v1811/c00'),
  require('../strategy/v1811/c01'),
  require('../strategy/v1811/c02'),
  require('../strategy/v1811/c03'),
  require('../strategy/v1811/c04'),
  require('../strategy/v1811/c05'),
  require('../strategy/v1811/c06'),
  require('../strategy/v1811/c07'),
  require('../strategy/v1811/c08'),
  require('../strategy/v1811/c09'),
  require('../strategy/v1811/c10'),
  require('../strategy/v1811/c11'),
  require('../strategy/v1811/c12'),
  require('../strategy/v1811/c13'),
  require('../strategy/v1811/c14'),
  require('../strategy/v1811/c15'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V181.1 Strategy Assist verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('Strategy Assist source failed', error);
    res.status(500).send('console.error("Strategy Assist failed to load");');
  }
};
