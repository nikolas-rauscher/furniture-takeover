import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  STUDY_RESULTS_MINIMUM,
  type StudyResults,
} from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import { SaveStatus } from "../study/StudyEnd";
import { readResults } from "../studyApi";
import QrCode from "./QrCode";
import type { StepContext } from "./stepContext";
import { V3_MINUTES } from "./v3Script";

/** The channel tag of links shared from the end of the survey. */
const SHARE_TAG = "friend";

type Tally = Extract<StudyResults, { ready: true }>["desk"];
type ResultsState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; results: StudyResults };

const shareLink = () => `${window.location.origin}/tour?s=${SHARE_TAG}`;

function useResults() {
  const [state, setState] = useState<ResultsState>({ status: "loading" });
  useEffect(() => {
    let current = true;
    readResults()
      .then((results) => current && setState({ status: "ready", results }))
      .catch((error: unknown) => {
        console.error(error);
        if (current) setState({ status: "failed" });
      });
    return () => {
      current = false;
    };
  }, []);
  return state;
}

function Bars({
  title,
  rows,
  total,
  words,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  words: TourText["v3"]["end"];
}) {
  return (
    <figure className="tour-bars">
      <figcaption className="tour-row-title">{title}</figcaption>
      <ul>
        {rows.map(({ label, count }) => (
          <li key={label} className="tour-bar">
            <span className="tour-bar-label">{label}</span>
            <span className="tour-bar-track" aria-hidden="true">
              <span
                className="tour-bar-fill"
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </span>
            <span className="tour-bar-count">
              {words.ofAnswers(count, total)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const countOf = (tally: Tally, option: string) =>
  tally.options.find((entry) => entry.option === option)?.count ?? 0;

/** The desk split and the obstacles named last time, once enough people have answered. */
function OthersAnswered() {
  const text = useTourText();
  const words = text.v3.end;
  const state = useResults();
  let body;
  if (state.status === "loading")
    body = <p className="tour-save">{words.resultsLoading}</p>;
  else if (state.status === "failed")
    body = <p className="tour-save">{words.resultsFailed}</p>;
  else if (!state.results.ready)
    body = (
      <p className="tour-save">{words.resultsWaiting(STUDY_RESULTS_MINIMUM)}</p>
    );
  else {
    const { desk, trouble } = state.results;
    const troubleWords: Record<string, string> =
      text.v3.steps["last-trouble"].options;
    body = (
      <>
        <Bars
          title={words.deskTitle}
          total={desk.answered}
          words={words}
          rows={(["nearer", "cheaper", "neither"] as const).map((option) => ({
            label: words.deskOptions[option],
            count: countOf(desk, option),
          }))}
        />
        <Bars
          title={words.troubleTitle}
          total={trouble.answered}
          words={words}
          rows={[...trouble.options]
            .sort((a, b) => b.count - a.count)
            .map(({ option, count }) => ({
              label:
                option === "finding"
                  ? words.troubleFinding
                  : troubleWords[option],
              count,
            }))}
        />
      </>
    );
  }
  return (
    <section className="tour-card tour-results" aria-labelledby="results-title">
      <h2 id="results-title" className="tour-card-title">
        {words.resultsTitle}
      </h2>
      <div aria-live="polite">{body}</div>
    </section>
  );
}

type CopyState =
  { status: "idle" } | { status: "copied" } | { status: "failed" };

/** Passing the survey on: the phone's share sheet, a copied link or a QR code. */
function ShareBlock({ context }: { context: StepContext }) {
  const words = useTourText().v3.end;
  const [copy, setCopy] = useState<CopyState>({ status: "idle" });
  const [qrOpen, setQrOpen] = useState(false);
  const link = shareLink();
  const canShare = typeof navigator.share === "function";

  function shareNatively() {
    context.log("share", "native");
    navigator
      .share({ text: words.shareText(V3_MINUTES, link) })
      .catch((error: unknown) => {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error(error);
      });
  }

  function copyLink() {
    context.log("share", "copy");
    // Without a secure origin the clipboard is missing; that failure shows the link too.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(() => setCopy({ status: "copied" }))
      .catch((error: unknown) => {
        console.error(error);
        setCopy({ status: "failed" });
      });
  }

  function toggleQr() {
    if (!qrOpen) context.log("share", "qr");
    setQrOpen(!qrOpen);
  }

  return (
    <section className="tour-card tour-share" aria-labelledby="share-title">
      <h2 id="share-title" className="tour-card-title">
        {words.shareTitle}
      </h2>
      <div className="tour-share-actions">
        {canShare && (
          <Button className="button primary" onClick={shareNatively}>
            {words.share}
          </Button>
        )}
        <Button className="button secondary" onClick={copyLink}>
          {words.copy}
        </Button>
        <Button
          className="button secondary"
          aria-expanded={qrOpen}
          onClick={toggleQr}
        >
          {qrOpen ? words.hideQr : words.showQr}
        </Button>
      </div>
      <p className="tour-save" role="status">
        {copy.status === "copied" && words.copied}
        {copy.status === "failed" && (
          <>
            {words.copyFailed} <span className="tour-link">{link}</span>
          </>
        )}
      </p>
      {qrOpen && <QrCode text={link} label={words.qrLabel} />}
    </section>
  );
}

/** The thank-you, how saving went, how others answered and the share block. */
export default function V3End({ context }: { context: StepContext }) {
  const { v3, common } = useTourText();
  return (
    <div className="ob-welcome tour-end tour-v3-end">
      <h2 className="ob-title">{v3.end.title}</h2>
      <div role="status">
        <SaveStatus save={context.save} onRetry={context.retry} />
      </div>
      <OthersAnswered />
      <ShareBlock context={context} />
      <a className="button quiet large" href="/">
        {common.openApp}
      </a>
    </div>
  );
}
