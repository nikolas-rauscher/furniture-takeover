import { StrictMode, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { globalStylesReady } from "../globalStyles";
import { sceneInAddress } from "./device/sceneMessages";

function pageRoot() {
  const root = document.getElementById("root");
  if (!root) throw new Error("The tour page has no root.");
  return root;
}

function showLoadFailure(error: unknown): never {
  pageRoot().innerHTML =
    '<main style="padding:32px"><h1>Connection unavailable</h1><p role="alert">The tour could not load. Check your connection and reload the page.</p></main>';
  throw error;
}

/** The page itself, or one of the app scenes its phones show. */
function loadPage(): Promise<ReactElement> {
  const scene = sceneInAddress(window.location.search);
  if (scene)
    return import("./scenes/ScenePage").then(({ default: ScenePage }) => (
      <ScenePage scene={scene} />
    ));
  return import("./TourPage").then(({ default: TourPage }) => <TourPage />);
}

Promise.all([loadPage(), globalStylesReady])
  .then(([page]) =>
    createRoot(pageRoot()).render(<StrictMode>{page}</StrictMode>),
  )
  .catch(showLoadFailure);
