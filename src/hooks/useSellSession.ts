import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import type { PhotoGroup } from "../../shared/agent";
import { listingPhotos, MAX_LISTING_PHOTOS } from "../../shared/listingPhotos";
import { isMine, type Product } from "../../shared/marketplace";
import { batchItem, itemsFromGroups } from "../batchListings";
import type { BatchStart } from "../components/BatchSellFlow";
import {
  draftFromListing,
  emptyDraft,
  type BatchProgress,
  type ListingDraft,
} from "../listingDraft";
import {
  listingDraftReady,
  listingFromDraft,
  prepareListingDraft,
} from "../listingPreparation";
import { readListingPhoto } from "../listingPhotos";
import { listingSaveWords } from "../listingSaveWords";
import type { View } from "../navigation";
import { randomUuid } from "../randomUuid";
import { batchStepNote } from "../sellingCelebration";
import type { Toasts } from "./useToast";
import { useListingAnalysis } from "./useListingAnalysis";
import { useListingConversation } from "./useListingConversation";

/** Several sorted items, created one after another with the listing agent. */
type BatchQueue = {
  drafts: ListingDraft[];
  index: number;
  results: ("saved" | "skipped")[];
  /** The listings this batch has saved so far, celebrated together at the end. */
  savedIds: string[];
  /** Pako's line about the listing just finished, which the batch tray shows. */
  note?: string;
};

export type SellSession = ReturnType<typeof useSellSession>;

/**
 * Selling: the listing being written, its photos, Pako's draft and
 * conversation, editing a published listing, and several items in a row.
 */
