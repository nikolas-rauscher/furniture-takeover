import { useId, useState, type ReactNode } from "react";
import { listingConditions } from "../../../shared/marketplace";
import {
  adminIllustrations,
  adminMeetingPoints,
  type AdminApi,
} from "../../api/admin";
import Modal from "../Modal";
import { Button } from "../ui/button";
import { SelectField } from "../ui/select-field";
import {
  editableStatuses,
  listingInput,
  placeOfMeetingPoint,
  placeOptions,
  statusLabels,
  type ListingDraft,
} from "./adminFormat";
import { useAdminAction } from "./useAdminAction";

type Seller = { id: string; name: string };

const NO_MEETING_POINT = "none";

/** A picture's readable name: "/samples/desk-lamp.svg" reads "desk lamp". */
const pictureName = (path: string) =>
  path
    .slice(path.lastIndexOf("/") + 1)
    .replace(/\.svg$/, "")
    .replaceAll("-", " ");

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

/** The bundled drawings as a grid of radio tiles; the chosen one wears the brand ring. */
function PicturePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (image: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="admin-pictures">
      <legend>Picture</legend>
      <div className="admin-pictures-grid">
        {adminIllustrations.map((image) => (
          <label key={image} className="admin-picture">
            <input
              type="radio"
              name={name}
              value={image}
              checked={value === image}
              onChange={() => onChange(image)}
            />
            <img src={image} alt={pictureName(image)} loading="lazy" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Edits one demo listing, or adds one. Saving refreshes the marketplace; a
 * refusal, such as an agreed deal, stays beside the save button.
 */
export default function ListingEditor({
  api,
  start,
  sellers,
  onSaved,
  onClose,
}: {
  api: AdminApi;
  start: ListingDraft;
  sellers: readonly Seller[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(start);
  const [open, setOpen] = useState(true);
  const [problem, setProblem] = useState("");
  const action = useAdminAction();
  const ids = {
    title: useId(),
    description: useId(),
    price: useId(),
    condition: useId(),
    status: useId(),
    seller: useId(),
    place: useId(),
    meeting: useId(),
    pickup: useId(),
    pickupBy: useId(),
    feedback: useId(),
  };
  const adding = start.id === undefined;
  const change = (patch: Partial<ListingDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const places = placeOptions.includes(draft.location)
    ? placeOptions
    : [draft.location, ...placeOptions];
  async function save() {
    const prepared = listingInput(draft);
    if ("problem" in prepared) {
      setProblem(prepared.problem);
      return;
    }
    setProblem("");
    if (await action.run(() => api.saveDemoListing(prepared.input))) {
      onSaved();
      setOpen(false);
    }
  }
  const feedback = problem || action.refusal;
  return (
    <Modal
      sheet
      wide
      open={open}
      title={adding ? "Add a demo listing" : "Edit listing"}
      initialFocus={ids.title}
      onClose={onClose}
    >
      <form
        className="admin-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="admin-editor-fields">
          <Field label="Title" id={ids.title}>
            <input
              id={ids.title}
              value={draft.title}
              maxLength={180}
              required
              onChange={(event) => change({ title: event.target.value })}
            />
          </Field>
          <Field label="Description" id={ids.description}>
            <textarea
              id={ids.description}
              rows={4}
              value={draft.description}
              maxLength={4000}
              onChange={(event) => change({ description: event.target.value })}
            />
          </Field>
          <div className="admin-editor-pair">
            <Field label="Price in CHF" id={ids.price}>
              <input
                id={ids.price}
                inputMode="decimal"
                autoComplete="off"
                value={draft.price}
                onChange={(event) => change({ price: event.target.value })}
              />
            </Field>
            <Field label="Condition" id={ids.condition}>
              <SelectField
                id={ids.condition}
                aria-label="Condition"
                value={draft.condition}
                onValueChange={(condition) => change({ condition })}
                options={listingConditions.map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Field>
          </div>
          <div className="admin-editor-pair">
            <Field label="Status" id={ids.status}>
              <SelectField
                id={ids.status}
                aria-label="Status"
                value={draft.status}
                onValueChange={(status) =>
                  change({ status: status as ListingDraft["status"] })
                }
                options={editableStatuses.map((value) => ({
                  value,
                  label: statusLabels[value],
                }))}
              />
            </Field>
            {adding ? (
              <Field label="Seller" id={ids.seller}>
                <SelectField
                  id={ids.seller}
                  aria-label="Seller"
                  value={draft.sellerId}
                  onValueChange={(sellerId) => change({ sellerId })}
                  options={sellers.map(({ id, name }) => ({
                    value: id,
                    label: name,
                  }))}
                />
              </Field>
            ) : (
              <div className="admin-field">
                <span className="admin-field-label">Seller</span>
                <p className="admin-field-fixed">
                  {sellers.find(({ id }) => id === draft.sellerId)?.name}
                </p>
              </div>
            )}
          </div>
          <div className="admin-editor-pair">
            <Field label="Meeting point" id={ids.meeting}>
              <SelectField
                id={ids.meeting}
                aria-label="Meeting point"
                value={draft.meetingPoint || NO_MEETING_POINT}
                onValueChange={(choice) => {
                  const meetingPoint =
                    choice === NO_MEETING_POINT ? "" : choice;
                  change({
                    meetingPoint,
                    location:
                      placeOfMeetingPoint(meetingPoint) ?? draft.location,
                  });
                }}
                options={[
                  { value: NO_MEETING_POINT, label: "No fixed meeting point" },
                  ...adminMeetingPoints.map((value) => ({
                    value,
                    label: value,
                  })),
                ]}
              />
            </Field>
            <Field label="Place" id={ids.place}>
              <SelectField
                id={ids.place}
                aria-label="Place"
                value={draft.location}
                onValueChange={(location) => change({ location })}
                options={places.map((value) => ({ value, label: value }))}
              />
            </Field>
          </div>
          <div className="admin-editor-pair">
            <Field label="Pickup window" id={ids.pickup}>
              <input
                id={ids.pickup}
                value={draft.pickup}
                maxLength={300}
                placeholder="Weekday evenings after 18:00"
                onChange={(event) => change({ pickup: event.target.value })}
              />
            </Field>
            <Field label="Pick up by" id={ids.pickupBy}>
              <input
                id={ids.pickupBy}
                type="date"
                value={draft.pickupBy}
                onChange={(event) => change({ pickupBy: event.target.value })}
              />
            </Field>
          </div>
        </div>
        <PicturePicker
          value={draft.image}
          onChange={(image) => change({ image })}
        />
        <div className="admin-editor-actions">
          {feedback && (
            <p id={ids.feedback} role="alert" className="admin-refusal">
              {feedback}
            </p>
          )}
          <Button
            type="button"
            className="button secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="button primary"
            disabled={action.busy}
            aria-describedby={feedback ? ids.feedback : undefined}
          >
            {action.busy ? "Saving…" : adding ? "Add listing" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
