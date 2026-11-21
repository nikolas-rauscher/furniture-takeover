import { useState } from "react";
import { Toggle } from "./ui/toggle";
import { Heart } from "@/components/icons";

type SaveToggleProps = {
  title: string;
  saved: boolean;
  onToggle: () => void;
  iconOnly?: boolean;
};

export default function SaveToggle({
  title,
  saved,
  onToggle,
  iconOnly = false,
}: SaveToggleProps) {
  // The heart pops once after this control saved the item: not when saved
  // items load, and not again when a kept page shows the heart once more.
  const [justSaved, setJustSaved] = useState(false);
  return (
    <Toggle
      className={`save-toggle ${iconOnly ? "favorite-button" : ""} ${saved ? "favorited" : ""}`}
      data-just-saved={(saved && justSaved) || undefined}
      pressed={saved}
      onPressedChange={(nextSaved) => {
        setJustSaved(nextSaved);
        onToggle();
      }}
      onAnimationEnd={() => setJustSaved(false)}
      aria-label={`Save ${title}`}
      title={saved ? "Remove from saved items" : "Save item"}
    >
      <Heart
        initial={false}
        size={iconOnly ? 18 : 16}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {!iconOnly && (saved ? "Saved" : "Save item")}
    </Toggle>
  );
}
