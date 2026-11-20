import { useId } from "react";
import { STUDY_TEXT_MAX } from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";

/** A short free-text answer, capped at what the study stores. */
export default function TextAnswer({
  label,
  value,
  placeholder,
  onChange,
  autoFocus = false,
  max = STUDY_TEXT_MAX,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  /** At most what the study stores; a step may ask for less. */
  max?: number;
}) {
  const id = useId();
  const text = useTourText();
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
