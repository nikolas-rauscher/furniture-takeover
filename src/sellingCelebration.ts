/** What My listings says right after listings were published or saved. */
export type Celebration = { title: string; text: string };

export function celebrationFor(count: number, cloud: boolean): Celebration {
  if (count === 1)
    return cloud
      ? {
          title: "It's live!",
          text: "Students nearby can see your listing now.",
        }
      : { title: "Saved!", text: "Your listing is ready in this browser." };
  return cloud
    ? {
        title: `${count} listings are live!`,
        text: "Students nearby can see them now.",
      }
    : {
        title: `${count} listings saved!`,
        text: "They're ready in this browser.",
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
