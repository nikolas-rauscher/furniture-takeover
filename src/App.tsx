import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import {
  accountTabHash,
  destinationDirection,
  destinationFor,
  detailBackLabel,
  pageKey as pageKeyFor,
  type Destination,
  type View,
} from "./navigation";
import { formatPickup } from "../shared/pickupTime";
import type { AccountConnection } from "./cloud/connection";
import { useMarketplaceListings } from "./cloud/useMarketplaceListings";
import { savedListing, useFavorites } from "./cloud/useFavorites";
import { useAppViewport } from "./hooks/useAppViewport";
import { useWindowScrolled } from "./hooks/useWindowScrolled";
import AccountPage, { type ListingPickup } from "./components/AccountPage";
import ListingDetailPage from "./components/ListingDetailPage";
import SavedSearchesPage from "./components/SavedSearchesPage";
import { listingPhotos } from "../shared/listingPhotos";
import { readListingPhoto } from "./listingPhotos";
import { randomUuid } from "./randomUuid";
import WorkspacePage from "./components/WorkspacePage";
import WorkspaceHeader from "./components/WorkspaceHeader";
import type {
  MessagesInboxProps,
  ThreadRequest,
} from "./components/messagesProps";
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
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
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
import MobileNav from "./MobileNav";
import HeaderNav, { headerDestination } from "./components/HeaderNav";
import CompareTray from "./components/CompareTray";
import Toast from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { usePageScroll } from "./hooks/usePageScroll";
import { useSellSession } from "./hooks/useSellSession";
import DatabaseStatus from "./components/DatabaseStatus";
import Modal from "./components/Modal";
import ProductCard from "./components/ProductCard";
import ProductGrid from "./components/ProductGrid";
import SearchPreferencesFields from "./components/SearchPreferencesFields";
import { STATUS_NOTICES, statusFailure } from "./listingStatusWords";
import {
  activePreferences as activePreferencesOf,
  compactPreferences as compactPreferencesOf,
  shortPlace,
} from "./searchSummary";
import { saveActionLabel } from "./listingSaveWords";
import AskPakoMenu, { LISTING_REQUESTS } from "./components/AskPakoMenu";
import { useDeveloperMode } from "./availability/useDeveloperMode";
import {
  photoSearchFailure,
  photoSearchClarification,
  type PhotoSearchNotice,
} from "./photoSearchFeedback";
import PhotoSearchButton, { imageFrom } from "./components/PhotoSearchButton";
import AgentSuggestions from "./components/AgentSuggestions";
import AgentRunPanel from "./components/AgentRunPanel";
import { useAgentRun, type AgentRunState } from "./hooks/useAgentRun";
import { useAgentAssist } from "./hooks/useAgentAssist";
import type { PakoAbsence } from "./sellGuide";
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
  refilterCatalog,
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
import { searchChangeSummary } from "./searchChanges";
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
  type Criteria,
  type Product,
  type SavedListing,
} from "../shared/marketplace";
import SavedNote from "./components/SavedNote";
import { transitionPage } from "./pageTransition";
import {
  PageTransition,
  PageTransitionShared,
  PageTransitionView,
} from "./components/animate-ui/components/page-transition";
import type { OnboardingOutcome } from "./components/onboarding/Onboarding";
import OnboardingInvite from "./components/onboarding/OnboardingInvite";
import Pako from "./components/onboarding/Pako";
import PakoReaction from "./components/PakoReaction";
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

/** Results wait while Pako works and are ranked once his turn has finished. */
function resultOrder(status: AgentRunState["status"]): ResultOrder {
  if (status === "running") return "pending";
  return status === "complete" ? "ranked" : "unranked";
}

