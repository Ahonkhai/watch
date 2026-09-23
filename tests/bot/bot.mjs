import { makeWorld, deliver, photoMsg, videoMsg, docMsg, textMsg, callback } from './harness.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const SEED = fs.readFileSync(new URL('../../assets/js/listings.js', import.meta.url), 'utf8');
const LP = 'assets/js/listings.js';

/* The catalogue is live data — the bot adds to it whenever a watch is listed.
   Expectations are relative to whatever it holds, never to a literal, or the
   suite breaks the first time someone does their job. */
const STOCK = JSON.parse(SEED.slice(SEED.indexOf('{'), SEED.lastIndexOf('}') + 1)).products.length;

let pass = 0, fail = 0;
const step = async (label, fn) => {
  try { await fn(); console.log('PASS', label); pass++; }
  catch (e) { console.log('FAIL', label, '->', e.message); fail++; }
};
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, what) => { if (!c) throw new Error(what); };

const CAPTION = `Brand: Rolex
Model: Explorer II
Ref: 226570
Year: 2021
Condition: Excellent
Set: Full set
Price: 9800
Size: 42
Movement: automatic
Tagline: White dial, 24-hour bezel.
Description: Worn sparingly, card dated and matching.
Specs:
Case material: Oystersteel
Movement: Rolex calibre 3285, automatic`;

const PIPED = `Rolex | Explorer II | 226570 | 2021 | Excellent | Full set | 9800 | 42 | automatic
White dial, 24-hour bezel.

Worn sparingly.`;

const load = (w) => {
  const s = w.files.get(LP).toString();
  return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
};
const listing = (w, id) => load(w).products.find((p) => p.id === id);
/* The most recent thing the bot said, however it said it — a reply and an
   edit are both "what the user is now looking at". */
const lastText = (w) => w.log.at(-1).text;
const lastKb = (w) => w.log.at(-1).reply_markup?.inline_keyboard || [];
const btn = (w, label) => lastKb(w).flat().find((b) => b.text.includes(label));

const fresh = async () => {
  /* Seed the photographs the catalogue already points at, so numbering is
     tested against a repository that looks like the real one. */
  const seedFiles = { [LP]: SEED };
  for (const p of JSON.parse(SEED.slice(SEED.indexOf('{'), SEED.lastIndexOf('}') + 1)).products) {
    (p.images || []).forEach((src) => { seedFiles[src] = 'EXISTING'; });
    if (p.video) seedFiles[p.video] = 'EXISTING';
  }
  const w = makeWorld({ files: seedFiles });
  const { default: handler } = await import(new URL('../../api/telegram.js', import.meta.url).href + '?v=' + Math.random());
  /* Buttons act on the bot's own message, so a tap has to carry it back. */
  const tap = (data, text = lastText(w)) =>
    deliver(handler, { callback_query: { id: 'cb', from: { id: 42 }, data,
      message: { message_id: 900, chat: { id: 5 }, text } } });
  return { w, handler, tap };
};

/* ---------- authorisation ---------- */

await step('a wrong webhook secret is rejected', async () => {
  const { w, handler } = await fresh();
  const res = await deliver(handler, textMsg('/list'), { secret: 'guess' });
  eq(res.code, 401, 'status'); eq(w.sent.length, 0, 'messages');
});

await step('a stranger gets 200 and nothing else', async () => {
  const { w, handler } = await fresh();
  const res = await deliver(handler, textMsg('/list', { user: 999 }));
  eq(res.code, 200, 'status'); eq(w.sent.length, 0, 'messages'); eq(w.commitLog.length, 0, 'commits');
});

/* ---------- uploading ---------- */

await step('an album drafts without deploying, and replies exactly once', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p3', mid: 3 }));
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/media/g1/')).length, 3, 'staged');
  eq(w.sent.length, 1, 'messages');
  ok(w.commitLog.every((c) => c.message.endsWith('[skip ci]')), 'nothing deployed');
  eq(load(w).products.length, STOCK, 'catalogue untouched');
});

