import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { demoRoute } from './demo-router.mjs';
import { createApi } from './backend/router.mjs';
process.umask(0o077);
const api=createApi();
const root = fileURLToPath(new URL('./public/', import.meta.url));
const assets = new Map([['/', 'home.html'], ['/index.html', 'home.html'], ['/portal', 'portal.html'], ['/portal/', 'portal.html'], ['/vision', 'index.html'], ['/home.css', 'home.css'], ['/style.css', 'style.css'], ['/app.js', 'app.js'], ['/favicon.svg', 'favicon.svg'], ['/demo', 'demo/index.html'], ['/demo/', 'demo/index.html'], ...['demo.css','app.mjs','api.mjs','seed.mjs','logic.mjs','voice.mjs','portal.mjs','portal-voice.mjs'].map(file=>[`/demo/${file}`,`demo/${file}`])]);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type':'application/json' }); return res.end('{"status":"ok"}'); }
  if (url.pathname.startsWith('/api/v1/')) {
    try { const result=await api(req,res,url); if(res.writableEnded)return; res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(JSON.stringify(result)); }
    catch(error){res.writeHead(error.status||500,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({message:error.status?error.message:'Sauce could not save this request. Please try again.'}));}
  }
  if (url.pathname.startsWith('/api/demo/')) {
    try {
      const result = await demoRoute(req, url.pathname);
      res.writeHead(result === null ? 404 : 200, { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      return res.end(JSON.stringify(result ?? { message:'Unknown mock route.' }));
    } catch (error) { res.writeHead(error.status || 500, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); return res.end(JSON.stringify({message:error.status ? error.message : 'Demo processing failed.'})); }
  }
  const asset = assets.get(url.pathname);
  if (!asset || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const body = await readFile(path.join(root, asset));
    res.writeHead(200, { 'Content-Type':types[path.extname(asset)], 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to serve page'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Sauce vision listening on ${process.env.PORT || 3000}`));
