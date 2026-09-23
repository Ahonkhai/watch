/* The listing bot's webhook.
 *
 * There is no database. A draft accumulates in the repository under .bot/,
 * committed with [skip ci] so that building a listing over several photos
 * costs no deploys, and publishing writes the listing and its photographs in
 * a single commit that does deploy. The repository is the state, which is why
 * this function can be stateless and still survive a cold start mid-album. */

import { commitChanges, listTree, readFile } from './_lib/github.js';
import { send, edit, answer, download, buttons, esc } from './_lib/tg.js';
import { load, serialise, listingId, ensureCollection, money, LISTINGS_PATH } from './_lib/catalogue.js';
import { parseCaption, USAGE } from './_lib/parse.js';

export const config = { maxDuration: 60 };

const DRAFTS = '.bot/drafts';
const MEDIA  = '.bot/media';
const IMAGES = 'assets/img';

const draftPath = (g) => `${DRAFTS}/${g}.json`;
const mediaDir  = (g) => `${MEDIA}/${g}`;

/* ---------- authorisation ---------- */

function allowed(userId) {
  const list = (process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return list.length > 0 && list.includes(String(userId));
}

/* ---------- photographs ---------- */

async function onPhoto(msg) {
  const group = msg.media_group_id || `m${msg.message_id}`;
  const photo = msg.photo[msg.photo.length - 1];        // largest rendition
  const chat = msg.chat.id;

  const existing = await listTree(`${mediaDir(group)}/`);
  const already = existing.some((f) => f.path.endsWith(`/${photo.file_unique_id}.jpg`));

  const changes = [];
  if (!already) {
    const file = await download(photo.file_id);
    changes.push({ path: `${mediaDir(group)}/${photo.file_unique_id}.jpg`, base64: file.base64 });
  }

  const parsed = msg.caption ? parseCaption(msg.caption) : null;

  if (parsed?.ok) {
    changes.push({
      path: draftPath(group),
      content: JSON.stringify({ group, chat, listing: parsed.listing }, null, 2),
    });
  }

  if (changes.length) {
    await commitChanges({
      message: `Draft ${group}: photograph`,
      changes,
      skipDeploy: true,
    });
  }

  if (parsed?.ok) return preview(chat, group, parsed.listing, existing.length + 1);

  if (parsed && !parsed.ok) {
    return send(chat,
      ['<b>I could not read that caption.</b>', '',
       ...parsed.errors.map((e) => `• ${esc(e)}`), '',
       'The photographs are saved. Reply to this message with a corrected caption and I will try again.',
       '', `#draft-${group}`].join('\n'));
  }

  /* An album member with no caption. Only the first one speaks, so a
   * five-photo album does not produce five identical nudges. */
  const draft = await readFile(draftPath(group));
  if (!draft && existing.length === 0) {
    return send(chat,
      ['Photographs saved, but there was no caption so I do not know what this watch is.', '',
       'Reply to this message with the caption and I will build the listing.', '',
       `#draft-${group}`].join('\n'));
  }
  return null;
}

/* A caption sent afterwards, as a reply to one of the bot's own prompts. */
async function onCaptionReply(msg) {
  const marker = /#draft-([A-Za-z0-9_-]+)/.exec(msg.reply_to_message.text || '');
  if (!marker) return null;
  const group = marker[1];
  const chat = msg.chat.id;

  const parsed = parseCaption(msg.text);
  if (!parsed.ok) {
    return send(chat,
      ['<b>Still not quite right.</b>', '',
       ...parsed.errors.map((e) => `• ${esc(e)}`), '', `#draft-${group}`].join('\n'));
  }

  const photos = await listTree(`${mediaDir(group)}/`);
  await commitChanges({
    message: `Draft ${group}: caption`,
    changes: [{ path: draftPath(group), content: JSON.stringify({ group, chat, listing: parsed.listing }, null, 2) }],
    skipDeploy: true,
  });
  return preview(chat, group, parsed.listing, photos.length);
}

function preview(chat, group, l, photoCount) {
  const lines = [
    `<b>${esc(l.brand)} ${esc(l.name)}</b>`,
    `Ref. ${esc(l.reference)} · ${l.year} · ${esc(l.condition)}`,
    `${esc(l.set)} · <b>${money(l.price)}</b>`,
    '',
    l.tagline ? `<i>${esc(l.tagline)}</i>` : '<i>(no tagline)</i>',
    '',
    l.description ? esc(l.description) : '(no description)',
    '',
    `Photographs: ${photoCount}`,
    `Size: ${l.size ? l.size + ' mm' : '—'} · Movement: ${esc(l.movement || '—')}`,
    `Specification rows: ${Object.keys(l.specs).length}`,
    '',
    'Send more photographs to this album before publishing if you want them included.',
  ];
  return send(chat, lines.join('\n'), buttons([[
    { text: '✅ Publish', callback_data: `pub:${group}` },
    { text: '🗑 Discard', callback_data: `dis:${group}` },
  ]]));
}

/* ---------- publishing ---------- */

async function publish(group, chat, messageId) {
  const raw = await readFile(draftPath(group));
  if (!raw) {
    return edit(chat, messageId, 'That draft is gone — it was already published or discarded.');
  }
  const { listing } = JSON.parse(raw);
  const catalogue = await load();

  const collection = ensureCollection(catalogue, listing.brand);
  const id = listingId(collection, listing.reference);

  if (catalogue.products.some((p) => p.id === id)) {
    return edit(chat, messageId,
      `A listing with the id <code>${esc(id)}</code> already exists. Mark the old one sold first, or use a distinguishing reference.`);
  }

  /* Move the draft's photographs into the site's image directory by reusing
   * their blob hashes — nothing is downloaded or uploaded a second time. */
  const photos = await listTree(`${mediaDir(group)}/`);
  const images = [];
  const changes = [];
  photos.forEach((f, i) => {
    const dest = `${IMAGES}/${id}/${String(i + 1).padStart(2, '0')}.jpg`;
    changes.push({ path: dest, sha: f.sha });
    changes.push({ path: f.path, delete: true });
    images.push(dest);
  });

  catalogue.products.unshift({
    id,
    collection,
    name: listing.name,
    reference: listing.reference,
    year: listing.year,
    condition: listing.condition,
    set: listing.set,
    price: listing.price,
    tagline: listing.tagline,
    description: listing.description,
    images,
    specs: listing.specs,
    size: listing.size,
    movement: listing.movement,
    listed: new Date().toISOString().slice(0, 10),
  });

  changes.push({ path: LISTINGS_PATH, content: serialise(catalogue) });
  changes.push({ path: draftPath(group), delete: true });

  await commitChanges({
    message: `List ${listing.brand} ${listing.name}, ref ${listing.reference}`,
    changes,
  });

  return edit(chat, messageId,
    [`<b>Published.</b> ${esc(listing.brand)} ${esc(listing.name)}, ref ${esc(listing.reference)}.`,
     `${images.length} photograph${images.length === 1 ? '' : 's'}. Live in under a minute.`,
     `<code>${esc(id)}</code>`].join('\n'));
}

async function discard(group, chat, messageId) {
  const photos = await listTree(`${mediaDir(group)}/`);
  const changes = photos.map((f) => ({ path: f.path, delete: true }));
  if (await readFile(draftPath(group))) changes.push({ path: draftPath(group), delete: true });
  if (changes.length) {
    await commitChanges({ message: `Discard draft ${group}`, changes, skipDeploy: true });
  }
  return edit(chat, messageId, 'Discarded. Nothing was published.');
}

/* ---------- commands ---------- */

function find(catalogue, needle) {
  const n = String(needle).trim().toLowerCase();
  return catalogue.products.find((p) =>
    p.id.toLowerCase() === n || String(p.reference).toLowerCase() === n);
}

async function onCommand(msg) {
  const chat = msg.chat.id;
  const [cmd, ...rest] = msg.text.trim().split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd.split('@')[0].toLowerCase()) {
    case '/start':
    case '/help':
    case '/add':
      return send(chat, USAGE);

    case '/list': {
      const c = await load();
      if (!c.products.length) return send(chat, 'Nothing listed yet.');
      const rows = c.products.map((p) =>
        `<b>${money(p.price)}</b> — ${esc(p.name)}, ref ${esc(p.reference)}\n` +
        `   ${p.year} · ${esc(p.condition)} · ${p.images.length} photo${p.images.length === 1 ? '' : 's'} · <code>${esc(p.id)}</code>`);
      return send(chat, [`<b>${c.products.length} in stock</b>`, '', ...rows].join('\n'));
    }

    case '/price': {
      const [ref, ...amt] = rest;
      const price = Number(String(amt.join('')).replace(/[^0-9.]/g, ''));
      if (!ref || !price) return send(chat, 'Usage: <code>/price 126610LN 13900</code>');
      const c = await load();
      const p = find(c, ref);
      if (!p) return send(chat, `No listing matches <code>${esc(ref)}</code>. Try /list.`);
      const was = p.price;
      p.price = price;
      await commitChanges({
        message: `Reprice ${p.name} ref ${p.reference}: ${was} -> ${price}`,
        changes: [{ path: LISTINGS_PATH, content: serialise(c) }],
      });
      return send(chat, `${esc(p.name)} ref ${esc(p.reference)}: ${money(was)} → <b>${money(price)}</b>.`);
    }

    case '/sold': {
      if (!arg) return send(chat, 'Usage: <code>/sold 126610LN</code>');
      const c = await load();
      const p = find(c, arg);
      if (!p) return send(chat, `No listing matches <code>${esc(arg)}</code>. Try /list.`);
      return send(chat,
        `Mark <b>${esc(p.name)}</b>, ref ${esc(p.reference)}, ${money(p.price)} as sold and remove it from the site?`,
        buttons([[
          { text: '✅ Sold', callback_data: `sold:${p.id}` },
          { text: 'Cancel', callback_data: 'cancel:' },
        ]]));
    }

    default:
      return send(chat, `I do not know <code>${esc(cmd)}</code>.\n\n${USAGE}`);
  }
}

