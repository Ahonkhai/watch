#!/usr/bin/env python3
"""Regenerates the pages from one shared chrome definition.

The header, footer and <head> are defined once here, so they cannot drift
across the seven pages. The output is plain HTML that needs no build step to
deploy — this script is an authoring convenience, not part of serving the site.

    python3 tools/build-pages.py
"""
import pathlib


HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0A0A0B">
<link rel="preload" href="assets/fonts/cormorant-garamond.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jost.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.classList.add('js');</script>
<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/styles.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27><circle cx=%2716%27 cy=%2716%27 r=%2713%27 fill=%27none%27 stroke=%27%23B99C6B%27 stroke-width=%271.5%27/><rect x=%2715.4%27 y=%277.5%27 width=%271.2%27 height=%279%27 rx=%27.6%27 fill=%27%23B99C6B%27/><rect x=%2716%27 y=%2715.4%27 width=%276%27 height=%271.2%27 rx=%27.6%27 fill=%27%23B99C6B%27/></svg>">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="index.html">Swizz <span>Clones</span></a>
    <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false"></button>
    <nav class="nav" aria-label="Primary">
      <a href="shop.html">All watches</a>
      <a href="shop.html?collection=rolex">Rolex</a>
      <a href="shop.html?collection=omega">Omega</a>
      <a href="shop.html?collection=tudor">Tudor</a>
      <a href="shop.html?collection=cartier">Cartier</a>
      <a href="about.html">About</a>
    </nav>
    <div class="header-actions">
      <a class="cart-btn" href="cart.html">
        Bag <span class="cart-count" data-cart-count data-empty="true">0</span>
      </a>
    </div>
  </div>
</header>
<main id="main">
'''

FOOT = '''</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="index.html">Swizz <span>Clones</span></a>
        <p class="footer-blurb">
          Authenticated pre-owned watches. Every piece inspected in hand, with
          its reference, year and condition stated plainly.
        </p>
      </div>
      <div>
        <h4>Brands</h4>
        <ul>
          <li><a href="shop.html?collection=rolex">Rolex</a></li>
          <li><a href="shop.html?collection=omega">Omega</a></li>
          <li><a href="shop.html?collection=audemars-piguet">Audemars Piguet</a></li>
          <li><a href="shop.html?collection=patek-philippe">Patek Philippe</a></li>
          <li><a href="shop.html">See all</a></li>
        </ul>
      </div>
      <div>
        <h4>Buying</h4>
        <ul>
          <li><a href="about.html#authenticity">Authenticity</a></li>
          <li><a href="about.html#delivery">Delivery</a></li>
          <li><a href="about.html#returns">Returns</a></li>
          <li><a href="about.html#payment">Payment</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-note">
      <span>&copy; <span data-year>2026</span> Swizz Clones</span>
      <span>Insured worldwide delivery &middot; Fourteen-day returns</span>
    </div>
  </div>
</footer>
<script src="assets/js/listings.js"></script>
<script src="assets/js/data.js"></script>
<script src="assets/js/store.js"></script>
<script src="assets/js/ui.js"></script>
{scripts}
</body>
</html>
'''

ROOT = pathlib.Path(__file__).resolve().parents[1]


def page(filename, title, desc, body, scripts=()):
    """Writes one page. Paths resolve against the repo root, not the shell's
    working directory, so running this from anywhere puts files in one place."""
    tags = "\n".join(f'<script src="assets/js/pages/{s}"></script>' for s in scripts)
    html = HEAD.format(title=title, desc=desc) + body + FOOT.format(scripts=tags)
    (ROOT / filename).write_text(html)
    print("wrote", filename)

# ---------------------------------------------------------------- index
page("index.html",
     "Swizz Clones | Authenticated pre-owned luxury watches",
     "Pre-owned Rolex, Omega, Tudor, Cartier, Audemars Piguet and more. Every "
     "watch inspected in hand, with reference, year and condition stated.",
     '''
