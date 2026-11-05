import { Bell, X } from "lucide-react";
import type { AlertItem } from "./matching";
import "./alerts.css";

type MatchAlertsProps = {
  alerts: AlertItem[];
  searchTitle(jobId: string): string | undefined;
  onOpen(alert: AlertItem): void;
  onDismiss(alert: AlertItem): void;
  onMarkAllRead?(): void;
};

/** New listings that started matching a saved search; opening one never contacts a seller. */
export default function MatchAlerts({
  alerts,
  searchTitle,
  onOpen,
  onDismiss,
  onMarkAllRead,
}: MatchAlertsProps) {
  if (!alerts.length) return null;
  const unread = alerts.filter((alert) => !alert.read).length;
  return (
    <section className="match-alerts" aria-label="New matches">
      <div className="match-alerts-heading">
        <h2>
          <Bell size={16} aria-hidden="true" />
          New matches
          {unread > 0 && <span className="match-alerts-count">{unread}</span>}
        </h2>
        {onMarkAllRead && unread > 0 && (
          <button type="button" className="text-button" onClick={onMarkAllRead}>
            Mark all as seen
          </button>
        )}
      </div>
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id} className={alert.read ? "read" : undefined}>
            <button
              type="button"
              className="match-alert-main"
              onClick={() => onOpen(alert)}
            >
              <strong>{alert.title}</strong>
              <span>{alert.reason}</span>
              <small>
                From your saved search “
                {searchTitle(alert.jobId) ?? "removed search"}”
              </small>
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Dismiss match ${alert.title}`}
              onClick={() => onDismiss(alert)}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
