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
import {
  Armchair,
  Image as ImageIcon,
  CalendarDays,
  Check,
  LoaderCircle,
  MapPin,
  Sparkles,
} from "@/components/icons";
import {
  TODAY,
  money,
  shortDate,
  type Category,
} from "../../shared/marketplace";
import type { AgentAssistState } from "../hooks/useAgentAssist";
import { useFocused } from "../hooks/useFocused";
import type { AgentQuota } from "../../shared/agent";
import Modal from "./Modal";
import PhotoGallery from "./PhotoGallery";
import SnapTarget from "./SnapTarget";
import ListingChecklist, { detailsToComplete } from "./ListingChecklist";
import WorkspaceHeader from "./WorkspaceHeader";
import Guide, { type GuideBubble } from "./onboarding/Guide";
import type { PakoMood } from "./onboarding/storyTypes";
import { listingPhotos } from "../../shared/listingPhotos";
import "./sell-flow.css";

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

type PhotoStepGuide = { mood: PakoMood; bubble: GuideBubble };

/**
 * What Pako says beside the photos: what to do next, or what he is busy with.
 * He sleeps once the day's allowance is used and listens while details are written.
 */
function photoStepGuide({
  photoCount,
  photoReading,
  busy,
  quota,
  typing,
}: {
  photoCount: number;
  photoReading: boolean;
  busy: boolean;
  quota?: AgentQuota;
  /** The Details field has focus or text. */
  typing: boolean;
}): PhotoStepGuide {
  if (busy)
    return {
      mood: "work",
      bubble: {
        id: "writing",
        title: "Writing your listing…",
        text: "I'm looking at your photos and notes.",
      },
    };
  if (photoReading)
    return {
      mood: "work",
      bubble: { id: "reading", text: "Loading your photo…" },
    };
  if (quota?.remaining === 0)
    return {
      mood: "sleep",
      bubble: {
        id: "quota",
        title: "That's all for today",
        text: "I've used today's writing allowance. Try again tomorrow.",
      },
    };
  if (photoCount === 0)
    return {
      mood: typing ? "listen" : "wave",
      bubble: {
        id: "empty",
        title: "Snap what's left in your room",
        text: "Add a few photos. I'll write the title, description and price.",
      },
    };
  return {
    mood: typing ? "listen" : "happy",
    bubble: {
      id: "ready",
      title: "Looking good!",
      text: "Add a note if you like, then tap Create draft.",
    },
  };
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
  listingAssist: AgentAssistState;
  agentConversation?: ReactNode;
  agentTools?: ReactNode;
  agentWorking?: boolean;
  quota?: AgentQuota;
  onAccount: () => void;
  onBack: () => void;
  onDraftChange: (changes: Partial<ListingDraft>) => void;
  onPhotoSelected: (files: File[]) => void;
  onCreateDraft: () => void;
  onSuggestionSelected: (suggestion: string) => void;
  onPublish: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SellFlow({
  cloud = false,
  draft,
  step,
  editing,
  pickupMin = TODAY,
  busy,
  photoReading = false,
  uploadError,
  liveAgent,
  listingAssist,
  agentConversation,
  agentTools,
  agentWorking = false,
  quota,
  onAccount,
  onBack,
  onDraftChange,
  onPhotoSelected,
  onCreateDraft,
  onSuggestionSelected,
  onPublish,
}: SellFlowProps) {
  const [photosOpen, setPhotosOpen] = useState(false);
  const photos = listingPhotos(draft);
  const isPhotoStep = step === 1;
  const checks = [
    {
      label: "Photos",
      ready: photos.length > 0,
      open: () => setPhotosOpen(true),
    },
    {
      label: "Title",
      ready: Boolean(draft.title.trim()),
      open: () => setFieldsOpen(true),
    },
    {
      label: "Description",
      ready: Boolean(draft.description.trim()),
      open: () => setFieldsOpen(true),
    },
    {
      label: "Price",
      ready:
        draft.price.trim() !== "" &&
        Number.isFinite(Number(draft.price)) &&
        Number(draft.price) >= 0 &&
        Number(draft.price) <= 10000,
      open: () => setFieldsOpen(true),
    },
    {
      label: "Pickup area",
      ready: Boolean(draft.location.trim()),
      open: () => setFieldsOpen(true),
    },
  ];
  const missing = checks.filter((check) => !check.ready);
  const measurementField = listingMeasurementField(draft);
  const unavailable = busy || photoReading;
  const formId = useId();
  const notesId = useId();
  const notesField = useRef<HTMLTextAreaElement>(null);
  const notesFocused = useFocused(notesField);
  const canCreateDraft =
    liveAgent && !unavailable && photos.length > 0 && quota?.remaining !== 0;
  const guide = photoStepGuide({
    photoCount: photos.length,
    photoReading,
    busy,
    quota,
    typing: notesFocused || draft.raw.trim() !== "",
  });
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setFieldsOpen(false);
    setSuggestionsOpen(false);
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
        subtitle={isPhotoStep ? "1 of 2 · Photos & details" : undefined}
        titleRef={headingRef}
        backLabel={
          editing
            ? "Back to my listings"
            : isPhotoStep
              ? "Back to search"
              : "Back to photos"
        }
        onBack={onBack}
        onAccount={onAccount}
        quota={quota}
        actions={isPhotoStep ? undefined : agentTools}
      />

      {isPhotoStep ? (
        <div className="sell-layout" aria-busy={unavailable}>
          <div className="sell-photo-content">
            <div className="sell-guide">
              <Guide mood={guide.mood} layout="guide" bubble={guide.bubble} />
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
                  ? "Review and edit before publishing."
                  : "Add at least one photo to create your draft."}
              </p>
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
                  rows={3}
                  maxLength={4000}
                  disabled={unavailable}
                  value={draft.raw}
                  onChange={(event) =>
                    onDraftChange({ raw: event.target.value })
                  }
                  placeholder="Price, condition or pickup details…"
                />
              </Field>
              {(photos.length > 0 || draft.raw.trim()) && (
                <Button
                  type="button"
                  className="text-button photo-suggestions-button"
                  disabled={
                    unavailable ||
                    listingAssist.status === "idle" ||
                    listingAssist.status === "loading"
                  }
                  onClick={() => setSuggestionsOpen(true)}
                >
                  {listingAssist.status === "loading"
                    ? "Combining photos & notes…"
                    : "Improve description"}
                </Button>
              )}
              {suggestionsOpen && (
                <Modal
                  title="Improve description"
                  onClose={() => setSuggestionsOpen(false)}
                >
                  {listingAssist.status === "success" &&
                  listingAssist.response?.metadata.description ? (
                    <>
                      <p className="quiet-caption">
                        Based on your photos and everything you wrote. Using
                        this replaces the notes below.
                      </p>
                      <p className="proposal-message-preview">
                        {listingAssist.response.metadata.description}
                      </p>
                      <Button
                        animateIcon
                        className="button primary"
                        type="button"
                        onClick={() => {
                          onSuggestionSelected(
                            listingAssist.response!.metadata.description!,
                          );
                          setSuggestionsOpen(false);
                        }}
                      >
                        Use this description
                      </Button>
                    </>
                  ) : (
                    <div role="status">
                      <p>
                        {listingAssist.status === "loading"
                          ? "Combining your photos and notes…"
                          : (listingAssist.error ??
                            "No description available yet.")}
                      </p>
                      {listingAssist.status !== "loading" && (
                        <Button
                          type="button"
                          className="button secondary"
                          onClick={listingAssist.retry}
                        >
                          Try again
                        </Button>
                      )}
                    </div>
                  )}
                </Modal>
              )}
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
                  : "Create draft"}
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
                  {missing.length
                    ? detailsToComplete(missing.length)
                    : "Complete"}
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
                        Condition{" "}
                        <span className="optional-label">Optional</span>
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
                      {measurementField && (
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
                      )}
                    </div>
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
                        Pickup by<span className="optional">Optional</span>
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
                {busy
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : cloud
                      ? "Publish listing"
                      : "Save listing locally"}
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
              <motion.strong key={draft.price} {...previewSwap}>
                {draft.price ? money(Number(draft.price)) : "Price not set"}
              </motion.strong>
              {draft.description && (
                <p className="listing-preview-description">
                  {draft.description}
                </p>
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
                  : "Flexible pickup"}
              </p>
            </div>
          </aside>
        </div>
      )}
    </MotionConfig>
  );
}
