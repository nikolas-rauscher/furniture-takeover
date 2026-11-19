import type { Deal, DealRole, DealTerms } from "../shared/deal";
import { formatPickup } from "../shared/pickupTime.ts";
import type { AgentTaskKind } from "../shared/runs";
import { plainAnswer } from "./components/agentAnswer.ts";
import { agreedWords, termsSentence } from "./dealWords.ts";
import type { PakoMood } from "./components/onboarding/storyTypes";
import type { AgentRunState, AgentRunStep } from "./hooks/useAgentRun";
import type { TrayPhase } from "./listingQuestions";
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

/** A deal Pako mentions first on home: an offer waiting for the student, or a booked pickup. */
export type HomeDealNews =
  | { kind: "offer"; other: string; title: string }
  | { kind: "booked"; title: string; when: string };

/** What Pako tells on home about a deal: the other student's offer, or the booked pickup. */
export function homeDealNews({
  deal,
  role,
  other,
  title,
}: {
  deal: Deal;
  role: DealRole;
  other: string;
  title: string;
}): HomeDealNews | null {
  if (deal.status === "open" && deal.proposal && deal.proposal.by !== role)
    return { kind: "offer", other, title };
  const pickupAt = deal.status === "agreed" && deal.agreed?.terms.pickupAt;
  return pickupAt
    ? { kind: "booked", title, when: formatPickup(pickupAt) }
    : null;
}

const dealNewsLine = (deal: HomeDealNews) =>
  deal.kind === "offer"
    ? `${deal.other} made you an offer for the ${deal.title}.`
    : `Pickup booked: the ${deal.title}, ${deal.when}.`;

/**
 * What Pako shows and says beside the search on the home page. A photo search
 * speaks first, then a deal that needs the student or is booked, then new
 * matches for saved searches; his mood otherwise follows the search box.
 */
