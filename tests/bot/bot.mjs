import { makeWorld, deliver, photoMsg, textMsg, callback } from './harness.mjs';
import fs from 'node:fs';

const SEED = fs.readFileSync(new URL('../../assets/js/listings.js', import.meta.url), 'utf8');
const LP = 'assets/js/listings.js';

let pass = 0, fail = 0;
const step = async (label, fn) => {
  try { await fn(); console.log('PASS', label); pass++; }
  catch (e) { console.log('FAIL', label, '->', e.message); fail++; }
};
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, what) => { if (!c) throw new Error(what); };

const CAPTION = `Rolex | Explorer II | 226570 | 2021 | Excellent | Full set | 9800 | 42 | automatic
White dial, 24-hour bezel.

Worn sparingly, no notable marks. Card dated and matching.

Case material: Oystersteel
Movement: Rolex calibre 3285, automatic
Water resistance: 100 m`;

const load = (w) => JSON.parse((() => {
  const s = w.files.get(LP).toString();
  return s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1);
})());

const fresh = async () => {
  const w = makeWorld({ files: { [LP]: SEED } });
  const { default: handler } = await import(new URL('../../api/telegram.js', import.meta.url).href + '?v=' + Math.random());
  return { w, handler };
};

/* ---------- authorisation ---------- */

await step('a wrong webhook secret is rejected', async () => {
  const { w, handler } = await fresh();
  const res = await deliver(handler, textMsg('/list'), { secret: 'guess' });
  eq(res.code, 401, 'status');
  eq(w.sent.length, 0, 'messages sent');
});

await step('a stranger gets 200 and nothing else', async () => {
  const { w, handler } = await fresh();
  const res = await deliver(handler, textMsg('/list', { user: 999 }));
  eq(res.code, 200, 'status');
  eq(w.sent.length, 0, 'messages sent');
  eq(w.commitLog.length, 0, 'commits');
});

/* ---------- the upload flow ---------- */

await step('an album with a caption drafts without deploying', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p3', mid: 3 }));

  const media = [...w.files.keys()].filter((p) => p.startsWith('.bot/media/g1/'));
  eq(media.length, 3, 'photographs staged');
  ok(w.files.has('.bot/drafts/g1.json'), 'draft written');
  ok(w.commitLog.every((c) => c.message.endsWith('[skip ci]')), 'every draft commit skips the deploy');
  eq(load(w).products.length, 12, 'catalogue untouched');
});

await step('only the captioned photo replies, and it shows what was parsed', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p3', mid: 3 }));
  eq(w.sent.length, 1, 'messages');
  const t = w.sent[0].text;
  ok(/Explorer II/.test(t), 'model in preview');
  ok(/226570/.test(t), 'reference in preview');
  ok(/\$9,800/.test(t), 'price formatted');
  ok(/Specification rows: 3/.test(t), 'specs counted');
  eq(w.sent[0].reply_markup.inline_keyboard[0].length, 2, 'publish + discard');
});

await step('publish writes listing and photos in ONE deploying commit', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  const before = w.commitLog.length;
  await deliver(handler, callback('pub:g1'));

  const after = w.commitLog.slice(before);
  eq(after.length, 1, 'commits made by publish');
  ok(!after[0].message.includes('[skip ci]'), 'the publish commit deploys');

  const cat = load(w);
  eq(cat.products.length, 13, 'catalogue size');
  const p = cat.products[0];
  eq(p.id, 'rolex-226570', 'id');
  eq(p.price, 9800, 'price');
  eq(p.condition, 'Excellent', 'condition');
  eq(p.images.length, 2, 'images');
  eq(p.images[0], 'assets/img/rolex-226570/01.jpg', 'image path');
  ok(w.files.has('assets/img/rolex-226570/01.jpg'), 'photo in place');
  ok(w.files.get('assets/img/rolex-226570/01.jpg').toString().startsWith('JPEGBYTES'), 'real bytes carried over');
});

await step('publish cleans the draft up after itself', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, callback('pub:g1'));
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/')).length, 0, 'leftover draft files');
});

await step('commits are authored by the repo owner, with no co-author', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, callback('pub:g1'));
  for (const c of w.commitLog) {
    eq(c.author.name, 'Ahonkhai', 'author name');
    ok(/122228978\+Ahonkhai@users\.noreply\.github\.com/.test(c.author.email), 'author email');
    ok(!/Co-Authored-By/i.test(c.message), 'no co-author trailer');
  }
});

await step('publishing twice does not duplicate the listing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, callback('pub:g1'));
  await deliver(handler, callback('pub:g1'));
  eq(load(w).products.length, 13, 'catalogue size');
  ok(/already published or discarded/.test(w.edited.at(-1).text), 'second tap explains itself');
});

await step('a re-delivered webhook does not duplicate a photograph', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));   // Telegram retry
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/media/g1/')).length, 1, 'staged photos');
});

