/* A fake GitHub and a fake Telegram, so the bot's whole flow can be exercised
 * without a deploy. The GitHub side is a real little content-addressed store:
 * blobs are sha1 of their content, a tree is applied only when the ref moves,
 * so a conflict retry cannot double-apply. */
import crypto from 'node:crypto';

const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');

export function makeWorld({ files = {}, allowed = '42' } = {}) {
  const world = {
    files: new Map(Object.entries(files).map(([p, c]) => [p, Buffer.from(c)])),
    blobs: new Map(),
    trees: new Map(),
    commits: new Map(),
    head: 'commit0',
    sent: [],          // Telegram sendMessage
    edited: [],        // Telegram editMessageText
    log: [],           // both, in the order they happened
    commitLog: [],
    conflictOnce: false,
  };
  world.commits.set('commit0', { tree: 'tree0' });
  world.trees.set('tree0', new Map(world.files));

  process.env.TELEGRAM_BOT_TOKEN = 'TESTTOKEN';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'shh';
  process.env.TELEGRAM_ALLOWED_IDS = allowed;
  process.env.GITHUB_TOKEN = 'ghtoken';
  process.env.GITHUB_REPO = 'Ahonkhai/watch';
  process.env.GITHUB_BRANCH = 'main';

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  global.fetch = async (url, opts = {}) => {
    const u = new URL(String(url));
    const p = u.pathname;
    const body = opts.body ? JSON.parse(opts.body) : null;

    /* ---- Telegram ---- */
    if (u.hostname === 'api.telegram.org') {
      if (p.includes('/file/bot')) {
        return new Response(Buffer.from('JPEGBYTES:' + p.split('/').pop()));
      }
      const method = p.split('/').pop();
      if (method === 'sendMessage') {
        world.sent.push(body); world.log.push(body);
        return json({ ok: true, result: { message_id: 900 + world.sent.length, chat: { id: body.chat_id } } });
      }
      if (method === 'editMessageText') {
        world.edited.push(body); world.log.push(body);
        return json({ ok: true, result: { message_id: body.message_id, chat: { id: body.chat_id }, text: body.text } });
      }
      if (method === 'setMyCommands') { world.commands = body.commands; return json({ ok: true, result: true }); }
      if (method === 'answerCallbackQuery') return json({ ok: true, result: true });
      if (method === 'getFile') return json({ ok: true, result: { file_path: `photos/${body.file_id}.jpg` } });
      return json({ ok: true, result: {} });
    }

    /* ---- GitHub ---- */
    const m = (re) => re.exec(p);
    if (opts.method === undefined || opts.method === 'GET') {
      if (m(/\/git\/ref\/heads\/main$/)) return json({ object: { sha: world.head } });
      let g;
      if ((g = m(/\/git\/commits\/(.+)$/))) return json({ tree: { sha: world.commits.get(g[1]).tree } });
      if ((g = m(/\/git\/trees\/(.+)$/))) {
        const snap = world.trees.get(g[1]);
        return json({ tree: [...snap.entries()].map(([path, buf]) => ({ path, type: 'blob', sha: sha1(buf) })) });
      }
      if ((g = m(/\/contents\/(.+)$/))) {
        const path = decodeURIComponent(g[1]);
        const buf = world.files.get(path);
        if (!buf) return json({ message: 'Not Found' }, 404);
        return json({ content: buf.toString('base64') });
      }
    }
    if (opts.method === 'POST' && p.endsWith('/git/blobs')) {
      const buf = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8');
      const s = sha1(buf);
      world.blobs.set(s, buf);
      return json({ sha: s });
    }
    if (opts.method === 'POST' && p.endsWith('/git/trees')) {
      const snap = new Map(world.trees.get(body.base_tree));
      for (const e of body.tree) {
        if (e.sha === null) snap.delete(e.path);
        else snap.set(e.path, world.blobs.get(e.sha) || [...world.trees.get(body.base_tree).values()]
          .find((b) => sha1(b) === e.sha) || Buffer.from(''));
      }
      const s = 'tree' + (world.trees.size + 1);
      world.trees.set(s, snap);
      return json({ sha: s });
    }
    if (opts.method === 'POST' && p.endsWith('/git/commits')) {
      const s = 'commit' + (world.commits.size + 1);
      world.commits.set(s, { tree: body.tree, message: body.message, parents: body.parents, author: body.author });
      return json({ sha: s });
    }
    if (opts.method === 'PATCH' && p.endsWith('/git/refs/heads/main')) {
      if (world.conflictOnce) { world.conflictOnce = false; return json({ message: 'conflict' }, 409); }
      const c = world.commits.get(body.sha);
      if (c.parents[0] !== world.head) return json({ message: 'fast-forward only' }, 409);
      world.head = body.sha;
      world.files = new Map(world.trees.get(c.tree));
      world.commitLog.push({ sha: body.sha, message: c.message, author: c.author });
      return json({ object: { sha: body.sha } });
    }
    throw new Error(`unmocked ${opts.method || 'GET'} ${url}`);
  };

  return world;
}

export async function deliver(handler, update, { secret = 'shh' } = {}) {
  const res = { code: 0, body: '', status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } };
  await handler({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: update }, res);
  return res;
}

export const photoMsg = ({ group, caption, uid, mid = 1, chat = 5, user = 42, replyTo = null }) => ({
  message: {
    message_id: mid, chat: { id: chat }, from: { id: user },
    media_group_id: group, caption,
    photo: [{ file_id: 'small' + uid, file_unique_id: uid + 's', file_size: 900 },
            { file_id: 'big' + uid, file_unique_id: uid, file_size: 240000 }],
    ...(replyTo ? { reply_to_message: { from: { is_bot: true }, text: replyTo } } : {}),
  },
});

export const videoMsg = ({ group, caption, uid, mid = 1, chat = 5, user = 42, size = 4e6, replyTo = null }) => ({
  message: {
    message_id: mid, chat: { id: chat }, from: { id: user },
    media_group_id: group, caption,
    video: { file_id: 'vid' + uid, file_unique_id: uid, file_size: size, duration: 14 },
    ...(replyTo ? { reply_to_message: { from: { is_bot: true }, text: replyTo } } : {}),
  },
});

export const docMsg = ({ uid, mime, name, mid = 1, chat = 5, user = 42 }) => ({
  message: {
    message_id: mid, chat: { id: chat }, from: { id: user },
    document: { file_id: 'doc' + uid, file_unique_id: uid, mime_type: mime, file_name: name, file_size: 1000 },
  },
});

export const textMsg = (text, { chat = 5, user = 42, replyTo = null, mid = 1 } = {}) => ({
  message: {
    message_id: mid, chat: { id: chat }, from: { id: user }, text,
    ...(replyTo ? { reply_to_message: { from: { is_bot: true }, text: replyTo } } : {}),
  },
});

export const callback = (data, { chat = 5, user = 42, mid = 900 } = {}) => ({
  callback_query: { id: 'cb1', from: { id: user }, data, message: { message_id: mid, chat: { id: chat } } },
});