export function homeGuide({
  allowanceUsed,
  photo,
  deal,
  unreadMatches,
  suggestionsLoading,
  typing,
  location,
}: {
  allowanceUsed: boolean;
  photo: PhotoMoment | null;
  deal: HomeDealNews | null;
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
  if (deal)
    return {
      mood: suggestionsLoading
        ? "think"
        : typing
          ? "listen"
          : deal.kind === "offer"
            ? "happy"
            : "wave",
      line: dealNewsLine(deal),
      newMatches: false,
    };
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

/** Whose words a turn's steps are told in: a buyer's search or a seller's listing. */
export type StepVoice = "search" | "listing";

const offerCount = (count: number) =>
  count === 1 ? "1 offer" : `${count} offers`;

/**
 * A step in the intro's words, for the live line and the activity list alike: the
 * searches name what Pako looks through, any other tool keeps its own label. A
 * listing step keeps the server's plain label and names what it looked at.
 */
export function stepWords(
  step: AgentRunStep,
  place?: string,
  voice: StepVoice = "search",
): string {
  if (voice === "listing")
    return step.detail ? `${step.label} · ${step.detail}` : step.label;
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

type WorkingFacts = Pick<TurnFacts, "steps" | "text" | "sources">;

/**
 * While Pako writes a listing he names the tool at work, then how many offers the
 * research brought back, then what the model step is doing.
 */
function listingWorkingLine(turn: WorkingFacts): string {
  const tools = turn.steps.filter(isToolStep);
  const running = tools.filter((step) => step.state === "running").at(-1);
  if (running) return `${running.label}…`;
  if (tools.at(-1)?.task === "web" && turn.sources.length)
    return `Comparing ${offerCount(turn.sources.length)}…`;
  const latest = turn.steps.at(-1);
  return latest ? `${latest.label}…` : "Reading your photos and notes…";
}

/**
 * The one line Pako says while the agent works, like the steps of the intro's
 * search: he reads the request, names the tool the agent reached for last (the
 * one his mood follows) and writes once the answer streams in.
 */
export function workingLine(
  turn: WorkingFacts,
  place?: string,
  voice: StepVoice = "search",
): string {
  if (turn.text !== "" && !toolRunning(turn.steps)) return "Writing my answer…";
  if (voice === "listing") return listingWorkingLine(turn);
  const latest = agentToolSteps(turn.steps).at(-1);
  return latest ? `${stepWords(latest, place)}…` : "Reading your request…";
}

/**
 * The steps worth keeping once a turn moves on: a listing tool the agent corrected
 * itself first reports that it needs details, and that report goes once a later
 * step with the same label completed.
 */
export function settledSteps(steps: readonly AgentRunStep[]): AgentRunStep[] {
  return steps.filter(
    (step, index) =>
      step.state !== "needs_input" ||
      !steps
        .slice(index + 1)
        .some(
          (later) => later.label === step.label && later.state === "complete",
        ),
  );
}

/** The collapsed activity line: the offers a listing turn compared, otherwise its step count. */
export function stepsSummary(
  stepCount: number,
  sourceCount: number,
  voice: StepVoice,
): string {
  if (voice === "listing" && sourceCount > 0)
    return `Compared ${offerCount(sourceCount)}`;
  return stepCount === 1 ? "1 step" : `${stepCount} steps`;
}

/**
 * What a turn tells a screen reader, once per change: each step while Pako works, then his
 * whole answer and any question he is waiting on. A failure is announced by its own alert.
 */
export function turnAnnouncement(
  turn: Pick<
    AgentRunState,
    "id" | "status" | "steps" | "text" | "sources" | "questions" | "answers"
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

const TRAY_MOODS: Record<Exclude<TrayPhase, "working">, PakoMood> = {
  hidden: "idle",
  starting: "think",
  asking: "listen",
  done: "happy",
  error: "dizzy",
  asleep: "sleep",
};

/** Pako in the tray: he works like in the thread, listens while he asks and reacts at the end. */
export function trayMood(
  phase: TrayPhase,
  steps: readonly AgentRunStep[],
): PakoMood {
  return phase === "working" ? workingMood(steps) : TRAY_MOODS[phase];
}

/**
 * The listing conversation's one voice: what Pako does while he works, then his
 * answer with the first question in the tray, each later question on its own and
 * his closing line. A failure is announced by its own alert.
 */
export function listingAnnouncement(
  turn: Pick<AgentRunState, "steps" | "text" | "sources" | "questions">,
  tray: {
    phase: TrayPhase;
    question?: { text: string; first: boolean };
    closing: string;
  },
): string {
  const answer = plainAnswer(turn.text);
  const spoken = (...parts: string[]) =>
    `Pako: ${parts.filter(Boolean).join(" ")}`;
  switch (tray.phase) {
    case "starting":
    case "working":
      return workingLine(turn, undefined, "listing");
    case "asking":
      return tray.question
        ? spoken(tray.question.first ? answer : "", tray.question.text)
        : "";
    case "done":
      return spoken(turn.questions.length ? "" : answer, tray.closing);
    case "asleep":
      return spoken(tray.closing);
    default:
      return "";
  }
}

/** A moment beside an open thread, in the tray above its composer. */
export type ThreadMoment =
  | { phase: "reading" | "asking" | "asleep" | "offline" | "error" }
  | { phase: "ready"; summary: string }
  | { phase: "paused"; remaining: number | undefined }
  | { phase: "unavailable"; reason: "unconfigured" | "missing" }
  | { phase: "gone"; status: "reserved" | "sold" | "withdrawn" }
  | { phase: "no_answer"; hoursWaiting: number }
  /** The other student's offer on the deal card: complete, or with terms still open. */
  | { phase: "deal_offer" | "deal_partial"; terms: DealTerms }
  /** The student's own offer waits for the other student's confirmation. */
  | { phase: "deal_waiting" }
  | { phase: "deal_agreed"; role: DealRole }
  | { phase: "deal_cancelled"; by: "me" | "them" | "listing" };

/** Pako cheers a deal both confirmed once, then rests. */
const CHEER_MS = 2400;

/** How long Pako's mood for a thread moment plays before he rests; null while it lasts as long as its cause. */
export function threadReactionMs(
  moment: ThreadMoment,
  mood: PakoMood,
): number | null {
  if (moment.phase === "deal_agreed") return CHEER_MS;
  return isReaction(mood) ? REACTION_MS[mood] : null;
}

const CANCELLED: Record<
  Extract<ThreadMoment, { phase: "deal_cancelled" }>["by"],
  (other: string) => string
> = {
  me: () => "You cancelled the deal.",
  them: (other) => `${other} cancelled the deal.`,
  listing: () => "The listing is available again, so this deal ended.",
};

const GONE: Record<Extract<ThreadMoment, { phase: "gone" }>["status"], string> =
  {
    reserved: "is reserved now",
    sold: "is sold",
    withdrawn: "isn't listed anymore",
  };

function waitedFor(other: string, hours: number) {
  const days = Math.floor(hours / 24);
  return days < 2
    ? `No answer from ${other} since yesterday.`
    : `No answer from ${other} for ${days} days.`;
}

/**
 * What Pako shows and says beside a thread: he thinks while he reads, is happy
 * when his reading arrives, sad when the item is gone, dizzy when a reading
 * fails and asleep once his readings for today are used up. He names the other
 * student and never guesses their pronouns.
 */
export function threadGuide(
  moment: ThreadMoment,
  { other, title }: { other: string; title: string },
): { mood: PakoMood; line: string } {
  switch (moment.phase) {
    case "reading":
      return { mood: "think", line: `Reading ${other}'s reply…` };
    case "asking":
      return { mood: "think", line: "Writing that for you…" };
    case "ready":
      return { mood: "happy", line: moment.summary };
    case "paused":
      return {
        mood: "idle",
        line:
          moment.remaining === undefined
            ? `Want me to read ${other}'s reply?`
            : `Want me to read ${other}'s reply? (${moment.remaining} left today)`,
      };
    case "asleep":
      return {
        mood: "sleep",
        line: "I'm out of answers for today. You can still reply yourself, and the deal card still works.",
      };
    case "offline":
      return {
        mood: "idle",
        line: "You're offline. I'll read it when you're back.",
      };
    case "error":
      return { mood: "dizzy", line: "Sorry, I couldn't read that one." };
    case "unavailable":
      return {
        mood: "idle",
        line:
          moment.reason === "missing"
            ? "I can't read replies here yet: this server still needs its update. You can still reply yourself."
            : "I'm not set up here, so I can't read replies. You can still reply yourself.",
      };
    case "gone":
      return {
        mood: "sad",
        line: `The ${title} ${GONE[moment.status]}. Shall I look for something similar?`,
      };
    case "no_answer":
      return { mood: "idle", line: waitedFor(other, moment.hoursWaiting) };
    case "deal_offer":
      return {
        mood: "listen",
        line: `${other} offers ${termsSentence(moment.terms)}. Confirm, counter or decline?`,
      };
    case "deal_partial":
      return {
        mood: "listen",
        line: `${other} suggests ${termsSentence(moment.terms)}. Fill in the rest, and they can confirm.`,
      };
    case "deal_waiting":
      return {
        mood: "listen",
        line: `Now it's ${other}'s turn to confirm. I'll tell you when they answer.`,
      };
    case "deal_agreed": {
      const { cheer, meaning } = agreedWords(moment.role, other, title);
      return { mood: "cheer", line: `${cheer} ${meaning}` };
    }
    case "deal_cancelled":
      return { mood: "sad", line: CANCELLED[moment.by](other) };
  }
}
