/* Is the bot wired up?
 *
 * Reaching this at all proves the api/ directory deployed as functions, which
 * is the first thing to rule out when nothing happens after setWebhook. It
 * It reports which configuration is PRESENT, never whether a value is
 * correct, and never the value of a secret. The two values it does echo — the
 * target repository and branch — are not secret: they are in the public
 * README, and seeing them is how you catch a bot pointed at the wrong place.
 * Nothing else may be added to this response without that test still passing. */

const REQUIRED = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ALLOWED_IDS',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'GITHUB_BRANCH',
];

/* Does the deployment actually carry the media the catalogue points at?
 *
 * A serverless function cannot read the static files beside it, but it can
 * fetch its own site, which is the same thing the browser does — so this
 * answers "is the video really there" without anyone guessing. Range
 * bytes=0-0 asks for one byte, so checking a 12 MB video costs nothing. */
async function checkMedia(origin) {
  const src = await fetch(`${origin}/assets/js/listings.js`, { cache: 'no-store' });
  if (!src.ok) return { error: `listings.js returned ${src.status}` };

  const text = await src.text();
  const catalogue = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

  const paths = [];
  for (const p of catalogue.products) {
    (p.images || []).forEach((i) => paths.push({ id: p.id, kind: 'photo', path: i }));
    if (p.video) paths.push({ id: p.id, kind: 'video', path: p.video });
  }

  const checked = await Promise.all(paths.map(async (m) => {
    try {
      const r = await fetch(`${origin}/${m.path}`, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
      return { ...m, status: r.status, type: r.headers.get('content-type'),
               bytes: Number(r.headers.get('content-range')?.split('/')[1]) || null };
    } catch (e) {
      return { ...m, status: 'fetch failed', error: String(e.message).slice(0, 120) };
    }
  }));

  const broken = checked.filter((m) => m.status !== 200 && m.status !== 206);
  return {
    listingsUpdated: catalogue.updated,
    stock: catalogue.products.length,
    media: checked,
    ok: broken.length === 0,
    broken,
  };
}

export default async function handler(req, res) {
  const missing = REQUIRED.filter((k) => !String(process.env[k] || '').trim());

  /* A count, not the ids themselves: who may drive the bot is not public. */
  const operators = String(process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean).length;

  res.setHeader('Cache-Control', 'no-store');

  /* /api/health?media=1 — is every photograph and video the catalogue names
     really being served by this deployment? */
  if (req.query?.media !== undefined || /[?&]media(=|&|$)/.test(req.url || '')) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${req.headers.host}`;
    try {
      const report = await checkMedia(origin);
      return res.status(report.ok ? 200 : 503).json({ origin, ...report });
    } catch (e) {
      return res.status(500).json({ origin, error: String(e.message).slice(0, 300) });
    }
  }

  res.status(missing.length ? 503 : 200).json({
    functions: 'deployed',
    configured: missing.length === 0,
    missing,
    operators,
    repo: process.env.GITHUB_REPO || null,     // not a secret; it is a public repo
    branch: process.env.GITHUB_BRANCH || null,
    hint: missing.length
      ? 'Set these in Vercel → Settings → Environment Variables, then redeploy.'
      : 'Configured. If Telegram still does nothing, check getWebhookInfo for last_error_message.',
  });
}
