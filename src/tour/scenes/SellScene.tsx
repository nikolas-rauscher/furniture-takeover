import { AnimatePresence } from "motion/react";
import { Fragment, useEffect, useRef, type SetStateAction } from "react";
import { emptyFavorites } from "../../api/favorites";
import { MarketplaceDataContext } from "../../marketplaceData";
import type { AgentListingPatchEvent } from "../../../shared/actions";
import type { Product, SavedListing } from "../../../shared/marketplace";
import type { AgentRunEvent } from "../../../shared/runs";
import AccountPage from "../../components/AccountPage";
import AskPakoMenu, { LISTING_REQUESTS } from "../../components/AskPakoMenu";
import ListingConversation from "../../components/ListingConversation";
import SellFlow from "../../components/SellFlow";
import {
  answerAgentQuestion,
  answerLocalQuestion,
  applyAgentRunEvent,
  beginAgentRun,
  emptyAgentRunState,
  type AgentRunState,
} from "../../hooks/useAgentRun";
import type { PhotoInsight } from "../../hooks/useListingAnalysis";
import { startingListingTurn } from "../../hooks/useListingConversation";
import { ListingsContext } from "../../hooks/useMarketplaceListings";
import type { ListingDraft } from "../../listingDraft";
import { pendingPrice, PICKUP_QUESTION } from "../../listingQuestions";
import { saveActionLabel } from "../../listingSaveWords";
import { transitionPage } from "../../pageTransition";
import { report } from "../device/sceneMessages";
import AppScreen, { INERT, type ScenePage } from "./AppScreen";
import { DESK } from "./findScript";
import { stream, now, type Beat, type SceneProps } from "./sceneScript";
import {
  CHOSEN_PRICE,
  draftFromPhoto,
  EMPTY_DRAFT,
  listingGap,
  PHOTO_READING,
  PRICE_EVENTS,
  withPhoto,
  WRITING_EVENTS,
} from "./sellScript";
import SceneCamera, { type CameraStage } from "./SceneCamera";
import TouchMark from "./TouchMark";
import { useSceneScript } from "./useSceneScript";

type Page = "photo" | "writing" | "listings";

type SellState = {
  page: Page;
  camera: CameraStage | "closed";
  draft: ListingDraft;
  insight: PhotoInsight;
  run: AgentRunState;
  /** Pako's changes that went into the draft. */
  applied: string[];
};

const PAGES: Record<Page, ScenePage> = {
  photo: { key: "photo", view: "sell", destination: "sell", sellStep: 1 },
  writing: { key: "writing", view: "sell", destination: "sell", sellStep: 2 },
  listings: { key: "listings", view: "account", destination: "account" },
};

const initial = (): SellState => ({
  page: "photo",
  camera: "closed",
  draft: EMPTY_DRAFT,
  insight: { status: "reading", noteOnly: false },
  run: emptyAgentRunState(),
  applied: [],
});

/** Pako's changes that need no decision go straight into the draft, as in the app. */
function applyEvent(state: SellState, event: AgentRunEvent): SellState {
  const run = applyAgentRunEvent(state.run, event);
  if (event.type !== "listing_patch" || event.requiresAcceptance)
    return { ...state, run };
  return {
    ...state,
    run,
    draft: { ...state.draft, ...describe(event) },
    applied: [...state.applied, event.id],
  };
}

function describe(event: AgentListingPatchEvent): Partial<ListingDraft> {
  const { description } = event.patch;
  if (description === undefined)
    throw new Error("The example only writes the description by itself.");
  return { description };
}

const SAVE = ".listing-save-form button[type='submit']";

/** The camera slides away before the photo lands in the listing. */
const CAMERA_CLOSE_MS = 420;

