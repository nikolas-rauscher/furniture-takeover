import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import { SaveStatus } from "../study/StudyEnd";
import PilotContact from "./PilotForm";
import { PILOT_KEY } from "./v3Progress";
import QrCode from "./QrCode";
import type { StepContext } from "./stepContext";
import { V3_MINUTES } from "./v3Script";

/** The channel tag of links shared from the end of the survey. */
const SHARE_TAG = "friend";

const shareLink = () => `${window.location.origin}/tour?s=${SHARE_TAG}`;

type CopyState =
  { status: "idle" } | { status: "copied" } | { status: "failed" };

/** Passing the survey on: the phone's share sheet, a copied link or a QR code. */
function ShareBlock({ context }: { context: StepContext }) {
  const words = useTourText().v3.end;
  const [copy, setCopy] = useState<CopyState>({ status: "idle" });
  const [qrOpen, setQrOpen] = useState(false);
  const link = shareLink();
  const canShare = typeof navigator.share === "function";

  function shareNatively() {
    context.log("share", "native");
    navigator
      .share({ text: words.shareText(V3_MINUTES, link) })
      .catch((error: unknown) => {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error(error);
      });
  }

  function copyLink() {
    context.log("share", "copy");
    // Without a secure origin the clipboard is missing; that failure shows the link too.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(() => setCopy({ status: "copied" }))
      .catch((error: unknown) => {
        console.error(error);
        setCopy({ status: "failed" });
      });
  }

  function toggleQr() {
    if (!qrOpen) context.log("share", "qr");
    setQrOpen(!qrOpen);
  }

  return (
    <section className="tour-card tour-share" aria-labelledby="share-title">
      <h2 id="share-title" className="tour-card-title">
        {words.shareTitle}
      </h2>
      <div className="tour-share-actions">
        {canShare && (
          <Button className="button primary" onClick={shareNatively}>
            {words.share}
          </Button>
        )}
        <Button className="button secondary" onClick={copyLink}>
          {words.copy}
        </Button>
        <Button
          className="button secondary"
          aria-expanded={qrOpen}
          onClick={toggleQr}
        >
          {qrOpen ? words.hideQr : words.showQr}
        </Button>
      </div>
      <p className="tour-save" role="status">
        {copy.status === "copied" && words.copied}
        {copy.status === "failed" && (
          <>
            {words.copyFailed} <span className="tour-link">{link}</span>
          </>
        )}
      </p>
      {qrOpen && <QrCode text={link} label={words.qrLabel} />}
    </section>
  );
}

/** How saving went, once it is done or has stopped; nothing while it is under way. */
function EndSaveStatus({ context }: { context: StepContext }) {
  const { save } = context;
  if (save.sending) return null;
  return (
    <SaveStatus
      save={{
        ...save,
        unsaved: save.unsaved.filter((key) => key !== PILOT_KEY),
      }}
      onRetry={context.retry}
    />
  );
}

/** The thank-you, optional contact form and ways to share or revise the survey. */
export default function V3End({ context }: { context: StepContext }) {
  const { v3 } = useTourText();
  const top = useRef<HTMLDivElement>(null);
  const sent = context.progress.pilot !== null;
  useEffect(() => {
    if (sent) top.current?.closest(".ob-body")?.scrollTo({ top: 0 });
  }, [sent]);
  return (
    <div ref={top} className="ob-welcome tour-end tour-v3-end">
      <h2 className="ob-title">{v3.end.title}</h2>
      <div role="status">
        <EndSaveStatus context={context} />
      </div>
      <PilotContact
        version={context.progress.version}
        submitted={sent}
        save={context.save}
        onSend={context.sendPilot}
        retry={context.retry}
      />
      <Button className="button secondary" onClick={context.onEdit}>
        {v3.end.edit}
      </Button>
      <ShareBlock context={context} />
    </div>
  );
}
