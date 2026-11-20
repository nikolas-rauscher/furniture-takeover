import { useId } from "react";
import { studyContactSchema } from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";

export type ContactDraft = { email: string; pilot: boolean; link: boolean };

export const EMPTY_CONTACT: ContactDraft = {
  email: "",
  pilot: false,
  link: false,
};

export function isValidEmail(email: string) {
  return studyContactSchema.shape.email.safeParse(email.trim()).success;
}

function Tick({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="tour-tick">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/** Part F: an optional address, stored apart from the answers unless linked. */
export default function ContactStep({
  draft,
  onChange,
}: {
  draft: ContactDraft;
  onChange: (draft: ContactDraft) => void;
}) {
  const id = useId();
  const words = useTourText().v1.contact;
  const invalid = draft.email.trim() !== "" && !isValidEmail(draft.email);
  return (
    <div className="tour-contact">
      <div className="tour-text">
        <label htmlFor={id} className="tour-text-label">
          {words.email}
        </label>
        <input
          id={id}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={draft.email}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-note`}
          onChange={(event) =>
            onChange({ ...draft, email: event.target.value })
          }
        />
        <p id={`${id}-note`} className="tour-text-count">
          {invalid ? words.invalid : words.note}
        </p>
      </div>
      <Tick
        label={words.pilot}
        checked={draft.pilot}
        onChange={(pilot) => onChange({ ...draft, pilot })}
      />
      <Tick
        label={words.link}
        checked={draft.link}
        onChange={(link) => onChange({ ...draft, link })}
      />
    </div>
  );
}
