/* Playwright lives in a different place depending on how it was installed.
   Try the normal import first, then the path this container puts it at. */
let mod;
try {
  mod = await import('playwright');
} catch {
  mod = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
}
export const { chromium } = mod;
