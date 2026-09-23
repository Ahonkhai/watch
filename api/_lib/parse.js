/* Turning what you typed into a listing.
 *
 * Two formats are accepted, because the fast one and the easy one are not the
 * same thing. Labelled lines are the easy one: self-describing, order does not
 * matter, and you can leave a field out. Pipes are the fast one, for when you
 * have listed fifty watches and know the order by heart.
 *
 * FIELDS below is the single definition of what a field is called, how it is
 * validated and what it may hold. Uploading and editing both go through it, so
 * a rule cannot apply in one place and not the other. */

export const CONDITIONS = ['Unworn', 'Excellent', 'Very good', 'Good'];
export const SETS = ['Full set', 'Watch and box', 'Watch and papers', 'Watch only'];

const text = (v) => String(v ?? '').trim();

function oneOf(vocabulary) {
  return (v) => {
    const hit = vocabulary.find((x) => x.toLowerCase() === text(v).toLowerCase());
    return hit ? { value: hit } : { error: `must be one of: ${vocabulary.join(', ')}` };
  };
}

export const FIELDS = {
  brand: {
    label: 'Brand', aliases: ['brand', 'make'], order: 0,
    parse: (v) => (text(v) ? { value: text(v) } : { error: 'cannot be empty' }),
  },
  name: {
    label: 'Model', aliases: ['model', 'name'], order: 1,
    parse: (v) => (text(v) ? { value: text(v) } : { error: 'cannot be empty' }),
  },
  reference: {
    label: 'Reference', aliases: ['ref', 'reference'], order: 2,
    parse: (v) => (text(v) ? { value: text(v) } : { error: 'cannot be empty' }),
  },
  year: {
    label: 'Year', aliases: ['year'], order: 3,
    parse: (v) => {
      const n = Number(text(v).replace(/\D/g, ''));
      const max = new Date().getFullYear() + 1;
      return n >= 1900 && n <= max ? { value: n } : { error: `does not look like a year (1900–${max})` };
    },
  },
  condition: {
    label: 'Condition', aliases: ['condition', 'cond'], order: 4,
    choices: CONDITIONS, parse: oneOf(CONDITIONS),
  },
  set: {
    label: 'Set', aliases: ['set', 'comes with'], order: 5,
    choices: SETS, parse: oneOf(SETS),
  },
  price: {
    label: 'Price', aliases: ['price', 'cost', 'asking'], order: 6,
    parse: (v) => {
      const n = Number(text(v).replace(/[^0-9.]/g, ''));
      return n > 0 ? { value: Math.round(n) } : { error: 'is not a number' };
    },
  },
  size: {
    label: 'Size', aliases: ['size', 'case size'], order: 7, optional: true,
    parse: (v) => {
      if (!text(v)) return { value: null };
      const n = Number(text(v).replace(/[^0-9.]/g, ''));
      return n > 0 && n < 100 ? { value: n } : { error: 'should be a case diameter in mm' };
    },
  },
  movement: {
    label: 'Movement', aliases: ['movement'], order: 8, optional: true,
    choices: ['automatic', 'manual', 'quartz'],
    parse: (v) => (text(v) ? { value: text(v).toLowerCase() } : { value: null }),
  },
  tagline: {
    label: 'Tagline', aliases: ['tagline', 'summary'], order: 9, optional: true, long: true,
    parse: (v) => ({ value: text(v) }),
  },
  description: {
    label: 'Description', aliases: ['description', 'desc', 'notes'], order: 10, optional: true, long: true,
    parse: (v) => ({ value: text(v) }),
  },
};

export const FIELD_ORDER = Object.keys(FIELDS).sort((a, b) => FIELDS[a].order - FIELDS[b].order);
export const REQUIRED = FIELD_ORDER.filter((k) => !FIELDS[k].optional);

const BY_ALIAS = {};
for (const [key, f] of Object.entries(FIELDS)) f.aliases.forEach((a) => { BY_ALIAS[a] = key; });

/* Validate one value for one field — what /edit uses. */
export function parseField(key, raw) {
  const f = FIELDS[key];
  if (!f) return { error: 'unknown field' };
  const r = f.parse(raw);
  return r.error ? { error: `${f.label} ${r.error}` } : r;
}

/* ---------- the two caption formats ---------- */

function parseLabelled(lines) {
  const listing = {}, specs = {}, errors = [], seen = new Set();
  let inSpecs = false;

  for (const line of lines) {
    const row = line.trim();
    if (!row) continue;
    if (/^specs?\s*:?\s*$/i.test(row)) { inSpecs = true; continue; }

    const at = row.indexOf(':');
    if (at < 1) continue;                       // prose without a label is ignored
    const label = row.slice(0, at).trim().toLowerCase();
    const value = row.slice(at + 1).trim();

    const key = inSpecs ? null : BY_ALIAS[label];
    if (key) {
      seen.add(key);
      const r = parseField(key, value);
      if (r.error) errors.push(r.error + '.');
      else listing[key] = r.value;
    } else {
      specs[row.slice(0, at).trim()] = value;   // anything unrecognised is a spec row
    }
  }
  return { listing, specs, errors, seen };
}