async function markSold(id, chat, messageId) {
  const c = await load();
  const i = c.products.findIndex((p) => p.id === id);
  if (i < 0) return edit(chat, messageId, 'That listing is already gone.');
  const [p] = c.products.splice(i, 1);

  /* The photographs go with it. They stay in git history if you ever need
   * them back, but a sold watch should not keep serving images from the site. */
  const photos = await listTree(`${IMAGES}/${id}/`);
  const changes = photos.map((f) => ({ path: f.path, delete: true }));
  changes.push({ path: LISTINGS_PATH, content: serialise(c) });

  await commitChanges({ message: `Sold: ${p.name}, ref ${p.reference}`, changes });
  return edit(chat, messageId, `<b>Sold.</b> ${esc(p.name)}, ref ${esc(p.reference)} is off the site.`);
}

/* ---------- entry point ---------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send('no');
  }

  const update = req.body || {};
  const from = update.message?.from || update.callback_query?.from;

  /* Answer 200 to anything else. Telegram retries a non-200, and a stranger
   * poking at the endpoint should learn nothing from the response. */
  if (!from || !allowed(from.id)) return res.status(200).send('ok');

  try {
    if (update.callback_query) {
      const q = update.callback_query;
      const [action, value] = String(q.data || '').split(':');
      const chat = q.message.chat.id;
      const mid = q.message.message_id;
      await answer(q.id);
      if (action === 'pub') await publish(value, chat, mid);
      else if (action === 'dis') await discard(value, chat, mid);
      else if (action === 'sold') await markSold(value, chat, mid);
      else if (action === 'cancel') await edit(chat, mid, 'Cancelled.');
    } else if (update.message?.photo) {
      await onPhoto(update.message);
    } else if (update.message?.reply_to_message?.from?.is_bot && update.message?.text) {
      await onCaptionReply(update.message);
    } else if (update.message?.text?.startsWith('/')) {
      await onCommand(update.message);
    } else if (update.message?.text) {
      await send(update.message.chat.id, USAGE);
    }
  } catch (e) {
    console.error(e);
    const chat = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (chat) await send(chat, `<b>That failed.</b>\n<code>${esc(e.message).slice(0, 500)}</code>`).catch(() => {});
  }

  return res.status(200).send('ok');
}
