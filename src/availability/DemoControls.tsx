import { useId, useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { HOLD_HOURS, HOUR_MS, SELLER_REPLY_HOURS } from "./config";
import { formatDeadline } from "./format";

type DemoControlsProps = {
  now: Date;
  offsetMs: number;
  busy: boolean;
  onSkip(hours: number): void;
  onOtherBuyerCancelled(): void;
  onReset(): void;
};

/** Interviewer-only panel; time moves by a simulated offset, never by timers. */
export default function DemoControls({
  now,
  offsetMs,
  busy,
  onSkip,
  onOtherBuyerCancelled,
  onReset,
}: DemoControlsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const skipped = Math.round(offsetMs / HOUR_MS);
  return (
    <aside
      className={`demo-controls${open ? " open" : ""}`}
      aria-label="Demo controls"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) setOpen(false);
      }}
    >
      <button
        type="button"
        className="demo-controls-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <FlaskConical size={15} aria-hidden="true" />
        Demo controls
        {skipped > 0 && <span className="demo-clock">+{skipped}h</span>}
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <div className="demo-controls-panel" id={panelId}>
          <p>
            Simulated time <strong>{formatDeadline(now.toISOString())}</strong>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSkip(SELLER_REPLY_HOURS)}
          >
            Skip {SELLER_REPLY_HOURS}h<small>Seller doesn't reply</small>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSkip(HOLD_HOURS)}
          >
            Skip {HOLD_HOURS}h<small>Buyer doesn't pick up</small>
          </button>
          <button type="button" disabled={busy} onClick={onOtherBuyerCancelled}>
            Other buyer cancelled<small>Frees items reserved by others</small>
          </button>
          <button
            type="button"
            className="demo-reset"
            disabled={busy}
            onClick={onReset}
          >
            Reset demo
          </button>
        </div>
      )}
    </aside>
  );
}