type Dialog =
  "filters" | "save" | "edit-search" | "location" | "help" | "clear" | null;

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
  const toast = useToast();
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
  const [localPreferences, setLocalPreferences] = useState("");
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
  const nav = useAppNavigation({
    signedIn,
    onLeave: leavePage,
    onNavigate: () => setModal(null),
    onHistoryRoute: (route) =>
      setMessageListingId(
        route.view === "messages" ? route.listingId : undefined,
      ),
  });
  const {
    view,
    accountTab,
    setAccountTab,
    selectedId,
    detailOrigin,
    navigate,
    pushRoute,
    replaceRoute,
  } = nav;
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
    nav.initialRoute.view === "messages" ? nav.initialRoute.listingId : undefined,
  );
  /** Changes on each "Draft an offer" tap, so its thread opens the offer card again. */
  const [offerRequest, setOfferRequest] = useState<number>();
  /** A conversation to open by itself, such as a seller's deal from Home. */
  const [threadRequest, setThreadRequest] = useState<ThreadRequest>();
  const [modal, setModal] = useState<Dialog>(null);
  const {
    favorites,
    setFavorites,
    prices: savedPrices,
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
  const reloadListings = database.retry;
  const accountDealStatuses = !account?.session ? null : messages.deals
    .map(({ listingId, status }) => `${listingId}:${status}`).sort().join(",");
  useEffect(() => {
    if (accountDealStatuses !== null && !database.pending) void reloadListings();
  }, [accountDealStatuses, database.pending, reloadListings]);
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
    setToast: toast.say,
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
  const [messageProposal, setMessageProposal] = useState<
    Negotiation | undefined
  >();
  /** A message the app prepared for a buyer's thread without an offer, such as a follow-up. */
  const [messageDraft, setMessageDraft] = useState<string>();
  const [jobTitle, setJobTitle] = useState("");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  /** Puts a deleted saved search back where it was. */
  function restoreSavedSearch(job: SavedSearch, index: number) {
    setJobs((current) => {
      if (current.some((item) => item.id === job.id)) return current;
      const at = Math.max(0, Math.min(index, current.length));
      return [...current.slice(0, at), job, ...current.slice(at)];
    });
    toast.say("Saved search restored.");
  }

  // Preserve old browser records, but never show seeded inventory as real offers.
  const expiredReleases = new Set(messages.deals
    .filter((deal) => deal.outcome?.kind === "pickup_expired")
    .filter((deal) => !messages.deals.some((other) =>
      other.listingId === deal.listingId && other.status === "agreed"))
    .map(({ listingId }) => listingId));
  const releasePending = !account && own.some((item) =>
    item.status === "reserved" && expiredReleases.has(item.id));
  const releaseKey = releasePending ? [...expiredReleases].sort().join(",") : "";
  useEffect(() => {
    if (!releaseKey) return;
    const ids = new Set(releaseKey.split(","));
    void setOwn((items) => items.map((item) =>
      item.status === "reserved" && ids.has(item.id) ? { ...item, status: "active" } : item));
  }, [releaseKey, setOwn]);
  const localListings = own.map((item): Product =>
    releasePending && item.status === "reserved" && expiredReleases.has(item.id)
      ? { ...item, status: "active" } : item
  ).filter((item) =>
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
  const sell = useSellSession({
    view,
    signedIn,
    cloud: Boolean(account),
    configured,
    initialLocation: searchArea.location,
    own,
    setOwn,
    savingListings: database.pending > 0,
    toast,
    navigate,
    openMyListings: () => {
      setAccountTab("listings");
      navigate("account");
    },
  });
  const { draft, listing } = sell;
  const savedSearches = jobs.filter((job) => job.id !== "seed-search");
  const watches = useWatches({
    jobs,
    setJobs,
    watched: savedSearches,
    listings: visibleListings,
    ready: database.ready,
    location,
  });
  const savedListings = visibleListings
    .filter((item) => favorites.includes(item.id))
    .map((item) => savedListing(item, savedPrices));
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
  const pageKey = pageKeyFor({
    view,
    home: isHome,
    accountTab,
    sellMode: sell.mode,
    sellStep: sell.step,
    selectedId,
  });
  const pageScroll = usePageScroll(pageKey, () => {
    if (pageKey === "home" && focusSearchOnHome.current) {
      focusSearchOnHome.current = false;
      searchField.current?.focus({ preventScroll: true });
    } else if (document.activeElement === document.body)
      mainContent.current?.focus({ preventScroll: true });
  });
  const reviewingListing =
    !isHome && committedSearch?.intent === "listing_review";
  const resultCriteria = committedSearch?.criteria ?? criteria;
  /** The search area as Pako names it while he searches. */
  const searchPlace = committedSearch
    ? placeName(committedSearch.location)
    : undefined;
  const compactPreferences = compactPreferencesOf(resultCriteria);
  const activePreferences =
    committedSearch && !reviewingListing
      ? activePreferencesOf(committedSearch)
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
        if (sell.mode === "batch") return "Sell several items";
        return sell.step === 1 ? "New listing" : "Your listing";
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
  /** Leaving a page stops the work it started and saves where it was scrolled. */
  function leavePage(from: View, to: View) {
    pageScroll.remember();
    // A listing opened from the chat is a side trip: the agent keeps working
    // and the conversation is still there on the way back.
    const sideTrip = [from, to].every(
      (page) => page === "discover" || page === "detail",
    );
    if (!sideTrip) {
      searchRunToken.current += 1;
      agentRun.cancel();
    }
    sell.stop();
    photoSearchRequest.current?.abort();
    photoSearchRequest.current = null;
    setPhotoSearchBusy(false);
    // A note belongs to the page it was raised on.
    toast.show(null);
  }
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
    toast.show({
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
    toast.show({
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
    pageScroll.forget("home");
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
    sell.startAt(pickupRegion || location);
  }
  /** Applies the visitor's intro answers and opens what they chose to do first. */
  function completeOnboarding(outcome: OnboardingOutcome) {
    const area = "location" in outcome ? outcome.location : undefined;
    rememberOnboarding(area ? { location: area } : {});
    if (area) setSearchArea((current) => ({ ...current, location: area }));
    if (outcome.next === "sign-in") navigate("settings");
    else if (outcome.next === "sell") sell.startAt(outcome.location);
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
  const currentDestination = destinationFor(view, accountTab);
  function openDestination(destination: Destination) {
    transitionPage(destinationDirection(currentDestination, destination), () => {
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
    if (sell.hasDraft()) navigate("sell");
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
  const openProduct = nav.openListing;
  async function toggleFavorite(id: string) {
    if (!signedIn) {
      navigate("settings");
      return;
    }
    const adding = !favorites.includes(id);
    const stored = await setFavorites(
      (current) => current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
      localListings.find((item) => item.id === id),
    );
    if (!stored) return;
    if (adding)
      toast.show({
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
      toast.show((notice) =>
        notice?.savedFavorite === id ? null : notice,
      );
  }
  const openComparison = nav.openComparison;
  function toggleCompare(id: string) {
    setCompared((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        toast.say("Compare up to three listings.");
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
  function applyFilterForm() {
    const current = committedSearchRef.current;
    const next = preferenceSearch(
      normalizedFilterDraft, current?.location ?? location, current ?? undefined,
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
    setModal(null);
    if (!change) return;
    storeSearch({ ...current, criteria: { ...after, category: before.category } });
    setLocalPreferences(change);
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
    sell.pause();
    nav.showSearch();
    setModal(null);
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
          } catch (error) {
            toast.say(error instanceof Error ? error.message : "Couldn't discard the offer draft.");
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
      toast.show({
        message: `“${query}” is already a saved search.`,
        mood: "search",
      });
      return;
    }
    toast.show({
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
    toast.say("Search saved in this browser.");
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
      toast.say(statusFailure(status));
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
    toast.say("Browser data cleared.");
  }
  async function setStatus(id: string, status: Product["status"]) {
    const listing = own.find((item) => item.id === id);
    if (!listing) throw new Error(`Listing ${id} is not among your listings.`);
    if (!(await applyListingStatus(id, status))) {
      toast.say(statusFailure(status));
      return;
    }
    if (status === "withdrawn")
      setCompared((current) => current.filter((item) => item !== id));
    toast.show({
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
  const listingConversation = (
    <ListingConversation
      listing={listing}
      draft={draft}
      starting={sell.starting}
      editing={Boolean(sell.editingListing)}
      saveAction={saveActionLabel({
        cloud: Boolean(account),
        editing: Boolean(sell.editingListing),
        batch: sell.batch,
      })}
      configured={configured}
      asleep={quotaExhausted}
      onManual={sell.fillInDetails}
    />
  );
  const productCard = (item: Product, arriving = false, footer?: ReactNode) => (
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
      footer={footer}
    />
  );
  const savedCard = (item: SavedListing) =>
    productCard(
      item,
      false,
      <SavedNote
        item={item}
        reservedForYou={myReservations.has(item.id)}
        onFindSimilar={() =>
          void runSearch(item.title, { ...criteria, category: item.category })
        }
      />,
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
            ? sell.mode === "batch"
              ? " selling-batch-layout"
              : sell.step === 2
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
                        const ranked = (
                          turn.inventoryMatchIds ?? []
                        ).flatMap((id) => {
                          const item = activeListings.find(
                            (listing) => listing.id === id,
                          );
                          return item ? [item] : [];
                        });
                        const locallyFiltered = !archived && Boolean(localPreferences) && committedSearch;
                        const localMatches = locallyFiltered
                          ? refilterCatalog(activeListings, ranked, committedSearch.criteria)
                          : ranked;
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
                              !reviewingListing && ((turn.inventoryMatchIds !== null && localMatches.length > 0) || locallyFiltered) ? (
                                <>
                                  {locallyFiltered && (
                                    <div className="agent-run-changes">
                                      <p role="status">
                                        {localPreferences} {localMatches.length} takeover{" "}
                                        {localMatches.length === 1 ? "match" : "matches"}.
                                      </p>
                                      <details>
                                        <summary>Why?</summary>
                                        <p>
                                          Your new preferences were applied to the takeover catalog.
                                          Earlier web links and Pako's reply are from the original search.
                                        </p>
                                      </details>
                                    </div>
                                  )}
                                  {localMatches.length > 0 && (
                                    <AgentListings
                                      listings={localMatches}
                                      order={resultOrder(turn.status)}
                                      onOpen={openProduct}
                                      onOffer={openOfferCard}
                                    />
                                  )}
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
                    toast.show({
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

            {view === "sell" && sell.mode === "batch" && (
              <PageTransitionView>
                <LazyBoundary label="Loading selling">
                  <BatchSellFlow
                    location={location}
                    liveAgent={configured}
                    quota={healthError ? undefined : agentHealth?.quota}
                    onAccount={() => navigate("settings")}
                    start={sell.batchStart}
                    onBack={sell.leaveBatch}
                    onStart={sell.startBatchListings}
                  />
                </LazyBoundary>
                {connectionStatus}
              </PageTransitionView>
            )}
            <WorkspacePage active={view === "sell" && sell.mode === "single"}>
              <>
                <LazyBoundary label="Loading selling">
                  <SellFlow
                    draft={draft}
                    step={sell.step}
                    editing={!!sell.editingListing}
                    pickupMin={listingPickupMinimum(draft.pickup, sell.editingItem)}
                    busy={(sell.busy && !sell.starting) || database.pending > 0}
                    cloud={!!account}
                    photoReading={sell.photoReading}
                    uploadError={sell.uploadError}
                    liveAgent={configured}
                    photoInsight={sell.analysis.insight}
                    pakoAbsence={pakoAbsence}
                    pakoBack={quotaResets || undefined}
                    manual={sell.manual}
                    onFillIn={sell.fillInDetails}
                    onRetryPako={refreshHealth}
                    onBack={() =>
                      transitionPage("nav-back", () => sell.back(openBrowse))
                    }
                    onDraftChange={listing.editDraft}
                    agentWorking={sell.starting || listing.running}
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
                          sell.editingListing ?? undefined,
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
                    onPhotoSelected={sell.upload}
                    onCreateDraft={() => void sell.generateDraft()}
                    sortFailed={sell.analysis.sortFailed}
                    onSeparate={sell.separateItems}
                    onKeepTogether={sell.analysis.keepTogether}
                    onSortYourself={() =>
                      sell.separateItems(
                        listingPhotos(sell.draftRef.current).map((_, index) => ({
                          photos: [index],
                          label: "",
                        })),
                        true,
                      )
                    }
                    onNotesDone={sell.analysis.flushNote}
                    onPublish={sell.publish}
                    batch={sell.batch}
                    onSellSeveral={sell.inBatch ? undefined : sell.sellSeveral}
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
                  backLabel={detailBackLabel(detailOrigin, searching, accountTab)}
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
                  onEdit={() => selected && sell.editListing(selected)}
                  onAskAgent={() => {
                    if (!selected) return;
                    sell.editListing(selected);
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
                    onBack={nav.leaveComparison}
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
                  pushRoute(accountTabHash(tab));
                }}
                visibleListings={visibleListings.filter(isMine)}
                cloud={!!account}
                savedListings={savedListings}
                archivedListings={archivedListings.filter(isMine)}
                onSell={startSell}
                onBrowse={openBrowse}
                onOpen={openProduct}
                onEdit={sell.editListing}
                onStatusChange={setStatus}
                renderSaved={savedCard}
                publishedIds={sell.publishedListings}
                onCelebrationEnd={sell.clearPublished}
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
        message={toast.notice?.message || ""}
        placement={bottomDocked ? "top" : "bottom"}
        mood={toast.notice?.mood}
        action={toast.notice?.action}
        onDismiss={() => toast.say("")}
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
              applyFilterForm();
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
              <Button animateIcon className="button primary" type="submit" disabled={running}>
                Apply preferences
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
                browser. Nothing reaches another student until you sell.publish a
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