await step('the piped shorthand still works', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: PIPED }));
  ok(/Explorer II/.test(w.sent[0].text), 'parsed');
  ok(/\$9,800/.test(w.sent[0].text), 'price');
});

await step('publish writes listing and media in ONE deploying commit', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  const before = w.commitLog.length;
  await tap('pub:');

  const after = w.commitLog.slice(before);
  eq(after.length, 1, 'commits');
  ok(!after[0].message.includes('[skip ci]'), 'deploys');
  const p = listing(w, 'rolex-226570');
  eq(p.price, 9800, 'price'); eq(p.images.length, 2, 'images');
  eq(p.images[0], 'assets/img/rolex-226570/01.jpg', 'path');
  eq([...w.files.keys()].filter((f) => f.startsWith('.bot/')).length, 0, 'draft cleaned up');
});

await step('commits are authored by the repo owner, with no co-author', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await tap('pub:');
  for (const c of w.commitLog) {
    eq(c.author.name, 'Ahonkhai', 'author');
    ok(!/Co-Authored-By/i.test(c.message), 'no co-author');
  }
});

await step('a re-delivered webhook does not duplicate a photograph', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/media/g1/')).length, 1, 'staged');
});

await step('publishing twice does not duplicate the listing', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  const card = lastText(w);
  await tap('pub:', card);
  await tap('pub:', card);
  eq(load(w).products.length, STOCK + 1, 'catalogue size');
  ok(/already published or discarded/.test(lastText(w)), 'explains');
});

await step('discard removes everything and publishes nothing', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p2', mid: 2 }));
  await tap('dis:');
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/')).length, 0, 'leftovers');
  eq(load(w).products.length, STOCK, 'catalogue size');
});

/* ---------- video ---------- */

await step('a video in the album is published alongside the photographs', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, videoMsg({ group: 'g1', uid: 'v1', mid: 2 }));
  ok(/1 video/.test(lastText(w)) || /video\(s\)/.test(lastText(w)), 'counted on the card');
  await tap('pub:');
  const p = listing(w, 'rolex-226570');
  eq(p.video, 'assets/img/rolex-226570/video.mp4', 'video path');
  eq(p.images.length, 1, 'photographs unaffected');
  ok(w.files.has('assets/img/rolex-226570/video.mp4'), 'file in place');
});

await step('a video sent as a file is accepted; a PDF is not', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, docMsg({ uid: 'd1', mime: 'video/quicktime', name: 'clip.mov' }));
  eq([...w.files.keys()].filter((p) => p.endsWith('.mp4')).length, 1, 'video staged');
  await deliver(handler, docMsg({ uid: 'd2', mime: 'application/pdf', name: 'spec.pdf' }));
  ok(/neither/.test(w.sent.at(-1).text), 'PDF refused');
});

await step('a file over the 20 MB Telegram limit is refused with the size', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, videoMsg({ group: 'g1', uid: 'v1', size: 25 * 1024 * 1024 }));
  ok(/25\.0 MB/.test(w.sent[0].text), 'names the size');
  ok(/20 MB/.test(w.sent[0].text), 'names the limit');
  eq([...w.files.keys()].filter((p) => p.startsWith('.bot/')).length, 0, 'nothing staged');
});

await step('a large-but-legal video warns about repository weight', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, videoMsg({ group: 'g1', uid: 'v1', size: 12 * 1024 * 1024 }));
  ok(/12\.0 MB/.test(w.sent[0].text), 'names the size');
  ok([...w.files.keys()].some((p) => p.endsWith('.mp4')), 'still saved');
});

/* ---------- editing a published listing ---------- */

