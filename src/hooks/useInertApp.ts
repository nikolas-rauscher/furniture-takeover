import { useLayoutEffect } from "react";

/** How many dialogs are open; the app wakes again once the last one closes. */
let openDialogs = 0;

/**
 * While a dialog is open, the app behind it is inert, so focus stays in the dialog however
 * quickly Tab is pressed. It wakes as soon as the dialog starts closing, before focus returns.
 * Dialogs render in a portal outside the app root, so they stay usable.
 */
export function useInertApp(open: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    const app = document.getElementById("root");
    if (!app) throw new Error("The app root to make inert is missing.");
    openDialogs += 1;
    app.inert = true;
    return () => {
      openDialogs -= 1;
      app.inert = openDialogs > 0;
    };
  }, [open]);
}
