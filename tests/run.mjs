/* Run everything.
 *
 *   node tests/run.mjs            all suites
 *   node tests/run.mjs bot dealer just those
 *
 * Starts the two servers the browser suites need and stops them afterwards,
 * so there is nothing to remember and nothing left listening. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
                '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
                '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };


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

const plain = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  serveFile(req, res, file, TYPES[path.extname(file)] || 'application/octet-stream');
});

const SUITES = {
  bot:     'tests/bot/bot.mjs',
  dealer:  'tests/dealer.mjs',
  csp:     'tests/csp.mjs',
  preview: 'tests/preview.mjs',
  reduced: 'tests/reduced.mjs',
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SUITES);
const unknown = wanted.filter((n) => !SUITES[n]);
if (unknown.length) {
  console.error(`unknown suite(s): ${unknown.join(', ')}\nknown: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}

await new Promise((r) => plain.listen(8077, r));
const hdr = (await import('./hdrserver.mjs')).server;   // serves vercel.json's headers on 8099

const run = (file) => new Promise((resolve) => {
  const child = spawn(process.execPath, [file], { cwd: ROOT });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => resolve({ code, out }));
});

let failed = 0;
for (const name of wanted) {
  const { code, out } = await run(SUITES[name]);
  const passes = (out.match(/^PASS/gm) || []).length;
  const fails = out.split('\n').filter((l) => l.startsWith('FAIL'));
  console.log(`${name.padEnd(8)} ${String(passes).padStart(3)} pass` +
              (fails.length ? `  ${fails.length} FAIL` : ''));
  fails.forEach((l) => console.log('   ' + l));
  if (code !== 0 || fails.length) failed += 1;
}

plain.close();
hdr.close();
console.log(failed ? `\n${failed} suite(s) failed` : '\nall suites passed');
process.exit(failed ? 1 : 0);
