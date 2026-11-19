import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "@/components/icons";
import {
  MAX_BATCH_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "../../shared/listingPhotos";
import type { AgentQuota, PhotoGroup } from "../../shared/agent";
import {
  batchItem,
  itemsCovered,
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

/** A photo glides to the pile it was moved to. */
const GLIDE = { type: "spring", stiffness: 420, damping: 34 } as const;
/**
 * A pile that lost its last photo keeps its place until the photo has landed in its
 * new pile, then folds away, so the piles and the button below follow the finished
 * layout instead of jumping under the moving photo.
 */
/** The space between two piles, which a folding pile takes back with it. */
const PILE_GAP = 14;
const FOLD = {
  opacity: 0,
  height: 0,
  paddingTop: 0,
  paddingBottom: 0,
  borderWidth: 0,
  marginBottom: -PILE_GAP,
  transition: {
    delay: 0.3,
    duration: 0.34,
    ease: [0.65, 0, 0.35, 1],
  },
} as const;
/** With reduced motion the pile only fades, and the layout settles at once. */
const FADE = { opacity: 0, transition: { duration: 0.16 } } as const;

/** What a pile is called: the name Pako gave its item, or its number. */
const pileName = (item: BatchItem, index: number) =>
  item.label.trim() || `Pile ${index + 1}`;

/** What Pako says above the photos or piles: what to do next, or what he is busy with. */
function batchGuide({
  stage,
  photoCount,
  pileCount,
  reading,
  sorting,
  sortFailed,
  manual,
}: {
  stage: Stage;
  photoCount: number;
  pileCount: number;
  reading: boolean;
  sorting: boolean;
  sortFailed: boolean;
  /** Pako cannot be reached, so the student fills in each listing. */
  manual: boolean;
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
  const piles = pileCount === 1 ? "1 pile" : `${pileCount} piles`;
  if (stage === "items")
    return manual
      ? {
          mood: "idle",
          bubble: {
            id: `manual-piles-${pileCount}`,
            title: piles,
            text: "Move a photo if two piles show the same thing. Then you fill in each listing, one at a time.",
          },
        }
      : {
          mood: "happy",
          bubble: {
            id: `piles-${pileCount}`,
            title: piles,
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
        id: manual ? "manual-photos" : "photos",
        title: photoCount === 1 ? "1 photo" : `${photoCount} photos`,
        text: manual
          ? "I can't sort photos right now. Make one listing per photo, then move any that belong together."
          : "Add more, or let me sort them into one pile per item.",
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

/**
 * One pile as a card: its name, an optional title, and its photos, each with a way
 * to move it to another pile or remove it. A pile folding away clips what it holds.
 */
function BatchPile({
  item,
  name,
  targets,
  liveAgent,
  photoKey,
  onTitle,
  onMove,
  onRemove,
}: {
  item: BatchItem;
  name: string;
  /** The other piles a photo can move to. */
  targets: { id: string; name: string; full: boolean }[];
  liveAgent: boolean;
  photoKey: (photo: string) => string;
  onTitle: (title: string) => void;
  /** Moves a photo to the pile with that id, or to a new pile. */
  onMove: (photo: string, target: string | null) => void;
  onRemove: (photo: string) => void;
}) {
  const present = useIsPresent();
  const reduced = useReducedMotion() === true;
  return (
    <motion.li
      className="batch-item"
      data-folding={!present || undefined}
      exit={reduced ? FADE : FOLD}
    >
      <h2>{name}</h2>
      <label className="batch-item-title">
        <span className="batch-item-title-label">
          Title
          <span className="sell-field-optional">Optional</span>
        </span>
        <Input
          maxLength={180}
          value={item.draft.title}
          placeholder={
            liveAgent
              ? "Pako names it if you leave this empty"
              : "You can name it in the next step"
          }
          onChange={(event) => onTitle(event.target.value)}
        />
      </label>
      <ul className="batch-item-photos">
        {item.draft.images!.map((photo, photoIndex) => (
          <motion.li key={photo} layoutId={photoKey(photo)} transition={GLIDE}>
            <img src={photo} alt={`${name}, photo ${photoIndex + 1}`} />
            {photoIndex === 0 && <span className="batch-cover">Cover</span>}
            <div className="batch-photo-controls">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button className="button secondary small" />}
                  aria-label={`Move photo ${photoIndex + 1} of ${name}`}
                >
                  Move
                  <ChevronDown size={14} aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {targets.map((target) => (
                    <DropdownMenuItem
                      key={target.id}
                      disabled={target.full}
                      onClick={() => onMove(photo, target.id)}
                    >
                      To {target.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => onMove(photo, null)}>
                    To a new pile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="icon-button"
                aria-label={`Remove photo ${photoIndex + 1} of ${name}`}
                onClick={() => onRemove(photo)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.li>
  );
}

/** The button that starts the listings: Pako writes them, or the student fills them in. */
function startLabel(count: number, liveAgent: boolean) {
  if (liveAgent)
    return count === 1
      ? "Write the listing with Pako"
      : `Write ${count} listings with Pako`;
  return count === 1 ? "Fill in the listing" : `Fill in ${count} listings`;
}

/** How many of the piles today's AI allowance can still draft, when it cannot draft them all. */
function allowanceNote(quota: AgentQuota | undefined, piles: number) {
  const drafts = itemsCovered(quota?.remaining, piles);
  return drafts === undefined
    ? ""
    : `Today's AI allowance covers about ${drafts} of ${piles} drafts. You can finish the others by hand.`;
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
      ? (start.items ?? itemsFromGroups(start.photos, start.groups, location))
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
      setItems(() => itemsFromGroups(photos, groups, pickupLocation));
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
        title: item.draft.title.trim(),
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
    manual: !liveAgent,
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
            {liveAgent ? (
              <Button
                animateIcon
                className="button primary large full"
                disabled={!photos.length || reading || sorting}
                onClick={() => void sortPhotos()}
              >
                <Sparkles size={18} aria-hidden="true" />
                {sorting ? "Sorting photos…" : "Sort into piles"}
              </Button>
            ) : (
              <Button
                animateIcon
                className="button primary large full"
                disabled={!photos.length || reading}
                onClick={onePerPhoto}
              >
                <Pencil size={18} aria-hidden="true" />
                One listing per photo
              </Button>
            )}
            {liveAgent && sortFailed && photos.length > 0 && (
              <Button className="button secondary full" onClick={onePerPhoto}>
                One listing per photo
              </Button>
            )}
            <p className="quiet-caption">
              {liveAgent
                ? "Smaller copies of your photos are sent to the AI service to find which ones show the same item."
                : "Each photo starts as its own pile. You can move photos of one thing together next."}
            </p>
          </div>
        </div>
      )}

      {stage === "items" && (
        <div className="batch-review">
          <ol className="batch-items" style={{ gap: PILE_GAP }}>
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <BatchPile
                  key={item.id}
                  item={item}
                  name={pileName(item, index)}
                  targets={items
                    .map((target, targetIndex) => ({
                      id: target.id,
                      name: pileName(target, targetIndex),
                      full: target.draft.images!.length >= MAX_LISTING_PHOTOS,
                    }))
                    .filter((target) => target.id !== item.id)}
                  liveAgent={liveAgent}
                  photoKey={photoKey}
                  onTitle={(title) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      draft: { ...current.draft, title },
                    }))
                  }
                  onMove={(photo, target) =>
                    setItems((current) =>
                      movePhoto(current, photo, target, pickupLocation),
                    )
                  }
                  onRemove={(photo) =>
                    setItems((current) => removePhoto(current, photo))
                  }
                />
              ))}
            </AnimatePresence>
          </ol>
          <div className="batch-footer">
            {note && <p className="batch-allowance">{note}</p>}
            <Button
              animateIcon
              className="button primary large"
              disabled={!items.length}
              onClick={startListings}
            >
              {liveAgent ? (
                <Sparkles size={18} aria-hidden="true" />
              ) : (
                <Pencil size={18} aria-hidden="true" />
              )}
              {startLabel(items.length, liveAgent)}
            </Button>
            <p className="quiet-caption">
              {liveAgent
                ? "One at a time: Pako drafts each one and asks what's missing. You set the price."
                : "One at a time: you fill in each listing and set its price."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
