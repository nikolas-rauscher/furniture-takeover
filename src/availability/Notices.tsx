import { X } from "lucide-react";
import type { AvailabilityNotice } from "./reservations";

type NoticesProps = {
  notices: AvailabilityNotice[];
  text(notice: AvailabilityNotice): string;
  canRequest(notice: AvailabilityNotice): boolean;
  onRequest(notice: AvailabilityNotice): void;
  onFindSimilar(notice: AvailabilityNotice): void;
  onDismiss(notice: AvailabilityNotice): void;
};

/** Outcomes the buyer should see even after a listing disappears. */
export default function Notices({
  notices,
  text,
  canRequest,
  onRequest,
  onFindSimilar,
  onDismiss,
}: NoticesProps) {
  if (!notices.length) return null;
  return (
    <section
      className="availability-notices"
      aria-label="Reservation updates"
      aria-live="polite"
    >
      {notices.map((notice) => {
        const reopened =
          notice.kind === "available_again" || notice.kind === "hold_ended";
        return (
          <div
            key={notice.id}
            className={`availability-notice ${reopened ? "reopened" : ""}`}
          >
            <p>
              <strong>{notice.title}</strong>
              {text(notice)}
            </p>
            <div className="availability-notice-actions">
              {reopened ? (
                canRequest(notice) && (
                  <button
                    className="button primary small"
                    onClick={() => onRequest(notice)}
                  >
                    Request reservation
                  </button>
                )
              ) : (
                <button
                  className="button primary small"
                  onClick={() => onFindSimilar(notice)}
                >
                  Find similar
                </button>
              )}
              <button
                className="icon-button"
                aria-label={`Dismiss update about ${notice.title}`}
                onClick={() => onDismiss(notice)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
