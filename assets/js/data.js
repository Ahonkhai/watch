/* Catalogue settings.
 *
 * The stock itself lives in assets/js/listings.js, which the Telegram bot
 * writes. This file holds everything the bot does not own: the vocabularies
 * the shop filters on, the delivery rules, and where orders are sent.
 *
 * ── LISTING STOCK ─────────────────────────────────────────────────────────
 * Add and remove watches through the bot, not by editing listings.js — it is
 * rewritten wholesale on every change and a hand edit would be lost. See
 * docs/telegram-bot.md.
 *
 * The listings shipped with the site are REAL references with published
 * manufacturer specifications, used as a working placeholder so the shop has
 * something accurate to render. They are NOT anyone's stock. Verify every
 * figure against the watch in hand and its papers before selling against it.
 * ──────────────────────────────────────────────────────────────────────────
 */

/* Brands, in the order the home page tiles them. The bot appends a new one
 * the first time it sees a brand it does not know. */
const COLLECTIONS = CATALOGUE.collections;

/* The vocabularies a listing has to use. The bot validates captions against
 * these, and the shop builds its facets from them, so the two can never drift
 * apart. Adding a value here makes it selectable in both places. */
const CONDITIONS = ['Unworn', 'Excellent', 'Very good', 'Good'];
const SETS = ['Full set', 'Watch and box', 'Watch and papers', 'Watch only'];

const PRODUCTS = CATALOGUE.products;

/* Every listing is a single watch. */
PRODUCTS.forEach((p) => { p.stock = 1; });

const SHIPPING_FLAT = 0;          // insured delivery quoted per order
const FREE_SHIPPING_OVER = 0;

/* Where "Order on Telegram" points. Set this to the real account or channel. */
const TELEGRAM_HANDLE = 'swizzclones';
