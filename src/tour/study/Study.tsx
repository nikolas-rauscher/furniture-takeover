import { useEffect, useState } from "react";
import { randomUuid } from "../../randomUuid";
import { SESSION_KEY, saveJob } from "../studyJobs";
import {
  loadProgress,
  storeProgress,
  type StudyProgress,
} from "../studyProgress";
import { withOrder } from "../studyFlow";
import { STUDY_STEPS } from "../tourScript";
import StudyStart from "./StudyStart";
import StudySteps from "./StudySteps";
import { useRecorder } from "./useRecorder";

const PHONE_QUERY = "(hover: none) and (pointer: coarse)";

function firstProgress(source: string): StudyProgress {
  const first = STUDY_STEPS[0];
  return withOrder(
    {
      session: randomUuid(),
      source,
      device: window.matchMedia(PHONE_QUERY).matches ? "phone" : "desktop",
      stepId: first.id,
      answers: {},
      orders: {},
      contact: null,
    },
    first,
  );
}

/** The study: invitation, consent, then the steps of the script, saved as they are answered. */
export default function Study({
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
  const [stored] = useState(() => loadProgress(source));
  const [progress, setProgress] = useState<StudyProgress | null>(
    stored?.progress ?? null,
  );
  const recorder = useRecorder(stored);

  useEffect(() => {
    if (progress) storeProgress({ progress, unsaved: recorder.save.unsaved });
  }, [progress, recorder.save.unsaved]);

  function agree() {
    const started = firstProgress(source);
    setProgress(started);
    recorder.add(saveJob(started, SESSION_KEY));
  }

  if (!progress)
    return (
      <StudyStart
        contact={contact}
        deleteBy={deleteBy}
        onAgree={agree}
        onShowPitch={onShowPitch}
      />
    );
  return (
    <StudySteps
      progress={progress}
      onProgress={setProgress}
      recorder={recorder}
    />
  );
}