const publishOne = async () => {
  const f = await fresh();
  await deliver(f.handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await f.tap('pub:');
  f.w.edited.length = 0; f.w.sent.length = 0; f.w.log.length = 0;
  await deliver(f.handler, textMsg('/edit 226570'));
  return f;
};

await step('/edit opens a field menu for every field', async () => {
  const { w } = await publishOne();
  const labels = lastKb(w).flat().map((b) => b.text);
  for (const l of ['Brand', 'Model', 'Reference', 'Year', 'Condition', 'Set', 'Price',
                   'Size', 'Movement', 'Tagline', 'Description']) {
    ok(labels.some((x) => x.includes(l)), `no button for ${l}`);
  }
  ok(labels.some((x) => x.includes('Media')), 'no media button');
  ok(labels.some((x) => x.includes('Specs')), 'no specs button');
});

await step('editing a free-text field by reply saves it', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:tagline');
  const prompt = lastText(w);
  ok(/#field-tagline/.test(prompt), 'prompt carries the field');
  await deliver(handler, textMsg('Steel on Oyster bracelet.', { replyTo: prompt }));
  eq(listing(w, 'rolex-226570').tagline, 'Steel on Oyster bracelet.', 'tagline');
  ok(!w.commitLog.at(-1).message.includes('[skip ci]'), 'deploys');
});

await step('a vocabulary field is edited by button, not by typing', async () => {
  const { w, tap } = await publishOne();
  await tap('f:condition');
  const choices = lastKb(w).flat().map((b) => b.text);
  ok(choices.some((c) => c.includes('Unworn')), 'offers Unworn');
  ok(choices.some((c) => c.includes('•')), 'marks the current value');
  await tap('v:condition:0');
  eq(listing(w, 'rolex-226570').condition, 'Unworn', 'condition');
});

await step('an invalid value is refused and the listing is untouched', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:price');
  await deliver(handler, textMsg('free', { replyTo: lastText(w) }));
  eq(listing(w, 'rolex-226570').price, 9800, 'price');
  ok(/is not a number/.test(w.sent.at(-1).text), 'explains');
});

await step('a price with symbols and commas is accepted', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:price');
  await deliver(handler, textMsg('$10,250', { replyTo: lastText(w) }));
  eq(listing(w, 'rolex-226570').price, 10250, 'price');
});

await step('editing the reference renames the listing and moves its media', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:reference');
  await deliver(handler, textMsg('226570A', { replyTo: lastText(w) }));
  const p = listing(w, 'rolex-226570a');
  ok(p, 'listing renamed');
  eq(p.images[0], 'assets/img/rolex-226570a/01.jpg', 'image path rewritten');
  ok(w.files.has('assets/img/rolex-226570a/01.jpg'), 'file moved');
  ok(!w.files.has('assets/img/rolex-226570/01.jpg'), 'old file gone');
  ok(!listing(w, 'rolex-226570'), 'old id gone');
});

await step('a rename that would collide is refused', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:reference');
  await deliver(handler, textMsg('126610LN', { replyTo: lastText(w) }));
  ok(/collide/.test(lastText(w)), 'explains');
  ok(listing(w, 'rolex-226570'), 'original intact');
});

await step('editing the brand moves it to another collection', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:brand');
  await deliver(handler, textMsg('Grand Seiko', { replyTo: lastText(w) }));
  const p = listing(w, 'grand-seiko-226570');
  ok(p, 'renamed under the new brand');
  eq(p.collection, 'grand-seiko', 'collection');
  ok(load(w).collections.some((c) => c.id === 'grand-seiko'), 'brand added to the shop');
});

await step('the specification table is replaced wholesale', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:__specs');
  await deliver(handler, textMsg('Case: Steel\nCrystal: Sapphire', { replyTo: lastText(w) }));
  const s = listing(w, 'rolex-226570').specs;
  eq(Object.keys(s).length, 2, 'row count');
  eq(s.Crystal, 'Sapphire', 'value');
});

