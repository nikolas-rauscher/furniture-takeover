import {
  pickupDay,
  type Deal,
  type DealRole,
  type DealTerms,
} from "../shared/deal.ts";
import { money } from "../shared/marketplace.ts";
import { formatPickup, zurichClockTime } from "../shared/pickupTime.ts";
import type { AgentTaskKind } from "../shared/runs";
import { plainAnswer } from "./components/agentAnswer.ts";
import {
  agreedWords,
  openTermsList,
  pickupCountdown,
  shortPickup,
} from "./dealWords.ts";
import type { PickupDay } from "./pickupOptions.ts";
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

/** A photo search on home: its button focused, dragged over the search, being read, or needing the student. */
export type PhotoMoment = "hint" | "dragging" | "reading" | PhotoSearchNotice;

function photoGuide(photo: PhotoMoment): HomeGuide {
  if (photo === "hint")
    return {
      mood: "listen",
      line: "Search by photo: choose one and I'll look for similar items.",
      newMatches: false,
    };
  if (photo === "dragging")
    return {
      mood: "listen",
      line: "Drop a photo and I'll look for similar items.",
      newMatches: false,
    };
  if (photo === "reading")
    return {
      mood: "search",
      line: "I'm looking at your photo…",
      newMatches: false,
    };
  return { mood: photo.mood, line: photo.line, newMatches: false };
}

/** A deal Pako mentions first on home: an offer waiting for the student, or a booked pickup. */
export type HomeDealNews =
  | { kind: "offer"; other: string; title: string }
  | { kind: "booked"; title: string; when: string }
  /** The pickup is within 2 h, now or overdue: "Pickup in 1 h 40 min". */
  | { kind: "pickup_day"; title: string; countdown: string }
  /** A day after an unclosed pickup, Pako's question waits for an answer. */
  | { kind: "pickup_check"; other: string; title: string };

/** What Pako tells on home about a deal: the other student's offer, or the booked pickup. */
export function homeDealNews({
  deal,
  role,
  other,
  title,
  now,
}: {
  deal: Deal;
  role: DealRole;
  other: string;
  title: string;
  now: Date;
}): HomeDealNews | null {
  if (deal.status === "open" && deal.proposal && deal.proposal.by !== role)
    return { kind: "offer", other, title };
  const day = pickupDay(deal, role, now);
  if (day?.pickupCheck && !day.pickupCheck.expired)
    return { kind: "pickup_check", other, title };
  if (day && day.phase !== "booked")
    return { kind: "pickup_day", title, countdown: pickupCountdown(day) };
  const pickupAt = deal.status === "agreed" && deal.agreed?.terms.pickupAt;
  return pickupAt
    ? { kind: "booked", title, when: formatPickup(pickupAt) }
    : null;
}

function dealNewsLine(deal: HomeDealNews) {
  switch (deal.kind) {
    case "offer":
      return `${deal.other} made you an offer for the ${deal.title}.`;
    case "booked":
      return `Pickup booked: the ${deal.title}, ${deal.when}.`;
    case "pickup_day":
      return `${deal.countdown}: the ${deal.title}.`;
    case "pickup_check":
      return `Did the pickup of the ${deal.title} with ${deal.other} happen? Let me know in Messages.`;
  }
}

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
      line: "I've used today's requests. You can still browse.",
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
            : deal.kind === "pickup_check"
              ? "think"
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
  | "congested"
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
  if (turn.congested)
    return {
      mood: busyGuide(turn.congested === "retrying", "search").mood,
      talking: false,
    };
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

const sourceCountLabel = (count: number) =>
  count === 1 ? "1 source" : `${count} sources`;

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
    return `Reviewing ${sourceCountLabel(turn.sources.length)}…`;
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

