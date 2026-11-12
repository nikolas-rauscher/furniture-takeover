import { Camera, LoaderCircle } from "lucide-react";
import "./photo-search.css";

type Props = {
  busy: boolean;
  disabled?: boolean;
  compact?: boolean;
  onFile: (file: File) => void;
};

/** Starts a visual search from an inspiration photo, e.g. a saved Pinterest image. */
export default function PhotoSearchButton({
  busy,
  disabled = false,
  compact = false,
  onFile,
}: Props) {
  const label = busy ? "Reading your photo…" : "Search by photo";
  return (
    <label
      className={`photo-search-button${compact ? " compact" : ""}`}
      title="Upload a photo or Pinterest image to find similar furniture"
      aria-disabled={disabled || busy}
    >
      {busy ? (
        <LoaderCircle className="spin" size={17} />
      ) : (
        <Camera size={17} />
      )}
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      <input
        type="file"
        aria-label="Search by photo"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** The first image in a paste or drop, so a copied Pinterest image works too. */
export function imageFrom(data: DataTransfer | null): File | null {
  return (
    Array.from(data?.files ?? []).find((file) =>
      file.type.startsWith("image/"),
    ) ?? null
  );
}
