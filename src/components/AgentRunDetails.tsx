import { useState, type ReactNode } from "react";
import type { AgentReasoningPart } from "../../shared/runs";
import type { AgentRunStep } from "../hooks/useAgentRun";
import { settledSteps, stepsSummary, type StepVoice } from "../pakoMoods";
import { activityLines } from "../activityLines";
import AgentActivity, { StepMark } from "./AgentActivity";
import AgentReasoning from "./AgentReasoning";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceLine,
  TraceTitle,
} from "./ui/trace";

export default function AgentRunDetails({
  reasoning = [],
  steps: reported = [],
  place,
  voice = "search",
  sourceCount = 0,
  workingLine,
  heading,
  actions,
  status,
  summaryTitle = false,
  children,
}: {
  reasoning?: readonly AgentReasoningPart[];
  steps?: readonly AgentRunStep[];
  /** The search area as Pako names it in the steps. */
  place?: string;
  voice?: StepVoice;
  /** The search results the turn brought back, which a listing turn compared. */
  sourceCount?: number;
  /** What Pako is doing while the agent works; absent once the turn has stopped. */
  workingLine?: string;
  heading?: ReactNode;
  actions?: ReactNode;
  status?: string;
  /** Names the activity by its summary, as a header does, also without one. */
  summaryTitle?: boolean;
  /** What the activity brought back, such as the sources it read, shown with its steps. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>();
  const running = workingLine !== undefined;
  const steps = settledSteps(reported);
  const taskSteps = activityLines(steps, place, voice);
  const summary = stepsSummary(taskSteps.length, sourceCount, voice);
  const hasReasoning = reasoning.some(
    (part) => part.text || (running && part.status === "streaming"),
  );
  const hasHeader = Boolean(heading || actions);
  const titledBySummary = hasHeader || summaryTitle;
  const hasDetails = hasReasoning || steps.length > 0 || running;
  const header = (trigger?: ReactNode) => (
    <div className="agent-run-details-header">
      {heading}
      {trigger}
      {actions}
    </div>
  );
  if (!hasDetails && !hasHeader) return null;
  const failed = steps.some((step) => step.state === "error");
  const unfinished =
    steps.some(
      (step) =>
        step.state === "needs_input" || (!running && step.state === "running"),
    ) ||
    reasoning.some(
      (part) =>
        part.status === "stopped" || (!running && part.status === "streaming"),
    );
  const trigger = (
    <TraceCollapsibleTrigger
      aria-label={
        titledBySummary
          ? `Agent activity${steps.length ? `, ${summary}` : ""}`
          : undefined
      }
    >
      <TraceLine status={failed ? "error" : undefined}>
        <StepMark
          state={
            running
              ? "running"
              : failed
                ? "failed"
                : unfinished || !hasDetails
                  ? "paused"
                  : "done"
          }
        />
        {/* One line updates in place while the agent works; an open list would grow step
            by step and push the results below it around. */}
        <TraceTitle>
          {running ? (
            <span key={workingLine} className="agent-run-current-step">
              {workingLine}
            </span>
          ) : steps.length ? (
            titledBySummary ? (
              summary
            ) : (
              "Activity"
            )
          ) : hasReasoning ? (
            "Pako's thoughts"
          ) : (
            (status ?? "Activity")
          )}
        </TraceTitle>
        {!titledBySummary && steps.length > 0 && (
          <TraceDescription>{summary}</TraceDescription>
        )}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
  return (
    <Trace
      className={`agent-run-details${hasHeader ? " has-header" : ""}`}
      aria-label="Agent activity"
      aria-busy={running}
    >
      <TraceCollapsible open={open ?? false} onOpenChange={setOpen}>
        {hasHeader ? header(trigger) : trigger}
        <TraceCollapsibleContent
          keepMounted
          className="agent-run-details-content"
        >
          <AgentActivity
            steps={steps}
            running={running}
            place={place}
            voice={voice}
          />
          <AgentReasoning parts={reasoning} running={running} />
          {children}
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
