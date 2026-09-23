import { chromium } from './_browser.mjs';
const URL = 'http://127.0.0.1:8077/preview/swizz-clones-preview.html';
/* Counts come from the catalogue, never from a literal. The shop's stock is
   written by the bot and changes whenever a watch is listed or sold; a suite
   that hard-codes "12" fails the first time someone does their job. */
import fs from 'node:fs';
const SRC = fs.readFileSync(`${import.meta.dirname}/../assets/js/listings.js`, 'utf8');
const CATALOGUE = JSON.parse(SRC.slice(SRC.indexOf('{'), SRC.lastIndexOf('}') + 1));
const STOCK = CATALOGUE.products.length;
const inBrand = (id) => CATALOGUE.products.filter((p) => p.collection === id).length;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const failed = []; page.on('requestfailed', r => failed.push(r.url()));
const step = async (l, fn) => { try { await fn(); console.log('PASS', l); }
  catch (e) { console.log('FAIL', l, '->', e.message.split('\n')[0]); process.exitCode = 1; } };

await page.goto(URL, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
await page.waitForTimeout(1000);

await step('home renders with no external requests', async () => {
  if (failed.length) throw new Error('failed requests: ' + failed.join(', '));
  const r = await page.evaluate(() => ({
    tiles: document.querySelectorAll('.brand-tile').length,
    cards: document.querySelectorAll('[data-latest] .card').length }));
  if (r.tiles !== 9 || r.cards !== 8) throw new Error(JSON.stringify(r));
});

await step('fonts are embedded, not fetched', async () => {
  const ok = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('300 48px "Cormorant Garamond"') && document.fonts.check('400 16px Jost');
  });
  if (!ok) throw new Error('fonts unavailable');
});

await step('nav routes to the shop', async () => {
  await page.locator('.nav a[href="#/shop"]').click();
  await page.waitForTimeout(800);
  if (!page.url().endsWith('#/shop')) throw new Error(page.url());
  const n = await page.locator('[data-grid] .card').count();
  if (n !== STOCK) throw new Error(`grid shows ${n}, catalogue has ${STOCK}`);
});

await step('brand facet deep-links through the hash', async () => {
  await page.goto(URL + '#/shop?collection=rolex', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const n = await page.locator('[data-grid] .card').count();
  if (n !== inBrand('rolex')) throw new Error(`rolex facet shows ${n}, catalogue has ${inBrand('rolex')}`);
  if (!await page.locator('input[value="rolex"]').isChecked()) throw new Error('facet not restored');
});

await step('listing opens from a card, with its Telegram link', async () => {
  await page.locator('.card-name a').first().click();
  await page.waitForTimeout(900);
  if (!page.url().includes('#/product?id=')) throw new Error(page.url());
  if (!await page.locator('.facts').count()) throw new Error('no facts block');
  const href = await page.locator('a.btn-telegram').first().getAttribute('href');
  if (!href.startsWith('https://t.me/')) throw new Error('no telegram link');
});

await step('bag and checkout work through the router', async () => {
  await page.locator('[data-add]').click();
  await page.waitForTimeout(250);
  await page.locator('.cart-btn').click();
  await page.waitForTimeout(900);
  if (await page.locator('[data-line]').count() !== 1) throw new Error('bag empty');
  await page.locator('a[href="#/checkout"]').click();
  await page.waitForTimeout(900);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(200);
  if (await page.locator('.error:not(:empty)').count() < 6) throw new Error('no validation');
  await page.evaluate(() => Cart.clear());
});

await step('about anchor jumps to the section', async () => {
  await page.goto(URL + '#/about?at=returns', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const y = await page.evaluate(() => {
    const el = document.getElementById('returns');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  if (y === null) throw new Error('no #returns section');
  if (Math.abs(y) > 240) throw new Error('did not scroll, top=' + y);
});

await step('unknown route falls back to home', async () => {
  await page.goto(URL + '#/nonsense', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (!await page.locator('.brand-tile').count()) throw new Error('no home view');
});

await step('no horizontal overflow at 390px', async () => {
  const m = await ctx.newPage();
  await m.setViewportSize({ width: 390, height: 800 });
  for (const r of ['', '#/shop', '#/about']) {
    await m.goto(URL + r, { waitUntil: 'networkidle' });
    await m.waitForTimeout(600);
    if (await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
      throw new Error('overflow at ' + (r || 'home'));
  }
  await m.close();
});

console.log(errs.length ? 'PAGE ERRORS: ' + errs.join('; ') : 'No page errors.');
if (errs.length) process.exitCode = 1;
await b.close();
