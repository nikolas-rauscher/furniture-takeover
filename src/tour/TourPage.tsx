import { useEffect, useState } from "react";
import { studyStartSchema, type StudyConfig } from "../../shared/study.ts";
import Pitch from "./pitch/Pitch";
import { lookInAddress } from "./tourLook";
import Study from "./study/Study";
import StudyNotice from "./study/StudyNotice";
import { readStudyConfig } from "./studyApi";
import V3Study from "./v3/V3Study";
import "../components/onboarding/onboarding.css";
import "../components/onboarding/onboarding-shell.css";
import "./tour.css";
import "./v3/v3.css";

type ConfigState =
  | { status: "loading" }
  | { status: "ready"; config: StudyConfig }
  | { status: "failed"; error: Error };

const SOURCE = studyStartSchema.shape.source;

function readAddress() {
  const params = new URLSearchParams(window.location.search);
  return {
    tag: params.get("s"),
    survey: params.get("v") === "1" ? "v1" : "v3",
  };
}

function useStudyConfig() {
  const [state, setState] = useState<ConfigState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    readStudyConfig()
      .then((config) => current && setState({ status: "ready", config }))
      .catch((error: Error) => {
        console.error(error);
        if (current) setState({ status: "failed", error });
      });
    return () => {
      current = false;
    };
  }, [attempt]);
  function retry() {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  }
  return { state, retry };
}

/**
 * Without a tag the page is the pitch; with one it is the survey, if the survey is open:
 * version 3 by default, version 1 with `&v=1`.
 */
export default function TourPage() {
  const [{ tag, survey }] = useState(readAddress);
  const [look] = useState(() => lookInAddress(window.location.search));
  const [pitch, setPitch] = useState(tag === null);
  const { state, retry } = useStudyConfig();
  const showPitch = () => {
    window.scrollTo({ top: 0 });
    setPitch(true);
  };

  if (pitch)
    return (
      <Pitch
        studyOpen={state.status === "ready" && state.config.open}
        look={look}
      />
    );
  const source = SOURCE.safeParse(tag);
  if (!source.success)
    return <StudyNotice kind="invalid-link" onShowPitch={showPitch} />;
  if (state.status === "loading")
    return <StudyNotice kind="loading" onShowPitch={showPitch} />;
  if (state.status === "failed")
    return (
      <StudyNotice kind="unreachable" onShowPitch={showPitch} onRetry={retry} />
    );
  if (!state.config.open)
    return <StudyNotice kind="closed" onShowPitch={showPitch} />;
  if (survey === "v3") {
    return (
      <V3Study
        source={source.data}
        contact={state.config.contact}
        deleteBy={state.config.deleteBy}
        onShowPitch={showPitch}
      />
    );
  }
  return (
    <Study
      source={source.data}
      contact={state.config.contact}
      deleteBy={state.config.deleteBy}
      onShowPitch={showPitch}
    />
  );
}
