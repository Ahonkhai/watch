// Serves the site with the exact headers vercel.json declares, so the CSP can
// be exercised before it reaches production.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cfg = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
                '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json',
                '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };

// Vercel source patterns -> RegExp (enough for the patterns used here).
const toRe = (src) => new RegExp('^' + src
  .replace(/[.]/g, '\\.')
  .replace(/\(([^)]*)\)/g, (_m, inner) => '(' + inner.replace(/\\\./g, '.') + ')')
  + '$');

const rules = cfg.headers.map((h) => ({ re: toRe(h.source), headers: h.headers }));


/* Byte-range support. A phone video has its moov index at the END of the
   file, so a browser cannot start playing until it has fetched that tail —
   which it does with a Range request. A server that answers 200-with-
   everything instead of 206 makes video look broken, so the test rig has to
   behave like a real one or it hides exactly the bug it should catch. */
function serveFile(req, res, file, type, extra = {}) {
  const total = fs.statSync(file).size;
  const range = req.headers.range;
  const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', ...extra };

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] === '' ? total - Number(m[2]) : Number(m[1]);
      let end = m[1] === '' || m[2] === '' ? total - 1 : Number(m[2]);
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        return res.end();
      }
      end = Math.min(end, total - 1);
      res.writeHead(206, {
        ...base,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': end - start + 1,
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
  }
  res.writeHead(200, { ...base, 'Content-Length': total });
  return fs.createReadStream(file).pipe(res);
}

export const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  const applied = {};
  for (const r of rules) if (r.re.test(url)) for (const h of r.headers) applied[h.key] = h.value;
  serveFile(req, res, file, TYPES[path.extname(file)] || 'application/octet-stream', applied);
});

server.listen(8099, () => {
  if (process.argv[1].endsWith('hdrserver.mjs')) console.log('headers server on 8099');
});
