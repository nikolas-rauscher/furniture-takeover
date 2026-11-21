import type { SaveJob } from "./saveQueue.ts";
import { saveAnswer, sendContact, startSession } from "./studyApi.ts";
import type { StudyProgress } from "./studyProgress.ts";

export const SESSION_KEY = "session";
export const CONTACT_KEY = "contact";

function contactJob(progress: StudyProgress): SaveJob {
  const { contact } = progress;
  if (!contact) throw new Error("There is no contact to send.");
  return { key: CONTACT_KEY, send: () => sendContact(contact) };
}

function answerJob(progress: StudyProgress, step: string): SaveJob {
  const answer = progress.answers[step];
  if (!answer) throw new Error(`There is no answer to ${step} to save.`);
  return {
    key: step,
    send: () =>
      saveAnswer({
        session: progress.session,
        step,
        chosen: answer.chosen,
        shown: answer.shown,
        text: answer.text,
        elapsedMs: answer.elapsedMs,
      }),
  };
}

/** The request behind one unsaved key of the participant's progress. */
export function saveJob(progress: StudyProgress, key: string): SaveJob {
  if (key === SESSION_KEY)
    return {
      key,
      send: () =>
        startSession({
          session: progress.session,
          survey: "v1",
          version: progress.version,
          language: progress.language,
          source: progress.source,
          device: progress.device,
          consent: true,
        }),
    };
  if (key === CONTACT_KEY) return contactJob(progress);
  return answerJob(progress, key);
}
