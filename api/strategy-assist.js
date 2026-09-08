const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 70019;
const EXPECTED_SHA256 = '091d0af6f578f177a4cb4e30b9a36a19d11271ef80e3729e6e4df6d278eac764';

const encoded = [
  require('../strategy/v182/c00'),
  require('../strategy/v182/c01'),
  require('../strategy/v182/c02'),
  require('../strategy/v182/c03'),
  require('../strategy/v182/c04'),
  require('../strategy/v182/c05'),
  require('../strategy/v182/c06'),
  require('../strategy/v182/c07'),
  require('../strategy/v182/c08'),
  require('../strategy/v182/c09'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V182 Guided Coach verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('V182 Guided Coach source failed', error);
    res.status(500).send('console.error("V182 Guided Coach failed to load");');
  }
};
