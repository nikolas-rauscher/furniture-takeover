import { globalStylesReady } from "./globalStyles";
import { opensWithIntro } from "./firstScreen";
import { isLocalDemo, requestServerConfig } from "./serverConfig";
import { startDemoCatalogRead } from "./demoCatalogRead";

// The entry stays tiny, so the requests the first screen waits for start at once,
// side by side, instead of one after another once the app's libraries have arrived.

function appRoot() {
  const root = document.getElementById("root");
  if (!root) throw new Error("The page has no app root.");
  return root;
}

function showLoadFailure(error: unknown): never {
  appRoot().innerHTML =
    '<main style="padding:32px"><h1>Connection unavailable</h1><p role="alert">takeover could not load. Check your connection and reload the page.</p></main>';
  throw error;
}

function warn(what: string) {
  return (error: unknown) => console.warn(`Could not preload ${what}.`, error);
}

const introFirst = opensWithIntro();
requestServerConfig()
  .then((config) => {
    // The marketplace behind the intro mounts only once the intro ends.
    if (isLocalDemo(config) && !introFirst) startDemoCatalogRead();
  })
  .catch(warn("the server's setup"));
// The shell shows the loading status while the first screen arrives.
Promise.all([import("./bootstrap"), globalStylesReady])
  .then(([{ renderApp }]) => renderApp(appRoot()))
  .catch(showLoadFailure);
// One loader per screen, so each preloads only its own chunks; a single expression
// choosing between both imports would preload both.
const FIRST_SCREENS = {
  intro: () => import("./components/onboarding/Onboarding"),
  marketplace: () => import("./App"),
};
FIRST_SCREENS[introFirst ? "intro" : "marketplace"]().catch(
  warn("the first screen"),
);