/** The collapsed activity line: the sources a listing turn found, otherwise how many things Pako did. */
export function stepsSummary(
  stepCount: number,
  sourceCount: number,
  voice: StepVoice,
): string {
  if (voice === "listing" && sourceCount > 0)
    return `Found ${sourceCountLabel(sourceCount)}`;
  return stepCount === 1 ? "1 activity" : `${stepCount} activities`;
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

/**
 * Terms on the deal card from the other student: their offer, complete or
 * with terms still open, or what Pako read as agreed in their reply. Each
 * comes with what its price compares to: the asking price, or the price the
 * student offered last.
 */
type OfferMoment = {
  phase: "deal_offer" | "deal_partial" | "deal_looks_agreed";
  terms: DealTerms;
  role: DealRole;
  asking: number;
  mine: number | null;
};

/** A moment beside an open thread, in the tray above its composer. */
export type ThreadMoment =
  | { phase: "reading" | "asking" | "asleep" | "offline" | "error" }
  /** Too many students asked at once: one automatic retry, then a tap. */
  | { phase: "busy"; retrying: boolean }
  | { phase: "ready"; summary: string }
  | { phase: "paused"; remaining: number | undefined }
  | { phase: "unavailable"; reason: "unconfigured" | "missing" }
  | { phase: "gone"; status: "reserved" | "sold" | "withdrawn" }
  | { phase: "no_answer"; hoursWaiting: number }
  /** The seller agreed with another buyer; this one has not heard yet. */
  | { phase: "agreed_elsewhere"; agreedWith: string }
  | OfferMoment
  /** The student's own offer waits for the other student's confirmation. */
  | { phase: "deal_waiting" }
  | { phase: "deal_agreed"; role: DealRole }
  | { phase: "deal_cancelled"; by: "me" | "them" | "listing" | "unconfirmed" };

/**
 * Pako when too many students ask at once: honest that nothing started,
 * busy rather than broken while he tries once more, then a calm next step.
 */
export function busyGuide(
  retrying: boolean,
  where: "thread" | "search",
): { mood: PakoMood; line: string } {
  if (retrying)
    return {
      mood: "work",
      line: "Lots of students are asking me at once. I'll try again in a second…",
    };
  return {
    mood: "idle",
    line:
      where === "thread"
        ? "I'm still busy. Try again in a moment, or write your own reply."
        : "I'm still busy, so your request hasn't started. Try again in a moment.",
  };
}

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
  unconfirmed: () =>
    "No one confirmed the pickup in time, so I released the reservation.",
};

const GONE: Record<Extract<ThreadMoment, { phase: "gone" }>["status"], string> =
  {
    reserved: "is reserved for someone else",
    sold: "is sold",
    withdrawn: "isn't listed anymore",
  };

/**
 * What an offer's price means, which the deal card does not say: for a seller
 * against the asking price, for a buyer against their own last offer, or the
 * asking price before they made one. A free item has nothing to compare.
 */
export function priceComparison({
  terms,
  role,
  asking,
  mine,
}: Omit<OfferMoment, "phase">): string {
  const { amount } = terms;
  if (amount === null) return "";
  if (role === "buyer" && mine !== null) {
    if (amount === mine) return "That's what you offered.";
    return amount > mine
      ? `That's ${money(amount - mine)} more than you offered.`
      : `That's ${money(mine - amount)} less than you offered.`;
  }
  if (asking === 0) return "";
  const whose = role === "seller" ? "your asking price" : "the asking price";
  if (amount === asking) return `That's ${whose}.`;
  return amount < asking
    ? `That's ${money(asking - amount)} under ${whose}.`
    : `That's ${money(amount - asking)} over ${whose}.`;
}

const sentences = (...parts: string[]) => parts.filter(Boolean).join(" ");

function waitedFor(other: string, hours: number) {
  const days = Math.floor(hours / 24);
  return days < 2
    ? `Still waiting for ${other}.`
    : `Still waiting for ${other} after ${days} days.`;
}

/** Who the item is reserved for once both students confirm. */
const reservedFor = (role: DealRole, other: string) =>
  role === "seller" ? other : "you";

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
    case "busy":
      return busyGuide(moment.retrying, "thread");
    case "ready":
      return { mood: "happy", line: moment.summary };
    case "paused":
      return {
        mood: "idle",
        line:
          moment.remaining === undefined
            ? `Read ${other}'s reply?`
            : `Read ${other}'s reply? ${moment.remaining} ${moment.remaining === 1 ? "read" : "reads"} left today.`,
      };
    case "asleep":
      return {
        mood: "sleep",
        line: "I've used today's reads. You can still reply or use the deal card.",
      };
    case "offline":
      return {
        mood: "idle",
        line: "You're offline. Reconnect to read replies.",
      };
    case "error":
      return {
        mood: "dizzy",
        line: "I couldn't read this reply. Try again or write your own.",
      };
    case "unavailable":
      return {
        mood: "idle",
        line:
          moment.reason === "missing"
            ? "I can't read replies here. You can still write your own."
            : "I'm not set up here, so I can't read replies. You can still write your own.",
      };
    case "gone":
      return {
        mood: "sad",
        line: `The ${title} ${GONE[moment.status]}. Shall I look for something similar?`,
      };
    case "no_answer":
      return { mood: "idle", line: waitedFor(other, moment.hoursWaiting) };
    case "agreed_elsewhere":
      return {
        mood: "listen",
        line: `You agreed with ${moment.agreedWith}. Let ${other} know?`,
      };
    case "deal_offer":
      return {
        mood: "listen",
        line: sentences(
          priceComparison(moment),
          `Confirming reserves the ${title} for ${reservedFor(moment.role, other)}.`,
        ),
      };
    case "deal_partial":
      return {
        mood: "listen",
        line: sentences(
          priceComparison(moment),
          `Add the ${openTermsList(moment.terms)} to send it back, then ${other} can confirm.`,
        ),
      };
    case "deal_looks_agreed":
      return {
        mood: "happy",
        line: sentences(
          priceComparison(moment),
          `Once you both confirm, the ${title} is reserved for ${reservedFor(moment.role, other)}.`,
        ),
      };
    case "deal_waiting":
      return { mood: "listen", line: `Waiting for ${other} to confirm.` };
    case "deal_agreed": {
      const { cheer, meaning } = agreedWords(moment.role, other, title);
      return { mood: "cheer", line: `${cheer} ${meaning}` };
    }
    case "deal_cancelled":
      return { mood: "sad", line: CANCELLED[moment.by](other) };
  }
}

