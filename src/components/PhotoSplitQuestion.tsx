import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { PhotoGroup } from "../../shared/agent";
import { sortListingPhotos } from "../listingPhotos";
import Modal from "./Modal";

type Props = {
  photos: string[];
  groups: PhotoGroup[];
  onClose: () => void;
  /** Keep every photo in a single listing. */
  onTogether: () => void;
  /** One listing per group; `review` opens the sorting check first. */
  onSeparate: (groups: PhotoGroup[], review: boolean) => void;
};

/** Asks the seller whether photos of different items become separate listings. */
export default function PhotoSplitQuestion({
  photos,
  groups,
  onClose,
  onTogether,
  onSeparate,
}: Props) {
  const [count, setCount] = useState(String(groups.length));
  const [sorting, setSorting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const chosen = Number(count);
  const valid =
    Number.isInteger(chosen) && chosen >= 1 && chosen <= photos.length;

  async function applyCount() {
    if (!valid || sorting) return;
    if (chosen === 1) return onTogether();
    if (chosen === photos.length)
      return onSeparate(
        photos.map((_, index) => ({ photos: [index], label: "" })),
        true,
      );
    if (chosen === groups.length) return onSeparate(groups, true);
    const controller = new AbortController();
    request.current = controller;
    setSorting(true);
    setError("");
    try {
      onSeparate(
        await sortListingPhotos(photos, controller.signal, chosen),
        true,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(
        error instanceof Error
          ? error.message
          : "Could not sort the photos. Try again.",
      );
      setSorting(false);
    }
  }

  return (
    <Modal title={`${groups.length} different items?`} onClose={onClose}>
      <div className="split-question" aria-busy={sorting}>
        <p>
          Your photos seem to show {groups.length} different items. Should I
          create a separate listing for each, or keep everything in one listing?
        </p>
        <ul className="split-question-groups">
          {groups.map((group, index) => (
            <li key={group.photos.join("-")}>
              <span className="split-question-photos">
                {group.photos.map((photo) => (
                  <img key={photo} src={photos[photo]} alt="" />
                ))}
              </span>
              <strong>{group.label || `Item ${index + 1}`}</strong>
            </li>
          ))}
        </ul>
        <div className="split-question-actions">
          <button
            type="button"
            className="button primary full"
            disabled={sorting}
            onClick={() => onSeparate(groups, false)}
          >
            Create {groups.length} separate listings
          </button>
          <button
            type="button"
            className="button secondary full"
            disabled={sorting}
            onClick={onTogether}
          >
            Keep as one listing
          </button>
        </div>
        <form
          className="split-question-count"
          onSubmit={(event) => {
            event.preventDefault();
            void applyCount();
          }}
        >
          <label>
            Not correct? Enter your number of listings
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={photos.length}
              step={1}
              required
              disabled={sorting}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="button secondary"
            disabled={!valid || sorting}
          >
            {sorting && <LoaderCircle className="spin" size={16} />}
            {sorting
              ? "Sorting…"
              : valid && chosen === 1
                ? "Use 1 listing"
                : `Sort into ${valid ? chosen : "…"} listings`}
          </button>
          <span className="quiet-caption">
            {error ||
              `Between 1 and ${photos.length}. You can check and move photos before the listings are written.`}
          </span>
        </form>
      </div>
    </Modal>
  );
}