await step('media can be added to a published listing', async () => {
  const { w, handler, tap } = await publishOne();
  await tap('f:__media');
  const prompt = lastText(w);
  await deliver(handler, photoMsg({ uid: 'extra', replyTo: prompt, mid: 40 }));
  eq(listing(w, 'rolex-226570').images.length, 2, 'photographs');
  await deliver(handler, videoMsg({ uid: 'vx', replyTo: prompt, mid: 41 }));
  ok(listing(w, 'rolex-226570').video, 'video attached');
});

await step('a draft can be corrected before publishing', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await tap('f:price');
  await deliver(handler, textMsg('8750', { replyTo: lastText(w) }));
  ok(w.commitLog.every((c) => c.message.endsWith('[skip ci]')), 'still no deploy');
  await tap('pub:');
  eq(listing(w, 'rolex-226570').price, 8750, 'price carried into the listing');
});

/* ---------- adding media to something already listed ---------- */

await step('the no-caption nudge offers both routes', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g5', uid: 'n1' }));
  const t = w.sent[0].text;
  ok(/reference/i.test(t), 'mentions attaching to an existing listing');
  ok(/full details/i.test(t), 'mentions starting a new one');
});

await step('replying with a bare reference attaches the media to that listing', async () => {
  const { w, handler } = await fresh();
  const before = listing(w, 'rolex-126610ln').images.length;
  await deliver(handler, photoMsg({ group: 'g5', uid: 'n1' }));
  await deliver(handler, photoMsg({ group: 'g5', uid: 'n2', mid: 2 }));
  await deliver(handler, textMsg('126610LN', { replyTo: w.sent[0].text }));

  const p = listing(w, 'rolex-126610ln');
  eq(p.images.length, before + 2, 'photographs added');
  ok(p.images.at(-1).startsWith('assets/img/rolex-126610ln/'), 'stored under the listing');
  eq(load(w).products.length, STOCK, 'no new listing was created');
  eq([...w.files.keys()].filter((f) => f.startsWith('.bot/')).length, 0, 'draft cleaned up');
  ok(!w.commitLog.at(-1).message.includes('[skip ci]'), 'deploys');
});

await step('a video can be added to an existing listing the same way', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, videoMsg({ group: 'g5', uid: 'v9' }));
  await deliver(handler, textMsg('126610LN', { replyTo: w.sent.at(-1).text }));
  eq(listing(w, 'rolex-126610ln').video, 'assets/img/rolex-126610ln/video.mp4', 'video attached');
});

await step('added photographs are numbered after the ones already there', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g5', uid: 'n1' }));
  await deliver(handler, textMsg('129720BLNR', { replyTo: w.sent[0].text }));
  const p = listing(w, 'rolex-129720blnr');
  eq(p.images.length, 2, 'photograph count');
  eq(p.images[1], 'assets/img/rolex-129720blnr/02.jpg', 'numbered on from the existing one');
  ok(w.files.has('assets/img/rolex-129720blnr/01.jpg'), 'the original is untouched');
});

await step('a reference TYPED, not replied, still attaches the media', async () => {
  const { w, handler } = await fresh();
  const before = listing(w, 'rolex-126610ln').images.length;
  await deliver(handler, photoMsg({ group: 'g6', uid: 't1' }));
  await deliver(handler, textMsg('126610LN'));          // no reply_to_message
  eq(listing(w, 'rolex-126610ln').images.length, before + 1, 'photograph added');
  eq(load(w).products.length, STOCK, 'no new listing');
});

await step('a reference typed with nothing staged opens that listing for editing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('126610LN'));
  const labels = lastKb(w).flat().map((b) => b.text);
  ok(labels.some((x) => x.includes('Price')), 'editor opened');
  ok(/#t-listing-rolex-126610ln/.test(lastText(w)), 'on the right listing');
  eq(w.commitLog.length, 0, 'nothing committed');
});

