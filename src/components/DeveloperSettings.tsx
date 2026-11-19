import { useId, useState } from "react";
import { FlaskConical } from "@/components/icons";
import Modal from "./Modal";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

type DeveloperSettingsProps = {
  enabled: boolean;
  onEnabledChange(enabled: boolean): void;
  /** What developer mode reveals where this row is shown. */
  detail: string;
  clockOffsetMs?: number;
  onResetDemo?(): Promise<void>;
};

/** Developer mode as a settings row: the whole row flips the switch. */
export default function DeveloperSettings({
  enabled,
  onEnabledChange,
  detail,
  clockOffsetMs = 0,
  onResetDemo,
}: DeveloperSettingsProps) {
  const titleId = useId();
  const detailId = useId();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resetAndDisable() {
    if (!onResetDemo) return;
    setBusy(true);
    setError("");
    try {
      await onResetDemo();
      onEnabledChange(false);
      setConfirming(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't reset the demo. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label className="settings-row settings-switch-row" data-tone="sky">
        <span className="settings-row-icon" aria-hidden="true">
          <FlaskConical size={22} />
        </span>
        <span className="settings-row-text">
          <strong id={titleId}>Developer mode</strong>
          <small id={detailId}>{detail}</small>
        </span>
        <Switch
          checked={enabled}
          aria-labelledby={titleId}
          aria-describedby={detailId}
          disabled={busy}
          onCheckedChange={(next) => {
            if (!next && clockOffsetMs > 0) {
              setError("");
              setConfirming(true);
            } else onEnabledChange(next);
          }}
        />
      </label>
      {confirming && (
        <Modal
          title="Reset the demo and turn developer mode off?"
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
        >
          <p className="modal-intro">
            The demo clock is {Math.round(clockOffsetMs / 3600000)} hours ahead.
            Resetting returns it to real time, restores listing statuses and
            clears local reservations, waitlists and demo messages.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep developer mode
            </Button>
            <Button
              className="button danger"
              disabled={busy || !onResetDemo}
              onClick={() => void resetAndDisable()}
            >
              {busy ? "Resetting…" : "Reset demo & turn off"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
