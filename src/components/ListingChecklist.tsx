import { Button } from "./ui/button";
import { Check, Pencil } from "./icons";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "./ui/trace";

/** The number of required details still missing, in words. */
export function detailsToComplete(count: number) {
  return `${count} detail${count === 1 ? "" : "s"} to complete`;
}

/** A required detail: filled in, missing, or only suggested by Pako so far. */
export type ListingCheck = {
  label: string;
  state: "ready" | "missing" | "suggested";
  open: () => void;
};

const STEP_WORDS = { ready: "Ready", missing: "Add", suggested: "Suggested" };

/** What is left: a single suggestion is named, otherwise the details are counted. */
function remainingWords(unfinished: readonly ListingCheck[]) {
  if (!unfinished.length) return "Required details complete";
  if (unfinished.length === 1 && unfinished[0].state === "suggested")
    return `${unfinished[0].label} suggested`;
  return detailsToComplete(unfinished.length);
}

export default function ListingChecklist({
  checks,
}: {
  checks: readonly ListingCheck[];
}) {
  const unfinished = checks.filter((check) => check.state !== "ready");
  return (
    <Trace className="listing-checklist">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceTitle>{remainingWords(unfinished)}</TraceTitle>
            <TraceDescription>
              {checks.length - unfinished.length}/{checks.length}
            </TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {checks.map((check) => (
              <Button
                key={check.label}
                className="listing-checklist-step"
                onClick={check.open}
                aria-label={`Edit ${check.label}`}
              >
                <TraceLine>
                  <TraceIcon>
                    {check.state === "ready" ? (
                      <Check />
                    ) : check.state === "suggested" ? (
                      <span className="listing-checklist-dot" />
                    ) : (
                      <Pencil />
                    )}
                  </TraceIcon>
                  <TraceTitle>{check.label}</TraceTitle>
                  <TraceDescription>{STEP_WORDS[check.state]}</TraceDescription>
                </TraceLine>
              </Button>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
