import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { historyPosition, readRoute, type View } from "./navigation";
import { formatPickup } from "../shared/pickupTime";
import type { AccountConnection } from "./cloud/AccountSession";
import { useMarketplaceListings } from "./cloud/useMarketplaceListings";
import { useFavorites } from "./cloud/useFavorites";
import { useAppViewport } from "./hooks/useAppViewport";
import { useWindowScrolled } from "./hooks/useWindowScrolled";
import AccountPage, {
  type AccountTab,
  type ListingPickup,
} from "./components/AccountPage";
import ListingDetailPage from "./components/ListingDetailPage";
import SavedSearchesPage from "./components/SavedSearchesPage";
import { listingPhotos, MAX_LISTING_PHOTOS } from "../shared/listingPhotos";
import { readListingPhoto } from "./listingPhotos";
import { randomUuid } from "./randomUuid";
import type { PhotoGroup } from "../shared/agent";
import WorkspacePage from "./components/WorkspacePage";
import WorkspaceHeader from "./components/WorkspaceHeader";
import type {
  MessagesInboxProps,
  ThreadRequest,
} from "./components/MessagesPage";
import PakoReadingSetting from "./components/PakoReadingSetting";
import {
  NamedOfferPriceContext,
  priceNamedInSearch,
} from "./components/namedOfferPrice";
import { useMessagesInbox } from "./hooks/useMessagesInbox";
import { useDealCheers } from "./hooks/useDealCheers";
import { useNegotiations } from "./hooks/useNegotiations";
import NegotiationSummary, {
  MessageDraftPreview,
} from "./components/NegotiationSummary";
import {
  dealTermsFromNegotiation,
  discardNegotiation,
  markNegotiationSent,
  type Negotiation,
} from "../shared/negotiation";
import { nearbyMeetingPoint } from "./dealOptions";
import {
  agreedWords,
  awayPhase,
  dealView,
  pickupCountdown,
  reservedForChip,
} from "./dealWords";
import { effectiveStatus, pickupHomeDeals } from "./inboxActivity";
import { listingPickupChoices } from "./pickupOptions";
import { useListingPickup } from "./hooks/useListingPickup";
import { usePickupReminders } from "./hooks/usePickupReminders";
import type { DealStatusChange } from "./components/ThreadDeal";
import {
  accountInboxDeals,
  buyerDealFor,
  demoInboxDeals,
  reservedForMe,
  sellerAgreementFor,
  type InboxDeal,
} from "./inboxDeals";
import { pickupDay, type Deal } from "../shared/deal";
import HomeDeals from "./components/HomeDeals";
import { draftMessage, nudgeMessage } from "../shared/dealMessages";
import { resetMessageWorkspace } from "./api/messages";
import AgentConversation, {
  focusConversation,
} from "./components/AgentConversation";
import AgentListings, {
  canOffer,
  type ResultOrder,
} from "./components/AgentListings";
import AgentComposer from "./components/AgentComposer";
import AgentQuickReplies from "./components/AgentQuickReplies";
import { quickReplies, type TappableReply } from "./quickReplies";
import {
  listingDraftReady,
  listingFromDraft,
  prepareListingDraft,
} from "./listingPreparation";
import {
  useEffect,
  useEffectEvent,
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
  ChevronDown,
  CircleHelp,
  MapPin,
  Plus,
  Search,
  SquarePen,
  UserRound,
  X,
} from "@/components/icons";
import MobileNav, { type MobileDestination } from "./MobileNav";
import HeaderNav, { headerDestination } from "./components/HeaderNav";
import CompareTray from "./components/CompareTray";
import Toast, { type ToastAction } from "./components/Toast";
import DatabaseStatus from "./components/DatabaseStatus";
import Modal from "./components/Modal";
import ProductCard from "./components/ProductCard";
import ProductGrid from "./components/ProductGrid";
import SearchPreferencesFields from "./components/SearchPreferencesFields";
import type { BatchProgress, ListingDraft } from "./components/SellFlow";
import { listingSaveWords, saveActionLabel } from "./listingSaveWords";
import AskPakoMenu, { LISTING_REQUESTS } from "./components/AskPakoMenu";
import { useDeveloperMode } from "./availability/useDeveloperMode";
import {
  photoSearchFailure,
  photoSearchClarification,
  type PhotoSearchNotice,
} from "./photoSearchFeedback";
import PhotoSearchButton, { imageFrom } from "./components/PhotoSearchButton";
import type { BatchStart } from "./components/BatchSellFlow";
import { batchItem, itemsFromGroups } from "./batchListings";
import { batchStepNote } from "./sellingCelebration";
import AgentSuggestions from "./components/AgentSuggestions";
import AgentRunPanel from "./components/AgentRunPanel";
import { useAgentRun, type AgentRunState } from "./hooks/useAgentRun";
import { useAgentAssist } from "./hooks/useAgentAssist";
import { useListingAnalysis } from "./hooks/useListingAnalysis";
import type { PakoAbsence } from "./sellGuide";
import { useListingConversation } from "./hooks/useListingConversation";
import { useSaved } from "./hooks/useSaved";
import { isListingStatuses } from "./hooks/savedState";
import { useSessionIds } from "./hooks/useSessionIds";
import { useWatches } from "./alerts/useWatches";
import type { WatchTarget } from "./alerts/watch";
import { demandLadder, similarListings } from "./alerts/matching";
import SellerInsight from "./alerts/SellerInsight";
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
import { pendingPrice } from "./listingQuestions";
import {
  applyPreferenceAction,
  undoPreferenceAction,
  type PreferenceChanges,
} from "./agentActions";
import type { AgentPreferencesPatchEvent } from "../shared/actions";
import { useAgentHealth } from "./hooks/useAgentHealth";
import { useNoticeableWait } from "./hooks/useNoticeableWait";
import { useFocused } from "./hooks/useFocused";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import {
  homeDealNews,
  homeGuide,
  turnAnnouncement,
} from "./pakoMoods";
import { useAvailability } from "./availability/useAvailability";
import {
  TODAY,
  defaults,
  criteriaTitle,
  isMine,
  money,
  shortDate,
  type Criteria,
  type Product,
} from "../shared/marketplace";
import { transitionPage, type PageDirection } from "./pageTransition";
import {
  PageTransition,
  PageTransitionShared,
  PageTransitionView,
} from "./components/animate-ui/components/page-transition";
import type { OnboardingOutcome } from "./components/onboarding/Onboarding";
import OnboardingInvite from "./components/onboarding/OnboardingInvite";
import Pako from "./components/onboarding/Pako";
import PakoReaction from "./components/PakoReaction";
import type { PakoMood } from "./components/onboarding/storyTypes";
import {
  firstVisitModeHere,
  readOnboarding,
  rememberOnboarding,
  type OnboardingMode,
} from "./components/onboarding/onboardingStorage";
import { introFocusTarget } from "./components/onboarding/introFocus";
import { placeName } from "./components/onboarding/onboardingContent";
import AdminEntry from "./components/admin/AdminEntry";
import { useAdmin } from "./api/admin";
import {
  AccountSettings,
  AdminArea,
  Auth,
  BatchSellFlow,
  ComparePage,
  DeveloperSettings,
  ListingConversation,
  LocalSettings,
  MessagesPage,
  LIKELY_NEXT,
  Onboarding,
  SellFlow,
} from "./screens";
import Report from "./cloud/Report";
import LazyBoundary from "./components/LazyBoundary";
import { useIntentPrefetch } from "./hooks/useIntentPrefetch";
import "./cloud/account.css";

type Destination = MobileDestination | "settings";
/** Order of the mobile bar, left to right: tabs, then Sell beside them, then settings. */
const DESTINATION_ORDER: Destination[] = [
  "browse",
  "searches",
  "favorites",
  "messages",
  "account",
  "sell",
  "settings",
];

type Dialog =
  "filters" | "save" | "edit-search" | "location" | "help" | "clear" | null;
/** The search pill's short name for an area: "EPFL" for "EPFL, Ecublens", "Vortex" for an FMEL residence. */
function shortPlace(location: string) {
  return location.split(",")[0].replace(/^FMEL\s+/, "").trim();
}

/** Results wait while Pako works and are ranked once his turn has finished. */
function resultOrder(status: AgentRunState["status"]): ResultOrder {
  if (status === "running") return "pending";
  return status === "complete" ? "ranked" : "unranked";
}

/** A blank listing, picked up where the student lives or searches. */
function newDraft(location: string): ListingDraft {
  return {
    image: "",
    images: [],
    raw: "",
    title: "",
    description: "",
    price: "",
    condition: "",
    dimensions: "",
    location,
    pickup: "",
    category: "All",
  };
}
/** What changing a listing's status tells the seller. */
const STATUS_NOTICES: Record<Product["status"], string> = {
  active: "Listing is available again.",
  reserved: "Marked as reserved.",
  sold: "Marked as sold.",
  withdrawn: "Listing archived. You can restore it from Archive.",
};
/** What a failed status change tells the seller, naming the change that did not save. */
const STATUS_FAILURES: Record<Product["status"], string> = {
  active: "Couldn't make the listing available.",
  reserved: "Couldn't mark the listing as reserved.",
  sold: "Couldn't mark the listing as sold.",
  withdrawn: "Couldn't archive the listing.",
};
const statusFailure = (status: Product["status"]) =>
  `${STATUS_FAILURES[status]} Check your browser storage and try again.`;

