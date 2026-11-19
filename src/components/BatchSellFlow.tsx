import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Sparkles, Trash2, X } from "@/components/icons";
import {
  MAX_BATCH_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "../../shared/listingPhotos";
import type { AgentQuota, PhotoGroup } from "../../shared/agent";
import {
  batchItem,
  itemsFromGroups,
  movePhoto,
  removePhoto,
  type BatchItem,
} from "../batchListings";
import { readListingPhoto, sortListingPhotos } from "../listingPhotos";
import type { ListingDraft } from "./SellFlow";
import { PickupLocationInput } from "./PickupLocationInput";
import SnapTarget from "./SnapTarget";
import WorkspaceHeader from "./WorkspaceHeader";
import Guide, { type GuideBubble } from "./onboarding/Guide";
import type { PakoMood } from "./onboarding/storyTypes";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import "./batch-sell.css";

type Stage = "photos" | "items";

export type BatchStart = {
  photos: string[];
  groups: PhotoGroup[];
  /** Open the sorting check first, e.g. after the seller corrected the item count. */
  review?: boolean;
  /** Items already sorted, e.g. the ones left when the seller returns from the agent. */
  items?: BatchItem[];
};

type Props = {
  location: string;
  liveAgent: boolean;
  quota?: AgentQuota;
  onAccount: () => void;
  /** Return to the single-listing flow. */
  onBack: () => void;
  /** Create the listings one after another together with the listing agent. */
  onStart: (drafts: ListingDraft[]) => void;
  /** Photos from the single-item flow that the seller chose to split. */
  start?: BatchStart;
};

/** Drafting one item takes Pako two requests: reading its photos and writing the listing. */
const REQUESTS_PER_ITEM = 2;
/** A photo glides to the pile it was moved to. */
const GLIDE = { type: "spring", stiffness: 420, damping: 34 } as const;

/** Prefill each item's title with the name the photo sorting gave it. */
const withTitles = (items: BatchItem[]) =>
  items.map((item) =>
    item.draft.title
      ? item
      : { ...item, draft: { ...item.draft, title: item.label } },
  );
const titleEdited = (item: BatchItem) =>
  Boolean(item.draft.title.trim()) &&
  item.draft.title.trim() !== item.label.trim();

/** What Pako says above the photos or piles: what to do next, or what he is busy with. */
function batchGuide({
  stage,
  photoCount,
  pileCount,
  reading,
  sorting,
  sortFailed,
}: {
  stage: Stage;
  photoCount: number;
  pileCount: number;
  reading: boolean;
  sorting: boolean;
  sortFailed: boolean;
}): { mood: PakoMood; bubble: GuideBubble } {
  if (sorting)
    return {
      mood: "work",
      bubble: {
        id: "sorting",
        title: "Sorting your photos…",
        text: "I'm finding which photos show the same thing.",
      },
    };
  if (reading)
    return {
      mood: "work",
      bubble: { id: "reading", text: "Loading your photos…" },
    };
  if (stage === "items")
    return {
      mood: "happy",
      bubble: {
        id: `piles-${pileCount}`,
        title: pileCount === 1 ? "1 pile" : `${pileCount} piles`,
        text: "Move a photo if I mixed something up. Then I'll write the listings.",
      },
    };
  if (sortFailed)
    return {
      mood: "think",
      bubble: {
        id: "sort-failed",
        text: "I couldn't sort these. Try again, or make one listing per photo.",
      },
    };
  if (photoCount)
    return {
      mood: "idle",
      bubble: {
        id: "photos",
        title: photoCount === 1 ? "1 photo" : `${photoCount} photos`,
        text: "Add more, or let me sort them into one pile per item.",
      },
    };
  return {
    mood: "wave",
    bubble: {
      id: "empty",
      title: "Snap everything you're selling",
      text: "One thing or many: I'll sort the photos into one pile per item.",
    },
  };
}

/** How many of the piles today's AI allowance can still draft, when it cannot draft them all. */
function allowanceNote(quota: AgentQuota | undefined, piles: number) {
  if (!quota || quota.remaining >= piles * REQUESTS_PER_ITEM) return "";
  const drafts = Math.floor(quota.remaining / REQUESTS_PER_ITEM);
  return `Today's AI allowance covers about ${drafts} of ${piles} drafts. You can finish the others by hand.`;
}

export default function BatchSellFlow({
  location,
  liveAgent,
  quota,
  onAccount,
  onBack,
  onStart,
  start,
}: Props) {
  const [stage, setStage] = useState<Stage>(start ? "items" : "photos");
  const [photos, setPhotos] = useState<string[]>(start?.photos ?? []);
  const [pickupLocation, setPickupLocation] = useState(location);
  const [items, setItemsState] = useState<BatchItem[]>(() =>
    start
      ? (start.items ??
        withTitles(itemsFromGroups(start.photos, start.groups, location)))
      : [],
  );
  const itemsRef = useRef(items);
  function setItems(update: (current: BatchItem[]) => BatchItem[]) {
    itemsRef.current = update(itemsRef.current);
    setItemsState(itemsRef.current);
  }
  const [reading, setReading] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [error, setError] = useState("");
  const [sortFailed, setSortFailed] = useState(false);
  const requests = useRef(new AbortController());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Created per mount so a StrictMode remount does not inherit an aborted signal.
  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    return () => controller.abort();
  }, []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  async function addPhotos(files: File[]) {
    if (!files.length || reading) return;
    if (photos.length + files.length > MAX_BATCH_PHOTOS) {
      setError(`Add up to ${MAX_BATCH_PHOTOS} photos at once.`);
      return;
    }
    setError("");
    setReading(true);
    try {
      const added: string[] = [];
      for (const file of files)
        added.push(await readListingPhoto(file, requests.current.signal));
      setPhotos((current) => [...new Set([...current, ...added])]);
    } catch (error) {
      if (!requests.current.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Could not read these photos. Try again.",
        );
    } finally {
      setReading(false);
    }
  }

  async function sortPhotos() {
    if (!photos.length || sorting) return;
    setError("");
    setSortFailed(false);
    setSorting(true);
    try {
      const groups = await sortListingPhotos(photos, requests.current.signal);
      setItems(() =>
        withTitles(itemsFromGroups(photos, groups, pickupLocation)),
      );
      setStage("items");
    } catch (error) {
      if (requests.current.signal.aborted) return;
      setError(
        error instanceof Error
          ? error.message
          : "Could not sort the photos. Try again.",
      );
      setSortFailed(true);
    } finally {
      setSorting(false);
    }
  }

  function onePerPhoto() {
    setItems(() => photos.map((photo) => batchItem([photo], pickupLocation)));
    setError("");
    setSortFailed(false);
    setStage("items");
  }

  function updateItem(id: string, update: (item: BatchItem) => BatchItem) {
    setItems((current) =>
      current.map((item) => (item.id === id ? update(item) : item)),
    );
  }

  function startListings() {
    if (!itemsRef.current.length) return;
    onStart(
      itemsRef.current.map((item) => ({
        ...item.draft,
        // Only a title the seller wrote is kept; otherwise the agent names it.
        title: titleEdited(item) ? item.draft.title.trim() : "",
        raw: "",
      })),
    );
  }

  function back() {
    if (stage === "items") setStage("photos");
    else if (stage === "photos") onBack();
  }

  const fileInput = useRef<HTMLInputElement>(null);
  const guide = batchGuide({
    stage,
    photoCount: photos.length,
    pileCount: items.length,
    reading,
    sorting,
    sortFailed,
  });
  const photoKey = (photo: string) => `batch-photo-${photos.indexOf(photo)}`;
  const note = allowanceNote(quota, items.length);

  return (
    <>
      <WorkspaceHeader
        title="Sell several things"
        subtitle={stage === "photos" ? "1 of 2 · Photos" : "2 of 2 · Piles"}
        titleRef={headingRef}
        backLabel={stage === "photos" ? "Sell one thing" : "Back to photos"}
        onBack={back}
        onAccount={onAccount}
        quota={quota}
      />
      <div className="batch-guide">
        <Guide mood={guide.mood} layout="guide" bubble={guide.bubble} />
      </div>

      {stage === "photos" && (
        <div className="batch-photos" aria-busy={reading || sorting}>
          <div
            className="batch-photo-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!sorting)
                void addPhotos(Array.from(event.dataTransfer.files));
            }}
          >
            {photos.length ? (
              <>
                <ul className="batch-photo-grid" aria-label="Your photos">
                  {photos.map((photo, index) => (
                    <li key={photo}>
                      <img src={photo} alt={`Photo ${index + 1}`} />
                      <Button
                        className="icon-button batch-photo-remove"
                        aria-label={`Remove photo ${index + 1}`}
                        disabled={sorting}
                        onClick={() =>
                          setPhotos((current) =>
                            current.filter((image) => image !== photo),
                          )
                        }
                      >
                        <X size={15} aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="batch-photo-actions">
                  <Button
                    className="button secondary small"
                    disabled={
                      reading || sorting || photos.length >= MAX_BATCH_PHOTOS
                    }
                    onClick={() => fileInput.current?.click()}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add photos
                  </Button>
                  <span className="quiet-caption">
                    {photos.length} of {MAX_BATCH_PHOTOS} photos
                  </span>
                </div>
                <Input
                  ref={fileInput}
                  type="file"
                  hidden
                  tabIndex={-1}
                  aria-hidden="true"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    void addPhotos(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </>
            ) : (
              <SnapTarget
                disabled={reading || sorting}
                maxPhotos={MAX_BATCH_PHOTOS}
                onFilesSelected={(files) => void addPhotos(files)}
              />
            )}
          </div>
          <div className="batch-photo-side">
            <PickupLocationInput
              value={pickupLocation}
              disabled={sorting}
              onChange={setPickupLocation}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button
              animateIcon
              className="button primary large full"
              disabled={!photos.length || reading || sorting || !liveAgent}
              onClick={() => void sortPhotos()}
            >
              <Sparkles size={18} aria-hidden="true" />
              {sorting ? "Sorting photos…" : "Sort into piles"}
            </Button>
            {(sortFailed || !liveAgent) && photos.length > 0 && (
              <Button className="button secondary full" onClick={onePerPhoto}>
                One listing per photo
              </Button>
            )}
            <p className="quiet-caption">
              {liveAgent
                ? "Smaller copies of your photos are sent to the AI service to find which ones show the same item."
                : "Connect the AI service to sort photos and draft listings."}
            </p>
          </div>
        </div>
      )}

      {stage === "items" && (
        <div className="batch-review">
          <ol className="batch-items">
            {items.map((item, index) => (
              <li key={item.id} className="batch-item">
                <h2>Pile {index + 1}</h2>
                <label className="batch-item-title">
                  Title
                  <Input
                    maxLength={180}
                    value={item.draft.title}
                    placeholder="Pako suggests one if you leave this empty"
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        draft: { ...current.draft, title: event.target.value },
                      }))
                    }
                  />
                </label>
                <ul className="batch-item-photos">
                  {item.draft.images!.map((photo, photoIndex) => (
                    <motion.li
                      key={photo}
                      layoutId={photoKey(photo)}
                      transition={GLIDE}
                    >
                      <img
                        src={photo}
                        alt={`Pile ${index + 1}, photo ${photoIndex + 1}`}
                      />
                      {photoIndex === 0 && (
                        <span className="batch-cover">Cover</span>
                      )}
                      <div className="batch-photo-controls">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button className="button secondary small" />
                            }
                            aria-label={`Move photo ${photoIndex + 1} of pile ${index + 1}`}
                          >
                            Move
                            <ChevronDown size={14} aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {items.map(
                              (target, targetIndex) =>
                                target.id !== item.id && (
                                  <DropdownMenuItem
                                    key={target.id}
                                    disabled={
                                      target.draft.images!.length >=
                                      MAX_LISTING_PHOTOS
                                    }
                                    onClick={() =>
                                      setItems((current) =>
                                        movePhoto(
                                          current,
                                          photo,
                                          target.id,
                                          pickupLocation,
                                        ),
                                      )
                                    }
                                  >
                                    To pile {targetIndex + 1}
                                    {target.draft.title.trim() &&
                                      ` · ${target.draft.title.trim()}`}
                                  </DropdownMenuItem>
                                ),
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                setItems((current) =>
                                  movePhoto(
                                    current,
                                    photo,
                                    null,
                                    pickupLocation,
                                  ),
                                )
                              }
                            >
                              To a new pile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          className="icon-button"
                          aria-label={`Remove photo ${photoIndex + 1} of pile ${index + 1}`}
                          onClick={() =>
                            setItems((current) => removePhoto(current, photo))
                          }
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="batch-footer">
            {note && <p className="batch-allowance">{note}</p>}
            <Button
              animateIcon
              className="button primary large"
              disabled={!items.length || !liveAgent}
              onClick={startListings}
            >
              <Sparkles size={18} aria-hidden="true" />
              {items.length === 1
                ? "Write the listing with Pako"
                : `Write ${items.length} listings with Pako`}
            </Button>
            <p className="quiet-caption">
              One at a time: Pako drafts each one and asks what&apos;s missing.
              You set the price.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
