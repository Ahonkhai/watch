/* Motion engine.
   One rAF loop drives everything that depends on scroll or pointer position,
   so there is a single place that reads layout and a single place that writes
   transforms. Every effect here is decoration: if this file fails to load the
   site still works. */

(function () {
  if (typeof prefersReducedMotion === 'function' && prefersReducedMotion()) {
    // Still expose the curtain API so callers don't have to branch.
    window.kestrelCurtain = { close: (done) => done && done(), open() {} };
    return;
  }

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- curtain ---------- */

  let curtain = null;

  function mountCurtain() {
    curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('data-curtain', '');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = '<span class="curtain-mark">Kestrel &amp; Co.</span>';
    document.body.appendChild(curtain);

    // The preview build opts out so the first painted frame is the page itself.
    if (window.KESTREL_INTRO === false) {
      curtain.style.transition = 'none';
      curtain.dataset.state = 'open';
      requestAnimationFrame(() => { curtain.style.transition = ''; });
    } else {
      setTimeout(() => { curtain.dataset.state = 'open'; }, 620);
    }
  }

  window.kestrelCurtain = {
    close(done) {
      if (!curtain) return done && done();
      curtain.dataset.state = '';
      setTimeout(() => done && done(), 640);
    },
    open() {
      if (curtain) requestAnimationFrame(() => { curtain.dataset.state = 'open'; });
    },
  };

  /* ---------- word-level headline reveal ---------- */

  function splitWords(root) {
    root.querySelectorAll('[data-split]:not([data-split-done])').forEach((el) => {
      el.setAttribute('data-split-done', '');
      el.classList.add('split');
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((word, i) => {
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = document.createElement('span');
        inner.textContent = word;
        inner.style.setProperty('--d', `${Math.min(i, 14) * 0.055}s`);
        outer.appendChild(inner);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.setAttribute('data-reveal', '');
    });
  }

  /* ---------- scroll engine ---------- */

  let progressEl = null;
  let parallax = [];
  let lastScroll = -1;
  let needsMeasure = true;

  function collect() {
    parallax = [...document.querySelectorAll('[data-parallax]')];
    needsMeasure = true;
  }

  function readScroll() {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const y = window.scrollY;

    if (progressEl) {
      progressEl.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');
    }

    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue;
      const t = (r.top + r.height / 2 - vh / 2) / vh;   // 0 at centre screen
      const depth = Number(el.dataset.parallax) || 1;
      el.style.setProperty('--sy', `${(t * -52 * depth).toFixed(1)}px`);
      el.style.setProperty('--sc', (1 - Math.min(Math.abs(t), 1) * 0.07 * depth).toFixed(4));
    }

  }

  /* ---------- pointer ---------- */

  let px = -100, py = -100, rx = -100, ry = -100;
  let dot = null, ring = null;

  const HOT = 'a, button, .swatch, .check, select, input[type="range"], [data-strap], [data-add]';

  function mountCursor() {
    if (!fine) return;
    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    document.body.dataset.cursor = 'on';

    document.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      dot.style.setProperty('--dx', `${px}px`);
      dot.style.setProperty('--dy', `${py}px`);
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      document.body.dataset.hot = String(!!e.target.closest(HOT));
    }, { passive: true });

    document.addEventListener('pointerleave', () => { document.body.dataset.cursor = 'off'; });
    document.addEventListener('pointerenter', () => { document.body.dataset.cursor = 'on'; });
  }

  /* ---------- magnetic controls ---------- */

  function initMagnetic() {
    if (!fine) return;
    document.addEventListener('pointermove', (e) => {
      document.querySelectorAll('.magnetic').forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const reach = Math.max(r.width, r.height) * 0.9;
        const dist = Math.hypot(dx, dy);
        if (dist < reach) {
          const pull = (1 - dist / reach) * 0.32;
          el.style.setProperty('--mx', `${(dx * pull).toFixed(1)}px`);
          el.style.setProperty('--my', `${(dy * pull).toFixed(1)}px`);
        } else if (el.style.getPropertyValue('--mx') !== '0px') {
          el.style.setProperty('--mx', '0px');
          el.style.setProperty('--my', '0px');
        }
      });
    }, { passive: true });
  }

  /* ---------- drag the product to tilt it ---------- */

  function initTilt(root) {
    const stage = root.querySelector('.pdp-stage');
    if (!stage || stage.dataset.tilt) return;
    stage.dataset.tilt = 'on';
    let dragging = false, sx = 0, sy = 0, tx = 0, ty = 0;

    stage.addEventListener('pointerdown', (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      stage.dataset.dragging = 'true';
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      ty = Math.max(-26, Math.min(26, (e.clientX - sx) * 0.22));
      tx = Math.max(-20, Math.min(20, -(e.clientY - sy) * 0.18));
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

  /* ---------- drag the rail ---------- */

  function initRail(root) {
    const rail = root.querySelector('[data-rail]');
    if (!rail || rail.dataset.bound) return;
    rail.dataset.bound = 'on';
    let down = false, startX = 0, startLeft = 0, moved = 0;

    rail.addEventListener('pointerdown', (e) => {
      down = true; moved = 0;
      startX = e.clientX; startLeft = rail.scrollLeft;
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

  /* ---------- boot ---------- */

  function setup() {
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'progress';
      document.body.appendChild(progressEl);
      mountCurtain();
      mountCursor();
      initMagnetic();
      window.addEventListener('resize', collect, { passive: true });
      window.addEventListener('scroll', () => { needsMeasure = true; }, { passive: true });
    }
    splitWords(document);
    initTilt(document);
    initRail(document);
    collect();
    if (typeof observeReveals === 'function') observeReveals(document);
    readScroll();
  }

  function frame() {
    if (needsMeasure || window.scrollY !== lastScroll) {
      lastScroll = window.scrollY;
      needsMeasure = false;
      readScroll();
    }
    if (ring) {
      rx = lerp(rx, px, 0.16);
      ry = lerp(ry, py, 0.16);
      ring.style.setProperty('--rx', `${rx.toFixed(1)}px`);
      ring.style.setProperty('--ry', `${ry.toFixed(1)}px`);
    }
    requestAnimationFrame(frame);
  }

  window.kestrelMotion = {
    refresh() {
      splitWords(document);
      initTilt(document);
      initRail(document);
      collect();
      if (typeof observeReveals === 'function') observeReveals(document);
      readScroll();
    },
  };

  if (typeof onPageReady === 'function') onPageReady(setup);
  else document.addEventListener('DOMContentLoaded', setup);
  requestAnimationFrame(frame);
})();
