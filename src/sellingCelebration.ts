/** What My listings says right after listings were published or saved. */
export type Celebration = { title: string; text: string };

/** Published listings are for students nearby; saved ones stay on this device. */
export function celebrationFor(count: number, cloud: boolean): Celebration {
  if (count === 1)
    return cloud
      ? {
          title: "Listing published",
          text: "Students nearby can see your listing now.",
        }
      : {
          title: "Saved on this device",
          text: "Other students can't see it.",
        };
  return cloud
    ? {
        title: `${count} listings published`,
        text: "Students nearby can see them now.",
      }
    : {
        title: `${count} listings saved on this device`,
        text: "Other students can't see them.",
      };
}

/** Pako's note between two listings of a batch, naming the one just finished. */
export function batchStepNote({
  outcome,
  title,
  next,
  total,
  cloud,
}: {
  outcome: "saved" | "skipped";
  title: string;
  /** One-based number of the listing that comes next. */
  next: number;
  total: number;
  cloud: boolean;
}): string {
  const name = title.trim() ? `“${title.trim()}”` : "this one";
  const finished =
    outcome === "skipped"
      ? `Skipped ${name}.`
      : `${cloud ? "Published" : "Saved"} ${name}.`;
  return `${finished} Next up: listing ${next} of ${total}.`;
}
