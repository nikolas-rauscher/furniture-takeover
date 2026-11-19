import { SelectField } from "./ui/select-field";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Field, FieldLabel } from "./ui/field";
import { listingMeasurementField } from "../listingPreparation";
import { PickupLocationInput } from "./PickupLocationInput";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import {
  Armchair,
  Image as ImageIcon,
  CalendarDays,
  Check,
  Images,
  LoaderCircle,
  MapPin,
  Pencil,
  Sparkles,
} from "@/components/icons";
import {
  TODAY,
  money,
  shortDate,
  type Category,
} from "../../shared/marketplace";
import { useFocused } from "../hooks/useFocused";
import type { AgentQuota } from "../../shared/agent";
import Modal from "./Modal";
import PhotoGallery from "./PhotoGallery";
import SnapTarget from "./SnapTarget";
import ListingChecklist, {
  detailsToComplete,
  type ListingCheck,
} from "./ListingChecklist";
import WorkspaceHeader from "./WorkspaceHeader";
import Guide from "./onboarding/Guide";
import type { PhotoInsight } from "../hooks/useListingAnalysis";
import { useMomentPassed } from "../hooks/useMomentPassed";
import { isReaction, REACTION_MS } from "../pakoMoods";
import { sellGuide, WRITE_ACTION } from "../sellGuide";
import { listingPhotos } from "../../shared/listingPhotos";
import "./sell-flow.css";

/** Where the seller is when creating several listings one after another. */
export type BatchProgress = {
  /** Zero-based position of the listing being created. */
  index: number;
  covers: string[];
  /** Outcome of the listings before this one. */
  results: ("saved" | "skipped")[];
  onSkip: () => void;
};

export type ListingDraft = {
  image: string;
  images?: string[];
  raw: string;
  title: string;
  tags?: string[];
  description: string;
  price: string;
  condition: string;
  dimensions: string;
  location: string;
  pickup: string;
  category: Category;
};

/** A detail Pako just filled in settles into place instead of jumping. */
const previewSwap = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring", stiffness: 420, damping: 34 },
} as const;

/** Accounts publish a listing for other students; the local demo only saves it in this browser. */
export function listingSaveWords(cloud: boolean) {
  return cloud
    ? { verb: "Publish", gerund: "publishing", action: "Publish listing" }
    : { verb: "Save", gerund: "saving", action: "Save listing" };
}

/** The save button's words: an edit is saved, a new listing published or saved, then the next one. */
export function saveActionLabel({
  cloud,
  editing,
  batch,
}: {
  cloud: boolean;
  editing: boolean;
  batch?: Pick<BatchProgress, "index" | "covers">;
}) {
  if (editing) return "Save changes";
  const more = batch !== undefined && batch.index + 1 < batch.covers.length;
  return listingSaveWords(cloud).action + (more ? " & next" : "");
}

/** Where a listing stands in the batch tray. */
function trayState(batch: BatchProgress, index: number) {
  if (index === batch.index) return "current";
  return batch.results[index] ?? "upcoming";
}

const TRAY_NAMES = {
  current: "current",
  saved: "done",
  skipped: "skipped",
  upcoming: "next",
} as const;

