import { useId } from "react";
import { STUDY_TEXT_MAX } from "../../../shared/study.ts";

/** A short free-text answer, capped at what the study stores. */
export default function TextAnswer({
  label,
  value,
  placeholder,
  onChange,
  autoFocus = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="tour-text">
      <label htmlFor={id} className="tour-text-label">
        {label}
      </label>
      <textarea
        id={id}
        className="tour-text-field"
        rows={3}
        maxLength={STUDY_TEXT_MAX}
        value={value}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-count`} className="tour-text-count">
        {value.length} of {STUDY_TEXT_MAX} characters
      </p>
    </div>
  );
}
