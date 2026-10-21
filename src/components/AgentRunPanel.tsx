import SmoothHeight from "./SmoothHeight";
import { useStreamingText } from "../hooks/useStreamingText";
import { motionBehavior } from "../uiMotion.ts";
import {
  useId,
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";
import type { AgentRunSource } from "../../shared/runs";
import type { AgentRunState, AgentRunAction } from "../hooks/useAgentRun";
import type { AgentQuestionEvent } from "../../shared/actions";
import { safeSourceUrl } from "../api/runs";
import {
  parseAnswerBlocks,
  parseAnswerInline,
  splitSearchAnswer,
} from "./agentAnswer";
import "./agent-run-panel.css";

type AgentRunPanelProps = {
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
  onAnswer?: (questionId: string, answer: string) => void;
  onSkipQuestion?: (questionId: string) => void;
  onApplyAction?: (actionId: string) => void;
  onUndoAction?: (actionId: string) => void;
  onEditFields?: () => void;
  appliedActionIds?: readonly string[];
  undoneActionIds?: readonly string[];
  actionNotices?: Readonly<Record<string, string>>;
};

function AgentQuestion({
  question,
  answer,
  onAnswer,
  onSkip,
  compact = false,
  suggestion,
  externalComposer = false,
}: {
  question: AgentQuestionEvent;
  answer?: string;
  onAnswer?: AgentRunPanelProps["onAnswer"];
  onSkip?: AgentRunPanelProps["onSkipQuestion"];
  compact?: boolean;
  suggestion?: ReactNode;
  externalComposer?: boolean;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState("");
  const [price, setPrice] = useState(
    question.input?.value ?? question.input?.min ?? 0,
  );
  const inputId = useId();
  const response = answer || sent;
  const questionElement = useRef<HTMLElement>(null);
  const measuredHeight = useRef(0);
  const resizeAnimation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const element = questionElement.current;
    if (!element) return;
    measuredHeight.current = element.getBoundingClientRect().height;
    const observer = new ResizeObserver(() => {
      if (!resizeAnimation.current)
        measuredHeight.current = element.getBoundingClientRect().height;
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      resizeAnimation.current?.cancel();
    };
  }, []);
  useLayoutEffect(() => {
    const element = questionElement.current;
    if (!element || !response) return;
    const from = measuredHeight.current;
    resizeAnimation.current?.cancel();
    const to = element.getBoundingClientRect().height;
    if (Math.abs(from - to) < 1 || motionBehavior() === "auto") return;
    const animation = element.animate(
      [
        { height: `${from}px`, overflow: "hidden" },
        { height: `${to}px`, overflow: "hidden" },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    resizeAnimation.current = animation;
    void animation.finished
      .then(() => {
        if (resizeAnimation.current === animation) {
          resizeAnimation.current = null;
          measuredHeight.current = element.getBoundingClientRect().height;
        }
      })
      .catch(() => {});
  }, [response]);
  const skip = () => {
    if (response || !onSkip) return;
    setSent("Skipped");
    onSkip(question.id);
  };
  const submit = (value: string) => {
    if (!value.trim() || response || !onAnswer) return;
    setSent(value.trim());
    onAnswer(question.id, value.trim());
  };
  return (
    <section
      ref={questionElement}
      className="agent-run-question"
      style={{ boxSizing: "border-box" }}
    >
      <h3>{question.question}</h3>
      {response ? (
        <p className="agent-run-user-answer">
          <span>Your answer</span>
          {response}
        </p>
      ) : (
        <>
          {question.input?.type === "price" && onAnswer && (
            <div className="agent-run-price-input">
              <label htmlFor={`${inputId}-price`}>
                Your price <strong>CHF {price}</strong>
              </label>
              <input
                id={`${inputId}-price`}
                type="range"
                min={question.input.min}
                max={question.input.max}
                step={question.input.step}
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
              <div>
                <span>CHF {question.input.min}</span>
                <span>CHF {question.input.max}</span>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => submit(`CHF ${price}`)}
              >
                {price === 0 ? "Give it away for free" : `Use CHF ${price}`}
              </button>
            </div>
          )}
          {suggestion}
          {question.input?.type !== "price" && !!question.choices?.length && (
            <div className="agent-run-choices">
              {question.choices.map((choice) => (
                <button
                  type="button"
                  key={choice}
                  disabled={!onAnswer}
                  onClick={() => submit(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
          {onAnswer && !externalComposer && (
            <div className="agent-run-question-input">
              <label htmlFor={inputId}>Your answer</label>
              <textarea
                id={inputId}
                rows={compact ? 1 : 2}
                value={text}
                maxLength={4000}
                placeholder="Or answer in your own words…"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    submit(text);
                  }
                }}
              />
              <div>
                <button
                  className="button primary"
                  type="button"
                  disabled={!text.trim()}
                  onClick={() => submit(text)}
                >
                  {compact ? "Send" : "Send answer"}
                </button>
                {onSkip && (
                  <button className="text-button" type="button" onClick={skip}>
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          )}
          {externalComposer && onSkip && (
            <button
              type="button"
              className="text-button question-skip"
              onClick={skip}
            >
              Skip for now
            </button>
          )}
        </>
      )}
    </section>
  );
}

const fieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Asking price",
  condition: "Condition",
  dimensions: "Dimensions",
  location: "Location",
  pickup: "Pickup by",
  query: "Looking for",
  maxPrice: "Maximum price",
  radius: "Distance",
  pickupBy: "Pickup by",
  source: "Platform",
};

function AgentChanges({
  action,
  sources,
  applied,
  undone,
  notice,
  onApply,
  onUndo,
  onEdit,
}: {
  action: AgentRunAction;
  sources: AgentRunSource[];
  applied: boolean;
  undone: boolean;
  notice?: string;
  onApply?: AgentRunPanelProps["onApplyAction"];
  onUndo?: AgentRunPanelProps["onUndoAction"];
  onEdit?: () => void;
}) {
  const priceProposal =
    action.type === "listing_patch" &&
    action.requiresAcceptance &&
    "price" in action.patch;
  const title = priceProposal
    ? "Suggested asking price"
    : action.type === "listing_patch"
      ? "Listing changes"
      : "Search preferences";
  return (
    <details
      className={`agent-run-change ${applied ? "is-applied" : ""}`}
      open={action.type !== "listing_patch" || action.requiresAcceptance}
    >
      <summary className="agent-run-change-heading">
        <h3>{title}</h3>
        {undone ? (
          <span>Undone</span>
        ) : applied ? (
          <span>Applied</span>
        ) : (
          <span>Proposed</span>
        )}
      </summary>
      <div className="agent-run-change-content">
        <p>{action.reason}</p>
        <dl>
          {Object.entries(action.patch).map(([field, value]) => (
            <div key={field}>
              <dt>{fieldLabels[field] || field}</dt>
              <dd>
                {value === null
                  ? "Not set"
                  : value === ""
                    ? "Clear this field"
                    : field === "price" || field === "maxPrice"
                      ? `CHF ${Number(value).toLocaleString("en-GB")}`
                      : field === "radius"
                        ? `${value} km`
                        : value}
              </dd>
            </div>
          ))}
        </dl>
        <details className="agent-run-evidence">
          <summary>Why these changes</summary>
          {action.evidence.map((item, index) => (
            <p key={index}>
              <span>
                {item.kind === "seller"
                  ? "From your details"
                  : "From a search result"}
              </span>
              <q>{item.quote}</q>
              {item.kind === "source" && (
                <> {answerParts(`[${item.sourceId}]`, sources)}</>
              )}
            </p>
          ))}
        </details>
        {notice && (
          <p className="agent-run-action-notice" role="status">
            {notice}
          </p>
        )}
        <div className="agent-run-change-actions">
          {!applied && !undone && !notice && onApply && (
            <button
              type="button"
              className="button primary"
              onClick={() => onApply(action.id)}
            >
              {priceProposal ? "Apply this price" : "Apply changes"}
            </button>
          )}
          {applied && !undone && onUndo && (
            <button
              type="button"
              className="text-button"
              onClick={() => onUndo(action.id)}
            >
              Undo changes
            </button>
          )}
          {onEdit && (
            <button type="button" className="text-button" onClick={onEdit}>
              Edit fields
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function SourceThumbnail({ imageUrl }: { imageUrl: string }) {
  const [failed, setFailed] = useState(false);
  const url = safeSourceUrl(imageUrl);
  if (failed || !url) return null;
  return (
    <img
      className="agent-run-source-image"
      src={url}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function answerParts(
  text: string,
  sources: AgentRunSource[],
  streaming = false,
): ReactNode[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  return parseAnswerInline(text).map((part, index) => {
    const source = part.kind === "citation" && byId.get(part.text);
    const url = source ? safeSourceUrl(source.url) : null;
    if (source && url)
      return (
        <a
          key={index}
          className="agent-run-citation"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Source: ${source.title}`}
          title={source.title}
        >
          [{part.text.replace(/^web-/, "")}]
        </a>
      );
    if (part.kind === "bold")
      return (
        <strong key={index}>
          {answerParts(part.text, sources, streaming)}
        </strong>
      );
    if (part.kind === "emphasis")
      return <em key={index}>{answerParts(part.text, sources, streaming)}</em>;
    if (part.kind === "citation") return `[${part.text}]`;
    return part.text.split(/(\s+)/).map((word, wordIndex) =>
      /^\s*$/.test(word) ? (
        word
      ) : (
        <span
          key={`${index}-${wordIndex}`}
          className={streaming ? "stream-word" : undefined}
        >
          {word}
        </span>
      ),
    );
  });
}

export function answerBlocks(
  text: string,
  sources: AgentRunSource[],
  streaming = false,
): ReactNode[] {
  return parseAnswerBlocks(text).map((block) => {
    if (block.kind === "heading") {
      const Heading = block.level <= 2 ? "h3" : "h4";
      return (
        <Heading key={block.key}>
          {answerParts(block.text, sources, streaming)}
        </Heading>
      );
    }
    if (block.kind === "list") {
      const items = block.items.map((item) => (
        <li key={item.key}>{answerParts(item.text, sources, streaming)}</li>
      ));
      return block.ordered ? (
        <ol key={block.key} start={block.start}>
          {items}
        </ol>
      ) : (
        <ul key={block.key}>{items}</ul>
      );
    }
    return <p key={block.key}>{answerParts(block.text, sources, streaming)}</p>;
  });
}

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
