import { chromium } from './_browser.mjs';
const B = 'http://127.0.0.1:8099';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();

const violations = [];
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => {
  const t = m.text();
  if (/Content Security Policy|Refused to/i.test(t)) violations.push(t);
});
await page.addInitScript(() => {
  document.addEventListener('securitypolicyviolation', (e) => {
    (window.__csp ||= []).push(`${e.violatedDirective} blocked ${e.blockedURI}`);
  });
});

const collect = async () => (await page.evaluate(() => window.__csp || [])).forEach(v => violations.push(v));
const step = async (l, fn) => { try { await fn(); console.log('PASS', l); }
  catch (e) { console.log('FAIL', l, '->', e.message); process.exitCode = 1; } };

for (const url of ['index.html', 'shop.html', 'product.html?id=rolex-126610ln',
                   'cart.html', 'checkout.html', 'about.html']) {
  await step(`loads under CSP: ${url}`, async () => {
    await page.goto(`${B}/${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1600);
    await collect();
    const styled = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily.includes('Jost'));
    if (!styled) throw new Error('stylesheet did not apply');
  });
}

await step('the inline js-flag script ran (its hash is allowed)', async () => {
  await page.goto(`${B}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  if (!await page.evaluate(() => document.documentElement.classList.contains('js')))
    throw new Error('inline script was blocked');
});

await step('fonts loaded under font-src self', async () => {
  const ok = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('300 48px "Cormorant Garamond"') && document.fonts.check('400 16px Jost');
  });
  if (!ok) throw new Error('fonts blocked');
});

await step('brand tiles and listings render under CSP', async () => {
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    tiles: document.querySelectorAll('.brand-tile').length,
    cards: document.querySelectorAll('[data-latest] .card').length,
  }));
  if (r.tiles !== 9 || r.cards !== 8)
    throw new Error(JSON.stringify(r));
});

await step('cart and checkout still function under CSP', async () => {
  await page.goto(`${B}/product.html?id=tudor-79030n`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[data-add]').click();
  await page.waitForTimeout(300);
  await page.goto(`${B}/checkout.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(200);
  if (await page.locator('.error:not(:empty)').count() < 6) throw new Error('validation did not run');
  await collect();
});

await step('favicon data: URI is allowed', async () => {
  await collect();
  const iconBlocked = violations.some(v => /img-src/.test(v));
  if (iconBlocked) throw new Error('favicon blocked');
});

await collect();
console.log(violations.length ? '\nCSP VIOLATIONS:\n' + [...new Set(violations)].join('\n')
                              : '\nNo CSP violations.');
console.log(errs.length ? 'PAGE ERRORS: ' + errs.join('; ') : 'No page errors.');
if (violations.length || errs.length) process.exitCode = 1;
await b.close();
