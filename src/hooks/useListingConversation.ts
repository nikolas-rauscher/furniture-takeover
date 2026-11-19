import { useRef, useState, type SetStateAction } from "react";
import type { AgentListingPatchEvent } from "../../shared/actions";
import {
  applyListingAction,
  listingFieldNames,
  undoListingAction,
  type FieldRevisions,
  type ListingChanges,
} from "../agentActions";
import type { ListingDraft } from "../components/SellFlow";
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

  function resetConversation() {
    runToken.current += 1;
    run.reset();
    baselines.current.clear();
    actions.current.clear();
    changesRef.current = {};
    setChanges({});
    setNotices({});
    setUndone([]);
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
      !question && !explicitRequest
        ? run.state.questions.find((item) => !run.state.answers[item.id])
        : undefined;
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

  return {
    state: run.state,
    running: run.state.status === "running",
    input,
    setInput,
    appliedIds: Object.keys(changes),
    undoneIds: undone,
    notices,
    resetConversation,
    resetForNewDraft,
    cancel,
    editDraft,
    accept,
    undo,
    send,
    start,
    retry,
    answer,
  };
}
