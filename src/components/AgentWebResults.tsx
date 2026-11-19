import type { ReactNode } from "react";
import type { AgentRunStep } from "../hooks/useAgentRun";
import type { AgentRunSource } from "../../shared/runs";
import { Button } from "./ui/button";
import { Globe, LoaderCircle } from "./icons";
import AgentSources from "./AgentSources";
import "./agent-web-results.css";

export default function AgentWebResults({
  sources,
  searches,
  running,
  stopped,
  children,
  onRetry,
}: {
  sources: readonly AgentRunSource[];
  searches: readonly AgentRunStep[];
  running: boolean;
  stopped: boolean;
  children?: ReactNode;
  onRetry?: () => void;
}) {
  const latest = searches.at(-1);
  if (!latest && !sources.length && !children) return null;
  const searching =
    running && searches.some((step) => step.state === "running");
  const cancelled = latest?.failure?.code === "REQUEST_CANCELLED";
  const failed =
    !searching && !cancelled && !stopped && latest?.state === "error";
  // Sources wait for their summary, so the summary never pushes them down while it streams.
  const awaitingSummary = running && !children && sources.length > 0;
  const reviewing =
    running &&
    !searching &&
    !failed &&
    !cancelled &&
    (!sources.length || awaitingSummary);
  // Pako's status line already says he is searching; the section waits for something to show.
  if (
    (searching || reviewing) &&
    !children &&
    (!sources.length || awaitingSummary)
  )
    return null;
  const interrupted =
    cancelled ||
    (!running && searches.some((step) => step.state === "running"));
  const empty =
    !running &&
    !failed &&
    !interrupted &&
    latest?.state === "complete" &&
    !sources.length;
  return (
    <section
      className="agent-web-results agent-search-result-message"
      aria-label="Results from other sites"
      aria-busy={searching}
    >
      <h3>
        <Globe size={14} aria-hidden="true" />
        Other sites
      </h3>
      {(!failed || sources.length > 0) && children}
      {(searching || reviewing) && (
        <p className="agent-web-progress">
          <LoaderCircle size={14} animate aria-hidden="true" />
          {searching
            ? "I’m checking other sites…"
            : "I’m reading what I found…"}
        </p>
      )}
      {failed && (
        <div className="agent-web-recovery">
          <p role="status">
            {sources.length > 0 && "Some results are ready. "}
            {latest.failure?.message ??
              "Web search could not finish. Try again shortly."}
          </p>
          {!running && latest.failure?.retryable !== false && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
      {interrupted && (
        <p className="agent-web-note">I stopped checking other sites.</p>
      )}
      {/* The agent's own summary already says so when it wrote one. */}
      {empty && !children && (
        <p className="agent-web-note">I didn’t find a match on other sites.</p>
      )}
      {!awaitingSummary && <AgentSources sources={sources} />}
      {!awaitingSummary && sources.length > 0 && (
        <p className="agent-web-note">
          Check price and availability on the listing page.
        </p>
      )}
    </section>
  );
}
