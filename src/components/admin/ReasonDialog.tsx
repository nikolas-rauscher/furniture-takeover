import { useId, useState, type ReactNode } from "react";
import Modal from "../Modal";
import { Button } from "../ui/button";
import AdminDialogFooter from "./AdminDialogFooter";
import { useAdminAction } from "./useAdminAction";

/**
 * Confirms one moderation step with the short reason the log keeps. The step
 * runs from here, so a refusal shows under the reason instead of closing.
 */
export default function ReasonDialog({
  title,
  explanation,
  confirmLabel,
  danger = false,
  onConfirm,
  onDone,
  onClose,
}: {
  title: string;
  explanation: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onDone: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(true);
  const action = useAdminAction();
  const fieldId = useId();
  const refusalId = useId();
  const ready = reason.trim().length > 0 && !action.busy;
  async function confirm() {
    if (!ready) return;
    if (await action.run(() => onConfirm(reason.trim()))) {
      onDone();
      setOpen(false);
    }
  }
  return (
    <Modal
      sheet
      open={open}
      title={title}
      initialFocus={fieldId}
      onClose={onClose}
    >
      <form
        className="admin-reason"
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        <div className="admin-reason-explanation">{explanation}</div>
        <label htmlFor={fieldId}>Reason, kept in the moderation log</label>
        <input
          id={fieldId}
          value={reason}
          maxLength={1000}
          autoComplete="off"
          aria-describedby={action.refusal ? refusalId : undefined}
          placeholder="A short reason"
          onChange={(event) => setReason(event.target.value)}
        />
        <AdminDialogFooter
          refusal={action.refusal}
          refusalId={refusalId}
          onCancel={() => setOpen(false)}
        >
          <Button
            type="submit"
            className={`button ${danger ? "danger" : "primary"}`}
            disabled={!ready}
          >
            {action.busy ? "Saving…" : confirmLabel}
          </Button>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}
