import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SaveState } from "../saveQueue";

const SHARE_TAG = "friend";

type ShareState =
  | { status: "idle" }
  | { status: "copied" }
  | { status: "failed"; link: string };

function shareLink() {
  return `${window.location.origin}/tour?s=${SHARE_TAG}`;
}

function SaveStatus({
  save,
  onRetry,
}: {
  save: SaveState;
  onRetry: () => void;
}) {
  if (save.unsaved.length === 0)
    return <p className="tour-save">Your answers are saved.</p>;
  if (save.sending) return <p className="tour-save">Saving your answers…</p>;
  return (
    <div className="tour-card tour-save-failed">
      <p>
        Some of your answers aren't saved yet. Check your connection, then try
        again.
      </p>
      <Button className="button secondary small" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** The thank-you, how the saving went, and a way to pass the study on. */
export function StudyEndContent({
  headingId,
  text,
  save,
  onRetry,
  share,
}: {
  headingId: string;
  text: string;
  save: SaveState;
  onRetry: () => void;
  share: ShareState;
}) {
  return (
    <div className="ob-welcome tour-end">
      <h2 id={headingId} className="ob-title">
        {text}
      </h2>
      <div role="status">
        <SaveStatus save={save} onRetry={onRetry} />
      </div>
      <p className="tour-save" role="status">
        {share.status === "copied" && "Study link copied."}
        {share.status === "failed" && (
          <>
            I couldn't copy the link. Here it is:{" "}
            <span className="tour-link">{share.link}</span>
          </>
        )}
      </p>
    </div>
  );
}

export function useShare() {
  const [share, setShare] = useState<ShareState>({ status: "idle" });
  function copy() {
    const link = shareLink();
    // Without a secure origin the clipboard is missing; that failure shows the link too.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(() => setShare({ status: "copied" }))
      .catch((error: unknown) => {
        console.error(error);
        setShare({ status: "failed", link });
      });
  }
  return { share, copy };
}
