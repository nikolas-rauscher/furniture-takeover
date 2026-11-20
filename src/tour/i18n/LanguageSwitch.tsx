import { STUDY_LANGUAGES } from "../../../shared/study.ts";
import { useTourLanguage } from "./TourLanguage";

/** EN, FR and DE as three toggles in the page's top corner. */
export default function LanguageSwitch() {
  const { language, text, setLanguage } = useTourLanguage();
  return (
    <div
      className="tour-language"
      role="group"
      aria-label={text.common.language}
    >
      {STUDY_LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          className="tour-language-option"
          lang={option}
          aria-pressed={option === language}
          aria-label={text.common.languageNames[option]}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
