import { STUDY_EVENTS_PER_BATCH } from "../../../shared/study.ts";
import type { SaveJob } from "../saveQueue.ts";
import {
  saveAnswer,
  saveEvents,
  sendPilot,
  startSession,
  withdrawSession,
} from "../studyApi.ts";
import type { V3Progress } from "./v3Progress.ts";
import { V3_VERSION } from "./v3Script.ts";

export const SESSION_KEY = "session";
export const PILOT_KEY = "pilot";
export const WITHDRAW_KEY = "withdraw";
const EVENTS_KEY = /^events-(\d+)-(\d+)$/;

const eventsKey = (from: number, to: number) => `events-${from}-${to}`;

function sessionJob(progress: V3Progress): SaveJob {
  return {
    key: SESSION_KEY,
    send: () =>
      startSession({
        session: progress.session,
        survey: "v3",
        version: V3_VERSION,
        language: progress.language,
        source: progress.source,
        device: progress.device,
        consent: true,
      }),
  };
}

function pilotJob(progress: V3Progress): SaveJob {
  const { pilot } = progress;
  if (!pilot) throw new Error("There is no pilot sign-up to send.");
  return { key: PILOT_KEY, send: () => sendPilot(pilot) };
}

function eventsJob(progress: V3Progress, from: number, to: number): SaveJob {
  const events = progress.events.slice(from, to);
  if (events.length !== to - from)
    throw new Error(`Events ${from} to ${to} are not recorded.`);
  return {
    key: eventsKey(from, to),
    send: () => saveEvents({ session: progress.session, events }),
  };
}

function answerJob(progress: V3Progress, step: string): SaveJob {
  const answer = progress.answers[step];
  if (!answer) throw new Error(`There is no answer to ${step} to save.`);
  return {
    key: step,
    send: () =>
      saveAnswer({
        session: progress.session,
        step,
        chosen: answer.chosen,
        firstChosen: answer.firstChosen,
        shown: answer.shown,
        text: answer.text,
        elapsedMs: answer.elapsedMs,
      }),
  };
}

/** The request behind one unsaved key of the participant's progress. */
export function v3Job(progress: V3Progress, key: string): SaveJob {
  if (key === SESSION_KEY) return sessionJob(progress);
  if (key === PILOT_KEY) return pilotJob(progress);
  if (key === WITHDRAW_KEY)
    return { key, send: () => withdrawSession(progress.session) };
  const range = EVENTS_KEY.exec(key);
  if (range) return eventsJob(progress, Number(range[1]), Number(range[2]));
  return answerJob(progress, key);
}

/** The events not yet queued, in batches the server accepts. */
export function eventJobs(progress: V3Progress): SaveJob[] {
  const jobs: SaveJob[] = [];
  const end = progress.events.length;
  for (
    let from = progress.queuedEvents;
    from < end;
    from += STUDY_EVENTS_PER_BATCH
  )
    jobs.push(
      eventsJob(progress, from, Math.min(from + STUDY_EVENTS_PER_BATCH, end)),
    );
  return jobs;
}
