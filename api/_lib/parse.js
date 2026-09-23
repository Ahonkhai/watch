/* Turning a photo caption into a listing.
 *
 * The format is what someone can actually type on a phone while holding a
 * watch: one pipe-separated line of facts, then prose. Everything after the
 * first line is optional, and the bot shows you what it understood before
 * anything is published, so a mistake costs a tap rather than a deploy. */

export const CONDITIONS = ['Unworn', 'Excellent', 'Very good', 'Good'];
export const SETS = ['Full set', 'Watch and box', 'Watch and papers', 'Watch only'];

const FIELDS = ['brand', 'name', 'reference', 'year', 'condition', 'set', 'price', 'size', 'movement'];

/* Match loosely against a known vocabulary so "full set", "FULL SET" and
 * "Full Set" all land on the same value the shop filters on. */
function match(value, vocabulary) {
  const v = String(value).trim().toLowerCase();
  return vocabulary.find((x) => x.toLowerCase() === v) || null;
}

export function parseCaption(caption) {
  const text = String(caption || '').replace(/^\/add\b[ \t]*/i, '').trim();
  if (!text) return { ok: false, errors: ['The caption was empty.'] };

  const lines = text.split(/\r?\n/);
  const factLine = lines.shift();
  const parts = factLine.split('|').map((s) => s.trim());

  if (parts.length < 7) {
    return {
      ok: false,
      errors: [`The first line needs at least 7 fields separated by | — it had ${parts.length}.`],
    };
  }

  const raw = {};
  FIELDS.forEach((f, i) => { raw[f] = parts[i] ?? ''; });

  const errors = [];
  const listing = {};

  listing.brand = raw.brand;
  if (!listing.brand) errors.push('Brand is missing.');

  listing.name = raw.name;
  if (!listing.name) errors.push('Model name is missing.');

  listing.reference = raw.reference;
  if (!listing.reference) errors.push('Reference is missing.');

  listing.year = Number(String(raw.year).replace(/\D/g, ''));
  if (!listing.year || listing.year < 1900 || listing.year > new Date().getFullYear() + 1) {
    errors.push(`Year "${raw.year}" does not look like a year.`);
  }

  listing.condition = match(raw.condition, CONDITIONS);
  if (!listing.condition) errors.push(`Condition must be one of: ${CONDITIONS.join(', ')}.`);

  listing.set = match(raw.set, SETS);
  if (!listing.set) errors.push(`Set must be one of: ${SETS.join(', ')}.`);

  listing.price = Number(String(raw.price).replace(/[^0-9.]/g, ''));
  if (!listing.price || listing.price <= 0) errors.push(`Price "${raw.price}" is not a number.`);

  listing.size = Number(String(raw.size).replace(/[^0-9.]/g, '')) || null;
  listing.movement = raw.movement ? raw.movement.trim().toLowerCase() : null;

  /* The rest of the caption: tagline, description, then an optional run of
   * "Key: value" lines that become the specification table. */
  const rest = lines.join('\n').trim();
  const blocks = rest ? rest.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean) : [];

  const specs = {};
  while (blocks.length) {
    const last = blocks[blocks.length - 1];
    const rows = last.split(/\r?\n/);
    const isSpecBlock = rows.length > 0 && rows.every((r) => /^[^:\n]{2,40}:\s*\S/.test(r));
    if (!isSpecBlock) break;
    rows.forEach((r) => {
      const at = r.indexOf(':');
      specs[r.slice(0, at).trim()] = r.slice(at + 1).trim();
    });
    blocks.pop();
  }

  listing.tagline = blocks.shift() || '';
  listing.description = blocks.join('\n\n');
  listing.specs = specs;

  /* Fall back to the specification table for the two fields that drive the
   * shop's facets, so they rarely have to be typed twice. */
  if (!listing.size) {
    const d = Object.entries(specs).find(([k]) => /case (diameter|size)/i.test(k));
    if (d) listing.size = Number(String(d[1]).replace(/[^0-9.]/g, '')) || null;
  }
  if (!listing.movement) {
    const m = Object.values(specs).join(' ');
    if (/quartz/i.test(m)) listing.movement = 'quartz';
    else if (/manual|hand.?wound|manual winding/i.test(m)) listing.movement = 'manual';
    else if (/automatic|self.?winding/i.test(m)) listing.movement = 'automatic';
  }

  return { ok: errors.length === 0, errors, listing };
}

export const USAGE = [
  'Send the photos with this as the caption:',
  '',
  '<code>Rolex | Submariner Date | 126610LN | 2023 | Unworn | Full set | 14200 | 41 | automatic</code>',
  '<code>Oystersteel on Oyster bracelet, black Cerachrom bezel.</code>',
  '<code></code>',
  '<code>Unworn 2023 example with stickers intact, supplied with the original box and card.</code>',
  '<code></code>',
  '<code>Case material: Oystersteel</code>',
  '<code>Movement: Rolex calibre 3235, automatic</code>',
  '<code>Water resistance: 300 m</code>',
  '',
  'First line: brand | model | reference | year | condition | set | price | size | movement.',
  'Size and movement are optional if the spec lines cover them.',
  'Then the tagline, a blank line, the description, a blank line, and any Key: value spec rows.',
  '',
  `Condition: ${CONDITIONS.join(' / ')}`,
  `Set: ${SETS.join(' / ')}`,
].join('\n');
