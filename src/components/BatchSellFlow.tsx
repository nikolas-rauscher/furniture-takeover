import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  MAX_BATCH_PHOTOS,
  MAX_LISTING_PHOTOS,
} from "../../shared/listingPhotos";
import { requestAgentAssist } from "../api/agent";
import {
  batchItem,
  itemsFromGroups,
  missingDetails,
  movePhoto,
  readyItems,
  removePhoto,
  type BatchItem,
} from "../batchListings";
import { readListingPhoto, sortListingPhotos } from "../listingPhotos";
import { prepareListingDraft } from "../listingPreparation";
import type { PhotoGroup } from "../../shared/agent";
import type { ListingDraft } from "./SellFlow";
import { PickupLocationInput } from "./PickupLocationInput";
import "./batch-sell.css";

type Stage = "photos" | "items" | "drafts";

export type BatchStart = {
  photos: string[];
  groups: PhotoGroup[];
  notes: string;
  /** Open the sorting check first, e.g. after the seller corrected the item count. */
  review?: boolean;
};

type Props = {
  location: string;
  liveAgent: boolean;
  /** Return to the single-listing flow. */
  onBack: () => void;
  /** Store the listings; returns false when browser storage failed. */
  onSave: (drafts: ListingDraft[]) => Promise<boolean>;
  /** Every item has been saved. */
  onDone: () => void;
  /** Photos from the single-item flow that the seller chose to split. */
  start?: BatchStart;
};

const stages: { id: Stage; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "items", label: "Sort items" },
  { id: "drafts", label: "Review & save" },
];
const DRAFTS_IN_PARALLEL = 2;

