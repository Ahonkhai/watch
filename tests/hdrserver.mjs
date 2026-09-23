// Serves the site with the exact headers vercel.json declares, so the CSP can
// be exercised before it reaches production.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cfg = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
                '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };

// Vercel source patterns -> RegExp (enough for the patterns used here).
const toRe = (src) => new RegExp('^' + src
  .replace(/[.]/g, '\\.')
  .replace(/\(([^)]*)\)/g, (_m, inner) => '(' + inner.replace(/\\\./g, '.') + ')')
  + '$');

const rules = cfg.headers.map((h) => ({ re: toRe(h.source), headers: h.headers }));

export const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  const applied = {};
  for (const r of rules) if (r.re.test(url)) for (const h of r.headers) applied[h.key] = h.value;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', ...applied });
  res.end(fs.readFileSync(file));
});

server.listen(8099, () => {
  if (process.argv[1].endsWith('hdrserver.mjs')) console.log('headers server on 8099');
});
