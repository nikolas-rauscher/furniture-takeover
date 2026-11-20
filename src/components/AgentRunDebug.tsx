import type { AgentRunDiagnostic } from "../../shared/runs";
import { useDeveloperMode } from "../availability/useDeveloperMode";

/** Run IDs and provider codes help a developer, not a student: shown in developer mode only. */
export default function AgentRunDebug({
  diagnostic,
}: {
  diagnostic: AgentRunDiagnostic | undefined;
}) {
  const { developerMode } = useDeveloperMode();
  if (!developerMode || !diagnostic) return null;
  return (
    <details className="agent-run-debug">
      <summary>Error details</summary>
      <p>{diagnostic.hint}</p>
      <dl>
        <dt>Run ID</dt>
        <dd>{diagnostic.runId}</dd>
        <dt>Error</dt>
        <dd>
          {diagnostic.code} · {diagnostic.errorType}
        </dd>
        <dt>Model</dt>
        <dd>{diagnostic.model}</dd>
        <dt>Stage</dt>
        <dd>{diagnostic.stage}</dd>
        <dt>Duration</dt>
        <dd>{(diagnostic.elapsedMs / 1000).toFixed(1)} s</dd>
        {diagnostic.providerStatus && (
          <>
            <dt>Provider HTTP</dt>
            <dd>{diagnostic.providerStatus}</dd>
          </>
        )}
      </dl>
    </details>
  );
}
