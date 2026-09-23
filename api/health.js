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

export default function handler(req, res) {
  const missing = REQUIRED.filter((k) => !String(process.env[k] || '').trim());

  /* A count, not the ids themselves: who may drive the bot is not public. */
  const operators = String(process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean).length;

  res.setHeader('Cache-Control', 'no-store');
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
