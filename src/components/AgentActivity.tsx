import { useState } from "react";
import type { AgentTaskKind } from "../../shared/runs";
import type { AgentRunStep } from "../hooks/useAgentRun";
import { Check, LoaderCircle, X } from "./icons";
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
import "./agent-activity.css";

const taskTitles: Record<
  AgentTaskKind,
  { name: string; running: string; complete: string }
> = {
  request: {
    name: "Request",
    running: "Reading your request",
    complete: "Read your request",
  },
  listings: {
    name: "Listing checks",
    running: "Checking Takeover listings",
    complete: "Checked Takeover listings",
  },
  web: {
    name: "Web search",
    running: "Searching the web",
    complete: "Searched the web",
  },
  listing: {
    name: "Listing changes",
    running: "Preparing listing changes",
    complete: "Prepared listing changes",
  },
  proposal: {
    name: "Proposal checks",
    running: "Working on your proposal",
    complete: "Reviewed your proposal",
  },
};

function Task({
  kind,
  steps,
  running,
}: {
  kind: AgentTaskKind;
  steps: readonly AgentRunStep[];
  running: boolean;
}) {
  const [open, setOpen] = useState<boolean>();
  const active = running && steps.some((step) => step.state === "running");
  const failed = steps.some((step) => step.state === "error");
  const needsInput = steps.some((step) => step.state === "needs_input");
  const stopped = !running && steps.some((step) => step.state === "running");
  const titles = taskTitles[kind];
  const title = active
    ? titles.running
    : failed
      ? `${titles.name} incomplete`
      : needsInput
        ? `${titles.name}: more details needed`
        : stopped
          ? `${titles.name} stopped`
          : titles.complete;
  const description = failed
    ? `${steps.filter((step) => step.state === "error").length} failed`
    : `${steps.length} ${steps.length === 1 ? "step" : "steps"}`;
  return (
    <TraceCollapsible
      open={open ?? active}
      onOpenChange={setOpen}
      className="agent-task"
      aria-busy={active}
    >
      <TraceCollapsibleTrigger>
        <TraceLine status={!active && failed ? "error" : undefined}>
          <TraceIcon>
            {active ? (
              <LoaderCircle animate />
            ) : failed ? (
              <X />
            ) : stopped || needsInput ? (
              <span className="agent-trace-dot" />
            ) : (
              <Check />
            )}
          </TraceIcon>
          <TraceTitle>{title}</TraceTitle>
          <TraceDescription>{description}</TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent keepMounted>
        <Trace role="list" aria-label={`${titles.name} steps`}>
          {steps.map((step) => (
            <TraceLine
              key={step.id}
              role="listitem"
              status={step.state === "error" ? "error" : undefined}
            >
              <TraceIcon>
                {step.state === "complete" ? (
                  <Check />
                ) : step.state === "error" ? (
                  <X />
                ) : step.state === "running" && running ? (
                  <LoaderCircle animate />
                ) : (
                  <span className="agent-trace-dot" />
                )}
              </TraceIcon>
              <TraceTitle>{step.label}</TraceTitle>
              <TraceDescription>
                {step.state === "complete"
                  ? "Done"
                  : step.state === "error"
                    ? "Failed"
                    : step.state === "needs_input"
                      ? "Needs details"
                      : running
                        ? "In progress"
                        : "Stopped"}
              </TraceDescription>
            </TraceLine>
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function visibleTaskSteps(steps: readonly AgentRunStep[]) {
  const hasWork = steps.some((step) => step.task && step.task !== "request");
  return hasWork
    ? steps.filter((step) => step.task && step.task !== "request")
    : steps;
}

export default function AgentActivity({
  steps,
  running,
}: {
  steps: readonly AgentRunStep[];
  running: boolean;
}) {
  const tasks = new Map<AgentTaskKind, AgentRunStep[]>();
  for (const step of visibleTaskSteps(steps)) {
    // Model bookkeeping remains in Debug details, apart from the user's tasks.
    const kind = step.task ?? "request";
    const items = tasks.get(kind) ?? [];
    items.push(step);
    tasks.set(kind, items);
  }
  if (!tasks.size) return null;
  return (
    <Trace className="agent-tasks" role="group" aria-label="Agent tasks">
      {[...tasks].map(([kind, items]) => (
        <Task key={kind} kind={kind} steps={items} running={running} />
      ))}
    </Trace>
  );
}
