import { useId } from "react";
import { Button } from "./ui/button";
import { ChevronRight } from "./icons";

/** A required detail: filled in, missing, or only suggested by Pako so far. */
export type ListingCheck = {
  label: string;
  state: "ready" | "missing" | "suggested";
  open: () => void;
};

type OpenCheck = ListingCheck & { state: "missing" | "suggested" };

const STEP_WORDS: Record<OpenCheck["state"], string> = {
  missing: "Add",
  suggested: "Suggested",
};

/** The required details still open, each a tap away; nothing once all are in. */
export default function ListingChecklist({
  checks,
  hint,
}: {
  checks: readonly ListingCheck[];
  /** An optional detail that would help buyers. */
  hint?: string;
}) {
  const headingId = useId();
  const unfinished = checks.filter(
    (check): check is OpenCheck => check.state !== "ready",
  );
  if (!unfinished.length && !hint) return null;
  return (
    <section className="listing-needs" aria-labelledby={headingId}>
      <h2 id={headingId}>
        {unfinished.length ? "Still needed" : "Good to add"}
      </h2>
      {unfinished.length > 0 && (
        <ul>
          {unfinished.map((check) => (
            <li key={check.label}>
              <Button className="listing-needs-item" onClick={check.open}>
                {check.label}
                <small>{STEP_WORDS[check.state]}</small>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {hint && <p>{hint}</p>}
    </section>
  );
}
