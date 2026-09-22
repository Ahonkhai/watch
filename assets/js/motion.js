/* Interaction that belongs to the product itself: turning a watch over in your
   hand, and dragging along a row of them. Everything decorative was removed —
   what stays is behaviour you would want on a watch page and nowhere else.

   This file is optional. If it fails to load, the site still works. */

(function () {
  if (typeof prefersReducedMotion === 'function' && prefersReducedMotion()) return;

  /* --- drag the product to turn it --- */
  function initTilt(root) {
    const stage = root.querySelector('.pdp-stage');
    if (!stage || stage.dataset.tilt) return;
    stage.dataset.tilt = 'on';

    let dragging = false, startX = 0, startY = 0;

    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      stage.dataset.dragging = 'true';
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const ty = Math.max(-26, Math.min(26, (e.clientX - startX) * 0.22));
      const tx = Math.max(-20, Math.min(20, -(e.clientY - startY) * 0.18));
      stage.style.setProperty('--ty', `${ty.toFixed(1)}deg`);
      stage.style.setProperty('--tx', `${tx.toFixed(1)}deg`);
    });

    const release = () => {
      if (!dragging) return;
      dragging = false;
      stage.dataset.dragging = 'false';
      stage.style.setProperty('--ty', '0deg');
      stage.style.setProperty('--tx', '0deg');
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
  }

  /* --- drag along the reference rail --- */
  function initRail(root) {
    const rail = root.querySelector('[data-rail]');
    if (!rail || rail.dataset.bound) return;
    rail.dataset.bound = 'on';

    let down = false, startX = 0, startLeft = 0, moved = 0;

    rail.addEventListener('pointerdown', (e) => {
      down = true;
      moved = 0;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
    });
    rail.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.abs(dx);
      if (moved > 6) rail.dataset.dragging = 'true';
      rail.scrollLeft = startLeft - dx;
    });
    const up = () => { down = false; rail.dataset.dragging = 'false'; };
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointerleave', up);
    rail.addEventListener('pointercancel', up);
    // A drag that ends on a card must not also open it.
    rail.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);

    const hint = root.querySelector('[data-rail-hint]');
    if (hint) {
      const sync = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        hint.style.setProperty('--rail-p', max > 0 ? (rail.scrollLeft / max).toFixed(3) : '1');
      };
      rail.addEventListener('scroll', sync, { passive: true });
      sync();
    }
  }

  function setup() {
    initTilt(document);
    initRail(document);
  }

  // Page scripts call this once their markup is in the DOM.
  window.swizzMotion = { refresh: setup };

  if (typeof onPageReady === 'function') onPageReady(setup);
  else document.addEventListener('DOMContentLoaded', setup);
})();