<section class="hero" data-surface="dark">
  <div class="wrap hero-inner">
    <div>
      <p class="label" data-reveal>Authenticated pre-owned</p>
      <h1 data-reveal style="--delay:.06s">Every watch,<br>checked in hand.</h1>
      <p class="lede" data-reveal style="--delay:.12s">
        We list reference, year, condition and what comes in the box, then
        photograph the actual watch. No stock images, no descriptions copied
        off a spec sheet. What you see is the watch you receive.
      </p>
      <div class="hero-actions" data-reveal style="--delay:.18s">
        <a class="btn btn-primary" href="shop.html">
          See all <span data-stock-count>12</span> watches
        </a>
        <a class="link-arrow" href="about.html">How we authenticate</a>
      </div>
      <dl class="hero-meta" data-reveal style="--delay:.24s">
        <div><dt>Inspection</dt><dd>In hand, every piece</dd></div>
        <div><dt>Delivery</dt><dd>Insured, worldwide</dd></div>
        <div><dt>Orders</dt><dd>On Telegram</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="section-tight" data-surface="light">
  <div class="wrap">
    <div class="section-head">
      <div>
        <p class="label" data-reveal>Browse by brand</p>
        <h2 data-reveal style="--delay:.06s">Nine houses in stock.</h2>
      </div>
      <a class="link-arrow" href="shop.html" data-reveal style="--delay:.1s">All watches</a>
    </div>
    <div class="brand-grid" data-brands></div>
  </div>
</section>

<section class="section" data-surface="light">
  <div class="wrap">
    <div class="section-head">
      <div>
        <p class="label" data-reveal>Latest arrivals</p>
        <h2 data-reveal style="--delay:.06s">Recently listed.</h2>
      </div>
      <a class="link-arrow" href="shop.html" data-reveal style="--delay:.1s">See everything</a>
    </div>
    <div class="grid-products" data-latest></div>
  </div>
</section>

<section class="section" data-surface="dark">
  <div class="wrap">
    <p class="label" data-reveal>How we work</p>
    <h2 data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">Four things we do on every watch.</h2>
    <div class="craft" data-reveal style="--delay:.06s">
      <div>
        <div class="num">01</div>
        <h3>Inspected in hand</h3>
        <p>
          Case, dial, movement and bracelet checked against the reference, and
          the serial matched to the papers where they are supplied.
        </p>
      </div>
      <div>
        <div class="num">02</div>
        <h3>Photographed as it is</h3>
        <p>
          Our own photographs of the actual watch, including the marks. If
          there is wear, you will see it before you buy.
        </p>
      </div>
      <div>
        <div class="num">03</div>
        <h3>Stated plainly</h3>
        <p>
          Reference, year, condition and exactly what is in the box. No
          "excellent" doing the work of a description.
        </p>
      </div>
      <div>
        <div class="num">04</div>
        <h3>Insured in transit</h3>
        <p>
          Tracked and insured to full value, quoted per order and per
          destination rather than hidden in the price.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section" data-surface="light">
  <div class="wrap-narrow" style="text-align:center">
    <p class="label" data-reveal>Get in touch</p>
    <h2 data-reveal>Questions go to Telegram.</h2>
    <div data-reveal style="--delay:.1s">
      <p class="lede" style="margin:1.8rem auto 2.8rem">
        Ask about condition, request more photographs, or check whether a piece
        is still available. We answer on Telegram.
      </p>
      <a class="btn btn-primary" href="shop.html">See all watches</a>
    </div>
  </div>
</section>
''', scripts=["home.js"])

# ---------------------------------------------------------------- shop
page("shop.html",
     "All watches | Swizz Clones",
     "Browse every Swizz Clones reference: dive, field, dress and expedition watches "
     "from $420 to $3,150.",
     '''
