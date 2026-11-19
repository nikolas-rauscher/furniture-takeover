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
import AgentSources from "./AgentSources";
import AgentWebResults from "./AgentWebResults";
import { Ellipsis } from "./icons";
import ListingAnswers from "./ListingAnswers";
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
import { isPriceSuggestion } from "../listingQuestions";
import {
  agentTurnPako,
  settledSteps,
  workingLine,
  type StepVoice,
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
  /** Whose words Pako's steps are told in. */
  voice?: StepVoice;
  showHistory?: boolean;
  splitSearchResults?: boolean;
  conversational?: boolean;
  externalComposer?: boolean;
  readOnly?: boolean;
  /** The composer has text, so Pako listens once the turn has ended. */
  typing?: boolean;
  appliedActionIds?: readonly string[];
  undoneActionIds?: readonly string[];
  actionNotices?: Readonly<Record<string, string>>;
  /** Pako asks in the tray above the composer; the turn keeps the answers and his changes. */
  questionsInTray?: boolean;
  /** Takes an answer of this turn back from its row. */
  onUndoAnswer?: (questionId: string) => void;
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
  voice = "search",
  showHistory = true,
  splitSearchResults = false,
  conversational = false,
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
  questionsInTray = false,
  onUndoAnswer,
}: AgentRunPanelProps) {
  const compact = conversational || splitSearchResults;
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
  // The tray carries Pako's suggested price with its evidence until it is decided.
  // Search changes apply as they arrive, so one that changed nothing has nothing to report.
  const shownActions = state.actions.filter((action) =>
    questionsInTray
      ? !isPriceSuggestion(action)
      : action.type !== "preferences_patch" ||
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
        : state.status === "error"
          ? "Could not finish"
          : steps.some((step) => step.state === "error")
            ? "Partly completed"
            : steps.some((step) => step.state === "needs_input")
              ? "Some changes need more details"
              : "Finished";

  // Without steps or reasoning, the activity line itself names the status.
  // Only the live turn moves; earlier turns keep a resting Pako beside them.
  const pako = agentTurnPako(
    { ...state, text: answerText },
    { textShown: displayText, typing },
  );
  // The tray says what Pako does and carries his mood, so the turn itself rests.
  const pakoLine = running
    ? questionsInTray
      ? "Working…"
      : workingLine(state, place, voice)
    : undefined;
  const avatar = (
    <span className="agent-pako" aria-hidden="true">
      <PakoReaction
        size={42}
        mood={pako.mood}
        talking={pako.talking}
        still={readOnly || questionsInTray}
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
                ? "Run stopped"
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
            (questionsInTray && waitingForAnswer) ||
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

  // Search changes sit right under Pako's name, so the student reads what he changed before the results.
  const changes = shownActions.length > 0 && (
    <div className="agent-run-changes">
      {shownActions.map((action) =>
        questionsInTray || action.type === "preferences_patch" ? (
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
          voice={voice}
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
                voice={voice}
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
          voice={voice}
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
      {/* While Pako researches for a listing, the tray says so; the turn keeps what he found. */}
      {!splitSearchResults && !(questionsInTray && running) && (
        <AgentWebResults
          sources={safeSources}
          searches={webSearches}
          running={running}
          stopped={stopped}
          onRetry={webRetry}
        />
      )}
      {!splitSearchResults && changes}
      {questionsInTray ? (
        <ListingAnswers
          questions={state.questions}
          answers={state.answers}
          onUndo={readOnly ? undefined : onUndoAnswer}
        />
      ) : (
        shownQuestions.map((question) => (
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
        ))
      )}
      {outcome}
      {!textArriving && quickReplies}
      {state.error && !questionsInTray && (
        <div className="agent-run-recovery">
          <p className="agent-run-error" role="alert">
            {unfinished ? (
              <strong>{state.error}</strong>
            ) : (
              <>
                <strong>Sorry, I got stuck there.</strong> {state.error}
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
  return compact ? (
    panel
  ) : (
    <AutoHeight className="auto-height">{panel}</AutoHeight>
  );
}
