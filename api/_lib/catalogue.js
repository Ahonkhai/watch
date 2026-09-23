/* Reading and writing assets/js/listings.js.
 *
 * The site is static: it loads the catalogue as a script, not as a fetch, so
 * there is no loading state and no API for the shop to depend on. That means
 * the bot's storage format has to be a JavaScript file. It writes the whole
 * file every time from parsed JSON rather than patching it, so there is no
 * chance of a half-edited file reaching the site. */

import { readFile } from './github.js';

export const LISTINGS_PATH = 'assets/js/listings.js';

const HEADER = `/* GENERATED FILE — written by the Telegram listing bot.
 *
 * Do not edit this by hand: the bot rewrites it wholesale on every change and
 * your edit would be lost. To change a listing, use the bot (/list, /price,
 * /sold). To change how a listing is SHOWN, edit assets/js/data.js instead. */
`;

export async function load() {
  const src = await readFile(LISTINGS_PATH);
  if (!src) return { updated: null, collections: [], products: [] };
  const open = src.indexOf('{');
  const close = src.lastIndexOf('}');
  if (open < 0 || close < open) throw new Error(`${LISTINGS_PATH} is not parseable`);
  return JSON.parse(src.slice(open, close + 1));
}

export function serialise(catalogue) {
  const body = { ...catalogue, updated: new Date().toISOString() };
  return `${HEADER}const CATALOGUE = ${JSON.stringify(body, null, 2)};\n`;
}

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const listingId = (collection, reference) =>
  `${collection}-${String(reference).toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

/* A brand the bot has not seen becomes a new collection, so listing a Grand
 * Seiko does not need a code change. The blurb is left empty rather than
 * invented; the site falls back to the brand name. */
export function ensureCollection(catalogue, brandName) {
  const id = slug(brandName);
  if (!catalogue.collections.some((c) => c.id === id)) {
    catalogue.collections.push({ id, name: brandName.trim(), blurb: '' });
    catalogue.collections.sort((a, b) => a.name.localeCompare(b.name));
  }
  return id;
}

export const money = (n) =>
  '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
