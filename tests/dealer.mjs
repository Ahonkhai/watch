import { chromium } from './_browser.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8077';
/* Counts come from the catalogue, never from a literal. The shop's stock is
   written by the bot and changes whenever a watch is listed or sold; a suite
   that hard-codes "12" fails the first time someone does their job. */
import fs from 'node:fs';
const SRC = fs.readFileSync(new URL('../assets/js/listings.js', import.meta.url), 'utf8');
const CATALOGUE = JSON.parse(SRC.slice(SRC.indexOf('{'), SRC.lastIndexOf('}') + 1));
const STOCK = CATALOGUE.products.length;
const inBrand = (id) => CATALOGUE.products.filter((p) => p.collection === id).length;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const cerr = []; page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
const step = async (l, fn) => { try { await fn(); console.log('PASS', l); }
  catch (e) { console.log('FAIL', l, '->', e.message.split('\n')[0]); process.exitCode = 1; } };
const go = async (u) => {
  await page.goto(`${BASE}/${u}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(700);
};

for (const p of ['index.html', 'shop.html', 'cart.html', 'checkout.html', 'about.html', '404.html']) {
  await step(`loads: ${p}`, async () => {
    const r = await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
    if (r.status() !== 200) throw new Error('status ' + r.status());
  });
}

await step('home: brand tiles and latest listings', async () => {
  await go('index.html');
  const r = await page.evaluate(() => ({
    tiles: document.querySelectorAll('.brand-tile').length,
    cards: document.querySelectorAll('[data-latest] .card').length,
    count: document.querySelector('[data-stock-count]')?.textContent,
  }));
  if (r.tiles !== 9) throw new Error(`${r.tiles} brand tiles`);
  if (r.cards !== 8) throw new Error(`${r.cards} latest cards`);
  if (r.count !== String(STOCK)) throw new Error(`stock count says ${r.count}, catalogue has ${STOCK}`);
});

await step('every listing is one specific watch, never a variant', async () => {
  const bad = await page.evaluate(() =>
    PRODUCTS.filter(p => p.stock !== 1 || 'straps' in p).map(p => p.id));
  if (bad.length) throw new Error('not single-item: ' + bad.join(', '));
});

await step('no listing invents a photograph', async () => {
  await go('shop.html');
  const r = await page.evaluate(() => {
    const withPhotos = PRODUCTS.filter(p => p.images.length).length;
    return { withPhotos, placeholders: document.querySelectorAll('.photo-pending').length,
             imgs: document.querySelectorAll('.card-art img').length };
  });
  // Until real photographs exist, every card must show the pending panel and
  // never a stand-in image of some other watch.
  if (r.imgs !== r.withPhotos) throw new Error(`${r.imgs} images for ${r.withPhotos} photographed listings`);
  if (r.placeholders !== STOCK - r.withPhotos)
    throw new Error(`${r.placeholders} placeholders + ${r.withPhotos} photographed != ${STOCK} listed`);
});

await step('shop: every listing shown, with reference, year and condition', async () => {
  const n = await page.locator('[data-grid] .card').count();
  if (n !== STOCK) throw new Error(`shop shows ${n}, catalogue has ${STOCK}`);
  const meta = await page.locator('.card-meta').first().textContent();
  if (!/Ref\. .+ · \d{4} · \w+/.test(meta.replace(/\s+/g, ' ').trim()))
    throw new Error('card meta malformed: ' + meta.trim());
});

await step('shop: brand facet filters and deep-links', async () => {
  await page.locator('input[value="rolex"]').check();
  await page.waitForTimeout(250);
  const rolex = await page.locator('[data-grid] .card').count();
  if (rolex !== inBrand('rolex')) throw new Error(`rolex facet shows ${rolex}, catalogue has ${inBrand('rolex')}`);
  if (!page.url().includes('collection=rolex')) throw new Error('url not synced');
  await go('shop.html?collection=omega');
  if (await page.locator('[data-grid] .card').count() !== 2) throw new Error('omega deep link');
  if (!await page.locator('input[value="omega"]').isChecked()) throw new Error('facet not restored');
});

await step('shop: condition facet', async () => {
  await go('shop.html?condition=Unworn');
  const n = await page.locator('[data-grid] .card').count();
  const expected = await page.evaluate(() => PRODUCTS.filter(p => p.condition === 'Unworn').length);
  if (n !== expected) throw new Error(`${n} shown, ${expected} unworn`);
});

await step('shop: price range comes from the catalogue', async () => {
  await go('shop.html');
  const r = await page.evaluate(() => {
    const s = document.querySelector('#price-max');
    return { min: Number(s.min), max: Number(s.max),
             dataMax: Math.max(...PRODUCTS.map(p => p.price)) };
  });
  if (r.max < r.dataMax) throw new Error(`slider max ${r.max} below the dearest watch ${r.dataMax}`);
});

await step('listing page: facts, specification and brand', async () => {
  await go('product.html?id=rolex-126610ln');
  const r = await page.evaluate(() => ({
    h1: document.querySelector('.pdp h1').textContent.trim(),
    facts: [...document.querySelectorAll('.facts dt')].map(d => d.textContent.trim()),
    factVals: [...document.querySelectorAll('.facts dd')].map(d => d.textContent.trim()),
    specRows: document.querySelectorAll('.specs tr').length,
    title: document.title,
  }));
  if (r.h1 !== 'Submariner Date') throw new Error('h1: ' + r.h1);
  if (r.facts.join() !== 'Reference,Year,Condition,Set') throw new Error(r.facts.join());
  if (r.factVals[0] !== '126610LN') throw new Error('reference: ' + r.factVals[0]);
  if (r.specRows < 8) throw new Error('only ' + r.specRows + ' spec rows');
  if (!r.title.includes('126610LN')) throw new Error('title lacks the reference');
});

await step('listing page: Telegram link quotes the actual watch', async () => {
  const href = await page.locator('a.btn-telegram').first().getAttribute('href');
  if (!href.startsWith('https://t.me/')) throw new Error(href.slice(0, 40));
  const text = decodeURIComponent(href.split('text=')[1] || '');
  for (const must of ['Rolex', 'Submariner Date', '126610LN', '2023', 'Unworn']) {
    if (!text.includes(must)) throw new Error('message missing ' + must);
  }
});

await step('listing page: unknown id does not crash', async () => {
  await go('product.html?id=nope');
  if (!await page.locator('.empty-state').isVisible()) throw new Error('no empty state');
});

await step('bag: add, and a second add does not duplicate', async () => {
  await go('product.html?id=tudor-79030n');
  await page.locator('[data-add]').click();
  await page.locator('[data-add]').click();
  await page.waitForTimeout(200);
  const n = await page.evaluate(() => Cart.count());
  if (n !== 1) throw new Error(`count ${n}; only one of each watch exists`);
  const badge = await page.locator('[data-cart-count]').textContent();
  if (badge.trim() !== '01') throw new Error('badge ' + badge);
});

await step('bag: lists reference and removes', async () => {
  await go('cart.html');
  if (await page.locator('[data-line]').count() !== 1) throw new Error('line missing');
  const meta = await page.locator('.cart-line-meta').textContent();
  if (!meta.includes('79030N')) throw new Error('no reference in the bag line');
  if (await page.locator('.cart-line [data-step]').count()) throw new Error('quantity stepper still present');
  await page.locator('[data-remove]').click();
  await page.waitForTimeout(200);
  if (!await page.locator('.empty-state').isVisible()) throw new Error('not emptied');
});

await step('checkout: validates, then hands off to Telegram', async () => {
  await go('product.html?id=omega-31030425001002');
  await page.locator('[data-add]').click();
  await go('checkout.html');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(200);
  if (await page.locator('.error:not(:empty)').count() < 6) throw new Error('no validation');
  for (const [n, v] of [['email', 'a@b.co'], ['name', 'Dana Reyes'], ['address', '418 Larkspur'],
                        ['city', 'Portland'], ['postcode', '97209']]) {
    await page.locator(`input[name="${n}"]`).fill(v);
  }
  await page.locator('select[name="country"]').selectOption('United States');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(400);
  const h = await page.locator('h2').first().textContent();
  if (!/^Send order SC-/.test(h.trim())) throw new Error('no hand-off: ' + h);
  const body = await page.locator('[data-order]').textContent();
  for (const must of ['Omega', '310.30.42.50.01.002', 'Dana Reyes', 'insured delivery']) {
    if (!body.includes(must)) throw new Error('order text missing ' + must);
  }
  const tg = await page.locator('a.btn-telegram').first().getAttribute('href');
  if (!tg.startsWith('https://t.me/')) throw new Error('no telegram link');
  if (await page.evaluate(() => Cart.count()) !== 0) throw new Error('bag not cleared');
});

await step('checkout asks for no card details', async () => {
  await go('product.html?id=cartier-wssa0018');
  await page.locator('[data-add]').click();
  await go('checkout.html');
  for (const n of ['card', 'expiry', 'cvc']) {
    if (await page.locator(`input[name="${n}"]`).count()) throw new Error(`${n} field present`);
  }
  await page.evaluate(() => Cart.clear());
});

await step('no invented provenance left in the copy', async () => {
  for (const p of ['index.html', 'about.html']) {
    await go(p);
    const text = (await page.locator('main').textContent()).toLowerCase();
    for (const gone of ['biel', 'portland', 'watchmakers', 'our workshop', 'five-year warranty']) {
      if (text.includes(gone)) throw new Error(`${p} still says "${gone}"`);
    }
  }
});

await step('a listing with a video serves it playably', async () => {
  /* This container's Chromium is built without H.264, so it cannot decode any
     mp4 and asking it to play one proves nothing. What IS worth asserting is
     everything around the codec: that the element renders, that the file is
     actually served, that it arrives as video/mp4, and that the server answers
     byte ranges — a phone video keeps its moov index at the end of the file,
     so without ranges a browser cannot start it. */
  const withVideo = CATALOGUE.products.find((p) => p.video);
  if (!withVideo) return;                       // nothing to check yet

  await go(`product.html?id=${withVideo.id}`);
  const el = await page.evaluate(() => {
    const v = document.querySelector('[data-stage] video');
    return v ? { src: v.getAttribute('src'), controls: v.hasAttribute('controls'),
                 playsinline: v.hasAttribute('playsinline') } : null;
  });
  if (!el) throw new Error('no <video> rendered on a listing that has one');
  if (!el.controls) throw new Error('video has no controls');
  if (!el.playsinline) throw new Error('video is not playsinline — iOS would go fullscreen');

  const url = new URL(el.src.split('#')[0], `${BASE}/`).href;
  const head = await page.request.get(url, { headers: { Range: 'bytes=0-99' } });
  if (head.status() !== 206) throw new Error(`range request returned ${head.status()}, not 206`);
  const type = head.headers()['content-type'];
  if (!/video\/mp4/.test(type || '')) throw new Error(`served as ${type}, not video/mp4`);

  const whole = await page.request.get(url);
  if (whole.status() !== 200) throw new Error(`video returned ${whole.status()}`);
  const bytes = (await whole.body()).length;
  if (bytes < 1000) throw new Error(`video is only ${bytes} bytes`);
});

await step('a video with no photograph still shows a frame, not a black box', async () => {
  const noStill = CATALOGUE.products.find((p) => p.video && !(p.images || []).length);
  if (!noStill) return;
  await go(`product.html?id=${noStill.id}`);
  const src = await page.evaluate(() =>
    document.querySelector('[data-stage] video')?.getAttribute('src'));
  if (!/#t=/.test(src || '')) {
    throw new Error('no media fragment, so the player would render black until pressed');
  }
});

await step('no horizontal overflow at 390px', async () => {
  const m = await ctx.newPage();
  await m.setViewportSize({ width: 390, height: 800 });
  for (const p of ['index.html', 'shop.html', 'product.html?id=ap-15500st', 'about.html']) {
    await m.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
    await m.waitForTimeout(500);
    if (await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
      throw new Error('overflow on ' + p);
  }
  await m.close();
});

console.log(errs.length ? 'PAGE ERRORS: ' + errs.join('; ') : 'No page errors.');
console.log(cerr.length ? 'CONSOLE ERRORS: ' + cerr.join('; ') : 'No console errors.');
if (errs.length || cerr.length) process.exitCode = 1;
await b.close();
