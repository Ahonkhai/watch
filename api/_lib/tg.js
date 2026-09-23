/* The Telegram Bot API, over plain fetch. */

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;

async function call(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`Telegram ${method}: ${body.description}`);
  return body.result;
}

const base = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } };

export const send = (chat_id, text, extra = {}) =>
  call('sendMessage', { chat_id, text, ...base, ...extra });

export const edit = (chat_id, message_id, text, extra = {}) =>
  call('editMessageText', { chat_id, message_id, text, ...base, ...extra });

export const answer = (callback_query_id, text = '') =>
  call('answerCallbackQuery', { callback_query_id, text });

/* Populates the / menu in Telegram's compose bar, so the commands are
 * discoverable instead of something you have to remember. */
export const publishCommands = () =>
  call('setMyCommands', {
    commands: [
      { command: 'new', description: 'Template to copy for a new listing' },
      { command: 'list', description: 'Everything in stock' },
      { command: 'drafts', description: 'Media staged but not yet published' },
      { command: 'edit', description: 'Change a listing — /edit 126710BLNR' },
      { command: 'price', description: 'Reprice — /price 126710BLNR 13900' },
      { command: 'sold', description: 'Take a watch off the site' },
      { command: 'help', description: 'How to list a watch' },
    ],
  });

/* Download a file Telegram is holding, as base64 ready for a git blob.
 * getFile refuses anything over 20 MB, so that is the real ceiling. */
export async function download(file_id) {
  const file = await call('getFile', { file_id });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN()}/${file.file_path}`);
  if (!res.ok) throw new Error(`downloading ${file.file_path}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), bytes: buf.length, path: file.file_path };
}

export const buttons = (rows) => ({ reply_markup: { inline_keyboard: rows } });

/* Telegram renders a subset of HTML, so anything typed by a person has to be
 * escaped or a stray < in a description kills the whole message. */
export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
