/* Checkout.

   There is no payment processor wired up yet, so this collects the order and
   hands it to the customer's mail client addressed to us. Nothing is invented:
   the order is only placed once they send that message, and the page says so.

   When Stripe lands, replace submit() with a call to a serverless function
   that creates a Checkout session and redirects. Price the line items there,
   from the server's own catalog — never from the values in this page. */

const ORDER_EMAIL = 'hello@swizzclones.example';   // <- set to a real inbox
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

    <p class="summary-note" style="margin-top:2.5rem">
      We confirm every order by email and send a secure payment link before
      anything is charged. Nothing is taken from you on this page.
    </p>
    <button class="btn btn-primary btn-block" type="submit" style="margin-top:1.2rem">
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

  /* Composes the order as plain text. This is what the customer sends us and
     what they keep — so it has to be complete on its own. */
  function orderText(reference, form) {
    const lines = Cart.detailed().map(
      (l) => `  ${l.qty} x ${l.product.name} (${l.strap.name}) — ${money(l.lineTotal)}`);
    const f = (n) => form.elements[n].value.trim();
    return [
      `Order ${reference}`,
      '',
      ...lines,
      '',
      `Subtotal: ${money(Cart.subtotal())}`,
      `Shipping: ${Cart.shipping() === 0 ? 'Free' : money(Cart.shipping())}`,
      `Total: ${money(Cart.total())}`,
      '',
      'Deliver to:',
      `  ${f('name')}`,
      `  ${f('address')}`,
      `  ${f('city')} ${f('postcode')}`,
      `  ${f('country')}`,
      `  ${f('email')}`,
    ].join('\n');
  }

  function renderConfirmation(reference, body, email) {
    root.innerHTML = `
<div style="max-width:620px">
  <p class="label">Almost there</p>
  <h2 style="margin-bottom:1.6rem">Send order ${esc(reference)}</h2>
  <p class="lede">
    Your email app should have opened with this order ready to send to
    <strong>${esc(ORDER_EMAIL)}</strong>. <strong>The order is not placed until you
    send it.</strong> If nothing opened, copy the details below and email them to us.
  </p>
  <pre data-order style="white-space:pre-wrap;font:inherit;font-size:.88rem;
       background:var(--panel);border:1px solid var(--line);padding:1.2rem;
       margin-top:1.8rem;overflow-x:auto">${esc(body)}</pre>
  <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.6rem">
    <a class="btn btn-primary" href="${esc(mailtoHref(reference, body))}">Open email again</a>
    <button class="btn btn-ghost" type="button" data-copy>Copy the order</button>
  </div>
  <p class="summary-note" style="margin-top:1.6rem">
    We reply to confirm stock and send a secure payment link. Nothing is charged
    until you use it. Sent to ${esc(email)}.
  </p>
</div>`;

    const copy = root.querySelector('[data-copy]');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(body);
        copy.textContent = 'Copied';
      } catch {
        // Clipboard access is refused in some embedded views; select it instead.
        const range = document.createRange();
        range.selectNodeContents(root.querySelector('[data-order]'));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copy.textContent = 'Selected — press copy';
      }
    });
  }

  function mailtoHref(reference, body) {
    return `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(`Order ${reference}`)}`
         + `&body=${encodeURIComponent(body)}`;
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

    const email = form.elements.email.value;
    const reference = `SC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const body = orderText(reference, form);

    Cart.clear();
    renderConfirmation(reference, body, email);
    window.location.href = mailtoHref(reference, body);
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
