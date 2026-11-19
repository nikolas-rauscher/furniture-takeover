import { useCallback, useState } from "react";
import type { AdminOutput, AdminReport } from "../../../shared/admin.ts";
import type { AdminApi } from "../../api/admin";
import { Button } from "../ui/button";
import { actorName, moderationActionLabel, shortDate } from "./adminFormat";
import AdminLoad from "./AdminLoad";
import ReasonDialog from "./ReasonDialog";
import { useAdminResource } from "./useAdminResource";

type Block = AdminOutput<"list_blocks">[number];
type LogEntry = AdminOutput<"list_moderation_log">[number];

/** One moderation step waiting for its reason. */
type Step = {
  title: string;
  explanation: string;
  confirmLabel: string;
  danger?: boolean;
  run: (reason: string) => Promise<unknown>;
};

const studentName = (block: Pick<Block, "name" | "studentId">) =>
  block.name ?? `Student ${block.studentId.slice(0, 8)}`;

/** The reported listing or message as students saw it. */
function ReportTarget({ target }: { target: AdminReport["target"] }) {
  if (target.kind === "message")
    return (
      <div className="admin-report-target">
        <span className="admin-target-kind">Message</span>
        <p className="admin-report-message">{target.body}</p>
      </div>
    );
  return (
    <div className="admin-report-target">
      <span className="admin-target-kind">
        Listing
        {target.hidden && (
          <span className="admin-badge" data-status="hidden">
            Hidden
          </span>
        )}
      </span>
      <strong>{target.title}</strong>
      {target.description && (
        <p className="admin-report-description">{target.description}</p>
      )}
    </div>
  );
}

function ReportCard({
  report,
  blocked,
  onStep,
  api,
}: {
  report: AdminReport;
  blocked: boolean;
  onStep: (step: Step) => void;
  api: AdminApi;
}) {
  const { target, studentId } = report;
  const listingId = target.kind === "listing" ? target.id : target.listingId;
  const listingHidden = target.kind === "listing" && target.hidden;
  return (
    <li className="admin-report">
      <div className="admin-report-head">
        <strong>“{report.reason}”</strong>
        <span className="admin-listing-meta">
          Reported {shortDate(report.createdAt)}
        </span>
      </div>
      <ReportTarget target={target} />
      <div className="admin-row-actions">
        {!listingHidden && (
          <Button
            className="button secondary small"
            onClick={() =>
              onStep({
                title: "Hide this listing?",
                explanation: "Students won't see it in the marketplace.",
                confirmLabel: "Hide listing",
                run: (reason) =>
                  api.setListingHidden({ id: listingId, hidden: true, reason }),
              })
            }
          >
            Hide listing
          </Button>
        )}
        {studentId && !blocked && (
          <Button
            className="button secondary small"
            onClick={() =>
              onStep({
                title: "Block this student?",
                explanation:
                  "They can't post or edit listings, send messages, or update deals. Blocking leaves existing agreements in place.",
                confirmLabel: "Block student",
                danger: true,
                run: (reason) =>
                  api.setStudentBlocked({ studentId, blocked: true, reason }),
              })
            }
          >
            Block student
          </Button>
        )}
        {studentId && blocked && (
          <span className="admin-badge" data-status="blocked">
            Student blocked
          </span>
        )}
        <Button
          className="button primary small"
          onClick={() =>
            onStep({
              title: "Resolve this report?",
              explanation: "It leaves the open reports and stays in the log.",
              confirmLabel: "Resolve",
              run: (reason) => api.resolveReport({ id: report.id, reason }),
            })
          }
        >
          Resolve
        </Button>
      </div>
    </li>
  );
}

function BlockedList({
  blocks,
  onUnblock,
}: {
  blocks: readonly Block[];
  onUnblock: (block: Block) => void;
}) {
  if (blocks.length === 0)
    return <p className="admin-empty">Nobody is blocked.</p>;
  return (
    <ul className="admin-blocks">
      {blocks.map((block) => (
        <li key={block.studentId} className="admin-block">
          <div>
            <strong>{studentName(block)}</strong>
            <span className="admin-listing-meta">
              “{block.reason}” · {shortDate(block.at)}
            </span>
          </div>
          <Button
            className="button secondary small"
            aria-label={`Unblock ${studentName(block)}`}
            onClick={() => onUnblock(block)}
          >
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  );
}

function ModerationLog({ entries }: { entries: readonly LogEntry[] }) {
  if (entries.length === 0)
    return <p className="admin-empty">No moderation steps yet.</p>;
  return (
    <ol className="admin-log">
      {entries.map((entry) => (
        <li key={entry.id}>
          <strong>{moderationActionLabel(entry.action)}</strong>
          <span className="admin-log-reason">“{entry.reason}”</span>
          <span className="admin-listing-meta">
            {actorName(entry.adminId)} · {shortDate(entry.at)}
            {entry.targetId && ` · ${entry.targetId}`}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Open reports in context with their steps, the blocked students and the log of every step. */
export default function AdminModeration({ api }: { api: AdminApi }) {
  const load = useCallback(
    () =>
      Promise.all([
        api.listReports(),
        api.listBlocks(),
        api.listModerationLog(),
      ]),
    [api],
  );
  const { resource, reload } = useAdminResource(load);
  const [step, setStep] = useState<Step | null>(null);
  return (
    <AdminLoad resource={resource} onRetry={reload} what="moderation">
      {([reports, blocks, log]) => {
        const open = reports.filter((report) => !report.resolvedAt);
        const blockedIds = new Set(blocks.map((block) => block.studentId));
        return (
          <div className="admin-moderation">
            <section aria-labelledby="admin-reports" className="admin-panel">
              <h2 id="admin-reports">
                Open reports{" "}
                <span className="admin-heading-count">{open.length}</span>
              </h2>
              {open.length === 0 ? (
                <p className="admin-empty">No open reports.</p>
              ) : (
                <ul className="admin-reports">
                  {open.map((report) => (
                    <ReportCard
                      key={report.id}
                      api={api}
                      report={report}
                      blocked={
                        report.studentId !== null &&
                        blockedIds.has(report.studentId)
                      }
                      onStep={setStep}
                    />
                  ))}
                </ul>
              )}
            </section>
            <div className="admin-moderation-side">
              <section aria-labelledby="admin-blocked" className="admin-panel">
                <h2 id="admin-blocked">
                  Blocked{" "}
                  <span className="admin-heading-count">{blocks.length}</span>
                </h2>
                <BlockedList
                  blocks={blocks}
                  onUnblock={(block) =>
                    setStep({
                      title: `Unblock ${studentName(block)}?`,
                      explanation:
                        "They can post listings and send messages again.",
                      confirmLabel: "Unblock",
                      run: (reason) =>
                        api.setStudentBlocked({
                          studentId: block.studentId,
                          blocked: false,
                          reason,
                        }),
                    })
                  }
                />
              </section>
              <section aria-labelledby="admin-log" className="admin-panel">
                <h2 id="admin-log">Moderation log</h2>
                <ModerationLog entries={log} />
              </section>
            </div>
            {step && (
              <ReasonDialog
                title={step.title}
                explanation={step.explanation}
                confirmLabel={step.confirmLabel}
                danger={step.danger}
                onConfirm={step.run}
                onDone={reload}
                onClose={() => setStep(null)}
              />
            )}
          </div>
        );
      }}
    </AdminLoad>
  );
}