/** The things being listed one after another: covers with their state, and a way to skip one. */
function BatchTray({
  batch,
  disabled,
}: {
  batch: BatchProgress;
  disabled: boolean;
}) {
  const done = batch.results.filter((result) => result === "saved").length;
  return (
    <nav className="batch-tray" aria-label="Your listings">
      <p>
        <strong>
          Listing {batch.index + 1} of {batch.covers.length}
        </strong>
        {done > 0 && <span> · {done} done</span>}
      </p>
      <ol>
        {batch.covers.map((cover, index) => {
          const state = trayState(batch, index);
          return (
            <li
              key={index}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <img
                src={cover}
                alt={`Listing ${index + 1}, ${TRAY_NAMES[state]}`}
              />
              {state === "saved" && (
                <span className="batch-tray-check" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        className="button quiet small batch-tray-skip"
        disabled={disabled}
        onClick={batch.onSkip}
      >
        Skip this one
      </Button>
    </nav>
  );
}

/** The card's description; a sentence just added to its end glows for a moment. */
function DescriptionPreview({ text }: { text: string }) {
  const [shown, setShown] = useState({ text, added: "" });
  if (shown.text !== text)
    setShown({
      text,
      added:
        shown.text && text.startsWith(shown.text)
          ? text.slice(shown.text.length)
          : "",
    });
  const kept = text.slice(0, text.length - shown.added.length);
  return (
    <p className="listing-preview-description">
      {kept}
      {shown.added && (
        <span key={text} className="listing-preview-added">
          {shown.added}
        </span>
      )}
    </p>
  );
}

type SellFlowProps = {
  cloud?: boolean;
  draft: ListingDraft;
  step: number;
  editing: boolean;
  pickupMin?: string;
  busy: boolean;
  photoReading?: boolean;
  uploadError: string;
  liveAgent: boolean;
  /** What Pako made of the photos so far. */
  photoInsight: PhotoInsight;
  agentConversation?: ReactNode;
  agentTools?: ReactNode;
  agentWorking?: boolean;
  /** Prices of similar listings for the one being written, beside its price. */
  insight?: ReactNode;
  /** Pako's suggested price while the listing has none of its own. */
  suggestedPrice?: number;
  /** Takes the student to Pako's price question, where the price is decided. */
  onReviewPrice?: () => void;
  quota?: AgentQuota;
  onAccount: () => void;
  onBack: () => void;
  onDraftChange: (changes: Partial<ListingDraft>) => void;
  onPhotoSelected: (files: File[]) => void;
  onCreateDraft: () => void;
  /** The student left the Details field, so what they wrote counts now. */
  onNotesDone: () => void;
  onPublish: (event: FormEvent<HTMLFormElement>) => void;
  /** Switch to uploading several items at once. */
  onSellSeveral?: () => void;
  /** Set while creating several listings one after another. */
  batch?: BatchProgress;
};

export default function SellFlow({
  cloud = false,
  draft,
  step,
  editing,
  pickupMin = TODAY,
  insight,
  suggestedPrice,
  onReviewPrice,
  busy,
  photoReading = false,
  uploadError,
  liveAgent,
  photoInsight,
  agentConversation,
  agentTools,
  agentWorking = false,
  quota,
  onAccount,
  onBack,
  onDraftChange,
  onPhotoSelected,
  onCreateDraft,
  onNotesDone,
  onPublish,
  onSellSeveral,
  batch,
}: SellFlowProps) {
  const [photosOpen, setPhotosOpen] = useState(false);
  const saveWords = listingSaveWords(cloud);
  const photos = listingPhotos(draft);
  const isPhotoStep = step === 1;
  const openFields = () => setFieldsOpen(true);
  const required = (ready: boolean) => (ready ? "ready" : "missing");
  const priceSet =
    draft.price.trim() !== "" &&
    Number.isFinite(Number(draft.price)) &&
    Number(draft.price) >= 0 &&
    Number(draft.price) <= 10000;
  const checks: ListingCheck[] = [
    {
      label: "Photos",
      state: required(photos.length > 0),
      open: () => setPhotosOpen(true),
    },
    {
      label: "Title",
      state: required(Boolean(draft.title.trim())),
      open: openFields,
    },
    {
      label: "Description",
      state: required(Boolean(draft.description.trim())),
      open: openFields,
    },
    {
      label: "Price",
      state: priceSet
        ? "ready"
        : suggestedPrice === undefined
          ? "missing"
          : "suggested",
      open: !priceSet && onReviewPrice ? onReviewPrice : openFields,
    },
    {
      label: "Pickup area",
      state: required(Boolean(draft.location.trim())),
      open: openFields,
    },
  ];
  const missing = checks.filter((check) => check.state !== "ready");
  const onlyPriceToConfirm =
    missing.length === 1 && missing[0].state === "suggested";
  /** The price on the card: the student's own, else Pako's suggestion until it is accepted. */
  const shownPrice = priceSet ? Number(draft.price) : suggestedPrice;
  // Always editable; the label adapts to the item type when it is known.
  const measurementField = listingMeasurementField(draft) ?? {
    label: "Measurements",
    placeholder: "Size or measurements",
  };
  const unavailable = busy || photoReading;
  const formId = useId();
  const notesId = useId();
  const notesField = useRef<HTMLTextAreaElement>(null);
  const notesFocused = useFocused(notesField);
  const canCreateDraft =
    liveAgent && !unavailable && photos.length > 0 && quota?.remaining !== 0;
  const guide = sellGuide({
    photoCount: photos.length,
    photoReading,
    preparing: busy,
    allowanceUsed: quota?.remaining === 0,
    hasPlace: Boolean(draft.location.trim()),
    typing: notesFocused,
    insight: photoInsight,
  });
  // A reaction plays once for its moment, then Pako rests.
  const reacted = useMomentPassed(
    isReaction(guide.mood)
      ? { id: guide.bubble.id, ms: REACTION_MS[guide.mood] }
      : null,
  );
  /** Pako recognised the item, so the button invites the tap that writes the listing. */
  const inviting = photoInsight.status === "ready" && guide.mood !== "think";
  const photoEditor = (
    <PhotoGallery
      images={photos}
      title="Your item"
      disabled={unavailable}
      onFilesSelected={onPhotoSelected}
      onImagesChange={(images) =>
        onDraftChange({ image: images[0] ?? "", images })
      }
    />
  );
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // On phones the photo step scrolls above its Create draft bar; the edge fades instead of cutting.
  const photoContent = useRef<HTMLDivElement>(null);
  useScrollFade(photoContent, { size: 32, shrink: 0, blur: 0 });

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setFieldsOpen(false);
  }, [step]);

  return (
    <MotionConfig reducedMotion="user">
      {photosOpen && (
        <Modal title="Listing photos" onClose={() => setPhotosOpen(false)}>
          {photoEditor}
          {uploadError && (
            <p role="alert" className="form-error">
              {uploadError}
            </p>
          )}
        </Modal>
      )}
      <WorkspaceHeader
        title={isPhotoStep ? "New listing" : "Your listing"}
        subtitle={
          batch
            ? `Listing ${batch.index + 1} of ${batch.covers.length}`
            : isPhotoStep
              ? "1 of 2 · Photos & details"
              : undefined
        }
        titleRef={headingRef}
        backLabel={
          editing
            ? "Back to my listings"
            : isPhotoStep
              ? batch
                ? "Back to sorting"
                : "Back to search"
              : "Back to photos"
        }
        onBack={onBack}
        onAccount={onAccount}
        quota={quota}
        actions={isPhotoStep ? undefined : agentTools}
      />
      {batch && (
        <BatchTray batch={batch} disabled={busy || agentWorking} />
      )}

      {isPhotoStep ? (
        <div className="sell-layout" aria-busy={unavailable}>
          <div className="sell-photo-content" ref={photoContent}>
            <div className="sell-guide">
              <Guide
                mood={reacted ? "idle" : guide.mood}
                layout="guide"
                bubble={guide.bubble}
              />
              {photoInsight.status === "failed" && (
                <Button
                  className="button secondary small sell-guide-retry"
                  onClick={photoInsight.retry}
                >
                  Try again
                </Button>
              )}
            </div>
            <div className="photo-upload-panel">
              {photos.length ? (
                photoEditor
              ) : (
                <SnapTarget
                  disabled={unavailable}
                  onFilesSelected={onPhotoSelected}
                />
              )}
              {uploadError && (
                <p className="form-error" role="alert">
                  {uploadError}
                </p>
              )}
              <p className="sell-photo-help">
                {photos.length > 0
                  ? `Review and edit before ${saveWords.gerund}.`
                  : "Add at least one photo to create your draft."}
              </p>
              {onSellSeveral && !editing && (
                <Button
                  className="button quiet small sell-several"
                  disabled={unavailable}
                  onClick={onSellSeveral}
                >
                  <Images size={16} aria-hidden="true" />
                  Selling several things? Snap them all at once
                </Button>
              )}
            </div>
            <form
              id={formId}
              className="sell-inputs"
              onSubmit={(event) => {
                event.preventDefault();
                if (canCreateDraft) onCreateDraft();
              }}
            >
              <Field data-disabled={unavailable || undefined}>
                <FieldLabel htmlFor={notesId}>
                  Details<span className="sell-field-optional">Optional</span>
                </FieldLabel>
                <Textarea
                  ref={notesField}
                  id={notesId}
                  rows={2}
                  maxLength={4000}
                  disabled={unavailable}
                  value={draft.raw}
                  onChange={(event) =>
                    onDraftChange({ raw: event.target.value })
                  }
                  onBlur={onNotesDone}
                  placeholder="Anything Pako can't see? Model, size, defects…"
                />
              </Field>
              <PickupLocationInput
                value={draft.location}
                disabled={unavailable}
                onChange={(location) => onDraftChange({ location })}
              />
            </form>
          </div>
          <div className="sell-photo-footer">
            <Button
              animateIcon
              className="button primary large full"
              type="submit"
              form={formId}
              disabled={!canCreateDraft}
              data-invite={(inviting && canCreateDraft) || undefined}
            >
              {unavailable ? (
                <LoaderCircle animate size={18} aria-hidden="true" />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              {photoReading
                ? "Loading photo…"
                : busy
                  ? "Preparing draft…"
                  : WRITE_ACTION}
            </Button>
          </div>
        </div>
      ) : (
        <div className="review-layout agent-review-layout">
          <div className="listing-workspace">
            {missing.length > 0 && (
              <Button
                type="button"
                className="listing-readiness-mobile"
                onClick={() =>
                  missing.length ? missing[0].open() : setFieldsOpen(true)
                }
              >
                <span>Required details</span>
                <small>
                  {onlyPriceToConfirm && suggestedPrice !== undefined
                    ? `Price: confirm ${money(suggestedPrice)}`
                    : detailsToComplete(missing.length)}
                </small>
              </Button>
            )}
            {agentConversation}
            <form
              onSubmit={(event) => {
                if (missing.length) {
                  event.preventDefault();
                  missing[0].open();
                  return;
                }
                onPublish(event);
              }}
              className="listing-save-form"
              onInvalidCapture={(event) => {
                event.preventDefault();
                setFieldsOpen(true);
                const form = event.currentTarget;
                window.requestAnimationFrame(() =>
                  form.querySelector<HTMLElement>(":invalid")?.focus(),
                );
              }}
            >
              <Button
                type="button"
                className="button secondary listing-edit-button"
                aria-label="Edit listing details"
                onClick={() => setFieldsOpen(true)}
              >
                <Pencil size={15} />
                Edit details
              </Button>
              {fieldsOpen && (
                <Modal
                  title="Listing details"
                  onClose={() => setFieldsOpen(false)}
                >
                  <div className="review-form">
                    <label>
                      Title
                      <Input
                        required
                        maxLength={180}
                        pattern=".*\S.*"
                        title="Enter a title with at least one non-space character."
                        value={draft.title}
                        onChange={(event) =>
                          onDraftChange({ title: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <Textarea
                        required
                        rows={5}
                        maxLength={4000}
                        value={draft.description}
                        onChange={(event) =>
                          onDraftChange({ description: event.target.value })
                        }
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Price (CHF)
                        <Input
                          required
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="10000"
                          value={draft.price}
                          onChange={(event) =>
                            onDraftChange({ price: event.target.value })
                          }
                          placeholder="Your asking price"
                        />
                      </label>
                      <label>
                        Condition<span className="optional">Optional</span>
                        <SelectField
                          aria-label="Condition"
                          value={draft.condition}
                          onValueChange={(condition) =>
                            onDraftChange({ condition })
                          }
                          options={[
                            ...new Set([
                              "",
                              "Very good",
                              "Good",
                              "Used",
                              draft.condition,
                            ]),
                          ].map((value) => ({
                            value,
                            label: value || "Not specified",
                          }))}
                        />
                      </label>
                      <label>
                        {measurementField.label}
                        <span className="optional">Optional</span>
                        <Input
                          value={draft.dimensions}
                          maxLength={160}
                          onChange={(event) =>
                            onDraftChange({ dimensions: event.target.value })
                          }
                          placeholder={measurementField.placeholder}
                        />
                      </label>
                    </div>
                    {insight}
                    <h2 className="form-section-title collection-title">
                      Collection
                    </h2>
                    <div className="form-grid">
                      <label>
                        Pickup location
                        <Input
                          required
                          maxLength={120}
                          pattern=".*\S.*"
                          title="Enter a pickup location with at least one non-space character."
                          value={draft.location}
                          onChange={(event) =>
                            onDraftChange({ location: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Last day to collect<span className="optional">Optional</span>
                        <Input
                          type="date"
                          min={pickupMin}
                          value={draft.pickup}
                          onChange={(event) =>
                            onDraftChange({ pickup: event.target.value })
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <Button
                    animateIcon
                    type="button"
                    className="button primary full"
                    onClick={() => setFieldsOpen(false)}
                  >
                    Done
                  </Button>
                </Modal>
              )}
              <Button
                animateIcon
                className="button primary large"
                type="submit"
                disabled={agentWorking || busy || photoReading}
              >
                <Check size={18} />
                {busy ? "Saving…" : saveActionLabel({ cloud, editing, batch })}
              </Button>
              <span className="quiet-caption">
                {cloud
                  ? "Your listing will be visible on Takeover. You can edit or archive it later."
                  : "Saved in this browser."}
              </span>
            </form>
          </div>
          <aside className="listing-preview">
            <div className="listing-readiness">
              <ListingChecklist checks={checks} />
              <small>
                {draft.condition
                  ? ""
                  : "Adding the condition helps buyers decide."}
              </small>
            </div>
            <Button
              type="button"
              className="listing-preview-photos"
              onClick={() => setPhotosOpen(true)}
              aria-label={`Edit listing photos (${photos.length})`}
            >
              {draft.image ? (
                <img src={draft.image} alt="Listing preview" />
              ) : (
                <span className="listing-no-photo">
                  <ImageIcon size={28} />
                </span>
              )}
              <span>
                <ImageIcon size={12} aria-hidden="true" />
                {photos.length}
                <span className="listing-preview-photo-caption">
                  photo{photos.length === 1 ? "" : "s"} · Edit
                </span>
              </span>
            </Button>
            <div aria-busy={agentWorking}>
              <AnimatePresence initial={false} mode="wait">
                {agentWorking ? (
                  <motion.span
                    key="writing"
                    className="listing-preview-status"
                    {...previewSwap}
                  >
                    <span className="chip">
                      <Sparkles size={14} aria-hidden="true" />
                      Pako is writing…
                    </span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="source"
                    className="source-label"
                    {...previewSwap}
                  >
                    <Armchair size={13} />
                    takeover
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.h2 key={draft.title} {...previewSwap}>
                {draft.title || "Your item"}
              </motion.h2>
              <div className="listing-preview-price">
                <motion.strong
                  key={shownPrice ?? "not-set"}
                  data-suggested={!priceSet || undefined}
                  {...previewSwap}
                >
                  {shownPrice === undefined
                    ? "Price not set"
                    : money(shownPrice)}
                </motion.strong>
                <AnimatePresence initial={false}>
                  {!priceSet && suggestedPrice !== undefined && (
                    <motion.button
                      key="suggested"
                      type="button"
                      className="chip listing-price-suggested"
                      aria-label={`Suggested by Pako: ${money(suggestedPrice)}. Decide the price`}
                      disabled={!onReviewPrice}
                      onClick={onReviewPrice}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      Suggested
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              {insight}
              {draft.description && (
                <DescriptionPreview text={draft.description} />
              )}
              {(draft.condition || draft.dimensions) && (
                <dl className="listing-preview-facts">
                  {draft.condition && (
                    <div>
                      <dt>Condition</dt>
                      <motion.dd key={draft.condition} {...previewSwap}>
                        {draft.condition}
                      </motion.dd>
                    </div>
                  )}
                  {draft.dimensions && measurementField && (
                    <div>
                      <dt>{measurementField.label}</dt>
                      <motion.dd key={draft.dimensions} {...previewSwap}>
                        {draft.dimensions}
                      </motion.dd>
                    </div>
                  )}
                </dl>
              )}
              <p>
                <MapPin size={14} />
                {draft.location}
              </p>
              <p>
                <CalendarDays size={14} />
                {draft.pickup
                  ? `Last day to collect ${shortDate(draft.pickup)}`
                  : "Flexible pickup"}
              </p>
            </div>
          </aside>
        </div>
      )}
    </MotionConfig>
  );
}
