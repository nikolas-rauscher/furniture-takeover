import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { globalStylesReady } from "../globalStyles";
import TourPage from "./TourPage";

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

globalStylesReady
  .then(() =>
    createRoot(pageRoot()).render(
      <StrictMode>
        <TourPage />
      </StrictMode>,
    ),
  )
  .catch(showLoadFailure);
