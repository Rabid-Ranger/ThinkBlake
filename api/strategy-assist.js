const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_BYTES = 171087;
const EXPECTED_SHA256 = '8df66148ed0233724f2682f78aae4ef20cad610cc5ee41a247202755e6dcbb25';

const encoded = [
  require('../strategy/v183/c00'),
  require('../strategy/v183/c01'),
  require('../strategy/v183/c02'),
  require('../strategy/v183/c03'),
].join('');

let cached;

module.exports = function handler(req, res) {
  try {
    if (!cached) {
      const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
        throw new Error(`V183 Analytics Control Room verification failed: ${bytes.length} bytes, ${hash}`);
      }
      cached = bytes.toString('utf8');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(cached);
  } catch (error) {
    console.error('V183 Analytics Control Room source failed', error);
    res.status(500).send('console.error("V183 Analytics Control Room failed to load");');
  }
};