export default function App({
  account,
  onboardingPaused,
  introOutcome,
}: {
  account?: AccountConnection;
  /** Holds the intro back while another first-visit dialog is open. */
  onboardingPaused: boolean;
  /** How the intro shown before the marketplace loaded ended; the marketplace opens what it chose. */
  introOutcome?: OnboardingOutcome;
}) {
  useAppViewport();
  const pageScrolled = useWindowScrolled();
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
  const searchRunToken = useRef(0);
  const committedSearchRef = useRef<SearchSnapshot | null>(null);
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
  const messages = useMessagesInbox({
    account,
    open: view === "messages",
    aiConfigured: agentHealth?.configured,
  });
  /** A thread's note on Pako's reading led to Settings, which then open where that choice is. */
  const [readingSettingsRequested, setReadingSettingsRequested] =
    useState(false);
  useEffect(() => {
    if (view !== "settings") setReadingSettingsRequested(false);
  }, [view]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const searchField = useRef<HTMLTextAreaElement>(null);
  const searchFocused = useFocused(searchField);
  /** "New search" leads to home ready to type: the search box takes focus once it is there. */
  const focusSearchOnHome = useRef(false);
  const helpButton = useRef<HTMLButtonElement>(null);
  const [followUp, setFollowUp] = useState("");

  /** A search asked for in the step that also moved the search area; it runs once the area is in state. */
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [onboardingRecord] = useState(readOnboarding);
  const [onboarding, setOnboarding] = useState<OnboardingMode>(() =>
    introOutcome ? "closed" : firstVisitModeHere(onboardingRecord),
  );
  const [searchArea, setSearchArea] = useSaved(
    "takeover-search-area",
    { location: onboardingRecord?.location ?? "EPFL, Ecublens", radius: 5 },
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
  /** Changes on each "Draft an offer" tap, so its thread opens the offer card again. */
  const [offerRequest, setOfferRequest] = useState<number>();
  /** A conversation to open by itself, such as a seller's deal from Home. */
  const [threadRequest, setThreadRequest] = useState<ThreadRequest>();
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
  /** What demo deals reserved or made available again, as it was before; clearing the workspace puts it back. */
  const [dealStatusBefore, setDealStatusBefore] = useSaved<
    Record<string, Product["status"]>
  >("takeover-deal-original-status", {}, isListingStatuses);
  /** Listings show once they have loaded, or once loading failed and the status says why. */
  const listingsSettled = database.ready || database.error !== "";
  const slowListings = useNoticeableWait(
    !database.ready || database.pending > 0,
  );
  const { developerMode, setDeveloperMode } = useDeveloperMode();
  const admin = useAdmin({ account, developerMode });
  const adminEntry = admin.isAdmin ? (
    <AdminEntry onOpen={() => navigate("admin")} />
  ) : undefined;
  // `?availability=reserve` prototype; null (main behaviour) when the flag is off.
  const availability = useAvailability({
    localDemo: !account,
    developerMode,
    listings: own,
    ready: database.ready,
    setStatus,
    setToast,
    onFindSimilar: (title) => void runSearch(title),
  });
  const [compared, setCompared] = useSessionIds("takeover-compare");
  useIntentPrefetch(
    {
      sell: () =>
        Promise.all([SellFlow.prefetch(), ListingConversation.prefetch()]),
      messages: MessagesPage.prefetch,
      compare: ComparePage.prefetch,
      settings: () =>
        Promise.all([
          account?.session
            ? AccountSettings.prefetch()
            : account
              ? Auth.prefetch()
              : LocalSettings.prefetch(),
          DeveloperSettings.prefetch(),
        ]),
      admin: AdminArea.prefetch,
      intro: Onboarding.prefetch,
    },
    [
      ...(LIKELY_NEXT[view] ?? []),
      ...(compared.length >= 2 ? (["compare"] as const) : []),
      ...(onboarding === "invite" ? (["intro"] as const) : []),
    ],
  );
  const comparisonOrigin = useRef<View>("discover");
  /** Where the open listing was reached from; a listing opened by link leads back to Browse. */
  const [detailOrigin, setDetailOrigin] = useState<View>("discover");
  const [selectedId, setSelectedId] = useState<string | null>(
    readRoute(window.location.hash).view === "detail"
      ? (readRoute(window.location.hash).listingId ?? null)
      : null,
  );
  const [messageProposal, setMessageProposal] = useState<
    Negotiation | undefined
  >();
  /** A message the app prepared for a buyer's thread without an offer, such as a follow-up. */
  const [messageDraft, setMessageDraft] = useState<string>();
  const [jobTitle, setJobTitle] = useState("");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const draftId = useRef(randomUuid());
  const draftRef = useRef<ListingDraft>(newDraft(searchArea.location));
  const [draft, setDraftState] = useState<ListingDraft>(draftRef.current);
  function setDraft(value: SetStateAction<ListingDraft>) {
    const next = typeof value === "function" ? value(draftRef.current) : value;
    draftRef.current = next;
    setDraftState(next);
  }
  const listing = useListingConversation({ draftRef, setDraft });
  const [sellStep, setSellStep] = useState(1);
  /** The student fills in the listing's details themselves, without Pako. */
  const [manualListing, setManualListing] = useState(false);
  const [sellMode, setSellMode] = useState<"single" | "batch">("single");
  const [batchStart, setBatchStart] = useState<BatchStart | undefined>();
  // Several sorted items, created one after another with the listing agent.
  const [batchQueue, setBatchQueue] = useState<{
    drafts: ListingDraft[];
    index: number;
    results: ("saved" | "skipped")[];
    /** The listings this batch has saved so far, celebrated together at the end. */
    savedIds: string[];
    /** Pako's line about the listing just finished, which the batch tray shows. */
    note?: string;
  } | null>(null);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  /** Listings that were just published; My listings celebrates them briefly. */
  const [publishedListings, setPublishedListings] = useState<string[]>([]);
  const hasSellingDraft = useRef(view === "sell");
  const [photoReading, setPhotoReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    message: string;
    /** How Pako brings the note; he stands calmly unless the news is a small joy. */
    mood?: PakoMood;
    /** A way to act on the news, such as undoing it; the note then stays longer. */
    action?: ToastAction;
    /** The favourite this note confirms; removing it again takes the note back. */
    savedFavorite?: string;
  } | null>(null);
  const toast = toastNotice?.message || "";
  function setToast(message: string) {
    setToastNotice(message ? { message } : null);
  }
  /** Puts a deleted saved search back where it was. */
  function restoreSavedSearch(job: SavedSearch, index: number) {
    setJobs((current) => {
      if (current.some((item) => item.id === job.id)) return current;
      const at = Math.max(0, Math.min(index, current.length));
      return [...current.slice(0, at), job, ...current.slice(at)];
    });
    setToast("Saved search restored.");
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
  const watches = useWatches({
    jobs,
    setJobs,
    watched: savedSearches,
    listings: visibleListings,
    ready: database.ready,
    location,
  });
  const savedListings = visibleListings.filter((item) =>
    favorites.includes(item.id),
  );
  const selected = localListings.find((item) => item.id === selectedId);
  /** The student's deals in the inbox of the mode the app runs in, each from their side. */
  const accountRows = messages.accountInbox.rows;
  const inboxDeals = account
    ? account.session && accountRows
      ? accountInboxDeals(accountRows, account.session.user.id)
      : []
    : demoInboxDeals(messages.demoInbox.conversations);
  const inboxDealByThread = new Map(
    inboxDeals.map((item) => [item.deal.conversationId, item]),
  );
  function inboxDealOf(deal: Deal): InboxDeal {
    const item = inboxDealByThread.get(deal.conversationId);
    if (!item) throw new Error(`Deal ${deal.conversationId} is not in the inbox.`);
    return item;
  }
  // An agreement that arrives while the student is elsewhere in the app gets Pako's cheer.
  useDealCheers({
    inbox: account ? (account.session?.user.id ?? "") : "local",
    deals: inboxDeals,
    loaded:
      database.ready &&
      (account ? accountRows !== null : messages.demoInbox.loaded),
    elsewhere: view !== "messages",
    onCheer: cheerAgreement,
  });
  usePickupReminders({
    deals: inboxDeals,
    loaded:
      database.ready &&
      (account ? accountRows !== null : messages.demoInbox.loaded),
    elsewhere: view !== "messages",
    now: messages.now,
    onRemind: remindPickup,
  });
  const sendListingPickup = useListingPickup(account?.client, () => {
    database.retry();
    void messages.accountInbox.refresh();
  });
  /** Mark sold and Make active on a listing with a booked pickup send its pickup actions. */
  function listingPickup(item: InboxDeal): ListingPickup | undefined {
    const listing = own.find((entry) => entry.id === item.listingId);
    const day = pickupDay(item.deal, "seller", messages.now);
    if (!listing || !day) return undefined;
    const other = item.otherName;
    return {
      other,
      ...listingPickupChoices({ day, deal: item.deal, other, title: listing.title }),
      onSend: (send) => sendListingPickup(item, send),
    };
  }
  /** A listing as students see it: an agreed deal reserves it while its own status catches up. */
  const shownListing = (item: Product): Product => ({
    ...item,
    status: effectiveStatus(item, messages.deals),
  });
  const myReservations = reservedForMe(inboxDeals);
  const selectedDeal = selected && buyerDealFor(inboxDeals, selected.id);
  const selectedDealView =
    selected && selectedDeal
      ? dealView({
          deal: selectedDeal.deal,
          role: "buyer",
          other: selectedDeal.otherName,
          listing: shownListing(selected),
          now: new Date(),
        })
      : null;
  /** Home's live deals: a pickup within 2 h first, then what waits for the student. */
  const homeDealItems = pickupHomeDeals(
    inboxDeals.map((item) => item.deal),
    (deal) => inboxDealOf(deal).role,
    messages.now,
  ).flatMap((deal) => {
    const item = inboxDealOf(deal);
    const listing = own.find((entry) => entry.id === item.listingId);
    if (!listing) return [];
    const away = {
      deal,
      role: item.role,
      listing: shownListing(listing),
      latest: item.latest,
      now: messages.now,
    };
    const view = dealView({ ...away, other: item.otherName });
    return view
      ? [{ item, listing, view, waited: awayPhase(away) === "no_answer" }]
      : [];
  });
  const [firstHomeDeal] = homeDealItems;
  /** In the order they were picked, so Pako's best match leads when he compares the top two. */
  const comparison = compared.flatMap((id) =>
    visibleListings.filter((item) => item.id === id),
  );
  const searchIsHome = !searching;
  const isHome = view === "discover" && searchIsHome;
  /** Home shows its listings, or that there are none, once they are known. */
  const showHomeListings = searchIsHome && listingsSettled;
  /** Pages whose composer or main action rests at the bottom of the screen. */
  const bottomDocked =
    (view === "discover" && !isHome) || view === "messages" || view === "sell";
  const mainContent = useRef<HTMLElement>(null);
  const pageKey =
    view === "discover"
      ? isHome
        ? "home"
        : "search"
      : view === "account"
        ? `account-${accountTab}`
        : view === "sell"
          ? sellMode === "batch"
            ? "sell-batch"
            : `sell-${sellStep}`
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
    if (changed && pageKey === "home" && focusSearchOnHome.current) {
      focusSearchOnHome.current = false;
      searchField.current?.focus({ preventScroll: true });
    } else if (changed && document.activeElement === document.body)
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
  /** The search area as Pako names it while he searches. */
  const searchPlace = committedSearch
    ? placeName(committedSearch.location)
    : undefined;
  const budgetLabel =
    resultCriteria.maxPrice >= 1_000_000
      ? "Any budget"
      : resultCriteria.maxPrice === 0
        ? "Free only"
        : "Up to " + money(resultCriteria.maxPrice);
  const sourceLabel =
    resultCriteria.source === "All"
      ? "All sources"
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
            ? "takeover only"
            : sourceLabel,
        ].join(" · ")
      : "";
  const running = agentRun.state.status === "running";
  /** Pako asked something and waits; the composer can answer it too. */
  const awaitingAnswer =
    !running &&
    agentRun.state.questions.some((item) => !agentRun.state.answers[item.id]);
  // The inspiration photo stays attached to the search it started.
  const [photoSearch, setPhotoSearch] = useState<{
    image: string;
    request: string;
  } | null>(null);
  const [photoSearchBusy, setPhotoSearchBusy] = useState(false);
  /** A photo is dragged over the home search. */
  const [photoDragging, setPhotoDragging] = useState(false);
  /** The photo search button has keyboard focus, so Pako explains it. */
  const [photoHint, setPhotoHint] = useState(false);
  const [photoSearchNotice, setPhotoSearchNotice] =
    useState<PhotoSearchNotice | null>(null);
  const photoSearchRequest = useRef<AbortController | null>(null);
  const activePhotoSearch =
    photoSearch && committedSearch?.originalRequest === photoSearch.request
      ? photoSearch
      : null;
  const hasSearchDraft = query.trim().length > 0;
  const searchHeading = "Search with Pako";
  /** The page on screen as the browser tab names it; home keeps the app's own title. */
  function pageName(): string | null {
    switch (view) {
      case "discover":
        if (isHome) return null;
        return reviewingListing ? "Listing review" : searchHeading;
      case "searches":
        return "Saved searches";
      case "account":
        return accountTab === "favorites" ? "Saved items" : "My listings";
      case "messages":
        return "Messages";
      case "sell":
        if (sellMode === "batch") return "Sell several items";
        return sellStep === 1 ? "New listing" : "Your listing";
      case "detail":
        return selected?.title ?? "Listing unavailable";
      case "compare":
        return "Compare listings";
      case "settings":
        if (!account) return "Browser settings";
        return signedIn ? "Account settings" : "Sign in";
      case "admin":
        return "Admin";
    }
  }
  useDocumentTitle(pageName());
  const quotaExhausted = agentHealth?.quota?.remaining === 0;
  const quotaResets = agentHealth?.quota
    ? formatPickup(agentHealth.quota.resetAt)
    : "";
  /** Why quick replies that ask Pako are paused; the footer under them says when they reset. */
  const allowancePause = quotaExhausted
    ? "I've used today's requests."
    : undefined;
  const configured =
    agentHealth?.configured === true && signedIn && !quotaExhausted;
  /** Why Pako cannot help with selling right now; nothing while that is still being checked. */
  const pakoAbsence: PakoAbsence | undefined = quotaExhausted
    ? "allowance"
    : healthError || agentHealth?.configured === false
      ? "offline"
      : undefined;
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
  const heroGuide = homeGuide({
    allowanceUsed: quotaExhausted,
    photo: photoDragging
      ? "dragging"
      : photoSearchBusy
        ? "reading"
        : (photoSearchNotice ?? (photoHint ? "hint" : null)),
    deal:
      firstHomeDeal &&
      homeDealNews({
        deal: firstHomeDeal.item.deal,
        role: firstHomeDeal.item.role,
        other: firstHomeDeal.item.otherName,
        title: firstHomeDeal.listing.title,
        now: messages.now,
      }),
    unreadMatches: watches.unread,
    suggestionsLoading: searchAssist.status === "loading",
    typing: searchFocused || hasSearchDraft,
    location,
  });
  const listingAnalysis = useListingAnalysis({
    photos: listingPhotos(draft),
    note: draft.raw,
    location: draft.location,
    active:
      view === "sell" &&
      sellMode === "single" &&
      sellStep === 1 &&
      !editingListing &&
      !busy,
    available: configured,
  });

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
      toastNotice.action ? 10000 : 5000,
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
  /** Where the page on screen sits in this tab's history. */
  const historyPlace = useRef(historyPosition(window.history.state));
  /** Adds a history entry one step after the current one. */
  function pushRoute(url: string) {
    historyPlace.current += 1;
    window.history.pushState({ position: historyPlace.current }, "", url);
  }
  /** Changes the current history entry's address; its place stays. */
  function replaceRoute(url: string) {
    window.history.replaceState(window.history.state, "", url);
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
      // A listing opened from the chat is a side trip: the agent keeps working
      // and the conversation is still there on the way back.
      const sideTrip = [view, next].every(
        (page) => page === "discover" || page === "detail",
      );
      if (!sideTrip) {
        searchRunToken.current += 1;
        agentRun.cancel();
      }
      listing.cancel();
      listingRequest.current?.abort();
      photoSearchRequest.current?.abort();
      photoSearchRequest.current = null;
      setPhotoSearchBusy(false);
      cancelPhotoRead();
      setBusy(false);
      // A note belongs to the page it was raised on.
      setToastNotice(null);
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
        pushRoute(window.location.pathname + window.location.search + hash);
    }
    setModal(null);
  }
  /** Shows the page Back or Forward led to, moving the way the step went. */
  const showHistoryEntry = useEffectEvent((direction: PageDirection) => {
    const route = readRoute(window.location.hash);
    transitionPage(direction, () => {
      setAccountTab(route.accountTab);
      setMessageListingId(
        route.view === "messages" ? route.listingId : undefined,
      );
      if (route.view === "detail") setSelectedId(route.listingId ?? null);
      navigate(route.view, true);
    });
  });
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const position = historyPosition(event.state);
      const direction =
        position < historyPlace.current ? "nav-back" : "nav-forward";
      historyPlace.current = position;
      // React renders a transition that starts during popstate at once, without
      // its page transition. Started just after the event, Back and Forward
      // move the page together with the tab highlight, like a tap does.
      setTimeout(() => showHistoryEntry(direction), 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
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
      setMessageDraft(undefined);
      setMessageListingId(listingId);
    }
    navigate("messages");
    if (listingId) replaceRoute(`#messages/${encodeURIComponent(listingId)}`);
  }
  /** "Draft an offer": the listing's thread opens with the offer card, nothing sent yet. */
  function openOfferCard(item: Product) {
    openMessages(item.id);
    setOfferRequest(Date.now());
  }
  /**
   * Opens the conversation a deal is in, a buyer's by its listing and a
   * seller's by itself, with a message prepared in its composer if given.
   */
  function openDealThread(item: InboxDeal, draft?: string) {
    if (item.role === "buyer") {
      openMessages(item.listingId);
      setMessageDraft(draft);
      return;
    }
    setThreadRequest({ id: item.threadId, draft });
    navigate("messages");
  }
  /** The other student confirmed while this one was elsewhere in the app: Pako cheers, with a way to the chat. */
  function cheerAgreement(item: InboxDeal) {
    const listing = own.find((entry) => entry.id === item.listingId);
    // A deal whose listing is gone has no reservation left to cheer about.
    if (!listing) return;
    const { cheer, meaning } = agreedWords(
      item.role,
      item.otherName,
      listing.title,
    );
    setToastNotice({
      message: `${cheer} ${meaning}`,
      mood: "cheer",
      action: {
        label: "Open conversation",
        description: `Open the conversation about ${listing.title}`,
        onClick: () => openDealThread(item),
      },
    });
  }
  /** 2 h before a booked pickup: Pako reminds the student once, with a way to the chat. */
  function remindPickup(item: InboxDeal) {
    const listing = own.find((entry) => entry.id === item.listingId);
    const day = pickupDay(item.deal, item.role, messages.now);
    if (!listing || !day) return;
    setToastNotice({
      message: `${pickupCountdown(day)}: the ${listing.title} with ${item.otherName}.`,
      mood: "wave",
      action: {
        label: "Open conversation",
        description: `Open the conversation about ${listing.title}`,
        onClick: () => openDealThread(item),
      },
    });
  }
  function goHome() {
    scrollPositions.current.delete("home");
    navigate("discover");
    agentRun.reset();
    setPhotoSearch(null);
    setPhotoSearchNotice(null);
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
    startSellAt(pickupRegion || location);
  }
  function startSellAt(pickupLocation: string) {
    draftId.current = randomUuid();
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (view === "sell") return;
    hasSellingDraft.current = true;
    navigate("sell");
    listing.resetForNewDraft();
    setDraft(newDraft(pickupLocation));
    setSellStep(1);
    setManualListing(false);
    setSellMode("single");
    setBatchStart(undefined);
    setBatchQueue(null);
    setEditingListing(null);
    setUploadError("");
  }
  /** Applies the visitor's intro answers and opens what they chose to do first. */
  function completeOnboarding(outcome: OnboardingOutcome) {
    const area = "location" in outcome ? outcome.location : undefined;
    rememberOnboarding(area ? { location: area } : {});
    if (area) setSearchArea((current) => ({ ...current, location: area }));
    if (outcome.next === "sign-in") navigate("settings");
    else if (outcome.next === "sell") startSellAt(outcome.location);
    else if (outcome.next === "search") {
      // The intro also opens from the header on other pages; the query belongs on home.
      goHome();
      setQuery(outcome.query);
      setPendingSearch(outcome.query);
    }
  }
  const applyIntroOutcome = useEffectEvent(completeOnboarding);
  const introApplied = useRef(false);
  useEffect(() => {
    if (!introOutcome || introApplied.current) return;
    introApplied.current = true;
    applyIntroOutcome(introOutcome);
  }, [introOutcome]);
  function introFocus(outcome: OnboardingOutcome) {
    return introFocusTarget(outcome, helpButton.current, mainContent.current);
  }
  /** Clears the chat and leaves the search box ready for the next request. */
  function startNewSearch() {
    focusSearchOnHome.current = true;
    transitionPage("nav-back", goHome, "fade");
  }
  function declineOnboarding() {
    rememberOnboarding({});
    setOnboarding("closed");
  }
  const currentDestination: Destination =
    view === "sell"
      ? "sell"
      : view === "messages"
        ? "messages"
        : view === "searches"
          ? "searches"
          : view === "settings" || view === "admin"
            ? "settings"
            : view === "account"
              ? accountTab === "favorites"
                ? "favorites"
                : "account"
              : "browse";
  /** Tabs to the right push in from the right; tabs to the left from the left. */
  function openDestination(destination: Destination) {
    const direction =
      DESTINATION_ORDER.indexOf(destination) >=
      DESTINATION_ORDER.indexOf(currentDestination)
        ? "nav-forward"
        : "nav-back";
    transitionPage(direction, () => {
      if (destination === "browse") openBrowse();
      else if (destination === "sell") openSell();
      else if (destination === "messages") openMessages();
      else if (destination === "searches") navigate("searches");
      else if (destination === "settings") navigate("settings");
      else {
        setAccountTab(destination === "favorites" ? "favorites" : "listings");
        navigate("account");
        if (destination === "favorites" && signedIn) replaceRoute("#saved");
      }
    });
  }
  function openSell() {
    if (hasSellingDraft.current) navigate("sell");
    else startSell();
  }
  /** Entering the chat crossfades the page while the search box becomes the composer. */
  function startSearchFromHome(text: string) {
    transitionPage("nav-forward", () => void runSearch(text), "fade");
  }
  useEffect(() => {
    if (pendingSearch === null) return;
    setPendingSearch(null);
    void runSearch(pendingSearch);
  }, [pendingSearch]);
  function openBrowse() {
    navigate("discover");
  }
  function openProduct(item: Product) {
    if (item.status === "withdrawn") return;
    transitionPage("nav-forward", () => {
      // Similar items opened from a listing keep leading back to where you started.
      if (view !== "detail") setDetailOrigin(view);
      setSelectedId(item.id);
      navigate("detail");
    });
    replaceRoute(`#listing/${encodeURIComponent(item.id)}`);
  }
  async function toggleFavorite(id: string) {
    if (!signedIn) {
      navigate("settings");
      return;
    }
    const adding = !favorites.includes(id);
    const stored = await setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    if (!stored) return;
    if (adding)
      setToastNotice({
        message: "Added to your saved items.",
        mood: "love",
        savedFavorite: id,
        action: {
          label: "View",
          description: "View your saved items",
          onClick: () => openDestination("favorites"),
        },
      });
    else
      setToastNotice((notice) =>
        notice?.savedFavorite === id ? null : notice,
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
    }
  }
  function undoSearchPatch(id: string) {
    const current = committedSearchRef.current;
    const changes = searchChangesRef.current[id];
    if (!current || !changes) return;
    storeSearch(undoPreferenceAction(current, changes));
    setSearchUndone((value) => [...value, id]);
    setSearchNotices((value) => ({
      ...value,
      [id]: "Search again to refresh the results.",
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
    listing.cancel();
    listingRequest.current?.abort();
    cancelPhotoRead();
    setView("discover");
    if (window.location.hash)
      pushRoute(window.location.pathname + window.location.search);
    setModal(null);
    setSearching(true);
    if (!preserveHistory) setQuery(search.originalRequest);
    setFollowUp((current) =>
      !preserveHistory || current.trim() === search.text.trim() ? "" : current,
    );
    storeSearch(search);

    const currentProposal =
      proposal ?? (preserveHistory ? negotiations.current() : undefined);
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
        if (token !== searchRunToken.current) return;
        negotiations.commit(event);
        if (event.negotiation.status === "discarded")
          forgetMessageDraft(event.negotiation.listingId);
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
    photoSearchRequest.current?.abort();
    setPhotoSearchBusy(false);
    setPhotoSearchNotice(null);
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
  /** Identify an item in an inspiration photo, then search for that description. */
  async function searchByPhoto(file: File) {
    if (running || photoSearchBusy) return;
    photoSearchRequest.current?.abort();
    const controller = new AbortController();
    photoSearchRequest.current = controller;
    setPhotoSearchBusy(true);
    setPhotoSearchNotice(null);
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
        setPhotoSearchNotice(photoSearchClarification());
        searchField.current?.focus();
        return;
      }
      const request = (notes ? `${item}. ${notes}` : item).slice(0, 4000);
      setPhotoSearch({ image, request });
      setPhotoSearchBusy(false);
      await runSearch(request);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhotoSearchNotice(photoSearchFailure(error));
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
      `Help me prepare an offer for ${item.title} and arrange pickup or shipping. Ask me for any missing details. Keep everything as a draft for review.${!existing && committedSearchRef.current ? " My earlier request: " + committedSearchRef.current.originalRequest : ""}`.slice(
        0,
        4000,
      ),
      { ...criteria, query: item.title, source: "takeover" },
      location,
    );
    void performSearch(search, undefined, proposal, Boolean(agentRun.state.id));
  }
  /** Shows exactly these listings side by side, replacing an earlier selection. */
  function compareListings(ids: string[]) {
    setCompared(ids);
    openComparison();
  }
  /** A tapped quick reply takes the same path as typing it or using the listing's own button. */
  function chooseQuickReply(reply: TappableReply, shown: Product[]) {
    if (reply.kind === "ask") void runSearch(reply.text, criteria, true);
    else if (reply.kind === "compare") compareListings(reply.listingIds);
    else if (reply.kind === "watch") watches.watch(reply);
    else if (reply.kind === "searches") openDestination("searches");
    else {
      const item = shown.find((listing) => listing.id === reply.listingId);
      if (!item)
        throw new Error("The offer reply names a listing Pako did not show.");
      openOfferCard(item);
    }
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
        image={item?.image}
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
            forgetMessageDraft(proposal.listingId);
          } catch {
            /* repository exposes the error */
          }
        }}
      />
    );
  }
  /** A discarded offer leaves no unsent conversation waiting in Messages. */
  function forgetMessageDraft(listingId: string) {
    setMessageProposal((current) =>
      current?.listingId === listingId ? undefined : current,
    );
    setMessageListingId((current) =>
      current === listingId ? undefined : current,
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
  /** Saves a search for an item, or says it is saved already. */
  function keepWatch({ query, maxPrice, radius }: WatchTarget) {
    if (!watches.watch({ query, maxPrice, radius })) {
      setToastNotice({
        message: `“${query}” is already a saved search.`,
        mood: "search",
      });
      return;
    }
    setToastNotice({
      message: "Search saved. New matches show up in Searches.",
      mood: "search",
      action:
        view === "searches"
          ? undefined
          : {
              label: "View",
              description: "View your saved searches",
              onClick: () => openDestination("searches"),
            },
    });
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
              id: randomUuid(),
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
            : "I couldn't read these photos. Try different ones.",
        );
    } finally {
      if (imageReader.current === controller) {
        imageReader.current = null;
        setPhotoReading(false);
      }
    }
  }
  /** `keepTitle` keeps a title the seller already wrote instead of the agent's. */
  async function generateDraft({ keepTitle = false } = {}) {
    // The ref, not state: a batch item may start right after a cancelled read.
    if (imageReader.current) {
      setUploadError("Wait for the photo to load.");
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
      setSellStep(2);
      const response = await listingAnalysis.ensure({
        photos,
        note: start.raw,
        location: start.location,
      });
      if (controller.signal.aborted) return;
      const current = draftRef.current;
      const prepared = prepareListingDraft(current, response.metadata);
      if (keepTitle && current.title.trim()) prepared.title = current.title;
      setDraft(prepared);
      void listing.start({
        missingDetails: response.missingDetails,
        keywords: response.metadata.keywords,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSellStep(1);
      setUploadError(
        error instanceof Error
          ? error.message
          : "I couldn't draft the listing. Try again.",
      );
    } finally {
      if (listingRequest.current === controller) setBusy(false);
    }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (listing.running || database.pending || busy) return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (!listingDraftReady(draft, editingItem)) {
      setToast(
        `Check the listing details before ${listingSaveWords(Boolean(account)).gerund}.`,
      );
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
        `Couldn't ${listingSaveWords(Boolean(account)).verb.toLowerCase()} the listing. Your draft is still here; see the note above and try again.`,
      );
      return;
    }
    if (batchQueue && !editingListing) {
      finishBatchItem("saved", item);
      return;
    }
    hasSellingDraft.current = false;
    setAccountTab("listings");
    navigate("account");
    // A new listing is celebrated on My listings; only edits get a toast.
    if (editingListing)
      setToast(
        account
          ? "Listing updated."
          : "Changes saved on this device.",
      );
    else setPublishedListings([item.id]);
  }
  /** Load one sorted item into the single-listing flow and let the agent draft it. */
  function openBatchItem(next: ListingDraft) {
    listingRequest.current?.abort();
    cancelPhotoRead();
    listing.resetForNewDraft();
    draftId.current = randomUuid();
    setEditingListing(null);
    setUploadError("");
    setDraft(next);
    // Without Pako the next item opens as plain details for the student to fill in.
    setManualListing(!configured);
    setSellStep(configured ? 1 : 2);
    if (configured) void generateDraft({ keepTitle: true });
  }
  function startBatchListings(drafts: ListingDraft[]) {
    if (!drafts.length) return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
    hasSellingDraft.current = true;
    setBatchQueue({ drafts, index: 0, results: [], savedIds: [] });
    setBatchStart(undefined);
    setSellMode("single");
    openBatchItem(drafts[0]);
  }
  /** Moves the batch on after a listing was saved or skipped; the last one opens My listings. */
  function finishBatchItem(result: "saved" | "skipped", saved?: Product) {
    if (!batchQueue) return;
    const results = [...batchQueue.results, result];
    const savedIds = saved
      ? [...batchQueue.savedIds, saved.id]
      : batchQueue.savedIds;
    const index = batchQueue.index + 1;
    const total = batchQueue.drafts.length;
    if (index < total) {
      const note = batchStepNote({
        outcome: result,
        title: saved?.title ?? draftRef.current.title,
        next: index + 1,
        total,
        cloud: Boolean(account),
      });
      setBatchQueue({ ...batchQueue, index, results, savedIds, note });
      openBatchItem(batchQueue.drafts[index]);
      return;
    }
    setBatchQueue(null);
    hasSellingDraft.current = false;
    setAccountTab("listings");
    navigate("account");
    if (savedIds.length) setPublishedListings(savedIds);
    else setToastNotice({ message: "No listings saved.", mood: "idle" });
  }
  /** Return the items not yet created to the sorting step. */
  function backToBatchSorting() {
    if (!batchQueue) return;
    listingRequest.current?.abort();
    listing.resetConversation();
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
    if (!isMine(item)) return;
    if (item.status === "withdrawn") return;
    hasSellingDraft.current = true;
    navigate("sell");
    listing.resetForNewDraft();
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
    setManualListing(false);
    setUploadError("");
  }
  /** Pako's piles become one listing each, or open for the student to check first. */
  function separateItems(groups: PhotoGroup[], review: boolean) {
    const photos = listingPhotos(draftRef.current);
    if (!review) {
      startBatchListings(
        itemsFromGroups(photos, groups, draftRef.current.location).map(
          (item) => item.draft,
        ),
      );
      return;
    }
    setBatchStart({ photos, groups, review });
    setSellMode("batch");
  }
  /** Goes on to the details without Pako, keeping what he made of the photos in step 1. */
  function fillInDetails() {
    const analysis =
      sellStep === 1 && listingAnalysis.insight.status === "ready"
        ? listingAnalysis.insight.response
        : undefined;
    listingRequest.current?.abort();
    listing.cancel();
    setDraft((current) => {
      const prepared = analysis
        ? prepareListingDraft(current, analysis.metadata)
        : current;
      return {
        ...prepared,
        description: prepared.description.trim() || current.raw,
      };
    });
    setManualListing(true);
    setSellStep(2);
  }
  /** The one path a listing's status changes through: My listings and deals alike. */
  async function applyListingStatus(id: string, status: Product["status"]) {
    if (!own.some((item) => item.id === id))
      throw new Error(`Listing ${id} is not among the listings.`);
    return setOwn((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }
  /**
   * A deal reserved a listing or made it available again. With accounts the
   * server saved it in the same step, so the listings only reload; the local
   * demo saves it here.
   */
  async function followDealStatus(id: string, status: DealStatusChange) {
    if (account) {
      database.retry();
      return;
    }
    const before = own.find((item) => item.id === id)?.status;
    if (before && !Object.hasOwn(dealStatusBefore, id))
      setDealStatusBefore((current) => ({ ...current, [id]: before }));
    if (!(await applyListingStatus(id, status)))
      setToast(statusFailure(status));
  }
  /**
   * Clears this browser's workspace: the student's listings and choices, then
   * the demo's conversations and deals, after giving the sample listings back
   * the statuses those deals changed.
   */
  async function clearWorkspace() {
    const restored = own.flatMap((item) =>
      item.demo && Object.hasOwn(dealStatusBefore, item.id)
        ? [{ ...item, status: dealStatusBefore[item.id] }]
        : [],
    );
    setOwn(restored);
    // A sample listing that has not loaded yet keeps its record for the next clear.
    setDealStatusBefore((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([id]) => !restored.some((item) => item.id === id),
        ),
      ),
    );
    setFavorites([]);
    setJobs([]);
    watches.clear();
    setCompared([]);
    setSearchArea({
      location: "Lausanne",
      radius: defaults.radius,
    });
    goHome();
    setCriteria({ ...defaults });
    resetMessageWorkspace();
    await messages.demoInbox.reset();
    setToast("Browser data cleared.");
  }
  async function setStatus(id: string, status: Product["status"]) {
    const listing = own.find((item) => item.id === id);
    if (!listing) throw new Error(`Listing ${id} is not among your listings.`);
    if (!(await applyListingStatus(id, status))) {
      setToast(statusFailure(status));
      return;
    }
    if (status === "withdrawn")
      setCompared((current) => current.filter((item) => item !== id));
    setToastNotice({
      message: STATUS_NOTICES[status],
      action:
        status === "withdrawn"
          ? {
              label: "Undo",
              description: `Undo archiving ${listing.title}`,
              onClick: () => void setStatus(id, listing.status),
            }
          : undefined,
    });
  }
  /** The inbox Messages shows, in the mode the app runs in. */
  const messagesInbox: MessagesInboxProps = account?.session
    ? {
        mode: "account",
        account: { client: account.client, session: account.session },
        inbox: messages.accountInbox,
        threadRequest,
      }
    : account
      ? { mode: "signed-out" }
      : { mode: "demo", inbox: messages.demoInbox, reads: messages.reads };
  const listingTools = (
    <AskPakoMenu
      requests={LISTING_REQUESTS}
      disabled={!configured || listing.running}
      onAsk={(request) => void listing.send(request, {}, true)}
    />
  );
  /** Pako still reads the photos in step 2, before his first run of the listing starts. */
  const listingStarting = busy && sellStep === 2 && !listing.state.id;
  const sellBatch: BatchProgress | undefined =
    batchQueue && !editingListing
      ? {
          index: batchQueue.index,
          covers: batchQueue.drafts.map((item) => item.image),
          results: batchQueue.results,
          note: batchQueue.note,
          onSkip: () => finishBatchItem("skipped"),
        }
      : undefined;
  const listingConversation = (
    <ListingConversation
      listing={listing}
      draft={draft}
      starting={listingStarting}
      editing={Boolean(editingListing)}
      saveAction={saveActionLabel({
        cloud: Boolean(account),
        editing: Boolean(editingListing),
        batch: sellBatch,
      })}
      configured={configured}
      asleep={quotaExhausted}
      onManual={fillInDetails}
    />
  );
  const productCard = (item: Product, arriving = false) => (
    <ProductCard
      key={item.id}
      product={shownListing(item)}
      reservedForYou={myReservations.has(item.id)}
      arriving={arriving}
      favorite={favorites.includes(item.id)}
      compared={compared.includes(item.id)}
      onOpen={() => openProduct(item)}
      onToggleFavorite={() => toggleFavorite(item.id)}
      onToggleCompare={() => toggleCompare(item.id)}
      availability={availability?.cardAvailability(item)}
    />
  );

  // Until the first connection check answers, the footnote says nothing rather
  // than "Connecting…" that disappears a moment later.
  // A signed-in account has a daily allowance; its chip's row is held while it loads.
  const allowanceExpected =
    Boolean(account) && signedIn && !agentHealth && !healthError;
  const connectionStatus =
    account && !signedIn ? (
      <div className="agent-footnote">
        <Button type="button" onClick={() => navigate("settings")}>
          Sign in to ask Pako
        </Button>
      </div>
    ) : !agentHealth && !healthError ? null : quotaExhausted ? (
      <div className="agent-footnote" role="status">
        Today's requests reset on {quotaResets}.
      </div>
    ) : !configured || healthError ? (
      <div className="agent-footnote">
        <span role="status" title={healthError || undefined}>
          {healthError
            ? "Pako is offline. You can still browse listings."
            : "Pako isn't set up here. You can still browse listings."}
        </span>
        {/* A failed turn offers its own Try again; one recovery button is enough. */}
        {agentRun.state.status !== "error" && (
          <Button
            type="button"
            onClick={refreshHealth}
            disabled={healthChecking}
          >
            {healthChecking ? "Reconnecting…" : "Retry"}
          </Button>
        )}
        {configured && agentHealth?.webSearchConfigured === false && (
          <span>I can't check other sites right now. I can still check takeover listings.</span>
        )}
      </div>
    ) : agentHealth?.quota ? (
      <div
        className={`agent-footnote${agentHealth.quota.remaining > 5 ? " quota-available" : ""}`}
        role="status"
        aria-label={`${agentHealth.quota.remaining} of ${agentHealth.quota.limit} Pako requests left today`}
      >
        <Badge
          variant={
            agentHealth.quota.remaining <= 5 ? "destructive" : "secondary"
          }
        >
          {agentHealth.quota.remaining} Pako{" "}
          {agentHealth.quota.remaining === 1 ? "request" : "requests"} left
          today
        </Badge>
      </div>
    ) : null;

  return (
    <>
      <DatabaseStatus
        message={
          database.error ||
          favoriteError ||
          (slowListings
            ? database.pending
              ? "Saving listing changes…"
              : "Loading listings…"
            : "")
        }
        onRetry={database.error ? database.retry : undefined}
      />
      <header className="app-header" data-scrolled={pageScrolled || undefined}>
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            transitionPage("nav-back", goHome);
          }}
          aria-label="Browse takeover listings"
        >
          takeover
        </a>
        <HeaderNav
          active={headerDestination(currentDestination)}
          savedSearches={savedSearches.length}
          unreadMatches={watches.unread}
          unreadMessages={messages.unread}
          onNavigate={openDestination}
        />
        <div className="header-actions">
          <Button
            animateIcon
            className="button primary sell-nav"
            data-prefetch="sell"
            onClick={() => openDestination("sell")}
          >
            <Plus size={17} aria-hidden="true" />
            <span className="header-action-label">Sell an item</span>
          </Button>
          <Button
            ref={helpButton}
            className="icon-button help-nav"
            data-prefetch="intro"
            aria-label="How it works"
            onClick={() => setOnboarding("open")}
          >
            <CircleHelp size={20} aria-hidden="true" />
            <span className="header-action-label">How it works</span>
          </Button>
          <Button
            className={`icon-button${view === "settings" ? " active" : ""}`}
            data-prefetch="settings"
            aria-current={view === "settings" ? "page" : undefined}
            aria-label={
              account
                ? signedIn
                  ? "Open account settings"
                  : "Sign in"
                : "Open browser settings"
            }
            onClick={() => openDestination("settings")}
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
        <PageTransition container={mainContent}>
          <main
            ref={mainContent}
            tabIndex={-1}
            className={"main-content view-" + view}
          >
            {view === "settings" && (
              <PageTransitionView>
                <LazyBoundary label="Loading settings">
                  {account?.session ? (
                    <AccountSettings
                      client={account.client}
                      session={account.session}
                      startSection={
                        readingSettingsRequested ? "privacy" : "profile"
                      }
                      pakoSetting={
                        <PakoReadingSetting
                          enabled={messages.autoRead}
                          unavailable={messages.autoReadUnavailable}
                          onEnabledChange={messages.setAutoRead}
                        />
                      }
                      onProfileSaved={setPickupRegion}
                      adminEntry={adminEntry}
                      browserTools={
                        <DeveloperSettings
                          enabled={developerMode}
                          onEnabledChange={setDeveloperMode}
                          detail="While you write a listing, see how many of this browser's saved searches would get an alert. Saved in this browser."
                        />
                      }
                    />
                  ) : account ? (
                    <div className="settings-auth-page">
                      <Auth
                        client={account.client}
                        onDone={() => navigate("settings")}
                      />
                    </div>
                  ) : (
                    <LocalSettings
                      connectionStatus={connectionStatus}
                      pakoSetting={
                        <PakoReadingSetting
                          enabled={messages.autoRead}
                          onEnabledChange={messages.setAutoRead}
                        />
                      }
                      developerSettings={
                        <DeveloperSettings
                          enabled={developerMode}
                          onEnabledChange={setDeveloperMode}
                          detail="Sample listings, the seller's view in Messages, demo time skips and alert counts while selling. Saved in this browser."
                          clockOffsetMs={availability?.clockOffsetMs}
                          onResetDemo={availability?.resetDemo}
                        />
                      }
                      onAddDemo={
                        developerMode
                          ? () => void database.addDemo()
                          : undefined
                      }
                      onHelp={() => setModal("help")}
                      onClear={() => setModal("clear")}
                      adminEntry={adminEntry}
                    />
                  )}
                </LazyBoundary>
              </PageTransitionView>
            )}
            {view === "admin" && (
              <PageTransitionView>
                <LazyBoundary label="Loading the admin area">
                  <AdminArea
                    api={admin.api}
                    checking={admin.loading}
                    accessError={admin.error?.message}
                    onBack={() => navigate("settings")}
                  />
                </LazyBoundary>
              </PageTransitionView>
            )}
            <WorkspacePage active={view === "messages"}>
              <NamedOfferPriceContext.Provider
                value={(listingId) =>
                  priceNamedInSearch(negotiations.items, listingId)
                }
              >
                <LazyBoundary label="Loading Messages">
                  <MessagesPage
                    developerMode={developerMode}
                    listingId={messageListingId}
                    onBrowse={() => openDestination("browse")}
                    initialMessage={
                      messageProposal
                        ? (messageProposal.draft?.message ??
                          draftMessage(
                            own.find((item) => item.id === messageListingId)
                              ?.title ?? "Listing",
                            messageProposal.terms,
                          ))
                        : messageDraft
                    }
                    initialTerms={
                      messageProposal &&
                      dealTermsFromNegotiation(
                        messageProposal.terms,
                        new Date(),
                      )
                    }
                    offerRequest={offerRequest}
                    homePoint={nearbyMeetingPoint(location)}
                    onListingStatus={followDealStatus}
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
                          "This offer draft changed. Open the latest draft in your conversation with Pako.",
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
                            draft: {
                              message,
                              version: messageProposal.version,
                            },
                          },
                          messageProposal.version,
                        ),
                      });
                      setMessageProposal(undefined);
                    }}
                    onDeleted={() => replaceRoute("#messages")}
                    threadBanner={availability?.threadBanner}
                    listings={own.map(shownListing)}
                    {...messagesInbox}
                    pako={{
                      available: messages.available,
                      autoRead: messages.autoRead,
                      remaining: messages.remaining,
                      onRemaining: messages.setRemaining,
                      onOpenSettings: () => {
                        setReadingSettingsRequested(true);
                        openDestination("settings");
                      },
                      onFindSimilar: (title) => void runSearch(title),
                    }}
                    listing={own.find((item) => item.id === messageListingId)}
                    onOpenListing={(id) => {
                      const item = own.find((item) => item.id === id);
                      if (item) openProduct(item);
                    }}
                  />
                </LazyBoundary>
              </NamedOfferPriceContext.Provider>
            </WorkspacePage>
            <WorkspacePage
              active={view === "discover"}
              pageKey={searchIsHome ? "home" : "search"}
            >
              <>
                {searchIsHome ? (
                  <section
                    className={`agent-hero search-entry${hasSearchDraft ? " has-query" : ""}`}
                    aria-labelledby="agent-title"
                  >
                    <h1 id="agent-title">What are you looking for?</h1>
                    <div className="agent-hero-guide">
                      <PakoReaction
                        className="agent-hero-pako"
                        mood={heroGuide.mood}
                        size={64}
                      />
                      <p className="ob-bubble agent-hero-bubble">
                        {heroGuide.line}
                        {heroGuide.newMatches && (
                          <>
                            {" "}
                            <Button
                              className="agent-hero-matches"
                              onClick={() => openDestination("searches")}
                            >
                              See new matches
                            </Button>
                          </>
                        )}
                      </p>
                    </div>
                    <PageTransitionShared name="agent-composer">
                      <form
                        className="agent-search"
                        onSubmit={(event) => {
                          event.preventDefault();
                          startSearchFromHome(query);
                        }}
                        data-dragging={photoDragging || undefined}
                        onDragOver={(event) => {
                          if (!event.dataTransfer.types.includes("Files"))
                            return;
                          event.preventDefault();
                          setPhotoDragging(true);
                        }}
                        onDragLeave={(event) => {
                          const next = event.relatedTarget;
                          if (
                            !(
                              next instanceof Node &&
                              event.currentTarget.contains(next)
                            )
                          )
                            setPhotoDragging(false);
                        }}
                        onDrop={(event) => {
                          setPhotoDragging(false);
                          const file = imageFrom(event.dataTransfer);
                          if (!file) return;
                          event.preventDefault();
                          void searchByPhoto(file);
                        }}
                      >
                        <PageTransitionShared name="agent-query">
                          <Textarea
                            ref={searchField}
                            onPaste={(event) => {
                              const file = imageFrom(event.clipboardData);
                              if (!file) return;
                              event.preventDefault();
                              void searchByPhoto(file);
                            }}
                            aria-label="Search second-hand listings"
                            maxLength={4000}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            rows={1}
                            placeholder="e.g. a desk under CHF 80 near EPFL"
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" &&
                                !event.shiftKey &&
                                !event.nativeEvent.isComposing
                              ) {
                                event.preventDefault();
                                startSearchFromHome(query);
                              }
                            }}
                          />
                        </PageTransitionShared>
                        <div className="agent-search-actions">
                          <Button
                            type="button"
                            className="search-area"
                            aria-label={`Search area: ${location}`}
                            onClick={() => {
                              setAreaDraft({
                                location,
                                radius: criteria.radius,
                              });
                              setModal("location");
                            }}
                          >
                            <MapPin size={15} aria-hidden="true" />
                            <span>{shortPlace(location)}</span>
                            <ChevronDown size={13} aria-hidden="true" />
                          </Button>
                          <PhotoSearchButton
                            busy={photoSearchBusy}
                            disabled={running || !configured || quotaExhausted}
                            onFile={(file) => void searchByPhoto(file)}
                            onKeyboardFocus={setPhotoHint}
                          />
                          <Button
                            animateIcon
                            className="button primary"
                            type="submit"
                            disabled={
                              !query.trim() ||
                              running ||
                              photoSearchBusy ||
                              quotaExhausted
                            }
                          >
                            Search
                          </Button>
                        </div>
                      </form>
                    </PageTransitionShared>
                    <p className="sr-only" aria-live="polite">
                      {photoSearchBusy
                        ? "Pako is looking at your photo."
                        : photoSearchNotice?.kind === "clarification"
                          ? photoSearchNotice.line
                          : ""}
                    </p>
                    {photoSearchNotice?.kind === "error" && (
                      <p className="sr-only" role="alert">
                        {photoSearchNotice.line}
                      </p>
                    )}
                    {connectionStatus ??
                      (allowanceExpected && (
                        <div
                          className="agent-footnote agent-footnote-pending"
                          aria-hidden="true"
                        />
                      ))}
                    <AgentSuggestions
                      state={searchAssist}
                      onSelect={(suggestion) => {
                        setQuery(suggestion);
                        startSearchFromHome(suggestion);
                      }}
                    />
                    <div className="home-sell-card">
                      <span className="home-sell-icon" aria-hidden="true">
                        <Camera size={18} />
                      </span>
                      <p>
                        <strong>Moving out?</strong>{" "}
                        <span>
                          Start with a photo. Pako drafts your listing for you
                          to review.
                        </span>
                      </p>
                      <Button
                        animateIcon
                        className="button quiet"
                        onClick={startSell}
                      >
                        Sell from a photo
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </section>
                ) : (
                  <>
                    <WorkspaceHeader
                      title={
                        reviewingListing ? "Listing review" : searchHeading
                      }
                      backLabel="New search"
                      backIcon={<SquarePen size={20} aria-hidden="true" />}
                      onBack={startNewSearch}
                      onAccount={() => navigate("settings")}
                      quota={healthError ? undefined : agentHealth?.quota}
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
                                  (
                                    committedSearch?.originalRequest || ""
                                  ).slice(0, 90),
                                );
                                setModal("save");
                              },
                            }
                          : undefined
                      }
                    />
                    {negotiations.error && (
                      <p role="alert">{negotiations.error}</p>
                    )}
                    <AgentConversation
                      state={agentRun.state}
                      startPhoto={activePhotoSearch?.image}
                      announcement={turnAnnouncement(
                        agentRun.state,
                        searchPlace,
                      )}
                      requestTransitionName="agent-query"
                      typing={followUp.trim() !== ""}
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
                                  focusConversation(event.currentTarget);
                                  setCompared([]);
                                }}
                              >
                                <X size={16} aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                          <div className="composer-status">
                            {connectionStatus}
                          </div>
                          <PageTransitionShared name="agent-composer">
                            <AgentComposer
                              value={followUp}
                              onChange={setFollowUp}
                              onSend={() =>
                                void runSearch(followUp, criteria, true)
                              }
                              label="Ask Pako"
                              placeholder={
                                reviewingListing
                                  ? "Ask about your listing…"
                                  : awaitingAnswer
                                    ? "Or type your answer…"
                                    : "Ask a follow-up…"
                              }
                              sendLabel="Send to Pako"
                              disabled={running || quotaExhausted}
                              onStop={running ? agentRun.cancel : undefined}
                            />
                          </PageTransitionShared>
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
                        const nextReplies = quickReplies({
                          turn,
                          latest: !archived,
                          search: committedSearch,
                          negotiating: Boolean(negotiations.active),
                          watching:
                            turn.watchSuggestion !== undefined &&
                            committedSearch !== null &&
                            watches.isWatching({
                              ...turn.watchSuggestion,
                              radius: committedSearch.criteria.radius,
                            }),
                          listings: localMatches.map((item) => ({
                            id: item.id,
                            title: item.title,
                            price: item.price,
                            offerable: canOffer(item),
                          })),
                          today: TODAY,
                        });
                        return (
                          <AgentRunPanel
                            state={turn}
                            externalComposer
                            readOnly={archived}
                            typing={followUp.trim() !== ""}
                            place={searchPlace}
                            quickReplies={
                              nextReplies.replies.length > 0 && (
                                <AgentQuickReplies
                                  {...nextReplies}
                                  pausedReason={allowancePause}
                                  onSelect={(reply) =>
                                    chooseQuickReply(reply, localMatches)
                                  }
                                />
                              )
                            }
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
                                <AgentListings
                                  listings={localMatches}
                                  order={resultOrder(turn.status)}
                                  onOpen={openProduct}
                                  onOffer={openOfferCard}
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
                {searchIsHome && (
                  <HomeDeals
                    deals={homeDealItems.map(
                      ({ item, listing, view, waited }) => ({
                        id: item.threadId,
                        title: listing.title,
                        image: listing.image,
                        view,
                        onOpen: () => openDealThread(item),
                        onFollowUp: waited
                          ? () =>
                              openDealThread(
                                item,
                                nudgeMessage(item.role, listing.title),
                              )
                          : undefined,
                      }),
                    )}
                    onSeeAll={() => openDestination("messages")}
                  />
                )}
                {searchIsHome && availability?.notices()}
                {showHomeListings && visibleListings.length > 0 && (
                  <>
                    <div className="section-heading">
                      <h2>Listings nearby</h2>
                      <p>
                        {account
                          ? "Listed on takeover"
                          : "From students around EPFL, UNIL and the FMEL residences."}
                      </p>
                    </div>
                    <ProductGrid
                      items={visibleListings}
                      renderProduct={productCard}
                    />
                  </>
                )}
                {showHomeListings && !visibleListings.length && (
                  <div className="home-empty">
                    <Pako mood="idle" size={72} still />
                    <div>
                      <h2>No listings to show yet</h2>
                      <p>
                        {agentHealth?.webSearchConfigured
                          ? "Ask me to search other sites, or list an item."
                          : "Be the first: list an item with a photo."}
                      </p>
                    </div>
                  </div>
                )}
              </>
            </WorkspacePage>

            {view === "searches" && (
              <PageTransitionView>
                <SavedSearchesPage
                  loaded={listingsSettled}
                  searches={savedSearches}
                  location={location}
                  matches={watches.matches}
                  onOpenMatch={({ alert, listing }) => {
                    watches.markRead(alert.id);
                    openProduct(listing);
                  }}
                  onDismissMatch={({ alert }) => watches.dismiss(alert.id)}
                  onMarkAllSeen={watches.markAllRead}
                  onTogglePause={watches.togglePause}
                  onWatch={(query, maxPrice) =>
                    keepWatch({ query, maxPrice, radius: searchArea.radius })
                  }
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
                    const index = jobs.findIndex((item) => item.id === job.id);
                    setJobs((current) =>
                      current.filter((item) => item.id !== job.id),
                    );
                    setToastNotice({
                      message: "Saved search deleted.",
                      action: {
                        label: "Undo",
                        description: "Undo saved search deletion",
                        onClick: () => restoreSavedSearch(job, index),
                      },
                    });
                  }}
                />
              </PageTransitionView>
            )}

            {view === "sell" && sellMode === "batch" && (
              <PageTransitionView>
                <LazyBoundary label="Loading selling">
                  <BatchSellFlow
                    location={location}
                    liveAgent={configured}
                    quota={healthError ? undefined : agentHealth?.quota}
                    onAccount={() => navigate("settings")}
                    start={batchStart}
                    onBack={() => {
                      setBatchStart(undefined);
                      setSellMode("single");
                    }}
                    onStart={startBatchListings}
                  />
                </LazyBoundary>
                {connectionStatus}
              </PageTransitionView>
            )}
            <WorkspacePage active={view === "sell" && sellMode === "single"}>
              <>
                <LazyBoundary label="Loading selling">
                  <SellFlow
                    draft={draft}
                    step={sellStep}
                    editing={!!editingListing}
                    pickupMin={listingPickupMinimum(draft.pickup, editingItem)}
                    busy={(busy && !listingStarting) || database.pending > 0}
                    cloud={!!account}
                    photoReading={photoReading}
                    uploadError={uploadError}
                    liveAgent={configured}
                    photoInsight={listingAnalysis.insight}
                    pakoAbsence={pakoAbsence}
                    pakoBack={quotaResets || undefined}
                    manual={manualListing}
                    onFillIn={fillInDetails}
                    onRetryPako={refreshHealth}
                    onBack={() =>
                      transitionPage("nav-back", () => {
                        if (sellStep === 2 && !editingListing) {
                          listingRequest.current?.abort();
                          listing.resetConversation();
                          setManualListing(false);
                          setSellStep(1);
                        } else if (editingListing) navigate("account");
                        else if (batchQueue) backToBatchSorting();
                        else openBrowse();
                      })
                    }
                    onDraftChange={listing.editDraft}
                    agentWorking={listingStarting || listing.running}
                    suggestedPrice={pendingPrice(
                      [...listing.state.history, listing.state],
                      draft,
                    )}
                    onReviewPrice={
                      listing.decidingPrice ? listing.reviewPrice : undefined
                    }
                    insight={
                      <SellerInsight
                        similar={similarListings(
                          visibleListings,
                          draft.title,
                          editingListing ?? undefined,
                        )}
                        ladder={
                          developerMode
                            ? demandLadder(savedSearches, {
                                title: draft.title,
                                price: draft.price.trim()
                                  ? Number(draft.price)
                                  : Number.NaN,
                                condition: draft.condition,
                                pickupBy: draft.pickup,
                              })
                            : undefined
                        }
                      />
                    }
                    agentConversation={listingConversation}
                    agentTools={listingTools}
                    quota={healthError ? undefined : agentHealth?.quota}
                    onAccount={() => navigate("settings")}
                    onPhotoSelected={upload}
                    onCreateDraft={() => void generateDraft()}
                    sortFailed={listingAnalysis.sortFailed}
                    onSeparate={separateItems}
                    onKeepTogether={listingAnalysis.keepTogether}
                    onSortYourself={() =>
                      separateItems(
                        listingPhotos(draftRef.current).map((_, index) => ({
                          photos: [index],
                          label: "",
                        })),
                        true,
                      )
                    }
                    onNotesDone={listingAnalysis.flushNote}
                    onPublish={publish}
                    batch={sellBatch}
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
                </LazyBoundary>
                {connectionStatus}
              </>
            </WorkspacePage>

            {view === "detail" && (
              <PageTransitionView key={`listing-${selectedId}`}>
                {!selected && selectedId && availability?.notices(selectedId)}
                <ListingDetailPage
                  selected={selected && shownListing(selected)}
                  deal={selectedDealView ?? undefined}
                  onOpenChat={() => selectedDeal && openDealThread(selectedDeal)}
                  availabilityPanel={
                    selected &&
                    availability?.detailPanel(selected, () =>
                      openMessages(selected.id),
                    )
                  }
                  loaded={listingsSettled}
                  cloud={!!account}
                  catalog={localListings}
                  renderProduct={productCard}
                  favorite={favorites.includes(selected?.id ?? "")}
                  compared={compared.includes(selected?.id ?? "")}
                  onToggleFavorite={() =>
                    selected && toggleFavorite(selected.id)
                  }
                  onToggleCompare={() => selected && toggleCompare(selected.id)}
                  reportAction={
                    account?.session && selected && !selected.own ? (
                      <Report client={account.client} listingId={selected.id} />
                    ) : undefined
                  }
                  backLabel={
                    detailOrigin === "discover"
                      ? searching
                        ? "Back to search"
                        : "Back to browse"
                      : detailOrigin === "account"
                        ? accountTab === "favorites"
                          ? "Back to saved items"
                          : "Back to my listings"
                        : detailOrigin === "messages"
                          ? "Back to messages"
                          : detailOrigin === "compare"
                            ? "Back to comparison"
                            : "Back"
                  }
                  onBack={() =>
                    transitionPage("nav-back", () => navigate(detailOrigin))
                  }
                  onMessage={() => selected && openMessages(selected.id)}
                  onOffer={() =>
                    selected &&
                    transitionPage(
                      "nav-forward",
                      () => openOfferCard(selected),
                      "fade",
                    )
                  }
                  onEdit={() => selected && editListing(selected)}
                  onAskAgent={() => {
                    if (!selected) return;
                    editListing(selected);
                    void listing.send(
                      "Review my supplied listing and help me improve it. Ask about missing facts; do not invent them.",
                    );
                  }}
                />
              </PageTransitionView>
            )}

            {view === "compare" && (
              <PageTransitionView>
                <LazyBoundary label="Loading the comparison">
                  <ComparePage
                    loaded={listingsSettled}
                    items={comparison}
                    onBack={() =>
                      transitionPage("nav-back", () =>
                        navigate(comparisonOrigin.current),
                      )
                    }
                    onOpen={openProduct}
                    onRemove={toggleCompare}
                  />
                </LazyBoundary>
              </PageTransitionView>
            )}

            <WorkspacePage active={view === "account"} pageKey={accountTab}>
              <AccountPage
                loaded={listingsSettled}
                accountTab={accountTab}
                setAccountTab={(tab) => {
                  setAccountTab(tab);
                  pushRoute(
                    tab === "favorites"
                      ? "#saved"
                      : tab === "archive"
                        ? "#listings/archive"
                        : "#listings",
                  );
                }}
                visibleListings={visibleListings.filter(isMine)}
                cloud={!!account}
                savedListings={savedListings}
                archivedListings={archivedListings.filter(isMine)}
                onSell={startSell}
                onBrowse={openBrowse}
                onOpen={openProduct}
                onEdit={editListing}
                onStatusChange={setStatus}
                renderProduct={productCard}
                publishedIds={publishedListings}
                onCelebrationEnd={() => setPublishedListings([])}
                agreementFor={(listingId) => {
                  const agreement = sellerAgreementFor(inboxDeals, listingId);
                  const agreed = agreement?.deal.agreed;
                  return agreement && agreed
                    ? {
                        chip: reservedForChip(
                          agreement.otherName,
                          agreed.terms,
                        ),
                        onOpenChat: () => openDealThread(agreement),
                        pickup: listingPickup(agreement),
                      }
                    : undefined;
                }}
              />
            </WorkspacePage>
          </main>
        </PageTransition>
      </div>

      <MobileNav
        active={currentDestination === "settings" ? null : currentDestination}
        pageKey={pageKey}
        onNavigate={openDestination}
        newMatches={watches.unread}
        unreadMessages={messages.unread}
      />
      <CompareTray
        count={comparison.length}
        visible={
          comparison.length > 0 &&
          !modal &&
          (view === "account" || view === "detail" || isHome)
        }
        onCompare={openComparison}
        onClear={() => setCompared([])}
      />
      <Toast
        message={toast}
        placement={bottomDocked ? "top" : "bottom"}
        mood={toastNotice?.mood}
        action={toastNotice?.action}
        onDismiss={() => setToast("")}
      />
      {availability?.overlay}

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
          title={modal === "save" ? "Save search" : "Edit search"}
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
              <span>
                Distance<span className="sr-only"> in kilometres</span>
              </span>
              <span className="input-with-unit">
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
                <span className="input-unit" aria-hidden="true">
                  km
                </span>
              </span>
            </label>
            <Button animateIcon className="button primary full" type="submit">
              Use this area
            </Button>
          </form>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="How Pako helps" onClose={() => setModal(null)}>
          <div className="help-list">
            <div>
              <Search size={20} />
              <p>
                <strong>Search</strong>Pako checks takeover listings and can
                search other sites. Check external prices and availability on
                the original page.
              </p>
            </div>
            <div>
              <Camera size={20} />
              <p>
                <strong>Search with a photo</strong>When you search with a
                photo, we send it to the AI service to identify the item. The
                search then uses that description.
              </p>
            </div>
            <div>
              <Camera size={20} />
              <p>
                <strong>Sell</strong>When Pako looks at your photos or drafts a
                listing, we send your photos and notes to the AI service. Check
                the details before publishing.
              </p>
            </div>
            <div>
              <Bookmark size={20} />
              <p>
                <strong>Keep</strong>Saved searches and alerts stay in this
                browser. Nothing reaches another student until you publish a
                listing or send a message.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "clear" && (
        <Modal
          title="Clear browser data for takeover?"
          onClose={() => setModal(null)}
        >
          <p className="modal-intro">
            This clears your listings, saved items, saved searches, alerts,
            conversations and demo deals from this browser. Shared sample
            listings stay available.
          </p>
          <div className="modal-actions">
            <Button className="button secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              animateIcon
              className="button danger"
              onClick={() => void clearWorkspace()}
            >
              Clear browser data
            </Button>
          </div>
        </Modal>
      )}
      {onboarding === "open" && !onboardingPaused && (
        <LazyBoundary label="Loading the intro" placeholder={null}>
          <Onboarding
            accountAction={!signedIn}
            onComplete={completeOnboarding}
            finalFocus={introFocus}
            onClosed={() => setOnboarding("closed")}
          />
        </LazyBoundary>
      )}
      {onboarding === "invite" && !onboardingPaused && (
        <OnboardingInvite
          onStart={() => setOnboarding("open")}
          onDismiss={declineOnboarding}
        />
      )}
    </>
  );
}
