import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createSaveQueue, type SaveJob } from "../saveQueue";

/** A failed save is tried this often in all before the page says it is unsaved. */
const SAVE_ATTEMPTS = 4;
const RETRY_BASE_MS = 800;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The save queue, with what a reload left unsaved sent again. */
export function useRecorder(resumed: readonly SaveJob[]) {
  const [queue] = useState(() =>
    createSaveQueue({
      attempts: SAVE_ATTEMPTS,
      pause: (attempt) => wait(RETRY_BASE_MS * 2 ** (attempt - 1)),
    }),
  );
  const save = useSyncExternalStore(queue.subscribe, queue.getState);
  const resent = useRef(false);
  // After a reload, what the server had not confirmed is sent again, once.
  useEffect(() => {
    if (resent.current) return;
    resent.current = true;
    resumed.forEach(queue.add);
  }, [queue, resumed]);
  return { save, add: queue.add, retry: queue.retry };
}

export type Recorder = ReturnType<typeof useRecorder>;
