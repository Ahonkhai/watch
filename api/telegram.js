/* The listing bot's webhook.
 *
 * There is no database. A draft accumulates in the repository under .bot/,
 * committed with [skip ci] so building a listing over several photographs
 * costs no deploys, and publishing writes everything in a single commit that
 * does deploy.
 *
 * Editing is stateless by the same trick. The bot stamps a marker into its
 * own message — #t-listing-<id> or #t-draft-<group> — and Telegram hands that
 * message back on every button tap and every reply, so the bot always knows
 * what is being edited without remembering anything between calls. That also
 * keeps callback_data well inside its 64-byte limit: it carries the field
 * name only, never the id. */

import { createHash } from 'node:crypto';
import { commitChanges, listTree, readFile } from './_lib/github.js';
import { send, edit, answer, download, buttons, esc, publishCommands } from './_lib/tg.js';
import { load, serialise, listingId, ensureCollection, money, LISTINGS_PATH } from './_lib/catalogue.js';
import { parseCaption, parseField, FIELDS, FIELD_ORDER, USAGE, TEMPLATE } from './_lib/parse.js';
import { attachment, isPhoto, isVideo, humanSize, MAX_BYTES, SOFT_VIDEO_BYTES } from './_lib/media.js';

export const config = { maxDuration: 60 };

const DRAFTS = '.bot/drafts';
const MEDIA  = '.bot/media';
const IMAGES = 'assets/img';

/* A pointer to the media staged most recently, so a reference typed as an
 * ordinary message — rather than as a reply to the bot — still finds it.
 * Nobody should have to long-press a message to answer it. */
const LAST = '.bot/last.json';

/* Once a draft is published, discarded or attached, the pointer to it is
 * stale. Resolution already tolerates that — it checks the media is still
 * there — but leaving residue under .bot/ invites the next reader to wonder
 * whether it means something. */
async function clearPointer(group, changes) {
  const raw = await readFile(LAST);
  if (raw && JSON.parse(raw).group === group) changes.push({ path: LAST, delete: true });
  return changes;
}

const draftPath = (g) => `${DRAFTS}/${g}.json`;

/* A listing's media filename carries a content hash, so a path is never
 * reused. Without it, selling a watch and relisting the same reference would
 * write a different photograph to assets/img/<id>/01.jpg — and anyone holding
 * the old one in cache would see the wrong watch. With it, these files can be
 * cached forever. */
const mediaName = (n, ext, sha) =>
  ext === 'mp4' ? `video-${String(sha).slice(0, 8)}.mp4`
                : `${String(n).padStart(2, '0')}-${String(sha).slice(0, 8)}.jpg`;

/* Leading digits of the basename, so both 01.jpg and 01-a1b2c3d4.jpg count. */
const numberIn = (p) => Number(/(?:^|\/)(\d+)/.exec(p.split('/').pop() || '')?.[1] || 0);
const mediaDir  = (g) => `${MEDIA}/${g}`;

/* ---------- targets ---------- */

const marker = (t) => `#t-${t.kind}-${t.key}`;
const targetOf = (text) => {
  const m = /#t-(draft|listing)-([A-Za-z0-9_-]+)/.exec(String(text || ''));
  return m ? { kind: m[1], key: m[2] } : null;
};

async function loadTarget(t) {
  if (t.kind === 'draft') {
    const raw = await readFile(draftPath(t.key));
    return raw ? { listing: JSON.parse(raw).listing } : null;
  }
  const catalogue = await load();
  const listing = catalogue.products.find((p) => p.id === t.key);
  return listing ? { listing, catalogue } : null;
}

/* ---------- authorisation ---------- */

