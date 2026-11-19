import { useRef } from "react";
import { Camera, LoaderCircle } from "@/components/icons";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type PhotoSearchButtonProps = {
  /** Pako is reading the photo. */
  busy: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
};

/** Opens the camera or photo library to find something like the photo, e.g. a saved Pinterest image. */
export default function PhotoSearchButton({
  busy,
  disabled,
  onFile,
}: PhotoSearchButtonProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        type="button"
        className="button secondary small photo-search-button"
        aria-label={busy ? "Reading your photo" : "Search with a photo"}
        title="Show me a photo, I'll find similar things"
        disabled={disabled || busy}
        onClick={() => fileInput.current?.click()}
      >
        {busy ? (
          <LoaderCircle animate size={18} aria-hidden="true" />
        ) : (
          <Camera size={18} aria-hidden="true" />
        )}
        <span className="photo-search-label">Photo</span>
      </Button>
      <Input
        ref={fileInput}
        type="file"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
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