/**
 * A day after the pickup Pako asks whether it happened; after two he says he
 * released the item. A pickup the buyer reported collected never expires and
 * only waits for the close.
 */
function pickupCheckGuide(
  check: NonNullable<PickupDay["pickupCheck"]>,
  role: DealRole,
  other: string,
  title: string,
): { mood: PakoMood; line: string } {
  if (check.expired)
    return {
      mood: "idle",
      line: `Neither of you answered, so I released the ${title}.`,
    };
  if (!check.expiresAt)
    return {
      mood: "think",
      line:
        role === "seller"
          ? `${other} says they picked up the ${title}. Tap Yes to finish.`
          : `You picked up the ${title}. Tap Yes to finish.`,
    };
  return {
    mood: "think",
    line: `Did the pickup with ${other} happen? If no one answers by ${formatPickup(check.expiresAt)}, I'll release the ${title}.`,
  };
}

/** While the student picks a new time or how late they are, Pako speaks to that step instead of naming another button. */
export function pickupStepGuide(step: "late" | "change"): {
  mood: PakoMood;
  line: string;
} {
  return step === "change"
    ? { mood: "listen", line: "Pick a time. I'll show you the message first." }
    : {
        mood: "listen",
        line: "Pick how late. I'll show you the message first.",
      };
}

/**
 * Pako's line on the pickup card, by how close the pickup is and what the
 * other student last said: a new time to answer first, then their signals,
 * then what to tap next. He names the other student and never guesses their
 * pronouns.
 */
export function pickupGuide({
  day,
  deal,
  role,
  other,
  title,
}: {
  day: PickupDay;
  deal: Deal;
  role: DealRole;
  other: string;
  title: string;
}): { mood: PakoMood; line: string } {
  if (day.pickupCheck)
    return pickupCheckGuide(day.pickupCheck, role, other, title);
  const signals = deal.pickup;
  const theirs: DealRole = role === "buyer" ? "seller" : "buyer";
  const proposed = deal.proposal?.terms.pickupAt;
  if (day.change === "received" && proposed)
    return {
      mood: "listen",
      line: `${other} suggests ${formatPickup(proposed)} instead. Accept it, or keep ${shortPickup(day.terms.pickupAt!)}.`,
    };
  if (day.change === "sent")
    return {
      mood: "listen",
      line: `Waiting for ${other} to answer your new time.`,
    };
  if (day.buyerReportedPickup)
    return role === "seller"
      ? {
          mood: "happy",
          line: `${other} says they picked it up. Mark it sold to finish.`,
        }
      : {
          mood: "idle",
          line: `Enjoy the ${title}! ${other} marks it sold next.`,
        };
  if (signals?.noShow?.by === role)
    return {
      mood: "think",
      line:
        role === "seller"
          ? `If ${other} still doesn't come, you can release the ${title}.`
          : `If ${other} still doesn't come, you can cancel the pickup.`,
    };
  if (signals?.late && signals.late.by === theirs) {
    const around =
      Date.parse(day.terms.pickupAt!) + signals.late.minutes * 60_000;
    return {
      mood: "listen",
      line: `${other} is running late, so expect them around ${zurichClockTime(new Date(around).toISOString())}.`,
    };
  }
  if (signals?.onWay[theirs])
    return signals.onWay[role]
      ? { mood: "happy", line: "You're both on the way. See you there!" }
      : {
          mood: "happy",
          line: `${other} is on the way. Tap On my way when you leave too.`,
        };
  switch (day.phase) {
    case "booked":
      return {
        mood: "idle",
        line: "You're all set. If plans change, change the time here.",
      };
    case "pickup_soon":
      return {
        mood: "wave",
        line: `Tap On my way when you leave, so ${other} knows.`,
      };
    case "pickup_now":
      return {
        mood: "wave",
        line:
          role === "seller"
            ? `It's pickup time. Tap Mark sold once ${other} has the ${title}.`
            : `It's pickup time. Tap Picked up once you have the ${title}.`,
      };
    case "overdue":
      return { mood: "think", line: `Did you meet ${other}?` };
  }
}
