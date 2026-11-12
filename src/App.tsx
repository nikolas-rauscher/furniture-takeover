import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./components/ui/dropdown-menu";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { readRoute, type View } from "./navigation";
import type { AccountConnection } from "./cloud/AccountSession";
import Auth from "./cloud/Auth";
import AccountSettings from "./cloud/Account";
import Report from "./cloud/Report";
import { useMarketplaceListings } from "./cloud/useMarketplaceListings";
import { useFavorites } from "./cloud/useFavorites";
import { useAppViewport } from "./hooks/useAppViewport";
import AccountPage, { type AccountTab } from "./components/AccountPage";
import ListingDetailPage from "./components/ListingDetailPage";
import ComparePage from "./components/ComparePage";
import SavedSearchesPage from "./components/SavedSearchesPage";
import { listingPhotos, MAX_LISTING_PHOTOS } from "../shared/listingPhotos";
import { readListingPhoto, sortListingPhotos } from "./listingPhotos";
import type { PhotoGroup } from "../shared/agent";
import WorkspacePage from "./components/WorkspacePage";
import WorkspaceHeader from "./components/WorkspaceHeader";
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
import AgentListings from "./components/AgentListings";
import AgentComposer from "./components/AgentComposer";
import {
  listingDraftReady,
  listingFromDraft,
  prepareListingDraft,
} from "./listingPreparation";
import { HeroHeadline } from "./components/HeroHeadline";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  GitCompareArrows,
  Images,
  Plus,
  Search,
  SquarePen,
  UserRound,
  X,
} from "@/components/icons";
import MobileNav from "./MobileNav";
import Modal from "./components/Modal";
import ProductCard from "./components/ProductCard";
import SearchPreferencesFields from "./components/SearchPreferencesFields";
import SellFlow, { type ListingDraft } from "./components/SellFlow";
import PhotoSearchButton, { imageFrom } from "./components/PhotoSearchButton";
import BatchSellFlow, { type BatchStart } from "./components/BatchSellFlow";
import { batchItem, itemsFromGroups } from "./batchListings";
import PhotoSplitQuestion from "./components/PhotoSplitQuestion";
import AgentSuggestions from "./components/AgentSuggestions";
import AgentRunPanel from "./components/AgentRunPanel";
import { useAgentRun } from "./hooks/useAgentRun";
import { useAgentAssist } from "./hooks/useAgentAssist";
import { useSaved } from "./hooks/useSaved";
import { useAlerts } from "./alerts/useAlerts";
import { demandLadder, NO_BUDGET, similarListings } from "./alerts/matching";
import SellerInsight from "./alerts/SellerInsight";
import MatchAlerts from "./alerts/MatchAlerts";
import WatchPrompt from "./alerts/WatchPrompt";
import {
  agentSearchRequest,
  isSavedSearches,
  isSearchArea,
  newSearch,
  preferenceSearch,
  restoreSearch,
  sameCriteria,
  type SavedSearch,
  type SearchSnapshot,
} from "./searchRequest";
import { requestAgentAssist } from "./api/agent";
import { listingPickupMinimum } from "./listingValidation";
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
import { useAvailability } from "./availability/useAvailability";
import {
  defaults,
  criteriaTitle,
  money,
  shortDate,
  type Criteria,
  type Product,
} from "../shared/marketplace";

type Dialog =
  "filters" | "save" | "edit-search" | "location" | "help" | "clear" | null;
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

