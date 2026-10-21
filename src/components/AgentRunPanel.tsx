import {
  AgentQuestion,
  AgentChanges,
  type AgentActionHandlers,
} from "./AgentActionControls";
import {
  answerParts,
  answerBlocks,
  SourceThumbnail,
} from "./AgentAnswerContent";
import SmoothHeight from "./SmoothHeight";
import { useStreamingText } from "../hooks/useStreamingText";
import { motionBehavior } from "../uiMotion.ts";
import { useId, useRef, useLayoutEffect, type ReactNode } from "react";
import type { AgentRunSource } from "../../shared/runs";
import type { AgentRunState } from "../hooks/useAgentRun";
import { safeSourceUrl } from "../api/runs";
import { splitSearchAnswer } from "./agentAnswer";
import "./agent-run-panel.css";

type AgentRunPanelProps = AgentActionHandlers & {
  state: AgentRunState;
  onCancel: () => void;
  onRetry: () => void;
  onReset: () => void;
  className?: string;
  localListings?: ReactNode;
  outcome?: ReactNode;
  showHistory?: boolean;
  splitSearchResults?: boolean;
  conversational?: boolean;
  externalComposer?: boolean;
  appliedActionIds?: readonly string[];
  undoneActionIds?: readonly string[];
  actionNotices?: Readonly<Record<string, string>>;
};

