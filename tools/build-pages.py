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
      <a href="shop.html">Shop</a>
      <a href="shop.html?collection=tidewater">Tidewater</a>
      <a href="shop.html?collection=meridian">Meridian</a>
      <a href="shop.html?collection=loft">Loft</a>
      <a href="shop.html?collection=terrafirma">Terrafirma</a>
      <a href="about.html">Maison</a>
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
          Instruments for the long run. Drawn in Portland, assembled in Biel,
          serviced anywhere you can post a parcel.
        </p>
      </div>
      <div>
        <h4>Collections</h4>
        <ul>
          <li><a href="shop.html?collection=tidewater">Tidewater</a></li>
          <li><a href="shop.html?collection=meridian">Meridian</a></li>
          <li><a href="shop.html?collection=loft">Loft</a></li>
          <li><a href="shop.html?collection=terrafirma">Terrafirma</a></li>
        </ul>
      </div>
      <div>
        <h4>Client care</h4>
        <ul>
          <li><a href="about.html#servicing">Servicing</a></li>
          <li><a href="about.html#warranty">Five-year warranty</a></li>
          <li><a href="about.html#shipping">Shipping &amp; returns</a></li>
          <li><a href="about.html#contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Maison</h4>
        <ul>
          <li><a href="about.html">Our story</a></li>
          <li><a href="about.html#workshop">The workshop</a></li>
          <li><a href="about.html#movements">Movements</a></li>
          <li><a href="shop.html">Shop all</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-note">
      <span>&copy; <span data-year>2026</span> Swizz Clones</span>
      <span>Insured worldwide delivery &middot; Thirty-day returns</span>
    </div>
  </div>
</footer>
<script src="assets/js/data.js"></script>
<script src="assets/js/watch.js"></script>
<script src="assets/js/store.js"></script>
<script src="assets/js/ui.js"></script>
<script src="assets/js/motion.js"></script>
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
     "Swizz Clones | Mechanical watches built to be worn",
     "Dive, field, dress and expedition watches from Swizz Clones Swiss and "
     "Japanese movements, sapphire crystals, five-year warranty.",
     '''
<section class="hero" data-surface="dark">
  <div class="wrap hero-inner">
    <div>
      <p class="label" data-reveal>Est. 2014, Portland &amp; Biel</p>
      <h1 data-reveal style="--delay:.06s">Instruments for<br>the <em>long run</em>.</h1>
      <p class="lede" data-reveal style="--delay:.24s">
        Four families of mechanical watches and nothing else. No seasonal colourways,
        no drops you have to set an alarm for. Only watches we expect you to be
        wearing in twenty years, and to service when you are.
      </p>
      <div class="hero-actions" data-reveal style="--delay:.32s">
        <a class="btn btn-primary" href="shop.html">See all twelve</a>
        <a class="link-arrow" href="about.html">How they are made</a>
      </div>
      <dl class="hero-meta" data-reveal style="--delay:.4s">
        <div><dt>Warranty</dt><dd>Five years</dd></div>
        <div><dt>Movements</dt><dd>Swiss &amp; Japanese</dd></div>
        <div><dt>Delivery</dt><dd>Insured, worldwide</dd></div>
      </dl>
    </div>
    <div class="hero-art" data-hero-art data-reveal style="--delay:.1s"></div>
  </div>
</section>

<div data-chapters></div>

<section class="section" data-surface="light">
  <div class="wrap">
    <div class="section-head">
      <div>
        <p class="label" data-reveal>Every reference</p>
        <h2 data-reveal>All twelve, end to end.</h2>
      </div>
      <a class="link-arrow" href="shop.html" data-reveal style="--delay:.12s">All twelve references</a>
    </div>
  </div>
  <div class="rail-wrap">
    <div class="rail" data-rail></div>
    <div class="rail-hint" data-rail-hint><span>Drag</span><i></i><span>12 references</span></div>
  </div>
</section>

<section class="section" data-surface="dark">
  <div class="wrap">
    <p class="label" data-reveal>The making</p>
    <h2 data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">Four things we will not compromise.</h2>
    <div class="craft" data-reveal style="--delay:.06s">
      <div>
        <div class="num">01</div>
        <h3>Movements we can service</h3>
        <p>
          Sellita, Miyota, Soprod, La Joux&#8209;Perret. Widely supported calibres, so any
          competent watchmaker can open one in 2045 and find parts waiting.
        </p>
      </div>
      <div>
        <div class="num">02</div>
        <h3>Sapphire, without exception</h3>
        <p>
          Every reference takes a sapphire crystal with anti-reflective coating, including
          the quartz at $420. Mineral glass is cheaper and we do not use it.
        </p>
      </div>
      <div>
        <div class="num">03</div>
        <h3>Regulated in five positions</h3>
        <p>
          We will not ship an automatic running outside &minus;5/+8 seconds a day,
          tighter than the movement suppliers\' own specification.
        </p>
      </div>
      <div>
        <div class="num">04</div>
        <h3>Tested twice</h3>
        <p>
          Once at the movement stage and once fully cased. Dive references are
          pressure-tested to 125&nbsp;% of their rating before they see a box.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section" data-surface="light">
  <div class="wrap-narrow" style="text-align:center">
    <p class="label" data-reveal>Begin</p>
    <h2 data-reveal>Twelve references. Pick one.</h2>
    <div data-reveal style="--delay:.12s">
      <p class="lede" style="margin:1.8rem auto 2.8rem">
        From $420 for the solar Terrafirma to $3,150 for the Loft Moonphase. Every one
        ships insured and boxed, with a strap tool and a five-year warranty.
      </p>
      <a class="btn btn-primary" href="shop.html">See all twelve references</a>
    </div>
  </div>
</section>
''', scripts=["home.js"])