export default function App({ account }: { account?: AccountConnection }) {
  useAppViewport();
  const signedIn = !account || !!account.session;
  const [pickupRegion, setPickupRegion] = useState("");
  useEffect(() => {
    let alive = true;
    if (account?.session)
      void account.client
        .from("account_preferences")
        .select("pickup_region")
        .eq("user_id", account.session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (alive && data) setPickupRegion(data.pickup_region);
        });
    return () => {
      alive = false;
    };
  }, [account?.client, account?.session?.user.id]);
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
  const [view, setView] = useState<View>(readRoute(window.location.hash).view);
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
    readRoute(window.location.hash).view === "messages"
      ? readRoute(window.location.hash).listingId
      : undefined,
  );
  const [modal, setModal] = useState<Dialog>(null);
  const [accountTab, setAccountTab] = useState<AccountTab>(
    readRoute(window.location.hash).accountTab,
  );
  const {
    favorites,
    setFavorites,
    error: favoriteError,
  } = useFavorites(account);
  const [jobs, setJobs] = useSaved<SavedSearch[]>(
    "takeover-jobs",
    [],
    isSavedSearches,
  );
  const database = useMarketplaceListings(account);
  const own = database.listings;
  const setOwn = database.setListings;
  // `?availability=reserve` prototype; null (main behaviour) when the flag is off.
  const availability = useAvailability({
    localDemo: !account,
    listings: own,
    ready: database.ready,
    setStatus,
    setToast,
    onFindSimilar: (title) => void runSearch(title),
  });
  const [compared, setCompared] = useState<string[]>([]);
  const comparisonOrigin = useRef<View>("discover");
  const [selectedId, setSelectedId] = useState<string | null>(
    readRoute(window.location.hash).view === "detail"
      ? (readRoute(window.location.hash).listingId ?? null)
      : null,
  );
  const [messageProposal, setMessageProposal] = useState<
    Negotiation | undefined
  >();
  const [jobTitle, setJobTitle] = useState("");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const draftId = useRef(crypto.randomUUID());
  const draftRef = useRef<ListingDraft>({ ...emptyDraft });
  const [draft, setDraftState] = useState<ListingDraft>(draftRef.current);
  function setDraft(value: SetStateAction<ListingDraft>) {
    const next = typeof value === "function" ? value(draftRef.current) : value;
    draftRef.current = next;
    setDraftState(next);
  }
  const [sellStep, setSellStep] = useState(1);
  const [sellMode, setSellMode] = useState<"single" | "batch">("single");
  // Set when several photos turn out to show different items.
  const [photoSplit, setPhotoSplit] = useState<{
    photos: string[];
    groups: PhotoGroup[];
  } | null>(null);
  const [batchStart, setBatchStart] = useState<BatchStart | undefined>();
  // Several sorted items, created one after another with the listing agent.
  const [batchQueue, setBatchQueue] = useState<{
    drafts: ListingDraft[];
    index: number;
    results: ("saved" | "skipped")[];
  } | null>(null);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const hasSellingDraft = useRef(view === "sell");
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
  const localListings = own.filter((item) =>
    account
      ? true
      : item.own && (item.demo || !item.image.startsWith("/images/")),
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
  const editingItem = own.find((item) => item.id === editingListing);
  const savedSearches = jobs.filter((job) => job.id !== "seed-search");
  const alerts = useAlerts(savedSearches, visibleListings, database.ready);
  const alertListings = new Map(visibleListings.map((item) => [item.id, item]));
  // A match is only useful while its listing can still be opened.
  const shownAlerts = alerts.alerts.filter(
    (alert) => alertListings.get(alert.listingId)?.status === "active",
  );
  const matchAlerts = (items: typeof shownAlerts, markAll = false) => (
    <MatchAlerts
      alerts={items}
      searchTitle={(id) => jobs.find((job) => job.id === id)?.title}
      onOpen={(alert) => {
        const item = alertListings.get(alert.listingId);
        alerts.markRead(alert.id);
        if (item) openProduct(item);
      }}
      onDismiss={(alert) => alerts.dismiss(alert.id)}
      onMarkAllRead={markAll ? alerts.markAllRead : undefined}
    />
  );
  const savedListings = visibleListings.filter((item) =>
    favorites.includes(item.id),
  );
  const selected = localListings.find((item) => item.id === selectedId);
  const comparison = visibleListings.filter((item) =>
    compared.includes(item.id),
  );
  const searchIsHome = !searching;
  const isHome = view === "discover" && searchIsHome;
  const mainContent = useRef<HTMLElement>(null);
  const pageKey =
    view === "discover"
      ? isHome
        ? "home"
        : "search"
      : view === "account"
        ? `account-${accountTab}`
        : view === "sell"
          ? `sell-${sellStep}`
          : view === "detail"
            ? `listing-${selectedId}`
            : view;
  const previousPage = useRef(pageKey);
  const scrollPositions = useRef(
    new Map<string, { top: number; left: number }>(),
  );
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    const changed = previousPage.current !== pageKey;
    previousPage.current = pageKey;
    const position = scrollPositions.current.get(pageKey) ?? {
      top: 0,
      left: 0,
    };
    if (changed) window.scrollTo({ ...position, behavior: "instant" });
    if (changed && document.activeElement === document.body)
      mainContent.current?.focus({ preventScroll: true });
    const remember = () =>
      scrollPositions.current.set(pageKey, {
        top: window.scrollY,
        left: window.scrollX,
      });
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [pageKey]);
  const reviewingListing =
    !isHome && committedSearch?.intent === "listing_review";
  const resultCriteria = committedSearch?.criteria ?? criteria;
  const budgetLabel =
    resultCriteria.maxPrice >= 1_000_000
      ? "Any budget"
      : resultCriteria.maxPrice === 0
        ? "Free only"
        : "Up to " + money(resultCriteria.maxPrice);
  const sourceLabel =
    resultCriteria.source === "All"
      ? "All sources"
      : resultCriteria.source === "takeover"
        ? "Takeover"
        : resultCriteria.source;
  const compactPreferences = [
    budgetLabel,
    `${resultCriteria.radius} km`,
    sourceLabel,
  ].join(" · ");
  const activePreferences =
    committedSearch && !reviewingListing
      ? [
          budgetLabel,
          committedSearch.criteria.radius +
            " km of " +
            committedSearch.location,
          committedSearch.criteria.pickup
            ? "Pickup by " + shortDate(committedSearch.criteria.pickup)
            : "Flexible pickup",
          committedSearch.criteria.condition === "All"
            ? "Any condition"
            : committedSearch.criteria.condition + " condition",
          resultCriteria.source === "takeover"
            ? "Takeover listings only"
            : sourceLabel,
        ].join(" · ")
      : "";
  const running = agentRun.state.status === "running";
  // The inspiration photo stays attached to the search it started.
  const [photoSearch, setPhotoSearch] = useState<{
    image: string;
    item: string;
    request: string;
  } | null>(null);
  const [photoSearchBusy, setPhotoSearchBusy] = useState(false);
  const [photoSearchError, setPhotoSearchError] = useState("");
  const photoSearchRequest = useRef<AbortController | null>(null);
  const activePhotoSearch =
    photoSearch && committedSearch?.originalRequest === photoSearch.request
      ? photoSearch
      : null;
  const hasSearchDraft = query.trim().length > 0;
  const searchHeading = "Your search";
  const quotaExhausted = agentHealth?.quota?.remaining === 0;
  const configured =
    agentHealth?.configured === true && signedIn && !quotaExhausted;
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
    configured &&
      view === "sell" &&
      sellMode === "single" &&
      sellStep === 1 &&
      !busy
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
  function navigate(next: View, fromHistory = false) {
    if (
      !signedIn &&
      ["sell", "messages", "account", "searches"].includes(next)
    ) {
      navigate("settings", fromHistory);
      return;
    }
    if (next !== view) {
      scrollPositions.current.set(pageKey, {
        top: window.scrollY,
        left: window.scrollX,
      });
      searchRunToken.current += 1;
      listingRunToken.current += 1;
      agentRun.cancel();
      listingRun.cancel();
      listingRequest.current?.abort();
      photoSearchRequest.current?.abort();
      photoSearchRequest.current = null;
      setPhotoSearchBusy(false);
      cancelPhotoRead();
      setBusy(false);
    }
    setView(next);
    if (!fromHistory) {
      const hash =
        next === "discover"
          ? ""
          : next === "account"
            ? "#listings"
            : `#${next}`;
      if (window.location.hash !== hash)
        window.history.pushState(
          null,
          "",
          window.location.pathname + window.location.search + hash,
        );
    }
    setModal(null);
  }
  useEffect(() => {
    const restore = () => {
      const route = readRoute(window.location.hash);
      setAccountTab(route.accountTab);
      setMessageListingId(
        route.view === "messages" ? route.listingId : undefined,
      );
      if (route.view === "detail") setSelectedId(route.listingId ?? null);
      navigate(route.view, true);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  });
  useEffect(() => {
    if (!signedIn && ["sell", "messages", "account", "searches"].includes(view))
      navigate("settings");
  }, [signedIn, view]);
  function openMessages(listingId?: string, proposal?: Negotiation) {
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (listingId) {
      setMessageProposal(proposal);
      setMessageListingId(listingId);
    }
    navigate("messages");
    if (listingId)
      window.history.replaceState(
        null,
        "",
        `#messages/${encodeURIComponent(listingId)}`,
      );
  }
  function goHome() {
    scrollPositions.current.delete("home");
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
    draftId.current = crypto.randomUUID();
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (view === "sell") return;
    hasSellingDraft.current = true;
    navigate("sell");
    resetListingConversation();
    listingRevisions.current = {};
    setDraft({ ...emptyDraft, location: pickupRegion || location });
    setSellStep(1);
    setSellMode("single");
    setPhotoSplit(null);
    setBatchStart(undefined);
    setBatchQueue(null);
    setEditingListing(null);
    setUploadError("");
  }
  function openSell() {
    if (hasSellingDraft.current) navigate("sell");
    else startSell();
  }
  function openBrowse() {
    navigate("discover");
  }
  function openProduct(item: Product) {
    if (item.status === "withdrawn") return;
    setSelectedId(item.id);
    navigate("detail");
    window.history.replaceState(
      null,
      "",
      `#listing/${encodeURIComponent(item.id)}`,
    );
  }
  function toggleFavorite(id: string) {
    if (!signedIn) {
      navigate("settings");
      return;
    }
    void setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function openComparison() {
    comparisonOrigin.current = view;
    navigate("compare");
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
    if (quotaExhausted) return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
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
    if (window.location.hash)
      window.history.pushState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    setModal(null);
    setSearching(true);
    if (!preserveHistory) setQuery(search.originalRequest);
    setFollowUp((current) =>
      !preserveHistory || current.trim() === search.text.trim() ? "" : current,
    );
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
    if (!text.trim() || running || quotaExhausted) return;
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
  /** Describe the furniture in an inspiration photo, then search for that description. */
  async function searchByPhoto(file: File) {
    if (running || photoSearchBusy) return;
    photoSearchRequest.current?.abort();
    const controller = new AbortController();
    photoSearchRequest.current = controller;
    setPhotoSearchBusy(true);
    setPhotoSearchError("");
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
      if (!item)
        throw new Error(
          response.missingDetails[0] ??
            "No furniture recognised in this photo. Try another photo.",
        );
      const request = (notes ? `${item}. ${notes}` : item).slice(0, 4000);
      setPhotoSearch({ image, item, request });
      setPhotoSearchBusy(false);
      await runSearch(request);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhotoSearchError(
        error instanceof Error
          ? error.message
          : "Could not read this photo. Try another one.",
      );
    } finally {
      if (photoSearchRequest.current === controller) {
        photoSearchRequest.current = null;
        setPhotoSearchBusy(false);
      }
    }
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
    if (running) return false;
    const question = agentRun.state.questions.find((item) => item.id === id);
    if (!question || agentRun.state.answers[id]) return false;
    agentRun.markQuestionAnswered(id, answer);
    void runSearch(answer, criteria, true, question.question);
    return true;
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
  async function runListing(
    text: string,
    question?: string,
    explicitRequest = false,
  ) {
    if (!text.trim()) return;
    const unanswered =
      !question && !explicitRequest
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
    setListingInput((current) =>
      current.trim() === text.trim() ? "" : current,
    );
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
    if (listingRun.state.status === "running") return false;
    const question = listingRun.state.questions.find((item) => item.id === id);
    if (!question || listingRun.state.answers[id]) return false;
    listingRun.markQuestionAnswered(id, answer);
    void runListing(answer, question.question);
    return true;
  }
  const sameWatch = (job: SavedSearch, query: string, maxPrice?: number) =>
    job.criteria.query.trim().toLowerCase() === query.trim().toLowerCase() &&
    job.criteria.maxPrice === (maxPrice ?? NO_BUDGET);
  const isWatching = (query: string, maxPrice?: number) =>
    savedSearches.some((job) => sameWatch(job, query, maxPrice));
  /** Creates a saved search; the alerts hook then watches it for new matches. */
  function addWatch(query: string, maxPrice?: number) {
    const text = query.trim().slice(0, 120);
    if (!text) return;
    const price =
      maxPrice === undefined || !Number.isFinite(maxPrice)
        ? undefined
        : Math.min(Math.max(maxPrice, 0), 1_000_000);
    if (isWatching(text, price)) {
      setToast("You are already watching for this.");
      return;
    }
    const search = preferenceSearch(
      { ...defaults, query: text, maxPrice: price ?? NO_BUDGET },
      location,
    );
    setJobs((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: criteriaTitle(search.criteria),
        criteria: search.criteria,
        location: search.location,
        request: search.text,
        search,
        paused: false,
        seen: true,
      },
    ]);
    setToast("Watching. You'll be notified in the app when a match appears.");
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
  /**
   * `together` skips the different-items check after the seller chose one listing;
   * `keepTitle` keeps a title the seller already wrote instead of the agent's.
   */
  async function generateDraft({ together = false, keepTitle = false } = {}) {
    // The ref, not state: a batch item may start right after a cancelled read.
    if (imageReader.current) {
      setUploadError("Your photo is still loading.");
      return;
    }
    const start = draftRef.current;
    if (!start.image) {
      setUploadError("Add a photo first.");
      return;
    }
    listingRequest.current?.abort();
    const controller = new AbortController();
    listingRequest.current = controller;
    setBusy(true);
    setUploadError("");
    try {
      const photos = listingPhotos(start);
      if (!together && photos.length > 1) {
        // Sorting is a hint: if it fails, draft one listing as before.
        const groups = await sortListingPhotos(photos, controller.signal).catch(
          () => null,
        );
        if (controller.signal.aborted) return;
        if (groups && groups.length > 1) {
          setPhotoSplit({ photos, groups });
          return;
        }
      }
      const response = await requestAgentAssist(
        {
          intent: "listing",
          text: start.raw,
          images: photos,
          context: { location: start.location },
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const metadata = response.metadata;
      const current = draftRef.current;
      const prepared = prepareListingDraft(current, metadata);
      if (keepTitle && current.title.trim()) prepared.title = current.title;
      setDraft(prepared);
      setSellStep(2);
      void runListing(
        "Help me finish this listing using the recognised photo details already in the draft. If there is no asking price, research comparable second-hand offers and propose a source-backed starting price for my review, then let me choose a price with a slider or give it away. Ask only the next necessary missing detail using short clickable answers, such as the item's age or condition, the pickup location or pickup times when relevant.",
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
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (listingRun.state.status === "running" || database.pending || busy)
      return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (!listingDraftReady(draft, editingItem)) {
      setToast("Check the listing details before saving.");
      return;
    }
    const item = listingFromDraft(
      draft,
      editingListing || draftId.current,
      editingItem,
    );
    if (editingItem && draft.pickup === editingItem.pickupBy)
      item.available = editingItem.available;
    const saved = await setOwn((current) =>
      editingListing
        ? current.map((existing) =>
            existing.id === editingListing ? item : existing,
          )
        : [item, ...current],
    );
    if (!saved) {
      setToast(
        "Could not save the listing. Your draft is still here; check the error above and try again.",
      );
      return;
    }
    if (batchQueue && !editingListing) {
      finishBatchItem("saved");
      return;
    }
    hasSellingDraft.current = false;
    setAccountTab("listings");
    navigate("account");
    setToast(
      account
        ? "Listing published to Takeover."
        : "Listing saved in this browser.",
    );
  }
  /** Load one sorted item into the single-listing flow and let the agent draft it. */
  function openBatchItem(next: ListingDraft) {
    listingRequest.current?.abort();
    cancelPhotoRead();
    resetListingConversation();
    listingRevisions.current = {};
    draftId.current = crypto.randomUUID();
    setEditingListing(null);
    setUploadError("");
    setPhotoSplit(null);
    setDraft(next);
    setSellStep(1);
    void generateDraft({ together: true, keepTitle: true });
  }
  function startBatchListings(drafts: ListingDraft[]) {
    if (!drafts.length) return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
    hasSellingDraft.current = true;
    setBatchQueue({ drafts, index: 0, results: [] });
    setBatchStart(undefined);
    setSellMode("single");
    openBatchItem(drafts[0]);
  }
  function finishBatchItem(result: "saved" | "skipped") {
    if (!batchQueue) return;
    const results = [...batchQueue.results, result];
    const index = batchQueue.index + 1;
    const total = batchQueue.drafts.length;
    const saved = results.filter((item) => item === "saved").length;
    const done = account ? "published" : "saved";
    if (index < total) {
      setBatchQueue({ ...batchQueue, index, results });
      openBatchItem(batchQueue.drafts[index]);
      setToast(
        result === "saved"
          ? `Listing ${index} of ${total} ${done}. Next: listing ${index + 1}.`
          : `Skipped listing ${index}. Next: listing ${index + 1} of ${total}.`,
      );
      return;
    }
    setBatchQueue(null);
    hasSellingDraft.current = false;
    setAccountTab("listings");
    navigate("account");
    setToast(
      saved
        ? `${saved} listing${saved === 1 ? "" : "s"} ${done}.`
        : "No listings saved.",
    );
  }
  /** Return the items not yet created to the sorting step. */
  function backToBatchSorting() {
    if (!batchQueue) return;
    listingRequest.current?.abort();
    resetListingConversation();
    const remaining = batchQueue.drafts.slice(batchQueue.index);
    const photos = remaining.flatMap((item) => listingPhotos(item));
    setBatchStart({
      photos,
      groups: [],
      items: remaining.map((item) => {
        const next = batchItem(listingPhotos(item), item.location);
        return { ...next, draft: { ...next.draft, title: item.title } };
      }),
    });
    setBatchQueue(null);
    setBusy(false);
    setSellMode("batch");
  }
  function editListing(item: Product) {
    if (account && !item.own) return;
    if (item.status === "withdrawn") return;
    hasSellingDraft.current = true;
    navigate("sell");
    resetListingConversation();
    listingRevisions.current = {};
    setBatchQueue(null);
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
    setSellMode("single");
    setUploadError("");
  }
  async function setStatus(id: string, status: Product["status"]) {
    const saved = await setOwn((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    if (!saved) {
      setToast("Could not save this status change. Please try again.");
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
  const listingTools = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" />}
        disabled={!configured || listingRun.state.status === "running"}
      >
        Agent tools <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="agent-tools-menu">
        {[
          [
            "Research this item",
            "Research comparable individual secondhand offers for this item.",
          ],
          [
            "Suggest a price",
            "Research comparable asking prices and suggest a price for this listing.",
          ],
          [
            "Check listing",
            "Check my listing for missing condition, dimensions and pickup details.",
          ],
          [
            "Improve description",
            "Improve my description using the photos and details I provided. Keep it concise and natural.",
          ],
        ].map(([label, request]) => (
          <DropdownMenuItem
            key={label}
            onClick={() => void runListing(request, undefined, true)}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const listingConversation = (
    <section className="listing-conversation" aria-label="Listing agent">
      <AgentConversation
        state={listingRun.state}
        footer={
          <AgentComposer
            value={listingInput}
            onChange={setListingInput}
            onSend={() => void runListing(listingInput)}
            label="Tell the listing agent"
            placeholder="Add a detail…"
            sendLabel="Send to listing agent"
            disabled={!configured || listingRun.state.status === "running"}
            onStop={
              listingRun.state.status === "running"
                ? listingRun.cancel
                : undefined
            }
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
            readOnly={archived}
            showHistory={false}
            state={turn}
            onCancel={() => {
              listingRunToken.current += 1;
              listingRun.cancel();
            }}
            onReset={resetListingConversation}
            onRetry={() => {
              const last = lastListingRequest.current;
              if (last) void runListing(last.text, last.question, true);
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
      {...availability?.cardProps(item)}
    />
  );

  const connectionStatus =
    account && !signedIn ? (
      <div className="agent-footnote">
        <Button type="button" onClick={() => navigate("settings")}>
          Sign in to use your agent
        </Button>
      </div>
    ) : quotaExhausted ? (
      <div className="agent-footnote" role="status">
        Daily AI allowance used. Resets{" "}
        {new Date(agentHealth!.quota!.resetAt).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        })}
        . Listings and messages remain available.
      </div>
    ) : !configured || healthError ? (
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
          <Button
            type="button"
            onClick={refreshHealth}
            disabled={healthChecking}
          >
            {healthChecking ? "Reconnecting…" : "Retry"}
          </Button>
        )}
        {configured && agentHealth?.webSearchConfigured === false && (
          <span>
            Web search is unavailable. Your local listings are still accessible.
          </span>
        )}
      </div>
    ) : agentHealth?.quota ? (
      <div
        className={`agent-footnote${agentHealth.quota.remaining > 5 ? " quota-available" : ""}`}
        role="status"
        aria-label={`${agentHealth.quota.remaining} of ${agentHealth.quota.limit} AI requests available today`}
      >
        <Badge
          variant={
            agentHealth.quota.remaining <= 5 ? "destructive" : "secondary"
          }
        >
          {agentHealth.quota.remaining} AI{" "}
          {agentHealth.quota.remaining === 1 ? "request" : "requests"} left
          today
        </Badge>
      </div>
    ) : null;

  return (
    <>
      {(!database.ready ||
        database.pending > 0 ||
        database.error ||
        favoriteError) && (
        <div className="database-status" role="status">
          {database.error ||
            favoriteError ||
            (database.pending
              ? "Saving listing changes…"
              : "Loading listings…")}
          {database.error && (
            <Button className="text-button" onClick={database.retry}>
              Retry
            </Button>
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
          <Button
            className={
              view === "discover" || view === "detail" || view === "compare"
                ? "active"
                : ""
            }
            onClick={openBrowse}
          >
            Find
          </Button>
          <Button
            className={view === "searches" ? "active" : ""}
            onClick={() => navigate("searches")}
          >
            Saved searches
            <span className="nav-count">{savedSearches.length}</span>
            {alerts.unread > 0 && (
              <span
                className="nav-count unread"
                aria-label={`${alerts.unread} new matches`}
              >
                {alerts.unread}
              </span>
            )}
          </Button>
          <Button
            className={view === "messages" ? "active" : ""}
            onClick={() => openMessages()}
          >
            Messages
          </Button>
          <Button
            className={view === "account" ? "active" : ""}
            onClick={() => {
              setAccountTab("listings");
              navigate("account");
            }}
          >
            My listings
          </Button>
        </nav>
        <div className="header-actions">
          <Button
            animateIcon
            className="button primary sell-nav"
            onClick={openSell}
          >
            <Plus size={17} />
            Sell furniture
          </Button>
          <Button
            className={`icon-button${view === "settings" ? " active" : ""}`}
            aria-current={view === "settings" ? "page" : undefined}
            aria-label={
              account
                ? signedIn
                  ? "Open account settings"
                  : "Sign in"
                : "Open workspace settings"
            }
            onClick={() => navigate("settings")}
          >
            <UserRound size={20} />
          </Button>
        </div>
      </header>
      <div
        className={
          "app-layout " +
          (isHome ? "home-layout" : "focused-layout") +
          (view === "discover" && !isHome ? " chat-layout" : "") +
          (view === "messages" ? " messages-layout" : "") +
          (view === "sell"
            ? sellMode === "batch"
              ? " selling-batch-layout"
              : sellStep === 2
                ? " selling-chat-layout"
                : " selling-photo-layout"
            : "")
        }
      >
        <main
          ref={mainContent}
          tabIndex={-1}
          className={"main-content view-" + view}
        >
          {view === "settings" &&
            (account?.session ? (
              <AccountSettings
                client={account.client}
                session={account.session}
                onProfileSaved={setPickupRegion}
              />
            ) : account ? (
              <div className="settings-auth-page">
                <Auth
                  client={account.client}
                  onDone={() => navigate("settings")}
                />
              </div>
            ) : (
              <section className="local-settings-page">
                <div className="page-title">
                  <h1>Workspace settings</h1>
                  <p>
                    Your listings and preferences are saved in this browser.
                  </p>
                </div>
                {connectionStatus}
                <Button
                  className="button secondary"
                  onClick={() => void database.addDemo()}
                >
                  Add sample listings
                </Button>
                <Button
                  className="text-button"
                  onClick={() => setModal("help")}
                >
                  How the agent works
                </Button>
                <Button
                  className="text-button"
                  onClick={() => setModal("clear")}
                >
                  Clear local workspace
                </Button>
              </section>
            ))}
          <WorkspacePage active={view === "messages"}>
            <MessagesPage
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
              onDeleted={() =>
                window.history.replaceState(null, "", "#messages")
              }
              threadBanner={availability?.threadBanner}
              listings={own}
              account={account}
              listing={own.find((item) => item.id === messageListingId)}
              onOpenListing={(id) => {
                const item = own.find((item) => item.id === id);
                if (item) openProduct(item);
              }}
            />
          </WorkspacePage>
          <WorkspacePage active={view === "discover"}>
            <>
              {searchIsHome ? (
                <section
                  className={`agent-hero search-entry${hasSearchDraft ? " has-query" : ""}`}
                  aria-labelledby="agent-title"
                >
                  <div className="agent-modes">
                    <span>Find something</span>
                    <Button onClick={startSell}>Sell from a photo</Button>
                  </div>
                  <HeroHeadline compact={false} />
                  <p>
                    Describe what you need or search with a photo. Your agent
                    searches around {location}.
                  </p>
                  <form
                    className="agent-search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runSearch(query);
                    }}
                    onDragOver={(event) => {
                      if (event.dataTransfer.types.includes("Files")) {
                        event.preventDefault();
                        event.currentTarget.classList.add("drag-over");
                      }
                    }}
                    onDragLeave={(event) =>
                      event.currentTarget.classList.remove("drag-over")
                    }
                    onDrop={(event) => {
                      event.currentTarget.classList.remove("drag-over");
                      const file = imageFrom(event.dataTransfer);
                      if (!file) return;
                      event.preventDefault();
                      void searchByPhoto(file);
                    }}
                  >
                    <Textarea
                      onPaste={(event) => {
                        const file = imageFrom(event.clipboardData);
                        if (!file) return;
                        event.preventDefault();
                        void searchByPhoto(file);
                      }}
                      aria-label="Search furniture"
                      maxLength={4000}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      rows={1}
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
                      <Button
                        type="button"
                        className="search-area"
                        onClick={() => {
                          setAreaDraft({ location, radius: criteria.radius });
                          setModal("location");
                        }}
                      >
                        {location}
                        <ChevronDown size={13} />
                      </Button>
                      <div className="search-submit-group">
                        <PhotoSearchButton
                          busy={photoSearchBusy}
                          disabled={running || !configured || quotaExhausted}
                          onFile={(file) => void searchByPhoto(file)}
                        />
                        <Button
                          animateIcon
                          className="button primary"
                          type="submit"
                          disabled={!query.trim() || running || quotaExhausted}
                        >
                          Find it
                        </Button>
                      </div>
                    </div>
                  </form>
                  {photoSearchError && (
                    <p className="form-error photo-search-error" role="alert">
                      {photoSearchError}
                    </p>
                  )}
                  {connectionStatus}
                  <AgentSuggestions
                    state={searchAssist}
                    onSelect={(suggestion) => {
                      setQuery(suggestion);
                      void runSearch(suggestion);
                    }}
                  />
                </section>
              ) : (
                <>
                  <WorkspaceHeader
                    title={reviewingListing ? "Listing review" : searchHeading}
                    backLabel="New search"
                    backIcon={<SquarePen size={20} aria-hidden="true" />}
                    onBack={goHome}
                    onAccount={() => navigate("settings")}
                    quota={agentHealth?.quota}
                    preferences={
                      !reviewingListing
                        ? {
                            summary: activePreferences,
                            compactSummary: compactPreferences,
                            onOpen: () => {
                              setFilterDraft(criteria);
                              setModal("filters");
                            },
                          }
                        : undefined
                    }
                    save={
                      !reviewingListing
                        ? {
                            disabled: running || !committedSearch,
                            onSave: () => {
                              setEditingJob(null);
                              setJobTitle(
                                (committedSearch?.originalRequest || "").slice(
                                  0,
                                  90,
                                ),
                              );
                              setModal("save");
                            },
                          }
                        : undefined
                    }
                  />
                  {!reviewingListing && photoSearchError && (
                    <p className="form-error photo-search-error" role="alert">
                      {photoSearchError}
                    </p>
                  )}
                  {!reviewingListing && activePhotoSearch && (
                    <div className="photo-search-source">
                      <img src={activePhotoSearch.image} alt="" />
                      <p>
                        Similar to your photo
                        <span>
                          Recognised as “{activePhotoSearch.item}”. Start a new
                          search to adjust it.
                        </span>
                      </p>
                    </div>
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
                      <>
                        {comparison.length > 0 && (
                          <div
                            className="chat-comparison"
                            role="group"
                            aria-label="Listing comparison"
                          >
                            <span role="status">
                              {comparison.length < 2
                                ? "Choose one more"
                                : `${comparison.length} selected`}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={comparison.length < 2}
                              onClick={openComparison}
                            >
                              Compare
                              {comparison.length > 1
                                ? ` ${comparison.length}`
                                : ""}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Clear comparison"
                              onClick={(event) => {
                                const messages = event.currentTarget
                                  .closest(".chat-workspace")
                                  ?.querySelector<HTMLElement>(
                                    '[aria-label="Conversation messages"]',
                                  );
                                setCompared([]);
                                messages?.focus({ preventScroll: true });
                              }}
                            >
                              <X size={16} aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                        <div className="composer-status">
                          {connectionStatus}
                        </div>
                        <AgentComposer
                          value={followUp}
                          onChange={setFollowUp}
                          onSend={() =>
                            void runSearch(followUp, criteria, true)
                          }
                          label="Ask the agent"
                          placeholder={
                            reviewingListing
                              ? "Ask about your listing…"
                              : "Ask a follow-up…"
                          }
                          sendLabel="Send to the agent"
                          disabled={running || quotaExhausted}
                          onStop={running ? agentRun.cancel : undefined}
                        />
                      </>
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
                          readOnly={archived}
                          outcome={
                            <>
                              {turn.proposal?.draft && (
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
                              )}
                              {!reviewingListing && turn.watchSuggestion && (
                                <WatchPrompt
                                  query={turn.watchSuggestion.query}
                                  maxPrice={turn.watchSuggestion.maxPrice}
                                  watching={isWatching(
                                    turn.watchSuggestion.query,
                                    turn.watchSuggestion.maxPrice,
                                  )}
                                  onWatch={() =>
                                    addWatch(
                                      turn.watchSuggestion!.query,
                                      turn.watchSuggestion!.maxPrice,
                                    )
                                  }
                                />
                              )}
                            </>
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
                              <AgentListings
                                listings={localMatches}
                                onOpen={openProduct}
                                onOffer={continueOffer}
                              />
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
                </>
              )}
              {searchIsHome && negotiations.error && (
                <p role="alert">{negotiations.error}</p>
              )}
              {searchIsHome &&
                negotiations.items
                  .filter((item) => item.status === "draft")
                  .map((proposal) => proposalSummary(proposal))}
              {searchIsHome && availability?.notices()}
              {searchIsHome &&
                matchAlerts(shownAlerts.filter((alert) => !alert.read))}
              {searchIsHome && visibleListings.length > 0 && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>
                        {searchIsHome
                          ? "Your local listings"
                          : "From your local listings"}
                      </h2>
                      <span>
                        {account
                          ? "Items shared on Takeover"
                          : "Personal browser listings & demo database"}
                      </span>
                    </div>
                    <Button
                      className="browse-filter"
                      onClick={() => {
                        setAccountTab("listings");
                        navigate("account");
                      }}
                    >
                      Manage listings
                    </Button>
                  </div>
                  <div className="product-grid">
                    {visibleListings.map((item) => productCard(item))}
                  </div>
                </>
              )}
              {searchIsHome && !visibleListings.length && (
                <div className="section-heading">
                  <div>
                    <h2>Something to sell?</h2>
                    <span>
                      Upload a photo. Your agent prepares the listing.
                    </span>
                  </div>
                  <Button className="button secondary" onClick={startSell}>
                    Create a listing
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
            </>
          </WorkspacePage>

          {view === "searches" && (
            <SavedSearchesPage
              searches={savedSearches}
              location={location}
              alerts={matchAlerts(shownAlerts, true)}
              onTogglePause={(job) =>
                setJobs((current) =>
                  current.map((item) =>
                    item.id === job.id
                      ? { ...item, paused: !item.paused }
                      : item,
                  ),
                )
              }
              onWatch={addWatch}
              onFind={goHome}
              onRun={(job) => {
                const search = restoreSearch(job, location);
                setSearchArea({
                  location: search.location,
                  radius: search.criteria.radius,
                });
                void performSearch(search);
              }}
              onEdit={(job) => {
                setEditingJob(job.id);
                setJobTitle(job.title);
                setFilterDraft(job.criteria);
                setModal("edit-search");
              }}
              onDelete={(job) => {
                setJobs((current) =>
                  current.filter((item) => item.id !== job.id),
                );
                setToastNotice({
                  message: "Saved search deleted.",
                  deletedSearch: {
                    job,
                    index: jobs.findIndex((item) => item.id === job.id),
                  },
                });
              }}
            />
          )}

          {view === "sell" && sellMode === "batch" && (
            <>
              <BatchSellFlow
                location={location}
                liveAgent={configured}
                start={batchStart}
                onBack={() => {
                  setBatchStart(undefined);
                  setSellMode("single");
                }}
                onStart={startBatchListings}
              />
              {connectionStatus}
            </>
          )}
          <WorkspacePage active={view === "sell" && sellMode === "single"}>
            <>
              <SellFlow
                draft={draft}
                step={sellStep}
                editing={!!editingListing}
                pickupMin={listingPickupMinimum(draft.pickup, editingItem)}
                busy={busy || database.pending > 0}
                cloud={!!account}
                photoReading={photoReading}
                uploadError={uploadError}
                liveAgent={configured}
                listingAssist={listingAssist}
                onBack={() => {
                  if (sellStep === 2 && !editingListing) {
                    resetListingConversation();
                    setSellStep(1);
                  } else if (editingListing) navigate("account");
                  else if (batchQueue) backToBatchSorting();
                  else openBrowse();
                }}
                onDraftChange={changeDraft}
                agentWorking={listingRun.state.status === "running"}
                insight={
                  <SellerInsight
                    price={
                      draft.price.trim() ? Number(draft.price) : Number.NaN
                    }
                    ladder={demandLadder(savedSearches, {
                      title: draft.title,
                      price: draft.price.trim()
                        ? Number(draft.price)
                        : Number.NaN,
                      condition: draft.condition,
                    })}
                    similar={similarListings(
                      visibleListings,
                      draft.title,
                      editingListing ?? undefined,
                    )}
                  />
                }
                agentConversation={listingConversation}
                agentTools={listingTools}
                quota={agentHealth?.quota}
                onAccount={() => navigate("settings")}
                onPhotoSelected={upload}
                onCreateDraft={() => void generateDraft()}
                onSuggestionSelected={addListingSuggestion}
                onPublish={publish}
                batch={
                  batchQueue && !editingListing
                    ? {
                        index: batchQueue.index,
                        covers: batchQueue.drafts.map((item) => item.image),
                        results: batchQueue.results,
                        onSkip: () => finishBatchItem("skipped"),
                      }
                    : undefined
                }
                onSellSeveral={
                  batchQueue
                    ? undefined
                    : () => {
                        cancelPhotoRead();
                        setUploadError("");
                        setBatchStart(undefined);
                        setSellMode("batch");
                      }
                }
              />
              {photoSplit && (
                <PhotoSplitQuestion
                  photos={photoSplit.photos}
                  groups={photoSplit.groups}
                  onClose={() => setPhotoSplit(null)}
                  onTogether={() => {
                    setPhotoSplit(null);
                    void generateDraft({ together: true });
                  }}
                  onSeparate={(groups, review) => {
                    if (!review) {
                      startBatchListings(
                        itemsFromGroups(
                          photoSplit.photos,
                          groups,
                          draft.location,
                        ).map((item) => item.draft),
                      );
                      return;
                    }
                    setBatchStart({
                      photos: photoSplit.photos,
                      groups,
                      review,
                    });
                    setPhotoSplit(null);
                    setSellMode("batch");
                  }}
                />
              )}
              {connectionStatus}
            </>
          </WorkspacePage>

          {view === "detail" &&
            !selected &&
            selectedId &&
            availability?.notices(selectedId)}
          {view === "detail" && (
            <ListingDetailPage
              selected={selected}
              availabilityPanel={
                selected &&
                availability?.detailPanel(selected, () =>
                  openMessages(selected.id),
                )
              }
              cloud={!!account}
              catalog={localListings}
              renderProduct={productCard}
              favorite={favorites.includes(selected?.id ?? "")}
              compared={compared.includes(selected?.id ?? "")}
              onToggleFavorite={() => selected && toggleFavorite(selected.id)}
              onToggleCompare={() => selected && toggleCompare(selected.id)}
              reportAction={
                account?.session && selected && !selected.own ? (
                  <Report client={account.client} listingId={selected.id} />
                ) : undefined
              }
              onBack={() =>
                account && !selected?.own ? openBrowse() : navigate("account")
              }
              onMessage={() => selected && openMessages(selected.id)}
              onEdit={() => selected && editListing(selected)}
              onAskAgent={() => {
                if (!selected) return;
                editListing(selected);
                void runListing(
                  "Review my supplied listing and help me improve it. Ask about missing facts; do not invent them.",
                );
              }}
            />
          )}

          {view === "compare" && (
            <ComparePage
              items={comparison}
              onBack={() => navigate(comparisonOrigin.current)}
              onOpen={openProduct}
              onRemove={toggleCompare}
            />
          )}

          <WorkspacePage active={view === "account"}>
            <AccountPage
              accountTab={accountTab}
              setAccountTab={(tab) => {
                setAccountTab(tab);
                window.history.pushState(
                  null,
                  "",
                  tab === "favorites"
                    ? "#saved"
                    : tab === "archive"
                      ? "#listings/archive"
                      : "#listings",
                );
              }}
              visibleListings={
                account
                  ? visibleListings.filter((item) => item.own)
                  : visibleListings
              }
              cloud={!!account}
              savedListings={savedListings}
              archivedListings={
                account
                  ? archivedListings.filter((item) => item.own)
                  : archivedListings
              }
              onSell={startSell}
              onBrowse={openBrowse}
              onOpen={openProduct}
              onEdit={editListing}
              onStatusChange={setStatus}
              renderProduct={productCard}
            />
          </WorkspacePage>
        </main>
      </div>

      <MobileNav
        badges={{ searches: alerts.unread }}
        active={
          view === "sell"
            ? "sell"
            : view === "messages"
              ? "messages"
              : view === "searches"
                ? "searches"
                : view === "settings"
                  ? null
                  : view === "account"
                    ? accountTab === "favorites"
                      ? "favorites"
                      : "account"
                    : "browse"
        }
        onNavigate={(destination) => {
          if (destination === "browse") openBrowse();
          else if (destination === "sell") openSell();
          else if (destination === "messages") openMessages();
          else if (destination === "searches") navigate("searches");
          else {
            setAccountTab(
              destination === "favorites" ? "favorites" : "listings",
            );
            navigate("account");
            if (destination === "favorites" && signedIn)
              window.history.replaceState(null, "", "#saved");
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
            <Button
              animateIcon
              className="button primary small"
              disabled={comparison.length < 2}
              title={
                comparison.length < 2
                  ? "Select one more listing to compare"
                  : undefined
              }
              onClick={openComparison}
            >
              Compare
              <ArrowRight size={14} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Clear comparison"
              onClick={() => setCompared([])}
            >
              <X size={16} />
            </Button>
          </div>
        )}
      {availability?.overlay}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          {toastNotice?.deletedSearch && (
            <Button
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
            </Button>
          )}
          <Button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </Button>
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
              <Button
                type="button"
                className="text-button"
                onClick={() => setFilterDraft({ ...defaults })}
              >
                Reset
              </Button>
              <Button animateIcon className="button primary" type="submit">
                Search with these preferences
              </Button>
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
              <Input
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
            <Button animateIcon className="button primary full" type="submit">
              <Bookmark size={16} />
              Save search
            </Button>
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
              <Input
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
              <Input
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
            <Button animateIcon className="button primary full" type="submit">
              Use this area
            </Button>
          </form>
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
              <Images size={20} />
              <p>
                <strong>Search by photo</strong>An inspiration photo, such as a
                Pinterest image, is sent to the AI service to describe the
                furniture. The search then uses that description, which you can
                edit.
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
            This removes your listings, favourites, saved searches and their
            alerts from this browser.
          </p>
          <div className="modal-actions">
            <Button className="button secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              animateIcon
              className="button primary"
              onClick={() => {
                setOwn([]);
                setFavorites([]);
                setJobs([]);
                alerts.clear();
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
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
