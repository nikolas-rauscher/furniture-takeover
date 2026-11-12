import { useId, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import "./developer-settings.css";

type DeveloperSettingsProps = {
  enabled: boolean;
  onEnabledChange(enabled: boolean): void;
  clockOffsetMs?: number;
  onResetDemo?(): Promise<void>;
};

export default function DeveloperSettings({
  enabled,
  onEnabledChange,
  clockOffsetMs = 0,
  onResetDemo,
}: DeveloperSettingsProps) {
  const id = useId();
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
          : "Could not reset the demo. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="developer-setting">
        <div className="developer-setting-copy">
          <Label htmlFor={id}>Developer mode</Label>
          <p id={`${id}-description`}>
            Show local demo tools, including time skips and buyer/seller message
            previews. Saved only in this browser.
          </p>
        </div>
        <Switch
          id={id}
          checked={enabled}
          aria-describedby={`${id}-description`}
          disabled={busy}
          onCheckedChange={(next) => {
            if (!next && clockOffsetMs > 0) {
              setError("");
              setConfirming(true);
            } else onEnabledChange(next);
          }}
        />
      </div>
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!busy) setConfirming(open);
        }}
      >
        <DialogContent>
          <div className="modal-heading">
            <DialogTitle>Reset demo and disable developer mode?</DialogTitle>
          </div>
          <DialogDescription className="modal-intro">
            The demo clock is {Math.round(clockOffsetMs / 3600000)} hours ahead.
            Resetting returns it to real time, restores listing statuses, and
            clears local reservations, waitlists and demo messages.
          </DialogDescription>
          {error && <p role="alert">{error}</p>}
          <div className="modal-actions">
            <Button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep developer mode
            </Button>
            <Button
              type="button"
              className="button primary"
              disabled={busy || !onResetDemo}
              onClick={() => void resetAndDisable()}
            >
              {busy ? "Resetting…" : "Reset demo & disable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
