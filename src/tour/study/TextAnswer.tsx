import { useId } from "react";
import { STUDY_TEXT_MAX } from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";

/** A short free-text answer, capped at what the study stores; one line needs no counter. */
export default function TextAnswer({
  label,
  value,
  placeholder,
  onChange,
  autoFocus = false,
  max = STUDY_TEXT_MAX,
  singleLine = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  /** At most what the study stores; a step may ask for less. */
  max?: number;
  singleLine?: boolean;
}) {
  const id = useId();
  const text = useTourText();
  if (singleLine)
    return (
      <div className="tour-text">
        <label htmlFor={id} className="tour-text-label">
          {label}
        </label>
        <input
          id={id}
          type="text"
          className="tour-text-field"
          maxLength={max}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  return (
    <div className="tour-text">
      <label htmlFor={id} className="tour-text-label">
        {label}
      </label>
      <textarea
        id={id}
        className="tour-text-field"
        rows={3}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-count`} className="tour-text-count">
        {text.common.textCount(value.length, max)}
      </p>
    </div>
  );
}
