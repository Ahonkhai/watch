/* Procedural watch illustration.
   Draws a product as inline SVG from its `art` block and a chosen strap, so the
   catalog needs no photography. Deterministic: same product + strap always
   renders identically. */

const CASE_METALS = {
  steel:    { light: '#EDF1F4', mid: '#A7B0B8', dark: '#6E767E', edge: '#D5DCE2' },
  gold:     { light: '#F7E2AE', mid: '#C9A04A', dark: '#8A6624', edge: '#EBCE87' },
  bronze:   { light: '#EBCB96', mid: '#B07C3F', dark: '#74501F', edge: '#D9B071' },
  titanium: { light: '#D5DADD', mid: '#939A9E', dark: '#616A6E', edge: '#BCC2C6' },
  black:    { light: '#555B60', mid: '#26292D', dark: '#101214', edge: '#3E4448' },
};

const CX = 160, CY = 220;
const R_CASE = 99, R_BEZEL_IN = 83, R_DIAL = 82;

/* Relative luminance, used to pick dial-contrasting ink instead of trusting a flag. */
function luminance(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000');
  if (!m) return 0;
  const [r, g, b] = [1, 2, 3].map((i) => {
    const c = parseInt(m[i], 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLightDial(art) { return luminance(art.dial) > 0.4; }
function dialInk(art) { return isLightDial(art) ? '#1B1E22' : '#F0EDE6'; }

function polar(angleDeg, radius) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

/* ---------- straps ---------- */

function strapBracelet(color, isTop) {
  const out = [];
  const h = 15, gap = 3.5;
  for (let i = 0; i < 9; i++) {
    const y = isTop ? 116 - i * (h + gap) - h : 324 + i * (h + gap);
    if (y < -30 || y > 470) continue;
    const w = 62 - i * 1.9;          // taper toward the clasp
    const cw = w * 0.34;             // centre link, polished
    out.push(
      `<rect x="${CX - w / 2}" y="${y}" width="${w}" height="${h}" rx="3"
         fill="url(#braceletGrad)"/>` +
      `<rect x="${CX - cw / 2}" y="${y}" width="${cw}" height="${h}" rx="2"
         fill="url(#linkGrad)"/>` +
      `<line x1="${CX - cw / 2}" y1="${y}" x2="${CX - cw / 2}" y2="${y + h}"
         stroke="rgba(0,0,0,.4)" stroke-width="0.8"/>` +
      `<line x1="${CX + cw / 2}" y1="${y}" x2="${CX + cw / 2}" y2="${y + h}"
         stroke="rgba(0,0,0,.4)" stroke-width="0.8"/>` +
      `<rect x="${CX - w / 2}" y="${y}" width="${w}" height="1.1"
         fill="rgba(255,255,255,.22)"/>`
    );
  }
  return `<g>${out.join('')}</g>`;
}

function strapLeather(color, isTop) {
  const y0 = isTop ? -20 : 322;
  const y1 = isTop ? 120 : 462;
  const wTop = isTop ? 50 : 60;
  const wBot = isTop ? 60 : 50;
  const path =
    `M ${CX - wTop / 2} ${y0} L ${CX + wTop / 2} ${y0} ` +
    `L ${CX + wBot / 2} ${y1} L ${CX - wBot / 2} ${y1} Z`;
  const stitch = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let t = 0; t <= 1.001; t += 0.1) {
      const w = wTop + (wBot - wTop) * t;
      pts.push(`${CX + side * (w / 2 - 7)},${y0 + (y1 - y0) * t}`);
    }
    stitch.push(
      `<polyline points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,.34)"
         stroke-width="1.6" stroke-dasharray="5 5" stroke-linecap="round"/>`
    );
  }
  return (
    `<path d="${path}" fill="${color}"/>` +
    `<path d="${path}" fill="url(#strapShade)"/>` +
    stitch.join('')
  );
}

function strapRubber(color, isTop) {
  const y0 = isTop ? -20 : 322;
  const y1 = isTop ? 120 : 462;
  const ribs = [];
  for (let y = y0 + 14; y < y1 - 6; y += 16) {
    const t = (y - y0) / (y1 - y0);
    const w = (isTop ? 52 + 10 * t : 62 - 10 * t) - 16;
    ribs.push(
      `<rect x="${CX - w / 2}" y="${y}" width="${w}" height="6" rx="3"
         fill="rgba(0,0,0,.35)"/>`
    );
  }
  const wTop = isTop ? 52 : 64, wBot = isTop ? 64 : 52;
  const path =
    `M ${CX - wTop / 2} ${y0} L ${CX + wTop / 2} ${y0} ` +
    `L ${CX + wBot / 2} ${y1} L ${CX - wBot / 2} ${y1} Z`;
  return `<path d="${path}" fill="${color}"/>${ribs.join('')}` +
         `<path d="${path}" fill="url(#strapShade)"/>`;
}

function strapNato(color, isTop) {
  const y0 = isTop ? -20 : 322;
  const y1 = isTop ? 120 : 462;
  const w = 58;
  const stripe = `<rect x="${CX - 9}" y="${y0}" width="18" height="${y1 - y0}"
      fill="rgba(0,0,0,.28)"/>`;
  const hw = `<rect x="${CX - w / 2 - 3}" y="${isTop ? 74 : 344}" width="${w + 6}" height="13"
      rx="3" fill="url(#hardwareGrad)"/>`;
  return (
    `<rect x="${CX - w / 2}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${color}"/>` +
    stripe +
    `<rect x="${CX - w / 2}" y="${y0}" width="${w}" height="${y1 - y0}" fill="url(#strapShade)"/>` +
    hw
  );
}

function renderStrap(strap, isTop) {
  const fn = { bracelet: strapBracelet, leather: strapLeather,
               rubber: strapRubber, nato: strapNato }[strap.type] || strapLeather;
  return fn(strap.color, isTop);
}

/* ---------- bezel variants ---------- */

function bezelDive(art) {
  const ticks = [];
  for (let i = 0; i < 60; i += 1) {
    const ang = i * 6;
    const major = i % 5 === 0;
    const [x1, y1] = polar(ang, R_CASE - 5);
    const [x2, y2] = polar(ang, R_CASE - (major ? 14 : 10));
    ticks.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
         stroke="rgba(255,255,255,${major ? 0.85 : 0.4})" stroke-width="${major ? 2.4 : 1.2}"
         stroke-linecap="round"/>`
    );
  }
  const [px, py] = polar(0, R_CASE - 11);
  return (
    `<circle cx="${CX}" cy="${CY}" r="${(R_CASE + R_BEZEL_IN) / 2}"
       fill="none" stroke="${art.bezelColor}" stroke-width="${R_CASE - R_BEZEL_IN}"/>` +
    ticks.join('') +
    `<circle cx="${px}" cy="${py}" r="4.6" fill="${art.lume || art.accent}"/>`
  );
}

function bezelGmt(art) {
  const half = [];
  for (const [from, to, fill] of [[0, 180, art.bezelColor], [180, 360, '#8C2F22']]) {
    const [x1, y1] = polar(from, (R_CASE + R_BEZEL_IN) / 2);
    const [x2, y2] = polar(to, (R_CASE + R_BEZEL_IN) / 2);
    half.push(
      `<path d="M ${x1} ${y1} A ${(R_CASE + R_BEZEL_IN) / 2} ${(R_CASE + R_BEZEL_IN) / 2} 0 0 1 ${x2} ${y2}"
         fill="none" stroke="${fill}" stroke-width="${R_CASE - R_BEZEL_IN}"/>`
    );
  }
  const labels = [];
  for (let h = 0; h < 24; h += 2) {
    const ang = h * 15;
    const [tx, ty] = polar(ang, R_CASE - 9.5);
    labels.push(
      `<text x="${tx}" y="${ty}" font-size="8" font-family="Inter, system-ui, sans-serif"
         font-weight="600" fill="rgba(255,255,255,.92)" text-anchor="middle"
         dominant-baseline="central" transform="rotate(${ang} ${tx} ${ty})">${h}</text>`
    );
  }
  return half.join('') + labels.join('');
}

function bezelWorldtimer(art) {
  const cities = ['LON', 'PAR', 'CAI', 'MOW', 'DXB', 'KHI', 'DAC', 'BKK', 'HKG', 'TYO',
                  'SYD', 'NOU', 'AKL', 'MDY', 'HNL', 'ANC', 'LAX', 'DEN', 'CHI', 'NYC',
                  'CCS', 'RIO', 'FEN', 'AZO'];
  const labels = cities.map((c, i) => {
    const ang = i * 15;
    const [tx, ty] = polar(ang, R_CASE - 10);
    return `<text x="${tx}" y="${ty}" font-size="5.6" font-family="Inter, system-ui, sans-serif"
        font-weight="600" letter-spacing="0.2" fill="rgba(255,255,255,.82)" text-anchor="middle"
        dominant-baseline="central" transform="rotate(${ang} ${tx} ${ty})">${c}</text>`;
  });
  return (
    `<circle cx="${CX}" cy="${CY}" r="${(R_CASE + R_BEZEL_IN) / 2}"
       fill="none" stroke="${art.bezelColor}" stroke-width="${R_CASE - R_BEZEL_IN}"/>` +
    labels.join('')
  );
}

function bezelCompressor(art) {
  const ticks = [];
  for (let i = 0; i < 60; i += 5) {
    const [x1, y1] = polar(i * 6, R_BEZEL_IN - 2);
    const [x2, y2] = polar(i * 6, R_BEZEL_IN - 11);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round"/>`);
  }
  const [px, py] = polar(0, R_BEZEL_IN - 7);
  return (
    `<circle cx="${CX}" cy="${CY}" r="${(R_CASE + R_BEZEL_IN) / 2}"
       fill="none" stroke="${art.bezelColor}" stroke-width="${R_CASE - R_BEZEL_IN}"/>` +
    ticks.join('') +
    `<circle cx="${px}" cy="${py}" r="3.4" fill="${art.accent}"/>`
  );
}

function bezelPlain(art, width) {
  return `<circle cx="${CX}" cy="${CY}" r="${R_CASE - width / 2}"
     fill="none" stroke="${art.bezelColor}" stroke-width="${width}" opacity=".95"/>`;
}

function renderBezel(art) {
  switch (art.bezel) {
    case 'dive': return bezelDive(art);
    case 'gmt': return bezelGmt(art);
    case 'worldtimer': return bezelWorldtimer(art);
    case 'compressor': return bezelCompressor(art);
    case 'thin': return bezelPlain(art, 8);
    default: return bezelPlain(art, R_CASE - R_BEZEL_IN);
  }
}

/* ---------- dial ---------- */

/* A sunburst dial is hundreds of fine radial brush lines catching the light.
   Ninety alternating strokes is enough to read as one at any size we render. */
function renderDialFinish(art, uid) {
  if (art.finish !== 'sunburst') return '';
  const rays = [];
  for (let i = 0; i < 90; i++) {
    const [x, y] = polar(i * 4, R_DIAL);
    rays.push(
      `<line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}"
         stroke="rgba(255,255,255,${i % 2 ? 0.045 : 0.014})" stroke-width="1.1"/>`
    );
  }
  return `<g clip-path="url(#dialClip)">${rays.join('')}</g>`;
}

function renderIndices(art) {
  const ink = dialInk(art);
  const lume = art.lume;
  const out = [];
  const rOuter = art.bezel === 'compressor' ? R_DIAL - 16 : R_DIAL - 6;

  for (let i = 0; i < 60; i++) {
    const ang = i * 6;
    if (i % 5 === 0) {
      const [x, y] = polar(ang, rOuter - 11);
      if (lume) {
        out.push(
          `<rect x="${x - 4}" y="${y - 9}" width="8" height="18" rx="2"
             fill="${lume}" stroke="${ink}" stroke-opacity=".35" stroke-width="1"
             transform="rotate(${ang} ${x} ${y})"/>`
        );
      } else {
        out.push(
          `<rect x="${x - 1.6}" y="${y - 9}" width="3.2" height="18" rx="1.4"
             fill="${art.accent}" transform="rotate(${ang} ${x} ${y})"/>`
        );
      }
    } else {
      const [x1, y1] = polar(ang, rOuter);
      const [x2, y2] = polar(ang, rOuter - 5);
      out.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}"
           stroke-opacity=".45" stroke-width="1.1" stroke-linecap="round"/>`
      );
    }
  }

  // 12 o'clock marker: doubled baton, the usual orientation cue.
  const [tx, ty] = polar(0, rOuter - 11);
  out.push(
    `<rect x="${tx - 9}" y="${ty - 9}" width="7" height="18" rx="2"
       fill="${lume || art.accent}"/>` +
    `<rect x="${tx + 2}" y="${ty - 9}" width="7" height="18" rx="2"
       fill="${lume || art.accent}"/>`
  );
  return out.join('');
}

function renderSubdial(art) {
  const ink = dialInk(art);
  const [sx, sy] = polar(180, 40);
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    ticks.push(
      `<line x1="${sx + 20 * Math.cos(a)}" y1="${sy + 20 * Math.sin(a)}"
         x2="${sx + 16 * Math.cos(a)}" y2="${sy + 16 * Math.sin(a)}"
         stroke="${ink}" stroke-opacity=".75" stroke-width="1.2"/>`
    );
  }
  return (
    `<circle cx="${sx}" cy="${sy}" r="22" fill="${isLightDial(art) ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.07)'}"
       stroke="${ink}" stroke-opacity=".5" stroke-width="1.2"/>` +
    ticks.join('') +
    `<line x1="${sx}" y1="${sy}" x2="${sx + 9}" y2="${sy - 13}" stroke="${art.accent}"
       stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="${sx}" cy="${sy}" r="2" fill="${art.accent}"/>`
  );
}

function renderMoonphase(art) {
  const [mx, my] = polar(180, 40);
  const stars = [];
  for (let i = 0; i < 14; i++) {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = 4 + (i % 5) * 4;
    stars.push(
      `<circle cx="${mx + r * Math.cos(a) * 2.1}" cy="${my + r * Math.sin(a) * 0.7}"
         r="${0.7 + (i % 3) * 0.3}" fill="#CFE0F0" opacity=".85"/>`
    );
  }
  return (
    `<clipPath id="moonWin"><path d="M ${mx - 26} ${my} a 26 16 0 0 1 52 0 Z
       M ${mx - 26} ${my} a 26 16 0 0 0 52 0 Z"/></clipPath>` +
    `<g clip-path="url(#moonWin)">` +
      `<rect x="${mx - 28}" y="${my - 18}" width="56" height="36" fill="#0C1430"/>` +
      stars.join('') +
      `<circle cx="${mx - 9}" cy="${my - 1}" r="9.5" fill="#EFE3C2"/>` +
      `<circle cx="${mx - 12}" cy="${my - 4}" r="1.8" fill="#D9CBA4"/>` +
      `<circle cx="${mx - 6}" cy="${my + 2}" r="1.3" fill="#D9CBA4"/>` +
    `</g>` +
    `<path d="M ${mx - 26} ${my} a 26 16 0 0 1 52 0 Z M ${mx - 26} ${my} a 26 16 0 0 0 52 0 Z"
       fill="none" stroke="${art.accent}" stroke-width="1.4" opacity=".9"/>`
  );
}

/* ---------- hands ---------- */

const HAND_SHAPES = {
  sword: (len, w) => `M 0 6 L ${-w} 0 L ${-w * 0.55} ${-len + 8} L 0 ${-len}
                      L ${w * 0.55} ${-len + 8} L ${w} 0 Z`,
  syringe: (len, w) => `M ${-w * 0.5} 6 L ${-w * 0.5} ${-len + 22} L ${-w} ${-len + 22}
                        L ${-w} ${-len + 6} L 0 ${-len} L ${w} ${-len + 6}
                        L ${w} ${-len + 22} L ${w * 0.5} ${-len + 22} L ${w * 0.5} 6 Z`,
  dauphine: (len, w) => `M 0 6 L ${-w} ${-len * 0.55} L 0 ${-len} L ${w} ${-len * 0.55} Z`,
  leaf: (len, w) => `M 0 6 C ${-w * 1.4} ${-len * 0.4}, ${-w * 0.8} ${-len * 0.85}, 0 ${-len}
                     C ${w * 0.8} ${-len * 0.85}, ${w * 1.4} ${-len * 0.4}, 0 6 Z`,
};

function hand(style, len, w, fill, angle, lume) {
  const shape = (HAND_SHAPES[style] || HAND_SHAPES.sword)(len, w);
  const lumeFill = lume
    ? `<path d="${(HAND_SHAPES[style] || HAND_SHAPES.sword)(len - 12, w * 0.45)}"
         fill="${lume}" opacity=".9"/>`
    : '';
  return (
    `<g transform="translate(${CX} ${CY}) rotate(${angle})">` +
      `<path d="${shape}" fill="${fill}" stroke="rgba(0,0,0,.28)" stroke-width="0.8"/>` +
      lumeFill +
    `</g>`
  );
}

function renderHands(art) {
  const ink = dialInk(art);
  const style = art.hands || 'sword';
  // 10:10:35 — the pose every catalogue uses, because it frames the dial.
  const hourAngle = 305, minuteAngle = 60, secondAngle = 210;
  const handFill = isLightDial(art) ? '#20242A' : '#E8E4DB';

  let gmtHand = '';
  if (art.bezel === 'gmt') {
    gmtHand =
      `<g transform="translate(${CX} ${CY}) rotate(140)">` +
        `<rect x="-1.6" y="${-R_DIAL + 26}" width="3.2" height="${R_DIAL - 20}" fill="${art.accent}"/>` +
        `<circle cx="0" cy="${-R_DIAL + 30}" r="6.5" fill="none" stroke="${art.accent}" stroke-width="3.2"/>` +
      `</g>`;
  }

  return (
    gmtHand +
    hand(style, R_DIAL - 34, 5.5, handFill, hourAngle, art.lume) +
    hand(style, R_DIAL - 12, 4.2, handFill, minuteAngle, art.lume) +
    `<g transform="translate(${CX} ${CY})">` +
      `<g class="watch-seconds" style="transform:rotate(${secondAngle}deg);transform-origin:0 0">` +
        `<rect x="-0.9" y="${-R_DIAL + 10}" width="1.8" height="${R_DIAL + 12}" rx="0.9"
           fill="${art.accent}"/>` +
        `<circle cx="0" cy="18" r="4" fill="${art.accent}"/>` +
      `</g>` +
    `</g>` +
    `<circle cx="${CX}" cy="${CY}" r="4.4" fill="${ink}" opacity=".9"/>` +
    `<circle cx="${CX}" cy="${CY}" r="2" fill="${art.accent}"/>`
  );
}

/* ---------- case furniture ---------- */

function renderCrown(metal, art) {
  const teeth = [];
  for (let i = 0; i < 9; i++) {
    teeth.push(`<rect x="${CX + R_CASE + 3}" y="${CY - 11 + i * 2.6}" width="9" height="1.5"
      fill="rgba(0,0,0,.32)"/>`);
  }
  const guards =
    art.bezel === 'dive' || art.bezel === 'compressor'
      ? `<path d="M ${CX + R_CASE - 6} ${CY - 22} L ${CX + R_CASE + 6} ${CY - 15}
           L ${CX + R_CASE + 6} ${CY + 15} L ${CX + R_CASE - 6} ${CY + 22} Z"
           fill="url(#caseGrad)"/>`
      : '';
  const secondCrown =
    art.bezel === 'compressor'
      ? `<rect x="${CX + R_CASE - 3}" y="${CY - 54}" width="14" height="20" rx="2.5"
           fill="url(#caseGrad)" stroke="rgba(0,0,0,.3)" stroke-width="0.8"/>`
      : '';
  return (
    guards + secondCrown +
    `<rect x="${CX + R_CASE - 4}" y="${CY - 13}" width="17" height="26" rx="3"
       fill="url(#caseGrad)" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>` +
    teeth.join('')
  );
}

function renderLugs() {
  const out = [];
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const x = CX + sx * 30, y = CY + sy * 80;
      out.push(
        `<path d="M ${x - sx * 10} ${y} L ${x + sx * 12} ${y + sy * 30}
           L ${x + sx * 4} ${y + sy * 38} L ${x - sx * 14} ${y + sy * 12} Z"
           fill="url(#caseGrad)" stroke="rgba(0,0,0,.22)" stroke-width="0.8"/>`
      );
    }
  }
  return out.join('');
}

