import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createSaveQueue } from "../saveQueue";
import { saveJob } from "../studyJobs";
import type { StoredProgress } from "../studyProgress";

/** A failed save is tried this often in all before the page says it is unsaved. */
const SAVE_ATTEMPTS = 4;
const RETRY_BASE_MS = 800;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The save queue, with what a reload left unsaved sent again. */
export function useRecorder(stored: StoredProgress | null) {
  const [queue] = useState(() =>
    createSaveQueue({
      attempts: SAVE_ATTEMPTS,
      pause: (attempt) => wait(RETRY_BASE_MS * 2 ** (attempt - 1)),
    }),
  );
  const save = useSyncExternalStore(queue.subscribe, queue.getState);
  const resumed = useRef(false);
  // After a reload, what the server had not confirmed is sent again, once.
  useEffect(() => {
    if (resumed.current || !stored) return;
    resumed.current = true;
    stored.unsaved.forEach((key) => queue.add(saveJob(stored.progress, key)));
  }, [queue, stored]);
  return { save, add: queue.add, retry: queue.retry };
}

export type Recorder = ReturnType<typeof useRecorder>;
