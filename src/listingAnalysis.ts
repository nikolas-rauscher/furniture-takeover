/** A short stand-in for a photo: its size and last characters tell photos apart. */
export const photoFingerprint = (photo: string) =>
  `${photo.length}:${photo.slice(-24)}`;

/** Which photos, note and pickup place one analysis looked at; the photo order counts. */
export function analysisKey({
  photos,
  note,
  location,
}: {
  photos: readonly string[];
  note: string;
  location: string;
}): string {
  return JSON.stringify([
    photos.map(photoFingerprint),
    note.trim(),
    location.trim(),
  ]);
}

/** Reuse a finished analysis, wait for the one under way, or ask for a new one. */
export function analysisPlan({
  readyKey,
  inFlightKey,
  currentKey,
}: {
  readyKey?: string;
  inFlightKey?: string;
  currentKey: string;
}): "reuse" | "await" | "fetch" {
  if (readyKey === currentKey) return "reuse";
  if (inFlightKey === currentKey) return "await";
  return "fetch";
}