await step('a stale pointer to already-published media does not block editing', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g7', uid: 'u1', caption: CAPTION }));
  await tap('pub:');                                     // consumes the staged media
  await deliver(handler, textMsg('126610LN'));           // pointer still names g7
  ok(/#t-listing-rolex-126610ln/.test(lastText(w)), 'falls through to the editor');
});

await step('text that is not a reference is still read as listing details', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg(CAPTION));
  ok(/Explorer II/.test(lastText(w)), 'preview shown');
});

await step('an unknown reference is a one-line answer, not a wall of errors', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g5', uid: 'n1' }));
  await deliver(handler, textMsg('NOSUCHREF', { replyTo: w.sent[0].text }));
  const t = w.sent.at(-1).text;
  ok(/No listing matches/.test(t), 'says what is wrong');
  ok(!/is missing/.test(t), 'does not list every field as missing');
  ok(w.files.has('.bot/media/g5/n1.jpg'), 'media kept so they can retry');
});

/* ---------- bad input ---------- */

await step('a bad caption explains itself and keeps the media', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g2', uid: 'q1',
    caption: CAPTION.replace('Condition: Excellent', 'Condition: Mint') }));
  ok(/could not read/i.test(w.sent[0].text), 'says so');
  ok(/Condition must be one of/.test(w.sent[0].text), 'names the field');
  ok(w.files.has('.bot/media/g2/q1.jpg'), 'media kept');
});

await step('a corrected caption sent as a reply recovers the draft', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g2', uid: 'q1', caption: 'nonsense' }));
  await deliver(handler, textMsg(CAPTION, { replyTo: w.sent[0].text }));
  ok(/Explorer II/.test(lastText(w)), 'preview shown');
  await tap('pub:');
  eq(listing(w, 'rolex-226570').images.length, 1, 'original photograph survived');
});

await step('details pasted as plain text start a listing', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg(CAPTION));
  ok(/Explorer II/.test(w.sent.at(-1).text), 'preview shown');
  ok(w.files.has('.bot/drafts/m1.json'), 'draft written');
});

await step('an album with no caption at all says so once', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, photoMsg({ group: 'g3', uid: 'r1' }));
  await deliver(handler, photoMsg({ group: 'g3', uid: 'r2', mid: 2 }));
  eq(w.sent.length, 1, 'messages');
  ok(/reference/i.test(w.sent[0].text) && /full details/i.test(w.sent[0].text), 'offers both routes');
});

await step('a duplicate reference is refused rather than shadowing the old one', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g4', uid: 's1',
    caption: CAPTION.replace('226570', '126610LN') }));
  await tap('pub:');
  eq(load(w).products.length, STOCK, 'catalogue size');
  ok(/already exists/.test(lastText(w)), 'explains');
});

/* ---------- commands ---------- */

await step('/list shows stock with media counts and an edit shortcut', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/list'));
  const t = w.sent[0].text;
  ok(new RegExp(`${STOCK} in stock`).test(t), 'count');
  ok(/126610LN/.test(t), 'reference');
  ok(/\/edit 126610LN/.test(t), 'edit shortcut');
});

await step('/new hands over a template that parses', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/new'));
  const m = /<pre>([\s\S]*?)<\/pre>/.exec(w.sent[0].text);
  ok(m, 'template sent');
  const { parseCaption } = await import(new URL('../../api/_lib/parse.js', import.meta.url).href);
  ok(parseCaption(m[1].replace(/&amp;/g, '&')).ok, 'the template it hands out is valid');
});

await step('/help registers the slash-command menu', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/help'));
  ok(w.commands && w.commands.length >= 5, 'menu registered');
  ok(w.commands.some((c) => c.command === 'edit'), 'edit in the menu');
});

await step('/price reprices and deploys', async () => {
  const { w, handler } = await fresh();
  await deliver(handler, textMsg('/price 126610LN 13900'));
  eq(listing(w, 'rolex-126610ln').price, 13900, 'price');
  ok(!w.commitLog[0].message.includes('[skip ci]'), 'deploys');
});

