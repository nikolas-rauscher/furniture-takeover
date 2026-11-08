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
  return (
    <Toggle
      className={`save-toggle ${iconOnly ? "favorite-button" : ""} ${saved ? "favorited" : ""}`}
      pressed={saved}
      onPressedChange={onToggle}
      aria-label={`Save to favourites: ${title}`}
      title={saved ? "Remove from favourites" : "Save to favourites"}
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
