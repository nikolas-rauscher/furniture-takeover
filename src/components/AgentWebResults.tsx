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
  const reviewing =
    running && !searching && !failed && !cancelled && !sources.length;
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
      aria-label="Web search results"
      aria-busy={searching}
    >
      <h3>
        <Globe size={14} aria-hidden="true" />
        Web search
      </h3>
      {(!failed || sources.length > 0) && children}
      {(searching || reviewing) && (
        <p className="agent-web-progress" role="status">
          <LoaderCircle size={14} animate aria-hidden="true" />
          {searching ? "Searching the web…" : "Reviewing web results…"}
        </p>
      )}
      {failed && (
        <div className="agent-web-recovery">
          <p role="status">
            {sources.length > 0 && "Some results are available. "}
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
      {interrupted && <p className="agent-web-note">Web search was stopped.</p>}
      {empty && (
        <p className="agent-web-note">
          No matching web results were returned for this search.
        </p>
      )}
      <AgentSources sources={sources} previews />
      {sources.length > 0 && (
        <p className="agent-web-note">
          Search snippets · Check price and availability on the source.
        </p>
      )}
    </section>
  );
}
