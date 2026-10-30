import { useState } from "react";
import { Plus, X, Image as ImageIcon } from "lucide-react";
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
  const active = images.includes(selected) ? selected : images[0];
  const index = images.indexOf(active);
  const editable = Boolean(onFilesSelected && onImagesChange);
  const addControl = (label: string) => (
    <label
      className={`button ${images.length ? "secondary" : "primary"} file-label`}
    >
      {images.length > 0 && <Plus size={15} />}
      {label}
      <input
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || images.length >= MAX_LISTING_PHOTOS}
        onChange={(event) => {
          onFilesSelected?.(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );
  return (
    <div className={`photo-gallery ${editable ? "is-editable" : ""}`}>
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
            <span className="photo-gallery-count">
              {index + 1} / {images.length}
            </span>
            {editable && (
              <button
                className="icon-button photo-gallery-remove"
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                disabled={disabled}
                onClick={() =>
                  onImagesChange?.(images.filter((image) => image !== active))
                }
              >
                <X size={17} />
              </button>
            )}
          </>
        ) : !editable ? (
          <div className="listing-no-photo">
            <ImageIcon size={36} />
            <span>No photos added</span>
          </div>
        ) : (
          <>
            <h2>Add item photos</h2>
            <p>Drag photos here or choose files.</p>
            {addControl("Choose photos")}
            <span className="file-hint">
              Up to {MAX_LISTING_PHOTOS} photos · JPG, PNG or WebP · 2 MB each
            </span>
          </>
        )}
      </div>
      {images.length > 0 && (
        <div className="photo-gallery-controls">
          <div
            className="photo-gallery-thumbnails"
            role="group"
            aria-label="Listing photos"
          >
            {images.map((image, photoIndex) => (
              <button
                key={image}
                type="button"
                aria-label={`Show photo ${photoIndex + 1}${photoIndex === 0 ? " (cover)" : ""}`}
                aria-pressed={active === image}
                onClick={() => setSelected(image)}
              >
                <img src={image} alt="" />
                {photoIndex === 0 && editable && <span>Cover</span>}
              </button>
            ))}
          </div>
          {editable && (
            <div className="photo-gallery-actions">
              {addControl("Add photos")}
              {index > 0 && (
                <button
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
                </button>
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