export default function AgentRunPanel({
  state,
  onCancel,
  onRetry,
  onReset,
  className = "",
  localListings,
  outcome,
  showHistory = true,
  splitSearchResults = false,
  conversational = false,
  externalComposer = false,
  onAnswer,
  onSkipQuestion,
  onApplyAction,
  onUndoAction,
  onEditFields,
  appliedActionIds = [],
  undoneActionIds = [],
  actionNotices = {},
}: AgentRunPanelProps) {
  const compact = conversational || splitSearchResults;
  const headingId = useId();
  const displayText = useStreamingText(
    state.text,
    state.turnKey || state.id || "",
    state.status === "running" || state.status === "complete",
  );
  const textArriving = state.status === "running" || displayText !== state.text;
  const stepsRef = useRef<HTMLOListElement>(null);
  const followSteps = useRef(true);
  useLayoutEffect(() => {
    if (state.status === "running" && stepsRef.current && followSteps.current) {
      stepsRef.current.scrollTo({
        top: stepsRef.current.scrollHeight,
        behavior: motionBehavior(),
      });
    }
  }, [state.steps.length, state.status]);
  if (!state.id && state.status === "idle") return null;
  const running = state.status === "running";
  const stopped = state.status === "idle";
  const currentStep = [...state.steps]
    .reverse()
    .find((step) => step.state === "running");
  const safeSources = state.sources.filter((source) =>
    safeSourceUrl(source.url),
  );
  const priceQuestion = state.questions.find(
    (question) => question.input?.type === "price",
  );
  const priceSuggestions = priceQuestion
    ? state.actions.filter(
        (action) =>
          action.type === "listing_patch" &&
          action.requiresAcceptance &&
          "price" in action.patch,
      )
    : [];
  const standaloneActions = state.actions.filter(
    (action) => !priceSuggestions.includes(action),
  );
  const questionOnlyAnswer = state.questions.some(
    (question) => question.question.trim() === state.text.trim(),
  );
  const waitingForAnswer = state.questions.some(
    (question) => !state.answers[question.id],
  );

  const renderSource = (source: AgentRunSource) => (
    <a
      className="agent-run-source"
      key={source.id}
      href={safeSourceUrl(source.url)!}
      target="_blank"
      rel="noreferrer noopener"
    >
      {source.imageUrl && (
        <SourceThumbnail key={source.imageUrl} imageUrl={source.imageUrl} />
      )}
      <span className="agent-run-source-domain">
        {new URL(source.url).hostname.replace(/^www\./, "")}
      </span>
      <strong>{source.title}</strong>
      {source.snippet && <p>{source.snippet}</p>}
    </a>
  );
  const searchAnswer = splitSearchAnswer(
    questionOnlyAnswer ? "" : displayText,
    safeSources.length > 0,
  );
  const sourceCards =
    safeSources.length > 0 ? (
      <div className="agent-run-sources">
        <h3>
          Sources <span>({safeSources.length})</span>
        </h3>
        <p className="agent-run-source-notice">
          Search snippets. Prices and availability may have changed.
        </p>
        <div className="agent-run-source-grid">
          {safeSources.slice(0, 4).map(renderSource)}
        </div>
        {safeSources.length > 4 && (
          <details className="agent-run-more-sources">
            <summary>Show {safeSources.length - 4} more sources</summary>
            <div className="agent-run-source-grid">
              {safeSources.slice(4).map(renderSource)}
            </div>
          </details>
        )}
      </div>
    ) : null;
  const statusLabel = waitingForAnswer
    ? "Waiting for your answer"
    : running
      ? currentStep?.label || "Starting your request"
      : stopped
        ? "Stopped"
        : state.status === "error"
          ? "Could not finish"
          : state.steps.some((step) => step.state === "error")
            ? "Finished · Some steps failed"
            : state.steps.some((step) => step.state === "needs_input")
              ? "Some changes need more details"
              : "Finished";

  return (
    <SmoothHeight>
      <section
        className={`agent-run-panel ${running ? "is-running" : ""} ${splitSearchResults ? "split-search-results" : ""} ${compact ? "conversation-agent" : ""} ${className}`}
        data-run-id={state.id ?? undefined}
        aria-labelledby={headingId}
        aria-busy={running}
      >
        <div className="agent-run-progress" aria-hidden="true">
          <span />
        </div>
        <div className="agent-run-identity">
          <span className="agent-run-symbol" aria-hidden="true">
            ✳
          </span>
          <span>Your agent</span>
          <span className="agent-run-status" role="status">
            <span key={statusLabel} className="agent-run-status-text">
              {statusLabel}
            </span>
          </span>
        </div>
        <div className="agent-run-header">
          <h2 id={headingId}>
            {compact
              ? "Takeover AI"
              : waitingForAnswer
                ? "Let’s narrow it down"
                : running
                  ? "Working on your request…"
                  : stopped
                    ? "Run stopped"
                    : state.status === "error"
                      ? "Let’s try that again"
                      : state.proposal?.draft
                        ? "Your message draft"
                        : state.inventoryMatchIds !== null ||
                            safeSources.length > 0
                          ? "Here’s what I found"
                          : "Your agent’s response"}
          </h2>
          <div className="agent-run-actions">
            {running ? (
              <button type="button" onClick={onCancel}>
                Stop
              </button>
            ) : (
              <button type="button" onClick={onRetry}>
                {state.status === "error" ? "Try again" : "Run again"}
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              aria-label="Clear agent response"
            >
              Clear
            </button>
          </div>
        </div>
        {!splitSearchResults && localListings && (
          <div className="agent-local-listings">{localListings}</div>
        )}
        {showHistory && state.history.length > 0 && (
          <details className="agent-run-history" open>
            <summary>
              Earlier in this conversation ({state.history.length})
            </summary>
            {state.history.map((turn, index) => (
              <article key={turn.id || index}>
                {turn.request && (
                  <p className="agent-run-history-request">{turn.request}</p>
                )}
                {turn.text && (
                  <div className="agent-run-answer">
                    {answerBlocks(turn.text, turn.sources)}
                  </div>
                )}
                {turn.questions.map((question) => (
                  <div className="agent-run-history-question" key={question.id}>
                    {turn.text.trim() !== question.question.trim() && (
                      <p>{question.question}</p>
                    )}
                    {turn.answers[question.id] && (
                      <p className="agent-run-user-answer">
                        <span>Your answer</span>
                        {turn.answers[question.id]}
                      </p>
                    )}
                  </div>
                ))}
                {turn.actions.length > 0 && (
                  <p className="agent-run-history-changes">
                    {turn.actions.length}{" "}
                    {turn.actions.length === 1
                      ? "change was proposed"
                      : "changes were proposed"}{" "}
                    in this turn.
                  </p>
                )}
              </article>
            ))}
          </details>
        )}
        {
          <details className="agent-run-activity">
            <summary>
              <span
                className="agent-activity-live-label"
                key={currentStep?.id || state.status}
              >
                {running
                  ? currentStep?.label || "Reading your request…"
                  : "View activity"}
              </span>
              {!running && state.steps.some((step) => step.state === "error")
                ? " · Some steps failed"
                : state.steps.some((step) => step.state === "needs_input")
                  ? " · More details needed"
                  : ""}
            </summary>
            <ol
              ref={stepsRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                followSteps.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 64;
              }}
              className="agent-run-steps"
              aria-label="Agent activity"
            >
              {state.steps.map((step) => (
                <li
                  key={step.id}
                  className={`agent-run-step ${step.state}${running && step.state === "running" ? " is-active" : ""}`}
                >
                  <span className="agent-run-step-marker" aria-hidden="true" />
                  <span>{step.label}</span>
                  <span className="agent-run-step-state">
                    {step.state === "complete"
                      ? "Done"
                      : step.state === "needs_input"
                        ? "Needs details"
                        : step.state === "error"
                          ? "Failed"
                          : running
                            ? "In progress"
                            : "Stopped"}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        }
        {splitSearchResults && (
          <div className="agent-search-result-messages">
            {(localListings || searchAnswer.takeover) && (
              <section
                className="agent-search-result-message"
                aria-label="Takeover results"
              >
                <h3>Takeover</h3>
                {localListings && (
                  <div className="agent-local-listings">{localListings}</div>
                )}
                {searchAnswer.takeover && (
                  <div className="agent-run-answer">
                    {answerBlocks(searchAnswer.takeover, [], textArriving)}
                  </div>
                )}
              </section>
            )}
            {(sourceCards || searchAnswer.web) && (
              <section
                className="agent-search-result-message"
                aria-label="Web search results"
              >
                <h3>Web search</h3>
                {sourceCards}
                {searchAnswer.web && (
                  <div className="agent-run-answer">
                    {answerBlocks(searchAnswer.web, safeSources, textArriving)}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        {!splitSearchResults && state.text && !questionOnlyAnswer && (
          <>
            <div
              className={compact ? "agent-search-result-message" : undefined}
            >
              <div className="agent-run-answer">
                {answerBlocks(displayText, safeSources, textArriving)}
              </div>
            </div>
          </>
        )}
        {standaloneActions.length > 0 && (
          <div className="agent-run-changes">
            {standaloneActions.map((action) => (
              <AgentChanges
                key={action.id}
                action={action}
                sources={safeSources}
                applied={appliedActionIds.includes(action.id)}
                undone={undoneActionIds.includes(action.id)}
                notice={actionNotices[action.id]}
                onApply={onApplyAction}
                onUndo={onUndoAction}
                onEdit={onEditFields}
              />
            ))}
          </div>
        )}
        {state.questions.map((question) => (
          <AgentQuestion
            key={question.id}
            question={question}
            answer={state.answers[question.id]}
            onAnswer={onAnswer}
            onSkip={onSkipQuestion}
            compact={compact}
            externalComposer={externalComposer}
            suggestion={
              question.id === priceQuestion?.id &&
              priceSuggestions.length > 0 ? (
                <details className="agent-run-evidence price-suggestion-details">
                  <summary>Why this suggested price</summary>
                  {priceSuggestions.map((action) => (
                    <div key={action.id}>
                      {Object.keys(action.patch).some(
                        (field) => field !== "price",
                      ) ? (
                        <AgentChanges
                          action={action}
                          sources={safeSources}
                          applied={appliedActionIds.includes(action.id)}
                          undone={undoneActionIds.includes(action.id)}
                          notice={actionNotices[action.id]}
                          onApply={onApplyAction}
                          onUndo={onUndoAction}
                          onEdit={onEditFields}
                        />
                      ) : (
                        <p>{action.reason}</p>
                      )}
                      {action.evidence.map((evidence, index) => (
                        <p key={index}>
                          <q>{evidence.quote}</q>
                          {evidence.kind === "source" &&
                            answerParts(` [${evidence.sourceId}]`, safeSources)}
                        </p>
                      ))}
                    </div>
                  ))}
                </details>
              ) : undefined
            }
          />
        ))}
        {outcome}
        {state.error && (
          <p className="agent-run-error" role="alert">
            {state.error}
          </p>
        )}
        {!running &&
          state.status !== "idle" &&
          (!compact ||
            state.diagnostic ||
            state.steps.some((step) => step.state === "error")) && (
            <details className="agent-run-debug">
              <summary>Debug details</summary>
              {state.diagnostic ? (
                <>
                  <p>{state.diagnostic.hint}</p>
                  <dl>
                    <dt>Run ID</dt>
                    <dd>{state.diagnostic.runId}</dd>
                    <dt>Error</dt>
                    <dd>
                      {state.diagnostic.code} · {state.diagnostic.errorType}
                    </dd>
                    <dt>Model</dt>
                    <dd>{state.diagnostic.model}</dd>
                    <dt>Stage</dt>
                    <dd>{state.diagnostic.stage}</dd>
                    <dt>Duration</dt>
                    <dd>{(state.diagnostic.elapsedMs / 1000).toFixed(1)} s</dd>
                    {state.diagnostic.providerStatus && (
                      <>
                        <dt>Provider HTTP</dt>
                        <dd>{state.diagnostic.providerStatus}</dd>
                      </>
                    )}
                  </dl>
                </>
              ) : (
                <dl>
                  <dt>Run ID</dt>
                  <dd>{state.id ?? "No server run ID received"}</dd>
                  <dt>Status</dt>
                  <dd>{statusLabel}</dd>
                  <dt>Activity</dt>
                  <dd>
                    {state.steps
                      .map((step) => `${step.label}: ${step.state}`)
                      .join(" · ") || "No activity received"}
                  </dd>
                  <dt>Matches</dt>
                  <dd>{state.inventoryMatchIds?.length ?? "Not checked"}</dd>
                </dl>
              )}
              <p>
                No API keys, private prompts or raw provider responses are
                shown.
              </p>
            </details>
          )}
        {stopped && !state.text && (
          <p className="agent-run-empty">
            Stopped. You can run this request again when you are ready.
          </p>
        )}
        {!splitSearchResults &&
          sourceCards &&
          (compact ? (
            <details className="agent-run-more-sources">
              <summary>Research sources ({safeSources.length})</summary>
              {sourceCards}
            </details>
          ) : (
            sourceCards
          ))}
      </section>
    </SmoothHeight>
  );
}
