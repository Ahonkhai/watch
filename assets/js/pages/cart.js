/* Bag: line items, quantity edits, order summary. */
onPageReady(() => {
  const root = document.querySelector('[data-cart-root]');
  if (!root) return;

  function lineHTML(line) {
    const href = `product.html?id=${encodeURIComponent(line.product.id)}`;
    const brand = collectionOf(line.product);
    return `
<div class="cart-line" data-line data-id="${esc(line.id)}">
  <a class="cart-line-art" href="${href}" tabindex="-1" aria-hidden="true">
    ${productImage(line.product)}
  </a>
  <div>
    <h3><a href="${href}">${esc(brand.name)} ${esc(line.product.name)}</a></h3>
    <p class="cart-line-meta">
      Ref. ${esc(line.product.reference)} &middot; ${line.product.year} &middot;
      ${esc(line.product.condition)} &middot; ${esc(line.product.set)}
    </p>
    <div class="cart-line-controls">
      <button class="btn-quiet" type="button" data-remove>Remove</button>
    </div>
  </div>
  <div class="cart-line-price">${money(line.lineTotal)}</div>
</div>`;
  }

  function render() {
    const lines = Cart.detailed();

    if (!lines.length) {
      root.innerHTML = `
<div class="empty-state">
  <strong>Your bag is empty.</strong>
  <p>Twelve references are waiting, from ${money(Math.min(...PRODUCTS.map((p) => p.price)))}.</p>
  <p style="margin-top:1.8rem">
    <a class="btn btn-primary" href="shop.html">See all twelve</a>
  </p>
</div>`;
      return;
    }

    const shipping = Cart.shipping();

    root.innerHTML = `
<div class="cart-layout">
  <div>
    ${lines.map(lineHTML).join('')}
    <p style="margin-top:2.5rem"><a class="btn-quiet" href="shop.html">Continue shopping</a></p>
  </div>
  <aside class="summary">
    <h3>Order summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${money(Cart.subtotal())}</span></div>
    <div class="summary-row">
      <span>Delivery</span>
      <span>Quoted per order</span>
    </div>
    <div class="summary-row total"><span>Total</span><span>${money(Cart.total())}</span></div>
    <a class="btn btn-primary btn-block" href="checkout.html" style="margin-top:2rem">
      Proceed to checkout
    </a>
    <p class="summary-note">
      Delivery is insured and quoted per order. We confirm availability on
      Telegram before anything is paid.
    </p>
  </aside>
</div>`;
  }

  root.addEventListener('click', (e) => {
    const lineEl = e.target.closest('[data-line]');
    if (!lineEl) return;
    const { id } = lineEl.dataset;

    if (e.target.closest('[data-remove]')) {
      Cart.remove(id);
      render();
      toast('Removed from your bag');
    }
  });

  render();
});
