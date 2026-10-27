// Same-origin transport only. Authentication and client scoping live in the
// Edge Function; no Supabase secret or AI-provider key is needed on Vercel.
module.exports = async function handler(req, res) {
  const target = new URL('https://pqggobwpazihraeqvspc.supabase.co/functions/v1/accelerator-ai');
  const incoming = new URL(req.url, 'https://accelerator-os-rho.vercel.app');
  target.search = incoming.search;
  if(req.query?.route)target.searchParams.set('route',req.query.route);
  const headers = {'content-type':req.headers['content-type'] || 'application/json'};
  for (const name of ['authorization','origin','accept','mcp-protocol-version']) if (req.headers[name]) headers[name]=req.headers[name];
  try {
    const body = ['GET','HEAD'].includes(req.method) ? undefined : typeof req.body === 'string' ? req.body : headers['content-type'].includes('application/x-www-form-urlencoded') ? new URLSearchParams(req.body || {}).toString() : JSON.stringify(req.body || {});
    const response = await fetch(target, {method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(45000)});
    res.statusCode=response.status;
    for(const name of ['content-type','www-authenticate','location','allow']) if(response.headers.has(name))res.setHeader(name,response.headers.get(name));
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (_) {res.status(502).json({error:'The ChatGPT connection is temporarily unavailable. Please try again.'});}
};
