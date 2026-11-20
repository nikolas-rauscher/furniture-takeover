import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { AgentPreferencesPatchEvent } from "../../shared/actions";
import { defaults, type Criteria, type Product } from "../../shared/marketplace";
import { discardNegotiation, type Negotiation } from "../../shared/negotiation";
import {
  applyPreferenceAction,
  undoPreferenceAction,
  type PreferenceChanges,
} from "../agentActions";
import { requestAgentAssist } from "../api/agent";
import { readListingPhoto } from "../listingPhotos";
import {
  photoSearchClarification,
  photoSearchFailure,
  type PhotoSearchNotice,
} from "../photoSearchFeedback";
import { searchChangeSummary } from "../searchChanges";
import {
  agentSearchRequest,
  newSearch,
  preferenceSearch,
  sameCriteria,
  type SearchSnapshot,
} from "../searchRequest";
import type { useAgentRun } from "./useAgentRun";
import { useFocused } from "./useFocused";
import type { useNegotiations } from "./useNegotiations";
import type { Toasts } from "./useToast";

export type SearchSession = ReturnType<typeof useSearchSession>;

/**
 * Searching with Pako: the request, its preferences and the changes Pako made
 * to them, follow-ups and answers, offers prepared in the chat, and photo search.
 */
export function useSearchSession({
  agentRun,
  negotiations,
  location,
  radius,
  signedIn,
  quotaExhausted,
  activeListings,
  toast,
  openSignIn,
  showResults,
  closeDialog,
  pauseSelling,
  onDraftDiscarded,
}: {
  agentRun: ReturnType<typeof useAgentRun>;
  negotiations: ReturnType<typeof useNegotiations>;
  /** The saved search area. */
  location: string;
  radius: number;
  signedIn: boolean;
  quotaExhausted: boolean;
  activeListings: Product[];
  toast: Toasts;
  openSignIn: () => void;
  /** Puts the chat on screen. */
  showResults: () => void;
  closeDialog: () => void;
  pauseSelling: () => void;
  /** Pako discarded an offer draft; Messages forgets its unsent message. */
  onDraftDiscarded: (listingId: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const fieldFocused = useFocused(field);
  /** "New search" leads to home ready to type: the search box takes focus once it is there. */
  const focusOnHome = useRef(false);
  /** A search asked for in the step that also moved the search area; it runs once the area is in state. */
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [committedSearch, setCommittedSearch] = useState<SearchSnapshot | null>(
    null,
  );
  const committedSearchRef = useRef<SearchSnapshot | null>(null);
  const [criteria, setCriteria] = useState<Criteria>({ ...defaults, radius });
  const [filterDraft, setFilterDraft] = useState<Criteria>({ ...defaults });
  /** Preferences applied to the takeover catalog without asking Pako again. */
  const [localPreferences, setLocalPreferences] = useState("");
  const runToken = useRef(0);
  const [changes, setChanges] = useState<Record<string, PreferenceChanges>>({});
  const changesRef = useRef<Record<string, PreferenceChanges>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [undone, setUndone] = useState<string[]>([]);
  // The inspiration photo stays attached to the search it started.
  const [photoSearch, setPhotoSearch] = useState<{
    image: string;
    request: string;
  } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  /** A photo is dragged over the home search. */
  const [photoDragging, setPhotoDragging] = useState(false);
  /** The photo search button has keyboard focus, so Pako explains it. */
  const [photoHint, setPhotoHint] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<PhotoSearchNotice | null>(
    null,
  );
  const photoRequest = useRef<AbortController | null>(null);

  const running = agentRun.state.status === "running";
  /** Pako asked something and waits; the composer can answer it too. */
  const awaitingAnswer =
    !running &&
    agentRun.state.questions.some((item) => !agentRun.state.answers[item.id]);
  const activePhoto =
    photoSearch && committedSearch?.originalRequest === photoSearch.request
      ? photoSearch
      : null;
  /** The offer being prepared is already on screen as a draft in the chat. */
  const activeDraftInChat = Boolean(
    agentRun.state.id &&
    negotiations.active &&
    [...agentRun.state.history, agentRun.state].some(
      (turn) =>
        turn.proposal?.id === negotiations.active?.id &&
        turn.proposal?.version === negotiations.active?.version &&
        turn.proposal?.status === "draft" &&
        turn.proposal.draft,
    ),
  );

  function clearChanges() {
    changesRef.current = {};
    setChanges({});
    setNotices({});
    setUndone([]);
  }
  function storeSearch(search: SearchSnapshot) {
    committedSearchRef.current = search;
    setCommittedSearch(search);
    setCriteria(search.criteria);
  }
  function applyPatch(action: AgentPreferencesPatchEvent) {
    const current = committedSearchRef.current;
    if (!current) return;
    const result = applyPreferenceAction(current, action);
    storeSearch(result.next);
    if (Object.keys(result.changes).length) {
      changesRef.current = {
        ...changesRef.current,
        [action.id]: result.changes,
      };
      setChanges(changesRef.current);
    }
  }
  function undoPatch(id: string) {
    const current = committedSearchRef.current;
    const patch = changesRef.current[id];
    if (!current || !patch) return;
    storeSearch(undoPreferenceAction(current, patch));
    setUndone((value) => [...value, id]);
    setNotices((value) => ({
      ...value,
      [id]: "Search again to refresh the results.",
    }));
  }
  const normalizedFilterDraft = {
    ...filterDraft,
    category: "All",
    query: filterDraft.query.trim(),
  };
  function applyFilterForm() {
    const current = committedSearchRef.current;
    const next = preferenceSearch(
      normalizedFilterDraft,
      current?.location ?? location,
      current ?? undefined,
    );
    if (!current || next.criteria.query !== current.criteria.query) {
      void performSearch(next);
      return;
    }
    const { criteria: before } = current;
    const { criteria: after } = next;
    const change = searchChangeSummary({
      ...(before.maxPrice === after.maxPrice ? {} : { maxPrice: after.maxPrice }),
      ...(before.radius === after.radius ? {} : { radius: after.radius }),
      ...(before.pickup === after.pickup ? {} : { pickupBy: after.pickup }),
      ...(before.condition === after.condition ? {} : { condition: after.condition }),
      ...(before.source === after.source ? {} : { source: after.source }),
    });
    closeDialog();
    if (!change) return;
    storeSearch({ ...current, criteria: { ...after, category: before.category } });
    setLocalPreferences(change);
  }
  /** What Pako was told earlier in this conversation, newest last. */
  function recentMessages() {
    return [
      ...agentRun.state.history.flatMap((turn) => [
        { role: "user" as const, text: turn.request.slice(0, 4000) },
        { role: "assistant" as const, text: turn.text.slice(0, 4000) },
      ]),
      { role: "user" as const, text: agentRun.state.request.slice(0, 4000) },
      { role: "assistant" as const, text: agentRun.state.text.slice(0, 4000) },
    ]
      .filter((item) => item.text)
      .slice(-12);
  }
  async function performSearch(
    search: SearchSnapshot,
    question?: string,
    proposal?: Negotiation,
    preserveConversation = false,
  ) {
    if (quotaExhausted) return;
    if (!signedIn) {
      openSignIn();
      return;
    }
    let currentProposal = proposal;
    if (!currentProposal && (preserveConversation || search.originalRequest === committedSearchRef.current?.originalRequest)) {
      try {
        currentProposal = negotiations.current();
      } catch (error) {
        toast.say(error instanceof Error ? error.message : "Couldn't load your offer draft.");
        return;
      }
    }
    setLocalPreferences("");
    const token = ++runToken.current;
    const previousSearch = committedSearchRef.current;
    const preserveHistory =
      preserveConversation ||
      search.originalRequest === committedSearchRef.current?.originalRequest;
    if (!preserveHistory) clearChanges();
    pauseSelling();
    showResults();
    closeDialog();
    setSearching(true);
    if (!preserveHistory) setQuery(search.originalRequest);
    setFollowUp((current) =>
      !preserveHistory || current.trim() === search.text.trim() ? "" : current,
    );
    storeSearch(search);

    const request = agentSearchRequest(
      search,
      activeListings,
      Boolean(currentProposal),
    );
    if (question)
      request.context = { ...request.context, previousQuestion: question };
    request.context = {
      ...request.context,
      ...(currentProposal
        ? { negotiation: currentProposal, intent: "negotiation" as const }
        : {}),
      previousMatchIds:
        preserveHistory &&
        previousSearch &&
        sameCriteria(search.criteria, previousSearch.criteria)
          ? (agentRun.state.inventoryMatchIds ?? [])
          : [],
      recentMessages: preserveHistory ? recentMessages() : [],
    };
    await agentRun.run(request, {
      preserveHistory,
      onNegotiation: (event) => {
        if (token !== runToken.current) return;
        negotiations.commit(event);
        if (event.negotiation.status === "discarded")
          onDraftDiscarded(event.negotiation.listingId);
      },
      onAction: (action) => {
        if (token === runToken.current && action.type === "preferences_patch")
          applyPatch(action);
      },
    });
  }
  async function runSearch(
    text: string,
    base = criteria,
    isFollowUp = false,
    question?: string,
  ) {
    if (!text.trim() || running || quotaExhausted) return;
    photoRequest.current?.abort();
    setPhotoBusy(false);
    setPhotoNotice(null);
    const unanswered =
      isFollowUp && !question
        ? agentRun.state.questions.find(
            (item) => !agentRun.state.answers[item.id],
          )
        : undefined;
    if (unanswered) {
      question = unanswered.question;
      agentRun.markQuestionAnswered(unanswered.id, text);
    }
    const previous = isFollowUp
      ? (committedSearchRef.current ?? undefined)
      : undefined;
    if (!isFollowUp) {
      negotiations.activate(null);
      agentRun.reset();
      clearChanges();
    }
    await performSearch(
      isFollowUp && negotiations.current() && previous
        ? { ...previous, text, previousAnswer: agentRun.state.text }
        : newSearch(
            text,
            previous?.criteria ?? base,
            previous?.location ?? location,
            previous,
            isFollowUp ? agentRun.state.text : undefined,
          ),
      question,
    );
  }
  /** Identify an item in an inspiration photo, then search for that description. */
  async function searchByPhoto(file: File) {
    if (running || photoBusy) return;
    photoRequest.current?.abort();
    const controller = new AbortController();
    photoRequest.current = controller;
    setPhotoBusy(true);
    setPhotoNotice(null);
    setPhotoSearch(null);
    try {
      const image = await readListingPhoto(file, controller.signal);
      const notes = query.trim();
      const response = await requestAgentAssist(
        {
          intent: "search",
          text: notes,
          images: [image],
          context: { location, radius: criteria.radius },
        },
        { signal: controller.signal },
      );
      const item = response.metadata.query?.trim();
      if (controller.signal.aborted) return;
      if (!item) {
        setPhotoNotice(photoSearchClarification());
        field.current?.focus();
        return;
      }
      const request = (notes ? `${item}. ${notes}` : item).slice(0, 4000);
      setPhotoSearch({ image, request });
      setPhotoBusy(false);
      await runSearch(request);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhotoNotice(photoSearchFailure(error));
    } finally {
      if (photoRequest.current === controller) {
        photoRequest.current = null;
        setPhotoBusy(false);
      }
    }
  }
  function continueOffer(item: Product, existing?: Negotiation) {
    const proposal = existing ?? negotiations.open(item.id);
    if (!proposal) return;
    negotiations.activate(proposal.id);
    const search = newSearch(
      `Help me prepare an offer for ${item.title} and arrange pickup or shipping. Ask me for any missing details. Keep everything as a draft for review.${!existing && committedSearchRef.current ? " My earlier request: " + committedSearchRef.current.originalRequest : ""}`.slice(
        0,
        4000,
      ),
      { ...criteria, query: item.title, source: "takeover" },
      location,
    );
    void performSearch(search, undefined, proposal, Boolean(agentRun.state.id));
  }
  /** Throws the offer draft away; Messages forgets its unsent message too. */
  function discardOffer(proposal: Negotiation) {
    try {
      agentRun.cancel();
      negotiations.commit({
        type: "negotiation_update",
        previousVersion: proposal.version,
        negotiation: discardNegotiation(proposal, proposal.version),
      });
      onDraftDiscarded(proposal.listingId);
    } catch (error) {
      toast.say(error instanceof Error ? error.message : "Couldn't discard the offer draft.");
    }
  }
  function answerQuestion(id: string, answer: string) {
    if (running) return false;
    const question = agentRun.state.questions.find((item) => item.id === id);
    if (!question || agentRun.state.answers[id]) return false;
    agentRun.markQuestionAnswered(id, answer);
    void runSearch(answer, criteria, true, question.question);
    return true;
  }

  const runPendingSearch = useEffectEvent((text: string) => void runSearch(text));
  useEffect(() => {
    if (pendingSearch === null) return;
    setPendingSearch(null);
    runPendingSearch(pendingSearch);
  }, [pendingSearch]);

  return {
    searching,
    query,
    setQuery,
    followUp,
    setFollowUp,
    field,
    fieldFocused,
    criteria,
    setCriteria,
    filterDraft,
    setFilterDraft,
    normalizedFilterDraft,
    committedSearch,
    localPreferences,
    changes,
    notices,
    undone,
    running,
    awaitingAnswer,
    activeDraftInChat,
    photo: {
      busy: photoBusy,
      dragging: photoDragging,
      setDragging: setPhotoDragging,
      hint: photoHint,
      setHint: setPhotoHint,
      notice: photoNotice,
      active: activePhoto,
    },
    runSearch,
    performSearch,
    /** Searches again with the request on screen. */
    retry() {
      if (committedSearchRef.current)
        void performSearch(committedSearchRef.current);
    },
    searchByPhoto,
    continueOffer,
    discardOffer,
    answerQuestion,
    applyPatch,
    undoPatch,
    applyFilterForm,
    /** The search runs once the search area it belongs to is in state. */
    searchSoon: setPendingSearch,
    /** The next time home opens, its search box takes focus. */
    focusOnNextHome() {
      focusOnHome.current = true;
    },
    /** Home opened: takes focus if a new search asked for it. */
    takeHomeFocus() {
      if (!focusOnHome.current) return false;
      focusOnHome.current = false;
      field.current?.focus({ preventScroll: true });
      return true;
    },
    /** Leaving the search stops Pako, except on a side trip to a listing. */
    leave(sideTrip: boolean) {
      if (!sideTrip) {
        runToken.current += 1;
        agentRun.cancel();
      }
      photoRequest.current?.abort();
      photoRequest.current = null;
      setPhotoBusy(false);
    },
    /** Back to an empty home search. */
    reset() {
      agentRun.reset();
      setPhotoSearch(null);
      setPhotoNotice(null);
      setSearching(false);
      setQuery("");
      setFollowUp("");
      setCriteria({ ...defaults, radius });
      setCommittedSearch(null);
      committedSearchRef.current = null;
      clearChanges();
    },
  };
}
