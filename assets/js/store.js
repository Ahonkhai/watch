/* Cart state. Persisted to localStorage; every read and write is guarded so a
   private window or blocked site data degrades to an in-memory cart rather
   than throwing. */

const CART_KEY = 'swizz.cart.v2';

const Cart = (() => {
  let memory = [];
  let usingStorage = true;
  const listeners = new Set();

  function read() {
    if (!usingStorage) return memory;
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isValidLine) : [];
    } catch {
      usingStorage = false;
      return memory;
    }
  }

  function write(lines) {
    memory = lines;
    if (usingStorage) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(lines));
      } catch {
        usingStorage = false;
      }
    }
    listeners.forEach((fn) => fn(lines));
  }

  /* A stored line is only usable if the product still exists in the catalog —
     otherwise a removed product would break every page that renders the cart. */
  function isValidLine(line) {
    if (!line || typeof line !== 'object') return false;
    const product = PRODUCTS.find((p) => p.id === line.id);
    if (!product) return false;
    return Number.isInteger(line.qty) && line.qty > 0;
  }

  const keyOf = (line) => line.id;

  return {
    items: read,

    /* Returns each line joined to its listing, ready to render. */
    detailed() {
      return read().map((line) => {
        const product = PRODUCTS.find((p) => p.id === line.id);
        return { ...line, product, lineTotal: product.price * line.qty };
      });
    },

    add(id, qty = 1) {
      const lines = read();
      const existing = lines.find((l) => l.id === id);
      const product = PRODUCTS.find((p) => p.id === id);
      const cap = product ? product.stock : 1;
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, cap);
      } else {
        lines.push({ id, qty: Math.min(qty, cap) });
      }
      write(lines);
    },

    setQty(id, qty) {
      let lines = read();
      if (qty <= 0) {
        lines = lines.filter((l) => l.id !== id);
      } else {
        const line = lines.find((l) => l.id === id);
        const product = PRODUCTS.find((p) => p.id === id);
        if (line) line.qty = Math.min(qty, product ? product.stock : 1);
      }
      write(lines);
    },

    remove(id) {
      write(read().filter((l) => l.id !== id));
    },

    clear() { write([]); },

    count() { return read().reduce((n, l) => n + l.qty, 0); },

    subtotal() {
      return read().reduce((sum, l) => {
        const product = PRODUCTS.find((p) => p.id === l.id);
        return sum + (product ? product.price * l.qty : 0);
      }, 0);
    },

    shipping() {
      const sub = this.subtotal();
      if (sub === 0 || sub >= FREE_SHIPPING_OVER) return 0;
      return SHIPPING_FLAT;
    },

    total() { return this.subtotal() + this.shipping(); },

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

const money = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
