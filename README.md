# Swizz Clones — pre-owned watch storefront

A static shop front for a dealer in authentic pre-owned watches. No build step,
no dependencies, no framework: open `index.html` and it works.

One listing is one specific watch. Each carries a reference, a year, a
condition and what comes in the box, and stock is fixed at one — there are no
variants, no sizes to pick and nothing to restock. Orders are placed on
Telegram; the site itself takes no money.

**The catalogue in `assets/js/data.js` is a placeholder and must be replaced
before the site takes an order.** See [Before you sell](#before-you-sell).

## Run it

Any static server will do:

```bash
npx http-server -p 8077             # or: python3 -m http.server 8077
```

Opening `index.html` directly from disk also works, since nothing is fetched
over the network.

## Pages

| File | What it does |
|---|---|
| `index.html` | Hero, the nine brands in stock, the most recent listings |
| `shop.html` | Faceted grid — brand, condition, movement, case size, price; sorting |
| `product.html?id=<id>` | One watch: facts, price, Telegram order, description, specification |
| `cart.html` | The bag, and what it will say when sent |
| `checkout.html` | Delivery details, then a prefilled Telegram message |
| `about.html` | How the dealer works, and how to reach them |
| `404.html` | Served for unknown paths |

## Listings

Watches are added, edited, repriced and marked sold through a **Telegram
bot**: you send the photographs — and a video if you have one — with a
caption, tap Publish, and the listing is live under a minute later. Every
field of every listing is editable from the same bot afterwards. Nothing else is needed — no admin panel, no database.
See [docs/telegram-bot.md](docs/telegram-bot.md) for the caption format and
the one-time setup.

The bot writes `assets/js/listings.js`, which is loaded as a script, so the
site stays completely static. **Do not edit that file by hand** — the next bot
action rewrites it wholesale.

`assets/js/data.js` holds everything the bot does not own: the condition and
set vocabularies the shop filters on, the delivery rules, and the Telegram
handle orders are sent to.

Everything else derives from those two — the nav, the facets, the counts, the
price range on the shop page and the brand tiles on the home page — so adding a
watch or a whole brand needs no code change.

A listing looks like this:

```js
{
  id: 'rolex-126610ln',
  collection: 'rolex',
  name: 'Submariner Date',
  reference: '126610LN',
  year: 2023,
  condition: 'Unworn',          // Unworn | Excellent | Very good | Good
  set: 'Full set',              // Full set | Watch and box | Watch and papers | Watch only
  price: 14200,
  tagline: 'Oystersteel on Oyster bracelet, black Cerachrom bezel.',
  description: '…',             // this watch, not the reference in general
  images: [],                   // photographs of THIS watch
  specs: { … },                  // the specification table
  size: 41,
  movement: 'Automatic',
}
```

`PRODUCTS.forEach((p) => { p.stock = 1 })` runs at the bottom of the file and is
what makes the whole site single-item: the bag caps each line at one, and a
second add is a no-op rather than a quantity of two.

### Photographs

`images` is empty on every listing, and a listing with no photograph renders a
"photography to follow" panel rather than a stand-in picture. That is
deliberate: a generic image of a different watch is a lie about what is being
sold.

The bot fills them: photographs are downloaded from Telegram, re-hosted under
`assets/img/<listing-id>/`, and written into `images`. In the grid they are
cropped to a square so a row of cards lines up; on the listing page nothing is
cropped, because that is where you are looking at the watch.

A listing with more than one photograph gets a thumbnail strip under the
stage. A video, if there is one, sits last in that strip behind a play symbol
and plays inline — `video` on the listing, `assets/img/<id>/video.mp4` on
disk.

There used to be an `assets/js/watch.js` that drew a watch as inline SVG. It
was right for an invented brand and wrong here, for the same reason. It is in
the git history if you ever want it back.

## Ordering

There is no payment processor. `TELEGRAM_HANDLE` in `data.js` is the account
that receives orders, and two paths reach it:

- **Order on Telegram** on a listing page opens a chat prefilled with the
  brand, model, reference, year, condition, set and price, ending in "Is it
  still available?".
- **Checkout** collects a delivery address, empties the bag, and shows an
  order reference with the full message ready to copy, then opens Telegram
  with it. The reference is for the conversation — nothing is stored anywhere.

Checkout asks for no card details, because there is nowhere to send them. A
test asserts that.

When wiring Stripe: replace the submit handler with a call to a serverless
function that creates a Checkout session and redirects to it. **Price the line
items in that function, from the server's own catalogue** — never from the
values in this page, which anyone can edit with dev tools.

## Structure

```
.
├── index.html …            the seven pages
├── assets/css/fonts.css    @font-face for the two self-hosted families
├── assets/css/styles.css   design tokens, then layout, then components
├── assets/fonts/*.woff2    Cormorant Garamond + Jost, latin subsets
├── assets/js/listings.js   the stock — GENERATED, written by the bot
├── assets/js/data.js       vocabularies, delivery, the Telegram handle
├── assets/js/store.js      the bag, persisted to localStorage
├── assets/js/ui.js         shared chrome: nav, bag count, toasts, cards
├── assets/js/pages/*.js    one script per page
├── api/telegram.js         the listing bot's webhook
├── api/_lib/*.js           GitHub, Telegram and catalogue helpers
├── tools/build-pages.py    regenerates the pages from one shared chrome
├── tools/build-preview.py  packs the site into one hash-routed file
├── tools/check-csp-hash.py guards the CSP hash against drift
└── preview/                generated — see Single-file preview below
```

The seven pages share one header, footer and `<head>`, defined once in
`tools/build-pages.py`. Edit the chrome there and re-run it rather than editing
seven files:

```bash
python3 tools/build-pages.py
```

The page bodies live in that script too. Everything else — styles, scripts, the
catalogue — is edited directly.

### Design

Four things carry the look, and they are worth preserving if you restyle:

- **Two surfaces, one token set.** Light is the page's ground; a section marked
  `data-surface="dark"` redefines the same tokens, so every card, table and form
  renders correctly on either without a second rule. The header adopts the
  ground of whatever section is beneath it.
- **Type.** Cormorant Garamond at large sizes and light weights for anything
  display; Jost, widely letterspaced and uppercased, for every label, button and
  nav item. Body copy is Jost at 300. Prices are Jost too, with lining tabular
  figures, so a column of them lines up.
- **Space.** `--section` sets the vertical rhythm and is deliberately large.
  Crowding it is the fastest way to make the site look cheap.
- **Restraint.** Gold (`--gold`) is for hairlines, small caps labels and hover
  states — not for filled surfaces. The one saturated colour on the site is
  Telegram blue on the order button, and it is the only thing competing for a
  click.

Anything that scopes the tokens must restate `color` and `background` for its
subtree: inherited colour carries the already-resolved value, not the `var()`
reference, so a child would otherwise keep the surface above it.

### Motion

Almost none, and it earns its place. There are exactly two `@keyframes` left:
the bag count pulsing when something lands in it, and nothing else — plus a
short fade as sections arrive, opted into with `data-reveal` and staggered with
a `--delay` custom property.

Everything else was removed. An entry curtain, page transitions, scroll-linked
parallax, a custom pointer, magnetic buttons, word-by-word headline reveals, a
reading-progress bar, a hero float and a button sheen all went as decoration.
The drag-to-turn and drag-along-the-rail behaviours went with the drawn watches
they moved.

`prefers-reduced-motion: reduce` disables what remains.

Because reveals park content at `opacity: 0`, the hidden state is scoped to a
`.js` class set by an inline script in the head. Without JavaScript the content
is simply visible rather than stuck invisible forever.

### Avoiding the generated look

Choices made against the house style of AI-generated sites, worth keeping if
you restyle:

- **No blur, no glass.** The header is opaque. There is no `backdrop-filter`
  anywhere.
- **No decorative gradients.** The few that remain are the soft ground behind a
  photograph.
- **Square.** One `border-radius` in the whole stylesheet, on the bag count.
- **Contrast is checked.** Every text token meets WCAG AA against its own
  ground, on both surfaces, and nothing is set below 11.5px.
- **Specific words.** Buttons say what they do — "See all 12 watches", not
  "Get started". There are no testimonials, no logo wall and no statistics.
- **No em dashes in the copy.**

## Deploy

### Vercel

The repository *is* the site, so there is nothing to configure:

1. **vercel.com → Add New → Project**, import this repo as a *new* project.
   Reusing a project that was pointed at another repo carries its saved
   Framework Preset across, which is the usual cause of a wrong preset being
   applied here.
2. Leave every setting alone. There is no `package.json` and no
   `requirements.txt`, so there is nothing to detect and nothing to build. If
   the Framework Preset shows something odd anyway, set it to **Other** — but
   it cannot change the outcome, because `vercel.json` pins `framework` to
   `null`, the build command to empty and the output directory to the repo
   root, and `vercel.json` overrides dashboard settings.
3. **Deploy.**

On the Hobby plan Vercel refuses a deploy whose commit author is not a
collaborator, and it checks *every* author on the commit. A `Co-Authored-By`
trailer counts as a second author, so commits here carry none.

`vercel.json` pins those three build settings and otherwise declares only
response headers:

| | |
|---|---|
| **Content-Security-Policy** | `default-src 'self'` with one inline script allowed by SHA-256 hash. No third-party origin can load anything into the page. |
| **Cache-Control** | HTML revalidates every request, CSS and JS cache for an hour, fonts for thirty days. The asset filenames are not content-hashed, so nothing is marked `immutable`. |
| **Security headers** | `nosniff`, `strict-origin-when-cross-origin`, HSTS, and a `Permissions-Policy` that turns off camera, microphone, geolocation and payment. |

URLs keep their `.html` extension (`cleanUrls` is off). Turning it on would make
Vercel redirect `/shop.html` to `/shop`, which adds a hop to every internal link
and breaks the nav's current-page matching — switching would mean updating the
links and `markCurrentNavLink()` together.

**After editing the inline script in the page `<head>`**, re-check the CSP hash
or the script will be blocked in production — silently, because the site is
built to work without it:

```bash
python3 tools/check-csp-hash.py
```

`404.html` is served automatically for unknown paths.

### Other hosts

The repo is the site; point any static host at it with no build command.
Netlify, Cloudflare Pages and GitHub Pages all work with an empty build command
and the repo root as the publish directory. On a plain nginx or S3 bucket, copy
the files to the document root — but the headers above are Vercel-specific and
would need re-declaring.

## Single-file preview

Some hosts serve one page per deployment and never pass the query string
through to it — claude.ai Artifacts among them. This site is seven documents
routed by `?id=` and `?collection=`, so it cannot be published to one of those
as-is; navigation would break.

`tools/build-preview.py` packs the same sources into one self-contained file
that routes on the hash instead:

```bash
python3 tools/build-preview.py      # -> preview/swizz-clones-preview.html
```

Styles and scripts are inlined, the fonts are embedded as data URIs, and each
page's `<main>` becomes a template a small router swaps in — `#/product?id=x` in
place of `product.html?id=x`. It makes no external requests, so it also works
opened straight off disk with no server.

`preview/swizz-clones-preview.html` is generated. Edit the real sources and
re-run the script; don't edit the preview by hand.

The multi-page site remains what you deploy — a static host gives you real
paths, which is what you want for sharing and search engines.

## Before you sell

1. **Replace the catalogue.** The twelve entries in `listings.js` are real
   references with published manufacturer specifications, used as a working
   placeholder so the page has something to lay out. They are not anyone's
   stock. Replace them with the watches actually held, and verify every figure
   against the watch in hand and its papers — a spec that is right for the
   reference can still be wrong for the individual watch.

2. **Photograph each watch.** Until `images` is filled, every listing shows
   "photography to follow". Send them through the bot.

   Setting the bot up takes five environment variables and one curl — see
   [docs/telegram-bot.md](docs/telegram-bot.md).

3. **Set the Telegram handle.** `TELEGRAM_HANDLE` in `data.js` is
   `'swizzclones'` and every order link on the site is built from it. This is
   the account *customers* message — it is separate from the listing bot.

4. **Decide on the name.** "Swizz Clones" reads as replicas, which is the
   opposite of what this dealer sells. It is worth changing before anyone
   searches for it.

5. **No payment, tax or fulfilment.** `SHIPPING_FLAT` and `FREE_SHIPPING_OVER`
   are both `0` — delivery is quoted per order, in the conversation — and no
   tax is calculated anywhere. Orders exist only as Telegram messages; nothing
   is stored.
