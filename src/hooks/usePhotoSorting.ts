import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PhotoGroup } from "../../shared/agent";
import { sortListingPhotos } from "../listingPhotos";

/** How Pako sorted a set of photos. */
type PhotoSort =
  /** One item: a single photo, one pile, or kept together by the student. */
  | { status: "one" }
  | { status: "sorting" }
  | { status: "several"; groups: PhotoGroup[] }
  /** Sorting did not work, so the photos are looked at as one item. */
  | { status: "failed" };

/**
 * Pako sorts two or more photos into one pile per item once they settle, once
 * per set of photos, unless the student keeps them together.
 */
export function usePhotoSorting({
  photos,
  photosKey,
  settled,
  enabled,
}: {
  photos: readonly string[];
  /** Stands for the photos in their order. */
  photosKey: string;
  /** The photos have stopped changing. */
  settled: boolean;
  enabled: boolean;
}) {
  const [result, setResult] = useState<{
    photos: string;
    /** No groups when sorting failed. */
    groups: PhotoGroup[] | null;
  } | null>(null);
  const [together, setTogether] = useState<string | null>(null);
  const request = useRef<{
    photos: string;
    controller: AbortController;
  } | null>(null);
  const wanted = enabled && photos.length > 1 && together !== photosKey;

  async function sort(key: string, controller: AbortController) {
    try {
      const groups = await sortListingPhotos([...photos], controller.signal);
      setResult({ photos: key, groups });
    } catch {
      // Sorting is only a hint: when it fails, the photos are looked at as one item.
      if (!controller.signal.aborted) setResult({ photos: key, groups: null });
    } finally {
      if (request.current?.controller === controller) request.current = null;
    }
  }

  const startSort = useEffectEvent(sort);
  // The key stands for the photos it was made from.
  useEffect(() => {
    if (!wanted || !settled || result?.photos === photosKey) return;
    if (request.current?.photos === photosKey) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { photos: photosKey, controller };
    void startSort(photosKey, controller);
  }, [wanted, settled, photosKey, result]);
  useEffect(() => () => request.current?.controller.abort(), []);

  const status: PhotoSort = !wanted
    ? { status: "one" }
    : result?.photos !== photosKey
      ? { status: "sorting" }
      : result.groups === null
        ? { status: "failed" }
        : result.groups.length > 1
          ? { status: "several", groups: result.groups }
          : { status: "one" };
  return { sort: status, keepTogether: () => setTogether(photosKey) };
}
