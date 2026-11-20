import type { ReactNode } from "react";
import { Button } from "../ui/button";

/** An admin dialog's refusal, once its step was refused, above Cancel and the dialog's own submit button. */
export default function AdminDialogFooter({
  refusal,
  refusalId,
  onCancel,
  children,
}: {
  refusal: string;
  refusalId: string;
  onCancel: () => void;
  /** The submit button. */
  children: ReactNode;
}) {
  return (
    <>
      {refusal && (
        <p id={refusalId} role="alert" className="admin-refusal">
          {refusal}
        </p>
      )}
      <div className="admin-reason-actions">
        <Button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </Button>
        {children}
      </div>
    </>
  );
}