const BEATS: Beat<SellState>[] = [
  {
    hold: 1900,
    press: ".snap-target-shutter",
    mood: "listen",
    changes: now((state) => ({ ...state, camera: "aiming" })),
  },
  { hold: 2500, tap: ".tour-camera-shutter" },
  {
    hold: 1800,
    tap: ".tour-camera-use",
    mood: "work",
    changes: [
      {
        delay: CAMERA_CLOSE_MS,
        apply: (state) => ({ ...state, draft: withPhoto(state.draft) }),
      },
    ],
  },
  {
    hold: 1700,
    mood: "happy",
    changes: now((state) => ({
      ...state,
      insight: { status: "ready", response: PHOTO_READING, note: "" },
    })),
  },
  { hold: 2600, tap: ".sell-photo-footer button[type='submit']", mood: "work" },
  {
    hold: 300,
    changes: stream(WRITING_EVENTS, listingGap, applyEvent),
  },
  {
    hold: 1200,
    tap: ".listing-tray-choices .listing-tray-choice:first-child",
    mood: "happy",
  },
  { hold: 400, changes: stream(PRICE_EVENTS, listingGap, applyEvent) },
  {
    hold: 2400,
    slide: {
      selector: ".price-slider-track",
      values: [36, 37, 38, 39, CHOSEN_PRICE],
    },
  },
  { hold: 1100, tap: ".price-card-use", mood: "cheer" },
  { hold: 2200, tap: SAVE, mood: "love" },
];

/** Pako's side of the listing as the conversation and its tray use it, kept in the scene. */
function sceneListing(
  state: SellState,
  setState: (update: SetStateAction<SellState>) => void,
) {
  const { run } = state;
  const queue = [PICKUP_QUESTION, ...run.questions];
  const activeQuestion = queue.find((question) => !run.answers[question.id]);
  const answer = (id: string, reply: string, draft: Partial<ListingDraft>) => {
    setState((current) => ({
      ...current,
      run:
        id === PICKUP_QUESTION.id
          ? answerLocalQuestion(current.run, PICKUP_QUESTION, reply)
          : answerAgentQuestion(current.run, id, reply),
      draft: { ...current.draft, ...draft },
    }));
    return true;
  };
  return {
    state: run,
    running: run.status === "running",
    input: "",
    setInput: INERT,
    queue,
    activeQuestion,
    answeredBefore: 0,
    askingOwnQuestion: activeQuestion?.id === PICKUP_QUESTION.id,
    tapError: null,
    priceReviews: 0,
    appliedIds: state.applied,
    undoneIds: [],
    notices: {},
    accept: INERT,
    undo: INERT,
    undoAnswer: INERT,
    send: async () => undefined,
    retry: INERT,
    cancel: INERT,
    resetConversation: INERT,
    choose: (id: string, label: string) =>
      answer(id, label, {
        pickup: label,
        description: `${state.draft.description} Pickup on ${label.toLowerCase()}.`,
      }),
    choosePrice: (id: string, price: number) =>
      answer(id, `CHF ${price}`, { price: String(price) }),
    choosePickupDate: () => false,
    skip: () => false,
    decideLater: () => false,
  };
}

/** The listing as My listings shows it once it is saved on this device. */
const savedListing = (draft: ListingDraft): Product => ({
  ...DESK,
  id: "tour-saved-desk",
  own: true,
  seller: "You",
  price: Number(draft.price),
  description: draft.description,
});

/** No deal changes in this example: a tap that tried one would say so. */
function noDeals(): never {
  throw new Error("The example changes no deals.");
}

const SCENE_DATA = {
  favorites: {
    initial: emptyFavorites,
    update: async () => emptyFavorites(),
  },
  deals: { submit: noDeals, pickup: noDeals, listingAgreement: noDeals },
  ListingsProvider: Fragment,
  InboxProvider: Fragment,
};

