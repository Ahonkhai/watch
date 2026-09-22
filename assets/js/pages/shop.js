/* Shop: faceted filtering, sorting, and URL state so a filtered view is
   linkable and survives a refresh or a back button. */
onPageReady(() => {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;

  const SIZE_BUCKETS = [
    { id: 'sm', label: 'Under 39 mm', test: (p) => p.size < 39 },
    { id: 'md', label: '39 – 41 mm', test: (p) => p.size >= 39 && p.size <= 41 },
    { id: 'lg', label: 'Over 41 mm', test: (p) => p.size > 41 },
  ];
  const MOVEMENTS = [...new Set(PRODUCTS.map((p) => p.movement))].sort();

  const params = pageParams();
  const state = {
    collections: new Set((params.get('collection') || '').split(',').filter(Boolean)),
    movements: new Set((params.get('movement') || '').split(',').filter(Boolean)),
    sizes: new Set((params.get('size') || '').split(',').filter(Boolean)),
    maxPrice: Number(params.get('max')) || 3200,
    sort: params.get('sort') || 'featured',
  };

  /* Facet counts ignore their own facet, so a count never reads zero for an
     option the shopper can still usefully tick. */
  function matches(product, skip) {
    if (skip !== 'collections' && state.collections.size &&
        !state.collections.has(product.collection)) return false;
    if (skip !== 'movements' && state.movements.size &&
        !state.movements.has(product.movement)) return false;
    if (skip !== 'sizes' && state.sizes.size) {
      const inBucket = SIZE_BUCKETS.some(
        (b) => state.sizes.has(b.id) && b.test(product));
      if (!inBucket) return false;
    }
    if (skip !== 'price' && product.price > state.maxPrice) return false;
    return true;
  }

  const SORTS = {
    featured: (a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || a.price - b.price,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'size-asc': (a, b) => a.size - b.size,
    name: (a, b) => a.name.localeCompare(b.name),
  };

  function checkbox(group, value, label, count) {
    const checked = state[group].has(value) ? ' checked' : '';
    const disabled = count === 0 && !checked ? ' disabled' : '';
    return `
<label class="check">
  <input type="checkbox" data-group="${group}" value="${esc(value)}"${checked}${disabled}>
  <span>${esc(label)}</span>
  <span class="count">${count}</span>
</label>`;
  }

  function renderFilters() {
    document.querySelector('[data-filter-collections]').innerHTML = COLLECTIONS.map((c) =>
      checkbox('collections', c.id, c.name,
        PRODUCTS.filter((p) => p.collection === c.id && matches(p, 'collections')).length)
    ).join('');

    document.querySelector('[data-filter-movements]').innerHTML = MOVEMENTS.map((m) =>
      checkbox('movements', m, m.replace(/(^|\s)\w/g, (s) => s.toUpperCase()),
        PRODUCTS.filter((p) => p.movement === m && matches(p, 'movements')).length)
    ).join('');

    document.querySelector('[data-filter-sizes]').innerHTML = SIZE_BUCKETS.map((b) =>
      checkbox('sizes', b.id, b.label,
        PRODUCTS.filter((p) => b.test(p) && matches(p, 'sizes')).length)
    ).join('');

    document.querySelector('[data-price-label]').textContent = money(state.maxPrice);
    document.querySelector('#price-max').value = state.maxPrice;
    document.querySelector('[data-sort]').value = state.sort;
  }

  function syncUrl() {
    const q = new URLSearchParams();
    if (state.collections.size) q.set('collection', [...state.collections].join(','));
    if (state.movements.size) q.set('movement', [...state.movements].join(','));
    if (state.sizes.size) q.set('size', [...state.sizes].join(','));
    if (state.maxPrice < 3200) q.set('max', state.maxPrice);
    if (state.sort !== 'featured') q.set('sort', state.sort);
    setPageParams(q.toString());
  }

  function renderHeading() {
    const title = document.querySelector('[data-shop-title]');
    const blurb = document.querySelector('[data-shop-blurb]');
    if (state.collections.size === 1) {
      const c = COLLECTIONS.find((x) => x.id === [...state.collections][0]);
      if (c) {
        title.textContent = c.name;
        blurb.textContent = c.blurb;
        return;
      }
    }
    title.textContent = 'All watches';
    blurb.textContent =
      'Twelve references across four families. Every one ships with a five-year ' +
      'warranty and a strap change tool.';
  }

  function render() {
    const results = PRODUCTS.filter((p) => matches(p)).sort(SORTS[state.sort] || SORTS.featured);
    if (results.length) {
      renderGrid(grid, results);
    } else {
      grid.innerHTML = `
<div class="empty-state" style="grid-column:1/-1">
  <strong>Nothing matches those filters.</strong>
  <p>Try widening the price range, or clear a facet.</p>
  <p style="margin-top:1.6rem">
    <button class="btn-quiet" type="button" data-clear-filters>Clear all filters</button>
  </p>
</div>`;
    }
    document.querySelector('[data-result-count]').textContent =
      `${results.length} ${results.length === 1 ? 'watch' : 'watches'}`;
    renderFilters();
    renderHeading();
    syncUrl();
  }

  document.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-group]');
    if (input) {
      const set = state[input.dataset.group];
      input.checked ? set.add(input.value) : set.delete(input.value);
      render();
      return;
    }
    if (e.target.matches('[data-sort]')) {
      state.sort = e.target.value;
      render();
    }
  });

  const priceInput = document.querySelector('#price-max');
  priceInput.addEventListener('input', () => {
    state.maxPrice = Number(priceInput.value);
    document.querySelector('[data-price-label]').textContent = money(state.maxPrice);
  });
  priceInput.addEventListener('change', render);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear-filters]')) {
      state.collections.clear();
      state.movements.clear();
      state.sizes.clear();
      state.maxPrice = 3200;
      render();
    }
    if (e.target.closest('[data-filter-toggle]')) {
      const panel = document.querySelector('[data-filters]');
      panel.dataset.open = String(panel.dataset.open !== 'true');
    }
  });

  render();
});
