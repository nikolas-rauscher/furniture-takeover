import type { AgentTaskKind } from "../shared/runs";
import type { PakoMood } from "./components/onboarding/storyTypes";
import type { AgentRunState, AgentRunStep } from "./hooks/useAgentRun";

/** How long each reaction to a moment plays before Pako rests; every other mood lasts as long as its cause. */
export const REACTION_MS = { happy: 1400, sad: 3400, dizzy: 2600 } as const;
type Reaction = keyof typeof REACTION_MS;

export const isReaction = (mood: PakoMood): mood is Reaction =>
  mood in REACTION_MS;

/** What Pako shows and says beside the search on the home page. */
export function homeGuide({
  allowanceUsed,
  suggestionsLoading,
  typing,
  location,
}: {
  allowanceUsed: boolean;
  suggestionsLoading: boolean;
  /** The search box has focus or text. */
  typing: boolean;
  location: string;
}): { mood: PakoMood; line: string } {
  if (allowanceUsed)
    return {
      mood: "sleep",
      line: "I'm out of searches for today. See you tomorrow!",
    };
  return {
    mood: suggestionsLoading ? "think" : typing ? "listen" : "wave",
    line: `Tell me what you need. I'll search around ${location}.`,
  };
}

type ToolStep = AgentRunStep & { task: AgentTaskKind };
type TurnFacts = Pick<
  AgentRunState,
  "status" | "steps" | "text" | "inventoryMatchIds" | "sources"
>;

const isToolStep = (step: AgentRunStep): step is ToolStep =>
  step.task !== undefined;
const isSearchTask = (task: AgentTaskKind) =>
  task === "listings" || task === "web";

/**
 * The tools the agent chose itself, in the order it started them. Its first
 * model step reads the request; the catalog check the server runs before that
 * is not the agent's choice.
 */
function agentToolSteps(steps: readonly AgentRunStep[]): ToolStep[] {
  const reading = steps.findIndex((step) => !isToolStep(step));
  return reading < 0 ? [] : steps.slice(reading + 1).filter(isToolStep);
}

/** Searches show the magnifier, writing a listing or an offer keeps him busy, asking is more thinking. */
function toolMood(task: AgentTaskKind): PakoMood {
  if (isSearchTask(task)) return "search";
  return task === "request" ? "think" : "work";
}

/** Pako thinks until the agent reaches for a tool, then keeps the mood of the latest one. */
function workingMood(steps: readonly AgentRunStep[]): PakoMood {
  const latest = agentToolSteps(steps).at(-1);
  return latest ? toolMood(latest.task) : "think";
}

/** The agent searched listings or the web and came back with neither. */
function foundNothing(turn: TurnFacts): boolean {
  const searched = agentToolSteps(turn.steps).some((step) =>
    isSearchTask(step.task),
  );
  return searched && !turn.inventoryMatchIds?.length && !turn.sources.length;
}

function endingMood(turn: TurnFacts): PakoMood {
  if (turn.status === "error") return "dizzy";
  if (turn.status === "complete") return foundNothing(turn) ? "sad" : "happy";
  return "idle";
}

/**
 * Pako beside an agent turn: he thinks until the agent reaches for a tool,
 * searches or works while it does, talks while the answer appears and then
 * reacts to how the turn ended. After that he listens while a follow-up is typed.
 */
export function agentTurnPako(
  turn: TurnFacts,
  {
    textShown,
    typing,
  }: {
    /** The part of the answer already on screen, which follows the stream at reading pace. */
    textShown: string;
    /** The composer has text. */
    typing: boolean;
  },
): { mood: PakoMood; talking: boolean } {
  const running = turn.status === "running";
  const toolRunning = turn.steps.some(
    (step) => isToolStep(step) && step.state === "running",
  );
  const talking =
    turn.text !== "" && (running ? !toolRunning : textShown !== turn.text);
  if (talking) return { mood: "idle", talking: true };
  if (running) return { mood: workingMood(turn.steps), talking: false };
  return { mood: typing ? "listen" : endingMood(turn), talking: false };
}
