import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { StudyLanguage } from "../../../shared/study.ts";
import { initialLanguage, rememberLanguage } from "./language";
import { TOUR_TEXT } from "./tourText";
import type { TourText } from "./en";

type LanguageState = {
  language: StudyLanguage;
  text: TourText;
  setLanguage: (language: StudyLanguage) => void;
};

const LanguageContext = createContext<LanguageState | null>(null);

/** The page's language: the visitor's choice for this tab, else the browser's. */
export function TourLanguage({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    rememberLanguage(language);
  }, [language]);
  return (
    <LanguageContext
      value={{ language, text: TOUR_TEXT[language], setLanguage }}
    >
      {children}
    </LanguageContext>
  );
}

export function useTourLanguage(): LanguageState {
  const state = useContext(LanguageContext);
  if (!state) throw new Error("The tour's language is read outside its page.");
  return state;
}

/** The page's words in the visitor's language. */
export const useTourText = () => useTourLanguage().text;
