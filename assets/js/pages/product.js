/* Listing detail.
   One specific watch: reference, year, condition and set are the facts a
   buyer of pre-owned actually decides on, so they sit above the fold. */

/* Opens Telegram with the listing already quoted, so the first message
   identifies the watch without the buyer having to describe it. */
function telegramOrderHref(product) {
  const brand = collectionOf(product).name;
  const message =
    `Hello, I would like to order this watch:\n\n` +
    `${brand} ${product.name}\n` +
    `Reference ${product.reference}\n` +
    `${product.year} · ${product.condition} · ${product.set}\n` +
    `${money(product.price)}\n\n` +
    `Is it still available?`;
  return `https://t.me/${TELEGRAM_HANDLE}?text=${encodeURIComponent(message)}`;
}

onPageReady(() => {
  const root = document.querySelector('[data-pdp]');
  if (!root) return;

  const id = pageParams().get('id');
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    root.innerHTML = `
<div class="empty-state">
  <strong>That listing is no longer available.</strong>
  <p>It may have sold, or the link may be wrong.</p>
  <p style="margin-top:1.8rem"><a class="btn btn-ghost" href="shop.html">See what is in stock</a></p>
</div>`;
    return;
  }

  const brand = collectionOf(product);
  document.title = `${brand.name} ${product.name} ${product.reference} | Swizz Clones`;

  /* The photographs and video of this specific watch. With none uploaded the
     stage shows the "photography to follow" panel instead of a stand-in. */
  const media = productMedia(product);
  const alt = productAlt(product);

  function stageHTML(i) {
    if (!media.length) return productImage(product);
    const item = media[i];
    if (item.type === 'video') {
      /* Without a poster a video renders as a black rectangle, which looks
         broken rather than unplayed. A listing with photographs uses the
         first one; with none, #t=0.1 makes the browser seek to a tenth of a
         second and paint that frame, so the still you see is the watch. */
      const hasStill = product.images && product.images.length;
      const poster = hasStill ? ` poster="${esc(product.images[0])}"` : '';
      const src = hasStill ? item.src : `${item.src}#t=0.1`;
      return `<video src="${esc(src)}"${poster} controls playsinline preload="metadata"
                     aria-label="Video of ${esc(alt)}"></video>`;
    }
    return `<img src="${esc(item.src)}" alt="${esc(alt)}">`;
  }

  function thumbsHTML() {
    if (media.length < 2) return '';
    const items = media.map((m, i) => {
      const label = m.type === 'video' ? `Play the video of ${alt}` : `View photograph ${i + 1} of ${alt}`;
      const inner = m.type === 'video'
        ? `<span class="thumb-video" aria-hidden="true">▶</span>` +
          (product.images && product.images.length ? `<img src="${esc(product.images[0])}" alt="" loading="lazy">` : '')
        : `<img src="${esc(m.src)}" alt="" loading="lazy">`;
      return `<button type="button" class="pdp-thumb" data-thumb="${i}"
                      aria-label="${esc(label)}" aria-pressed="${i === 0}">${inner}</button>`;
    }).join('');
    return `<div class="pdp-thumbs" data-thumbs role="group" aria-label="Media for ${esc(alt)}">${items}</div>`;
  }

  function specRows() {
    return Object.entries(product.specs)
      .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join('');
  }

  root.innerHTML = `
<div class="pdp">
  <div class="pdp-media">
    <div class="pdp-stage" data-stage>${stageHTML(0)}</div>
    ${thumbsHTML()}
  </div>

  <div>
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="shop.html">Shop</a><span>/</span>
      <a href="shop.html?collection=${encodeURIComponent(brand.id)}">${esc(brand.name)}</a>
      <span>/</span>${esc(product.reference)}
    </nav>

    <p class="label label-quiet" style="margin-bottom:0.6rem">${esc(brand.name)}</p>
    <h1>${esc(product.name)}</h1>
    <p class="pdp-tagline">${esc(product.tagline)}</p>

    <dl class="facts">
      <div><dt>Reference</dt><dd>${esc(product.reference)}</dd></div>
      <div><dt>Year</dt><dd>${product.year}</dd></div>
      <div><dt>Condition</dt><dd>${esc(product.condition)}</dd></div>
      <div><dt>Set</dt><dd>${esc(product.set)}</dd></div>
    </dl>

    <p class="pdp-price">${money(product.price)}</p>
    <p class="pdp-stock"><strong>One available.</strong> Insured delivery quoted per order.</p>

    <div class="buy-row">
      <a class="btn btn-telegram" href="${telegramOrderHref(product)}"
         target="_blank" rel="noopener">${ICONS.telegram} Order on Telegram</a>
      <button class="btn btn-ghost" type="button" data-add>Add to bag</button>
    </div>

    <p class="label label-quiet" style="margin-bottom:1.2rem">Description</p>
    <p class="pdp-desc">${esc(product.description)}</p>

    <p class="label label-quiet" style="margin:2.4rem 0 1.2rem">Specification</p>
    <table class="specs">
      <caption class="sr-only">Specification</caption>
      <tbody>
        <tr><th scope="row">Brand</th><td>${esc(brand.name)}</td></tr>
        <tr><th scope="row">Model</th><td>${esc(product.name)}</td></tr>
        <tr><th scope="row">Reference</th><td>${esc(product.reference)}</td></tr>
        ${specRows()}
      </tbody>
    </table>

    <div class="assurances">
      <div class="assurance">${ICONS.shield}<span><strong>Authenticity checked</strong>
        Every watch is inspected and, where supplied, its papers matched to the case.</span></div>
      <div class="assurance">${ICONS.truck}<span><strong>Insured delivery</strong>
        Tracked and insured to the full value, quoted per order.</span></div>
      <div class="assurance">${ICONS.rotate}<span><strong>Fourteen-day returns</strong>
        Unworn and as supplied, with all packaging.</span></div>
    </div>
  </div>
</div>`;

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) {
      Cart.add(product.id, 1);
      toast('Added to your bag');
      return;
    }

    const thumb = e.target.closest('[data-thumb]');
    if (thumb) {
      const i = Number(thumb.dataset.thumb);
      const stage = root.querySelector('[data-stage]');
      stage.innerHTML = stageHTML(i);
      root.querySelectorAll('[data-thumb]').forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.thumb) === i));
      });
      /* Opening the video means wanting to watch it, so do not make them
         press play a second time. Autoplay can still be refused; the controls
         are there either way. */
      if (media[i] && media[i].type === 'video') {
        stage.querySelector('video')?.play?.().catch(() => {});
      }
    }
  });

  observeReveals(root);

  const related = PRODUCTS.filter(
    (p) => p.collection === product.collection && p.id !== product.id);
  const pool = related.length ? related : PRODUCTS.filter((p) => p.id !== product.id);
  if (pool.length) {
    renderGrid(document.querySelector('[data-related]'), pool.slice(0, 4));
    document.querySelector('[data-related-section]').hidden = false;
  }
});
