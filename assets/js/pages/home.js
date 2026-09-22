/* Home page: hero art, cinematic chapters, the full reference rail. */

/* One flagship per family, in the order the collections are listed. */
const CHAPTER_IDS = ['tidewater-300', 'meridian-worldtimer', 'loft-moonphase', 'terrafirma-ti'];

function chapterHTML(product, i, total) {
  const collection = collectionOf(product);
  const n = String(i + 1).padStart(2, '0');
  const surface = i % 2 === 0 ? 'light' : 'dark';
  const depth = 1 + (i % 2) * 0.3;
  return `
<section class="chapter" data-surface="${surface}">
  <span class="chapter-index">${n} / ${String(total).padStart(2, '0')}</span>
  <div class="chapter-inner">
    <p class="label" data-reveal>${esc(collection.name)}</p>
    <h2 class="chapter-name" data-split>${esc(product.name)}</h2>
    <div class="chapter-art" data-parallax="${depth}">
      <div data-reveal><div data-clip>${renderWatch(product, { live: true })}</div></div>
    </div>
    <p class="chapter-tagline" data-reveal style="--delay:.08s">${esc(product.tagline)}</p>
    <div class="chapter-meta" data-reveal style="--delay:.14s">
      <span class="price">${money(product.price)}</span>
      <a class="btn btn-ghost magnetic"
         href="product.html?id=${encodeURIComponent(product.id)}">Discover</a>
      <a class="link-arrow"
         href="shop.html?collection=${encodeURIComponent(collection.id)}">The ${esc(collection.name)} family</a>
    </div>
  </div>
</section>`;
}

onPageReady(() => {
  const hero = document.querySelector('[data-hero-art]');
  const heroProduct = PRODUCTS.find((p) => p.id === 'tidewater-300');
  if (hero && heroProduct) hero.innerHTML = renderWatch(heroProduct, { live: true });

  const chapters = document.querySelector('[data-chapters]');
  if (chapters) {
    const picks = CHAPTER_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
    chapters.innerHTML = picks.map((p, i) => chapterHTML(p, i, picks.length)).join('');
  }

  const rail = document.querySelector('[data-rail]');
  if (rail) {
    // Ordered by family so the rail reads as a tour of the collection.
    const ordered = COLLECTIONS.flatMap((c) => PRODUCTS.filter((p) => p.collection === c.id));
    rail.innerHTML = ordered.map((p, i) => productCardHTML(p, i % 4)).join('');
    observeReveals(rail);
  }

  // Chapters and rail are injected after the engine's own setup ran.
  window.kestrelMotion?.refresh();
});
