import { useEffect, useRef, useState } from "react";
import type { AssistResponse, PhotoGroup } from "../../shared/agent";
import { requestAgentAssist } from "../api/agent";
import {
  analysisKey,
  analysisPlan,
  photoFingerprint,
} from "../listingAnalysis";
import { usePhotoSorting } from "./usePhotoSorting";
import { useSettledText } from "./useSettledText";

/** Photos count once they have stopped changing for this long. */
const PHOTOS_SETTLE_MS = 1200;
/** The note counts once the student has stopped typing for this long, or leaves the field. */
const NOTE_SETTLE_MS = 1500;

/** What Pako knows about the photos of the listing being written. */
export type PhotoInsight =
  | { status: "empty" }
  /** He sorts several photos into one pile per item. */
  | { status: "sorting"; photoCount: number }
  /** The photos show several things, one pile each. */
  | { status: "several"; groups: PhotoGroup[] }
  /** He looks at the photos, or only at a changed note. */
  | { status: "reading"; noteOnly: boolean }
  /** He looked at the photos together with this note. */
  | { status: "ready"; response: AssistResponse; note: string }
  | { status: "failed"; error: string; retry: () => void }
  | { status: "unavailable" };

export type AnalysisInput = {
  photos: readonly string[];
  note: string;
  location: string;
};

type Result =
  { ok: true; response: AssistResponse } | { ok: false; error: unknown };
type InFlight = {
  key: string;
  photos: string;
  controller: AbortController;
  result: Promise<Result>;
};

const photosOf = (photos: readonly string[]) =>
  photos.map(photoFingerprint).join("|");

function unwrap(result: Result): AssistResponse {
  if (result.ok) return result.response;
  throw result.error;
}

/**
 * Pako's look at a listing's photos and note: it starts once the photos settle,
 * runs once per photos, note and place, and starting the draft reuses it.
 */
export function useListingAnalysis({
  photos,
  note,
  location,
  active,
  available,
}: AnalysisInput & {
  /** A new listing's photo step is open, so its photos are looked at on their own. */
  active: boolean;
  /** Pako can be asked; otherwise he only looks when the draft starts. */
  available: boolean;
}) {
  const photosKey = photosOf(photos);
  const [settledPhotos, flushPhotos] = useSettledText(
    photosKey,
    PHOTOS_SETTLE_MS,
  );
  const [settledNote, flushNote] = useSettledText(note, NOTE_SETTLE_MS);
  const [ready, setReady] = useState<{
    key: string;
    photos: string;
    response: AssistResponse;
  } | null>(null);
  const [failed, setFailed] = useState<{ key: string; error: string } | null>(
    null,
  );
  const inFlight = useRef<InFlight | null>(null);
  const settled = settledPhotos === photosKey;
  const { sort, keepTogether } = usePhotoSorting({
    photos,
    photosKey,
    settled,
    enabled: active && available,
  });
  /** Pako looks at the photos as one item once sorting found one, or could not sort them. */
  const oneItem = sort.status === "one" || sort.status === "failed";
  // While the student still types, Pako waits for the note instead of looking twice.
  const typing = note.trim() !== settledNote.trim();
  const key = analysisKey({ photos, note: settledNote, location });

  /** Asks for one analysis; its result is kept for every later caller with the same key. */
  function request(requestKey: string, input: AnalysisInput) {
    const controller = new AbortController();
    const result = requestAgentAssist(
      {
        intent: "listing",
        text: input.note,
        images: [...input.photos],
        context: { location: input.location },
      },
      { signal: controller.signal },
    ).then(
      (response): Result => {
        if (!controller.signal.aborted)
          setReady({
            key: requestKey,
            photos: photosOf(input.photos),
            response,
          });
        return { ok: true, response };
      },
      (error: unknown): Result => {
        if (!controller.signal.aborted)
          setFailed({
            key: requestKey,
            error:
              error instanceof Error
                ? error.message
                : "Could not look at the photos. Try again.",
          });
        return { ok: false, error };
      },
    );
    inFlight.current = {
      key: requestKey,
      photos: photosOf(input.photos),
      controller,
      result,
    };
    void result.then(() => {
      if (inFlight.current?.controller === controller) inFlight.current = null;
    });
    return result;
  }

  // Each new set of photos is a new item: an analysis of the old ones is no longer wanted.
  useEffect(() => {
    if (inFlight.current && inFlight.current.photos !== photosKey) {
      inFlight.current.controller.abort();
      inFlight.current = null;
    }
  }, [photosKey]);
  useEffect(() => () => inFlight.current?.controller.abort(), []);

  useEffect(() => {
    if (!active || !available || !photos.length || !settled || typing) return;
    if (!oneItem) return;
    if (
      ready?.key === key ||
      failed?.key === key ||
      inFlight.current?.key === key
    )
      return;
    void request(key, { photos, note: settledNote, location });
    // The key stands for the photos, note and place it was made from.
  }, [active, available, settled, typing, oneItem, key, ready, failed]);

  /** The analysis of exactly these photos, note and place: finished, under way or new. */
  async function ensure(input: AnalysisInput): Promise<AssistResponse> {
    flushPhotos();
    flushNote();
    const currentKey = analysisKey(input);
    const plan = analysisPlan({
      readyKey: ready?.key,
      inFlightKey: inFlight.current?.key,
      currentKey,
    });
    if (plan === "reuse" && ready) return ready.response;
    if (plan === "await" && inFlight.current)
      return unwrap(await inFlight.current.result);
    return unwrap(await request(currentKey, input));
  }
  const retry = () => setFailed(null);

  const insight: PhotoInsight = !photos.length
    ? { status: "empty" }
    : !available
      ? { status: "unavailable" }
      : sort.status === "sorting"
        ? { status: "sorting", photoCount: photos.length }
        : sort.status === "several"
          ? { status: "several", groups: sort.groups }
          : settled && ready?.key === key
            ? {
                status: "ready",
                response: ready.response,
                note: settledNote.trim(),
              }
            : settled && failed?.key === key
              ? { status: "failed", error: failed.error, retry }
              : {
                  status: "reading",
                  noteOnly: settled && ready?.photos === photosKey,
                };
  return {
    insight,
    ensure,
    flushNote,
    keepTogether,
    sortFailed: sort.status === "failed",
  };
}
