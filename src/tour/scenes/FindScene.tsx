import { useRef } from "react";
import { SquarePen } from "@/components/icons";
import AgentComposer from "../../components/AgentComposer";
import AgentConversation from "../../components/AgentConversation";
import AgentListings, { canOffer } from "../../components/AgentListings";
import AgentQuickReplies from "../../components/AgentQuickReplies";
import AgentRunPanel from "../../components/AgentRunPanel";
import ListingDetailPage from "../../components/ListingDetailPage";
import ProductCard from "../../components/ProductCard";
import WorkspaceHeader from "../../components/WorkspaceHeader";
import {
  applyAgentRunEvent,
  beginAgentRun,
  emptyAgentRunState,
  type AgentRunState,
} from "../../hooks/useAgentRun";
import { SEARCH_HEADING } from "../../navigation";
import { homeGuide, turnAnnouncement } from "../../pakoMoods";
import type { PageTransitionEffect } from "@/components/animate-ui/components/page-transition";
import { transitionPage } from "../../pageTransition";
import { quickReplies } from "../../quickReplies";
import { defaults, TODAY, type Product } from "../../../shared/marketplace";
import type { AgentRunEvent } from "../../../shared/runs";
import { newSearch, type SearchSnapshot } from "../../searchRequest";
import { activePreferences, compactPreferences } from "../../searchSummary";
import HomeFeed from "../../shell/HomeFeed";
import HomeSearch from "../../shell/HomeSearch";
import AppScreen, { INERT, type ScenePage } from "./AppScreen";
import {
  AREA,
  DESK,
  NEARBY,
  ANSWER_EVENTS,
  MATCHING_EVENTS,
  REQUEST,
  SEARCH_RESULTS,
  searchGap,
} from "./findScript";
import { now, stream, typing, type Beat, type SceneProps } from "./sceneScript";
import { startThread, type SceneThread } from "./sceneThread";
import SceneMarks from "./SceneMarks";
import { useSceneScript } from "./useSceneScript";
import SceneMessages, { OPEN_THREAD } from "./SceneMessages";

type Page = "home" | "chat" | "listing" | "thread";

type FindState = {
  page: Page;
  query: string;
  search: SearchSnapshot | null;
  run: AgentRunState;
  /** Pako picked his matches: their cards are in, before his answer. */
  matchesShown: boolean;
  thread: SceneThread;
};

const PAGES: Record<Page, ScenePage> = {
  home: { key: "home", view: "discover", home: true, destination: "browse" },
  chat: { key: "search", view: "discover", destination: "browse" },
  listing: { key: "listing", view: "detail", destination: "browse" },
  thread: { key: "thread", view: "messages", destination: "messages" },
};

const initial = (): FindState => ({
  page: "home",
  query: "",
  search: null,
  run: emptyAgentRunState(),
  matchesShown: false,
  thread: startThread("tour-find", DESK),
});

/** Pako's search events, as they arrive. */
const streamed = (events: AgentRunEvent[]) =>
  stream(events, searchGap, (state: FindState, event) => ({
    ...state,
    run: applyAgentRunEvent(state.run, event),
  }));

const BEATS: Beat<FindState>[] = [
  {
    hold: 1400,
    tap: ".agent-search textarea",
    mood: "listen",
    changes: typing(REQUEST, (state, query) => ({ ...state, query })),
  },
  { hold: 700, tap: '.agent-search button[type="submit"]', mood: "search" },
  // Opening Pako's activity shows each step as it ticks off.
  {
    hold: 700,
    tap: '.agent-run-details [data-slot="trace-collapsible-trigger"]',
  },
  { hold: 150, changes: streamed(MATCHING_EVENTS) },
  // The cards come in once Pako has picked them, and his answer follows below them.
  {
    hold: 400,
    changes: now((state) => ({ ...state, matchesShown: true })),
    show: ".agent-product-slide:first-child",
  },
  { hold: 1200, changes: streamed(ANSWER_EVENTS) },
  {
    hold: 3200,
    tap: ".agent-product-slide:first-child .agent-product-title",
    mood: "happy",
  },
  { hold: 2600, tap: ".listing-detail-offer", mood: "work" },
  {
    hold: 3000,
    tap: '.offer-editor button[type="submit"]',
    cue: "Tap Send offer",
    mood: "cheer",
    show: ".thread-deal",
  },
];

const NO_PHOTO = {
  busy: false,
  dragging: false,
  setDragging: INERT,
  hint: false,
  setHint: INERT,
  notice: null,
  active: null,
};

function listingCard(item: Product) {
  return (
    <ProductCard
      key={item.id}
      product={item}
      favorite={false}
      compared={false}
      onOpen={INERT}
      onToggleFavorite={INERT}
      onToggleCompare={INERT}
    />
  );
}

