/* Home page: hero art, cinematic chapters, the full reference rail. */

/* One flagship per family, in the order the collections are listed. */
const CHAPTER_IDS = ['tidewater-300', 'meridian-worldtimer', 'loft-moonphase', 'terrafirma-ti'];

/* Four references, three layouts. The first and last are centred; the middle
   two put the watch beside the words and swap sides, so the run does not read
   as one template repeated. */
const CHAPTER_LAYOUT = ['', 'chapter-aside', 'chapter-aside chapter-flip', ''];

function chapterHTML(product, i, total) {
  const collection = collectionOf(product);
  const n = String(i + 1).padStart(2, '0');
  const surface = i % 2 === 0 ? 'light' : 'dark';
  return `
<section class="chapter ${CHAPTER_LAYOUT[i] || ''}" data-surface="${surface}">
  <span class="chapter-index">${n} / ${String(total).padStart(2, '0')}</span>
  <div class="chapter-inner">
    <p class="label" data-reveal>${esc(collection.name)}</p>
    <h2 class="chapter-name" data-reveal style="--delay:.04s">${esc(product.name)}</h2>
    <div class="chapter-art" data-reveal style="--delay:.08s">
      ${renderWatch(product, { live: true })}
    </div>
    <p class="chapter-tagline" data-reveal style="--delay:.12s">${esc(product.tagline)}</p>
    <div class="chapter-meta" data-reveal style="--delay:.16s">
      <span class="price">${money(product.price)}</span>
      <a class="btn btn-ghost"
         href="product.html?id=${encodeURIComponent(product.id)}">${esc(product.name)} in full</a>
      <a class="link-arrow"
         href="shop.html?collection=${encodeURIComponent(collection.id)}">All ${esc(collection.name)}</a>
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
    observeReveals(chapters);
  }

  const rail = document.querySelector('[data-rail]');
  if (rail) {
    // Ordered by family so the rail reads as a tour of the collection.
    const ordered = COLLECTIONS.flatMap((c) => PRODUCTS.filter((p) => p.collection === c.id));
    rail.innerHTML = ordered.map((p, i) => productCardHTML(p, i % 4)).join('');
    observeReveals(rail);
  }

  // Reveals are ui.js's job; the motion engine only binds drag behaviour. Both
  // have to be told about markup injected after their own setup ran.
  observeReveals(document);
  window.kestrelMotion?.refresh();
});
