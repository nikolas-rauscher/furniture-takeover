import { useState } from "react";
import { Button } from "@/components/ui/button";
import StudyShell from "./StudyShell";

const INVITATION =
  "Hi, I'm Pako! I'm the helper in takeover, a student project at EPFL. I'd like to ask about the last time you bought or sold something second-hand, then show you what we're building. It takes about 4 minutes.";
const CONSENT_TITLE = "Before we start";

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function ConsentText({
  contact,
  deleteBy,
}: {
  contact: string;
  deleteBy: string;
}) {
  return (
    <div className="tour-card tour-consent">
      <p>Your answers are saved without your name.</p>
      <p>
        I also save how long each step takes, which link brought you here and
        whether you're on a phone or a computer.
      </p>
      <p>Your IP address isn't saved with your answers.</p>
      <p>An email address is optional, at the end, and stored separately.</p>
      <p>Everything is deleted by {formatDate(deleteBy)}.</p>
      <p>
        Questions:{" "}
        <a className="tour-link" href={`mailto:${contact}`}>
          {contact}
        </a>
      </p>
    </div>
  );
}

/** The neutral invitation and the consent; nothing is stored before the participant agrees. */
export default function StudyStart({
  contact,
  deleteBy,
  onAgree,
  onShowPitch,
}: {
  contact: string;
  deleteBy: string;
  onAgree: () => void;
  onShowPitch: () => void;
}) {
  const [consent, setConsent] = useState(false);
  if (!consent)
    return (
      <StudyShell
        stepKey="invitation"
        label={INVITATION}
        layout="guide"
        arrangement="centred"
        mood="wave"
        bubble={{ id: "invitation", text: INVITATION }}
        direction={0}
        footer={
          <>
            <Button
              className="button primary large"
              onClick={() => setConsent(true)}
            >
              Start
            </Button>
            <Button className="button quiet large" onClick={onShowPitch}>
              Just show me the tour
            </Button>
          </>
        }
      >
        <p className="ob-wordmark tour-study-wordmark">takeover</p>
      </StudyShell>
    );
  return (
    <StudyShell
      stepKey="consent"
      label={CONSENT_TITLE}
      layout="guide"
      mood="listen"
      bubble={{ id: "consent", text: CONSENT_TITLE }}
      direction={1}
      footer={
        <>
          <Button className="button primary large" onClick={onAgree}>
            I'm 18 or older and I agree
          </Button>
          <Button className="button quiet large" onClick={onShowPitch}>
            No thanks, just show me the tour
          </Button>
        </>
      }
    >
      <ConsentText contact={contact} deleteBy={deleteBy} />
    </StudyShell>
  );
}