await step('/sold asks first, then removes the listing and its media', async () => {
  const { w, handler, tap } = await publishOne();
  await deliver(handler, textMsg('/sold 226570'));
  ok(/as sold/.test(w.sent.at(-1).text), 'asked');
  eq(load(w).products.length, STOCK + 1, 'not yet removed');
  await tap('sold:', w.sent.at(-1).text);
  eq(load(w).products.length, STOCK, 'removed');
  eq([...w.files.keys()].filter((p) => p.startsWith('assets/img/rolex-226570/')).length, 0, 'media removed');
});

await step('cancelling /sold keeps the listing', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, textMsg('/sold 126610LN'));
  await tap('cancel:', w.sent.at(-1).text);
  eq(load(w).products.length, STOCK, 'catalogue size');
  eq(w.commitLog.length, 0, 'commits');
});

/* ---------- resilience ---------- */

await step('a racing commit is retried rather than lost', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  w.conflictOnce = true;
  await tap('pub:');
  eq(load(w).products.length, STOCK + 1, 'published despite the conflict');
});

await step('the generated file stays valid JavaScript the site can load', async () => {
  const { w, handler, tap } = await fresh();
  await deliver(handler, photoMsg({ group: 'g1', uid: 'p1', caption: CAPTION }));
  await deliver(handler, videoMsg({ group: 'g1', uid: 'v1', mid: 2 }));
  await tap('pub:');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(w.files.get(LP).toString() + '\nthis.OUT = CATALOGUE;', ctx);
  eq(ctx.OUT.products.length, STOCK + 1, 'evaluates');
  eq(ctx.OUT.products[0].video, 'assets/img/rolex-226570/video.mp4', 'video survives the round trip');
});

/* ---------- the health endpoint ---------- */

const health = async (env) => {
  for (const k of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_ALLOWED_IDS',
                   'GITHUB_TOKEN', 'GITHUB_REPO', 'GITHUB_BRANCH']) delete process.env[k];
  Object.assign(process.env, env);
  const { default: h } = await import(new URL('../../api/health.js', import.meta.url).href + '?v=' + Math.random());
  const res = { hdr: {}, code: 0, body: null,
    setHeader(k, v) { this.hdr[k] = v; }, status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; } };
  h({}, res);
  return res;
};

const FULL = {
  TELEGRAM_BOT_TOKEN: 'SECRET-bot-token', TELEGRAM_WEBHOOK_SECRET: 'SECRET-webhook',
  TELEGRAM_ALLOWED_IDS: '111222333,444555666', GITHUB_TOKEN: 'SECRET-github',
  GITHUB_REPO: 'Ahonkhai/watch', GITHUB_BRANCH: 'main',
};

await step('health names what is missing, without values', async () => {
  const r = await health({ GITHUB_REPO: 'Ahonkhai/watch' });
  eq(r.code, 503, 'status');
  ok(r.body.missing.includes('TELEGRAM_BOT_TOKEN'), 'names it');
  eq(r.body.functions, 'deployed', 'proves api/ built');
});

await step('health reports ready once everything is set', async () => {
  const r = await health(FULL);
  eq(r.code, 200, 'status'); eq(r.body.configured, true, 'configured');
  eq(r.body.operators, 2, 'operator count');
  eq(r.hdr['Cache-Control'], 'no-store', 'not cacheable');
});

await step('health never discloses a secret, or who may drive the bot', async () => {
  const json = JSON.stringify((await health(FULL)).body);
  for (const s of ['SECRET-bot-token', 'SECRET-webhook', 'SECRET-github', '111222333', '444555666']) {
    ok(!json.includes(s), `leaked ${s}`);
  }
  ok(json.includes('Ahonkhai/watch'), 'target repo shown');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
