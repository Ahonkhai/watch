# The listing bot

Upload a watch to the shop by sending photos to a Telegram bot. There is no
database and no admin panel: the bot commits to this repository, and Vercel
redeploys. A listing is live under a minute after you tap Publish.

```
you ──▶ Telegram ──▶ /api/telegram ──▶ commit to this repo ──▶ Vercel ──▶ site
```

## Listing a watch

Select the photographs, and put this in the caption:

```
Rolex | Submariner Date | 126610LN | 2023 | Unworn | Full set | 14200 | 41 | automatic
Oystersteel on Oyster bracelet, black Cerachrom bezel.

Unworn 2023 example with stickers intact, supplied with the original box,
card and hang tags. Purchased from an authorised dealer.

Case material: Oystersteel
Movement: Rolex calibre 3235, automatic
Water resistance: 300 m
```

- **First line**, separated by `|`: brand, model, reference, year, condition,
  set, price, case size, movement. Size and movement can be left off if the
  spec rows below cover them — the bot reads `Case diameter` and works the
  movement out of the calibre line.
- **Then** the tagline, a blank line, the description, a blank line, and any
  number of `Key: value` rows that become the specification table.
- Condition must be one of: Unworn, Excellent, Very good, Good.
- Set must be one of: Full set, Watch and box, Watch and papers, Watch only.
- Case does not matter (`full set` and `FULL SET` both work), and the price can
  be written `14200`, `14,200` or `$14,200`.

The bot replies with a card showing exactly what it understood, and two
buttons. Nothing reaches the site until you tap **Publish**.

If the caption is wrong, the bot says which field it could not read and keeps
the photographs. Reply to that message with a corrected caption; you do not
need to send the photos again.

A brand the bot has not seen before is added to the shop automatically, so
listing a Grand Seiko needs no code change.

## The other commands

| | |
|---|---|
| `/list` | Everything in stock, with prices, photo counts and ids |
| `/price 126610LN 13900` | Reprice by reference or id |
| `/sold 126610LN` | Remove a watch from the site — asks first |
| `/help` | The caption format |

`/sold` deletes the listing and its photographs from the site. They stay in git
history, so nothing is truly lost.

## Setting it up

### 1. Make the bot

Message [@BotFather](https://t.me/BotFather) → `/newbot`. Keep the token it
gives you; it is the password to the bot.

### 2. Find your Telegram user ID

Message [@userinfobot](https://t.me/userinfobot). It replies with a number.
Only that number will be able to use the bot.

### 3. Make a GitHub token

GitHub → Settings → Developer settings → **Fine-grained personal access
tokens** → Generate new token.

- Repository access: **only** this repository.
- Repository permissions: **Contents: Read and write**. Nothing else.

### 4. Put the secrets in Vercel

Project → Settings → Environment Variables. All of them, in Production:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | any long random string you invent |
| `TELEGRAM_ALLOWED_IDS` | your user ID; comma-separated for more than one person |
| `GITHUB_TOKEN` | the fine-grained token |
| `GITHUB_REPO` | `Ahonkhai/watch` |
| `GITHUB_BRANCH` | `main` |

`GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` are optional and already default to
the repository owner. Do not change them unless you know why — see
[Commit authorship](#commit-authorship).

Redeploy after adding them; environment variables are read at runtime but the
function has to exist first.

### 5. Point Telegram at the site

Once deployed, run this once, substituting your token, your secret and your
domain:

```bash
curl -sS "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H 'Content-Type: application/json' \
  -d '{
        "url": "https://<your-domain>/api/telegram",
        "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
        "allowed_updates": ["message", "callback_query"]
      }'
```

Check it took:

```bash
curl -sS "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`pending_update_count` above zero with a `last_error_message` means the
function is erroring — the message says how.

Then send `/help` to your bot.

## How it works, and why

### Drafts live in the repo

A Telegram album arrives as one webhook call per photograph, milliseconds
apart, and a serverless function keeps nothing between calls. Rather than add
a database to hold a half-finished listing, the bot stages it in the
repository under `.bot/`, and those commits carry `[skip ci]` so Vercel
ignores them. Publishing writes the listing and every photograph in a single
commit without the marker, so one upload is one deploy no matter how many
photos it had.

`.bot/` is in `.vercelignore`, so drafts are never served.

### Nothing is half-applied

Every change goes through one commit built with the Git Data API. A listing
and its photographs land together or not at all; there is no state where the
catalogue points at an image that was not uploaded. If two webhook calls race
each other, the loser rebuilds against the new head and retries.

### The catalogue is a JavaScript file

`assets/js/listings.js` is loaded by a `<script>` tag, not fetched. The site
stays completely static: no loading spinner, no API for the shop to depend on,
and the Content-Security-Policy stays as tight as it was. The bot rewrites
that file whole every time rather than patching it, so a malformed edit cannot
reach the site.

**Do not edit `listings.js` by hand** — the next bot action overwrites it.
Everything that is not stock (the condition and set vocabularies, delivery,
the Telegram handle the shop orders through) lives in `assets/js/data.js`,
which the bot never touches.

### Commit authorship

Vercel's Hobby plan refuses to deploy a commit whose author is not a
collaborator, and it checks every author on the commit. The bot therefore
commits as the repository owner and never adds a co-author trailer. If uploads
start publishing but never appearing, check the Vercel dashboard for
"Deployment Blocked" before looking anywhere else.

## Security

- The webhook rejects any request without the matching
  `X-Telegram-Bot-Api-Secret-Token` header.
- Any Telegram user not in `TELEGRAM_ALLOWED_IDS` gets a silent `200` — no
  reply, no commit, and nothing that tells them the endpoint is real.
- The GitHub token is scoped to one repository and to contents only. Leaked,
  it can change this site and nothing else. Rotate it in GitHub and update the
  Vercel variable; nothing in the code changes.
- The bot token is never sent to a browser. Photographs are downloaded from
  Telegram and re-hosted on the site, because a Telegram file URL contains the
  bot token and would hand the bot to anyone who viewed source.

## Limits worth knowing

- **Photographs go into git.** Telegram compresses them to roughly 100–300 KB,
  so a few hundred listings is comfortable. If the repository ever gets heavy,
  the fix is to point the publish step at blob storage instead — it is one
  function in `api/telegram.js` and the `images` paths it writes.
- **Telegram compresses.** Photos sent as photos are resized. Send them as
  *files* if you want full resolution, and the bot will need a small change to
  accept documents as well as photos.
- **A deploy takes under a minute.** The bot says "live in under a minute"
  rather than "live" because the commit is the last thing it controls.
