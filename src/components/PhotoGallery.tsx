import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./ui/empty";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTrigger,
} from "./ui/attachment";
import { useId, useRef, useState } from "react";
import { Plus, X, Image as ImageIcon } from "@/components/icons";
import { MAX_LISTING_PHOTOS } from "../../shared/listingPhotos";
import "./photo-gallery.css";

type Props = {
  images: string[];
  title: string;
  disabled?: boolean;
  onFilesSelected?: (files: File[]) => void;
  onImagesChange?: (images: string[]) => void;
};

export default function PhotoGallery({
  images,
  title,
  disabled = false,
  onFilesSelected,
  onImagesChange,
}: Props) {
  const [selected, setSelected] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const active = images.includes(selected) ? selected : images[0];
  const index = images.indexOf(active);
  const editable = Boolean(onFilesSelected && onImagesChange);
  const addControl = (label: string) => (
    <Button
      type="button"
      variant={images.length ? "outline" : "default"}
      className="photo-add-button"
      disabled={disabled || images.length >= MAX_LISTING_PHOTOS}
      aria-describedby={images.length ? undefined : hintId}
      onClick={() => fileInput.current?.click()}
    >
      <Plus size={16} aria-hidden="true" />
      {label}
    </Button>
  );
  return (
    <div className={`photo-gallery ${editable ? "is-editable" : ""}`}>
      {editable && (
        <Input
          ref={fileInput}
          type="file"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || images.length >= MAX_LISTING_PHOTOS}
          onChange={(event) => {
            onFilesSelected?.(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      )}
      <div
        className={`photo-gallery-stage ${editable ? "upload-zone" : ""} ${active ? "has-image" : ""}`}
        onDragOver={editable ? (event) => event.preventDefault() : undefined}
        onDrop={
          editable
            ? (event) => {
                event.preventDefault();
                if (!disabled)
                  onFilesSelected?.(Array.from(event.dataTransfer.files));
              }
            : undefined
        }
      >
        {active ? (
          <>
            <img
              key={active}
              src={active}
              alt={`${title} — photo ${index + 1} of ${images.length}`}
            />
            {images.length > 1 && (
              <span className="photo-gallery-count">
                {index + 1} / {images.length}
              </span>
            )}
            {editable && (
              <Button
                className="icon-button photo-gallery-remove"
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                disabled={disabled}
                onClick={() =>
                  onImagesChange?.(images.filter((image) => image !== active))
                }
              >
                <X size={17} />
              </Button>
            )}
          </>
        ) : !editable ? (
          <div className="listing-no-photo">
            <ImageIcon size={36} />
            <span>No photos added</span>
          </div>
        ) : (
          <Empty className="photo-upload-empty">
            <EmptyHeader>
              <EmptyTitle>Add item photos</EmptyTitle>
              <EmptyDescription>Show the item and any wear.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {addControl("Add photos")}
              <span id={hintId} className="file-hint">
                Up to {MAX_LISTING_PHOTOS} photos · JPG, PNG or WebP · 2 MB each
              </span>
            </EmptyContent>
          </Empty>
        )}
      </div>
      {images.length > 0 && (editable || images.length > 1) && (
        <div className="photo-gallery-controls">
          <AttachmentGroup
            className="photo-gallery-thumbnails"
            role="group"
            aria-label="Listing photos"
          >
            {images.map((image, photoIndex) => (
              <Attachment
                key={image}
                orientation="vertical"
                size="xs"
                className="photo-attachment"
                data-selected={active === image}
              >
                <AttachmentTrigger
                  aria-label={`Show photo ${photoIndex + 1}${photoIndex === 0 ? " (cover)" : ""}`}
                  aria-pressed={active === image}
                  onClick={() => setSelected(image)}
                />
                <AttachmentMedia variant="image">
                  <img src={image} alt="" />
                </AttachmentMedia>
                {photoIndex === 0 && editable && (
                  <span className="photo-cover-label">Cover</span>
                )}
              </Attachment>
            ))}
          </AttachmentGroup>
          {editable && (
            <div className="photo-gallery-actions">
              {addControl("Add photos")}
              {index > 0 && (
                <Button
                  className="text-button"
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onImagesChange?.([
                      active,
                      ...images.filter((image) => image !== active),
                    ])
                  }
                >
                  Make cover
                </Button>
              )}
              <span>
                {images.length}/{MAX_LISTING_PHOTOS}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
