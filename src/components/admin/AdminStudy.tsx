import { useCallback, useState, type ReactNode } from "react";
import type { StudyReport } from "../../../shared/study.ts";
import type { AdminApi } from "../../api/admin";
import { Button } from "../ui/button";
import { SelectField } from "../ui/select-field";
import AdminLoad from "./AdminLoad";
import { optionLabel, questionLabel } from "./studyWords";
import { useAdminResource } from "./useAdminResource";

type Cell = number | null;

/** The two questions about the "Wanted nearby" idea, shown together. */
const WANTED_STEPS = ["wanted-react", "wanted-share"];

const PLACES: Record<StudyReport["pilot"]["places"][number]["place"], string> =
  {
    vortex: "FMEL Vortex",
    atrium: "FMEL Atrium",
    triaudes: "FMEL Triaudes",
    "fmel-other": "Other FMEL residence",
    "other-res": "Other student residence",
    flat: "Flat or studio",
    elsewhere: "Somewhere else",
  };

/** A count the page works out itself, hidden from 1 to the minimum like the server's. */
function smallHidden(count: number, minCell: number): Cell {
  return count > 0 && count < minCell ? null : count;
}

/** A hidden count reads as "<5", the minimum the server applies. */
function cellText(count: Cell, minCell: number) {
  return count === null ? `<${minCell}` : String(count);
}

function percent(part: number, whole: number) {
  return whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;
}

function Totals({ report }: { report: StudyReport }) {
  const { started, completed, ended } = report.totals;
  return (
    <ul className="admin-tiles" aria-label="Sessions">
      <li className="admin-tile">
        <span className="admin-tile-value">{started}</span>
        <span className="admin-tile-label">Started</span>
      </li>
      <li className="admin-tile">
        <span className="admin-tile-value">{completed}</span>
        <span className="admin-tile-label">Finished the core</span>
        <span className="admin-tile-details">
          {percent(completed, started)} of started
        </span>
      </li>
      <li className="admin-tile">
        <span className="admin-tile-value">{ended}</span>
        <span className="admin-tile-label">Reached the end</span>
        <span className="admin-tile-details">
          {percent(ended, started)} of started
        </span>
      </li>
    </ul>
  );
}

/** A wide table scrolls by itself, and can be reached with the keyboard to do so. */
function ScrollTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="admin-study-table"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table>{children}</table>
    </div>
  );
}

