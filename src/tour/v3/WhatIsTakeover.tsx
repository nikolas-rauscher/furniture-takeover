import { useId } from "react";
import { Handshake } from "@/components/icons";
import {
  intentIcons,
  type IntroIcon,
} from "@/components/onboarding/onboardingIcons";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import { V3_MINUTES } from "./v3Script";

type Feature = keyof Pick<TourText["v3"]["whatIs"], "find" | "sell" | "agree">;

/** The intro's own pictures for finding and selling, and a handshake for agreeing. */
const FEATURES: { id: Feature; Icon: IntroIcon }[] = [
  { id: "find", Icon: intentIcons.find },
  { id: "sell", Icon: intentIcons.sell },
  { id: "agree", Icon: Handshake },
];

/**
 * Before the first question: what the app is, what Pako helps with in three plain
 * lines, and the survey's parts. It names no problem, so the questions about the last
 * time stay unprimed.
 */
export default function WhatIsTakeover() {
  const { whatIs } = useTourText().v3;
  const titleId = useId();
  const nextId = useId();
  return (
    <div className="tour-what-is">
      <section aria-labelledby={titleId}>
        <h2 id={titleId} className="tour-what-is-title">
          {whatIs.title}
        </h2>
        <p className="tour-what-is-lead">{whatIs.lead}</p>
        <ul className="tour-what-is-list">
          {FEATURES.map(({ id, Icon }) => (
            <li key={id} className="tour-what-is-item">
              <span className="tour-principle-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <p>
                <strong>{whatIs[id].title}</strong> {whatIs[id].text}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="tour-card tour-next" aria-labelledby={nextId}>
        <h2 id={nextId} className="tour-what-is-title">
          {whatIs.nextTitle}
        </h2>
        <ol className="tour-next-list">
          {whatIs.next.map((part) => (
            <li key={part}>{part}</li>
          ))}
        </ol>
        <p className="tour-next-time">{whatIs.duration(V3_MINUTES)}</p>
      </section>
    </div>
  );
}