function Home({ state, onSearch }: { state: FindState; onSearch: () => void }) {
  const field = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <HomeSearch
        search={{
          query: state.query,
          setQuery: INERT,
          field,
          photo: NO_PHOTO,
          searchByPhoto: async () => undefined,
          running: false,
        }}
        pako={{ configured: true, quotaExhausted: false }}
        guide={homeGuide({
          allowanceUsed: false,
          photo: null,
          deal: null,
          unreadMatches: 0,
          suggestionsLoading: false,
          typing: state.query !== "",
          location: AREA,
        })}
        suggestions={{
          status: "idle",
          response: null,
          error: null,
          retry: INERT,
        }}
        location={AREA}
        footnote={null}
        actions={{
          onSearch,
          onOpenArea: INERT,
          onSeeMatches: INERT,
          onSell: INERT,
        }}
      />
      <HomeFeed
        negotiations={{ error: "", items: [] }}
        offers={{
          own: [],
          running: false,
          review: INERT,
          continue: INERT,
          discard: INERT,
        }}
        deals={[]}
        onOpenDeal={INERT}
        onSeeAllDeals={INERT}
        notices={null}
        listings={{
          visible: NEARBY,
          settled: true,
          render: listingCard,
        }}
        cloud={false}
        webSearch={false}
      />
    </>
  );
}

/** The search conversation, put together as the app's search chat does on a phone. */
function SearchTurn({
  search,
  run,
  matchesShown,
  onOpen,
}: {
  search: SearchSnapshot;
  run: AgentRunState;
  matchesShown: boolean;
  onOpen: (item: Product) => void;
}) {
  const place = "Vortex";
  return (
    <>
      <WorkspaceHeader
        title={SEARCH_HEADING}
        backLabel="New search"
        backIcon={<SquarePen size={20} aria-hidden="true" />}
        onBack={INERT}
        onAccount={INERT}
        preferences={{
          summary: activePreferences(search),
          compactSummary: compactPreferences(search.criteria),
          onOpen: INERT,
        }}
        save={{ disabled: run.status === "running", onSave: INERT }}
      />
      <AgentConversation
        state={run}
        announcement={turnAnnouncement(run, place)}
        requestTransitionName="agent-query"
        footer={
          <AgentComposer
            value=""
            onChange={INERT}
            onSend={INERT}
            label="Ask Pako"
            placeholder="Ask a follow-up…"
            sendLabel="Send to Pako"
            disabled={run.status === "running"}
            onStop={run.status === "running" ? INERT : undefined}
          />
        }
      >
        {(turn) => {
          const replies = quickReplies({
            turn,
            latest: true,
            search,
            negotiating: false,
            watching: false,
            listings: SEARCH_RESULTS.map((item) => ({
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
              place={place}
              className="search-agent-message"
              showHistory={false}
              splitSearchResults
              quickReplies={
                replies.replies.length > 0 && (
                  <AgentQuickReplies {...replies} onSelect={INERT} />
                )
              }
              localListings={
                matchesShown && (
                  <AgentListings
                    listings={SEARCH_RESULTS}
                    order="ranked"
                    onOpen={onOpen}
                    onOffer={onOpen}
                  />
                )
              }
              onCancel={INERT}
              onRetry={INERT}
              onReset={INERT}
              onAnswer={INERT}
              onSkipQuestion={INERT}
              onApplyAction={INERT}
              onUndoAction={INERT}
            />
          );
        }}
      </AgentConversation>
    </>
  );
}

function OfferThread({
  thread,
  onThread,
}: {
  thread: SceneThread;
  onThread: (thread: SceneThread) => void;
}) {
  return (
    <SceneMessages
      thread={thread}
      onThread={onThread}
      role="buyer"
      otherName={DESK.seller}
      now={new Date()}
      inbox={OPEN_THREAD}
      pakoAwake
      offerRequest={1}
    />
  );
}

const unchanged = (state: FindState) => state;

/** The app searches 5 km around the student's area unless they change it. */
const AREA_CRITERIA = { ...defaults, radius: 5 };

/** Find: a request typed on Home, Pako's search, the desk's page and the offer card. */
export default function FindScene({ onEnd }: SceneProps) {
  const { state, setState, marks } = useSceneScript(initial, BEATS, onEnd);
  const go = (
    page: Page,
    change: (current: FindState) => FindState = unchanged,
    effect?: PageTransitionEffect,
  ) =>
    transitionPage(
      "nav-forward",
      () => setState((current) => ({ ...change(current), page })),
      effect,
    );
  return (
    <>
      <AppScreen page={PAGES[state.page]}>
        {state.page === "home" && (
          <Home
            state={state}
            onSearch={() =>
              go("chat", (current) => ({
                ...current,
                search: newSearch(current.query, AREA_CRITERIA, AREA),
                run: beginAgentRun(
                  emptyAgentRunState(),
                  current.query,
                  "tour-search",
                ),
              }))
            }
          />
        )}
        {state.page === "chat" && state.search && (
          <SearchTurn
            search={state.search}
            run={state.run}
            matchesShown={state.matchesShown}
            onOpen={() => go("listing")}
          />
        )}
        {state.page === "listing" && (
          <ListingDetailPage
            selected={DESK}
            loaded
            catalog={NEARBY}
            renderProduct={listingCard}
            backLabel="Back to search"
            onBack={INERT}
            onMessage={INERT}
            // The app fades from a listing into its offer card.
            onOffer={() => go("thread", unchanged, "fade")}
            onOpenChat={INERT}
            onEdit={INERT}
            onAskAgent={INERT}
          />
        )}
        {state.page === "thread" && (
          <OfferThread
            thread={state.thread}
            onThread={(thread) =>
              setState((current) => ({ ...current, thread }))
            }
          />
        )}
      </AppScreen>
      <SceneMarks {...marks} />
    </>
  );
}
