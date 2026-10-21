import { listingMeasurementField } from "../listingPreparation";
import { PickupLocationInput } from "./PickupLocationInput";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Armchair,
  ArrowLeft,
  CalendarDays,
  Check,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import {
  TODAY,
  money,
  shortDate,
  type Category,
} from "../../shared/marketplace";
import type { AgentAssistState } from "../hooks/useAgentAssist";
import Modal from "./Modal";
import PhotoGallery from "./PhotoGallery";
import { listingPhotos } from "../../shared/listingPhotos";

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

type SellFlowProps = {
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
  agentWorking?: boolean;
  onBack: () => void;
  onDraftChange: (changes: Partial<ListingDraft>) => void;
  onPhotoSelected: (files: File[]) => void;
  onCreateDraft: () => void;
  onSuggestionSelected: (suggestion: string) => void;
  onPublish: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SellFlow({
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
  agentWorking = false,
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
  const measurementField = listingMeasurementField(draft);
  const unavailable = busy || photoReading;
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
    <>
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
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        {step === 2 && !editing
          ? "Back to photos"
          : editing
            ? "Back to my listings"
            : "Back to search"}
      </button>
      <div className="page-title">
        <h1 ref={headingRef} tabIndex={-1}>
          {isPhotoStep ? "What are you selling?" : "Your listing"}
        </h1>
        <p>
          {isPhotoStep
            ? "Add photos and a few details to create a draft."
            : "Your agent updates the draft as you talk. Save when you’re ready."}
        </p>
      </div>
      <div className="steps">
        <span
          className={isPhotoStep ? "active" : "completed"}
          aria-current={isPhotoStep ? "step" : undefined}
        >
          <i>{step === 2 ? <Check size={13} /> : 1}</i>Photos & details
        </span>
        <div />
        <span
          className={step === 2 ? "active" : ""}
          aria-current={step === 2 ? "step" : undefined}
        >
          <i>2</i>Draft & save
        </span>
      </div>

      {isPhotoStep ? (
        <div className="sell-layout" aria-busy={unavailable}>
          <div className="photo-upload-panel">
            {photoEditor}
            {uploadError && (
              <p className="form-error" role="alert">
                {uploadError}
              </p>
            )}
          </div>
          <form
            className="sell-inputs"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unavailable) onCreateDraft();
            }}
          >
            <label>
              A few details<span className="optional">Optional</span>
              <textarea
                rows={6}
                maxLength={4000}
                disabled={unavailable}
                value={draft.raw}
                onChange={(event) => onDraftChange({ raw: event.target.value })}
                placeholder="For example: Two books, CHF 10, pickup this weekend. Minor wear on the covers."
              />
            </label>
            <button
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
            </button>
            {suggestionsOpen && (
              <Modal
                title="Improve description"
                onClose={() => setSuggestionsOpen(false)}
              >
                {listingAssist.status === "success" && listingAssist.response?.metadata.description ? (
                  <>
                    <p className="quiet-caption">Based on your photos and everything you wrote. Using this replaces the notes below.</p>
                    <p className="proposal-message-preview">{listingAssist.response.metadata.description}</p>
                    <button className="button primary" type="button" onClick={() => {
                      onSuggestionSelected(listingAssist.response!.metadata.description!);
                      setSuggestionsOpen(false);
                    }}>Use this description</button>
                  </>
                ) : (
                  <div role="status">
                    <p>{listingAssist.status === "loading" ? "Combining your photos and notes…" : listingAssist.error ?? "No description available yet."}</p>
                    {listingAssist.status !== "loading" && <button type="button" className="button secondary" onClick={listingAssist.retry}>Try again</button>}
                  </div>
                )}
              </Modal>
            )}
            <PickupLocationInput
              value={draft.location}
              disabled={unavailable}
              onChange={(location) => onDraftChange({ location })}
            />
            <button
              className="button primary full"
              type="submit"
              disabled={unavailable || !liveAgent}
            >
              {unavailable && <LoaderCircle className="spin" size={17} />}
              {photoReading
                ? "Loading photo…"
                : busy
                  ? "Preparing draft…"
                  : "Create draft"}
            </button>
            <span className="quiet-caption">
              {liveAgent
                ? "Your photos and notes are combined into one listing description."
                : "Connect the AI service to create a draft."}
            </span>
          </form>
        </div>
      ) : (
        <div className="review-layout agent-review-layout">
          <div className="listing-workspace">
            {agentConversation}
            <form
              onSubmit={(event) => {
                if (
                  !draft.title.trim() ||
                  !draft.description.trim() ||
                  !draft.price.trim() ||
                  !draft.location.trim()
                ) {
                  event.preventDefault();
                  setFieldsOpen(true);
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
              <button
                type="button"
                className="text-button listing-edit-button"
                onClick={() => setFieldsOpen(true)}
              >
                Edit listing details
              </button>
              {fieldsOpen && (
                <Modal
                  title="Listing details"
                  onClose={() => setFieldsOpen(false)}
                >
                  <div className="review-form">
                    <label>
                      Title
                      <input
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
                      <textarea
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
                        <input
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
                        <select
                          value={draft.condition}
                          onChange={(event) =>
                            onDraftChange({ condition: event.target.value })
                          }
                        >
                          <option value="">Not specified</option>
                          {draft.condition &&
                            !["Very good", "Good", "Used"].includes(
                              draft.condition,
                            ) && <option>{draft.condition}</option>}
                          <option>Very good</option>
                          <option>Good</option>
                          <option>Used</option>
                        </select>
                      </label>
                      {measurementField && (
                        <label>
                          {measurementField.label}
                          <span className="optional">Optional</span>
                          <input
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
                        <input
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
                        <input
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
                  <button
                    type="button"
                    className="button primary full"
                    onClick={() => setFieldsOpen(false)}
                  >
                    Done
                  </button>
                </Modal>
              )}
              <button
                className="button primary full"
                type="submit"
                disabled={agentWorking}
              >
                <Check size={17} />
                {editing ? "Save changes" : "Save listing locally"}
              </button>
              <span className="quiet-caption">
                Saved in this browser. Not published to an external marketplace.
              </span>
            </form>
          </div>
          <aside className="listing-preview">
            <button
              type="button"
              className="text-button preview-label"
              onClick={() => setFieldsOpen(true)}
            >
              View listing details
            </button>
            <button
              type="button"
              className="listing-preview-photos"
              onClick={() => setPhotosOpen(true)}
              aria-label={`Edit listing photos (${photos.length})`}
            >
              <img src={draft.image} alt="Listing preview" />
              <span>
                {photos.length} photo{photos.length === 1 ? "" : "s"} · Edit
              </span>
            </button>
            <div>
              <span className="source-label">
                <Armchair size={13} />
                takeover
              </span>
              <h2>{draft.title || "Your item"}</h2>
              <strong>
                {draft.price ? money(Number(draft.price)) : "Price not set"}
              </strong>
              {draft.description && (
                <p className="listing-preview-description">
                  {draft.description}
                </p>
              )}
              {(draft.condition || draft.dimensions) && (
                <p>
                  {[draft.condition, draft.dimensions]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
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
    </>
  );
}
