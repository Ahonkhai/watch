# Listing photographs

Written by the Telegram bot, one directory per listing:

```
assets/img/<listing-id>/01.jpg, 02.jpg, …
```

The bot creates these on publish and deletes them when a watch is marked sold.
Files here are referenced by `images` in `assets/js/listings.js`; adding a
photograph by hand means adding its path there too, and `listings.js` is
rewritten wholesale by the bot, so that edit would not survive. Use the bot.