function allowed(userId) {
  const list = (process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return list.length > 0 && list.includes(String(userId));
}

/* ---------- media ---------- */

async function stageMedia(msg, group, chat) {
  const att = attachment(msg);
  if (!att) return { staged: 0 };

  if (att.kind === 'unsupported') {
    await send(chat, `I can take photographs and videos. ${esc(att.name)} is neither.`);
    return { staged: 0 };
  }
  if (att.size > MAX_BYTES) {
    await send(chat,
      `That ${att.kind} is ${humanSize(att.size)}. Telegram will not hand a bot anything over 20 MB, ` +
      `so it has to be trimmed or compressed first.`);
    return { staged: 0 };
  }

  const path = `${mediaDir(group)}/${att.uid}.${att.ext}`;
  const existing = await listTree(`${mediaDir(group)}/`);
  if (existing.some((f) => f.path === path)) return { staged: 0, already: true, before: existing.length };

  const file = await download(att.file_id);
  await commitChanges({
    message: `Draft ${group}: ${att.kind}`,
    changes: [
      { path, base64: file.base64 },
      { path: LAST, content: JSON.stringify({ group, chat }, null, 2) },
    ],
    skipDeploy: true,
  });

  if (att.kind === 'video' && att.size > SOFT_VIDEO_BYTES) {
    await send(chat,
      `Saved that video (${humanSize(att.size)}). Videos live in the repository like photographs, ` +
      `so short clips keep it healthy — a few of that size is fine, a hundred is not.`);
  }
  return { staged: 1, before: existing.length, kind: att.kind };
}

async function onMedia(msg) {
  const chat = msg.chat.id;

  /* Media sent as a reply to "send more" is added to that listing or draft. */
  const t = msg.reply_to_message?.from?.is_bot ? targetOf(msg.reply_to_message.text) : null;
  if (t && t.kind === 'listing') return addMediaToListing(msg, t, chat);

  const group = msg.media_group_id || (t?.kind === 'draft' ? t.key : `m${msg.message_id}`);
  const res = await stageMedia(msg, group, chat);
  const parsed = msg.caption ? parseCaption(msg.caption) : null;

  if (parsed?.ok) {
    await commitChanges({
      message: `Draft ${group}: details`,
      changes: [{ path: draftPath(group), content: JSON.stringify({ group, chat, listing: parsed.listing }, null, 2) }],
      skipDeploy: true,
    });
    return preview(chat, group);
  }

  if (parsed && !parsed.ok) {
    const eg = exampleRef(await load());
    return send(chat,
      ['<b>I could not read that caption.</b>', '',
       ...parsed.errors.map((e) => `• ${esc(e)}`), '',
       'The media is saved. Reply to this message with a corrected caption, /new for a template,',
       `or just a reference like <code>${esc(eg)}</code> to add this to a watch already listed.`,
       '', marker({ kind: 'draft', key: group })].join('\n'));
  }

  /* No caption on this update. If a draft already exists, the member that
     carried the caption has shown the preview — five photographs must not
     produce five identical cards. */
  if (await readFile(draftPath(group))) return null;

  if (res.before === 0 && res.staged) {
    const eg = exampleRef(await load());
    return send(chat,
      ['Media saved. Reply to this message with either:', '',
       `• a <b>reference</b> like <code>${esc(eg)}</code> — adds it to that listing`,
       '• the <b>full details</b> — starts a new listing (/new for a template)', '',
       marker({ kind: 'draft', key: group })].join('\n'));
  }
  return null;
}

async function addMediaToListing(msg, t, chat) {
  const found = await loadTarget(t);
  if (!found) return send(chat, 'That listing is gone.');

  const att = attachment(msg);
  if (!att || att.kind === 'unsupported') return send(chat, 'I can take photographs and videos.');
  if (att.size > MAX_BYTES) {
    return send(chat, `That ${att.kind} is ${humanSize(att.size)} — over Telegram's 20 MB bot limit.`);
  }

  const existing = await listTree(`${IMAGES}/${t.key}/`);
  const n = Math.max(0, ...existing.map((f) => numberIn(f.path)),
                        ...(found.listing.images || []).map(numberIn)) + 1;

  const file = await download(att.file_id);
  const sha = createHash('sha1').update(Buffer.from(file.base64, 'base64')).digest('hex');
  const dest = `${IMAGES}/${t.key}/${mediaName(n, att.ext, sha)}`;
  if (existing.some((f) => f.path === dest)) return null;
  const { listing, catalogue } = found;
  if (att.kind === 'video') listing.video = dest;
  else listing.images = [...(listing.images || []), dest];

  await commitChanges({
    message: `Add ${att.kind} to ${listing.name}, ref ${listing.reference}`,
    changes: [{ path: dest, base64: file.base64 }, { path: LISTINGS_PATH, content: serialise(catalogue) }],
  });
  return send(chat,
    [`Added. ${listing.images?.length || 0} photograph(s)${listing.video ? ' and a video' : ''}.`,
     'Send more as a reply to this message, or /edit when you are done.', '', marker(t)].join('\n'));
}

/* Media staged as a draft, moved onto a listing that already exists.
 *
 * Photographing a watch and then saying which one it is, is the order people
 * actually work in. Requiring /edit REF first — decide, then shoot — is
 * backwards, so a reply that is just a reference means "add this to that". */
async function attachStagedTo(group, chat, needle) {
  const catalogue = await load();
  const p = find(catalogue, needle);
  if (!p) {
    return send(chat,
      [`No listing matches <code>${esc(needle)}</code>.`, '',
       'Send /list to see the references, or /new for a template if this is a new watch.',
       '', marker({ kind: 'draft', key: group })].join('\n'));
  }

  const staged = await listTree(`${mediaDir(group)}/`);
  if (!staged.length) {
    return send(chat, `Nothing is staged to add. Send the photographs, then reply with ${esc(p.reference)}.`);
  }

  if (isPlaceholder(p)) {
    return send(chat,
      [`<b>${esc(p.name)}, ref ${esc(p.reference)} is a placeholder</b>, not your stock —`,
       'one of the example listings the site ships with.', '',
       'Putting your photographs on it would show them against a watch you are',
       'not selling. Send the reference of your own listing instead, or the full',
       'details to create one (/new for a template).', '',
       `Your media is still saved as draft <code>${esc(group)}</code>.`, '',
       marker({ kind: 'draft', key: group })].join('\n'));
  }

  /* Number on from the highest that exists, not from how many exist: a gap in
     the sequence — 01 and 03, after one was removed — would otherwise make the
     next upload overwrite 03. */
  const onDisk = (await listTree(`${IMAGES}/${p.id}/`)).filter((f) => isPhoto(f.path));
  let n = Math.max(0, ...onDisk.map((f) => numberIn(f.path)),
                      ...(p.images || []).map(numberIn));
  const changes = [];
  let photos = 0, video = false;

  for (const f of staged) {
    if (isVideo(f.path)) {
      const dest = `${IMAGES}/${p.id}/${mediaName(0, 'mp4', f.sha)}`;
      changes.push({ path: dest, sha: f.sha });
      p.video = dest;
      video = true;
    } else {
      n += 1;
      const dest = `${IMAGES}/${p.id}/${mediaName(n, 'jpg', f.sha)}`;
      changes.push({ path: dest, sha: f.sha });
      p.images = [...(p.images || []), dest];
      photos += 1;
    }
    changes.push({ path: f.path, delete: true });
  }

  changes.push({ path: LISTINGS_PATH, content: serialise(catalogue) });
  if (await readFile(draftPath(group))) changes.push({ path: draftPath(group), delete: true });
  await clearPointer(group, changes);

  await commitChanges({ message: `Add media to ${p.name}, ref ${p.reference}`, changes });

  const what = [photos ? `${photos} photograph(s)` : null, video ? 'a video' : null]
    .filter(Boolean).join(' and ');
  return showEditor(chat, { kind: 'listing', key: p.id }, null,
    `<b>Added ${what}</b> to ${esc(p.name)}, ref ${esc(p.reference)}.`);
}

/* ---------- the draft preview ---------- */

function summary(l) {
  return [
    `<b>${esc(l.brand)} ${esc(l.name)}</b>`,
    `Ref ${esc(l.reference)} · ${l.year} · ${esc(l.condition)}`,
    `${esc(l.set)} · <b>${money(l.price)}</b>`,
    l.tagline ? `<i>${esc(l.tagline)}</i>` : '<i>no tagline</i>',
    l.description ? esc(l.description) : '<i>no description</i>',
    `Size ${l.size ? l.size + ' mm' : '—'} · Movement ${esc(l.movement || '—')} · ` +
      `${Object.keys(l.specs || {}).length} spec row(s)`,
  ].join('\n');
}

function fieldKeyboard(extra = []) {
  const rows = [];
  for (let i = 0; i < FIELD_ORDER.length; i += 3) {
    rows.push(FIELD_ORDER.slice(i, i + 3)
      .map((k) => ({ text: FIELDS[k].label, callback_data: `f:${k}` })));
  }
  rows.push([{ text: '🖼 Media', callback_data: 'f:__media' },
             { text: '📋 Specs', callback_data: 'f:__specs' }]);
  if (extra.length) rows.push(extra);
  return buttons(rows);
}

async function preview(chat, group, messageId = null) {
  const raw = await readFile(draftPath(group));
  if (!raw) return send(chat, 'That draft is gone.');
  const { listing } = JSON.parse(raw);
  const media = await listTree(`${mediaDir(group)}/`);
  const t = { kind: 'draft', key: group };

  const text = [
    summary(listing), '',
    `${media.filter((f) => isPhoto(f.path)).length} photograph(s), ` +
      `${media.filter((f) => isVideo(f.path)).length} video(s)`,
    '', 'Tap a field to change it before publishing.', '', marker(t),
  ].join('\n');

  const kb = fieldKeyboard([
    { text: '✅ Publish', callback_data: 'pub:' },
    { text: '🗑 Discard', callback_data: 'dis:' },
  ]);
  return messageId ? edit(chat, messageId, text, kb) : send(chat, text, kb);
}

/* ---------- editing ---------- */

async function showEditor(chat, t, messageId = null, note = '') {
  const found = await loadTarget(t);
  if (!found) return send(chat, 'That listing is gone.');
  if (t.kind === 'draft') return preview(chat, t.key, messageId);

  const media = await listTree(`${IMAGES}/${t.key}/`);
  const text = [
    note, note ? '' : null,
    summary(found.listing), '',
    `${media.filter((f) => isPhoto(f.path)).length} photograph(s), ` +
      `${media.filter((f) => isVideo(f.path)).length} video(s)`,
    '', 'Tap a field to change it.', '', marker(t),
  ].filter((x) => x !== null).join('\n');

  const kb = fieldKeyboard([{ text: '💷 Sold — remove from site', callback_data: 'sold:' }]);
  return messageId ? edit(chat, messageId, text, kb) : send(chat, text, kb);
}

async function askForField(chat, messageId, t, key) {
  const found = await loadTarget(t);
  if (!found) return edit(chat, messageId, 'That listing is gone.');
  const current = found.listing[key];

  if (key === '__media') {
    return edit(chat, messageId,
      ['<b>Media</b>', '',
       'Send photographs or a video as a reply to this message and they are added.',
       'Telegram will not pass a bot anything over 20 MB.', '',
       marker(t)].join('\n'),
      buttons([[{ text: '↩ Back', callback_data: 'back:' }]]));
  }

  if (key === '__specs') {
    const rows = Object.entries(found.listing.specs || {});
    return edit(chat, messageId,
      ['<b>Specification</b>', '',
       rows.length ? rows.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('\n') : '<i>none</i>', '',
       'Reply to this message with the full set of rows to replace them:', '',
       '<pre>Case material: Oystersteel\nMovement: calibre 3285\nWater resistance: 100 m</pre>', '',
       marker(t), '#field-__specs'].join('\n'),
      buttons([[{ text: '↩ Back', callback_data: 'back:' }]]));
  }

  const f = FIELDS[key];
  if (f.choices) {
    const rows = [];
    for (let i = 0; i < f.choices.length; i += 2) {
      rows.push(f.choices.slice(i, i + 2).map((c, j) => ({
        text: (c === current ? '• ' : '') + c, callback_data: `v:${key}:${i + j}`,
      })));
    }
    rows.push([{ text: '↩ Back', callback_data: 'back:' }]);
    return edit(chat, messageId,
      [`<b>${f.label}</b>`, `Currently: ${esc(current ?? '—')}`, '', marker(t)].join('\n'),
      buttons(rows));
  }

  return edit(chat, messageId,
    [`<b>${f.label}</b>`,
     `Currently: ${current ? esc(current) : '<i>empty</i>'}`, '',
     `Reply to this message with the new ${f.label.toLowerCase()}.`, '',
     marker(t), `#field-${key}`].join('\n'),
    buttons([[{ text: '↩ Back', callback_data: 'back:' }]]));
}

/* Applying a change. Brand and reference decide the id and the image paths,
 * so changing either renames the listing and moves its media in the same
 * commit — otherwise the catalogue would point at files that had moved. */
async function applyField(t, key, value) {
  if (t.kind === 'draft') {
    const raw = await readFile(draftPath(t.key));
    if (!raw) return { error: 'That draft is gone.' };
    const draft = JSON.parse(raw);
    if (key === '__specs') draft.listing.specs = value; else draft.listing[key] = value;
    await commitChanges({
      message: `Draft ${t.key}: set ${key}`,
      changes: [{ path: draftPath(t.key), content: JSON.stringify(draft, null, 2) }],
      skipDeploy: true,
    });
    return { listing: draft.listing, target: t };
  }

  const catalogue = await load();
  const listing = catalogue.products.find((p) => p.id === t.key);
  if (!listing) return { error: 'That listing is gone.' };

  if (key === '__specs') listing.specs = value; else listing[key] = value;

  const changes = [];
  let target = t;

  if (key === 'brand' || key === 'reference') {
    const collection = key === 'brand' ? ensureCollection(catalogue, value) : listing.collection;
    listing.collection = collection;
    const newId = listingId(collection, listing.reference);
    if (newId !== listing.id) {
      if (catalogue.products.some((p) => p.id === newId)) {
        return { error: `That would collide with the existing listing <code>${esc(newId)}</code>.` };
      }
      const media = await listTree(`${IMAGES}/${listing.id}/`);
      const remap = {};
      media.forEach((f) => {
        const dest = f.path.replace(`${IMAGES}/${listing.id}/`, `${IMAGES}/${newId}/`);
        changes.push({ path: dest, sha: f.sha }, { path: f.path, delete: true });
        remap[f.path] = dest;
      });
      listing.images = (listing.images || []).map((p) => remap[p] || p);
      if (listing.video) listing.video = remap[listing.video] || listing.video;
      listing.id = newId;
      target = { kind: 'listing', key: newId };
    }
  }

  changes.push({ path: LISTINGS_PATH, content: serialise(catalogue) });
  await commitChanges({ message: `Edit ${listing.name} ref ${listing.reference}: ${key}`, changes });
  return { listing, target };
}

/* A message that is just a reference. Two useful readings, and which one is
 * meant is never ambiguous: with media waiting, add it to that watch;
 * without, open that watch for editing. */
async function onBareReference(chat, needle) {
  const catalogue = await load();
  const p = find(catalogue, needle);
  if (!p) return false;

  const raw = await readFile(LAST);
  const group = raw ? (JSON.parse(raw).group || null) : null;
  const staged = group ? await listTree(`${mediaDir(group)}/`) : [];

  if (staged.length) await attachStagedTo(group, chat, needle);
  else await showEditor(chat, { kind: 'listing', key: p.id });
  return true;
}

const looksLikeReference = (s) =>
  !!s && !/[\n|:]/.test(s) && s.length <= 40 && /[A-Za-z0-9]/.test(s);

/* A listing shipped with the site rather than added by you. The seeded
 * catalogue is real references with published specifications, kept only so
 * the shop has something to lay out — putting a photograph of YOUR watch on
 * one is a lie about what is for sale, which is the whole thing this site is
 * built not to do. */
const isPlaceholder = (p) => !p.listed;

/* An example reference for a prompt, taken from stock actually listed, so the
 * bot never suggests typing the name of a placeholder. */
function exampleRef(catalogue) {
  const real = catalogue.products.filter((p) => !isPlaceholder(p));
  return real.length ? real[0].reference : 'the reference from /list';
}

/* A reply to one of the bot's prompts. */
async function onReply(msg) {
  const chat = msg.chat.id;
  const prompt = msg.reply_to_message.text || '';
  const t = targetOf(prompt);
  if (!t) return null;

  const fieldMatch = /#field-([A-Za-z_]+)/.exec(prompt);

  /* No field named: this is a caption for a draft that had none. */
  if (!fieldMatch) {
    if (t.kind !== 'draft') return showEditor(chat, t);

    /* A one-word reply is a reference, not a caption — they are adding this
       media to a watch that is already listed. */
    const bare = String(msg.text).trim();
    if (looksLikeReference(bare)) return attachStagedTo(t.key, chat, bare);

    const parsed = parseCaption(msg.text);
    if (!parsed.ok) {
      return send(chat, ['<b>Still not quite right.</b>', '',
        ...parsed.errors.map((e) => `• ${esc(e)}`), '', marker(t)].join('\n'));
    }
    await commitChanges({
      message: `Draft ${t.key}: details`,
      changes: [{ path: draftPath(t.key), content: JSON.stringify({ group: t.key, chat, listing: parsed.listing }, null, 2) }],
      skipDeploy: true,
    });
    return preview(chat, t.key);
  }

  const key = fieldMatch[1];
  let value;
  if (key === '__specs') {
    value = {};
    for (const row of String(msg.text).split(/\r?\n/)) {
      const at = row.indexOf(':');
      if (at > 0) value[row.slice(0, at).trim()] = row.slice(at + 1).trim();
    }
  } else {
    const r = parseField(key, msg.text);
    if (r.error) return send(chat, `${esc(r.error)}.\n\n${marker(t)}\n#field-${key}`);
    value = r.value;
  }

  const res = await applyField(t, key, value);
  if (res.error) return send(chat, res.error);
  return showEditor(chat, res.target, null, '<b>Saved.</b>');
}

/* ---------- publishing ---------- */

async function publish(group, chat, messageId) {
  const raw = await readFile(draftPath(group));
  if (!raw) return edit(chat, messageId, 'That draft is gone — already published or discarded.');
  const { listing } = JSON.parse(raw);
  const catalogue = await load();

  const collection = ensureCollection(catalogue, listing.brand);
  const id = listingId(collection, listing.reference);
  if (catalogue.products.some((p) => p.id === id)) {
    return edit(chat, messageId,
      `A listing with the id <code>${esc(id)}</code> already exists. Mark the old one sold first.`);
  }

  /* Move the draft's media by reusing its blob hashes — nothing is downloaded
     or uploaded a second time. */
  const staged = await listTree(`${mediaDir(group)}/`);
  const photos = staged.filter((f) => isPhoto(f.path));
  const videos = staged.filter((f) => isVideo(f.path));
  const changes = [];
  const images = [];
  let video = null;

  photos.forEach((f, i) => {
    const dest = `${IMAGES}/${id}/${mediaName(i + 1, 'jpg', f.sha)}`;
    changes.push({ path: dest, sha: f.sha }, { path: f.path, delete: true });
    images.push(dest);
  });
  videos.forEach((f, i) => {
    if (i === 0) {
      video = `${IMAGES}/${id}/${mediaName(0, 'mp4', f.sha)}`;
      changes.push({ path: video, sha: f.sha });
    }
    changes.push({ path: f.path, delete: true });
  });

  catalogue.products.unshift({
    id, collection,
    name: listing.name, reference: listing.reference, year: listing.year,
    condition: listing.condition, set: listing.set, price: listing.price,
    tagline: listing.tagline, description: listing.description,
    images, video, specs: listing.specs, size: listing.size, movement: listing.movement,
    listed: new Date().toISOString().slice(0, 10),
  });

  changes.push({ path: LISTINGS_PATH, content: serialise(catalogue) });
  changes.push({ path: draftPath(group), delete: true });
  await clearPointer(group, changes);

  await commitChanges({ message: `List ${listing.brand} ${listing.name}, ref ${listing.reference}`, changes });

  return edit(chat, messageId,
    [`<b>Published.</b> ${esc(listing.brand)} ${esc(listing.name)}, ref ${esc(listing.reference)}.`,
     `${images.length} photograph(s)${video ? ' and a video' : ''}. Live in under a minute.`,
     videos.length > 1 ? `<i>Only the first video was used.</i>` : null,
     '', 'Change anything with /edit ' + esc(listing.reference)].filter(Boolean).join('\n'));
}

async function discard(group, chat, messageId) {
  const media = await listTree(`${mediaDir(group)}/`);
  const changes = media.map((f) => ({ path: f.path, delete: true }));
  if (await readFile(draftPath(group))) changes.push({ path: draftPath(group), delete: true });
  await clearPointer(group, changes);
  if (changes.length) await commitChanges({ message: `Discard draft ${group}`, changes, skipDeploy: true });
  return edit(chat, messageId, 'Discarded. Nothing was published.');
}

async function markSold(id, chat, messageId) {
  const catalogue = await load();
  const i = catalogue.products.findIndex((p) => p.id === id);
  if (i < 0) return edit(chat, messageId, 'That listing is already gone.');
  const [p] = catalogue.products.splice(i, 1);

  const media = await listTree(`${IMAGES}/${id}/`);
  const changes = media.map((f) => ({ path: f.path, delete: true }));
  changes.push({ path: LISTINGS_PATH, content: serialise(catalogue) });
  await commitChanges({ message: `Sold: ${p.name}, ref ${p.reference}`, changes });
  return edit(chat, messageId, `<b>Sold.</b> ${esc(p.name)}, ref ${esc(p.reference)} is off the site.`);
}

/* ---------- commands ---------- */

const find = (catalogue, needle) => {
  const n = String(needle).trim().toLowerCase();
  return catalogue.products.find((p) => p.id.toLowerCase() === n || String(p.reference).toLowerCase() === n);
};

async function onCommand(msg) {
  const chat = msg.chat.id;
  const [cmd, ...rest] = msg.text.trim().split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd.split('@')[0].toLowerCase()) {
    case '/start':
    case '/help':
      await publishCommands().catch(() => {});
      return send(chat, USAGE);

    case '/new':
      return send(chat,
        ['Copy this, fill it in, and send it as the caption on your photographs.', '',
         `<pre>${esc(TEMPLATE)}</pre>`].join('\n'));

    case '/drafts': {
      /* Media staged and never published leaves files behind. Without a way
         to see them they accumulate silently, and a forgotten video is the
         most expensive thing in the repository. */
      const staged = await listTree(`${MEDIA}/`);
      const groups = [...new Set(staged.map((f) => f.path.split('/')[2]))];
      if (!groups.length) return send(chat, 'No drafts waiting.');

      const rows = [];
      const lines = [];
      for (const g of groups) {
        const files = staged.filter((f) => f.path.startsWith(`${mediaDir(g)}/`));
        const raw = await readFile(draftPath(g));
        const l = raw ? JSON.parse(raw).listing : null;
        lines.push(`<b>${esc(g)}</b> — ${files.filter((f) => isPhoto(f.path)).length} photo(s), ` +
                   `${files.filter((f) => isVideo(f.path)).length} video(s)` +
                   (l ? `\n   ${esc(l.brand)} ${esc(l.name)}, ref ${esc(l.reference)}` : '\n   <i>no details yet</i>'));
        rows.push([{ text: `🗑 Discard ${g}`, callback_data: `dis:${g}` }]);
      }
      return send(chat,
        [`<b>${groups.length} draft(s) waiting</b>`, '', ...lines, '',
         'Send a reference to attach one to a listing, or discard it.'].join('\n'),
        buttons(rows));
    }

    case '/list': {
      const c = await load();
      if (!c.products.length) return send(chat, 'Nothing listed yet.');
      const rows = c.products.map((p) =>
        `<b>${money(p.price)}</b> — ${esc(p.name)}, ref ${esc(p.reference)}\n` +
        `   ${p.year} · ${esc(p.condition)} · ${(p.images || []).length} photo(s)` +
        `${p.video ? ' + video' : ''} · /edit ${esc(p.reference)}` +
        `${isPlaceholder(p) ? '\n   <i>placeholder — not your stock</i>' : ''}`);
      return send(chat, [`<b>${c.products.length} in stock</b>`, '', ...rows].join('\n'));
    }

    case '/edit': {
      const c = await load();
      if (!arg) return send(chat, 'Which one? <code>/edit 126710BLNR</code> — or /list to see them.');
      const p = find(c, arg);
      if (!p) return send(chat, `No listing matches <code>${esc(arg)}</code>. Try /list.`);
      return showEditor(chat, { kind: 'listing', key: p.id });
    }

    case '/price': {
      const [ref, ...amt] = rest;
      const r = parseField('price', amt.join(''));
      if (!ref || r.error) return send(chat, 'Usage: <code>/price 126710BLNR 13900</code>');
      const c = await load();
      const p = find(c, ref);
      if (!p) return send(chat, `No listing matches <code>${esc(ref)}</code>. Try /list.`);
      const was = p.price;
      const res = await applyField({ kind: 'listing', key: p.id }, 'price', r.value);
      if (res.error) return send(chat, res.error);
      return send(chat, `${esc(p.name)} ref ${esc(p.reference)}: ${money(was)} → <b>${money(r.value)}</b>.`);
    }

    case '/sold': {
      if (!arg) return send(chat, 'Usage: <code>/sold 126710BLNR</code>');
      const c = await load();
      const p = find(c, arg);
      if (!p) return send(chat, `No listing matches <code>${esc(arg)}</code>. Try /list.`);
      return send(chat,
        [`Mark <b>${esc(p.name)}</b>, ref ${esc(p.reference)}, ${money(p.price)} as sold?`, '',
         marker({ kind: 'listing', key: p.id })].join('\n'),
        buttons([[{ text: '✅ Sold', callback_data: 'sold:' },
                  { text: 'Cancel', callback_data: 'cancel:' }]]));
    }

    default:
      return send(chat, `I do not know <code>${esc(cmd)}</code>.\n\n${USAGE}`);
  }
}

