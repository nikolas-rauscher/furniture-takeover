import {
  accountTabHash,
  detailBackLabel,
  pageKey as pageKeyFor,
  pageTitle,
  layoutClassName,
  type View,
} from "./navigation";
import type { AccountConnection } from "./cloud/connection";
import { useMarketplaceListings } from "./hooks/useMarketplaceListings";
import { useAppViewport } from "./hooks/useAppViewport";
import { useWindowScrolled } from "./hooks/useWindowScrolled";
import AccountScreen from "./shell/AccountScreen";
import DetailScreen from "./shell/DetailScreen";
import SavedSearchesScreen from "./shell/SavedSearchesScreen";
import WorkspacePage from "./components/WorkspacePage";
import SearchChat from "./shell/SearchChat";
import { type OfferCards } from "./shell/ProposalCard";
import { useMessagesInbox } from "./hooks/useMessagesInbox";
import { useNegotiations } from "./hooks/useNegotiations";
import { useEffect, useRef, useState, type ReactNode } from "react";
import AppFooter from "./shell/AppFooter";
import { useToast } from "./hooks/useToast";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { usePageScroll } from "./hooks/usePageScroll";
import { useSellSession } from "./hooks/useSellSession";
import { useSearchSession } from "./hooks/useSearchSession";
import { useThreadRequests } from "./hooks/useThreadRequests";
import { useInboxDeals } from "./hooks/useInboxDeals";
import { useSavedSearches } from "./hooks/useSavedSearches";
import { useMyListings } from "./hooks/useMyListings";
import { usePakoStatus } from "./hooks/usePakoStatus";
import { connectionNotice } from "./shell/connectionNotice";
import AppHeader from "./shell/AppHeader";
import AppDialogs, { type Dialog } from "./shell/AppDialogs";
import SettingsScreen from "./shell/SettingsScreen";
import MessagesScreen from "./shell/MessagesScreen";
import ListingsStatus from "./shell/ListingsStatus";
import ListingCard, { type ListingCards } from "./shell/ListingCard";
import HomeFeed from "./shell/HomeFeed";
import HomeSearch from "./shell/HomeSearch";
import { BatchSellPage, SellPage } from "./shell/SellScreen";
import { usePickupRegion } from "./cloud/usePickupRegion";
import { useComparison } from "./hooks/useComparison";
import { useSavedItems } from "./hooks/useSavedItems";
import { useDeveloperMode } from "./availability/useDeveloperMode";
import { useAgentRun } from "./hooks/useAgentRun";
import { useHomeGuide } from "./hooks/useHomeGuide";
import { useSaved } from "./hooks/useSaved";
import { isSearchArea, restoreSearch } from "./searchRequest";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { useAvailability } from "./availability/useAvailability";
import { type Product, type SavedListing } from "../shared/marketplace";
import SavedNote from "./components/SavedNote";
import { transitionPage } from "./pageTransition";
import {
  PageTransition,
  PageTransitionView,
} from "./components/animate-ui/components/page-transition";
import type { OnboardingOutcome } from "./components/onboarding/Onboarding";
import { rememberOnboarding } from "./components/onboarding/onboardingStorage";
import { introFocusTarget } from "./components/onboarding/introFocus";
import AdminEntry from "./components/admin/AdminEntry";
import { useAdmin } from "./api/admin";
import { AdminArea, ComparePage } from "./screens";
import Report from "./cloud/Report";
import LazyBoundary from "./components/LazyBoundary";
import { useScreenPrefetch } from "./hooks/useScreenPrefetch";
import { useDestinations } from "./hooks/useDestinations";
import { workspaceClearer } from "./shell/workspaceClearer";
import { useIntro } from "./hooks/useIntro";
import { readLastSearch } from "./lastSearch";
import IntroLayer from "./shell/IntroLayer";
import "./cloud/account.css";

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
  const [pickupRegion, setPickupRegion] = usePickupRegion(account);
  const [lastSearch] = useState(readLastSearch);
  const agentRun = useAgentRun(lastSearch?.run);
  const negotiations = useNegotiations();
  const pako = usePakoStatus(signedIn);
  const nav = useAppNavigation({
    signedIn,
    onLeave: leavePage,
    onNavigate: () => setModal(null),
    onHistoryRoute: (route) => threads.followRoute(route),
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
  const threads = useThreadRequests({
    signedIn,
    initialRoute: nav.initialRoute,
    navigate,
    pushRoute,
    replaceRoute,
  });
  const messages = useMessagesInbox({
    open: view === "messages",
    aiConfigured: pako.health?.configured,
  });
  /** A thread's note on Pako's reading led to Settings, which then open where that choice is. */
  const [readingSettingsRequested, setReadingSettingsRequested] =
    useState(false);
  useEffect(() => {
    if (view !== "settings") setReadingSettingsRequested(false);
  }, [view]);
  const helpButton = useRef<HTMLButtonElement>(null);
  const intro = useIntro({
    outcome: introOutcome,
    onComplete: completeOnboarding,
  });
  const [searchArea, setSearchArea] = useSaved(
    "takeover-search-area",
    { location: intro.record?.location ?? "EPFL, Ecublens", radius: 5 },
    isSearchArea,
  );
  const location = searchArea.location;
  const [modal, setModal] = useState<Dialog>(null);
  const database = useMarketplaceListings();
  const catalog = useMyListings({
    database,
    deals: messages.deals,
    toast,
    onArchived: (id) => compare.remove(id),
  });
  const { own } = catalog;
  /** Listings show once they have loaded, or once loading failed and the status says why. */
  const listingsSettled = database.ready || database.error !== "";
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
    setStatus: catalog.setStatus,
    setToast: toast.say,
    onFindSimilar: (title) => void search.runSearch(title),
  });
  const sell = useSellSession({
    view,
    signedIn,
    cloud: Boolean(account),
    configured: pako.configured,
    initialLocation: searchArea.location,
    own,
    setOwn: catalog.setOwn,
    savingListings: database.pending > 0,
    toast,
    navigate,
    openMyListings: () => {
      setAccountTab("listings");
      navigate("account");
    },
  });
  const { listing } = sell;
  const search = useSearchSession({
    agentRun,
    restored: lastSearch,
    negotiations,
    location,
    radius: searchArea.radius,
    signedIn,
    quotaExhausted: pako.quotaExhausted,
    activeListings: catalog.active,
    toast,
    openSignIn: () => navigate("settings"),
    showResults: nav.showSearch,
    closeDialog: () => setModal(null),
    pauseSelling: sell.pause,
    onDraftDiscarded: threads.forget,
  });
  const savedSearchList = useSavedSearches({
    search,
    location,
    listings: catalog.visible,
    ready: database.ready,
    toast,
    onSearchesPage: view === "searches",
    openSearches: () => openDestination("searches"),
    closeDialog: () => setModal(null),
  });
  const { watches, saved: savedSearches } = savedSearchList;
  const savedItems = useSavedItems({
    signedIn,
    listings: catalog.visible,
    toast,
    openSignIn: () => navigate("settings"),
    openSaved: () => openDestination("favorites"),
  });
  const selected = catalog.listings.find((item) => item.id === selectedId);
  const deals = useInboxDeals({
    messages,
    own,
    listingsReady: database.ready,
    elsewhere: view !== "messages",
    toast,
    reloadListings: database.retry,
    openDeal: threads.openDeal,
  });
  const selectedDeal = deals.buyerDeal(selected);
  const compare = useComparison({
    listings: catalog.visible,
    toast,
    openComparison: nav.openComparison,
  });
  useScreenPrefetch({
    account,
    view,
    comparing: compare.ids.length >= 2,
    introInvited: intro.mode === "invite",
  });
  const searchIsHome = !search.searching;
  const isHome = view === "discover" && searchIsHome;
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
    if (pageKey === "home" && search.takeHomeFocus()) return;
    if (document.activeElement === document.body)
      mainContent.current?.focus({ preventScroll: true });
  });
  useDocumentTitle(
    pageTitle({
      view,
      home: isHome,
      reviewing: !isHome && search.committedSearch?.intent === "listing_review",
      accountTab,
      sellMode: sell.mode,
      sellStep: sell.step,
      listingTitle: selected?.title,
      accounts: !account ? "none" : signedIn ? "signed-in" : "signed-out",
    }),
  );
  const { suggestions: searchAssist, guide: heroGuide } = useHomeGuide({
    search,
    pako,
    home: isHome,
    location,
    firstDeal: deals.homeDeals.at(0),
    unreadMatches: watches.unread,
    now: messages.now,
  });
  const destinations = useDestinations({
    nav,
    sell,
    search,
    threads,
    signedIn,
    sellFrom: pickupRegion || location,
    onHome: () => pageScroll.forget("home"),
  });
  const { goHome, startSell, openBrowse } = destinations;
  const currentDestination = destinations.current;
  const openDestination = destinations.open;
  /** Leaving a page stops the work it started and saves where it was scrolled. */
  function leavePage(from: View, to: View) {
    pageScroll.remember();
    // A listing opened from the chat is a side trip: the agent keeps working
    // and the conversation is still there on the way back.
    const sideTrip = [from, to].every(
      (page) => page === "discover" || page === "detail",
    );
    search.leave(sideTrip);
    sell.stop();
    // A note belongs to the page it was raised on.
    toast.show(null);
  }
  const openMessages = threads.open;
  const openOfferCard = threads.openOffer;
  const openDealThread = threads.openDeal;
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
      search.setQuery(outcome.query);
      search.searchSoon(outcome.query);
    }
  }
  function introFocus(outcome: OnboardingOutcome) {
    return introFocusTarget(outcome, helpButton.current, mainContent.current);
  }
  const openProduct = nav.openListing;
  const offers: OfferCards = {
    own,
    running: search.running,
    review: (proposal, item) => {
      negotiations.activate(proposal.id);
      if (item) openMessages(item.id, proposal);
    },
    continue: search.continueOffer,
    discard: search.discardOffer,
  };
  const clearWorkspace = workspaceClearer({
    catalog,
    savedItems,
    savedSearches: savedSearchList,
    compare,
    search,
    messages,
    toast,
    setSearchArea,
    goHome,
  });
  const cards: ListingCards = {
    shown: deals.shownListing,
    reservedForMe: deals.reservedForMe,
    saved: savedItems.ids,
    compared: compare.ids,
    open: openProduct,
    toggleSaved: (id) =>
      void savedItems.toggle(
        id,
        catalog.listings.find((item) => item.id === id),
      ),
    toggleCompared: compare.toggle,
    availability: availability?.cardAvailability,
  };
  const productCard = (item: Product, arriving = false, footer?: ReactNode) => (
    <ListingCard
      key={item.id}
      item={item}
      arriving={arriving}
      footer={footer}
      cards={cards}
    />
  );
  const savedCard = (item: SavedListing) =>
    productCard(
      item,
      false,
      <SavedNote
        item={item}
        reservedForYou={deals.reservedForMe.has(item.id)}
        onFindSimilar={() =>
          void search.runSearch(item.title, {
            ...search.criteria,
            category: item.category,
          })
        }
      />,
    );

  // A signed-in account has a daily allowance; its chip's row is held while it loads.
  const allowanceExpected =
    Boolean(account) && signedIn && !pako.health && !pako.error;
  const connectionStatus = connectionNotice({
    pako,
    signInNeeded: Boolean(account) && !signedIn,
    turnFailed: agentRun.state.status === "error",
    onSignIn: () => navigate("settings"),
  });

  return (
    <>
      <ListingsStatus database={database} savedError={savedItems.error} />
      <AppHeader
        scrolled={pageScrolled}
        destination={currentDestination}
        settingsOpen={view === "settings"}
        badges={{
          savedSearches: savedSearches.length,
          unreadMatches: watches.unread,
          unreadMessages: messages.unread,
        }}
        settingsLabel={
          account
            ? signedIn
              ? "Open account settings"
              : "Sign in"
            : "Open browser settings"
        }
        helpButton={helpButton}
        onHome={() => transitionPage("nav-back", goHome)}
        onNavigate={openDestination}
        onHelp={intro.open}
      />
      <div
        className={layoutClassName({
          view,
          home: isHome,
          sellMode: sell.mode,
          sellStep: sell.step,
        })}
      >
        <PageTransition container={mainContent}>
          <main
            ref={mainContent}
            tabIndex={-1}
            className={"main-content view-" + view}
          >
            {view === "settings" && (
              <PageTransitionView>
                <SettingsScreen
                  account={account}
                  reading={{
                    enabled: messages.autoRead,
                    unavailable: messages.autoReadUnavailable,
                    onChange: messages.setAutoRead,
                    first: readingSettingsRequested,
                  }}
                  developer={{
                    enabled: developerMode,
                    onChange: setDeveloperMode,
                    clockOffsetMs: availability?.clockOffsetMs,
                    onResetDemo: availability?.resetDemo,
                  }}
                  connectionStatus={connectionStatus}
                  adminEntry={adminEntry}
                  onAddDemo={
                    developerMode ? () => void database.addDemo() : undefined
                  }
                  onProfileSaved={setPickupRegion}
                  onHelp={() => setModal("help")}
                  onClear={() => setModal("clear")}
                  onSignedIn={() => navigate("settings")}
                />
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
              <MessagesScreen
                messages={messages}
                threads={threads}
                negotiations={negotiations}
                listings={{ own, shown: deals.shownListing }}
                developerMode={developerMode}
                location={location}
                onListingStatus={catalog.followDealStatus}
                threadBanner={availability?.threadBanner}
                actions={{
                  onBrowse: () => openDestination("browse"),
                  onOpenListing: openProduct,
                  onReadingSettings: () => {
                    setReadingSettingsRequested(true);
                    openDestination("settings");
                  },
                  onFindSimilar: (title) => void search.runSearch(title),
                  onDeleted: () => replaceRoute("#messages"),
                  onThreadOpened: threads.showThread,
                }}
              />
            </WorkspacePage>
            <WorkspacePage
              active={view === "discover"}
              pageKey={searchIsHome ? "home" : "search"}
            >
              <>
                {searchIsHome ? (
                  <HomeSearch
                    search={search}
                    pako={pako}
                    guide={heroGuide}
                    suggestions={searchAssist}
                    location={location}
                    footnote={
                      connectionStatus ??
                      (allowanceExpected && (
                        <div
                          className="agent-footnote agent-footnote-pending"
                          aria-hidden="true"
                        />
                      ))
                    }
                    actions={{
                      onSearch: destinations.startSearchFromHome,
                      onOpenArea: () => setModal("location"),
                      onSeeMatches: () => openDestination("searches"),
                      onSell: startSell,
                    }}
                  />
                ) : (
                  <SearchChat
                    search={search}
                    agentRun={agentRun}
                    negotiations={negotiations}
                    pako={pako}
                    listings={{ active: catalog.active, own }}
                    watches={watches}
                    comparison={{
                      items: compare.items,
                      onCompare: nav.openComparison,
                      onClear: compare.clear,
                    }}
                    footnote={connectionStatus}
                    offers={offers}
                    actions={{
                      onNewSearch: destinations.startNewSearch,
                      onAccount: () => navigate("settings"),
                      onOpenFilters: () => {
                        search.setFilterDraft(search.criteria);
                        setModal("filters");
                      },
                      onSave: () => {
                        savedSearchList.startSaving();
                        setModal("save");
                      },
                      onOpenListing: openProduct,
                      onOffer: openOfferCard,
                      onCompare: compare.show,
                      onOpenSearches: () => openDestination("searches"),
                      onReset: goHome,
                    }}
                  />
                )}
                {searchIsHome && (
                  <HomeFeed
                    negotiations={negotiations}
                    offers={offers}
                    deals={deals.homeDeals}
                    onOpenDeal={openDealThread}
                    onSeeAllDeals={() => openDestination("messages")}
                    notices={availability?.notices()}
                    listings={{
                      visible: catalog.visible,
                      settled: listingsSettled,
                      render: productCard,
                    }}
                    cloud={Boolean(account)}
                    webSearch={pako.health?.webSearchConfigured}
                  />
                )}
              </>
            </WorkspacePage>

            {view === "searches" && (
              <PageTransitionView>
                <SavedSearchesScreen
                  savedSearches={savedSearchList}
                  location={location}
                  radius={searchArea.radius}
                  loaded={listingsSettled}
                  onOpenListing={openProduct}
                  onFind={goHome}
                  onRun={(job) => {
                    const restored = restoreSearch(job, location);
                    setSearchArea({
                      location: restored.location,
                      radius: restored.criteria.radius,
                    });
                    void search.performSearch(restored);
                  }}
                  onEdit={(job) => {
                    savedSearchList.startEditing(job);
                    setModal("edit-search");
                  }}
                />
              </PageTransitionView>
            )}

            {view === "sell" && sell.mode === "batch" && (
              <PageTransitionView>
                <BatchSellPage
                  sell={sell}
                  pako={pako}
                  location={location}
                  footnote={connectionStatus}
                  onAccount={() => navigate("settings")}
                />
              </PageTransitionView>
            )}
            <WorkspacePage active={view === "sell" && sell.mode === "single"}>
              <SellPage
                sell={sell}
                pako={pako}
                cloud={Boolean(account)}
                savingListings={database.pending > 0}
                market={{
                  listings: catalog.visible,
                  savedSearches,
                  developerMode,
                }}
                footnote={connectionStatus}
                onBack={() =>
                  transitionPage("nav-back", () => sell.back(openBrowse))
                }
                onAccount={() => navigate("settings")}
              />
            </WorkspacePage>

            {view === "detail" && (
              <PageTransitionView key={`listing-${selectedId}`}>
                {!selected && selectedId && availability?.notices(selectedId)}
                <DetailScreen
                  selected={selected}
                  deal={selectedDeal?.view}
                  cloud={Boolean(account)}
                  reportAction={
                    account?.session && selected && !selected.own ? (
                      <Report client={account.client} listingId={selected.id} />
                    ) : undefined
                  }
                  cards={cards}
                  catalog={{
                    listings: catalog.listings,
                    settled: listingsSettled,
                    render: productCard,
                  }}
                  availabilityPanel={
                    selected &&
                    availability?.detailPanel(selected, () =>
                      openMessages(selected.id),
                    )
                  }
                  backLabel={detailBackLabel(
                    detailOrigin,
                    search.searching,
                    accountTab,
                  )}
                  actions={{
                    onBack: () =>
                      transitionPage("nav-back", () => navigate(detailOrigin)),
                    onMessage: (item) => openMessages(item.id),
                    onOffer: (item) =>
                      transitionPage(
                        "nav-forward",
                        () => openOfferCard(item),
                        "fade",
                      ),
                    onEdit: sell.editListing,
                    onAskAgent: (item) => {
                      sell.editListing(item);
                      void listing.send(
                        "Review my supplied listing and help me improve it. Ask about missing facts; do not invent them.",
                      );
                    },
                    onOpenChat: () =>
                      selectedDeal && openDealThread(selectedDeal.item),
                  }}
                />
              </PageTransitionView>
            )}

            {view === "compare" && (
              <PageTransitionView>
                <LazyBoundary label="Loading the comparison">
                  <ComparePage
                    loaded={listingsSettled}
                    items={compare.items}
                    onBack={nav.leaveComparison}
                    onOpen={openProduct}
                    onRemove={compare.toggle}
                  />
                </LazyBoundary>
              </PageTransitionView>
            )}

            <WorkspacePage active={view === "account"} pageKey={accountTab}>
              <AccountScreen
                tab={accountTab}
                loaded={listingsSettled}
                cloud={Boolean(account)}
                catalog={catalog}
                saved={{ listings: savedItems.listings, render: savedCard }}
                sell={sell}
                agreementFor={deals.agreementFor}
                actions={{
                  onTab: (tab) => {
                    setAccountTab(tab);
                    pushRoute(accountTabHash(tab));
                  },
                  onSell: startSell,
                  onBrowse: openBrowse,
                  onOpen: openProduct,
                }}
              />
            </WorkspacePage>
          </main>
        </PageTransition>
      </div>

      <AppFooter
        destination={currentDestination}
        pageKey={pageKey}
        badges={{
          unreadMatches: watches.unread,
          unreadMessages: messages.unread,
        }}
        onNavigate={openDestination}
        compare={compare}
        trayVisible={
          !modal && (view === "account" || view === "detail" || isHome)
        }
        onCompare={nav.openComparison}
        toast={toast}
        toastOnTop={bottomDocked}
      />
      {availability?.overlay}

      <AppDialogs
        dialog={modal}
        onClose={() => setModal(null)}
        search={search}
        savedSearches={savedSearchList}
        area={{ location, radius: search.criteria.radius }}
        onArea={(area) => {
          setSearchArea(area);
          search.setCriteria((current) => ({
            ...current,
            radius: area.radius,
          }));
          setModal(null);
        }}
        onClear={() => void clearWorkspace()}
      />
      <IntroLayer
        mode={intro.mode}
        paused={onboardingPaused}
        accountAction={!signedIn}
        onComplete={completeOnboarding}
        finalFocus={introFocus}
        intro={intro}
      />
    </>
  );
}
