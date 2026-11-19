import globalStylesUrl from "./globalStyles.css?url";

/**
 * The app-wide sheets go at the end of the body, after the sheets each screen adds to
 * the head as its code loads. So they keep the last word in the cascade, however
 * late a screen loads, exactly as when all styles shipped in one file.
 */
function attachGlobalStyles() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = globalStylesUrl;
  const loaded = new Promise<void>((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("The app's styles could not load."));
  });
  document.body.append(link);
  return loaded;
}

/** Longest the first render waits for the app's font before it shows the fallback face. */
const FONT_WAIT_MS = 1500;

/**
 * Text drawn before the font arrives would reflow when it swaps in. Asking for it here
 * starts its download with the entry, usually long before the first screen is ready.
 */
function appFontReady() {
  return Promise.race([
    document.fonts.load('1em "DM Sans"'),
    new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

export const globalStylesReady = Promise.all([
  attachGlobalStyles(),
  appFontReady(),
]);
