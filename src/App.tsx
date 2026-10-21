import { listingPhotos, MAX_LISTING_PHOTOS } from "../shared/listingPhotos";
import { readListingPhoto } from "./listingPhotos";
import PhotoGallery from "./components/PhotoGallery";
import { animateUiChange, scrollToPageStart } from "./uiMotion";
import MessagesPage from "./components/MessagesPage";
import { useNegotiations } from "./hooks/useNegotiations";
import NegotiationSummary, {
  MessageDraftPreview,
} from "./components/NegotiationSummary";
import {
  discardNegotiation,
  draftMessage,
  markNegotiationSent,
  type Negotiation,
} from "../shared/negotiation";
import AgentConversation from "./components/AgentConversation";
import AgentComposer from "./components/AgentComposer";
import { prepareListingDraft } from "./listingPreparation";
import { HeroHeadline } from "./components/HeroHeadline";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  GitCompareArrows,
  Heart,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import MobileNav from "./MobileNav";
import { useListings } from "./hooks/useListings";
import Modal from "./components/Modal";
import ProductCard from "./components/ProductCard";
import SearchPreferencesFields from "./components/SearchPreferencesFields";
import SellFlow, { type ListingDraft } from "./components/SellFlow";
import AgentSuggestions from "./components/AgentSuggestions";
import AgentRunPanel from "./components/AgentRunPanel";
import { useAgentRun } from "./hooks/useAgentRun";
import { useAgentAssist } from "./hooks/useAgentAssist";
import { useSaved } from "./hooks/useSaved";
import { isFavoriteIds } from "./hooks/savedState";
import {
  agentSearchRequest,
  isSavedSearches,
  isSearchArea,
  newSearch,
  preferenceSearch,
  restoreSearch,
  sameCriteria,
  searchText,
  type SavedSearch,
  type SearchSnapshot,
} from "./searchRequest";
import { requestAgentAssist } from "./api/agent";
import { listingPickupMinimum, validListingPickup } from "./listingValidation";
import {
  agentDraft,
  applyListingAction,
  applyPreferenceAction,
  listingFieldNames,
  undoListingAction,
  undoPreferenceAction,
  type FieldRevisions,
  type ListingChanges,
  type PreferenceChanges,
} from "./agentActions";
import type {
  AgentListingPatchEvent,
  AgentPreferencesPatchEvent,
} from "../shared/actions";
import { useAgentHealth } from "./hooks/useAgentHealth";
import {
  defaults,
  criteriaTitle,
  money,
  shortDate,
  type Criteria,
  type Product,
} from "../shared/marketplace";

type View =
  | "discover"
  | "searches"
  | "account"
  | "sell"
  | "detail"
  | "compare"
  | "messages";
type Dialog =
  | "filters"
  | "save"
  | "edit-search"
  | "location"
  | "profile"
  | "help"
  | "clear"
  | null;
const emptyDraft: ListingDraft = {
  image: "",
  images: [],
  raw: "",
  title: "",
  description: "",
  price: "",
  condition: "",
  dimensions: "",
  location: "Lausanne",
  pickup: "",
  category: "All",
};

