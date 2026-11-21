import { useEffect, useState } from "react";
import { randomUuid } from "../../randomUuid";
import { deviceClass } from "../deviceClass";
import { useTourLanguage } from "../i18n/TourLanguage";
import { useRecorder, type Recorder } from "../study/useRecorder";
import { withEvent, withV3Order } from "./v3Flow";
import { SESSION_KEY, eventJobs, v3Job } from "./v3Jobs";
import { loadV3, storeV3, type V3Progress } from "./v3Progress";
import { V3_STEPS, V3_VERSION } from "./v3Script";
import V3Start from "./V3Start";
import V3Steps from "./V3Steps";
import type { StudyLanguage } from "../../../shared/study.ts";

/** Events wait until this many are recorded, or until the page goes quiet or hidden. */
const EVENTS_PER_FLUSH = 12;
const EVENTS_QUIET_MS = 4000;
/** These events end a part of the survey, so they are sent at once. */
const SEND_AT_ONCE = new Set(["core-complete", "end"]);

function firstProgress(source: string, language: StudyLanguage): V3Progress {
  const first = V3_STEPS[0];
  const started: V3Progress = {
    session: randomUuid(),
    version: V3_VERSION,
    source,
    device: deviceClass(),
    language,
    stepId: first.id,
    answers: {},
    orders: {},
    events: [],
    queuedEvents: 0,
    pilot: null,
    unsentDraft: null,
  };
  return withEvent(withV3Order(started, first), "shown", first.id);
}

/** Hands recorded events to the save queue in batches. */
function useEventFlush(
  progress: V3Progress | null,
  setProgress: (
    update: (current: V3Progress | null) => V3Progress | null,
  ) => void,
  recorder: Recorder,
) {
  useEffect(() => {
    if (!progress) return;
    const end = progress.events.length;
    if (end === progress.queuedEvents) return;
    const flush = () => {
      eventJobs(progress).forEach(recorder.add);
      setProgress(
        (current) =>
          current && {
            ...current,
            queuedEvents: Math.max(current.queuedEvents, end),
          },
      );
    };
    const last = progress.events[end - 1];
    if (
      end - progress.queuedEvents >= EVENTS_PER_FLUSH ||
      SEND_AT_ONCE.has(last.kind)
    ) {
      flush();
      return;
    }
    const timer = window.setTimeout(flush, EVENTS_QUIET_MS);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [progress, setProgress, recorder.add]);
}

/** Survey version 3: start and consent, then the steps, saved as they are answered. */
export default function V3Study({
  source,
  contact,
  deleteBy,
  onShowPitch,
}: {
  source: string;
  contact: string;
  deleteBy: string;
  onShowPitch: () => void;
}) {
  const { language } = useTourLanguage();
  const [{ stored, updated }] = useState(() => loadV3(source));
  const [resumed] = useState(() =>
    stored ? stored.unsaved.map((key) => v3Job(stored.progress, key)) : [],
  );
  const [progress, setProgress] = useState<V3Progress | null>(
    stored?.progress ?? null,
  );
  const recorder = useRecorder(resumed);
  useEventFlush(progress, setProgress, recorder);

  useEffect(() => {
    if (progress) storeV3({ progress, unsaved: recorder.save.unsaved });
  }, [progress, recorder.save.unsaved]);

  function agree() {
    const started = firstProgress(source, language);
    setProgress(started);
    recorder.add(v3Job(started, SESSION_KEY));
  }

  if (!progress)
    return (
      <V3Start
        contact={contact}
        deleteBy={deleteBy}
        updated={updated}
        onAgree={agree}
        onShowPitch={onShowPitch}
      />
    );
  return (
    <V3Steps
      progress={progress}
      setProgress={(update) =>
        setProgress((current) => {
          if (!current) throw new Error("The survey has not started.");
          return update(current);
        })
      }
      recorder={recorder}
      contact={contact}
      onShowPitch={onShowPitch}
    />
  );
}
