import type { AgentTaskKind } from "../shared/runs";
import { plainAnswer } from "./components/agentAnswer.ts";
import type { PakoMood } from "./components/onboarding/storyTypes";
import type { AgentRunState, AgentRunStep } from "./hooks/useAgentRun";
import type { PhotoSearchNotice } from "./photoSearchFeedback.ts";

/** How long each reaction to a moment plays before Pako rests; every other mood lasts as long as its cause. */
export const REACTION_MS = { happy: 1400, sad: 3400, dizzy: 2600 } as const;
type Reaction = keyof typeof REACTION_MS;

export const isReaction = (mood: PakoMood): mood is Reaction =>
  mood in REACTION_MS;

export type HomeGuide = {
  mood: PakoMood;
  line: string;
  /** The line announces new matches, so the hero offers a way to see them. */
  newMatches: boolean;
};

/** A photo search on home: dragged over the search, being read, or needing the student. */
export type PhotoMoment = "dragging" | "reading" | PhotoSearchNotice;

function photoGuide(photo: PhotoMoment): HomeGuide {
  if (photo === "dragging")
    return {
      mood: "listen",
      line: "Drop your photo here. I'll find similar things.",
      newMatches: false,
    };
  if (photo === "reading")
    return {
      mood: "search",
      line: "Let me look at your photo…",
      newMatches: false,
    };
  return { mood: photo.mood, line: photo.line, newMatches: false };
}

/**
 * What Pako shows and says beside the search on the home page. A photo search
 * speaks first, then new matches for saved searches; his mood otherwise
 * follows the search box.
 */
export function homeGuide({
  allowanceUsed,
  photo,
  unreadMatches,
  suggestionsLoading,
  typing,
  location,
}: {
  allowanceUsed: boolean;
  photo: PhotoMoment | null;
  unreadMatches: number;
  suggestionsLoading: boolean;
  /** The search box has focus or text. */
  typing: boolean;
  location: string;
}): HomeGuide {
  if (allowanceUsed)
    return {
      mood: "sleep",
      line: "I'm out of searches for today. See you tomorrow!",
      newMatches: false,
    };
  if (photo) return photoGuide(photo);
  const newMatches = unreadMatches > 0;
  return {
    mood: suggestionsLoading
      ? "think"
      : typing
        ? "listen"
        : newMatches
          ? "happy"
          : "wave",
    line: newMatches
      ? newMatchesLine(unreadMatches)
      : `Tell me what you need. I'll search around ${location}.`,
    newMatches,
  };
}

const newMatchesLine = (count: number) =>
  count === 1
    ? "I found a new match for your saved searches."
    : `I found ${count} new matches for your saved searches.`;

type ToolStep = AgentRunStep & { task: AgentTaskKind };
type TurnFacts = Pick<
  AgentRunState,
  | "status"
  | "steps"
  | "text"
  | "inventoryMatchIds"
  | "sources"
  | "questions"
  | "answers"
>;

const isToolStep = (step: AgentRunStep): step is ToolStep =>
  step.task !== undefined;
const isSearchTask = (task: AgentTaskKind) =>
  task === "listings" || task === "web";
const toolRunning = (steps: readonly AgentRunStep[]) =>
  steps.some((step) => isToolStep(step) && step.state === "running");

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

type Findings = Pick<TurnFacts, "inventoryMatchIds" | "sources">;
const hasFindings = (turn: Findings) =>
  Boolean(turn.inventoryMatchIds?.length) || turn.sources.length > 0;

/** The agent searched listings or the web and came back with neither. */
export function foundNothing(
  turn: Findings & Pick<TurnFacts, "steps">,
): boolean {
  const searched = agentToolSteps(turn.steps).some((step) =>
    isSearchTask(step.task),
  );
  return searched && !hasFindings(turn);
}

/** The turn has ended with listings or web results to look at. */
export function showedResults(turn: Findings & Pick<TurnFacts, "status">) {
  return turn.status === "complete" && hasFindings(turn);
}

function endingMood(turn: TurnFacts): PakoMood {
  if (turn.status === "error") return "dizzy";
  if (turn.status === "complete") return foundNothing(turn) ? "sad" : "happy";
  return "idle";
}

/** Pako asked something the student has not answered yet. */
const awaitingAnswer = (turn: Pick<TurnFacts, "questions" | "answers">) =>
  turn.questions.some((question) => !turn.answers[question.id]);

/**
 * Pako beside an agent turn: he thinks until the agent reaches for a tool,
 * searches or works while it does, talks while the answer appears and then
 * reacts to how the turn ended. After that he listens while a follow-up is typed
 * or while his question waits for an answer.
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
  const talking =
    turn.text !== "" &&
    (running ? !toolRunning(turn.steps) : textShown !== turn.text);
  if (talking) return { mood: "idle", talking: true };
  if (running) return { mood: workingMood(turn.steps), talking: false };
  return {
    mood: typing || awaitingAnswer(turn) ? "listen" : endingMood(turn),
    talking: false,
  };
}

/** The server's quick look through all student listings before the agent starts. */
const CATALOG_STEP_ID = "takeover-catalog";

/**
 * A step in the intro's words, for the live line and the activity list alike: the
 * searches name what Pako looks through, any other tool keeps its own label.
 */
export function stepWords(step: AgentRunStep, place?: string): string {
  if (step.id === CATALOG_STEP_ID) return "Checking student listings";
  if (step.task === "web") return "Checking other second-hand sites";
  if (step.label.startsWith("Searching takeover listings"))
    return place
      ? `Searching student listings near ${place}`
      : "Searching student listings";
  if (step.label === "Selecting takeover matches")
    return "Picking the best matches";
  if (step.label === "Offering to watch for this item")
    return "Offering to keep watch";
  return step.label;
}

/**
 * The one line Pako says while the agent works, like the steps of the intro's
 * search: he reads the request, names the tool the agent reached for last (the
 * one his mood follows) and writes once the answer streams in.
 */
export function workingLine(
  turn: Pick<TurnFacts, "steps" | "text">,
  place?: string,
): string {
  if (turn.text !== "" && !toolRunning(turn.steps)) return "Writing my answer…";
  const latest = agentToolSteps(turn.steps).at(-1);
  return latest ? `${stepWords(latest, place)}…` : "Reading your request…";
}

/**
 * What a turn tells a screen reader, once per change: each step while Pako works, then his
 * whole answer and any question he is waiting on. A failure is announced by its own alert.
 */
export function turnAnnouncement(
  turn: Pick<
    AgentRunState,
    "id" | "status" | "steps" | "text" | "questions" | "answers"
  >,
  place?: string,
): string {
  if (turn.status === "running") return workingLine(turn, place);
  if (turn.status === "error") return "";
  if (turn.status === "idle") return turn.id ? "Pako stopped." : "";
  const answer = plainAnswer(turn.text);
  const question = turn.questions.find(
    (item) => !turn.answers[item.id],
  )?.question;
  const spoken =
    question && !answer.includes(question.trim())
      ? `${answer} ${question}`.trim()
      : answer;
  return spoken ? `Pako: ${spoken}` : "";
}
