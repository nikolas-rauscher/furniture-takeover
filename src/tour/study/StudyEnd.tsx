import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import type { SaveState } from "../saveQueue";

const SHARE_TAG = "friend";

type ShareState =
  | { status: "idle" }
  | { status: "copied" }
  | { status: "failed"; link: string };

function shareLink() {
  return `${window.location.origin}/tour?s=${SHARE_TAG}`;
}

/** Whether every answer reached the server, with a retry once saving stopped. */
export function SaveStatus({
  save,
  onRetry,
}: {
  save: SaveState;
  onRetry: () => void;
}) {
  const { common } = useTourText();
  if (save.unsaved.length === 0)
    return <p className="tour-save">{common.save.saved}</p>;
  if (save.sending) return <p className="tour-save">{common.save.saving}</p>;
  return (
    <div className="tour-card tour-save-failed">
      <p>{common.save.failed}</p>
      <Button className="button secondary small" onClick={onRetry}>
        {common.tryAgain}
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
  const { end } = useTourText().v1;
  return (
    <div className="ob-welcome tour-end">
      <h2 id={headingId} className="ob-title">
        {text}
      </h2>
      <div role="status">
        <SaveStatus save={save} onRetry={onRetry} />
      </div>
      <p className="tour-save" role="status">
        {share.status === "copied" && end.copied}
        {share.status === "failed" && (
          <>
            {end.copyFailed} <span className="tour-link">{share.link}</span>
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
