import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  MAX_BATCH_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "../../shared/listingPhotos";
import {
  batchItem,
  itemsFromGroups,
  movePhoto,
  removePhoto,
  type BatchItem,
} from "../batchListings";
import { readListingPhoto, sortListingPhotos } from "../listingPhotos";
import type { PhotoGroup } from "../../shared/agent";
import type { ListingDraft } from "./SellFlow";
import { PickupLocationInput } from "./PickupLocationInput";
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
  /** Return to the single-listing flow. */
  onBack: () => void;
  /** Create the listings one after another together with the listing agent. */
  onStart: (drafts: ListingDraft[]) => void;
  /** Photos from the single-item flow that the seller chose to split. */
  start?: BatchStart;
};

const stages: { id: Stage; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "items", label: "Sort items" },
];

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

export default function BatchSellFlow({
  location,
  liveAgent,
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

  const stageIndex = stages.findIndex((item) => item.id === stage);

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

  const photoPicker = (label: string) => (
    <label
      className={`button ${photos.length ? "secondary" : "primary"} file-label`}
    >
      {photos.length > 0 && <Plus size={15} />}
      {label}
      <input
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={reading || sorting || photos.length >= MAX_BATCH_PHOTOS}
        onChange={(event) => {
          void addPhotos(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );

  return (
    <>
      <button className="back-link" type="button" onClick={back}>
        <ArrowLeft size={16} />
        {stage === "photos" ? "Sell a single item" : "Back to photos"}
      </button>
      <div className="page-title">
        <h1 ref={headingRef} tabIndex={-1}>
          {stage === "photos" ? "Sell several items" : "Check your items"}
        </h1>
        <p>
          {stage === "photos"
            ? "Upload photos of everything you want to sell. Your agent sorts them into one listing per item."
            : "Each card becomes one listing. Move photos that belong to another item, then create the listings one by one with your agent."}
        </p>
      </div>
      <div className="steps">
        {stages.map((item, index) => (
          <span
            key={item.id}
            className={
              index === stageIndex
                ? "active"
                : index < stageIndex
                  ? "completed"
                  : ""
            }
            aria-current={index === stageIndex ? "step" : undefined}
          >
            <i>{index < stageIndex ? <Check size={13} /> : index + 1}</i>
            {item.label}
          </span>
        ))}
      </div>

      {stage === "photos" && (
        <div className="batch-photos" aria-busy={reading || sorting}>
          <div
            className={`batch-dropzone ${photos.length ? "has-photos" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!sorting)
                void addPhotos(Array.from(event.dataTransfer.files));
            }}
          >
            {photos.length ? (
              <ul className="batch-photo-grid" aria-label="Uploaded photos">
                {photos.map((photo, index) => (
                  <li key={photo}>
                    <img src={photo} alt={`Photo ${index + 1}`} />
                    <button
                      type="button"
                      className="icon-button batch-photo-remove"
                      aria-label={`Remove photo ${index + 1}`}
                      disabled={sorting}
                      onClick={() =>
                        setPhotos((current) =>
                          current.filter((image) => image !== photo),
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <h2>Add photos of all your items</h2>
                <p>
                  Drag photos here or choose files. Several photos of the same
                  piece are fine.
                </p>
              </>
            )}
            <div className="batch-photo-actions">
              {photoPicker(photos.length ? "Add photos" : "Choose photos")}
              <span className="file-hint">
                {reading
                  ? "Loading photos…"
                  : `${photos.length}/${MAX_BATCH_PHOTOS} photos · JPG, PNG or WebP · 2 MB each`}
              </span>
            </div>
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
            <button
              type="button"
              className="button primary full"
              disabled={!photos.length || reading || sorting || !liveAgent}
              onClick={() => void sortPhotos()}
            >
              {sorting && <LoaderCircle className="spin" size={17} />}
              {sorting ? "Sorting photos…" : "Sort into listings"}
            </button>
            {(sortFailed || !liveAgent) && photos.length > 0 && (
              <button
                type="button"
                className="button secondary full"
                onClick={onePerPhoto}
              >
                One listing per photo
              </button>
            )}
            <span className="quiet-caption">
              {liveAgent
                ? "Smaller copies of your photos are sent to the AI service to find which ones show the same item."
                : "Connect the AI service to sort photos and create drafts."}
            </span>
          </div>
        </div>
      )}

      {stage === "items" && (
        <div className="batch-review">
          <ol className="batch-items">
            {items.map((item, index) => (
              <li key={item.id} className="batch-item">
                <h2>Item {index + 1}</h2>
                <label>
                  Title
                  <input
                    maxLength={180}
                    value={item.draft.title}
                    placeholder="Your agent suggests one if you leave this empty"
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
                    <li key={photo}>
                      <img
                        src={photo}
                        alt={`Item ${index + 1}, photo ${photoIndex + 1}`}
                      />
                      {photoIndex === 0 && <span>Cover</span>}
                      <div className="batch-photo-controls">
                        <select
                          aria-label={`Move photo ${photoIndex + 1} of item ${index + 1}`}
                          value={item.id}
                          onChange={(event) =>
                            setItems((current) =>
                              movePhoto(
                                current,
                                photo,
                                event.target.value || null,
                                pickupLocation,
                              ),
                            )
                          }
                        >
                          {items.map((target, targetIndex) => (
                            <option
                              key={target.id}
                              value={target.id}
                              disabled={
                                target.id !== item.id &&
                                target.draft.images!.length >=
                                  MAX_LISTING_PHOTOS
                              }
                            >
                              {target.id === item.id
                                ? "Move to…"
                                : `Item ${targetIndex + 1}`}
                            </option>
                          ))}
                          <option value="">New item</option>
                        </select>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove photo ${photoIndex + 1} of item ${index + 1}`}
                          onClick={() =>
                            setItems((current) => removePhoto(current, photo))
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="batch-footer">
            <button
              type="button"
              className="button primary"
              disabled={!items.length || !liveAgent}
              onClick={startListings}
            >
              <Sparkles size={16} />
              Create {items.length} listing{items.length === 1 ? "" : "s"} with
              your agent
            </button>
            <span className="quiet-caption">
              You go through the items one at a time. For each one, your agent
              writes a draft and asks what’s missing, like age, condition or
              pickup. Prices are never guessed.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
