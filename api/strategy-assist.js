const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 125849;
const EXPECTED_SHA256 = 'be858f4d9c984d96ea1b6367836f23770a36dde47b2513f13f712edc6ca04266';

const encoded = [
  require('../strategy/v182/c00'),
  require('../strategy/v182/c01'),
  require('../strategy/v182/c02'),
  require('../strategy/v182/c03'),
  require('../strategy/v182/c04'),
  require('../strategy/v182/c05'),
  require('../strategy/v182/c06'),
  require('../strategy/v182/c07'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V182.2 Guided Coach verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('V182.2 Guided Coach source failed', error);
    res.status(500).send('console.error("V182.2 Guided Coach failed to load");');
  }
};
