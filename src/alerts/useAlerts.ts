import { useCallback, useEffect } from "react";
import type { Product, SearchJob } from "../../shared/marketplace";
import { useSaved } from "../hooks/useSaved";
import {
  dismissAlert,
  emptyAlerts,
  isAlertsState,
  markAlertsRead,
  unreadCount,
  updateAlerts,
} from "./matching";

/**
 * Browser-side watch for saved searches. Personal listings and saved searches
 * never leave the browser, so matching runs here against the visible listings.
 * `ready` keeps a half-loaded catalog from looking like removed listings.
 */
export function useAlerts(
  jobs: Pick<SearchJob, "id" | "criteria" | "paused">[],
  listings: Product[],
  ready: boolean,
) {
  const [state, setState] = useSaved(
    "takeover-alerts",
    emptyAlerts(),
    isAlertsState,
  );
  useEffect(() => {
    if (ready)
      setState((current) => updateAlerts(current, jobs, listings, new Date()));
  }, [jobs, listings, ready, setState]);
  return {
    alerts: state.alerts,
    unread: unreadCount(state),
    markRead: useCallback(
      (id: string) => setState((s) => markAlertsRead(s, (a) => a.id === id)),
      [setState],
    ),
    markAllRead: useCallback(
      () => setState((s) => markAlertsRead(s)),
      [setState],
    ),
    dismiss: useCallback(
      (id: string) => setState((s) => dismissAlert(s, id)),
      [setState],
    ),
    clear: useCallback(() => setState(emptyAlerts()), [setState]),
  };
}
