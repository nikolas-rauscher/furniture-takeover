import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import { SaveStatus } from "../study/StudyEnd";
import PilotForm from "./PilotForm";
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
  return <SaveStatus save={save} onRetry={context.retry} />;
}

/** The optional form, for everyone who finished, until it is sent. */
function StayInTouch({ context }: { context: StepContext }) {
  const { pilot } = useTourText().v3;
  const titleId = useId();
  return (
    <section className="tour-card tour-contact" aria-labelledby={titleId}>
      <h2 id={titleId} className="tour-card-title">
        {pilot.invite}
      </h2>
      <PilotForm context={context} />
    </section>
  );
}

/**
 * The thank-you with how saving went, the optional form and the share block. Who saw
 * the wrong price learns that it was deliberate; nobody under 18 is offered the form. Once the form is sent it gives way to a
 * line saying so, and the screen returns to its top.
 */
export default function V3End({ context }: { context: StepContext }) {
  const { v3 } = useTourText();
  const top = useRef<HTMLDivElement>(null);
  const sent = context.progress.pilot !== null;
  // No email address is asked of anyone under 18.
  const minor = context.progress.answers.age?.chosen.includes("under-18");
  useEffect(() => {
    if (sent) top.current?.closest(".ob-body")?.scrollTo({ top: 0 });
  }, [sent]);
  return (
    <div ref={top} className="ob-welcome tour-end tour-v3-end">
      <h2 className="ob-title">{v3.end.title}</h2>
      <div role="status">
        <EndSaveStatus context={context} />
        {sent && <p className="tour-save">{v3.pilot.sent}</p>}
      </div>
      {!sent && !minor && <StayInTouch context={context} />}
      <ShareBlock context={context} />
    </div>
  );
}
