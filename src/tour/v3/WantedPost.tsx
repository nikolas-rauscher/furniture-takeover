import { LampDesk } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";

/** "Wanted nearby", drawn: a nearby student's request as the app would show it. */
export default function WantedPost() {
  const { wantedPost } = useTourText().v3;
  return (
    <figure className="tour-card tour-wanted" aria-label={wantedPost.label}>
      <span className="tour-wanted-icon" aria-hidden="true">
        <LampDesk size={22} />
      </span>
      <p className="tour-wanted-text">{wantedPost.text}</p>
    </figure>
  );
}