<section class="section-tight" style="padding-bottom:clamp(2.5rem,5vw,4rem)">
  <div class="wrap">
    <p class="label" data-reveal>The collection</p>
    <h1 data-shop-title data-reveal style="--delay:.06s;font-size:clamp(2.6rem,6vw,5rem)">All watches</h1>
    <p class="lede" data-shop-blurb data-reveal style="--delay:.12s;margin-top:1.6rem">
      Each listing is one specific watch, with its reference, year, condition
      and set stated. Photographs are of the actual piece.
    </p>
  </div>
</section>

<section style="padding-bottom:var(--section)">
  <div class="wrap">
    <div class="shop-layout">
      <aside class="filters" data-filters aria-label="Filters">
        <div class="filter-group">
          <h4>Collection</h4>
          <div data-filter-collections></div>
        </div>
        <div class="filter-group">
          <h4>Condition</h4>
          <div data-filter-conditions></div>
        </div>
        <div class="filter-group">
          <h4>Movement</h4>
          <div data-filter-movements></div>
        </div>
        <div class="filter-group">
          <h4>Case size</h4>
          <div data-filter-sizes></div>
        </div>
        <div class="filter-group">
          <h4>Maximum price</h4>
          <input type="range" id="price-max" aria-label="Maximum price">
          <div class="range-row"><span data-price-floor></span><span style="margin-left:auto"
            data-price-label></span></div>
        </div>
        <div class="filter-group" style="border:0">
          <button class="btn-quiet" type="button" data-clear-filters>Clear all</button>
        </div>
      </aside>

      <div>
        <div class="shop-bar">
          <button class="btn-quiet filter-toggle" type="button" data-filter-toggle>
            Filters
          </button>
          <span class="result-count" data-result-count aria-live="polite"></span>
          <label class="sort-field">
            Sort
            <select data-sort>
              <option value="featured">Featured</option>
              <option value="price-asc">Price, ascending</option>
              <option value="price-desc">Price, descending</option>
              <option value="size-asc">Case size</option>
              <option value="name">Alphabetical</option>
            </select>
          </label>
        </div>
        <div class="grid-products" data-grid></div>
      </div>
    </div>
  </div>
</section>
''', scripts=["shop.js"])

# ---------------------------------------------------------------- product
page("product.html",
     "Watch | Swizz Clones",
     "Reference, year, condition and the full specification of one watch.",
     '''
<section class="section-tight" style="padding-bottom:var(--section)">
  <div class="wrap">
    <div data-pdp><p class="lede">Loading&hellip;</p></div>
  </div>
</section>
<section style="padding-bottom:var(--section)" data-related-section hidden>
  <div class="wrap">
    <hr class="rule" style="margin-bottom:clamp(3rem,6vw,5rem)">
    <div class="section-head">
      <div>
        <p class="label">Also in this family</p>
        <h2>You may prefer one of these.</h2>
      </div>
    </div>
    <div class="grid-products" data-related></div>
  </div>
</section>
''', scripts=["product.js"])

# ---------------------------------------------------------------- cart
page("cart.html",
     "Your bag | Swizz Clones",
     "Review the watches in your bag before checkout.",
     '''
<section class="section-tight" style="padding-bottom:var(--section)">
  <div class="wrap">
    <p class="label">Your selection</p>
    <h1 style="font-size:clamp(2.6rem,6vw,5rem);margin-bottom:clamp(2.5rem,5vw,4rem)">Bag</h1>
    <div data-cart-root></div>
  </div>
</section>
''', scripts=["cart.js"])

# ---------------------------------------------------------------- checkout
page("checkout.html",
     "Checkout | Swizz Clones",
     "Complete your order.",
     '''
<section class="section-tight" style="padding-bottom:var(--section)">
  <div class="wrap">
    <p class="label">Checkout</p>
    <h1 style="font-size:clamp(2.6rem,6vw,5rem);margin-bottom:clamp(2.5rem,5vw,4rem)">Almost yours</h1>
    <div data-checkout-root></div>
  </div>
</section>
''', scripts=["checkout.js"])

# ---------------------------------------------------------------- 404
page("404.html",
     "Not found | Swizz Clones",
     "That page does not exist.",
     '''
