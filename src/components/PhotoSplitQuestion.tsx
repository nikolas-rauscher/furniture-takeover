import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Minus, Plus } from "@/components/icons";
import type { PhotoGroup } from "../../shared/agent";
import { sortListingPhotos } from "../listingPhotos";
import Modal from "./Modal";
import Pako from "./onboarding/Pako";
import { Button } from "./ui/button";
import "./photo-split-question.css";

type Props = {
  photos: string[];
  groups: PhotoGroup[];
  onClose: () => void;
  /** Keep every photo in a single listing. */
  onTogether: () => void;
  /** One listing per group; `review` opens the sorting check first. */
  onSeparate: (groups: PhotoGroup[], review: boolean) => void;
};

const photoCount = (count: number) =>
  count === 1 ? "1 photo" : `${count} photos`;

/** Pako asks whether photos of different things become separate listings. */
export default function PhotoSplitQuestion({
  photos,
  groups,
  onClose,
  onTogether,
  onSeparate,
}: Props) {
  const [recounting, setRecounting] = useState(false);
  const [count, setCount] = useState(groups.length);
  const [sorting, setSorting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const countLabel = useId();
  useEffect(() => () => request.current?.abort(), []);

  /** The seller's own count: one listing, one per photo, Pako's piles, or a new sort. */
  async function applyCount() {
    if (sorting) return;
    if (count === 1) return onTogether();
    if (count === photos.length)
      return onSeparate(
        photos.map((_, index) => ({ photos: [index], label: "" })),
        true,
      );
    if (count === groups.length) return onSeparate(groups, true);
    const controller = new AbortController();
    request.current = controller;
    setSorting(true);
    setError("");
    try {
      onSeparate(
        await sortListingPhotos(photos, controller.signal, count),
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
    <Modal title={`${groups.length} different things?`} onClose={onClose}>
      <div className="split-question" aria-busy={sorting}>
        <div className="split-question-pako">
          <Pako mood={sorting ? "work" : error ? "think" : "happy"} size={72} />
          <p>
            {sorting
              ? "Sorting them again…"
              : `These photos look like ${groups.length} different things. Shall I make ${groups.length} listings?`}
          </p>
        </div>
        <ul className="split-question-groups">
          {groups.map((group, index) => (
            <li key={group.photos.join("-")}>
              <span className="split-question-pile" aria-hidden="true">
                {group.photos.slice(0, 3).map((photo, order) => (
                  <img
                    key={photo}
                    src={photos[photo]}
                    alt=""
                    style={{ "--pile": order } as CSSProperties}
                  />
                ))}
              </span>
              <span className="split-question-name">
                <strong>{group.label || `Thing ${index + 1}`}</strong>
                <small>{photoCount(group.photos.length)}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="split-question-actions">
          <Button
            animateIcon
            className="button primary large full"
            disabled={sorting}
            onClick={() => onSeparate(groups, false)}
          >
            Make {groups.length} listings
          </Button>
          <Button
            className="button secondary full"
            disabled={sorting}
            onClick={onTogether}
          >
            Keep as one listing
          </Button>
        </div>
        {recounting ? (
          <form
            className="split-question-recount"
            onSubmit={(event) => {
              event.preventDefault();
              void applyCount();
            }}
          >
            <span id={countLabel}>How many things are in these photos?</span>
            <div
              className="split-question-stepper"
              role="group"
              aria-labelledby={countLabel}
            >
              <Button
                className="icon-button"
                aria-label="One thing fewer"
                disabled={sorting || count <= 1}
                onClick={() => setCount((current) => current - 1)}
              >
                <Minus size={18} aria-hidden="true" />
              </Button>
              <output aria-live="polite">{count}</output>
              <Button
                className="icon-button"
                aria-label="One thing more"
                disabled={sorting || count >= photos.length}
                onClick={() => setCount((current) => current + 1)}
              >
                <Plus size={18} aria-hidden="true" />
              </Button>
            </div>
            <Button
              type="submit"
              className="button secondary"
              disabled={sorting}
            >
              {sorting
                ? "Sorting…"
                : count === 1
                  ? "Use one listing"
                  : `Sort into ${count}`}
            </Button>
            <p className="quiet-caption" role={error ? "alert" : undefined}>
              {error ||
                "You can check and move photos before the listings are written."}
            </p>
          </form>
        ) : (
          <Button
            className="button quiet split-question-more"
            disabled={sorting}
            onClick={() => setRecounting(true)}
          >
            Not right? Tell me how many
          </Button>
        )}
      </div>
    </Modal>
  );
}
