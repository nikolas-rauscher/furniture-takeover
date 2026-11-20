import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import type { PakoStatus } from "../hooks/usePakoStatus";

/**
 * The footnote under Pako's composer: sign in, today's allowance, or why he
 * is unavailable. Until the first connection check answers it says nothing
 * rather than "Connecting…" that disappears a moment later.
 */
export function connectionNotice({
  pako,
  signInNeeded,
  turnFailed,
  onSignIn,
}: {
  pako: PakoStatus;
  /** Accounts are on, but nobody is signed in. */
  signInNeeded: boolean;
  /** Pako's last turn failed and offers its own Try again. */
  turnFailed: boolean;
  onSignIn: () => void;
}) {
  const { health, error, checking, configured } = pako;
  if (signInNeeded)
    return (
      <div className="agent-footnote">
        <Button type="button" onClick={onSignIn}>
          Sign in to ask Pako
        </Button>
      </div>
    );
  if (!health && !error) return null;
  if (pako.quotaExhausted)
    return (
      <div className="agent-footnote" role="status">
        Today's requests reset on {pako.quotaResets}.
      </div>
    );
  if (!configured || error)
    return (
      <div className="agent-footnote">
        <span role="status" title={error || undefined}>
          {error
            ? "Pako is offline. You can still browse listings."
            : "Pako isn't set up here. You can still browse listings."}
        </span>
        {/* A failed turn offers its own Try again; one recovery button is enough. */}
        {!turnFailed && (
          <Button type="button" onClick={pako.refresh} disabled={checking}>
            {checking ? "Reconnecting…" : "Retry"}
          </Button>
        )}
        {configured && health?.webSearchConfigured === false && (
          <span>I can't check other sites right now. I can still check takeover listings.</span>
        )}
      </div>
    );
  if (!health?.quota) return null;
  const { remaining, limit } = health.quota;
  return (
    <div
      className={`agent-footnote${remaining > 5 ? " quota-available" : ""}`}
      role="status"
      aria-label={`${remaining} of ${limit} Pako requests left today`}
    >
      <Badge variant={remaining <= 5 ? "destructive" : "secondary"}>
        {remaining} Pako {remaining === 1 ? "request" : "requests"} left today
      </Badge>
    </div>
  );
}
