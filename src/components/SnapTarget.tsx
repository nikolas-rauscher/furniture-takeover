import { useId, useRef, useState, type DragEvent } from "react";
import { Camera } from "@/components/icons";
import { MAX_LISTING_PHOTOS } from "../../shared/listingPhotos";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type SnapTargetProps = {
  disabled: boolean;
  onFilesSelected: (files: File[]) => void;
};

/** The empty photo step as a viewfinder: one big shutter opens the camera or photo library. */
export default function SnapTarget({
  disabled,
  onFilesSelected,
}: SnapTargetProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  function leave(event: DragEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node && event.currentTarget.contains(next)))
      setDragging(false);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onFilesSelected(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      className="snap-target"
      data-dragging={dragging || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={leave}
      onDrop={drop}
    >
      <svg
        className="snap-target-corners"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M2 12V2h12" />
        <path d="M86 2h12v10" />
        <path d="M98 88v10H86" />
        <path d="M14 98H2V88" />
      </svg>
      <Button
        className="snap-target-shutter"
        disabled={disabled}
        aria-describedby={hintId}
        onClick={() => fileInput.current?.click()}
      >
        <span className="snap-target-lens" aria-hidden="true">
          <Camera size={30} />
        </span>
        Add photos
      </Button>
      <p id={hintId} className="snap-target-hint">
        Up to {MAX_LISTING_PHOTOS} photos · JPG, PNG or WebP · 2&nbsp;MB each
      </p>
      <Input
        ref={fileInput}
        type="file"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        onChange={(event) => {
          onFilesSelected(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
