import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Globe } from "@/components/icons";
import { STUDY_LANGUAGES, type StudyLanguage } from "../../../shared/study.ts";
import { useTourLanguage } from "./TourLanguage";

/** The item that a key moves focus to, wrapping around at both ends. */
function itemAfter(key: string, current: number, count: number) {
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * A round language button in the page's top corner, following the menu button
 * pattern: its menu lists the three languages with the current one checked,
 * closes on a pick, Escape, Tab or a tap outside, and gives focus back to the
 * button. It never locks the page, so native scrolling and its position stay.
 */
export default function LanguageSwitch() {
  const { language, text, setLanguage } = useTourLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  // A tap or click anywhere outside closes the menu without moving focus.
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  // The open menu focuses the current language, as the pattern asks.
  useEffect(() => {
    if (open)
      items.current[STUDY_LANGUAGES.indexOf(language)]?.focus({
        preventScroll: true,
      });
  }, [open, language]);

  function close() {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  }

  function pick(option: StudyLanguage) {
    setLanguage(option);
    close();
  }

  function onMenuKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const current = items.current.findIndex(
      (item) => item === document.activeElement,
    );
    const next = itemAfter(event.key, current, STUDY_LANGUAGES.length);
    if (next === null) return;
    event.preventDefault();
    items.current[next]?.focus({ preventScroll: true });
  }

  function onButtonKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setOpen(true);
  }

  return (
    <div className="tour-language" ref={root}>
      <button
        ref={button}
        type="button"
        className="tour-language-button"
        aria-label={text.common.language}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-popup-open={open || undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKey}
      >
        <Globe size={22} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={text.common.language}
          className="tour-language-menu"
          onKeyDown={onMenuKey}
        >
          {STUDY_LANGUAGES.map((option, index) => (
            <li key={option} role="none">
              <button
                ref={(item) => {
                  items.current[index] = item;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={option === language}
                tabIndex={-1}
                lang={option}
                className="tour-language-item"
                onClick={() => pick(option)}
              >
                {text.common.languageNames[option]}
                {option === language && <Check size={18} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
