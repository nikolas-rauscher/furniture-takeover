import type { CSSProperties } from "react";
import "./photo-bubble.css";

/** At most this many photos lie on the stack; the rest are counted. */
const STACKED = 3;

const photoCount = (count: number) =>
  count === 1 ? "Your photo" : `Your ${count} photos`;

/** The student's first message to Pako: the photos as a small stack, then their note. */
export default function PhotoBubble({
  photos,
  note,
}: {
  photos: readonly string[];
  note: string;
}) {
  const stacked = photos.slice(0, STACKED);
  const more = photos.length - stacked.length;
  return (
    <div className="photo-bubble">
      <span
        className="photo-bubble-stack"
        role="img"
        aria-label={photoCount(photos.length)}
      >
        {stacked.map((photo, index) => (
          <img
            key={photo}
            src={photo}
            alt=""
            style={{ "--stack": index } as CSSProperties}
          />
        ))}
        {more > 0 && (
          <span className="photo-bubble-more" aria-hidden="true">
            +{more}
          </span>
        )}
      </span>
      {note.trim() && <p>{note.trim()}</p>}
    </div>
  );
}
