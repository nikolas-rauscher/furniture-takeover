import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Whether this tab is on screen; a tab in the background sees nothing new. */
export const usePageVisible = () =>
  useSyncExternalStore(subscribe, () => document.visibilityState === "visible");
