import { useRef, useState, type SetStateAction } from "react";
import type {
  AgentListingPatchEvent,
  AgentQuestionEvent,
  AgentTapAnswer,
} from "../../shared/actions";
import {
  applyListingAction,
  listingFieldNames,
  undoListingAction,
  type FieldRevisions,
  type ListingChanges,
} from "../agentActions";
import type { ListingDraft } from "../components/SellFlow";
import { money } from "../../shared/marketplace";
import {
  asksPrice,
  DescriptionFullError,
  nextQuestion,
  resolvedByDraft,
  tapAction,
  tapOutcome,
} from "../listingQuestions";
import {
  listingRunRequest,
  type ListingRunOptions,
  type PhotoAnalysis,
} from "../listingRunRequest";
import { emptyAgentRunState, useAgentRun } from "./useAgentRun";

/** What the student asks Pako when he starts writing a new listing. */
const LISTING_START = "Write my listing from my photos.";

/** The listing's first turn while Pako still reads the photos, before his run starts. */
export const startingListingTurn = {
  ...emptyAgentRunState(),
  id: "listing-start",
  turnKey: "listing-start",
  request: LISTING_START,
  status: "running" as const,
};

/**
 * Pako's conversation about one listing draft: his runs, the changes they make to
 * the draft and their undo. A change applies only to fields the student has not
 * edited since the run began.
 */
