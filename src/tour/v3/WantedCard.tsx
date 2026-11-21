import { Camera, LampDesk } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";

/**
 * "Wanted nearby", explained, then drawn: a nearby student's anonymous request as the
 * app would show it, with its "I have one" button. Only a picture; the button does nothing.
 */
export default function WantedCard() {
  const { wantedCard } = useTourText().v3;
  return (
    <>
      <div className="tour-card tour-situation">
        <p className="tour-eyebrow">{wantedCard.idea}</p>
        <p className="tour-situation-text">{wantedCard.explanation}</p>
      </div>
      <figure className="tour-card tour-wanted" aria-label={wantedCard.label}>
        <span className="tour-wanted-icon" aria-hidden="true">
          <LampDesk size={22} />
        </span>
        <p className="tour-wanted-text">{wantedCard.text}</p>
        <span className="tour-wanted-button" aria-hidden="true">
          <Camera size={16} />
          {wantedCard.button}
        </span>
      </figure>
    </>
  );
}