function MyListings({ listing }: { listing: Product }) {
  const catalog = useRef({
    listings: [listing],
    setListings: async () => true,
    ready: true,
    error: "",
    pending: 0,
    retry: INERT,
    addDemo: async () => true,
    canShow: () => true,
    dealStatusOwner: "browser" as const,
    refreshOnDealChange: false,
  });
  return (
    <MarketplaceDataContext value={SCENE_DATA}>
      <ListingsContext value={catalog.current}>
        <AccountPage
          loaded
          accountTab="listings"
          setAccountTab={INERT}
          visibleListings={[listing]}
          savedListings={[]}
          archivedListings={[]}
          onSell={INERT}
          onBrowse={INERT}
          onOpen={INERT}
          onEdit={INERT}
          onStatusChange={INERT}
          renderSaved={(item: SavedListing) => item.title}
          publishedIds={[listing.id]}
          onCelebrationEnd={INERT}
        />
      </ListingsContext>
    </MarketplaceDataContext>
  );
}

const PAKO_READY = {
  configured: true,
  absence: undefined,
  quota: undefined,
  quotaResets: "",
  refresh: INERT,
};

/** The page's status bar turns light while the camera covers the screen. */
function useCameraReport(open: boolean) {
  useEffect(() => {
    if (!open) return;
    report({ kind: "camera", open: true });
    return () => report({ kind: "camera", open: false });
  }, [open]);
}

/** Sell: the photo taken with the phone's camera, Pako's reading of it, his questions, the price and Save on this device. */
export default function SellScene({ onEnd }: SceneProps) {
  const { state, setState, touch } = useSceneScript(initial, BEATS, onEnd);
  const go = (page: Page, change: (current: SellState) => SellState) =>
    transitionPage("nav-forward", () =>
      setState((current) => ({ ...change(current), page })),
    );
  const listing = sceneListing(state, setState);
  const working = state.run.status === "running";
  useCameraReport(state.camera !== "closed");
  return (
    <>
      <AppScreen page={PAGES[state.page]}>
        {state.page === "listings" ? (
          <MyListings listing={savedListing(state.draft)} />
        ) : (
          <SellFlow
            cloud={false}
            draft={state.draft}
            step={state.page === "photo" ? 1 : 2}
            editing={false}
            pickupMin=""
            busy={false}
            uploadError=""
            pako={PAKO_READY}
            manual={false}
            photoAnalysis={{
              reading: false,
              insight: state.insight,
              sortFailed: false,
              onSeparate: INERT,
              onKeepTogether: INERT,
              onSortYourself: INERT,
            }}
            price={{
              insight: null,
              suggested: pendingPrice(
                [...state.run.history, state.run],
                state.draft,
              ),
            }}
            agent={{
              conversation: (
                <ListingConversation
                  listing={listing}
                  draft={state.draft}
                  starting={false}
                  editing={false}
                  saveAction={saveActionLabel({ cloud: false, editing: false })}
                  configured
                  asleep={false}
                  onManual={INERT}
                />
              ),
              tools: (
                <AskPakoMenu
                  requests={LISTING_REQUESTS}
                  disabled={working}
                  onAsk={INERT}
                />
              ),
              working,
            }}
            onAccount={INERT}
            onBack={INERT}
            onDraftChange={INERT}
            onPhotoSelected={INERT}
            onCreateDraft={() =>
              go("writing", (current) => ({
                ...current,
                draft: draftFromPhoto(current.draft),
                run: beginAgentRun(
                  emptyAgentRunState(),
                  startingListingTurn.request,
                  "tour-listing",
                ),
              }))
            }
            onFillIn={INERT}
            onSellSeveral={INERT}
            onNotesDone={INERT}
            onPublish={(event) => {
              event.preventDefault();
              go("listings", (current) => current);
            }}
          />
        )}
      </AppScreen>
      <AnimatePresence>
        {state.camera !== "closed" && (
          <SceneCamera
            stage={state.camera}
            onShoot={() =>
              setState((current) => ({ ...current, camera: "taken" }))
            }
            onUse={() =>
              setState((current) => ({ ...current, camera: "closed" }))
            }
          />
        )}
      </AnimatePresence>
      <TouchMark touch={touch} />
    </>
  );
}
