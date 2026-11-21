import { useId, useState } from "react";
import { ChevronDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import { formatDay } from "../i18n/tourText";
import StudyShell from "../study/StudyShell";
import { V3_MINUTES } from "./v3Script";

/** What is saved, folded away behind a quiet toggle. */
function SaveDetails({
  contact,
  deleteBy,
}: {
  contact: string;
  deleteBy: string;
}) {
  const text = useTourText();
  const { start } = text.v3;
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <div className="tour-consent">
      <button
        type="button"
        className="tour-more"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen(!open)}
      >
        {start.saveTitle}
        <ChevronDown
          size={16}
          aria-hidden="true"
          data-open={open || undefined}
        />
      </button>
      <div id={detailsId} hidden={!open}>
        <p>{start.save(formatDay(deleteBy, text))}</p>
        <p>
          {start.questions}{" "}
          <a className="tour-link" href={`mailto:${contact}`}>
            {contact}
          </a>
        </p>
      </div>
    </div>
  );
}

/** One screen: Pako's invitation with the honest duration, and what is saved on request. */
export default function V3Start({
  contact,
  deleteBy,
  updated,
  onAgree,
  onShowPitch,
}: {
  contact: string;
  deleteBy: string;
  /** A session of an earlier wording was set aside, so the survey starts again. */
  updated: boolean;
  onAgree: () => void;
  onShowPitch: () => void;
}) {
  const { common, v3 } = useTourText();
  const { start } = v3;
  const bubble = start.bubble(V3_MINUTES);
  return (
    <StudyShell
      stepKey="start"
      label={bubble}
      layout="guide"
      mood="wave"
      bubble={{ id: "start", text: bubble }}
      direction={0}
      languageSwitch
      footer={
        <>
          <Button className="button primary large" onClick={onAgree}>
            {start.go}
          </Button>
          <Button className="button quiet large" onClick={onShowPitch}>
            {start.demo}
          </Button>
        </>
      }
    >
      {updated && (
        <p className="tour-save" role="status">
          {common.surveyUpdated}
        </p>
      )}
      <SaveDetails contact={contact} deleteBy={deleteBy} />
    </StudyShell>
  );
}