await step('discard removes everything and publishes nothing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  await deliver(handler, callback('dis:g1'));
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/')).length, 0, 'leftover files');
  eq(load(w).products.length, 12, 'catalogue size');
  ok(w.commitLog.every((c) => c.message.endsWith('[skip ci]')), 'nothing deployed');
});

/* ---------- bad input ---------- */

await step('a bad caption explains itself and keeps the photographs', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g2', uid: 'q1', caption: 'Rolex | Explorer | 226570 | 2021 | Mint | Full set | 9800' }));
  const t = w.sent[0].text;
  ok(/could not read/i.test(t), 'says so');
  ok(/Condition must be one of/.test(t), 'names the bad field');
  ok(/#draft-g2/.test(t), 'carries the draft marker');
  ok(w.files.has('.bot/media/g2/q1.jpg'), 'photograph kept');
  ok(!w.files.has('.bot/drafts/g2.json'), 'no draft from a bad caption');
});

await step('a corrected caption sent as a reply recovers the draft', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g2', uid: 'q1', caption: 'nonsense' }));
  await deliver(handler, textMsg(CAPTION, { replyTo: 'I could not read that caption.\n\n#draft-g2' }));
  ok(w.files.has('.bot/drafts/g2.json'), 'draft recovered');
  ok(/Explorer II/.test(w.sent.at(-1).text), 'preview shown');
  await deliver(handler, callback('pub:g2'));
  eq(load(w).products[0].images.length, 1, 'the original photograph survived');
});

await step('an album with no caption at all says so once', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g3', uid: 'r1' }));
  await deliver(handler, photoMsg({ group: 'g3', uid: 'r2', mid: 2 }));
  await deliver(handler, photoMsg({ group: 'g3', uid: 'r3', mid: 3 }));
  eq(w.sent.length, 1, 'messages');
  ok(/no caption/.test(w.sent[0].text), 'explains');
});

await step('a duplicate reference is refused rather than shadowing the old one', async () => {
  const { w, handler } = await fresh();
  const dupe = CAPTION.replace('226570', '126610LN').replace('Explorer II', 'Submariner Date');
  await deliver(handler, photoMsg({ group: 'g4', uid: 's1', caption: dupe }));
  await deliver(handler, callback('pub:g4'));
  eq(load(w).products.length, 12, 'catalogue size');
  ok(/already exists/.test(w.edited.at(-1).text), 'explains');
});

/* ---------- commands ---------- */

await step('/list shows the stock', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/list'));
  const t = w.sent[0].text;
  ok(/12 in stock/.test(t), 'count');
  ok(/126610LN/.test(t), 'a reference');
  ok(/rolex-126610ln/.test(t), 'the id');
});

await step('/price reprices by reference and deploys', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/price 126610LN 13900'));
  const p = load(w).products.find((x) => x.reference === '126610LN');
  eq(p.price, 13900, 'new price');
  eq(w.commitLog.length, 1, 'commits');
  ok(!w.commitLog[0].message.includes('[skip ci]'), 'deploys');
  ok(/\$14,200 → <b>\$13,900/.test(w.sent[0].text), 'reports both figures');
});

await step('/price on an unknown reference changes nothing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/price NOPE 100'));
  eq(w.commitLog.length, 0, 'commits');
  ok(/No listing matches/.test(w.sent[0].text), 'explains');
});

await step('/sold asks first, then removes the listing and its photographs', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, callback('pub:g1'));
  await deliver(handler, textMsg('/sold 226570'));
  ok(/Mark <b>Explorer II/.test(w.sent.at(-1).text), 'confirmation asked');
  eq(load(w).products.length, 13, 'not removed yet');

  await deliver(handler, callback('sold:rolex-226570'));
  eq(load(w).products.length, 12, 'removed');
  eq([...w.files.keys()].filter((p) => p.startsWith('assets/img/rolex-226570/')).length, 0, 'photographs removed');
  ok(!w.commitLog.at(-1).message.includes('[skip ci]'), 'deploys');
});

await step('cancelling /sold keeps the listing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/sold 126610LN'));
  await deliver(handler, callback('cancel:'));
  eq(load(w).products.length, 12, 'catalogue size');
  eq(w.commitLog.length, 0, 'commits');
});

await step('/help explains the caption format', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/help'));
  ok(/brand \| model \| reference/.test(w.sent[0].text), 'format');
});

/* ---------- resilience ---------- */

await step('a racing commit is retried rather than lost', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  w.conflictOnce = true;
  await deliver(handler, callback('pub:g1'));
  eq(load(w).products.length, 13, 'published despite the conflict');
});

await step('the generated file stays valid JavaScript the site can load', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, callback('pub:g1'));
  const src = w.files.get(LP).toString();
  const ctx = {};
  (await import('node:vm')).createContext(ctx);
  (await import('node:vm')).runInContext(src + '\nthis.OUT = CATALOGUE;', ctx);
  eq(ctx.OUT.products.length, 13, 'evaluates');
  ok(/GENERATED FILE/.test(src), 'keeps the do-not-edit header');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
