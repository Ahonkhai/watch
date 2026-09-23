/* Home: brands, then what is currently in stock. */

onPageReady(() => {
  const brands = document.querySelector('[data-brands]');
  if (brands) {
    brands.innerHTML = COLLECTIONS.map((c, i) => {
      const held = PRODUCTS.filter((p) => p.collection === c.id);
      if (!held.length) return '';
      const from = Math.min(...held.map((p) => p.price));
      return `
<a class="brand-tile" href="shop.html?collection=${encodeURIComponent(c.id)}"
   data-reveal style="--delay:${Math.min(i, 6) * 0.06}s">
  <span class="brand-tile-name">${esc(c.name)}</span>
  <span class="brand-tile-meta">
    ${held.length} ${held.length === 1 ? 'watch' : 'watches'} &middot; from ${money(from)}
  </span>
</a>`;
    }).join('');
    observeReveals(brands);
  }

  const latest = document.querySelector('[data-latest]');
  if (latest) {
    // Newest first, which is how a dealer's stock list reads.
    const byYear = [...PRODUCTS].sort((a, b) => b.year - a.year);
    renderGrid(latest, byYear.slice(0, 8));
  }

  const all = document.querySelector('[data-stock-count]');
  if (all) all.textContent = PRODUCTS.length;

  window.swizzMotion?.refresh();
});
