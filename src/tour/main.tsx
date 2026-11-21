import { StrictMode, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { globalStylesReady } from "../globalStyles";
import { briefInAddress, sceneInAddress } from "./device/sceneMessages";
import { initialLanguage } from "./i18n/language";
import { holdScreenHeight } from "./screenHeight";
import { TOUR_TEXT } from "./i18n/tourText";

function pageRoot() {
  const root = document.getElementById("root");
  if (!root) throw new Error("The tour page has no root.");
  return root;
}

function showLoadFailure(error: unknown): never {
  const words = TOUR_TEXT[initialLanguage()].notices.loadFailed;
  const main = document.createElement("main");
  main.style.padding = "32px";
  const title = document.createElement("h1");
  title.textContent = words.title;
  const text = document.createElement("p");
  text.setAttribute("role", "alert");
  text.textContent = words.text;
  main.append(title, text);
  pageRoot().replaceChildren(main);
  throw error;
}

/** The page itself, or one of the app scenes its phones show. */
function loadPage(): Promise<ReactElement> {
  const scene = sceneInAddress(window.location.search);
  if (scene)
    return import("./scenes/ScenePage").then(({ default: ScenePage }) => (
      <ScenePage scene={scene} brief={briefInAddress(window.location.search)} />
    ));
  return Promise.all([
    import("./TourPage"),
    import("./i18n/TourLanguage"),
  ]).then(([{ default: TourPage }, { TourLanguage }]) => (
    <TourLanguage>
      <TourPage />
    </TourLanguage>
  ));
}

holdScreenHeight();
Promise.all([loadPage(), globalStylesReady])
  .then(([page]) =>
    createRoot(pageRoot()).render(<StrictMode>{page}</StrictMode>),
  )
  .catch(showLoadFailure);
