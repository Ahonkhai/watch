# Tests

No framework and no dependencies beyond Playwright.

```bash
node tests/run.mjs              # everything
node tests/run.mjs bot dealer   # just those
```

`run.mjs` starts the two servers the browser suites need and stops them
afterwards, so there is nothing to set up and nothing left listening. Each
suite is also a plain script you can run on its own, given the servers.

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

| | |
|---|---|
| `dealer.mjs` | listings, facets, the bag, checkout, the Telegram hand-off |
| `csp.mjs` | every page under the production CSP, served with `vercel.json`'s real headers |
| `preview.mjs` | the single-file hash-routed build |
| `reduced.mjs` | `prefers-reduced-motion` |

Counts come from `assets/js/listings.js` at run time, never from a literal:
the shop's stock is written by the bot and changes whenever a watch is listed
or sold, and a suite that fails when someone does their job is worse than no
suite.

`dealer.mjs` asserts some things that are easy to regress and embarrassing to
ship: that no listing shows a photograph of a different watch, that checkout
never asks for card details, and that no invented provenance (a workshop, a
warranty, a history) has crept back into the copy.
