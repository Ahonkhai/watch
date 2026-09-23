# Tests

No framework and no dependencies beyond Playwright. Each file is a script that
prints PASS/FAIL lines and exits non-zero if anything failed.

## The bot

Runs against a fake GitHub and a fake Telegram, so the whole upload flow is
exercised without deploying anything or touching the real repository.

```bash
node tests/bot/bot.mjs
```

The fake GitHub in `tests/bot/harness.mjs` is a real little content-addressed
store — blobs are hashed, and a tree is applied only when the ref moves — so
the conflict-retry path is genuinely tested rather than stubbed out.

## The site

These need the site being served. In one shell:

```bash
python3 -m http.server 8077        # for dealer, preview, reduced
node tests/hdrserver.mjs           # for csp: serves with vercel.json's headers on :8099
```

Then:

```bash
node tests/dealer.mjs     # listings, facets, bag, checkout, Telegram hand-off
node tests/csp.mjs        # every page under the production CSP
node tests/preview.mjs    # the single-file hash-routed build
node tests/reduced.mjs    # prefers-reduced-motion
```

`dealer.mjs` asserts some things that are easy to regress and embarrassing to
ship: that no listing shows a photograph of a different watch, that checkout
never asks for card details, and that no invented provenance (a workshop, a
warranty, a history) has crept back into the copy.
