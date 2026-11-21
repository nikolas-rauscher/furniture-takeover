import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import { formatDay } from "../i18n/tourText";
import StudyShell from "./StudyShell";

function ConsentText({
  contact,
  deleteBy,
}: {
  contact: string;
  deleteBy: string;
}) {
  const text = useTourText();
  const { consent } = text.v1;
  return (
    <div className="tour-card tour-consent">
      <p>{consent.anonymous}</p>
      <p>{consent.extra}</p>
      <p>{consent.ip}</p>
      <p>{consent.email}</p>
      <p>{consent.deleted(formatDay(deleteBy, text))}</p>
      <p>
        {consent.questions}{" "}
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
  updated,
  onAgree,
  onShowPitch,
}: {
  contact: string;
  deleteBy: string;
  /** A session of an earlier wording was set aside, so the study starts again. */
  updated: boolean;
  onAgree: () => void;
  onShowPitch: () => void;
}) {
  const { common, v1 } = useTourText();
  const [consent, setConsent] = useState(false);
  if (!consent)
    return (
      <StudyShell
        stepKey="invitation"
        label={v1.invitation}
        layout="guide"
        arrangement="centred"
        mood="wave"
        bubble={{ id: "invitation", text: v1.invitation }}
        direction={0}
        languageSwitch
        footer={
          <>
            <Button
              className="button primary large"
              onClick={() => setConsent(true)}
            >
              {v1.start}
            </Button>
            <Button className="button quiet large" onClick={onShowPitch}>
              {v1.justTour}
            </Button>
          </>
        }
      >
        <p className="ob-wordmark tour-study-wordmark">takeover</p>
        {updated && (
          <p className="tour-save" role="status">
            {common.surveyUpdated}
          </p>
        )}
      </StudyShell>
    );
  return (
    <StudyShell
      stepKey="consent"
      label={v1.consentTitle}
      layout="guide"
      mood="listen"
      bubble={{ id: "consent", text: v1.consentTitle }}
      direction={1}
      footer={
        <>
          <Button className="button primary large" onClick={onAgree}>
            {v1.agree}
          </Button>
          <Button className="button quiet large" onClick={onShowPitch}>
            {v1.decline}
          </Button>
        </>
      }
    >
      <ConsentText contact={contact} deleteBy={deleteBy} />
    </StudyShell>
  );
}
