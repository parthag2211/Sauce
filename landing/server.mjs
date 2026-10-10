import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('./public/', import.meta.url));
const assets = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/app.js', 'app.js'], ['/favicon.svg', 'favicon.svg']]);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type':'application/json' }); return res.end('{"status":"ok"}'); }
  const asset = assets.get(url.pathname);
  if (!asset || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const body = await readFile(path.join(root, asset));
    res.writeHead(200, { 'Content-Type':types[path.extname(asset)], 'X-Content-Type-Options':'nosniff', 'Cache-Control':'public, max-age=60', 'Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to serve page'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Sauce vision listening on ${process.env.PORT || 3000}`));
