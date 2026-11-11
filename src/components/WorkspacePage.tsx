import { Activity, useEffect, useState, type ReactNode } from "react";

/** Retain visited tabs; hidden pages release effects and subscriptions. */
export default function WorkspacePage({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return active || visited ? (
    <Activity mode={active ? "visible" : "hidden"}>{children}</Activity>
  ) : null;
}
