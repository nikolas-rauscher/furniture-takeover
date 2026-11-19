import type { AgentRunRequest } from "../shared/runs.ts";
import { agentDraft } from "./agentActions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import type { AgentRunState, AgentRunTurn } from "./hooks/useAgentRun.ts";

/** What the photo analysis noticed; every run of the listing gets it as a hint. */
export type PhotoAnalysis = { missingDetails: string[]; keywords: string[] };

/** How a listing run starts: the first one of a new listing researches its price. */
export type ListingRunOptions = {
  /** The question the text answers. */
  question?: string;
  start?: boolean;
  photoAnalysis?: PhotoAnalysis;
};

type Conversation = Pick<
  AgentRunState,
  "history" | "request" | "text" | "questions" | "answers"
>;
type Turn = Pick<AgentRunTurn, "request" | "text" | "questions" | "answers">;

const MAX_ANSWERED = 30;
const MAX_MESSAGES = 12;

/** Every question answered so far, Pako's own and skipped ones included. */
function answeredQuestions(turns: readonly Turn[]) {
  return turns
    .flatMap((turn) =>
      turn.questions.flatMap((item) => {
        const answer = turn.answers[item.id];
        return answer
          ? [{ question: item.question, answer: answer.slice(0, 4000) }]
          : [];
      }),
    )
    .slice(-MAX_ANSWERED);
}

/** What Pako said in a turn: his questions, or his answer when he asked none. */
const assistantText = (turn: Turn) =>
  turn.questions.map((item) => item.question).join("\n") || turn.text;

function recentMessages(turns: readonly Turn[]) {
  return turns
    .flatMap((turn) => [
      { role: "user" as const, text: turn.request.slice(0, 4000) },
      { role: "assistant" as const, text: assistantText(turn).slice(0, 4000) },
    ])
    .filter((message) => message.text)
    .slice(-MAX_MESSAGES);
}

/** The request for one listing run, built from the draft and the conversation so far. */
export function listingRunRequest({
  text,
  draft,
  conversation,
  options = {},
}: {
  text: string;
  draft: ListingDraft;
  conversation: Conversation;
  options?: ListingRunOptions;
}): AgentRunRequest {
  const turns = [...conversation.history, conversation];
  const note = draft.raw.trim();
  return {
    text: text.trim(),
    context: {
      intent: "listing_assist",
      location: draft.location,
      currentDraft: agentDraft(draft),
      ...(note ? { originalRequest: note.slice(0, 4000) } : {}),
      previousAnswer: conversation.text.slice(0, 6000),
      answeredQuestions: answeredQuestions(turns),
      recentMessages: recentMessages(turns),
      ...(options.question ? { previousQuestion: options.question } : {}),
      ...(options.start ? { listingStart: true } : {}),
      ...(options.photoAnalysis
        ? { photoAnalysis: options.photoAnalysis }
        : {}),
    },
  };
}
