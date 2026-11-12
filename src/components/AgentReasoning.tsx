import { useState } from "react";
import type { AgentReasoningPart } from "../../shared/runs";
import { useStreamingText } from "../hooks/useStreamingText";
import { Check, LoaderCircle } from "./icons";
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

/** One reasoning disclosure per turn, including interleaved tool steps. */
export default function AgentReasoning({
  parts = [],
  running,
}: {
  parts?: readonly AgentReasoningPart[];
  running: boolean;
}) {
  const [open, setOpen] = useState<boolean>();
  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n\n");
  const streaming =
    running && parts.some((part) => part.status === "streaming");
  const stopped = parts.some(
    (part) =>
      part.status === "stopped" || (!running && part.status === "streaming"),
  );
  const durationMs = parts.reduce(
    (total, part) => total + (part.durationMs ?? 0),
    0,
  );
  const visibleText = useStreamingText(text, "reasoning", streaming);
  if (!streaming && !text) return null;

  const line = (
    <TraceLine status={streaming ? "running" : undefined}>
      <TraceIcon>
        {streaming ? (
          <LoaderCircle animate />
        ) : stopped ? (
          <span className="agent-trace-dot" />
        ) : (
          <Check />
        )}
      </TraceIcon>
      <TraceTitle>
        {streaming ? "Thinking…" : stopped ? "Reasoning stopped" : "Reasoning"}
      </TraceTitle>
      {!streaming && !stopped && durationMs > 0 && (
        <TraceDescription>
          {durationMs < 1000 ? "<1s" : `${Math.round(durationMs / 1000)}s`}
        </TraceDescription>
      )}
    </TraceLine>
  );

  return (
    <Trace className="agent-reasoning" aria-label="Agent reasoning">
      {text ? (
        <TraceCollapsible open={open ?? streaming} onOpenChange={setOpen}>
          <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="agent-reasoning-content">
            {visibleText}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      ) : (
        line
      )}
    </Trace>
  );
}
