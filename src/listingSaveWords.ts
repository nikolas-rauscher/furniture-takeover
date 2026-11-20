import type { BatchProgress } from "./listingDraft";

/**
 * Accounts publish a listing for other students; the local demo only saves it on
 * this device, and its button says so.
 */
export function listingSaveWords(cloud: boolean) {
  return cloud
    ? {
        verb: "Publish",
        gerund: "publishing",
        action: "Publish listing",
        andNext: "Publish & next",
        audience:
          "Students can find it on takeover. You can edit or archive it later.",
      }
    : {
        verb: "Save",
        gerund: "saving",
        action: "Save on this device",
        andNext: "Save & next",
        audience: "It stays on this device. Other students can't see it.",
      };
}

/** The save button's words: an edit is saved, a new listing published or saved, then the next one. */
export function saveActionLabel({
  cloud,
  editing,
  batch,
}: {
  cloud: boolean;
  editing: boolean;
  batch?: Pick<BatchProgress, "index" | "covers">;
}) {
  if (editing) return "Save changes";
  const words = listingSaveWords(cloud);
  const more = batch !== undefined && batch.index + 1 < batch.covers.length;
  return more ? words.andNext : words.action;
}
