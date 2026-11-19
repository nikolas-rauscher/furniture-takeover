import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Whether the browser has a connection, kept current as it comes and goes. */
export const useOnline = () =>
  useSyncExternalStore(subscribe, () => navigator.onLine);
