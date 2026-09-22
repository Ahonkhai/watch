/* Bag: line items, quantity edits, order summary. */
onPageReady(() => {
  const root = document.querySelector('[data-cart-root]');
  if (!root) return;

  function lineHTML(line) {
    const href = `product.html?id=${encodeURIComponent(line.product.id)}`;
    return `
<div class="cart-line" data-line data-id="${esc(line.id)}" data-strap="${esc(line.strap.id)}">
  <a class="cart-line-art" href="${href}" tabindex="-1" aria-hidden="true">
    ${renderWatch(line.product, { strap: line.strap })}
  </a>
  <div>
    <h3><a href="${href}">${esc(line.product.name)}</a></h3>
    <p class="cart-line-meta">${esc(collectionOf(line.product).name)} &middot; ${esc(line.strap.name)}</p>
    <div class="cart-line-controls">
      <div class="qty">
        <button type="button" data-step="-1" aria-label="Decrease quantity for ${esc(line.product.name)}">&minus;</button>
        <output aria-live="polite">${line.qty}</output>
        <button type="button" data-step="1" aria-label="Increase quantity for ${esc(line.product.name)}">+</button>
      </div>
      <button class="btn btn-quiet" type="button" data-remove>Remove</button>
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
    <a class="btn btn-primary" href="shop.html">Discover the collection</a>
  </p>
</div>`;
      return;
    }

    const shipping = Cart.shipping();
    const remaining = FREE_SHIPPING_OVER - Cart.subtotal();

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
      <span>Shipping</span>
      <span>${shipping === 0 ? 'Free' : money(shipping)}</span>
    </div>
    ${remaining > 0
      ? `<p class="summary-note">Add ${money(remaining)} more for free insured shipping.</p>`
      : ''}
    <div class="summary-row total"><span>Total</span><span>${money(Cart.total())}</span></div>
    <a class="btn btn-primary btn-block" href="checkout.html" style="margin-top:2rem">
      Proceed to checkout
    </a>
    <p class="summary-note">
      Taxes calculated at checkout. This is a demo storefront &mdash; no payment is taken.
    </p>
  </aside>
</div>`;
  }

  root.addEventListener('click', (e) => {
    const lineEl = e.target.closest('[data-line]');
    if (!lineEl) return;
    const { id, strap } = lineEl.dataset;

    if (e.target.closest('[data-remove]')) {
      Cart.remove(id, strap);
      render();
      toast('Removed from your bag');
      return;
    }

    const step = e.target.closest('[data-step]');
    if (step) {
      const current = Cart.items().find((l) => l.id === id && l.strap === strap);
      if (current) Cart.setQty(id, strap, current.qty + Number(step.dataset.step));
      render();
    }
  });

  render();
});
