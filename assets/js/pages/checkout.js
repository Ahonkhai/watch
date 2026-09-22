/* Checkout: client-side validation and a confirmation state.
   There is no backend — nothing is transmitted anywhere. The card fields exist
   so the flow is complete to look at, and the form says plainly not to type a
   real card number into them. */
onPageReady(() => {
  const root = document.querySelector('[data-checkout-root]');
  if (!root) return;

  const VALIDATORS = {
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email address'),
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your full name'),
    address: (v) => (v.trim().length >= 5 ? '' : 'Enter your street address'),
    city: (v) => (v.trim().length >= 2 ? '' : 'Enter your city'),
    postcode: (v) => (v.trim().length >= 3 ? '' : 'Enter your postal code'),
    country: (v) => (v ? '' : 'Choose a country'),
    card: (v) => (v.replace(/\s/g, '').length >= 12 ? '' : 'Enter a card number'),
    expiry: (v) => (/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v) ? '' : 'Use MM/YY'),
    cvc: (v) => (/^\d{3,4}$/.test(v) ? '' : '3 or 4 digits'),
  };

  function field(name, label, attrs = '') {
    return `
<label class="field">
  <span>${esc(label)}</span>
  <input name="${name}" ${attrs} autocomplete="off">
  <em class="error" data-error-for="${name}"></em>
</label>`;
  }

  function summaryHTML() {
    const lines = Cart.detailed();
    const shipping = Cart.shipping();
    return `
<aside class="summary">
  <h3>Order summary</h3>
  ${lines.map((l) => `
    <div class="summary-row">
      <span>${esc(l.product.name)} <span style="color:var(--faint)">&times;${l.qty}</span><br>
        <span style="font-size:.78rem;color:var(--faint)">${esc(l.strap.name)}</span></span>
      <span style="white-space:nowrap">${money(l.lineTotal)}</span>
    </div>`).join('')}
  <div class="summary-row" style="border-top:1px solid var(--line);margin-top:.6rem;padding-top:.8rem">
    <span>Subtotal</span><span>${money(Cart.subtotal())}</span>
  </div>
  <div class="summary-row">
    <span>Shipping</span><span>${shipping === 0 ? 'Free' : money(shipping)}</span>
  </div>
  <div class="summary-row total"><span>Total</span><span>${money(Cart.total())}</span></div>
</aside>`;
  }

  function renderForm() {
    root.innerHTML = `
<div class="cart-layout">
  <form novalidate data-checkout-form>
    <div class="notice">
      <strong>Demo checkout.</strong>
      Nothing is transmitted anywhere and no payment is taken. Please do not enter a
      real card number &mdash; any twelve digits will pass.
    </div>

    <p class="form-section-head">Contact</p>
    ${field('email', 'Email', 'type="email" inputmode="email" placeholder="you@example.com"')}

    <p class="form-section-head">Shipping address</p>
    ${field('name', 'Full name')}
    ${field('address', 'Street address')}
    <div class="field-row">
      ${field('city', 'City')}
      ${field('postcode', 'Postal code')}
    </div>
    <label class="field">
      <span>Country</span>
      <select name="country">
        <option value="">Choose&hellip;</option>
        <option>United States</option>
        <option>Canada</option>
        <option>United Kingdom</option>
        <option>Germany</option>
        <option>Switzerland</option>
        <option>Japan</option>
        <option>Australia</option>
      </select>
      <em class="error" data-error-for="country"></em>
    </label>

    <p class="form-section-head">Payment</p>
    ${field('card', 'Card number', 'inputmode="numeric" placeholder="4242 4242 4242 4242"')}
    <div class="field-row">
      ${field('expiry', 'Expiry', 'placeholder="MM/YY" inputmode="numeric"')}
      ${field('cvc', 'CVC', 'inputmode="numeric" placeholder="123"')}
    </div>

    <button class="btn btn-primary btn-block" type="submit" style="margin-top:2.5rem">
      Place order &mdash; ${money(Cart.total())}
    </button>
    <p style="text-align:center;margin-top:1.8rem">
      <a class="btn-quiet" href="cart.html">Return to bag</a>
    </p>
  </form>
  ${summaryHTML()}
</div>`;
  }

  function renderEmpty() {
    root.innerHTML = `
<div class="empty-state">
  <strong>There is nothing to check out.</strong>
  <p>Add a watch to your bag first.</p>
  <p style="margin-top:1.8rem">
    <a class="btn btn-primary" href="shop.html">See all twelve</a>
  </p>
</div>`;
  }

  function renderConfirmation(orderNumber, total, email) {
    root.innerHTML = `
<div style="max-width:620px">
  <div style="width:54px;height:54px;border:1px solid var(--line);display:grid;
              place-items:center;color:var(--gold);margin-bottom:2rem">
    ${ICONS.check}
  </div>
  <p class="label">Confirmed</p>
  <h2 style="margin-bottom:1.6rem">Order ${esc(orderNumber)}</h2>
  <p class="lede">
    Thank you. A confirmation is on its way to <strong>${esc(email)}</strong>, and your
    watch ships within two working days with insured, tracked delivery.
  </p>
  <table class="specs" style="margin-top:2rem">
    <tbody>
      <tr><th scope="row">Order number</th><td>${esc(orderNumber)}</td></tr>
      <tr><th scope="row">Total charged</th><td>${money(total)}</td></tr>
      <tr><th scope="row">Estimated delivery</th><td>${esc(deliveryWindow())}</td></tr>
    </tbody>
  </table>
  <p class="summary-note" style="margin-top:1.6rem">
    This is a demo storefront. No payment was taken and no order was placed.
  </p>
  <p style="margin-top:2.2rem">
    <a class="btn btn-ghost" href="shop.html">Back to the watches</a>
  </p>
</div>`;
  }

  function deliveryWindow() {
    const from = new Date(Date.now() + 4 * 864e5);
    const to = new Date(Date.now() + 8 * 864e5);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(from)} – ${fmt(to)}`;
  }

  function showError(form, name, message) {
    const input = form.elements[name];
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = message;
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    let firstBad = null;
    let ok = true;

    for (const [name, validate] of Object.entries(VALIDATORS)) {
      const input = form.elements[name];
      const message = validate(input ? input.value : '');
      if (!showError(form, name, message)) {
        ok = false;
        if (!firstBad) firstBad = input;
      }
    }

    if (!ok) {
      firstBad?.focus();
      return;
    }

    const total = Cart.total();
    const email = form.elements.email.value;
    const orderNumber = `KC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    Cart.clear();
    renderConfirmation(orderNumber, total, email);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Clear a field's error as soon as it becomes valid, rather than making the
     shopper resubmit to find out. */
  root.addEventListener('input', (e) => {
    const name = e.target.name;
    if (!VALIDATORS[name]) return;
    const form = e.target.closest('form');
    if (form && e.target.getAttribute('aria-invalid') === 'true') {
      showError(form, name, VALIDATORS[name](e.target.value));
    }
  });

  if (Cart.count() === 0) renderEmpty();
  else renderForm();
});