export function useSellSession({
  view,
  signedIn,
  cloud,
  configured,
  initialLocation,
  own,
  setOwn,
  savingListings,
  toast,
  navigate,
  openMyListings,
}: {
  view: View;
  signedIn: boolean;
  /** Listings are published to accounts rather than saved in this browser. */
  cloud: boolean;
  /** Pako can be asked right now. */
  configured: boolean;
  initialLocation: string;
  own: Product[];
  setOwn: (update: SetStateAction<Product[]>) => Promise<boolean>;
  /** Listing changes are still being saved. */
  savingListings: boolean;
  toast: Toasts;
  navigate: (view: View) => void;
  openMyListings: () => void;
}) {
  const draftId = useRef(randomUuid());
  const draftRef = useRef<ListingDraft>(emptyDraft(initialLocation));
  const [draft, setDraftState] = useState<ListingDraft>(draftRef.current);
  function setDraft(value: SetStateAction<ListingDraft>) {
    const next = typeof value === "function" ? value(draftRef.current) : value;
    draftRef.current = next;
    setDraftState(next);
  }
  const listing = useListingConversation({ draftRef, setDraft });
  const [step, setStep] = useState(1);
  /** The student fills in the listing's details themselves, without Pako. */
  const [manual, setManual] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [batchStart, setBatchStart] = useState<BatchStart | undefined>();
  const [batchQueue, setBatchQueue] = useState<BatchQueue | null>(null);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  /** Listings that were just published; My listings celebrates them briefly. */
  const [publishedListings, setPublishedListings] = useState<string[]>([]);
  const hasSellingDraft = useRef(view === "sell");
  const [photoReading, setPhotoReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const listingRequest = useRef<AbortController | null>(null);
  const imageReader = useRef<AbortController | null>(null);
  const editingItem = own.find((item) => item.id === editingListing);
  const analysis = useListingAnalysis({
    photos: listingPhotos(draft),
    note: draft.raw,
    location: draft.location,
    active:
      view === "sell" &&
      mode === "single" &&
      step === 1 &&
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

  function cancelPhotoRead() {
    imageReader.current?.abort();
    imageReader.current = null;
    setPhotoReading(false);
  }
  /** Stops Pako's work on the listing and any photo still loading. */
  function pause() {
    listing.cancel();
    listingRequest.current?.abort();
    cancelPhotoRead();
  }
  function startAt(pickupLocation: string) {
    draftId.current = randomUuid();
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (view === "sell") return;
    hasSellingDraft.current = true;
    navigate("sell");
    listing.resetForNewDraft();
    setDraft(emptyDraft(pickupLocation));
    setStep(1);
    setManual(false);
    setMode("single");
    setBatchStart(undefined);
    setBatchQueue(null);
    setEditingListing(null);
    setUploadError("");
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
      setStep(2);
      const response = await analysis.ensure({
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
      setStep(1);
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
    if (listing.running || savingListings || busy) return;
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (!listingDraftReady(draft, editingItem)) {
      toast.say(
        `Check the listing details before ${listingSaveWords(cloud).gerund}.`,
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
      toast.say(
        `Couldn't ${listingSaveWords(cloud).verb.toLowerCase()} the listing. Your draft is still here; see the note above and try again.`,
      );
      return;
    }
    if (batchQueue && !editingListing) {
      finishBatchItem("saved", item);
      return;
    }
    hasSellingDraft.current = false;
    openMyListings();
    // A new listing is celebrated on My listings; only edits get a toast.
    if (editingListing)
      toast.say(cloud ? "Listing updated." : "Changes saved on this device.");
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
    setManual(!configured);
    setStep(configured ? 1 : 2);
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
    setMode("single");
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
        cloud,
      });
      setBatchQueue({ ...batchQueue, index, results, savedIds, note });
      openBatchItem(batchQueue.drafts[index]);
      return;
    }
    setBatchQueue(null);
    hasSellingDraft.current = false;
    openMyListings();
    if (savedIds.length) setPublishedListings(savedIds);
    else toast.show({ message: "No listings saved.", mood: "idle" });
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
    setMode("batch");
  }
  function editListing(item: Product) {
    if (!isMine(item)) return;
    if (item.status === "withdrawn") return;
    hasSellingDraft.current = true;
    navigate("sell");
    listing.resetForNewDraft();
    setBatchQueue(null);
    setEditingListing(item.id);
    setDraft(draftFromListing(item));
    setStep(2);
    setMode("single");
    setManual(false);
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
    setMode("batch");
  }
  /** Goes on to the details without Pako, keeping what he made of the photos in step 1. */
  function fillInDetails() {
    const insight =
      step === 1 && analysis.insight.status === "ready"
        ? analysis.insight.response
        : undefined;
    listingRequest.current?.abort();
    listing.cancel();
    setDraft((current) => {
      const prepared = insight
        ? prepareListingDraft(current, insight.metadata)
        : current;
      return {
        ...prepared,
        description: prepared.description.trim() || current.raw,
      };
    });
    setManual(true);
    setStep(2);
  }
  /** Back from the details returns to the photos; elsewhere it leaves selling. */
  function back(openBrowse: () => void) {
    if (step === 2 && !editingListing) {
      listingRequest.current?.abort();
      listing.resetConversation();
      setManual(false);
      setStep(1);
    } else if (editingListing) navigate("account");
    else if (batchQueue) backToBatchSorting();
    else openBrowse();
  }

  /** Pako still reads the photos in step 2, before his first run of the listing starts. */
  const starting = busy && step === 2 && !listing.state.id;
  const batch: BatchProgress | undefined =
    batchQueue && !editingListing
      ? {
          index: batchQueue.index,
          covers: batchQueue.drafts.map((item) => item.image),
          results: batchQueue.results,
          note: batchQueue.note,
          onSkip: () => finishBatchItem("skipped"),
        }
      : undefined;

  return {
    draft,
    draftRef,
    listing,
    analysis,
    step,
    mode,
    manual,
    batchStart,
    inBatch: batchQueue !== null,
    batch,
    editingListing,
    editingItem,
    uploadError,
    photoReading,
    busy,
    starting,
    publishedListings,
    clearPublished: () => setPublishedListings([]),
    /** A listing is being written, so Sell returns to it instead of starting over. */
    hasDraft: () => hasSellingDraft.current,
    startAt,
    pause,
    /** Leaving selling stops its work. */
    stop() {
      pause();
      setBusy(false);
    },
    upload,
    generateDraft,
    publish,
    startBatchListings,
    editListing,
    separateItems,
    fillInDetails,
    back,
    leaveBatch() {
      setBatchStart(undefined);
      setMode("single");
    },
    sellSeveral() {
      cancelPhotoRead();
      setUploadError("");
      setBatchStart(undefined);
      setMode("batch");
    },
  };
}
