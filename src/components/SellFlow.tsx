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
import {
  Armchair,
  Image as ImageIcon,
  CalendarDays,
  Check,
  LoaderCircle,
  MapPin,
} from "@/components/icons";
import {
  TODAY,
  money,
  shortDate,
  type Category,
} from "../../shared/marketplace";
import type { AgentAssistState } from "../hooks/useAgentAssist";
import type { AgentQuota } from "../../shared/agent";
import Modal from "./Modal";
import PhotoGallery from "./PhotoGallery";
import ListingChecklist from "./ListingChecklist";
import WorkspaceHeader from "./WorkspaceHeader";
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
  const canCreateDraft =
    liveAgent && !unavailable && photos.length > 0 && quota?.remaining !== 0;
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
            <div className="photo-upload-panel">
              {photoEditor}
              {uploadError && (
                <p className="form-error" role="alert">
                  {uploadError}
                </p>
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
              className="button primary full"
              type="submit"
              form={formId}
              disabled={!canCreateDraft}
            >
              {unavailable && <LoaderCircle animate size={17} />}
              {photoReading
                ? "Loading photo…"
                : busy
                  ? "Preparing draft…"
                  : "Create draft"}
            </Button>
            <span className="quiet-caption">
              {photos.length > 0
                ? "Review and edit before publishing."
                : "Add at least one photo to create your draft."}
            </span>
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
                    ? `${missing.length} details to complete`
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
                className="text-button listing-edit-button"
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
                className="button primary full"
                type="submit"
                disabled={agentWorking || busy || photoReading}
              >
                <Check size={17} />
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
