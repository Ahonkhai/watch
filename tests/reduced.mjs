import { chromium } from './_browser.mjs';
const BASE = 'http://127.0.0.1:8077';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 },
                                 reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const step = async (l, fn) => { try { await fn(); console.log('PASS', l); }
  catch (e) { console.log('FAIL', l, '->', e.message); process.exitCode = 1; } };

await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await step('content is visible without waiting on reveals', async () => {
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-reveal]')].slice(0, 6);
    return els.map((el) => ({
      op: getComputedStyle(el).opacity, tf: getComputedStyle(el).transform }));
  });
  const hidden = r.filter((x) => x.op !== '1');
  if (hidden.length) throw new Error(hidden.length + ' reveal(s) still hidden');
  const moved = r.filter((x) => x.tf !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(x.tf));
  if (moved.length) throw new Error('reveal(s) still offset: ' + moved[0].tf);
});

await step('navigation is immediate', async () => {
  await page.locator('a.btn-primary[href="shop.html"]').first().click();
  await page.waitForURL('**/shop.html', { timeout: 3000 });
});

console.log(errs.length ? 'PAGE ERRORS: ' + errs.join('; ') : 'No page errors.');
if (errs.length) process.exitCode = 1;
await b.close();
