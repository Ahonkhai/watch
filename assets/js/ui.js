/* Shared chrome: nav, cart badge, toasts, scroll reveals, product cards. */

const ICONS = {
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M3 7h18M3 17h18"/></svg>',
  shield: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
  truck: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  rotate: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
};

/* ---------- page lifecycle ---------- */

/* Runs `fn` when the page's markup is ready, now or later, and again whenever a
   host swaps the view without a document load (the single-file preview build
   does this). Safer than a bare DOMContentLoaded listener, which never fires
   for a script that finishes loading after the event. */
function onPageReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
  document.addEventListener('page:render', fn);
}

/* Query parameters, read from the URL or from a hash route ("#/shop?x=y").
   Artifact frames never receive the query string, so the preview routes on the
   hash and this is the one place that has to know. */
function pageParams() {
  const hash = location.hash;
  const q = hash.indexOf('?');
  if (hash.startsWith('#/') && q !== -1) return new URLSearchParams(hash.slice(q + 1));
  return new URLSearchParams(location.search);
}

/* Replaces the current URL's parameters without adding a history entry. */
function setPageParams(queryString) {
  if (location.hash.startsWith('#/')) {
    const route = location.hash.split('?')[0];
    history.replaceState(null, '', queryString ? `${route}?${queryString}` : route);
  } else {
    history.replaceState(null, '', queryString ? `?${queryString}` : location.pathname);
  }
}

/* ---------- scroll reveal ---------- */

let revealObserver = null;

function observeReveals(root = document) {
  const targets = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (!targets.length) return;

  // Without IntersectionObserver the content must simply be visible.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  }
  targets.forEach((el) => revealObserver.observe(el));
}

/* ---------- chrome ---------- */

let lastCartCount = null;

function syncCartBadge() {
  const n = Cart.count();
  // Only react when something was added — not on load, and not on removal.
  const grew = lastCartCount !== null && n > lastCartCount;
  lastCartCount = n;

  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n).padStart(2, '0');
    el.dataset.empty = String(n === 0);
    if (!grew) return;
    el.classList.remove('is-bumped');
    void el.offsetWidth;           // restart the animation
    el.classList.add('is-bumped');
  });
}

let toastTimer;
function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.innerHTML = `${ICONS.check}<span></span>`;
  el.querySelector('span').textContent = message;
  el.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.dataset.show = 'false'; }, 3000);
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The header adopts the ground of whichever section is under it. */
function initHeaderSurface() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let queued = false;

  const apply = () => {
    queued = false;
    const probe = header.getBoundingClientRect().height + 2;   // just below it
    let surface = 'light';
    document.querySelectorAll('main [data-surface]').forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) surface = sec.dataset.surface || 'light';
    });
    if (header.dataset.surface !== surface) header.dataset.surface = surface;
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  if (!initHeaderSurface.bound) {
    initHeaderSurface.bound = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  apply();
}

let chromeReady = false;

function initChrome() {
  // Re-running (a preview route change) must refresh state, not re-bind events.
  if (chromeReady) {
    markCurrentNavLink();
    syncCartBadge();
    observeReveals();
    initHeaderSurface();
    return;
  }
  chromeReady = true;

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.innerHTML = ICONS.menu;
    toggle.addEventListener('click', () => {
      const open = nav.dataset.open === 'true';
      nav.dataset.open = String(!open);
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  markCurrentNavLink();

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  syncCartBadge();
  Cart.onChange(syncCartBadge);
  observeReveals();
  initHeaderSurface();
}

/* Marks the current page in the nav without hardcoding it per file. Handles
   both real paths and hash routes. */
function markCurrentNavLink() {
  const onHashRoute = location.hash.startsWith('#/');
  const here = onHashRoute
    ? location.hash
    : (location.pathname.split('/').pop() || 'index.html') + location.search;
  const bare = here.split('?')[0];

  document.querySelectorAll('.nav a').forEach((a) => {
    const href = a.getAttribute('href');
    a.toggleAttribute('aria-current', false);
    if (href === here || (href === bare && !here.includes('?'))) {
      a.setAttribute('aria-current', 'page');
    }
  });
}

onPageReady(initChrome);

/* ---------- shared rendering ---------- */

/* Escapes text before it goes into a template string. The catalog is ours, but
   product copy flows straight into innerHTML and one stray angle bracket
   shouldn't be able to break a page. */
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function collectionOf(product) {
  return COLLECTIONS.find((c) => c.id === product.collection);
}

function badgeHTML(product) {
  if (product.stock <= 3) return `<span class="badge badge-low">${product.stock} remaining</span>`;
  return product.badge ? `<span class="badge">${esc(product.badge)}</span>` : '';
}

/* `index` staggers the reveal so a grid settles row by row rather than at once. */
function productCardHTML(product, index = 0) {
  const href = `product.html?id=${encodeURIComponent(product.id)}`;
  const delay = Math.min(index, 7) * 0.07;
  return `
<article class="card" data-reveal style="--delay:${delay}s">
  ${badgeHTML(product)}
  <a class="card-art" href="${href}" tabindex="-1" aria-hidden="true">
    ${renderWatch(product)}
  </a>
  <div class="card-body">
    <p class="card-collection">${esc(collectionOf(product).name)}</p>
    <h3 class="card-name"><a href="${href}">${esc(product.name)}</a></h3>
    <p class="card-tagline">${esc(product.tagline)}</p>
    <div class="card-foot">
      <span class="price">${money(product.price)}</span>
    </div>
  </div>
</article>`;
}

/* Renders products into a container and wires up their reveals. */
function renderGrid(container, products) {
  container.innerHTML = products.map((p, i) => productCardHTML(p, i)).join('');
  observeReveals(container);
}
