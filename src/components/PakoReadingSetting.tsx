import { useId, useState } from "react";
import { MessageCircle } from "@/components/icons";
import { Switch } from "./ui/switch";

/** The student's choice whether Pako reads new replies by himself; the whole row flips it. */
export default function PakoReadingSetting({
  enabled,
  unavailable,
  onEnabledChange,
}: {
  enabled: boolean;
  /** Why the choice cannot be changed here yet. */
  unavailable?: string;
  /** May fail, for example when the account cannot save it. */
  onEnabledChange: (enabled: boolean) => void | Promise<void>;
}) {
  const titleId = useId();
  const detailId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(next: boolean) {
    setBusy(true);
    setError("");
    try {
      await onEnabledChange(next);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't save this setting. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="settings-row settings-switch-row" data-tone="sky">
        <span className="settings-row-icon" aria-hidden="true">
          <MessageCircle size={22} />
        </span>
        <span className="settings-row-text">
          <strong id={titleId}>Read new replies automatically</strong>
          <small id={detailId}>
            {unavailable ??
              "When you open a conversation, I can read new replies and suggest private drafts. You choose what to send."}
          </small>
        </span>
        <Switch
          checked={enabled}
          aria-labelledby={titleId}
          aria-describedby={detailId}
          disabled={busy || unavailable !== undefined}
          onCheckedChange={(next) => void change(next)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
