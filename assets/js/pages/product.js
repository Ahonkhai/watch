/* Product detail: strap switching, quantity, add to bag, related references. */
onPageReady(() => {
  const root = document.querySelector('[data-pdp]');
  if (!root) return;

  const id = pageParams().get('id');
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    root.innerHTML = `
<div class="empty-state">
  <strong>We cannot find that reference.</strong>
  <p>It may have been discontinued, or the link may be wrong.</p>
  <p style="margin-top:1.8rem"><a class="btn btn-ghost" href="shop.html">See all twelve</a></p>
</div>`;
    return;
  }

  document.title = `${product.name} — Swizz Clones`;
  let strap = product.straps[0];
  let qty = 1;

  const lowStock = product.stock <= 3;

  function specRows() {
    return Object.entries(product.specs)
      .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join('');
  }

  function swatches() {
    return product.straps.map((s) => `
<button class="swatch" type="button" data-strap="${esc(s.id)}"
        aria-pressed="${s.id === strap.id}">
  <i style="background:${esc(s.color)}"></i>${esc(s.name)}
</button>`).join('');
  }

  function render() {
    root.innerHTML = `
<div class="pdp">
  <div class="pdp-media">
    <div class="pdp-stage" data-stage>${renderWatch(product, { strap, live: true })}</div>
    <p class="label label-quiet" style="margin:1.8rem 0 0">Strap</p>
    <div class="swatches" role="group" aria-label="Strap">${swatches()}</div>
  </div>
  <div>
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="shop.html">Shop</a><span>/</span>
      <a href="shop.html?collection=${encodeURIComponent(product.collection)}">${esc(collectionOf(product).name)}</a>
      <span>/</span>${esc(product.name)}
    </nav>
    <h1>${esc(product.name)}</h1>
    <p class="pdp-tagline">${esc(product.tagline)}</p>
    <p class="pdp-desc">${esc(product.description)}</p>

    <p class="pdp-price">${money(product.price)}</p>
    <p class="pdp-stock${lowStock ? ' low' : ''}">
      <strong>${lowStock ? `${product.stock} remaining` : 'In stock'}</strong>
      &nbsp;&mdash;&nbsp; dispatched within two working days
    </p>

    <div class="buy-row">
      <div class="qty">
        <button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>
        <output data-qty aria-live="polite">${qty}</output>
        <button type="button" data-step="1" aria-label="Increase quantity">+</button>
      </div>
      <button class="btn btn-primary" type="button" data-add>Add to bag</button>
    </div>

    <p class="label label-quiet" style="margin-bottom:1.2rem">Specification</p>
    <table class="specs">
      <caption class="sr-only">Specification</caption>
      <tbody>
        <tr><th scope="row">Strap</th><td data-strap-name>${esc(strap.name)}</td></tr>
        ${specRows()}
      </tbody>
    </table>

    <div class="assurances">
      <div class="assurance">${ICONS.shield}<span><strong>Five-year warranty</strong>
        Transferable with the watch if you ever sell it.</span></div>
      <div class="assurance">${ICONS.truck}<span><strong>Free insured shipping over ${money(FREE_SHIPPING_OVER)}</strong>
        ${money(SHIPPING_FLAT)} flat below that.</span></div>
      <div class="assurance">${ICONS.rotate}<span><strong>Thirty days to change your mind</strong>
        Unworn, in its box. Return shipping is on us.</span></div>
    </div>
  </div>
</div>`;
  }

  /* Only the parts that change are re-rendered, so switching strap doesn't
     scroll-jump the page or reset the quantity. The watch crossfades rather
     than cutting straight to the new strap. */
  function updateStrap(next) {
    strap = next;
    const stage = root.querySelector('[data-stage]');

    root.querySelector('[data-strap-name]').textContent = strap.name;
    root.querySelectorAll('[data-strap]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.strap === strap.id));
    });

    const swap = () => {
      stage.innerHTML = renderWatch(product, { strap, live: true });
      stage.classList.remove('is-swapping');
    };

    if (prefersReducedMotion()) {
      swap();
      return;
    }
    stage.classList.add('is-swapping');
    setTimeout(swap, 190);
  }

  root.addEventListener('click', (e) => {
    const swatch = e.target.closest('[data-strap]');
    if (swatch) {
      const next = product.straps.find((s) => s.id === swatch.dataset.strap);
      if (next && next.id !== strap.id) updateStrap(next);
      return;
    }

    const step = e.target.closest('[data-step]');
    if (step) {
      qty = Math.min(Math.max(1, qty + Number(step.dataset.step)), product.stock);
      root.querySelector('[data-qty]').textContent = qty;
      return;
    }

    if (e.target.closest('[data-add]')) {
      Cart.add(product.id, strap.id, qty);
      toast(`${product.name} added to your bag`);
    }
  });

  render();
  observeReveals(root);
  window.swizzMotion?.refresh();

  const related = PRODUCTS.filter(
    (p) => p.collection === product.collection && p.id !== product.id);
  const pool = related.length
    ? related
    : PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);
  if (pool.length) {
    renderGrid(document.querySelector('[data-related]'), pool.slice(0, 3));
    document.querySelector('[data-related-section]').hidden = false;
  }
});