export function useListingConversation({
  draftRef,
  setDraft,
}: {
  draftRef: { current: ListingDraft };
  setDraft: (value: SetStateAction<ListingDraft>) => void;
}) {
  const run = useAgentRun();
  const runToken = useRef(0);
  const revisions = useRef<FieldRevisions>({});
  const baselines = useRef(new Map<string, FieldRevisions>());
  const actions = useRef(new Map<string, AgentListingPatchEvent>());
  const lastRequest = useRef<{
    text: string;
    options: ListingRunOptions;
  } | null>(null);
  const photoAnalysis = useRef<PhotoAnalysis | undefined>(undefined);
  const [input, setInput] = useState("");
  const [changes, setChanges] = useState<Record<string, ListingChanges>>({});
  const changesRef = useRef<Record<string, ListingChanges>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [undone, setUndone] = useState<string[]>([]);
  /** Questions put off with "Decide later"; they come back after the others. */
  const [deferred, setDeferred] = useState<string[]>([]);
  /** The change each tapped answer made, so its Undo takes both back. */
  const [answerActions, setAnswerActions] = useState<Record<string, string>>(
    {},
  );
  /** A tap that could not apply, shown with its question. */
  const [tapError, setTapError] = useState<{
    questionId: string;
    message: string;
  } | null>(null);
  const tapCount = useRef(0);
  /** Counts the times the student asked to decide the price, so the tray can bring it into focus. */
  const [priceReviews, setPriceReviews] = useState(0);
  const activeQuestion = nextQuestion(
    run.state.questions,
    run.state.answers,
    deferred,
  );

  function resetConversation() {
    runToken.current += 1;
    run.reset();
    baselines.current.clear();
    actions.current.clear();
    changesRef.current = {};
    setChanges({});
    setNotices({});
    setUndone([]);
    setDeferred([]);
    setAnswerActions({});
    setTapError(null);
    setInput("");
    lastRequest.current = null;
    photoAnalysis.current = undefined;
  }
  /** A different draft starts with no conversation and no edits of its own yet. */
  function resetForNewDraft() {
    resetConversation();
    revisions.current = {};
  }
  function cancel() {
    runToken.current += 1;
    run.cancel();
  }
  /** The student's own edit, which a run that started earlier never overwrites. */
  function editDraft(edit: Partial<ListingDraft>) {
    for (const field of listingFieldNames)
      if (Object.hasOwn(edit, field))
        revisions.current[field] = (revisions.current[field] ?? 0) + 1;
    setDraft((current) => ({
      ...current,
      ...(edit.title !== undefined && edit.title !== current.title
        ? { tags: undefined }
        : {}),
      ...edit,
    }));
    answerFilledQuestions();
  }
  /** A question about a field the student just filled in needs no answer anymore. */
  function answerFilledQuestions() {
    for (const question of run.state.questions)
      if (
        !run.state.answers[question.id] &&
        resolvedByDraft(question, draftRef.current)
      )
        run.markQuestionAnswered(question.id, "Set in details");
  }
  function applyPatch(
    action: AgentListingPatchEvent,
    baseline: FieldRevisions,
    accepted = false,
  ) {
    actions.current.set(action.id, action);
    baselines.current.set(action.id, baseline);
    const result = applyListingAction(
      draftRef.current,
      action,
      baseline,
      revisions.current,
      accepted,
    );
    if (result.pending) return;
    if (Object.keys(result.changes).length) {
      setDraft(result.next);
      changesRef.current = {
        ...changesRef.current,
        [action.id]: result.changes,
      };
      setChanges(changesRef.current);
      setUndone((value) => value.filter((id) => id !== action.id));
    }
    setNotices((value) => ({
      ...value,
      [action.id]: result.skipped.length
        ? "Kept your newer or unsupported details: " +
          result.skipped.join(", ") +
          "."
        : Object.keys(result.changes).length
          ? "Updated your draft. Nothing has been saved yet."
          : "Your draft already has these details.",
    }));
  }
  function accept(id: string) {
    const action = actions.current.get(id);
    const baseline = baselines.current.get(id);
    if (action && baseline) applyPatch(action, baseline, true);
  }
  function undo(id: string) {
    const applied = changesRef.current[id];
    if (!applied) return;
    const result = undoListingAction(
      draftRef.current,
      applied,
      revisions.current,
    );
    for (const field of result.restored)
      revisions.current[field] = (revisions.current[field] ?? 0) + 1;
    setDraft(result.next);
    setUndone((value) => [...value, id]);
    setNotices((value) => ({
      ...value,
      [id]: result.preserved.length
        ? "Undone where unchanged. Your later edits were kept."
        : "Undone. Previous details restored.",
    }));
  }
  /**
   * Sends the student's words to Pako. Unless the request stands on its own, it
   * answers his open question.
   */
  async function send(
    text: string,
    options: ListingRunOptions = {},
    explicitRequest = false,
  ) {
    if (!text.trim()) return;
    let question = options.question;
    const unanswered =
      !question && !explicitRequest ? activeQuestion : undefined;
    if (unanswered) {
      question = unanswered.question;
      run.markQuestionAnswered(unanswered.id, text);
    }
    const token = ++runToken.current;
    const baseline = { ...revisions.current };
    const runOptions = { ...options, question };
    lastRequest.current = { text, options: runOptions };
    setInput((current) => (current.trim() === text.trim() ? "" : current));
    await run.run(
      listingRunRequest({
        text,
        draft: draftRef.current,
        conversation: run.state,
        options: { ...runOptions, photoAnalysis: photoAnalysis.current },
      }),
      {
        onAction: (action) => {
          if (token === runToken.current && action.type === "listing_patch")
            applyPatch(action, baseline);
        },
      },
    );
  }
  /** Pako's first run of a new listing, which researches its price from what the photos showed. */
  function start(analysis: PhotoAnalysis) {
    photoAnalysis.current = analysis;
    return send(LISTING_START, { start: true });
  }
  function retry() {
    const last = lastRequest.current;
    if (last) void send(last.text, last.options, true);
  }
  function answer(id: string, reply: string) {
    if (run.state.status === "running") return false;
    const question = run.state.questions.find((item) => item.id === id);
    if (!question || run.state.answers[id]) return false;
    run.markQuestionAnswered(id, reply);
    void send(reply, { question: question.question });
    return true;
  }
  const waitingQuestion = (id: string) =>
    run.state.questions.find(
      (question) => question.id === id && !run.state.answers[id],
    );
  function recordAnswer(questionId: string, reply: string, actionId?: string) {
    run.markQuestionAnswered(questionId, reply);
    if (actionId)
      setAnswerActions((value) => ({ ...value, [questionId]: actionId }));
    setTapError(null);
  }
  function applyTap(
    question: AgentQuestionEvent,
    answer: Pick<AgentTapAnswer, "label" | "patch" | "appendDescription">,
  ) {
    tapCount.current += 1;
    const action = tapAction(
      answer,
      draftRef.current,
      `tap-${question.id}-${tapCount.current}`,
    );
    // The tap is the student's newest intent, so it applies over every earlier edit.
    applyPatch(action, { ...revisions.current }, true);
    return action.id;
  }
  function acceptProposal(
    question: AgentQuestionEvent,
    answer: AgentTapAnswer,
  ) {
    const proposal = run.state.actions.find(
      (action) =>
        action.type === "listing_patch" &&
        action.requiresAcceptance &&
        action.patch.price === answer.patch?.price,
    );
    if (proposal) {
      accept(proposal.id);
      return proposal.id;
    }
    // No suggestion carries this price, yet the tap itself is the student's decision.
    return applyTap(question, answer);
  }
  /** Applies a tapped answer here; only an answer Pako has to read goes back to him. */
  function choose(questionId: string, label: string): boolean {
    const question = waitingQuestion(questionId);
    if (!question) return false;
    const outcome = tapOutcome(question, label);
    if (outcome.kind === "ask-agent") return answer(questionId, label);
    try {
      const actionId =
        outcome.kind === "accept-proposal"
          ? acceptProposal(question, outcome.answer)
          : outcome.kind === "patch"
            ? applyTap(question, outcome.answer)
            : undefined;
      recordAnswer(questionId, label, actionId);
      return true;
    } catch (error) {
      if (!(error instanceof DescriptionFullError)) throw error;
      setTapError({ questionId, message: error.message });
      return false;
    }
  }
  /** The asking price the student set: Pako's suggestion, their own amount or free. */
  function choosePrice(questionId: string, price: number): boolean {
    const question = waitingQuestion(questionId);
    if (!question) return false;
    const label = price === 0 ? "Give it away for free" : money(price);
    const suggested = question.choiceActions?.find(
      (item) => item.acceptsProposal && item.patch?.price === price,
    );
    recordAnswer(
      questionId,
      label,
      suggested
        ? acceptProposal(question, suggested)
        : applyTap(question, { label, patch: { price } }),
    );
    return true;
  }
  function skip(questionId: string): boolean {
    if (!waitingQuestion(questionId)) return false;
    recordAnswer(questionId, "Skipped");
    return true;
  }
  function decideLater(questionId: string) {
    setDeferred((value) =>
      value.includes(questionId) ? value : [...value, questionId],
    );
  }
  /** The price question Pako still waits on, put off or not. */
  const waitingPriceQuestion = run.state.questions.find(
    (question) => asksPrice(question) && !run.state.answers[question.id],
  );
  /** Brings a price question that was put off back to the front of the tray. */
  function reviewPrice() {
    if (!waitingPriceQuestion) return;
    const id = waitingPriceQuestion.id;
    setDeferred((value) => value.filter((deferredId) => deferredId !== id));
    setPriceReviews((count) => count + 1);
  }
  /** Takes a tapped answer back: its change is undone and the question waits again. */
  function undoAnswer(questionId: string) {
    const actionId = answerActions[questionId];
    if (actionId) undo(actionId);
    run.unanswerQuestion(questionId);
    setAnswerActions((value) =>
      Object.fromEntries(
        Object.entries(value).filter(([answered]) => answered !== questionId),
      ),
    );
  }

  return {
    state: run.state,
    running: run.state.status === "running",
    input,
    setInput,
    appliedIds: Object.keys(changes),
    undoneIds: undone,
    notices,
    activeQuestion,
    tapError,
    priceReviews,
    decidingPrice: waitingPriceQuestion !== undefined,
    resetConversation,
    resetForNewDraft,
    cancel,
    editDraft,
    accept,
    undo,
    send,
    start,
    retry,
    choose,
    choosePrice,
    skip,
    decideLater,
    reviewPrice,
    undoAnswer,
  };
}
