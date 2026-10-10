import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { handleDemoAPI } from './backend/live-demo.mjs';

try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };

http.createServer(async (request, response) => {
  if (request.url.startsWith('/api/demo/')) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const input = new Request(url, {method:request.method,headers:request.headers,...(['GET','HEAD'].includes(request.method)?{}:{body:Readable.toWeb(request),duplex:'half'})});
      const result = await handleDemoAPI(input, process.env);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch { response.writeHead(503, {'Content-Type':'application/json'}).end(JSON.stringify({error:'The live request failed.'})); }
    return;
  }
  if (!['GET','HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow:'GET, HEAD' }).end('Method not allowed');
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname === '/working' ? '/working.html' : pathname));
    if (!file.startsWith(directory + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      'Content-Type':types[path.extname(file)] || 'application/octet-stream',
      'Content-Length':data.length,
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'no-cache'
    }).end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404).end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Sauce: http://localhost:${port}`));