<section class="section" data-surface="dark" style="min-height:70vh;display:grid;place-items:center">
  <div class="wrap-narrow" style="text-align:center">
    <p class="label">Error 404</p>
    <h1 style="font-size:clamp(2.4rem,6vw,4.6rem)">This page has stopped.</h1>
    <p class="lede" style="margin:1.8rem auto 2.8rem">
      The link is wrong, or the page has been retired. The collection has not moved.
    </p>
    <a class="btn btn-primary" href="index.html">Back to the watches</a>
  </div>
</section>
''')

# ---------------------------------------------------------------- about
page("about.html",
     "About | Swizz Clones",
     "How we source, authenticate, photograph and ship pre-owned watches.",
     '''
<section class="section-tight">
  <div class="wrap-narrow">
    <p class="label" data-reveal>About</p>
    <h1 data-reveal style="--delay:.06s;font-size:clamp(2.4rem,5.4vw,4.4rem)">
      We sell watches we have held.
    </h1>
  </div>
</section>

<section class="statement" data-surface="dark">
  <div class="wrap statement-grid">
    <h2 class="display-quote" data-reveal>Nothing here is listed from a photograph we did not take.</h2>
    <p class="lede" data-reveal style="--delay:.1s">
      Every watch is inspected in hand before it goes up, and photographed as it
      actually is. Where a piece has wear, the pictures show it and the listing
      says so. A buyer should not be surprised by the parcel.
    </p>
  </div>
</section>

<section class="section">
  <div class="wrap-narrow">
    <h2 id="authenticity" data-reveal>Authenticity</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Each watch is checked against its reference: case dimensions, dial and
      handset, movement, bracelet and clasp. Where papers are supplied, the
      serial is matched to the card. Anything we cannot verify is described as
      unverified rather than assumed.
    </p>

    <h2 id="photography" data-reveal>Photography</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      All images are our own, of the specific watch in the listing. We do not
      use manufacturer press images or stock photography. If you want more
      pictures of a particular detail, ask and we will take them.
    </p>

    <h2 id="condition" data-reveal>How we grade condition</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 1rem">
      Four grades, used consistently:
    </p>
    <table class="specs" data-reveal style="margin-bottom:clamp(3rem,6vw,4.5rem)">
      <tbody>
        <tr><th scope="row">Unworn</th><td>Never worn, stickers usually intact, as supplied by the retailer.</td></tr>
        <tr><th scope="row">Excellent</th><td>Worn lightly. Marks only under close inspection, case unpolished.</td></tr>
        <tr><th scope="row">Very good</th><td>Visible wear consistent with regular use. All marks photographed.</td></tr>
        <tr><th scope="row">Good</th><td>Honest wear throughout. Described and photographed in detail.</td></tr>
      </tbody>
    </table>

    <h2 id="payment" data-reveal>Ordering and payment</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Orders are placed on Telegram. Add a watch to your bag and the checkout
      composes the order for you, or message us directly from any listing. We
      confirm the piece is still available and quote insured delivery to your
      address before any payment is arranged.
    </p>

    <h2 id="delivery" data-reveal>Delivery</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Shipped tracked and insured to the full value of the watch, worldwide.
      Cost depends on destination and declared value, so it is quoted per order
      rather than built into the price. Import duties are the buyer's
      responsibility.
    </p>

    <h2 id="returns" data-reveal>Returns</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Fourteen days from delivery, returned unworn and as supplied with all
      packaging and papers. Tell us before sending it back so we can arrange
      insured return carriage.
    </p>

    <h2 id="contact" data-reveal>Contact</h2>
    <p class="lede" data-reveal style="margin-top:1.5rem">
      Telegram is the fastest way to reach us, and where orders are placed.
    </p>
    <p data-reveal style="margin-top:1.6rem">
      <a class="btn btn-telegram" data-telegram-link href="#" target="_blank" rel="noopener">
        Message us on Telegram
      </a>
    </p>
  </div>
</section>
''')
