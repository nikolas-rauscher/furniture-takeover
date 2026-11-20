import { useEffect, useState } from "react";
import { randomUuid } from "../../randomUuid";
import { deviceClass } from "../deviceClass";
import { SESSION_KEY, saveJob } from "../studyJobs";
import {
  loadProgress,
  storeProgress,
  type StudyProgress,
} from "../studyProgress";
import { withOrder } from "../studyFlow";
import type { StudyLanguage } from "../../../shared/study.ts";
import { useTourLanguage } from "../i18n/TourLanguage";
import { STUDY_SCRIPTS } from "../tourScript";
import StudyStart from "./StudyStart";
import StudySteps from "./StudySteps";
import { useRecorder } from "./useRecorder";

function firstProgress(source: string, language: StudyLanguage): StudyProgress {
  const first = STUDY_SCRIPTS[language][0];
  return withOrder(
    {
      session: randomUuid(),
      source,
      device: deviceClass(),
      language,
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
  const [resumed] = useState(() =>
    stored ? stored.unsaved.map((key) => saveJob(stored.progress, key)) : [],
  );
  const [progress, setProgress] = useState<StudyProgress | null>(
    stored?.progress ?? null,
  );
  const recorder = useRecorder(resumed);
  const { language } = useTourLanguage();

  useEffect(() => {
    if (progress) storeProgress({ progress, unsaved: recorder.save.unsaved });
  }, [progress, recorder.save.unsaved]);

  function agree() {
    const started = firstProgress(source, language);
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
