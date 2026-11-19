import type { AgentRunStep } from "./hooks/useAgentRun.ts";
import { stepWords, type StepVoice } from "./pakoMoods.ts";

/** Pako's work steps; the request steps around them show only when he did no work. */
function taskSteps(steps: readonly AgentRunStep[]) {
  const hasWork = steps.some((step) => step.task && step.task !== "request");
  return hasWork
    ? steps.filter((step) => step.task && step.task !== "request")
    : steps;
}

/**
 * The lines of Pako's activity: his work steps, each wording once. A step he
 * took again, such as a second price search, stays one line in its latest state.
 */
export function activityLines(
  steps: readonly AgentRunStep[],
  place: string | undefined,
  voice: StepVoice,
): AgentRunStep[] {
  const lines = new Map<string, AgentRunStep>();
  for (const step of taskSteps(steps)) {
    const words = stepWords(step, place, voice);
    const earlier = lines.get(words);
    lines.set(words, earlier?.state === "running" ? earlier : step);
  }
  return [...lines.values()];
}
