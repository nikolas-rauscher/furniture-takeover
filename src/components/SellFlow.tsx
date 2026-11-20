import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
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
  type SyntheticEvent,
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
import { TODAY, money, shortDate } from "../../shared/marketplace";
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
import { undatedPickup } from "../listingQuestions";
import {
  absenceGuide,
  FILL_IN_ACTION,
  sellGuide,
  WRITE_ACTION,
  type PakoAbsence,
} from "../sellGuide";
import ListingFields from "./ListingFields";
import PhotoSplitQuestion from "./PhotoSplitQuestion";
import type { PhotoGroup } from "../../shared/agent";
import Pako from "./onboarding/Pako";
import PakoReaction from "./PakoReaction";
import { listingPhotos } from "../../shared/listingPhotos";
import { motionBehavior } from "../uiMotion";
import { listingSaveWords, saveActionLabel } from "../listingSaveWords";
import type { BatchProgress, ListingDraft } from "../listingDraft";
import "./sell-flow.css";

/** A detail Pako just filled in settles into place instead of jumping. */
const previewSwap = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring", stiffness: 420, damping: 34 },
} as const;

/**
 * The field being filled in on the phone's scrolling photo step stays fully in view,
 * clear of the faded edge above the pinned button, also when Pako's line above it grows.
 */
