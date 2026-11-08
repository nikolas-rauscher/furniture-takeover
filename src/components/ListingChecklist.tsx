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

export default function ListingChecklist({
  checks,
}: {
  checks: readonly { label: string; ready: boolean; open: () => void }[];
}) {
  const missing = checks.filter((check) => !check.ready).length;
  return (
    <Trace className="listing-checklist">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceTitle>
              {missing
                ? `${missing} detail${missing === 1 ? "" : "s"} to complete`
                : "Required details complete"}
            </TraceTitle>
            <TraceDescription>
              {checks.length - missing}/{checks.length}
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
                  <TraceIcon>{check.ready ? <Check /> : <Pencil />}</TraceIcon>
                  <TraceTitle>{check.label}</TraceTitle>
                  <TraceDescription>
                    {check.ready ? "Ready" : "Add"}
                  </TraceDescription>
                </TraceLine>
              </Button>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
