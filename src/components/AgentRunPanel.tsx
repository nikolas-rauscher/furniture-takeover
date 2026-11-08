import { Button } from "./ui/button";
import {
  AgentQuestion,
  AgentChanges,
  type AgentActionHandlers,
} from "./AgentActionControls";
import { answerParts, answerBlocks } from "./AgentAnswerContent";
import SmoothHeight from "./SmoothHeight";
import { useStreamingText } from "../hooks/useStreamingText";
import { useId, type ReactNode } from "react";
import AgentRunDetails from "./AgentRunDetails";
import AgentSources from "./AgentSources";
import AgentWebResults from "./AgentWebResults";
import { Ellipsis, MessageCircle } from "./icons";
import { MessageAvatar } from "./ui/message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  readOnly?: boolean;
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
  readOnly = false,
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
  if (!state.id && state.status === "idle") return null;
  const running = state.status === "running";
  const stopped = state.status === "idle";
  const safeSources = state.sources.filter((source) =>
    safeSourceUrl(source.url),
  );
  const webSearches = state.steps.filter((step) => step.task === "web");
  const webRetry = !readOnly && state.status !== "error" ? onRetry : undefined;
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

  const searchAnswer = splitSearchAnswer(
    questionOnlyAnswer ? "" : displayText,
    textArriving,
  );
  const sourceLinks =
    safeSources.length > 0 ? <AgentSources sources={safeSources} /> : null;
  const statusLabel = waitingForAnswer
    ? "Waiting for your answer"
    : running
      ? state.steps.length
        ? "Working"
        : "Starting your request"
      : stopped
        ? "Stopped"
        : state.status === "error"
          ? "Could not finish"
          : state.steps.some((step) => step.state === "error")
            ? "Partly completed"
            : state.steps.some((step) => step.state === "needs_input")
              ? "Some changes need more details"
              : "Finished";

  const heading = (
    <div className={`agent-run-heading${compact ? " agent-run-sender" : ""}`}>
      {compact && (
        <MessageAvatar className="agent-avatar" aria-hidden="true">
          <MessageCircle size={14} />
        </MessageAvatar>
      )}
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
                    : state.inventoryMatchIds !== null || safeSources.length > 0
                      ? "Here’s what I found"
                      : "Your agent’s response"}
      </h2>
      {compact && (
        <span
          className={
            [
              "Finished",
              "Working",
              "Starting your request",
              "Waiting for your answer",
            ].includes(statusLabel)
              ? "sr-only"
              : "agent-run-header-status"
          }
          role="status"
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
  const actions = (
    <div className="agent-run-actions">
      {running && (
        <Button type="button" onClick={onCancel}>
          Stop
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon-sm" className="agent-run-more" />}
          aria-label="Response actions"
        >
          <Ellipsis size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!running && !state.error && (
            <DropdownMenuItem onClick={onRetry}>Run again</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onReset}>
            Clear conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const panel = (
    <section
      className={`agent-run-panel ${running ? "is-running" : ""} ${splitSearchResults ? "split-search-results" : ""} ${compact ? "conversation-agent" : ""} ${className}`}
      data-run-id={state.id ?? undefined}
      aria-labelledby={headingId}
      aria-busy={running}
    >
      <div className="agent-run-progress" aria-hidden="true">
        <span />
      </div>
      {!compact && (
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
      )}
      {compact ? (
        <AgentRunDetails
          key={`details-${state.turnKey || state.id}`}
          reasoning={state.reasoning}
          steps={state.steps}
          running={running}
          heading={heading}
          actions={actions}
          status={statusLabel}
        />
      ) : (
        <div className="agent-run-header">
          {heading}
          {actions}
        </div>
      )}
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
              <AgentRunDetails
                reasoning={turn.reasoning}
                steps={turn.steps}
                running={false}
              />
              {turn.text && (
                <div className="agent-run-answer">
                  {answerBlocks(turn.text, turn.sources)}
                </div>
              )}
              <AgentSources sources={turn.sources} />
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
      {!compact && (
        <AgentRunDetails
          key={`details-${state.turnKey || state.id}`}
          reasoning={state.reasoning}
          steps={state.steps}
          running={running}
        />
      )}
      {splitSearchResults &&
        (localListings ||
          searchAnswer.takeover ||
          searchAnswer.answer ||
          sourceLinks ||
          searchAnswer.web ||
          webSearches.length > 0) && (
          <div className="agent-search-result-messages">
            {(localListings || searchAnswer.takeover) && (
              <section
                className="agent-search-result-message"
                aria-label="Takeover results"
              >
                {!localListings && <h3>Takeover</h3>}
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
            {searchAnswer.answer && (
              <div className="agent-run-answer">
                {answerBlocks(searchAnswer.answer, safeSources, textArriving)}
              </div>
            )}
            <AgentWebResults
              sources={safeSources}
              searches={webSearches}
              running={running}
              stopped={stopped}
              onRetry={webRetry}
            >
              {searchAnswer.web ? (
                <div className="agent-run-answer">
                  {answerBlocks(searchAnswer.web, safeSources, textArriving)}
                </div>
              ) : null}
            </AgentWebResults>
          </div>
        )}
      {!splitSearchResults && state.text && !questionOnlyAnswer && (
        <>
          <div className={compact ? "agent-search-result-message" : undefined}>
            <div className="agent-run-answer">
              {answerBlocks(displayText, safeSources, textArriving)}
            </div>
          </div>
        </>
      )}
      {!splitSearchResults && (
        <AgentWebResults
          sources={safeSources}
          searches={webSearches}
          running={running}
          stopped={stopped}
          onRetry={webRetry}
        />
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
          disabled={running}
          readOnly={readOnly}
          suggestion={
            question.id === priceQuestion?.id && priceSuggestions.length > 0 ? (
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
        <div className="agent-run-recovery">
          <p className="agent-run-error" role="alert">
            {state.error}
          </p>
          {!readOnly && !running && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
      {!running && state.status !== "idle" && state.diagnostic && (
        <details className="agent-run-debug">
          <summary>Error details</summary>
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
        </details>
      )}
      {stopped && !state.text && (
        <p className="agent-run-empty">
          Stopped. You can run this request again when you are ready.
        </p>
      )}
    </section>
  );
  return compact ? panel : <SmoothHeight>{panel}</SmoothHeight>;
}