export default function App() {
  const agentRun = useAgentRun();
  const negotiations = useNegotiations();
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
  const listingRun = useAgentRun();
  const listingRunToken = useRef(0);
  const searchRunToken = useRef(0);
  const committedSearchRef = useRef<SearchSnapshot | null>(null);
  const listingRevisions = useRef<FieldRevisions>({});
  const listingBaselines = useRef(new Map<string, FieldRevisions>());
  const listingActions = useRef(new Map<string, AgentListingPatchEvent>());
  const lastListingRequest = useRef<{ text: string; question?: string } | null>(
    null,
  );
  const [listingInput, setListingInput] = useState("");
  const [listingChanges, setListingChanges] = useState<
    Record<string, ListingChanges>
  >({});
  const listingChangesRef = useRef<Record<string, ListingChanges>>({});
  const [listingNotices, setListingNotices] = useState<Record<string, string>>(
    {},
  );
  const [listingUndone, setListingUndone] = useState<string[]>([]);
  const [searchChanges, setSearchChanges] = useState<
    Record<string, PreferenceChanges>
  >({});
  const searchChangesRef = useRef<Record<string, PreferenceChanges>>({});
  const [searchNotices, setSearchNotices] = useState<Record<string, string>>(
    {},
  );
  const [searchUndone, setSearchUndone] = useState<string[]>([]);
  const {
    health: agentHealth,
    error: healthError,
    checking: healthChecking,
    refresh: refreshHealth,
  } = useAgentHealth();
  const [view, setView] = useState<View>(
    window.location.hash.startsWith("#messages") ? "messages" : "discover",
  );
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [searchArea, setSearchArea] = useSaved(
    "takeover-search-area",
    { location: "EPFL, Ecublens", radius: 5 },
    isSearchArea,
  );
  const location = searchArea.location;
  const [committedSearch, setCommittedSearch] = useState<SearchSnapshot | null>(
    null,
  );
  const [criteria, setCriteria] = useState<Criteria>({
    ...defaults,
    radius: searchArea.radius,
  });
  const [filterDraft, setFilterDraft] = useState<Criteria>({ ...defaults });
  const [areaDraft, setAreaDraft] = useState({
    location,
    radius: searchArea.radius,
  });
  const [messageListingId, setMessageListingId] = useState<string | undefined>(
    window.location.hash.startsWith("#messages/")
      ? decodeURIComponent(window.location.hash.slice(10))
      : undefined,
  );
  const [modal, setModal] = useState<Dialog>(null);
  const [accountTab, setAccountTab] = useState<
    "favorites" | "listings" | "archive"
  >("listings");
  const [favorites, setFavorites] = useSaved<string[]>(
    "takeover-favorites",
    [],
    isFavoriteIds,
  );
  const [jobs, setJobs] = useSaved<SavedSearch[]>(
    "takeover-jobs",
    [],
    isSavedSearches,
  );
  const database = useListings();
  const own = database.listings;
  const setOwn = database.setListings;
  const [compared, setCompared] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageProposal, setMessageProposal] = useState<
    Negotiation | undefined
  >();
  const [jobTitle, setJobTitle] = useState("");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const draftRef = useRef<ListingDraft>({ ...emptyDraft });
  const [draft, setDraftState] = useState<ListingDraft>(draftRef.current);
  function setDraft(value: SetStateAction<ListingDraft>) {
    const next = typeof value === "function" ? value(draftRef.current) : value;
    draftRef.current = next;
    setDraftState(next);
  }
  const [sellStep, setSellStep] = useState(1);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [photoReading, setPhotoReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    message: string;
    deletedSearch?: { job: SavedSearch; index: number };
  } | null>(null);
  const toast = toastNotice?.message || "";
  function setToast(message: string) {
    setToastNotice(message ? { message } : null);
  }
  const listingRequest = useRef<AbortController | null>(null);
  const imageReader = useRef<AbortController | null>(null);

  // Preserve old browser records, but never show seeded inventory as real offers.
  const localListings = own.filter(
    (item) => item.own && (item.demo || !item.image.startsWith("/images/")),
  );
  const activeListings = localListings.filter(
    (item) => item.status === "active",
  );
  const visibleListings = localListings.filter(
    (item) => item.status !== "withdrawn",
  );
  const archivedListings = localListings.filter(
    (item) => item.status === "withdrawn",
  );
  const accountListings =
    accountTab === "archive" ? archivedListings : visibleListings;
  const editingItem = own.find((item) => item.id === editingListing);
  const savedSearches = jobs.filter((job) => job.id !== "seed-search");
  const savedListings = visibleListings.filter((item) =>
    favorites.includes(item.id),
  );
  const selected = visibleListings.find((item) => item.id === selectedId);
  const comparison = visibleListings.filter((item) =>
    compared.includes(item.id),
  );
  const isHome = view === "discover" && !searching;
  const reviewingListing =
    !isHome && committedSearch?.intent === "listing_review";
  const activePreferences =
    committedSearch && !reviewingListing
      ? [
          committedSearch.criteria.maxPrice >= 1_000_000
            ? "Any budget"
            : committedSearch.criteria.maxPrice === 0
              ? "Free only"
              : "Up to " + money(committedSearch.criteria.maxPrice),
          committedSearch.criteria.radius +
            " km of " +
            committedSearch.location,
          committedSearch.criteria.pickup
            ? "Pickup by " + shortDate(committedSearch.criteria.pickup)
            : "Flexible pickup",
          committedSearch.criteria.condition === "All"
            ? "Any condition"
            : committedSearch.criteria.condition + " condition",
          committedSearch.criteria.source === "All"
            ? "All sources"
            : committedSearch.criteria.source === "takeover"
              ? "Your listings only"
              : committedSearch.criteria.source,
        ].join(" · ")
      : "";
  const running = agentRun.state.status === "running";
  const hasSearchDraft = query.trim().length > 0;
  const searchHeading = "Your search";
  const configured = agentHealth?.configured === true;
  const normalizedFilterDraft = {
    ...filterDraft,
    category: "All",
    query: filterDraft.query.trim(),
  };
  const searchAssist = useAgentAssist(
    configured && isHome && !running
      ? {
          intent: "search",
          text: query,
          context: {
            location,
            currentQuery: criteria.query,
            maxPrice: criteria.maxPrice,
            radius: criteria.radius,
            pickupBy: criteria.pickup,
          },
        }
      : null,
  );
  const listingAssist = useAgentAssist(
    configured && view === "sell" && sellStep === 1 && !busy
      ? {
          intent: "listing",
          text: draft.raw,
          images: listingPhotos(draft),
          context: { location: draft.location },
        }
      : null,
  );

  useEffect(
    () => () => {
      listingRequest.current?.abort();
      imageReader.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!toastNotice) return;
    const timer = setTimeout(
      () => setToastNotice(null),
      toastNotice.deletedSearch ? 10000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [toastNotice]);
  useEffect(() => {
    const failed = () =>
      setToast(
        "Browser storage is full. Your latest changes have not been saved for the next visit.",
      );
    window.addEventListener("storage-failure", failed);
    return () => window.removeEventListener("storage-failure", failed);
  }, []);

  function cancelPhotoRead() {
    imageReader.current?.abort();
    imageReader.current = null;
    setPhotoReading(false);
  }
  function navigate(next: View) {
    searchRunToken.current += 1;
    listingRunToken.current += 1;
    agentRun.cancel();
    listingRun.cancel();
    listingRequest.current?.abort();
    cancelPhotoRead();
    setBusy(false);
    animateUiChange(() => setView(next));
    window.history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        (next === "messages" ? "#messages" : ""),
    );
    setModal(null);
    scrollToPageStart();
  }
  function openMessages(listingId?: string, proposal?: Negotiation) {
    setMessageProposal(proposal);
    setMessageListingId(listingId);
    navigate("messages");
    if (listingId)
      window.history.replaceState(
        null,
        "",
        `#messages/${encodeURIComponent(listingId)}`,
      );
  }
  function goHome() {
    navigate("discover");
    agentRun.reset();
    setSearching(false);
    setQuery("");
    setFollowUp("");

    setCriteria({ ...defaults, radius: searchArea.radius });
    setCommittedSearch(null);
    committedSearchRef.current = null;
    searchChangesRef.current = {};
    setSearchChanges({});
    setSearchNotices({});
    setSearchUndone([]);
  }
  function startSell() {
    if (view === "sell") return;
    navigate("sell");
    resetListingConversation();
    listingRevisions.current = {};
    setDraft({ ...emptyDraft, location });
    setSellStep(1);
    setEditingListing(null);
    setUploadError("");
  }
  function openProduct(item: Product) {
    if (item.status === "withdrawn") return;
    setSelectedId(item.id);
    navigate("detail");
  }
  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function toggleCompare(id: string) {
    setCompared((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        setToast("Compare up to three listings.");
        return current;
      }
      return [...current, id];
    });
  }
  function storeSearch(search: SearchSnapshot) {
    committedSearchRef.current = search;
    setCommittedSearch(search);
    setCriteria(search.criteria);
  }
  function applySearchPatch(action: AgentPreferencesPatchEvent) {
    const current = committedSearchRef.current;
    if (!current) return;
    const result = applyPreferenceAction(current, action);
    storeSearch(result.next);
    if (Object.keys(result.changes).length) {
      searchChangesRef.current = {
        ...searchChangesRef.current,
        [action.id]: result.changes,
      };
      setSearchChanges(searchChangesRef.current);
      setSearchNotices((value) => ({
        ...value,
        [action.id]: "Preferences updated from your request.",
      }));
    } else
      setSearchNotices((value) => ({
        ...value,
        [action.id]: "These preferences already match your search.",
      }));
  }
  function undoSearchPatch(id: string) {
    const current = committedSearchRef.current;
    const changes = searchChangesRef.current[id];
    if (!current || !changes) return;
    storeSearch(undoPreferenceAction(current, changes));
    setSearchUndone((value) => [...value, id]);
    setSearchNotices((value) => ({
      ...value,
      [id]: "Undone. Later changes were kept. Run the search again to update results.",
    }));
  }
  async function performSearch(
    search: SearchSnapshot,
    question?: string,
    proposal?: Negotiation,
    preserveConversation = false,
  ) {
    const token = ++searchRunToken.current;
    const previousSearch = committedSearchRef.current;
    const preserveHistory =
      preserveConversation ||
      search.originalRequest === committedSearchRef.current?.originalRequest;
    if (!preserveHistory) {
      searchChangesRef.current = {};
      setSearchChanges({});
      setSearchNotices({});
      setSearchUndone([]);
    }
    listingRunToken.current += 1;
    listingRun.cancel();
    listingRequest.current?.abort();
    cancelPhotoRead();
    setView("discover");
    setModal(null);
    setSearching(true);
    if (!preserveHistory) setQuery(search.originalRequest);
    setFollowUp("");
    storeSearch(search);

    const request = agentSearchRequest(search, activeListings);
    if (question)
      request.context = { ...request.context, previousQuestion: question };
    const currentProposal =
      proposal ?? (preserveHistory ? negotiations.current() : undefined);
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
      recentMessages: preserveHistory
        ? [
            ...agentRun.state.history.flatMap((turn) => [
              { role: "user" as const, text: turn.request.slice(0, 4000) },
              { role: "assistant" as const, text: turn.text.slice(0, 4000) },
            ]),
            {
              role: "user" as const,
              text: agentRun.state.request.slice(0, 4000),
            },
            {
              role: "assistant" as const,
              text: agentRun.state.text.slice(0, 4000),
            },
          ]
            .filter((item) => item.text)
            .slice(-12)
        : [],
    };
    await agentRun.run(request, {
      preserveHistory,
      onNegotiation: (event) => {
        if (token === searchRunToken.current) negotiations.commit(event);
      },
      onAction: (action) => {
        if (
          token === searchRunToken.current &&
          action.type === "preferences_patch"
        )
          applySearchPatch(action);
      },
    });
  }
  async function runSearch(
    text: string,
    base = criteria,
    isFollowUp = false,
    question?: string,
  ) {
    if (!text.trim() || running) return;
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
      searchChangesRef.current = {};
      setSearchChanges({});
      setSearchNotices({});
      setSearchUndone([]);
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
  function continueOffer(item: Product, existing?: Negotiation) {
    const proposal = existing ?? negotiations.open(item.id);
    if (!proposal) return;
    negotiations.activate(proposal.id);
    const search = newSearch(
      `Help me prepare an offer for ${item.title} and arrange handover. Ask me for any missing details. Keep everything as a draft for review.${!existing && committedSearchRef.current ? " My earlier request: " + committedSearchRef.current.originalRequest : ""}`.slice(
        0,
        4000,
      ),
      { ...criteria, query: item.title, source: "takeover" },
      location,
    );
    void performSearch(search, undefined, proposal, Boolean(agentRun.state.id));
  }
  function proposalSummary(proposal: Negotiation, compact = false) {
    const item = own.find((item) => item.id === proposal.listingId);
    const available = item?.status === "active";
    return (
      <NegotiationSummary
        key={proposal.id}
        proposal={proposal}
        compact={compact}
        title={item?.title ?? "Unavailable listing"}
        unavailable={!available}
        disabled={running}
        onReview={() => {
          negotiations.activate(proposal.id);
          if (available && item) openMessages(item.id, proposal);
        }}
        onContinue={
          available && item ? () => continueOffer(item, proposal) : undefined
        }
        onDiscard={() => {
          try {
            agentRun.cancel();
            negotiations.commit({
              type: "negotiation_update",
              previousVersion: proposal.version,
              negotiation: discardNegotiation(proposal, proposal.version),
            });
          } catch {
            /* repository exposes the error */
          }
        }}
      />
    );
  }
  function answerSearchQuestion(id: string, answer: string) {
    if (running) return;
    const question = agentRun.state.questions.find((item) => item.id === id);
    if (!question) return;
    agentRun.markQuestionAnswered(id, answer);
    void runSearch(answer, criteria, true, question.question);
  }
  function resetListingConversation() {
    listingRunToken.current += 1;
    listingRun.reset();
    listingBaselines.current.clear();
    listingActions.current.clear();
    listingChangesRef.current = {};
    setListingChanges({});
    setListingNotices({});
    setListingUndone([]);
    setListingInput("");
    lastListingRequest.current = null;
  }
  function changeDraft(changes: Partial<ListingDraft>) {
    for (const field of listingFieldNames)
      if (Object.hasOwn(changes, field))
        listingRevisions.current[field] =
          (listingRevisions.current[field] ?? 0) + 1;
    setDraft((current) => ({
      ...current,
      ...(changes.title !== undefined && changes.title !== current.title
        ? { tags: undefined }
        : {}),
      ...changes,
    }));
  }
  function applyListingPatch(
    action: AgentListingPatchEvent,
    baseline: FieldRevisions,
    accepted = false,
  ) {
    listingActions.current.set(action.id, action);
    listingBaselines.current.set(action.id, baseline);
    const result = applyListingAction(
      draftRef.current,
      action,
      baseline,
      listingRevisions.current,
      accepted,
    );
    if (result.pending) return;
    if (Object.keys(result.changes).length) {
      setDraft(result.next);
      listingChangesRef.current = {
        ...listingChangesRef.current,
        [action.id]: result.changes,
      };
      setListingChanges(listingChangesRef.current);
    }
    setListingNotices((value) => ({
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
  function acceptListingPatch(id: string) {
    const action = listingActions.current.get(id);
    const baseline = listingBaselines.current.get(id);
    if (action && baseline) applyListingPatch(action, baseline, true);
  }
  function undoListingPatch(id: string) {
    const changes = listingChangesRef.current[id];
    if (!changes) return;
    const result = undoListingAction(
      draftRef.current,
      changes,
      listingRevisions.current,
    );
    for (const field of result.restored)
      listingRevisions.current[field] =
        (listingRevisions.current[field] ?? 0) + 1;
    setDraft(result.next);
    setListingUndone((value) => [...value, id]);
    setListingNotices((value) => ({
      ...value,
      [id]: result.preserved.length
        ? "Undone where unchanged. Your later edits were kept."
        : "Undone. Previous details restored.",
    }));
  }
  async function runListing(text: string, question?: string) {
    if (!text.trim()) return;
    const unanswered = !question
      ? listingRun.state.questions.find(
          (item) => !listingRun.state.answers[item.id],
        )
      : undefined;
    if (unanswered) {
      question = unanswered.question;
      listingRun.markQuestionAnswered(unanswered.id, text);
    }
    const token = ++listingRunToken.current;
    const baseline = { ...listingRevisions.current };
    const current = draftRef.current;
    lastListingRequest.current = { text, question };
    setListingInput("");
    await listingRun.run(
      {
        text: text.trim(),
        context: {
          intent: "listing_assist",
          location: current.location,
          currentDraft: agentDraft(current),
          originalRequest:
            current.raw ||
            "Prepare a listing from my photo and supplied details.",
          previousAnswer: listingRun.state.text.slice(0, 6000),
          answeredQuestions: [...listingRun.state.history, listingRun.state]
            .flatMap((turn) =>
              turn.questions.flatMap((item) => {
                const answer = turn.answers[item.id];
                return answer
                  ? [{ question: item.question, answer: answer.slice(0, 4000) }]
                  : [];
              }),
            )
            .slice(-30),
          recentMessages: [
            ...listingRun.state.history.flatMap((turn) => [
              { role: "user" as const, text: turn.request.slice(0, 4000) },
              {
                role: "assistant" as const,
                text: (
                  turn.questions.map((item) => item.question).join("\n") ||
                  turn.text
                ).slice(0, 4000),
              },
            ]),
            {
              role: "user" as const,
              text: listingRun.state.request.slice(0, 4000),
            },
            {
              role: "assistant" as const,
              text: (
                listingRun.state.questions
                  .map((item) => item.question)
                  .join("\n") || listingRun.state.text
              ).slice(0, 4000),
            },
          ]
            .filter((item) => item.text)
            .slice(-12),
          ...(question ? { previousQuestion: question } : {}),
        },
      },
      {
        onAction: (action) => {
          if (
            token === listingRunToken.current &&
            action.type === "listing_patch"
          )
            applyListingPatch(action, baseline);
        },
      },
    );
  }
  function answerListingQuestion(id: string, answer: string) {
    if (listingRun.state.status === "running") return;
    const question = listingRun.state.questions.find((item) => item.id === id);
    if (!question) return;
    listingRun.markQuestionAnswered(id, answer);
    void runListing(answer, question.question);
  }
  function saveSearch() {
    const existing = editingJob
      ? jobs.find((job) => job.id === editingJob)
      : undefined;
    const original = existing
      ? restoreSearch(existing, location)
      : committedSearch;
    if (!original) return;
    const search =
      existing && !sameCriteria(filterDraft, existing.criteria)
        ? preferenceSearch(normalizedFilterDraft, original.location, original)
        : original;
    const title = jobTitle.trim() || criteriaTitle(search.criteria);
    setJobs((current) =>
      existing
        ? current.map((job) =>
            job.id === existing.id
              ? {
                  ...job,
                  title,
                  criteria: search.criteria,
                  location: search.location,
                  request: search.text,
                  search,
                }
              : job,
          )
        : [
            ...current,
            {
              id: crypto.randomUUID(),
              title,
              criteria: search.criteria,
              location: search.location,
              request: search.text,
              search,
              paused: false,
              seen: true,
            },
          ],
    );
    setEditingJob(null);
    setModal(null);
    setToast("Search saved in this browser.");
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    cancelPhotoRead();
    const existing = listingPhotos(draftRef.current);
    if (existing.length + files.length > MAX_LISTING_PHOTOS) {
      setUploadError(`Add up to ${MAX_LISTING_PHOTOS} photos per listing.`);
      return;
    }
    const controller = new AbortController();
    imageReader.current = controller;
    setUploadError("");
    setPhotoReading(true);
    try {
      const added: string[] = [];
      for (const file of files)
        added.push(await readListingPhoto(file, controller.signal));
      controller.signal.throwIfAborted();
      const images = [...new Set([...existing, ...added])];
      setDraft((current) => ({ ...current, image: images[0], images }));
    } catch (error) {
      if (!controller.signal.aborted)
        setUploadError(
          error instanceof Error
            ? error.message
            : "Could not read these photos. Try again.",
        );
    } finally {
      if (imageReader.current === controller) {
        imageReader.current = null;
        setPhotoReading(false);
      }
    }
  }
  async function generateDraft() {
    if (photoReading) {
      setUploadError("Your photo is still loading.");
      return;
    }
    if (!draft.image) {
      setUploadError("Add a photo first.");
      return;
    }
    listingRequest.current?.abort();
    const controller = new AbortController();
    listingRequest.current = controller;
    setBusy(true);
    setUploadError("");
    try {
      const response = await requestAgentAssist(
        {
          intent: "listing",
          text: draft.raw,
          images: listingPhotos(draft),
          context: { location: draft.location },
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const metadata = response.metadata;
      const current = draftRef.current;
      const prepared = prepareListingDraft(current, metadata);
      setDraft(prepared);
      animateUiChange(() => setSellStep(2));
      scrollToPageStart();
      void runListing(
        "Help me finish this listing using the recognised photo details already in the draft. If there is no asking price, research comparable second-hand offers and propose a source-backed starting price for my review, then let me choose a price with a slider or give it away. Ask only the next necessary missing detail using short clickable answers, including pickup times when relevant.",
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setUploadError(
          error instanceof Error
            ? error.message
            : "Could not prepare the listing. Try again.",
        );
    } finally {
      if (listingRequest.current === controller) setBusy(false);
    }
  }
  function addListingSuggestion(suggestion: string) {
    setDraft((current) => ({
      ...current,
      raw: suggestion.slice(0, 4000),
    }));
    window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLTextAreaElement>(
        ".sell-inputs textarea",
      );
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    });
  }
  function publish(event: FormEvent) {
    event.preventDefault();
    if (listingRun.state.status === "running") return;
    const price = Number(draft.price);
    const pickupValid = validListingPickup(draft.pickup, editingItem);
    if (
      !draft.image ||
      !draft.title.trim() ||
      !draft.description.trim() ||
      !draft.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 10000 ||
      !draft.location.trim() ||
      !pickupValid
    ) {
      setToast("Check the listing details before saving.");
      return;
    }
    const item: Product = {
      id: editingListing || crypto.randomUUID(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      tags: draft.tags,
      price,
      image: draft.image,
      images: listingPhotos(draft),
      category: "All",
      location: draft.location.trim(),
      distance: 0,
      condition: draft.condition,
      dimensions: draft.dimensions.trim() || "Not specified",
      source: "takeover",
      seller: "You",
      initials: "Y",
      own: true,
      demo: editingItem?.demo,
      pickupPoint:
        draft.location.trim() === editingItem?.location
          ? editingItem?.pickupPoint
          : undefined,
      photoSourceUrl:
        draft.image === editingItem?.image
          ? editingItem?.photoSourceUrl
          : undefined,
      pickupBy: draft.pickup,
      available: draft.pickup
        ? "Pickup by " + shortDate(draft.pickup)
        : "Flexible pickup",
      status: editingListing
        ? own.find((current) => current.id === editingListing)?.status ||
          "active"
        : "active",
    };
    const saved = setOwn((current) =>
      editingListing
        ? current.map((existing) =>
            existing.id === editingListing ? item : existing,
          )
        : [item, ...current],
    );
    if (!saved) {
      setToast(
        "Could not save the listing. Your draft is still here; check browser storage and try again.",
      );
      return;
    }
    setAccountTab("listings");
    navigate("account");
    setToast("Listing saved in this browser.");
  }
  function editListing(item: Product) {
    if (item.status === "withdrawn") return;
    navigate("sell");
    resetListingConversation();
    listingRevisions.current = {};
    setEditingListing(item.id);
    setDraft({
      image: item.image,
      images: listingPhotos(item),
      raw: "",
      title: item.title,
      tags: item.tags,
      description: item.description,
      price: String(item.price),
      condition: item.condition,
      dimensions: item.dimensions === "Not specified" ? "" : item.dimensions,
      location: item.location,
      pickup: item.pickupBy,
      category: "All",
    });
    setSellStep(2);
    setUploadError("");
  }
  function setStatus(id: string, status: Product["status"]) {
    const saved = setOwn((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    if (!saved) {
      setToast(
        "Could not save this status change. Check browser storage and try again.",
      );
      return;
    }
    if (status === "withdrawn")
      setCompared((current) => current.filter((item) => item !== id));
    setToast(
      status === "withdrawn"
        ? "Listing archived. You can restore it from Archive."
        : "Listing status updated.",
    );
  }
  const listingConversation = (
    <section className="listing-conversation" aria-label="Listing agent">
      <div className="listing-research-actions">
        <button
          type="button"
          className="text-button"
          disabled={!configured || listingRun.state.status === "running"}
          onClick={() =>
            void runListing(
              "Research comparable individual secondhand offers for this item.",
            )
          }
        >
          Research this item <ArrowRight size={14} />
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!configured || listingRun.state.status === "running"}
          onClick={() =>
            void runListing(
              "Research comparable asking prices and suggest a price for this listing.",
            )
          }
        >
          Suggest a price <ArrowRight size={14} />
        </button>
      </div>
      <AgentConversation
        state={listingRun.state}
        footer={
          <AgentComposer
            value={listingInput}
            onChange={setListingInput}
            onSend={() => void runListing(listingInput)}
            label="Tell the listing agent"
            placeholder="Add a detail, change the price or plan pickup…"
            sendLabel="Send to listing agent"
            disabled={!configured || listingRun.state.status === "running"}
          />
        }
        requestLabel={(request) =>
          request.startsWith("Help me finish this listing")
            ? draft.raw || "Create a listing from my photo."
            : request
        }
      >
        {(turn, archived) => (
          <AgentRunPanel
            className={archived ? "archived-agent-response" : ""}
            conversational
            externalComposer
            showHistory={false}
            state={turn}
            onCancel={() => {
              listingRunToken.current += 1;
              listingRun.cancel();
            }}
            onReset={resetListingConversation}
            onRetry={() => {
              const last = lastListingRequest.current;
              if (last) void runListing(last.text, last.question);
            }}
            onAnswer={answerListingQuestion}
            onSkipQuestion={(id) =>
              answerListingQuestion(
                id,
                "I don't know. Leave this detail unspecified and continue.",
              )
            }
            onApplyAction={acceptListingPatch}
            onUndoAction={undoListingPatch}
            appliedActionIds={Object.keys(listingChanges)}
            undoneActionIds={listingUndone}
            actionNotices={listingNotices}
          />
        )}
      </AgentConversation>
    </section>
  );
  const productCard = (item: Product, showFavorite = true) => (
    <ProductCard
      key={item.id}
      product={item}
      favorite={favorites.includes(item.id)}
      showFavorite={showFavorite}
      compared={compared.includes(item.id)}
      onOpen={() => openProduct(item)}
      onToggleFavorite={() => toggleFavorite(item.id)}
      onToggleCompare={() => toggleCompare(item.id)}
    />
  );

  const connectionStatus =
    !configured || healthError ? (
      <div className="agent-footnote">
        <span role="status" title={healthError || undefined}>
          {healthError
            ? "AI offline"
            : agentHealth
              ? configured
                ? "AI connected"
                : "AI not configured"
              : "Connecting…"}
        </span>
        {(!configured || healthError) && (
          <button
            type="button"
            onClick={refreshHealth}
            disabled={healthChecking}
          >
            {healthChecking ? "Reconnecting…" : "Retry"}
          </button>
        )}
        {configured && agentHealth?.webSearchConfigured === false && (
          <span>
            Web search is unavailable. Your local listings are still accessible.
          </span>
        )}
      </div>
    ) : null;

  return (
    <>
      {(!database.ready || database.pending > 0 || database.error) && (
        <div className="workflow-test-banner" role="status">
          {database.error ||
            (database.pending
              ? "Saving demo changes to the database…"
              : "Loading demo listings from the database…")}
          {database.error && (
            <button className="text-button" onClick={database.retry}>
              Retry
            </button>
          )}
        </div>
      )}
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
          aria-label="takeover home"
        >
          takeover
        </a>
        <nav aria-label="Main navigation">
          <button
            className={
              view === "discover" || view === "detail" || view === "compare"
                ? "active"
                : ""
            }
            onClick={goHome}
          >
            Find
          </button>
          <button
            className={view === "searches" ? "active" : ""}
            onClick={() => navigate("searches")}
          >
            Saved searches
            <span className="nav-count">{savedSearches.length}</span>
          </button>
          <button
            className={view === "messages" ? "active" : ""}
            onClick={() => openMessages()}
          >
            Messages
          </button>
          <button
            className={view === "account" ? "active" : ""}
            onClick={() => navigate("account")}
          >
            My space
          </button>
        </nav>
        <div className="header-actions">
          <button className="button primary sell-nav" onClick={startSell}>
            <Plus size={17} />
            Sell furniture
          </button>
          <button
            className="icon-button"
            aria-label="Open workspace settings"
            onClick={() => setModal("profile")}
          >
            <UserRound size={20} />
          </button>
        </div>
      </header>
      <div
        className={
          "app-layout " +
          (isHome ? "home-layout" : "focused-layout") +
          (view === "discover" && !isHome ? " chat-layout" : "") +
          (view === "messages" ? " messages-layout" : "") +
          (view === "sell"
            ? sellStep === 2
              ? " selling-chat-layout"
              : " selling-photo-layout"
            : "")
        }
      >
        <main className={"main-content view-" + view}>
          {view === "messages" && (
            <MessagesPage
              key={messageListingId ?? "inbox"}
              listingId={messageListingId}
              initialMessage={
                messageProposal
                  ? (messageProposal.draft?.message ??
                    draftMessage(
                      own.find((item) => item.id === messageListingId)?.title ??
                        "Listing",
                      messageProposal.terms,
                    ))
                  : undefined
              }
              onBeforeSend={(listingId, role) => {
                if (
                  !messageProposal ||
                  listingId !== messageProposal.listingId ||
                  role !== "buyer"
                )
                  return;
                const current = negotiations.current();
                if (
                  !current ||
                  current.id !== messageProposal.id ||
                  current.version !== messageProposal.version
                )
                  throw new Error(
                    "This proposal has changed. Reopen its latest message from the agent chat.",
                  );
              }}
              onSent={(listingId, role, message) => {
                if (
                  !messageProposal ||
                  listingId !== messageProposal.listingId ||
                  role !== "buyer"
                )
                  return;
                negotiations.commit({
                  type: "negotiation_update",
                  previousVersion: messageProposal.version,
                  negotiation: markNegotiationSent(
                    {
                      ...messageProposal,
                      draft: { message, version: messageProposal.version },
                    },
                    messageProposal.version,
                  ),
                });
                setMessageProposal(undefined);
              }}
              onDeleted={() => window.history.replaceState(null, "", "#messages")}
              listings={own}
              listing={own.find((item) => item.id === messageListingId)}
              onOpenListing={(id) => {
                const item = own.find((item) => item.id === id);
                if (item) openProduct(item);
              }}
            />
          )}
          {view === "discover" && (
            <>
              {isHome ? (
                <section
                  className={`agent-hero search-entry${hasSearchDraft ? " has-query" : ""}`}
                  aria-labelledby="agent-title"
                >
                  <div className="agent-modes">
                    <span>Find something</span>
                    <button onClick={startSell}>Sell from a photo</button>
                  </div>
                  <HeroHeadline compact={hasSearchDraft} />
                  <p>
                    {hasSearchDraft
                      ? `Add a budget, condition or pickup time. Your agent will search around ${location}.`
                      : `Describe what you need. Your agent searches around ${location}.`}
                  </p>
                  <form
                    className="agent-search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runSearch(query);
                    }}
                  >
                    <textarea
                      aria-label="Search furniture"
                      maxLength={4000}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      rows={3}
                      placeholder="A desk under CHF 80, nearby, ready to collect by Friday…"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void runSearch(query);
                        }
                      }}
                    />
                    <div className="agent-search-actions">
                      <div className="search-area-status">
                        <button
                          type="button"
                          className="search-area"
                          onClick={() => {
                            setAreaDraft({ location, radius: criteria.radius });
                            setModal("location");
                          }}
                        >
                          {location}
                          <ChevronDown size={13} />
                        </button>
                        {connectionStatus}
                      </div>
                      <button
                        className="button primary"
                        type="submit"
                        disabled={!query.trim() || running}
                      >
                        Find it
                      </button>
                    </div>
                  </form>
                  <AgentSuggestions state={searchAssist} onSelect={setQuery} />
                </section>
              ) : (
                <>
                  <div className="page-title search-title">
                    <button className="back-link" onClick={goHome}>
                      <ArrowLeft size={15} />
                      New search
                    </button>
                    <h1>
                      {reviewingListing ? "Listing review" : searchHeading}
                    </h1>
                    {reviewingListing && (
                      <p>
                        Review the details you supplied and ask what could help
                        a buyer.
                      </p>
                    )}
                  </div>
                  {!reviewingListing && (
                    <>
                      <form
                        className="main-search"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void runSearch(query);
                        }}
                      >
                        <input
                          aria-label="Search furniture"
                          maxLength={4000}
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Describe what you need…"
                        />
                        <button
                          className="button primary"
                          type="submit"
                          disabled={!query.trim() || running}
                        >
                          Search
                        </button>
                      </form>
                      <div className="results-controls">
                        <button
                          className="search-settings"
                          title={activePreferences || undefined}
                          onClick={() => {
                            setFilterDraft(criteria);
                            setModal("filters");
                          }}
                        >
                          <span>Search preferences</span>
                          <span className="edit-settings">Edit</span>
                        </button>
                        <button
                          className="save-search"
                          disabled={running || !committedSearch}
                          onClick={() => {
                            setEditingJob(null);
                            setJobTitle(
                              (committedSearch?.originalRequest || "").slice(
                                0,
                                90,
                              ),
                            );
                            setModal("save");
                          }}
                        >
                          Save this search
                        </button>
                      </div>
                      {activePreferences && (
                        <p
                          className="quiet-caption"
                          style={{ textAlign: "left" }}
                        >
                          Active preferences: {activePreferences}
                        </p>
                      )}
                    </>
                  )}
                  {negotiations.error && (
                    <p role="alert">{negotiations.error}</p>
                  )}
                  <AgentConversation
                    state={agentRun.state}
                    context={
                      negotiations.active &&
                      !activeDraftInChat &&
                      proposalSummary(negotiations.active, true)
                    }
                    footer={
                      <AgentComposer
                        value={followUp}
                        onChange={setFollowUp}
                        onSend={() => void runSearch(followUp, criteria, true)}
                        label="Ask the agent"
                        placeholder={
                          reviewingListing
                            ? "Ask about your listing…"
                            : "Ask a follow-up or refine the search…"
                        }
                        sendLabel="Send to the agent"
                        disabled={running}
                      />
                    }
                  >
                    {(turn, archived) => {
                      const localMatches = (
                        turn.inventoryMatchIds ?? []
                      ).flatMap((id) => {
                        const item = activeListings.find(
                          (listing) => listing.id === id,
                        );
                        return item ? [item] : [];
                      });
                      return (
                        <AgentRunPanel
                          state={turn}
                          externalComposer
                          outcome={
                            turn.proposal?.draft && (
                              <MessageDraftPreview
                                proposal={turn.proposal}
                                sent={negotiations.items.some(
                                  (proposal) =>
                                    proposal.id === turn.proposal?.id &&
                                    proposal.status === "sent",
                                )}
                                title={
                                  own.find(
                                    (item) =>
                                      item.id === turn.proposal?.listingId,
                                  )?.title ?? "Listing"
                                }
                                onReview={
                                  negotiations.items.some(
                                    (proposal) =>
                                      proposal.id === turn.proposal?.id &&
                                      proposal.version ===
                                        turn.proposal.version &&
                                      proposal.status === "draft",
                                  ) &&
                                  own.some(
                                    (item) =>
                                      item.id === turn.proposal?.listingId &&
                                      item.status === "active",
                                  )
                                    ? () => {
                                        negotiations.activate(
                                          turn.proposal!.id,
                                        );
                                        openMessages(
                                          turn.proposal!.listingId,
                                          turn.proposal,
                                        );
                                      }
                                    : undefined
                                }
                              />
                            )
                          }
                          className={`${reviewingListing ? "" : "search-agent-message"} ${archived ? "archived-agent-response" : ""}`}
                          showHistory={false}
                          splitSearchResults={
                            !reviewingListing &&
                            (archived || !negotiations.active)
                          }
                          localListings={
                            !reviewingListing &&
                            turn.inventoryMatchIds !== null &&
                            localMatches.length > 0 ? (
                              <>
                                <div className="section-heading">
                                  <div>
                                    <h3>On takeover ({localMatches.length})</h3>
                                    <span>
                                      Check pickup distance before collecting.
                                    </span>
                                  </div>
                                </div>
                                <div className="product-grid">
                                  {localMatches.map((item) => (
                                    <div key={item.id}>
                                      {productCard(item, false)}
                                      <button
                                        className="prepare-offer-button"
                                        type="button"
                                        onClick={() => continueOffer(item)}
                                      >
                                        {item.price === 0
                                          ? "Arrange pickup"
                                          : "Prepare an offer"}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : undefined
                          }
                          onCancel={agentRun.cancel}
                          onRetry={() =>
                            committedSearchRef.current &&
                            void performSearch(committedSearchRef.current)
                          }
                          onReset={goHome}
                          onAnswer={answerSearchQuestion}
                          onSkipQuestion={(id) =>
                            answerSearchQuestion(
                              id,
                              "Skip this question and continue with my current preferences.",
                            )
                          }
                          onApplyAction={(id) => {
                            const action = agentRun.state.actions.find(
                              (item) => item.id === id,
                            );
                            if (action?.type === "preferences_patch")
                              applySearchPatch(action);
                          }}
                          onUndoAction={undoSearchPatch}
                          appliedActionIds={Object.keys(searchChanges)}
                          undoneActionIds={searchUndone}
                          actionNotices={searchNotices}
                        />
                      );
                    }}
                  </AgentConversation>
                  {connectionStatus}
                </>
              )}
              {isHome && negotiations.error && (
                <p role="alert">{negotiations.error}</p>
              )}
              {isHome &&
                negotiations.items
                  .filter((item) => item.status === "draft")
                  .map((proposal) => proposalSummary(proposal))}
              {isHome && visibleListings.length > 0 && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>
                        {isHome
                          ? "Your local listings"
                          : "From your local listings"}
                      </h2>
                      <span>Personal browser listings & demo database</span>
                    </div>
                    <button
                      className="browse-filter"
                      onClick={() => {
                        setAccountTab("listings");
                        navigate("account");
                      }}
                    >
                      Manage listings
                    </button>
                  </div>
                  <div className="product-grid">
                    {visibleListings.map((item) => productCard(item))}
                  </div>
                </>
              )}
              {isHome && !visibleListings.length && (
                <div className="section-heading">
                  <div>
                    <h2>Something to sell?</h2>
                    <span>
                      Upload a photo. Your agent prepares the listing.
                    </span>
                  </div>
                  <button className="button secondary" onClick={startSell}>
                    Create a listing
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {view === "searches" && (
            <>
              <div className="page-title">
                <h1>Saved searches</h1>
                <p>Keep a search and run it again when you need it.</p>
              </div>
              {savedSearches.length ? (
                <div className="search-jobs">
                  {savedSearches.map((job) => (
                    <article className="search-job" key={job.id}>
                      <div className="job-icon">
                        <Search size={20} />
                      </div>
                      <div className="job-main">
                        <h2>{job.title}</h2>
                        <p>
                          {job.request ||
                            searchText(job.criteria, job.location || location)}
                        </p>
                        <div className="job-actions">
                          <button
                            className="button secondary small"
                            onClick={() => {
                              const search = restoreSearch(job, location);
                              setSearchArea({
                                location: search.location,
                                radius: search.criteria.radius,
                              });
                              void performSearch(search);
                            }}
                          >
                            Run search
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="job-controls">
                        <button
                          className="icon-button"
                          aria-label={"Edit saved search " + job.title}
                          onClick={() => {
                            setEditingJob(job.id);
                            setJobTitle(job.title);
                            setFilterDraft(job.criteria);
                            setModal("edit-search");
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Delete saved search " + job.title}
                          onClick={() => {
                            setJobs((current) =>
                              current.filter((item) => item.id !== job.id),
                            );
                            setToastNotice({
                              message: "Saved search deleted.",
                              deletedSearch: {
                                job,
                                index: jobs.findIndex(
                                  (item) => item.id === job.id,
                                ),
                              },
                            });
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bookmark size={32} />
                  <h2>No saved searches yet</h2>
                  <p>Start with what you need, then save your search.</p>
                  <button className="button primary" onClick={goHome}>
                    Find furniture
                  </button>
                </div>
              )}
              {savedSearches.length > 0 && (
                <p className="quiet-caption">
                  Stored in this browser. Searches run when you start them.
                </p>
              )}
            </>
          )}

          {view === "sell" && (
            <>
              <SellFlow
                draft={draft}
                step={sellStep}
                editing={!!editingListing}
                pickupMin={listingPickupMinimum(draft.pickup, editingItem)}
                busy={busy}
                photoReading={photoReading}
                uploadError={uploadError}
                liveAgent={configured}
                listingAssist={listingAssist}
                onBack={() => {
                  if (sellStep === 2 && !editingListing) {
                    resetListingConversation();
                    setSellStep(1);
                  } else if (editingListing) navigate("account");
                  else goHome();
                }}
                onDraftChange={changeDraft}
                agentWorking={listingRun.state.status === "running"}
                agentConversation={listingConversation}
                onPhotoSelected={upload}
                onCreateDraft={generateDraft}
                onSuggestionSelected={addListingSuggestion}
                onPublish={publish}
              />
              {connectionStatus}
            </>
          )}

          {view === "detail" &&
            (selected ? (
              <>
                <button
                  className="back-link"
                  onClick={() => navigate("account")}
                >
                  <ArrowLeft size={16} />
                  My listings
                </button>
                <div className="detail-layout">
                  <div className="detail-photo">
                    <PhotoGallery
                      key={selected.id}
                      images={listingPhotos(selected)}
                      title={selected.title}
                    />
                  </div>
                  <div className="detail-summary">
                    <span className="source-label">
                      {selected.demo
                        ? "Demo listing · Fictional offer"
                        : "Your local listing"}
                    </span>
                    <h1>{selected.title}</h1>
                    <strong className="detail-price">
                      {money(selected.price)}
                    </strong>
                    <div className="detail-meta">
                      <span>
                        <MapPin size={15} />
                        {selected.location}
                      </span>
                    </div>
                    {selected.pickupPoint && (
                      <div className="detail-description">
                        <strong>Suggested meeting point</strong>
                        <p>
                          {selected.pickupPoint.name}
                          <br />
                          {selected.pickupPoint.address}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.pickupPoint.name + " " + selected.pickupPoint.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in Maps
                        </a>
                        {" · "}
                        <a
                          href={selected.pickupPoint.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Address source
                        </a>
                        <p>
                          This is a real place near EPFL. Arrange a meeting with
                          the seller; this demo item is not stored there.
                        </p>
                      </div>
                    )}
                    <div className="detail-description">
                      <p>{selected.description}</p>
                      {selected.photoSourceUrl && (
                        <a
                          href={selected.photoSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View original photo listing
                        </a>
                      )}
                    </div>
                    <div className="facts">
                      <div>
                        <span>Condition</span>
                        <strong>{selected.condition || "Not specified"}</strong>
                      </div>
                      <div>
                        <span>Dimensions</span>
                        <strong>{selected.dimensions}</strong>
                      </div>
                      <div>
                        <span>Collection</span>
                        <strong>{selected.available}</strong>
                      </div>
                    </div>
                    <button
                      className="button primary full"
                      disabled={selected.status !== "active"}
                      onClick={() => openMessages(selected.id)}
                    >
                      Message seller
                    </button>
                    <button
                      className="button secondary full"
                      onClick={() => editListing(selected)}
                    >
                      <Pencil size={16} />
                      Edit listing
                    </button>
                    <button
                      className="button secondary full"
                      onClick={() => {
                        editListing(selected);
                        void runListing(
                          "Review my supplied listing and help me improve it. Ask about missing facts; do not invent them.",
                        );
                      }}
                    >
                      Ask the agent
                    </button>
                    <p className="quiet-caption">
                      {selected.demo
                        ? "Demo listing stored in the local database."
                        : "Saved in this browser."}{" "}
                      Not published to an external marketplace.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h1>Listing not found</h1>
                <button
                  className="button secondary"
                  onClick={() => navigate("account")}
                >
                  My listings
                </button>
              </div>
            ))}

          {view === "compare" && (
            <>
              <div className="page-title">
                <button
                  className="back-link"
                  onClick={() => navigate("account")}
                >
                  <ArrowLeft size={16} />
                  My space
                </button>
                <h1>Compare your listings</h1>
              </div>
              {comparison.length ? (
                <div className="comparison-grid">
                  {comparison.map((item) => (
                    <article className="comparison-card" key={item.id}>
                      <div className="comparison-image">
                        <img src={item.image} alt={item.title} />
                      </div>
                      <h2>{item.title}</h2>
                      <strong className="compare-price">
                        {money(item.price)}
                      </strong>
                      <div>
                        <div className="compare-fact">
                          <span>Condition</span>
                          <strong>{item.condition || "Not specified"}</strong>
                        </div>
                        <div className="compare-fact">
                          <span>Dimensions</span>
                          <strong>{item.dimensions}</strong>
                        </div>
                        <div className="compare-fact">
                          <span>Collection</span>
                          <strong>{item.available}</strong>
                        </div>
                      </div>
                      <button
                        className="button secondary full"
                        onClick={() => openProduct(item)}
                      >
                        Open listing
                      </button>
                      <button
                        className="text-button"
                        onClick={() => toggleCompare(item.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h2>Select listings to compare</h2>
                  <button
                    className="button secondary"
                    onClick={() => navigate("account")}
                  >
                    My listings
                  </button>
                </div>
              )}
            </>
          )}

          {view === "account" && (
            <>
              <div className="page-title title-with-action">
                <div>
                  <h1>My space</h1>
                  <p>Your browser listings, saved items and demo database.</p>
                </div>
                <button className="button primary" onClick={startSell}>
                  <Plus size={16} />
                  Sell furniture
                </button>
              </div>
              <button
                className="button secondary"
                onClick={() => openMessages()}
              >
                Open messages
              </button>
              <div
                className="account-tabs"
                role="tablist"
                aria-label="My space"
              >
                <button
                  role="tab"
                  aria-selected={accountTab === "listings"}
                  className={accountTab === "listings" ? "active" : ""}
                  onClick={() => setAccountTab("listings")}
                >
                  My listings<span>{visibleListings.length}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={accountTab === "favorites"}
                  className={accountTab === "favorites" ? "active" : ""}
                  onClick={() => setAccountTab("favorites")}
                >
                  Saved items<span>{savedListings.length}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={accountTab === "archive"}
                  className={accountTab === "archive" ? "active" : ""}
                  onClick={() => setAccountTab("archive")}
                >
                  Archive<span>{archivedListings.length}</span>
                </button>
              </div>
              {accountTab === "favorites" &&
                (savedListings.length ? (
                  <div className="product-grid">
                    {savedListings.map((item) => productCard(item))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Heart size={30} />
                    <h2>No saved local items</h2>
                    <p>Use the heart on a local listing to keep it here.</p>
                    <button
                      className="button secondary"
                      onClick={() => setAccountTab("listings")}
                    >
                      My listings
                    </button>
                  </div>
                ))}
              {accountTab !== "favorites" &&
                (accountListings.length ? (
                  <div className="own-listings">
                    {accountListings.map((item) => (
                      <article className="own-listing" key={item.id}>
                        {item.status === "withdrawn" ? (
                          <div
                            className="own-listing-image"
                            aria-hidden="true"
                            style={{ display: "grid", placeItems: "center" }}
                          >
                            <Trash2 size={24} />
                          </div>
                        ) : (
                          <button
                            className="own-listing-image"
                            aria-label={"Open " + item.title}
                            onClick={() => openProduct(item)}
                          >
                            <img src={item.image} alt={item.title} />
                          </button>
                        )}
                        <div>
                          <span
                            className={
                              "status " +
                              (item.status !== "active" ? "muted" : "")
                            }
                          >
                            {item.status === "active"
                              ? "Active locally"
                              : item.status === "withdrawn"
                                ? "Archived"
                                : item.status === "reserved"
                                  ? "Reserved"
                                  : "Sold"}
                          </span>
                          <h2>{item.title}</h2>
                          <strong>{money(item.price)}</strong>
                          <p>{item.available}</p>
                          <div className="listing-actions">
                            {item.status !== "withdrawn" && (
                              <button
                                className="button secondary small"
                                onClick={() => editListing(item)}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                            )}
                            {item.status === "active" && (
                              <button
                                className="button secondary small"
                                onClick={() => setStatus(item.id, "reserved")}
                              >
                                Mark reserved
                              </button>
                            )}
                            {(item.status === "active" ||
                              item.status === "reserved") && (
                              <button
                                className="button secondary small"
                                onClick={() => setStatus(item.id, "sold")}
                              >
                                Mark sold
                              </button>
                            )}
                            {item.status !== "active" && (
                              <button
                                className="text-button"
                                onClick={() => setStatus(item.id, "active")}
                              >
                                {item.status === "withdrawn"
                                  ? "Restore listing"
                                  : "Make active"}
                              </button>
                            )}
                            {item.status !== "withdrawn" && (
                              <button
                                className="text-button"
                                onClick={() => setStatus(item.id, "withdrawn")}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Camera size={32} />
                    <h2>
                      {accountTab === "archive"
                        ? "No archived listings"
                        : "Your first listing starts with a photo"}
                    </h2>
                    <p>
                      {accountTab === "archive"
                        ? "Items you archive will appear here."
                        : "Add your item and let the agent prepare the details."}
                    </p>
                    {accountTab !== "archive" && (
                      <button className="button primary" onClick={startSell}>
                        Create a listing
                      </button>
                    )}
                  </div>
                ))}
            </>
          )}
        </main>
      </div>

      <MobileNav
        active={
          view === "sell"
            ? "sell"
            : view === "messages"
              ? "messages"
              : view === "searches"
                ? "searches"
                : view === "account"
                  ? accountTab === "favorites"
                    ? "favorites"
                    : "account"
                  : "browse"
        }
        onNavigate={(destination) => {
          if (destination === "browse") goHome();
          else if (destination === "sell") startSell();
          else if (destination === "messages") openMessages();
          else if (destination === "searches") navigate("searches");
          else {
            setAccountTab(
              destination === "favorites" ? "favorites" : "listings",
            );
            navigate("account");
          }
        }}
      />
      {comparison.length > 0 &&
        !modal &&
        (view === "account" || view === "detail" || isHome) && (
          <div className="compare-tray">
            <span>
              <GitCompareArrows size={18} />
              <strong>{comparison.length}</strong> selected
            </span>
            <button
              className="button primary small"
              onClick={() => navigate("compare")}
            >
              Compare
              <ArrowRight size={14} />
            </button>
            <button
              className="icon-button"
              aria-label="Clear comparison"
              onClick={() => setCompared([])}
            >
              <X size={16} />
            </button>
          </div>
        )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          {toastNotice?.deletedSearch && (
            <button
              className="text-button"
              style={{
                pointerEvents: "auto",
                color: "inherit",
                textDecoration: "underline",
                whiteSpace: "nowrap",
              }}
              aria-label="Undo saved search deletion"
              onClick={() => {
                const deleted = toastNotice.deletedSearch;
                if (!deleted) return;
                setJobs((current) => {
                  if (current.some((job) => job.id === deleted.job.id))
                    return current;
                  const index = Math.max(
                    0,
                    Math.min(deleted.index, current.length),
                  );
                  return [
                    ...current.slice(0, index),
                    deleted.job,
                    ...current.slice(index),
                  ];
                });
                setToast("Saved search restored.");
              }}
            >
              Undo
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {modal === "filters" && (
        <Modal title="Search preferences" onClose={() => setModal(null)}>
          <p className="modal-intro">
            Tell the agent what matters for this search.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void performSearch(
                preferenceSearch(
                  normalizedFilterDraft,
                  location,
                  committedSearch ?? undefined,
                ),
              );
            }}
          >
            <SearchPreferencesFields
              value={filterDraft}
              onChange={setFilterDraft}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setFilterDraft({ ...defaults })}
              >
                Reset
              </button>
              <button className="button primary" type="submit">
                Search with these preferences
              </button>
            </div>
          </form>
        </Modal>
      )}
      {(modal === "save" || modal === "edit-search") && (
        <Modal
          title={modal === "save" ? "Save this search" : "Edit saved search"}
          onClose={() => {
            setModal(null);
            setEditingJob(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveSearch();
            }}
          >
            <label>
              Search name
              <input
                required
                maxLength={90}
                pattern=".*\S.*"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
              />
            </label>
            {modal === "edit-search" ? (
              <SearchPreferencesFields
                value={filterDraft}
                onChange={setFilterDraft}
              />
            ) : (
              <p className="modal-intro">{committedSearch?.text}</p>
            )}
            <p className="quiet-caption">
              Saved in this browser. Run it again from Saved searches.
            </p>
            <button className="button primary full" type="submit">
              <Bookmark size={16} />
              Save search
            </button>
          </form>
        </Modal>
      )}
      {modal === "location" && (
        <Modal title="Search area" onClose={() => setModal(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearchArea({
                location: areaDraft.location.trim(),
                radius: areaDraft.radius,
              });
              setCriteria((current) => ({
                ...current,
                radius: areaDraft.radius,
              }));
              setModal(null);
            }}
          >
            <label>
              Location
              <input
                required
                maxLength={120}
                pattern=".*\S.*"
                value={areaDraft.location}
                onChange={(event) =>
                  setAreaDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Distance (km)
              <input
                required
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={Number.isNaN(areaDraft.radius) ? "" : areaDraft.radius}
                onChange={(event) =>
                  setAreaDraft((current) => ({
                    ...current,
                    radius: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <button className="button primary full" type="submit">
              Use this area
            </button>
          </form>
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="Your local workspace" onClose={() => setModal(null)}>
          <p className="modal-intro">
            Your personal listings, favourites and saved searches stay in this
            browser. Demo listings are stored in the local database. Public
            accounts are not connected. Messages are saved in a local demo
            inbox.
          </p>
          {connectionStatus}
          <button
            className="button secondary full"
            onClick={() => {
              setAccountTab("listings");
              navigate("account");
            }}
          >
            Open my space
          </button>
          <button
            className="button secondary full"
            onClick={() => {
              void database.addDemo();
              setModal(null);
            }}
          >
            Add demo listings
          </button>
          <button
            className="text-button reset-demo"
            onClick={() => setModal("help")}
          >
            How the agent works
          </button>
          <button
            className="text-button reset-demo"
            onClick={() => setModal("clear")}
          >
            Clear local workspace
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="How the agent works" onClose={() => setModal(null)}>
          <div className="help-list">
            <div>
              <Search size={20} />
              <p>
                <strong>Find</strong>The agent searches real web sources and
                your active local listings. Open a source to check its current
                availability.
              </p>
            </div>
            <div>
              <Camera size={20} />
              <p>
                <strong>Sell</strong>Your uploaded photo and notes are sent to
                the AI service when you create a draft. Review the details
                before saving.
              </p>
            </div>
            <div>
              <Bookmark size={20} />
              <p>
                <strong>Keep</strong>Listings and saved searches are stored
                locally. Nothing is sent to a seller or published to another
                marketplace.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "clear" && (
        <Modal title="Clear local workspace?" onClose={() => setModal(null)}>
          <p className="modal-intro">
            This removes your listings, favourites and saved searches from this
            browser.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setOwn([]);
                setFavorites([]);
                setJobs([]);
                setCompared([]);
                setSearchArea({
                  location: "Lausanne",
                  radius: defaults.radius,
                });
                goHome();
                setCriteria({ ...defaults });
                setToast("Local workspace cleared.");
              }}
            >
              Clear workspace
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