function revealField({ target }: SyntheticEvent) {
  if (target instanceof HTMLElement && target.matches("input, textarea"))
    target.scrollIntoView({ block: "nearest", behavior: motionBehavior() });
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

/** How long the tray celebrates the listing just finished before it shows the count again. */
const BATCH_NOTE_MS = 2600;

/**
 * Where the batch stands: right after a listing it says so with Pako for a moment,
 * otherwise which listing this is and how many are done. Both share one place, so
 * the tray keeps its size when the moment passes.
 */
function BatchStatus({
  batch,
  cloud,
}: {
  batch: BatchProgress;
  cloud: boolean;
}) {
  const noted = useMomentPassed(
    batch.note ? { id: batch.note, ms: BATCH_NOTE_MS } : null,
  );
  const done = batch.results.filter((result) => result === "saved").length;
  const last = batch.results.at(-1);
  const cheering = Boolean(batch.note && !noted && last);
  return (
    <div className="batch-tray-status" data-cheering={cheering || undefined}>
      <p className="batch-tray-count" aria-hidden={cheering || undefined}>
        <strong>
          Listing {batch.index + 1} of {batch.covers.length}
        </strong>
        {done > 0 && <small>{done} done</small>}
      </p>
      <p className="batch-tray-cheer" aria-hidden="true">
        {/* A new note mounts him again, so he reacts to each listing just finished. */}
        <PakoReaction
          key={batch.note}
          size={28}
          mood={last === "skipped" ? "idle" : "happy"}
        />
        <strong>
          {last === "skipped" ? "Skipped" : cloud ? "Published!" : "Saved!"}
        </strong>
      </p>
      <p className="sr-only" role="status">
        {batch.note}
      </p>
    </div>
  );
}

/** The things being listed one after another: covers with their state, and a way to skip one. */
function BatchTray({
  batch,
  cloud,
  disabled,
}: {
  batch: BatchProgress;
  cloud: boolean;
  disabled: boolean;
}) {
  return (
    <nav className="batch-tray" aria-label="Your listings">
      <BatchStatus batch={batch} cloud={cloud} />
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
  /** Why Pako cannot help right now; absent while he can, or while that is still being checked. */
  pakoAbsence?: PakoAbsence;
  /** When Pako's allowance comes back. */
  pakoBack?: string;
  /** The student fills in the details themselves, in place of Pako's conversation. */
  manual: boolean;
  /** What Pako made of the photos so far. */
  photoInsight: PhotoInsight;
  /** Sorting the photos did not work, so they count as one item. */
  sortFailed: boolean;
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
  /** Goes on to the details without Pako. */
  onFillIn: () => void;
  /** One listing per pile; `review` opens the piles to check first. */
  onSeparate: (groups: PhotoGroup[], review: boolean) => void;
  /** The photos show one thing after all. */
  onKeepTogether: () => void;
  /** Opens the photos as one pile each, for the student to sort when Pako could not. */
  onSortYourself: () => void;
  /** Checks again whether Pako's tools can be reached. */
  onRetryPako: () => void;
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
  pakoAbsence,
  pakoBack,
  manual,
  photoInsight,
  sortFailed,
  agentConversation,
  agentTools,
  agentWorking = false,
  quota,
  onAccount,
  onBack,
  onDraftChange,
  onPhotoSelected,
  onCreateDraft,
  onFillIn,
  onSeparate,
  onKeepTogether,
  onSortYourself,
  onRetryPako,
  onNotesDone,
  onPublish,
  onSellSeveral,
  batch,
}: SellFlowProps) {
  const [photosOpen, setPhotosOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  /** The field the details dialog opens on, when a missing detail sent the student there. */
  const [fieldsFocus, setFieldsFocus] = useState<string>();
  const saveWords = listingSaveWords(cloud);
  const photos = listingPhotos(draft);
  const isPhotoStep = step === 1;
  const fieldsId = useId();
  const fieldIds = {
    title: `${fieldsId}-title`,
    description: `${fieldsId}-description`,
    price: `${fieldsId}-price`,
    location: `${fieldsId}-location`,
  };
  function openFields(focus?: string) {
    setFieldsFocus(focus);
    setFieldsOpen(true);
  }
  /** Opens a detail: the field itself while the form is on the page, else the dialog on it. */
  const fieldOpener = (field: keyof typeof fieldIds) => () => {
    if (manual) document.getElementById(fieldIds[field])?.focus();
    else openFields(fieldIds[field]);
  };
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
      open: fieldOpener("title"),
    },
    {
      label: "Description",
      state: required(Boolean(draft.description.trim())),
      open: fieldOpener("description"),
    },
    {
      label: "Price",
      state: priceSet
        ? "ready"
        : suggestedPrice === undefined
          ? "missing"
          : "suggested",
      open: !priceSet && onReviewPrice ? onReviewPrice : fieldOpener("price"),
    },
    {
      label: "Pickup area",
      state: required(Boolean(draft.location.trim())),
      open: fieldOpener("location"),
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
  const canSellSeveral = onSellSeveral !== undefined && !editing;
  const formId = useId();
  const notesId = useId();
  const notesField = useRef<HTMLTextAreaElement>(null);
  const notesFocused = useFocused(notesField);
  const ready = !unavailable && photos.length > 0;
  const canCreateDraft =
    liveAgent && ready && photoInsight.status !== "sorting";
  const saveVerb = saveWords.verb.toLowerCase();
  const guide = sellGuide({
    photoCount: photos.length,
    photoReading,
    preparing: busy,
    absence: pakoAbsence,
    saveVerb,
    back: pakoBack,
    hasPlace: Boolean(draft.location.trim()),
    typing: notesFocused,
    insight: photoInsight,
    sortFailed,
    remaining: quota?.remaining,
  });
  const piles =
    photoInsight.status === "several" ? photoInsight.groups : undefined;
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
  const saveFormId = useId();
  const manualId = useId();
  /** Pako's note above the details the student fills in: why he steps aside, or just whose turn it is. */
  const manualNote = pakoAbsence
    ? absenceGuide(pakoAbsence, { saveVerb, back: pakoBack })
    : {
        mood: "idle" as const,
        bubble: {
          id: "manual",
          title: "Over to you",
          text: `Fill in the details, then tap ${saveActionLabel({ cloud, editing, batch })}.`,
        },
      };
  const fields = (form?: string) => (
    <ListingFields
      draft={draft}
      ids={fieldIds}
      form={form}
      pickupMin={pickupMin}
      measurement={measurementField}
      priceContext={insight}
      onDraftChange={onDraftChange}
    />
  );
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
          isPhotoStep && !batch ? "1 of 2 · Photos & details" : undefined
        }
        titleRef={headingRef}
        backLabel={
          editing
            ? "Back to my listings"
            : isPhotoStep
              ? batch
                ? "Back to photo groups"
                : "Back to search"
              : "Back to photos"
        }
        onBack={onBack}
        onAccount={onAccount}
        quota={quota}
        actions={isPhotoStep || manual ? undefined : agentTools}
      />
      {batch && (
        <BatchTray
          batch={batch}
          cloud={cloud}
          disabled={busy || agentWorking}
        />
      )}

      {isPhotoStep ? (
        <div className="sell-layout" aria-busy={unavailable}>
          <div
            className="sell-photo-content"
            ref={photoContent}
            onFocus={revealField}
            onInput={revealField}
          >
            <div className="sell-guide">
              <Guide
                mood={reacted ? "idle" : guide.mood}
                layout="guide"
                bubble={guide.bubble}
              />
              {photoInsight.status === "failed" && !pakoAbsence && (
                <div className="sell-guide-actions">
                  <Button
                    className="button secondary small"
                    onClick={photoInsight.retry}
                  >
                    Try again
                  </Button>
                  <Button className="button quiet small" onClick={onFillIn}>
                    Fill in details
                  </Button>
                </div>
              )}
              {sortFailed && !editing && (
                <div className="sell-guide-actions">
                  <Button
                    className="button quiet small"
                    onClick={onSortYourself}
                  >
                    Several items? Group them yourself
                  </Button>
                </div>
              )}
              {pakoAbsence === "offline" && (
                <div className="sell-guide-actions">
                  <Button className="button quiet small" onClick={onRetryPako}>
                    Try again
                  </Button>
                </div>
              )}
              {piles && (
                <PhotoSplitQuestion
                  photos={photos}
                  groups={piles}
                  onTogether={onKeepTogether}
                  onSeparate={onSeparate}
                />
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
              {(photos.length > 0 || canSellSeveral) && (
                <div className="photo-upload-foot">
                  {photos.length > 0 && (
                    <p className="sell-photo-help">
                      Check your draft before {saveWords.gerund}.
                    </p>
                  )}
                  {canSellSeveral && (
                    <Button
                      className="button quiet small sell-several"
                      disabled={unavailable}
                      onClick={onSellSeveral}
                    >
                      <Images size={16} aria-hidden="true" />
                      Sell several items
                    </Button>
                  )}
                </div>
              )}
            </div>
            <form
              id={formId}
              className="sell-inputs"
              onSubmit={(event) => {
                event.preventDefault();
                if (pakoAbsence ? ready : canCreateDraft)
                  (pakoAbsence ? onFillIn : onCreateDraft)();
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
                  placeholder="Brand, size or wear…"
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
            {piles ? (
              <>
                <Button
                  animateIcon
                  className="button primary large full"
                  onClick={() => onSeparate(piles, false)}
                >
                  <Images size={18} aria-hidden="true" />
                  Make {piles.length} listings
                </Button>
                <Button className="button quiet" onClick={onKeepTogether}>
                  One item
                </Button>
              </>
            ) : (
              <Button
                animateIcon
                className="button primary large full"
                type="submit"
                form={formId}
                disabled={pakoAbsence ? !ready : !canCreateDraft}
                data-invite={(inviting && canCreateDraft) || undefined}
              >
                {unavailable ? (
                  <LoaderCircle animate size={18} aria-hidden="true" />
                ) : pakoAbsence ? (
                  <Pencil size={18} aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {photoReading
                  ? "Loading photo…"
                  : busy
                    ? "Preparing draft…"
                    : pakoAbsence
                      ? FILL_IN_ACTION
                      : WRITE_ACTION}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="review-layout agent-review-layout">
          <div className="listing-workspace">
            {missing.length > 0 && (
              <Button
                type="button"
                className="listing-readiness-mobile"
                onClick={() => missing[0].open()}
              >
                <span>Required details</span>
                <small>
                  {onlyPriceToConfirm
                    ? "Choose price"
                    : detailsToComplete(missing.length)}
                </small>
              </Button>
            )}
            {manual ? (
              <section className="listing-manual" aria-labelledby={manualId}>
                <div className="listing-manual-note">
                  <Pako size={44} mood={manualNote.mood} />
                  <p id={manualId}>
                    <strong>{manualNote.bubble.title}</strong>
                    {manualNote.bubble.text}
                  </p>
                </div>
                {fields(saveFormId)}
              </section>
            ) : (
              agentConversation
            )}
            <form
              id={saveFormId}
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
                if (!manual) openFields();
                const form = event.currentTarget;
                window.requestAnimationFrame(() =>
                  form.querySelector<HTMLElement>(":invalid")?.focus(),
                );
              }}
            >
              {!manual && (
                <Button
                  type="button"
                  className="button secondary listing-edit-button"
                  aria-label="Edit listing details"
                  onClick={() => openFields()}
                >
                  <Pencil size={15} />
                  Edit details
                </Button>
              )}
              {fieldsOpen && (
                <Modal
                  title="Listing details"
                  initialFocus={fieldsFocus}
                  onClose={() => setFieldsOpen(false)}
                >
                  {fields()}
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
              {!editing && (
                <span className="quiet-caption">{saveWords.audience}</span>
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
                      aria-label={`Suggested price ${money(suggestedPrice)}. Choose your asking price.`}
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
                  ? `Pickup by ${shortDate(draft.pickup)}`
                  : undatedPickup(draft.description)}
              </p>
            </div>
          </aside>
        </div>
      )}
    </MotionConfig>
  );
}