/* ---------- entry point ---------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only');
  if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send('no');
  }

  const update = req.body || {};
  const from = update.message?.from || update.callback_query?.from;

  /* Answer 200 to everything else. Telegram retries a non-200, and a stranger
     poking at the endpoint should learn nothing from the response. */
  if (!from || !allowed(from.id)) return res.status(200).send('ok');

  try {
    if (update.callback_query) {
      const q = update.callback_query;
      const [action, a, b] = String(q.data || '').split(':');
      const chat = q.message.chat.id;
      const mid = q.message.message_id;
      const t = targetOf(q.message.text);
      await answer(q.id);

      const key = a || t?.key;

      if (action === 'f' && t) await askForField(chat, mid, t, a);
      else if (action === 'back' && t) await showEditor(chat, t, mid);
      else if (action === 'v' && t) {
        const value = FIELDS[a].choices[Number(b)];
        const r = await applyField(t, a, value);
        if (r.error) await edit(chat, mid, r.error);
        else await showEditor(chat, r.target, mid, `<b>${FIELDS[a].label} set to ${esc(value)}.</b>`);
      } else if (action === 'pub' && key) await publish(key, chat, mid);
      else if (action === 'dis' && key) await discard(key, chat, mid);
      else if (action === 'sold' && key) await markSold(key, chat, mid);
      else if (action === 'cancel') await edit(chat, mid, 'Cancelled.');
    } else if (update.message?.photo || update.message?.video || update.message?.document) {
      await onMedia(update.message);
    } else if (update.message?.reply_to_message?.from?.is_bot && update.message?.text) {
      await onReply(update.message);
    } else if (update.message?.text?.startsWith('/')) {
      await onCommand(update.message);
    } else if (update.message?.text) {
      const chat = update.message.chat.id;
      const body = update.message.text.trim();

      /* Typed on its own, not as a reply: still a reference if it names one. */
      if (looksLikeReference(body) && await onBareReference(chat, body)) {
        return res.status(200).send('ok');
      }

      /* Loose text that parses as a listing is treated as one — people paste
         the template back without re-attaching it to a photograph. */
      const parsed = parseCaption(update.message.text);
      if (parsed.ok) {
        const group = `m${update.message.message_id}`;
        await commitChanges({
          message: `Draft ${group}: details`,
          changes: [{ path: draftPath(group), content: JSON.stringify({ group, chat: update.message.chat.id, listing: parsed.listing }, null, 2) }],
          skipDeploy: true,
        });
        await preview(update.message.chat.id, group);
      } else {
        await send(update.message.chat.id, USAGE);
      }
    }
  } catch (e) {
    console.error(e);
    const chat = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (chat) await send(chat, `<b>That failed.</b>\n<code>${esc(e.message).slice(0, 500)}</code>`).catch(() => {});
  }

  return res.status(200).send('ok');
}