export default function BatchSellFlow({
  location,
  liveAgent,
  onBack,
  onSave,
  onDone,
  start,
}: Props) {
  // Notes written for several items can't be split safely, so the seller
  // assigns them per item first; without notes, drafting starts right away.
  const startNotes = start?.notes.trim() ?? "";
  const [stage, setStage] = useState<Stage>(
    start ? (startNotes || start.review ? "items" : "drafts") : "photos",
  );
  const [photos, setPhotos] = useState<string[]>(start?.photos ?? []);
  const [pickupLocation, setPickupLocation] = useState(location);
  const [items, setItemsState] = useState<BatchItem[]>(() =>
    start ? itemsFromGroups(start.photos, start.groups, location) : [],
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
  const [saving, setSaving] = useState(false);
  const requests = useRef(new AbortController());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Created per mount so a StrictMode remount does not inherit an aborted signal.
  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!start || startNotes || start.review) return;
    // Deferred so a StrictMode remount drafts once, with the live controller.
    const timer = setTimeout(() => void draftAll());
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const stageIndex = stages.findIndex((item) => item.id === stage);
  const ready = readyItems(items);
  const drafting = items.some((item) => item.status === "drafting");

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
  function changeDraft(id: string, changes: Partial<ListingDraft>) {
    updateItem(id, (item) => ({
      ...item,
      draft: { ...item.draft, ...changes },
    }));
  }

  async function draftItem(item: BatchItem) {
    const images = item.draft.images ?? [];
    updateItem(item.id, (current) => ({
      ...current,
      status: "drafting",
      error: undefined,
    }));
    try {
      const response = await requestAgentAssist(
        {
          intent: "listing",
          text: item.notes,
          images,
          context: { location: item.draft.location },
        },
        { signal: requests.current.signal },
      );
      updateItem(item.id, (current) =>
        // Photos moved while drafting: that item needs a fresh draft instead.
        current.status !== "drafting" || current.draft.images !== images
          ? current
          : {
              ...current,
              status: "ready",
              draft: prepareListingDraft(
                { ...current.draft, raw: current.notes },
                response.metadata,
              ),
            },
      );
    } catch (error) {
      if (requests.current.signal.aborted) return;
      updateItem(item.id, (current) =>
        current.status !== "drafting"
          ? current
          : {
              ...current,
              status: "failed",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not prepare this listing.",
            },
      );
    }
  }

  async function draftAll() {
    setStage("drafts");
    const queue = itemsRef.current.filter((item) => item.status === "sorted");
    await Promise.all(
      Array.from({ length: DRAFTS_IN_PARALLEL }, async () => {
        for (let item = queue.shift(); item; item = queue.shift())
          await draftItem(item);
      }),
    );
  }

  async function save() {
    if (!ready.length || drafting || saving) return;
    setSaving(true);
    const saved = await onSave(ready.map((item) => item.draft)).finally(() =>
      setSaving(false),
    );
    if (!saved) return;
    const savedIds = new Set(ready.map((item) => item.id));
    setItems((current) => current.filter((item) => !savedIds.has(item.id)));
    if (!itemsRef.current.length) onDone();
  }

  function back() {
    if (stage === "drafts" && !drafting) setStage("items");
    else if (stage === "items") setStage("photos");
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
      <button
        className="back-link"
        type="button"
        onClick={back}
        disabled={stage === "drafts" && drafting}
      >
        <ArrowLeft size={16} />
        {stage === "photos"
          ? "Sell a single item"
          : stage === "items"
            ? "Back to photos"
            : "Back to sorting"}
      </button>
      <div className="page-title">
        <h1 ref={headingRef} tabIndex={-1}>
          {stage === "photos"
            ? "Sell several items"
            : stage === "items"
              ? "Check your items"
              : "Your listings"}
        </h1>
        <p>
          {stage === "photos"
            ? "Upload photos of everything you want to sell. Your agent sorts them into one listing per item."
            : stage === "items"
              ? "Each card becomes one listing. Move photos that belong to another item."
              : "Add what’s missing, then save all listings at once."}
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
          {startNotes && (
            <p className="batch-notes-hint">
              Your notes: “{startNotes}”
              <span>
                Add the parts that belong to each item below, so a price ends up
                in the right listing.
              </span>
            </p>
          )}
          <ol className="batch-items">
            {items.map((item, index) => (
              <li key={item.id} className="batch-item">
                <h2>
                  Item {index + 1}
                  {item.label && <span> · {item.label}</span>}
                </h2>
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
                <label>
                  Details for this item
                  <span className="optional">Optional</span>
                  <input
                    maxLength={4000}
                    value={item.notes}
                    placeholder="For example: CHF 40, good condition, 120 × 60 cm"
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        notes: event.target.value,
                        status: "sorted",
                      }))
                    }
                  />
                </label>
              </li>
            ))}
          </ol>
          <div className="batch-footer">
            <button
              type="button"
              className="button primary"
              disabled={!items.length || !liveAgent}
              onClick={() => void draftAll()}
            >
              Create {items.length} listing{items.length === 1 ? "" : "s"}
            </button>
            <span className="quiet-caption">
              Each item’s photos and details are sent to the AI service to write
              its draft. Prices are never guessed.
            </span>
          </div>
        </div>
      )}

      {stage === "drafts" && (
        <div className="batch-review">
          <ol className="batch-items">
            {items.map((item, index) => {
              const missing = missingDetails(item.draft);
              return (
                <li key={item.id} className="batch-item batch-draft">
                  <img
                    className="batch-draft-cover"
                    src={item.draft.image}
                    alt={`Item ${index + 1} cover`}
                  />
                  <div className="batch-draft-fields">
                    {item.status === "drafting" || item.status === "sorted" ? (
                      <p role="status" className="batch-draft-status">
                        <LoaderCircle className="spin" size={16} />
                        Writing listing {index + 1}…
                      </p>
                    ) : (
                      <>
                        {item.status === "failed" && (
                          <p className="form-error" role="alert">
                            {item.error} You can fill in the details yourself.
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => void draftItem(item)}
                            >
                              <RotateCcw size={13} /> Try again
                            </button>
                          </p>
                        )}
                        <label>
                          Title
                          <input
                            required
                            maxLength={180}
                            value={item.draft.title}
                            onChange={(event) =>
                              changeDraft(item.id, {
                                title: event.target.value,
                                tags: undefined,
                              })
                            }
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Price (CHF)
                            <input
                              required
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              max="10000"
                              value={item.draft.price}
                              placeholder="Your asking price"
                              onChange={(event) =>
                                changeDraft(item.id, {
                                  price: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Condition
                            <span className="optional">Optional</span>
                            <select
                              value={item.draft.condition}
                              onChange={(event) =>
                                changeDraft(item.id, {
                                  condition: event.target.value,
                                })
                              }
                            >
                              <option value="">Not specified</option>
                              {item.draft.condition &&
                                !["Very good", "Good", "Used"].includes(
                                  item.draft.condition,
                                ) && <option>{item.draft.condition}</option>}
                              <option>Very good</option>
                              <option>Good</option>
                              <option>Used</option>
                            </select>
                          </label>
                        </div>
                        <label>
                          Description
                          <textarea
                            required
                            rows={4}
                            maxLength={4000}
                            value={item.draft.description}
                            onChange={(event) =>
                              changeDraft(item.id, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        {missing.length > 0 && (
                          <p className="batch-missing">
                            Still needed: {missing.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-button batch-draft-remove"
                    aria-label={`Don’t list item ${index + 1}`}
                    disabled={item.status === "drafting"}
                    onClick={() =>
                      setItems((current) =>
                        current.filter((other) => other.id !== item.id),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="batch-footer">
            <button
              type="button"
              className="button primary"
              disabled={!ready.length || drafting || saving}
              onClick={() => void save()}
            >
              <Check size={17} />
              Save {ready.length} listing{ready.length === 1 ? "" : "s"}
            </button>
            <span className="quiet-caption">
              {drafting
                ? "Your agent is still writing drafts."
                : ready.length < items.length
                  ? `${items.length - ready.length} item${items.length - ready.length === 1 ? "" : "s"} still need details and will stay here.`
                  : "Saved in this browser. You can edit each listing later."}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
