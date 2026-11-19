import { X } from "@/components/icons";
import PakoReaction from "../components/PakoReaction";
import { Button } from "../components/ui/button";
import type { AvailabilityNotice } from "./reservations";

type NoticesProps = {
  notices: AvailabilityNotice[];
  text(notice: AvailabilityNotice): string;
  canRequest(notice: AvailabilityNotice): boolean;
  onRequest(notice: AvailabilityNotice): void;
  onFindSimilar(notice: AvailabilityNotice): void;
  onDismiss(notice: AvailabilityNotice): void;
};

/** Outcomes the buyer should see even after a listing disappears; Pako brings the news. */
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
            className="availability-notice"
            data-good={reopened || undefined}
          >
            <PakoReaction mood={reopened ? "happy" : "sad"} size={40} />
            <p>
              <strong>{notice.title}</strong>
              <span>{text(notice)}</span>
            </p>
            <div className="availability-notice-actions">
              {reopened ? (
                canRequest(notice) && (
                  <Button
                    className="button primary small"
                    onClick={() => onRequest(notice)}
                  >
                    Request reservation
                  </Button>
                )
              ) : (
                <Button
                  className="button secondary small"
                  onClick={() => onFindSimilar(notice)}
                >
                  Find something similar
                </Button>
              )}
              <Button
                className="icon-button"
                aria-label={`Dismiss update about ${notice.title}`}
                onClick={() => onDismiss(notice)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