/* ---------- main ---------- */

const BEAT_CLASS = { quartz: 'beat-quartz', solar: 'beat-quartz' };

function renderWatch(product, opts = {}) {
  const art = product.art;
  const strap = opts.strap || product.straps[0];
  const beat = BEAT_CLASS[product.movement] || 'beat-mech';
  /* `live` runs the seconds hand. Cards start it on hover instead, so a grid
     of twelve watches isn't all ticking at once. */
  const liveClass = opts.live ? ' is-live' : '';
  const metal = CASE_METALS[art.case] || CASE_METALS.steel;
  const ink = dialInk(art);
  const uid = `w-${product.id}-${strap.id}`.replace(/[^a-z0-9-]/gi, '');

  const defs = `
    <defs>
      <linearGradient id="caseGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${metal.light}"/>
        <stop offset="42%" stop-color="${metal.mid}"/>
        <stop offset="68%" stop-color="${metal.edge}"/>
        <stop offset="100%" stop-color="${metal.dark}"/>
      </linearGradient>
      <linearGradient id="braceletGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${metal.dark}"/>
        <stop offset="28%" stop-color="${metal.light}"/>
        <stop offset="60%" stop-color="${metal.mid}"/>
        <stop offset="100%" stop-color="${metal.dark}"/>
      </linearGradient>
      <linearGradient id="hardwareGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${metal.light}"/>
        <stop offset="100%" stop-color="${metal.mid}"/>
      </linearGradient>
      <linearGradient id="strapShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,.45)"/>
        <stop offset="30%" stop-color="rgba(255,255,255,.10)"/>
        <stop offset="70%" stop-color="rgba(255,255,255,.04)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,.45)"/>
      </linearGradient>
      <linearGradient id="linkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${metal.dark}"/>
        <stop offset="45%" stop-color="${metal.light}"/>
        <stop offset="100%" stop-color="${metal.mid}"/>
      </linearGradient>
      <linearGradient id="chamferGrad" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,.75)"/>
        <stop offset="35%" stop-color="rgba(255,255,255,.12)"/>
        <stop offset="62%" stop-color="rgba(255,255,255,.34)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,.35)"/>
      </linearGradient>
      <linearGradient id="sweepGrad" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,.20)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
      <clipPath id="dialClip"><circle cx="${CX}" cy="${CY}" r="${R_DIAL}"/></clipPath>
      <radialGradient id="dialGrad" cx="38%" cy="30%" r="80%">
        <stop offset="0%" stop-color="rgba(255,255,255,.18)"/>
        <stop offset="55%" stop-color="rgba(255,255,255,.02)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,.35)"/>
      </radialGradient>
      <linearGradient id="crystalGlare" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,.26)"/>
        <stop offset="45%" stop-color="rgba(255,255,255,.03)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
      <filter id="caseShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity=".45"/>
      </filter>
    </defs>`;

  const hasComplication = art.subdial || art.moon;
  const dialText =
    `<text x="${CX}" y="${CY - 40}" font-size="11.5" letter-spacing="2.4"
       font-family="Inter, system-ui, sans-serif" font-weight="600" fill="${ink}"
       text-anchor="middle">SWIZZ</text>` +
    `<text x="${CX}" y="${hasComplication ? CY - 25 : CY + 52}" font-size="6.8"
       letter-spacing="1.8" font-family="Inter, system-ui, sans-serif" fill="${ink}"
       fill-opacity=".6" text-anchor="middle">${product.name.toUpperCase()}</text>`;

  const svg = `
<svg class="watch-svg ${beat}${liveClass}" viewBox="0 0 320 440" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="${product.name} on ${strap.name}" data-uid="${uid}">
  ${defs}
  ${renderStrap(strap, true)}
  ${renderStrap(strap, false)}
  ${renderLugs()}
  ${renderCrown(metal, art)}
  <g filter="url(#caseShadow)">
    <circle cx="${CX}" cy="${CY}" r="${R_CASE}" fill="url(#caseGrad)"/>
  </g>
  <circle cx="${CX}" cy="${CY}" r="${R_CASE - 1}" fill="none"
     stroke="url(#chamferGrad)" stroke-width="2.2"/>
  ${renderBezel(art)}
  <circle cx="${CX}" cy="${CY}" r="${R_DIAL}" fill="${art.dial}"/>
  ${renderDialFinish(art, uid)}
  <circle cx="${CX}" cy="${CY}" r="${R_DIAL}" fill="url(#dialGrad)"/>
  ${renderIndices(art)}
  ${art.subdial ? renderSubdial(art) : ''}
  ${art.moon ? renderMoonphase(art) : ''}
  ${dialText}
  ${renderHands(art)}
  <circle cx="${CX}" cy="${CY}" r="${R_DIAL}" fill="url(#crystalGlare)"/>
  <g clip-path="url(#dialClip)">
    <ellipse cx="${CX - 34}" cy="${CY - 46}" rx="72" ry="30" fill="url(#sweepGrad)"
       transform="rotate(-34 ${CX - 34} ${CY - 46})"/>
  </g>
  <circle cx="${CX}" cy="${CY}" r="${R_CASE}" fill="none"
     stroke="rgba(255,255,255,.18)" stroke-width="1"/>
</svg>`;

  // Several watches share a page, so every def id must be unique per instance —
  // otherwise url(#caseGrad) resolves to whichever watch rendered first.
  return namespaceIds(svg, uid);
}

const DEF_IDS = ['caseGrad', 'braceletGrad', 'linkGrad', 'hardwareGrad', 'strapShade',
                 'chamferGrad', 'sweepGrad', 'dialClip', 'dialGrad', 'crystalGlare',
                 'caseShadow', 'moonWin'];

function namespaceIds(svg, uid) {
  for (const id of DEF_IDS) {
    svg = svg.split(`id="${id}"`).join(`id="${id}-${uid}"`)
             .split(`url(#${id})`).join(`url(#${id}-${uid})`);
  }
  return svg;
}