# ---------------------------------------------------------------- shop
page("shop.html",
     "The collection | Swizz Clones",
     "Browse every Swizz Clones reference: dive, field, dress and expedition watches "
     "from $420 to $3,150.",
     '''
<section class="section-tight" style="padding-bottom:clamp(2.5rem,5vw,4rem)">
  <div class="wrap">
    <p class="label" data-reveal>The collection</p>
    <h1 data-shop-title data-reveal style="--delay:.06s;font-size:clamp(2.6rem,6vw,5rem)">All watches</h1>
    <p class="lede" data-shop-blurb data-reveal style="--delay:.12s;margin-top:1.6rem">
      Twelve references across four families. Every one ships with a five-year
      warranty and a strap change tool.
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
          <h4>Movement</h4>
          <div data-filter-movements></div>
        </div>
        <div class="filter-group">
          <h4>Case size</h4>
          <div data-filter-sizes></div>
        </div>
        <div class="filter-group">
          <h4>Maximum price</h4>
          <input type="range" id="price-max" min="400" max="3200" step="10" value="3200"
                 aria-label="Maximum price">
          <div class="range-row"><span>$400</span><span style="margin-left:auto"
            data-price-label>$3,200</span></div>
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
     "Reference detail, full specification and strap options.",
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
     "The maison | Swizz Clones",
     "How Swizz Clones builds, tests and services its watches.",
     '''
<section class="section-tight">
  <div class="wrap-narrow">
    <p class="label" data-reveal>Our story</p>
    <h1 data-reveal style="--delay:.06s;font-size:clamp(2.4rem,5.4vw,4.4rem)">
      We began because a watch we loved stopped, and nobody would fix it.
    </h1>
  </div>
</section>

<section class="statement" data-surface="dark">
  <div class="wrap statement-grid">
    <h2 class="display-quote" data-reveal>Three watchmakers turned it away.</h2>
    <p class="lede" data-reveal style="--delay:.1s">
      In 2013 one of us inherited a 1970s diver built on a movement nobody still made
      parts for. That is the whole origin story, and it remains the brief: build watches
      out of calibres that will be serviceable long after we are not around to service
      them ourselves.
    </p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="craft" data-reveal>
      <div><div class="num">2014</div><h3>The first Tidewater</h3>
        <p>Eighty pieces, funded by pre-orders, assembled on a kitchen table in Portland.</p></div>
      <div><div class="num">11</div><h3>Watchmakers</h3>
        <p>Nine in Biel, two in Portland. Every Loft movement is finished by one person, start to finish.</p></div>
      <div><div class="num">5</div><h3>Year warranty</h3>
        <p>Transferable with the watch. If you sell it, the warranty goes with it.</p></div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap-narrow">
    <h2 id="workshop" data-reveal>The workshop</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Cases are machined in Switzerland and Japan to our drawings. Assembly, regulation
      and testing happen in Biel. We regulate every automatic in five positions and will
      not ship one running outside &minus;5/+8 seconds a day, tighter than the
      movement suppliers' own specification.
    </p>

    <h2 id="movements" data-reveal>Movements</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      We use Sellita, Miyota, Soprod and La Joux&#8209;Perret calibres, plus our own
      hand-wound cal.&nbsp;2 in the Loft Ultrathin. Nothing exotic, nothing proprietary
      enough to strand you. Parts for every calibre we have shipped remain available
      through ordinary supply channels.
    </p>

    <h2 id="servicing" data-reveal>Servicing</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Send it back whenever it needs attention. A full service is $220 for automatics and
      $160 for quartz, including gaskets, a pressure test and a new strap if yours is
      finished. We will service watches bought second-hand, and we do not mind who owned
      it first.
    </p>

    <h2 id="warranty" data-reveal>Warranty</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Five years against defects in materials and workmanship, transferable with the
      watch. It does not cover scratches, a crystal cracked in a fall, or water damage
      where the crown was left unscrewed. But tell us what happened and we will
      usually find a way to help.
    </p>

    <h2 id="shipping" data-reveal>Shipping &amp; returns</h2>
    <p class="lede" data-reveal style="margin:1.5rem 0 clamp(3rem,6vw,4.5rem)">
      Free insured shipping on orders over $1,500, $25 flat otherwise. Thirty days to
      change your mind, unworn, in the box it arrived in. Return shipping is ours.
    </p>

    <h2 id="contact" data-reveal>Contact</h2>
    <p class="lede" data-reveal style="margin-top:1.5rem">
      A real person reads every message, usually within a working day.
    </p>
    <p data-reveal style="margin-top:1.6rem">
      <a class="link-arrow" href="mailto:hello@swizzclones.example">hello@swizzclones.example</a>
    </p>
  </div>
</section>
''')
