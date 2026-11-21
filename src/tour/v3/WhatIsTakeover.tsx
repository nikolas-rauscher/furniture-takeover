import { useId } from "react";
import { useTourText } from "../i18n/TourLanguage";
import { V3_MINUTES } from "./v3Script";

/**
 * Before the first question: what the app is, in one plain sentence, and the survey's
 * parts. It lists no feature and names no problem, so the questions about the last
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
