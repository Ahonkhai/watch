# Kestrel & Co. — watch storefront

A static e-commerce front end for a watch brand. No build step, no dependencies,
no framework: open `index.html` and it works.

This is a **demo storefront**. The catalog is invented and the checkout takes no
payment — it validates, confirms, and clears the bag. See
[Going live](#going-live) for what has to be real before it can sell anything.

## Run it

Any static server will do:

```bash
npx http-server -p 8077             # or: python3 -m http.server 8077
```

Opening `index.html` directly from disk also works, since nothing is fetched
over the network.

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

`vercel.json` pins those three build settings and otherwise declares only
response headers:

| | |
|---|---|
| **Content-Security-Policy** | `default-src 'self'` with one inline script allowed by SHA-256 hash. No third-party origin can load anything into the page. |
| **Cache-Control** | HTML revalidates every request, CSS and JS cache for an hour, fonts for thirty days. The asset filenames are not content-hashed, so nothing is marked `immutable`. |
| **Security headers** | `nosniff`, `strict-origin-when-cross-origin`, HSTS, and a `Permissions-Policy` that turns off camera, microphone, geolocation and payment. |

URLs keep their `.html` extension (`cleanUrls` is off). Turning it on would
make Vercel redirect `/shop.html` to `/shop`, which adds a hop to every
internal link and breaks the nav's current-page matching — switching would mean
updating the links and `markCurrentNavLink()` together.

**After editing the inline script in the page `<head>`**, re-check the CSP hash
or the script will be blocked in production — silently, because the site is
built to work without it:

```bash
python3 tools/check-csp-hash.py
```

`404.html` is served automatically for unknown paths.

### Other hosts

The repo is the site; point any static host at it with no build command.
Netlify, Cloudflare Pages and GitHub Pages all work with an empty build
command and the repo root as the publish directory. On a plain nginx or S3
bucket, copy the files to the document root — but the headers above are
Vercel-specific and would need re-declaring.

## Pages

| File | What it does |
|---|---|
| `index.html` | Hero, the four collections, featured references |
| `shop.html` | Faceted grid — collection, movement, case size, price; sorting |
| `product.html?id=<id>` | Detail, strap switcher, quantity, add to bag, specs |
| `cart.html` | Line items, quantity edits, order summary |
| `checkout.html` | Validated form and an order confirmation |
| `about.html` | Brand story, servicing, warranty, shipping, contact |
| `404.html` | Served for unknown paths |

## Structure

```
.
├── index.html …            the seven pages
├── assets/css/fonts.css    @font-face for the two self-hosted families
├── assets/css/styles.css   design tokens, then layout, then components
├── assets/fonts/*.woff2    Cormorant Garamond + Jost, latin subsets
├── assets/js/data.js       catalog — collections, products, specs, straps
├── assets/js/watch.js      draws a product as inline SVG
├── assets/js/store.js      cart state, persisted to localStorage
├── assets/js/ui.js         shared chrome: nav, cart badge, toasts, cards
├── assets/js/motion.js     the scroll and pointer engine
├── assets/js/pages/*.js    one script per page
├── tools/build-pages.py    regenerates the pages from one shared chrome
├── tools/build-preview.py  packs the site into one hash-routed file
├── tools/check-csp-hash.py guards the CSP hash against drift
└── preview/                generated — see Single-file preview below
```

The seven pages share one header, footer and `<head>`, defined once in
`tools/build-pages.py`. Edit the chrome there and re-run it rather than
editing seven files:

```bash
python3 tools/build-pages.py
```

The page bodies live in that script too. Everything else — styles, scripts,
the catalog — is edited directly.

`data.js` is the only file you edit to change what is for sale. Everything else
reads from it — the nav, the facets, the counts, the price floor on the home
page and the related-products rail are all derived, so adding a product or a
whole collection needs no other change.

### Design

Four things carry the look, and they are worth preserving if you restyle:

- **Two surfaces, one token set.** Light is the page's ground; a section marked
  `data-surface="dark"` redefines the same tokens, so every card, table and form
  renders correctly on either without a second rule. The header adopts the
  ground of whatever section is beneath it.
- **Type.** Cormorant Garamond at large sizes and light weights for anything
  display; Jost, widely letterspaced and uppercased, for every label, button and
  nav item. Body copy is Jost at 300. Nothing is bold.
- **Space.** `--section` sets the vertical rhythm and is deliberately large.
  Crowding it is the fastest way to make the site look cheap.
- **Restraint.** Gold (`--gold`) is for hairlines, small caps labels and hover
  states — not for filled surfaces. There is one filled button style on the page
  at a time.

Anything that scopes the tokens must restate `color` and `background` for its
subtree: inherited colour carries the already-resolved value, not the `var()`
reference, so a child would otherwise keep the surface above it.

Supporting details: a fixed film-grain layer over the whole page
(`body::after`) and hairline dividers instead of card borders.

### Motion

Deliberately little, and all of it specific to watches. The rule applied here:
keep motion that only a watch site would have, cut motion any site could have.

| | |
|---|---|
| **Running seconds** | The seconds hand sweeps for real. Quartz and solar references step once a second; mechanical ones beat eight times a second, matching a 4 Hz escapement. Driven by `movement` in the catalog. |
| **Live where it counts** | The hero and product-detail watches run always (`renderWatch(p, { live: true })`); grid cards start on hover, so twelve watches aren't all ticking at once. |
| **Turn it over** | Dragging the product on its detail page tilts it in 3D and springs back. |
| **Rail** | The twelve-reference row is drag-scrollable, and a drag that ends on a card does not open it. |
| **Strap change** | Crossfades instead of cutting. |
| **Bag** | The count pulses when something is added — not on load, not on removal. |
| **Section reveals** | A short fade as sections arrive. Opt in with `data-reveal`, stagger with a `--delay` custom property. |

There are exactly two `@keyframes` in the stylesheet: the seconds sweep and the
bag count. Everything else was removed as decoration — an entry curtain, page
transitions, scroll-linked parallax, a custom pointer, magnetic buttons,
word-by-word headline reveals, a reading-progress bar, a hero float and a
button sheen. They were well-built and they made the site look like every
other site.

`assets/js/motion.js` holds only the two drag behaviours and is optional: if it
fails to load, the site still works. Page scripts that inject markup call
`observeReveals()` and `window.kestrelMotion?.refresh()` afterwards, since both
run their own setup before that content exists.

`prefers-reduced-motion: reduce` disables what remains, and `motion.js` returns
early rather than attaching listeners.

### Avoiding the generated look

Choices made against the house style of AI-generated sites, worth keeping if
you restyle:

- **No blur, no glass.** The header is opaque. There is no `backdrop-filter`
  anywhere.
- **No decorative gradients.** The only gradients left draw metal, straps and
  dials inside the product illustrations, where they depict something.
- **Square.** One `border-radius` in the whole stylesheet, on the bag count.
- **Four shadows total**, three of them cast by product art.
- **Uneven on purpose.** The four home chapters use three layouts, and the
  craft block is a deliberately uneven 12-column grid, not four equal tiles.
- **Contrast is checked.** Every text token meets WCAG AA against its own
  ground, on both surfaces, and nothing is set below 11.5px.
- **Specific words.** Buttons say what they do — "See all twelve", not
  "Get started". There are no testimonials, no logo wall and no statistics.


### Product art

There is no photography. `watch.js` draws each watch as SVG from the `art` block
on the product plus the chosen strap:

```js
art: {
  case: 'steel',      // steel | gold | bronze | titanium | black
  dial: '#101418',
  accent: '#C8A45C',  // seconds hand, applied indices
  bezel: 'dive',      // dive | gmt | worldtimer | compressor | fixed | thin
  bezelColor: '#1B2026',
  hands: 'sword',     // sword | syringe | dauphine | leaf
  lume: '#BFE8D9',    // null for a dress dial with no lume
  finish: 'sunburst', // optional radial brushing; omit for a matte dial
  subdial: true,      // optional small seconds at 6
  moon: true,         // optional moonphase at 6
}
```

Dial text colour is computed from the dial's luminance, so a light dial gets dark
printing without anyone setting a flag. Gradient IDs are namespaced per instance,
which is what lets a dozen watches share one page without the first one's case
metal leaking into the rest.

To use real photographs instead, replace the `renderWatch()` calls in
`ui.js`, `product.js` and `cart.js` with `<img>` tags; nothing else depends on it.

## Single-file preview

Some hosts serve one page per deployment and never pass the query string
through to it — claude.ai Artifacts among them. This site is six documents
routed by `?id=` and `?collection=`, so it cannot be published to one of those
as-is; navigation would break.

`tools/build-preview.py` packs the same sources into one self-contained file
that routes on the hash instead:

```bash
python3 tools/build-preview.py      # -> preview/kestrel-preview.html
```

Styles and scripts are inlined, the fonts are embedded as data URIs, and each
page's `<main>` becomes a template a small router swaps in — `#/product?id=x`
in place of `product.html?id=x`. It makes no external requests, so it also
works opened straight off disk with no server.

`preview/kestrel-preview.html` is generated. Edit the real sources and re-run
the script; don't edit the preview by hand.

The multi-page site remains what you deploy — a static host gives you real
paths, which is what you want for sharing and search engines.

## Going live

Four things stand between this and a real store:

1. **Checkout has no backend.** `checkout.js` validates and then renders a
   confirmation. Post the cart to Stripe Checkout, Shopify, or your own
   endpoint instead — the cart shape (`[{id, strap, qty}]`) is already what a
   line-item payload wants. Never take card details in this form as it stands;
   the fields are there to show the flow.
2. **Prices and stock are client-side**, so they are editable by anyone with dev
   tools. Price the order on the server at checkout time.
3. **Tax and real shipping rates** are not calculated. `SHIPPING_FLAT` and
   `FREE_SHIPPING_OVER` in `data.js` are a flat placeholder.
4. **No order storage, email, or fulfilment.**

The catalog, the brand, the addresses and the movement suppliers named in the
copy are all invented. Replace them before this faces anyone.
