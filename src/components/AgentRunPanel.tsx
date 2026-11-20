import { Button } from "./ui/button";
import {
  AgentQuestion,
  AgentChangeLine,
  AgentChanges,
  type AgentActionHandlers,
} from "./AgentActionControls";
import { answerBlocks } from "./AgentAnswerContent";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { useStreamingText } from "../hooks/useStreamingText";
import { useId, type ReactNode } from "react";
import AgentRunDetails from "./AgentRunDetails";
import AgentRunDebug from "./AgentRunDebug";
import AgentSources from "./AgentSources";
import AgentWebResults from "./AgentWebResults";
import { Ellipsis } from "./icons";
import PakoReaction from "./PakoReaction";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { AgentRunState } from "../hooks/useAgentRun";
import { safeSourceUrl } from "../api/runs";
import { shownAnswerText, splitSearchAnswer } from "./agentAnswer";
import {
  agentTurnPako,
  busyGuide,
  settledSteps,
  workingLine,
} from "../pakoMoods";
import "./agent-run-panel.css";

type AgentRunPanelProps = AgentActionHandlers & {
  state: AgentRunState;
  onCancel: () => void;
  onRetry: () => void;
  onReset: () => void;
  className?: string;
  localListings?: ReactNode;
  outcome?: ReactNode;
  /** Replies the student can tap; they appear once the answer is fully shown. */
  quickReplies?: ReactNode;
  /** The search area as Pako names it while he searches. */
  place?: string;
  showHistory?: boolean;
  splitSearchResults?: boolean;
  externalComposer?: boolean;
  readOnly?: boolean;
  /** The composer has text, so Pako listens once the turn has ended. */
  typing?: boolean;
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
  quickReplies,
  place,
  showHistory = true,
  splitSearchResults = false,
  externalComposer = false,
  readOnly = false,
  typing = false,
  onAnswer,
  onSkipQuestion,
  onApplyAction,
  onUndoAction,
  onEditFields,
  appliedActionIds = [],
  undoneActionIds = [],
  actionNotices = {},
}: AgentRunPanelProps) {
  const compact = splitSearchResults;
  const headingId = useId();
  const answerText = shownAnswerText(state.text, state.questions);
  const displayText = useStreamingText(
    answerText,
    state.turnKey || state.id || "",
    state.status === "running" || state.status === "complete",
  );
  const textArriving = state.status === "running" || displayText !== answerText;
  if (!state.id && state.status === "idle") return null;
  const running = state.status === "running";
  const stopped = state.status === "idle";
  const safeSources = state.sources.filter((source) =>
    safeSourceUrl(source.url),
  );
  const webSearches = state.steps.filter((step) => step.task === "web");
  const webRetry = !readOnly && state.status !== "error" ? onRetry : undefined;
  // Search changes apply as they arrive, so one that changed nothing has nothing to report.
  const shownActions = state.actions.filter(
    (action) =>
      action.type !== "preferences_patch" ||
      appliedActionIds.includes(action.id),
  );
  const steps = settledSteps(state.steps);
  // Pako ran out of activities mid-comparison: the student taps to let him go on.
  const unfinished = state.diagnostic?.code === "STEP_LIMIT";
  // Queued questions wait their turn: only the next one shows beside the answered ones.
  const nextQuestion = state.questions.find(
    (question) => !state.answers[question.id],
  );
  const waitingForAnswer = nextQuestion !== undefined;
  const shownQuestions = state.questions.filter(
    (question) => question === nextQuestion || state.answers[question.id],
  );

  const searchAnswer = splitSearchAnswer(displayText, textArriving);
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
        : state.congested === "failed"
          ? "Busy right now"
          : state.status === "error"
            ? "Couldn't finish"
            : steps.some((step) => step.state === "error")
              ? "Some results are ready"
              : steps.some((step) => step.state === "needs_input")
                ? "Some changes need more details"
                : "Finished";

  // Without steps or reasoning, the activity line itself names the status.
  // Only the live turn moves; earlier turns keep a resting Pako beside them.
  const pako = agentTurnPako(
    { ...state, text: answerText },
    { textShown: displayText, typing },
  );
  const pakoLine = running
    ? state.congested === "retrying"
      ? busyGuide(true, "search").line
      : workingLine(state, place)
    : undefined;
  const avatar = (
    <span className="agent-pako" aria-hidden="true">
      <PakoReaction
        size={42}
        mood={pako.mood}
        talking={pako.talking}
        still={readOnly}
      />
    </span>
  );
  const detailsShowStatus =
    !running &&
    !state.steps.length &&
    !(state.reasoning ?? []).some((part) => part.text);
  const heading = (
    <div className={`agent-run-heading${compact ? " agent-run-sender" : ""}`}>
      {compact && avatar}
      <h2 id={headingId}>
        {compact
          ? "Pako"
          : waitingForAnswer
            ? "Let’s narrow it down"
            : running
              ? "Working on your request…"
              : stopped
                ? "Search stopped"
                : state.status === "error"
                  ? "Let’s try that again"
                  : state.proposal?.draft
                    ? "Your message draft"
                    : state.inventoryMatchIds !== null || safeSources.length > 0
                      ? "Here’s what I found"
                      : "Pako’s answer"}
      </h2>
      {compact && (
        <span
          className={
            detailsShowStatus ||
            ["Finished", "Working", "Starting your request"].includes(
              statusLabel,
            )
              ? "sr-only"
              : "agent-run-header-status"
          }
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
  const actions = (
    <div className="agent-run-actions">
      {running && !externalComposer && (
        <Button type="button" onClick={onCancel}>
          Stop
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon-sm" className="agent-run-more" />}
          aria-label="Pako reply options"
        >
          <Ellipsis size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!running && !state.error && (
            <DropdownMenuItem onClick={onRetry}>Search again</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onReset}>
            Clear conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Search changes sit right under Pako's name, so the student reads what he changed before the results.
  const changes = shownActions.length > 0 && (
    <div className="agent-run-changes">
      {shownActions.map((action) =>
        action.type === "preferences_patch" ? (
          <AgentChangeLine
            key={action.id}
            action={action}
            sources={safeSources}
            applied={appliedActionIds.includes(action.id)}
            undone={undoneActionIds.includes(action.id)}
            notice={actionNotices[action.id]}
            onApply={readOnly ? undefined : onApplyAction}
            onUndo={readOnly ? undefined : onUndoAction}
          />
        ) : (
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
        ),
      )}
    </div>
  );

  const panel = (
    <section
      className={`agent-run-panel ${running ? "is-running" : ""} ${splitSearchResults ? "split-search-results" : ""} ${compact ? "conversation-agent" : ""} ${className}`}
      data-run-id={state.id ?? undefined}
      aria-labelledby={headingId}
      aria-busy={running}
    >
      {!compact && (
        <div className="agent-run-identity">
          {avatar}
          <span className="agent-run-name">Pako</span>
          <span className="agent-run-status">
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
          place={place}
          sourceCount={safeSources.length}
          workingLine={pakoLine}
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
      {splitSearchResults && changes}
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
                sourceCount={turn.sources.length}
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
          place={place}
          sourceCount={safeSources.length}
          workingLine={pakoLine}
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
                aria-label="takeover results"
              >
                {!localListings && <h3>On takeover</h3>}
                {localListings && (
                  <div className="agent-local-listings">{localListings}</div>
                )}
                {searchAnswer.takeover && (
                  <div className="agent-run-answer">
                    {answerBlocks(searchAnswer.takeover, [])}
                  </div>
                )}
              </section>
            )}
            {searchAnswer.answer && (
              <div className="agent-run-answer">
                {answerBlocks(searchAnswer.answer, safeSources)}
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
                  {answerBlocks(searchAnswer.web, safeSources)}
                </div>
              ) : null}
            </AgentWebResults>
          </div>
        )}
      {!splitSearchResults && answerText && (
        <>
          <div className={compact ? "agent-search-result-message" : undefined}>
            <div className="agent-run-answer">
              {answerBlocks(displayText, safeSources)}
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
      {!splitSearchResults && changes}
      {shownQuestions.map((question) => (
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
        />
      ))}
      {outcome}
      {!textArriving && quickReplies}
      {state.error && (
        <div className="agent-run-recovery">
          <p
            className="agent-run-error"
            role={state.congested === "failed" ? "status" : "alert"}
          >
            {state.congested === "failed" ? (
              busyGuide(false, "search").line
            ) : unfinished ? (
              <strong>{state.error}</strong>
            ) : (
              <>
                <strong>I couldn't finish this request.</strong> {state.error}
              </>
            )}
          </p>
          {!readOnly && !running && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {unfinished ? "Continue" : "Try again"}
            </Button>
          )}
        </div>
      )}
      {!running && state.status !== "idle" && (
        <AgentRunDebug diagnostic={state.diagnostic} />
      )}
      {stopped && !state.text && (
        <p className="agent-run-empty">
          Stopped. You can run this request again when you are ready.
        </p>
      )}
    </section>
  );
  return compact ? (
    panel
  ) : (
    <AutoHeight className="auto-height">{panel}</AutoHeight>
  );
}
