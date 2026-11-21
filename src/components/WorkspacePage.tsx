import { Activity, useEffect, useState, type ReactNode } from "react";
import { PageTransitionView } from "./animate-ui/components/page-transition";

/**
 * Retain visited tabs; hidden pages release effects and subscriptions.
 * A new `pageKey` treats the content as another page: it remounts and plays
 * the page transition (home and chat, or the two account tabs).
 */
export default function WorkspacePage({
  active,
  pageKey,
  children,
}: {
  active: boolean;
  pageKey?: string;
  children: ReactNode;
}) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return active || visited ? (
    <Activity mode={active ? "visible" : "hidden"}>
      <PageTransitionView key={pageKey}>{children}</PageTransitionView>
    </Activity>
  ) : null;
}
