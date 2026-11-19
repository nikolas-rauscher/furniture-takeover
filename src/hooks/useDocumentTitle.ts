import { useEffect, useState } from "react";

/** Names the page on screen in the browser tab, e.g. "Messages · takeover"; null keeps the app's own title. */
export function useDocumentTitle(page: string | null) {
  const [appTitle] = useState(() => document.title);
  useEffect(() => {
    document.title = page ? `${page} · takeover` : appTitle;
  }, [page, appTitle]);
}
