#!/usr/bin/env python3
"""Builds a single-file preview of the storefront.

The real site is six HTML documents that route on the query string. Some hosts
(claude.ai Artifacts among them) serve one page per artifact and never pass the
query string through, so this packs the same sources into one file that routes
on the hash instead: styles and scripts inlined, fonts embedded as data URIs,
and each page's <main> kept as a template the router swaps in.

Nothing here is used by the deployed site. Run it only to produce a preview:

    python3 tools/build-preview.py
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "preview" / "swizz-clones-preview.html"

PAGES = [("", "index.html"), ("shop", "shop.html"), ("product", "product.html"),
         ("cart", "cart.html"), ("checkout", "checkout.html"), ("about", "about.html")]

SCRIPTS = ["assets/js/data.js", "assets/js/store.js",
           "assets/js/ui.js",
           "assets/js/pages/home.js", "assets/js/pages/shop.js",
           "assets/js/pages/product.js", "assets/js/pages/cart.js",
           "assets/js/pages/checkout.js"]

TITLES = {"": "Swizz Clones", "shop": "The collection", "product": "Watch",
          "cart": "Your bag", "checkout": "Checkout", "about": "The maison"}


def read(rel):
    return (ROOT / rel).read_text()


def to_hash_routes(text):
    """Rewrites document links to hash routes, in markup and in script alike."""
    text = re.sub(r'index\.html(?=["\'])', '#/', text)
    text = re.sub(r'\b(\w+)\.html#([\w-]+)', r'#/\1?at=\2', text)
    text = re.sub(r'\b(\w+)\.html\?', r'#/\1?', text)
    text = re.sub(r'\b(\w+)\.html\b', r'#/\1', text)
    return text


def grab(html, tag, attrs=""):
    m = re.search(rf"<{tag}[^>]*{attrs}[^>]*>(.*?)</{tag}>", html, re.S)
    assert m, f"no <{tag}> found"
    return m.group(1)


def inline_fonts(css):
    def sub(m):
        name = m.group(1)
        data = base64.b64encode((ROOT / "assets/fonts" / name).read_bytes()).decode()
        return f"url('data:font/woff2;base64,{data}')"
    return re.sub(r"url\('\.\./fonts/([^']+)'\)", sub, css)


index = read("index.html")
header = grab(index, "header")
footer = grab(index, "footer")
css = inline_fonts(read("assets/css/fonts.css")) + "\n" + read("assets/css/styles.css")
js = "\n\n".join(read(s) for s in SCRIPTS)

mains = {route: grab(read(f), "main", 'id="main"') for route, f in PAGES}

header, footer = to_hash_routes(header), to_hash_routes(footer)
mains = {r: to_hash_routes(m) for r, m in mains.items()}
js = to_hash_routes(js)

ROUTER = """
/* ---------- preview router ----------
   Swaps the active page's markup into <main> on hash change. The home view is
   already in the document so the page renders something before any script
   runs; the rest live in <template> elements. */
(function () {
  var main = document.getElementById('main');
  var views = { '': main.innerHTML };
  document.querySelectorAll('template[data-route]').forEach(function (t) {
    views[t.dataset.route] = t.innerHTML;
  });
  var TITLES = %TITLES%;

  function route() {
    var h = location.hash;
    if (h.indexOf('#/') !== 0) return { name: '', params: new URLSearchParams() };
    var body = h.slice(2);
    var q = body.indexOf('?');
    var name = (q === -1 ? body : body.slice(0, q)).replace(/\\/$/, '');
    if (!(name in views)) name = '';
    return { name: name, params: new URLSearchParams(q === -1 ? '' : body.slice(q + 1)) };
  }

  function paint(dispatch) {
    var r = route();
    main.innerHTML = views[r.name];
    document.title = TITLES[r.name] + ' \\u2014 Swizz Clones';
    if (dispatch) {
      document.dispatchEvent(new Event('page:render'));
    }
    var at = r.params.get('at');
    var target = at && document.getElementById(at);
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  // A non-home entry route has to be in place before the page scripts init.
  if (route().name !== '') paint(false);

  window.addEventListener('hashchange', function () { paint(true); });

}
)();
""".replace("%TITLES%", repr(TITLES).replace("'", '"'))

templates = "\n".join(
    f'<template data-route="{r}">{m}</template>' for r, m in mains.items() if r
)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(f"""<title>Swizz Clones</title>
<script>
document.documentElement.classList.add('js');
window.SWIZZ_INTRO = false;   // no entry curtain: the first frame is the page
</script>
<style>
{css}
</style>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">{header}</header>
<main id="main">{mains['']}</main>
{templates}
<footer class="site-footer">{footer}</footer>
<script>
{js}
{ROUTER}
</script>
""")

kb = OUT.stat().st_size / 1024
print(f"wrote {OUT.relative_to(ROOT)} ({kb:.0f} KB)")
