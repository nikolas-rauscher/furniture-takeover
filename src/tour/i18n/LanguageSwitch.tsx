import { useState } from "react";
import { Globe } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STUDY_LANGUAGES, type StudyLanguage } from "../../../shared/study.ts";
import { useTourLanguage } from "./TourLanguage";

function asLanguage(value: unknown): StudyLanguage {
  const language = STUDY_LANGUAGES.find((option) => option === value);
  if (!language) throw new Error(`The tour has no language "${value}".`);
  return language;
}

/**
 * A round language button in the page's top corner; its menu lists the three
 * languages with the current one checked, and closes once one is picked.
 */
export default function LanguageSwitch() {
  const { language, text, setLanguage } = useTourLanguage();
  // The open menu renders inside the switch, so it stays in the page's landmark.
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  return (
    <div className="tour-language" ref={setLayer}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="tour-language-button"
          aria-label={text.common.language}
        >
          <Globe size={22} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="tour-language-menu"
          container={layer}
        >
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(value) => setLanguage(asLanguage(value))}
          >
            {STUDY_LANGUAGES.map((option) => (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                lang={option}
                closeOnClick
                className="tour-language-item"
              >
                {text.common.languageNames[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