function parsePiped(lines) {
  const parts = lines[0].split('|').map((s) => s.trim());
  const listing = {}, errors = [], seen = new Set();

  FIELD_ORDER.filter((k) => !FIELDS[k].long).forEach((key, i) => {
    const raw = parts[i];
    if (raw === undefined || raw === '') {
      if (!FIELDS[key].optional) errors.push(`${FIELDS[key].label} is missing.`);
      return;
    }
    seen.add(key);
    const r = parseField(key, raw);
    if (r.error) errors.push(r.error + '.');
    else listing[key] = r.value;
  });

  /* After the first line: tagline, a blank line, description, then any run of
     Key: value rows at the end becomes the specification table. */
  const rest = lines.slice(1).join('\n').trim();
  const blocks = rest ? rest.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean) : [];
  const specs = {};
  while (blocks.length) {
    const rows = blocks[blocks.length - 1].split(/\r?\n/);
    if (!rows.every((r) => /^[^:\n]{2,40}:\s*\S/.test(r))) break;
    rows.forEach((r) => {
      const at = r.indexOf(':');
      specs[r.slice(0, at).trim()] = r.slice(at + 1).trim();
    });
    blocks.pop();
  }
  listing.tagline = blocks.shift() || '';
  listing.description = blocks.join('\n\n');
  return { listing, specs, errors, seen };
}

export function parseCaption(caption) {
  const body = String(caption || '').replace(/^\/(add|new)\b[ \t]*/i, '').trim();
  if (!body) return { ok: false, errors: ['The caption was empty.'] };

  const lines = body.split(/\r?\n/);
  const piped = lines[0].split('|').length >= 5;
  const { listing, specs, errors, seen } = piped ? parsePiped(lines) : parseLabelled(lines);

  /* A field that failed validation is already reported; saying it is also
     missing would just be the same mistake twice. */
  for (const key of REQUIRED) {
    if (listing[key] === undefined && !seen.has(key)) {
      errors.push(`${FIELDS[key].label} is missing.`);
    }
  }

  listing.specs = specs;
  listing.size ??= null;
  listing.movement ??= null;
  listing.tagline ??= '';
  listing.description ??= '';

  /* Fall back to the specification table for the two fields that drive the
     shop's facets, so they rarely have to be typed twice. */
  if (!listing.size) {
    const d = Object.entries(specs).find(([k]) => /case\s*(diameter|size)/i.test(k));
    if (d) listing.size = Number(String(d[1]).replace(/[^0-9.]/g, '')) || null;
  }
  if (!listing.movement) {
    const blob = Object.values(specs).join(' ');
    if (/quartz/i.test(blob)) listing.movement = 'quartz';
    else if (/manual|hand.?w(ou|i)nd/i.test(blob)) listing.movement = 'manual';
    else if (/automatic|self.?winding/i.test(blob)) listing.movement = 'automatic';
  }

  return { ok: errors.length === 0, errors, listing };
}

/* A template to copy, edit and send back as a caption. Far easier than
 * remembering a field order, and it doubles as the documentation. */
export const TEMPLATE = [
  'Brand: Rolex',
  'Model: GMT-Master II',
  'Ref: 126710BLNR',
  'Year: 2022',
  'Condition: Excellent',
  'Set: Full set',
  'Price: 14500',
  'Size: 40',
  'Movement: automatic',
  'Tagline: Oystersteel on Jubilee bracelet, blue and black bezel.',
  'Description: Worn lightly, no notable marks. Box and card present.',
  'Specs:',
  'Case material: Oystersteel',
  'Movement: Rolex calibre 3285, automatic',
  'Water resistance: 100 m',
].join('\n');

export const USAGE = [
  '<b>Listing a watch</b>',
  '',
  'Send the photographs (and a video if you have one) with a caption like this:',
  '',
  `<pre>${TEMPLATE}</pre>`,
  '',
  'Send /new to get that as a message you can copy and edit.',
  '',
  'Order does not matter and you can leave out Size, Movement, Tagline and',
  'Description — you can fill them in afterwards with /edit.',
  'Anything under <b>Specs:</b> becomes a row in the specification table.',
  '',
  `<b>Condition</b>  ${CONDITIONS.join(' / ')}`,
  `<b>Set</b>  ${SETS.join(' / ')}`,
  '',
  '<b>Commands</b>',
  '/list — everything in stock',
  '/edit 126710BLNR — change any field, or the photographs',
  '/price 126710BLNR 13900 — quick reprice',
  '/sold 126710BLNR — take it off the site',
  '/new — a template to copy',
].join('\n');
