# The listing bot

Upload a watch to the shop by sending photos to a Telegram bot. There is no
database and no admin panel: the bot commits to this repository, and Vercel
redeploys. A listing is live under a minute after you tap Publish.

```
you ──▶ Telegram ──▶ /api/telegram ──▶ commit to this repo ──▶ Vercel ──▶ site
```

## Listing a watch

Select the photographs — and a video if you have one — and put the details in
the caption. Send **/new** and the bot hands you this to copy and fill in:

```
Brand: Rolex
Model: GMT-Master II
Ref: 126710BLNR
Year: 2022
Condition: Excellent
Set: Full set
Price: 14500
Size: 40
Movement: automatic
Tagline: Oystersteel on Jubilee bracelet, blue and black bezel.
Description: Worn lightly, no notable marks. Box and card present.
Specs:
Case material: Oystersteel
Movement: Rolex calibre 3285, automatic
Water resistance: 100 m
```

Order does not matter. You can leave out **Size, Movement, Tagline and
Description** and fill them in later. Everything under `Specs:` becomes a row
in the specification table. Case does not matter (`full set` works), and the
price can be `14500`, `14,500` or `$14,500`.

Condition must be one of: Unworn, Excellent, Very good, Good.
Set must be one of: Full set, Watch and box, Watch and papers, Watch only.

Forgot the caption? Send the photos anyway — the bot asks, and you reply with
the details. Pasted the details with no photos? That works too; add them after.

### Adding media to a watch already listed

Send the photographs or video, then send the reference on its own:

```
126710BLNR
```

They are added to that listing and the site redeploys. Type it as an ordinary
message or as a reply — both work. This is the order you actually work in:
photograph the watch, then say which one it is, rather than opening `/edit`
before you shoot.

A reference on its own with **nothing staged** opens that listing for editing,
the same as `/edit 126710BLNR`.

Anything longer than a single word is read as the details for a new listing,
so the two cannot be confused.

**The faster shorthand.** Once the order is in your head, one pipe-separated
line does the same job:

```
Rolex | GMT-Master II | 126710BLNR | 2022 | Excellent | Full set | 14500 | 40 | automatic
Oystersteel on Jubilee bracelet, blue and black bezel.

Worn lightly, no notable marks.
```

### The preview

The bot replies with a card showing what it understood, a button for every
field, and **Publish** / **Discard**. Nothing reaches the site until you tap
Publish. Tap any field to correct it first — that costs no deploy, because
drafts are staged with `[skip ci]`.

If a field is wrong the bot names it and keeps your media; reply with a
correction rather than starting over.

## Videos

Send a video in the same album as the photographs and it is published with the
listing. On the site the photographs come first and the video sits last in the
thumbnail strip, marked with a play symbol.

Two limits, both real:

- **20 MB.** Telegram will not hand a bot a bigger file, whatever your plan.
  The bot says so with the actual size rather than failing silently.
- **Videos live in git**, like the photographs. Short clips are fine; a
  habit of 15 MB videos will make the repository heavy. The bot warns above
  8 MB. If it ever becomes a problem, the fix is to point the publish step at
  blob storage — one function.

One video per listing. Send a second and it replaces nothing; only the first
in an album is used, and the bot says so.

## Editing

`/edit 126710BLNR` (or `/edit` with the listing id) opens a menu with a button
for every field:

Brand · Model · Reference · Year · Condition · Set · Price · Size · Movement ·
Tagline · Description · Media · Specs

- **Condition, Set and Movement** are buttons — no typing, no way to enter a
  value the shop cannot filter on. The current value is marked with a dot.
- **Everything else** prompts you to reply with the new value, and validates
  it the same way an upload is validated. `free` is not a price.
- **Media** lets you reply with more photographs or a video, added to the
  listing.
- **Specs** replaces the whole specification table with the rows you send.

Changing **Brand** or **Reference** renames the listing, because the id and
the image paths are built from them. The bot moves the media in the same
commit, so nothing points at a file that has moved, and it refuses a rename
that would collide with an existing listing.

`/list` shows everything in stock with an `/edit` shortcut per row.

## The other commands

| | |
|---|---|
| `/new` | The template above, to copy |
| `/list` | Everything in stock, with photo counts and edit shortcuts |
| `/edit 126710BLNR` | Change any field, or add media |
| `/price 126710BLNR 13900` | Quick reprice without opening the menu |
| `/sold 126710BLNR` | Remove from the site — asks first |
| `/help` | The caption format, and registers the `/` menu |

Send `/help` once after setup: it registers the command menu so typing `/` in
Telegram lists everything instead of you having to remember.

`/sold` deletes the listing and its media from the site. Both stay in git
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

> If this Vercel project was reused from another repository, it still carries
> that project's environment variables. They are ignored — the bot reads only
> the six names below — but a stale `BOT_TOKEN` sitting there is a live secret
> in a project with no use for it. Delete the ones that are not in this table,
> after checking nothing else still deploys from this project.


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

### 6. Check it took

```
https://<your-domain>/api/health
```

- **404** — the functions did not deploy. Check Vercel → Settings → Build &
  Deployment is on its defaults and that `api/` is in the repository.
- **503** — deployed, but `missing` names the variables still to set.
- **200** — ready. Send `/help` to your bot.

This endpoint reports which variables are *present*. It never returns a secret
and never says whether a value is correct.

## How it works, and why

### Editing without a database

The bot stamps a marker into its own message — `#t-listing-<id>` or
`#t-draft-<group>` — and Telegram hands that message back on every button tap
and every reply. So the bot always knows what is being edited without
remembering anything between calls, and `callback_data` carries the field name
only, which keeps it well inside Telegram's 64-byte limit however long an id
gets.

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
