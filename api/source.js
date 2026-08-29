const crypto = require('crypto');
const zlib = require('zlib');

const EXPECTED_SHA256 = 'f87958f7f60c23a03da8ed6395fd1baf3af51f23bce0d48ac0dd7abc9802b4b9';
const EXPECTED_BYTES = 774382;
const encoded = [
  require('../bundles/v16236/v16_0'),
  require('../bundles/v16236/v16_1'),
  require('../bundles/v16236/v16_2'),
  require('../bundles/v16236/v16_3'),
  require('../bundles/v16236/v16_4'),
  require('../bundles/v16236/v16_5'),
  require('../bundles/v16236/v16_6'),
  require('../bundles/v16236/v16_7'),
  require('../bundles/v16236/v16_8'),
  require('../bundles/v16236/v16_9'),
].join('');

let verifiedSource;

function source() {
  if (verifiedSource) return verifiedSource;
  const bytes = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== EXPECTED_BYTES || hash !== EXPECTED_SHA256) {
    throw new Error(`Accelerator source verification failed: ${bytes.length} bytes, ${hash}`);
  }
  verifiedSource = bytes.toString('utf8');
  return verifiedSource;
}

module.exports = function handler(_req, res) {
  try {
    const html = source();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Accelerator-Build', 'V16.2.3.6');
    res.setHeader('X-Accelerator-Source-Length', String(EXPECTED_BYTES));
    res.setHeader('X-Accelerator-Source-SHA256', EXPECTED_SHA256);
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Accelerator OS could not load.');
  }
};
