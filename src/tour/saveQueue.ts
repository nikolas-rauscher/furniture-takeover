/**
 * Sends the study's saves one after another, in the order they were made: the session
 * has to exist before its answers. A failed save is retried a few times, unless the
 * failure is final; if it still fails, the queue stops there and keeps everything after
 * it until `retry`, or the next save, starts it again. Only telemetry is dropped instead.
 */

export type SaveJob = {
  /** A later job with the same key replaces a waiting one, such as a changed answer. */
  key: string;
  send: () => Promise<void>;
  /**
   * Telemetry, such as a batch of events. When its failure is final it is dropped and
   * reported in the console, so the saves after it still go out.
   */
  telemetry?: boolean;
};

export type SaveState = {
  /** Keys of the jobs the server has not confirmed yet, including the one being sent. */
  unsaved: string[];
  sending: boolean;
  /** The last error, while the queue is stopped at a failed job. */
  error: Error | null;
};

export type SaveQueueOptions = {
  attempts: number;
  /** Waits before the next attempt after `error`; attempt 1 is the first retry. */
  pause: (attempt: number, error: Error) => Promise<void>;
  /** Whether sending again cannot change the failure, so it is not retried. */
  isFinal: (error: Error) => boolean;
};

export type SaveQueue = ReturnType<typeof createSaveQueue>;

const asError = (reason: unknown) =>
  reason instanceof Error ? reason : new Error(String(reason));

export function createSaveQueue({
  attempts,
  pause,
  isFinal,
}: SaveQueueOptions) {
  let jobs: SaveJob[] = [];
  let sending = false;
  let error: Error | null = null;
  let state: SaveState = { unsaved: [], sending: false, error: null };
  const listeners = new Set<() => void>();

  function publish() {
    state = { unsaved: jobs.map((job) => job.key), sending, error };
    listeners.forEach((listener) => listener());
  }

  async function sendWithRetries(job: SaveJob) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await job.send();
        return;
      } catch (reason) {
        const failure = asError(reason);
        if (attempt >= attempts || isFinal(failure)) throw failure;
        await pause(attempt, failure);
      }
    }
  }

  /** Whether the queue goes on without the failed job. */
  const isDroppable = (job: SaveJob, failure: Error) =>
    job.telemetry === true && isFinal(failure);

  async function drain() {
    if (sending) return;
    sending = true;
    error = null;
    publish();
    while (jobs.length > 0) {
      const job = jobs[0];
      try {
        await sendWithRetries(job);
      } catch (reason) {
        const failure = asError(reason);
        if (!isDroppable(job, failure)) {
          error = failure;
          break;
        }
        console.error(`The server refused ${job.key} for good.`, failure);
      }
      // A replacement made while this job was on its way stays queued.
      jobs = jobs.filter((queued) => queued !== job);
      publish();
    }
    sending = false;
    publish();
  }

  function add(job: SaveJob) {
    const waiting = jobs.findIndex(
      (queued, index) => queued.key === job.key && !(sending && index === 0),
    );
    if (waiting === -1) jobs = [...jobs, job];
    else jobs = jobs.map((queued, index) => (index === waiting ? job : queued));
    void drain();
  }

  return {
    add,
    retry: () => void drain(),
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