function Days({ report }: { report: StudyReport }) {
  if (report.days.length === 0)
    return <p className="admin-empty">No sessions yet.</p>;
  return (
    <ScrollTable label="Table of sessions by day and channel">
      <thead>
        <tr>
          <th scope="col">Day (UTC)</th>
          <th scope="col">All</th>
          {report.sources.map((source) => (
            <th key={source} scope="col">
              {source}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {report.days.map((day) => (
          <tr key={day.day}>
            <th scope="row">{day.day}</th>
            <td>{cellText(day.total, report.minCell)}</td>
            {day.sources.map(({ source, count }) => (
              <td key={source}>{cellText(count, report.minCell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

/** One labelled bar: its count over the denominator, or "<5" without a bar. */
function Bar({
  label,
  detail,
  count,
  of,
  minCell,
}: {
  label: string;
  detail?: string;
  count: Cell;
  of: Cell;
  minCell: number;
}) {
  const share = count === null || of === null || of === 0 ? 0 : count / of;
  return (
    <li className="admin-study-bar">
      <span className="admin-study-bar-label">
        {label}
        {detail && <code>{detail}</code>}
      </span>
      <span className="admin-study-bar-count">
        {cellText(count, minCell)} / {cellText(of, minCell)}
      </span>
      <span className="admin-study-bar-track" aria-hidden="true">
        <span style={{ width: `${share * 100}%` }} />
      </span>
    </li>
  );
}

function Funnel({ report }: { report: StudyReport }) {
  const { started } = report.totals;
  return (
    <ol className="admin-study-bars">
      {report.funnel.map(({ step, reached }) => (
        <Bar
          key={step}
          label={questionLabel(step)}
          detail={step}
          count={reached}
          of={smallHidden(started, report.minCell)}
          minCell={report.minCell}
        />
      ))}
    </ol>
  );
}

function DropOff({ report }: { report: StudyReport }) {
  const left = report.totals.started - report.totals.completed;
  if (report.dropOff.length === 0)
    return <p className="admin-empty">Nobody has left before the end yet.</p>;
  return (
    <ul className="admin-study-bars">
      {report.dropOff.map(({ step, count }) => (
        <Bar
          key={step}
          label={questionLabel(step)}
          detail={step}
          count={count}
          of={smallHidden(left, report.minCell)}
          minCell={report.minCell}
        />
      ))}
    </ul>
  );
}

/** Bars per question, for every question or only the steps named. */
function Questions({
  report,
  only,
}: {
  report: StudyReport;
  only?: readonly string[];
}) {
  const questions = only
    ? report.questions.filter(({ step }) => only.includes(step))
    : report.questions;
  if (questions.length === 0)
    return <p className="admin-empty">No answers yet.</p>;
  return (
    <div className="admin-study-questions">
      {questions.map(({ step, answered, options }) => (
        <div key={step} className="admin-study-question">
          <h3>
            {questionLabel(step)} <code>{step}</code>
          </h3>
          <ul className="admin-study-bars">
            {options.map(({ option, count }) => (
              <Bar
                key={option}
                label={optionLabel(step, option)}
                count={count}
                of={answered}
                minCell={report.minCell}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The pack ladder: of everyone who entered it, how many would pay each price, with the
 * answers the ladder implies. Someone who left or was not sure counts as not yes.
 * Hidden counts stay hidden.
 */
function PackLadder({ report }: { report: StudyReport }) {
  const { entered, prices } = report.ladder;
  return (
    <ul className="admin-study-bars">
      {prices.map(({ price, yes }) => (
        <Bar
          key={price}
          label={`CHF ${price}: yes`}
          count={yes}
          of={entered}
          minCell={report.minCell}
        />
      ))}
    </ul>
  );
}

function Texts({ report }: { report: StudyReport }) {
  if (report.texts.length === 0)
    return <p className="admin-empty">No typed answers yet.</p>;
  return (
    <div className="admin-study-texts">
      {report.texts.map(({ step, texts }) => (
        <details key={step}>
          <summary>
            {questionLabel(step)}{" "}
            <span className="admin-heading-count">{texts.length}</span>
          </summary>
          <ul>
            {texts.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

function Pilot({ report }: { report: StudyReport }) {
  const { pilot, minCell } = report;
  return (
    <>
      <p className="admin-muted">
        {pilot.forms} {pilot.forms === 1 ? "form" : "forms"} ·{" "}
        {pilot.launchNews} want to hear when it is online · {pilot.tryEarly}{" "}
        want to try it early · {pilot.futureSurveys} want future surveys
      </p>
      <ScrollTable label="Table of those who want to try takeover early, by place and role">
        <thead>
          <tr>
            <th scope="col">Lives</th>
            <th scope="col">Sell</th>
            <th scope="col">Buy</th>
            <th scope="col">Both</th>
          </tr>
        </thead>
        <tbody>
          {pilot.places.map(({ place, sellers, buyers, both }) => (
            <tr key={place}>
              <th scope="row">{PLACES[place]}</th>
              <td>{cellText(sellers, minCell)}</td>
              <td>{cellText(buyers, minCell)}</td>
              <td>{cellText(both, minCell)}</td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
    </>
  );
}

function Panel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="admin-panel">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function Report({
  report,
  onVersion,
  onReload,
}: {
  report: StudyReport;
  onVersion: (version: string) => void;
  onReload: () => void;
}) {
  return (
    <div className="admin-study">
      <div className="admin-section-head">
        {report.versions.length > 1 && report.version ? (
          <SelectField
            aria-label="Wording version"
            value={report.version}
            onValueChange={onVersion}
            options={report.versions.map((version) => ({
              value: version,
              label: `Version ${version}`,
            }))}
          />
        ) : (
          <p className="admin-count">
            {report.version
              ? `Version ${report.version}`
              : "No v3 sessions yet"}
          </p>
        )}
        <Button className="button secondary small" onClick={onReload}>
          Refresh
        </Button>
      </div>
      <Totals report={report} />
      <Panel id="study-days" title="Sessions per day and channel">
        <Days report={report} />
      </Panel>
      <Panel id="study-funnel" title="Reached each screen of the core">
        <Funnel report={report} />
      </Panel>
      <Panel id="study-drop-off" title="Last screen of those who left">
        <DropOff report={report} />
      </Panel>
      <Panel id="study-pack" title="Move-out pack: acceptance per price">
        <PackLadder report={report} />
      </Panel>
      <Panel id="study-wanted" title="Wanted nearby">
        <Questions report={report} only={WANTED_STEPS} />
      </Panel>
      <Panel id="study-questions" title="Answers per question">
        <Questions report={report} />
      </Panel>
      <Panel id="study-texts" title="Typed answers">
        <Texts report={report} />
      </Panel>
      <Panel id="study-pilot" title="Form at the end">
        <Pilot report={report} />
      </Panel>
      <p className="admin-footnote">
        Counts from 1 to {report.minCell - 1} show as “&lt;{report.minCell}”, so
        a small group can’t be singled out. Each bar reads chosen over answered;
        in a multiple choice the bars add up to more. Forms at the end are not
        linked to answers, and cover every version.
      </p>
    </div>
  );
}

/** The user study's results for admins: counts only, never one person's answers. */
export default function AdminStudy({ api }: { api: AdminApi }) {
  const [version, setVersion] = useState<string | null>(null);
  const load = useCallback(() => api.studyReport(version), [api, version]);
  const { resource, reload } = useAdminResource(load);
  return (
    <AdminLoad resource={resource} onRetry={reload} what="the study results">
      {(report) => (
        <Report report={report} onVersion={setVersion} onReload={reload} />
      )}
    </AdminLoad>
  );
}
