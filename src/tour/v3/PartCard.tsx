import { useId } from "react";
import { Banknote, Clock, Package, Sparkles } from "@/components/icons";
import type { IntroIcon } from "@/components/onboarding/onboardingIcons";
import { useTourText } from "../i18n/TourLanguage";
import { V3_SECTIONS, type V3Section } from "./v3Script";

/** Each part's picture: the last time, things at home, the app and money. */
const ICONS: Record<V3Section, IntroIcon> = {
  "last-time": Clock,
  home: Package,
  "the-app": Sparkles,
  price: Banknote,
};

/** Opens a part of the survey: which part it is, its name and what it asks. */
export default function PartCard({ section }: { section: V3Section }) {
  const { v3 } = useTourText();
  const titleId = useId();
  const Icon = ICONS[section];
  return (
    <section className="tour-card tour-part" aria-labelledby={titleId}>
      <span className="tour-part-icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <p className="tour-eyebrow">
        {v3.parts.label(V3_SECTIONS.indexOf(section) + 1, V3_SECTIONS.length)}
      </p>
      <h2 id={titleId} className="tour-part-title">
        {v3.sections[section]}
      </h2>
      <p className="tour-part-text">{v3.parts[section].text}</p>
    </section>
  );
}
