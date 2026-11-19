import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Suggestion, Suggestions } from "./ui/suggestion";
import { Badge } from "./ui/badge";
import { Item, ItemActions, ItemContent } from "./ui/item";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible";
import { ChevronDown } from "./icons";
import { useId, useState, useRef, useLayoutEffect } from "react";
import type { AgentRunSource } from "../../shared/runs";
import type {
  AgentActionEvidence,
  AgentQuestionEvent,
} from "../../shared/actions";
import type { AgentRunAction } from "../hooks/useAgentRun";
import { searchChangeSummary } from "../searchChanges";
import { motionBehavior } from "../uiMotion";
import { answerParts } from "./AgentAnswerContent";
import PriceSlider from "./PriceSlider";

export type AgentActionHandlers = {
  onAnswer?: (questionId: string, answer: string) => void | boolean;
  onSkipQuestion?: (questionId: string) => void | boolean;
  onApplyAction?: (actionId: string) => void;
  onUndoAction?: (actionId: string) => void;
  onEditFields?: () => void;
};

/** The slider starts at Pako's suggestion, or halfway when he has none. */
function initialPrice({
  min,
  max,
  step,
  value,
}: NonNullable<AgentQuestionEvent["input"]>) {
  return value ?? Math.round((min + max) / 2 / step) * step;
}

export function AgentQuestion({
  question,
  answer,
  onAnswer,
  onSkip,
  compact = false,
  externalComposer = false,
  disabled = false,
  readOnly = false,
}: {
  question: AgentQuestionEvent;
  answer?: string;
  onAnswer?: AgentActionHandlers["onAnswer"];
  onSkip?: AgentActionHandlers["onSkipQuestion"];
  compact?: boolean;
  externalComposer?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState("");
  const [price, setPrice] = useState(
    question.input ? initialPrice(question.input) : 0,
  );
  const inputId = useId();
  const response = answer || sent;
  const questionElement = useRef<HTMLElement>(null);
  const measuredHeight = useRef(0);
  const resizeAnimation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    if (externalComposer) return;
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
  }, [externalComposer]);
  useLayoutEffect(() => {
    const element = questionElement.current;
    if (!element || !response || externalComposer) return;
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
  }, [response, externalComposer]);
  const skip = () => {
    if (disabled || readOnly || response || !onSkip) return;
    if (onSkip(question.id) !== false) setSent("Skipped");
  };
  const submit = (value: string) => {
    if (disabled || readOnly || !value.trim() || response || !onAnswer) return;
    if (onAnswer(question.id, value.trim()) !== false) setSent(value.trim());
  };

  return (
    <Item
      render={<section ref={questionElement} />}
      variant="outline"
      className={`agent-run-question${response && externalComposer ? " is-answered" : ""}`}
      style={{ boxSizing: "border-box" }}
    >
      <div className="agent-question-heading">
        <h3>{question.question}</h3>
      </div>
      {response ? (
        !externalComposer && (
          <p className="agent-run-user-answer">
            <span>Your answer</span>
            {response}
          </p>
        )
      ) : readOnly ? null : (
        <>
          {question.input?.type === "price" && onAnswer && (
            <div className="agent-run-price-input">
              <PriceSlider
                min={question.input.min}
                max={question.input.max}
                step={question.input.step}
                value={price}
                disabled={disabled}
                onChange={setPrice}
              />
              <Button
                animateIcon
                type="button"
                className="button primary"
                disabled={disabled}
                onClick={() => submit(`CHF ${price}`)}
              >
                {price === 0 ? "Give it away for free" : `Use CHF ${price}`}
              </Button>
            </div>
          )}
          {!!question.choices?.length && (
            <Suggestions
              className="agent-run-choices"
              aria-label="Suggested answers"
            >
              {question.choices.map((choice) => (
                <Suggestion
                  type="button"
                  key={choice}
                  disabled={disabled || !onAnswer}
                  onClick={() => submit(choice)}
                >
                  {choice}
                </Suggestion>
              ))}
            </Suggestions>
          )}
          {externalComposer && onSkip && (
            <Button
              type="button"
              className="button quiet small question-skip"
              disabled={disabled}
              onClick={skip}
            >
              Skip for now
            </Button>
          )}
          {onAnswer && !externalComposer && (
            <div className="agent-run-question-input">
              <label htmlFor={inputId}>Your answer</label>
              <Textarea
                id={inputId}
                rows={compact ? 1 : 2}
                value={text}
                disabled={disabled}
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
                <Button
                  animateIcon
                  className="button primary"
                  type="button"
                  disabled={disabled || !text.trim()}
                  onClick={() => submit(text)}
                >
                  {compact ? "Send" : "Send answer"}
                </Button>
                {onSkip && (
                  <Button
                    className="button quiet small"
                    type="button"
                    disabled={disabled}
                    onClick={skip}
                  >
                    Skip for now
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Item>
  );
}

const fieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Asking price",
  condition: "Condition",
  dimensions: "Dimensions",
  location: "Location",
  pickup: "Pickup deadline",
  query: "Looking for",
  maxPrice: "Maximum price",
  radius: "Distance",
  pickupBy: "Collect by",
  source: "Platform",
};

/** A changed field's new value in words. */
function changedValue(field: string, value: unknown) {
  if (value === null) return "Not set";
  if (value === "") return "Clear this field";
  if (field === "price" || field === "maxPrice")
    return `CHF ${Number(value).toLocaleString("en-GB")}`;
  if (field === "radius") return `${value} km`;
  return String(value);
}

const LONG_FIELDS = new Set(["title", "description"]);

/** What Pako changed, in his words: one short value is named, long texts are not repeated. */
export function changeSummary(action: AgentRunAction): string {
  if (action.type === "preferences_patch")
    return searchChangeSummary(action.patch);
  const fields = Object.entries(action.patch);
  const name = (field: string) => (fieldLabels[field] ?? field).toLowerCase();
  if (fields.length === 1) {
    const [[field, value]] = fields;
    return LONG_FIELDS.has(field)
      ? `I updated the ${name(field)}.`
      : `I filled in the ${name(field)}: ${changedValue(field, value)}.`;
  }
  const names = fields.map(([field]) => name(field));
  return `I updated the ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
}

/** Pako's own reason for a change, from where its evidence comes. */
function changeReason(evidence: readonly AgentActionEvidence[]) {
  const fromListings = evidence.some((item) => item.kind === "source");
  const fromStudent = evidence.some((item) => item.kind === "seller");
  if (fromListings && fromStudent)
    return "I went by what you wrote and what these listings say:";
  return fromListings
    ? "I went by what these listings say:"
    : "I went by what you wrote:";
}

/** A change Pako made to the listing as one line, with its Undo and the reason on demand. */
export function AgentChangeLine({
  action,
  sources,
  applied,
  undone,
  notice,
  onApply,
  onUndo,
}: {
  action: AgentRunAction;
  sources: AgentRunSource[];
  applied: boolean;
  undone: boolean;
  notice?: string;
  onApply?: AgentActionHandlers["onApplyAction"];
  onUndo?: AgentActionHandlers["onUndoAction"];
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  return (
    <div className="agent-change-line" data-undone={undone || undefined}>
      <p>
        {undone ? `Undone: ${changeSummary(action)}` : changeSummary(action)}
      </p>
      <div className="agent-change-line-actions">
        {!applied && !undone && onApply && (
          <Button
            className="button secondary small"
            onClick={() => onApply(action.id)}
          >
            Apply
          </Button>
        )}
        {applied && !undone && onUndo && (
          <Button
            className="button quiet small"
            onClick={() => onUndo(action.id)}
          >
            Undo
          </Button>
        )}
        {action.evidence.length > 0 && (
          <Button
            className="button quiet small"
            aria-expanded={open}
            aria-controls={reasonId}
            onClick={() => setOpen((value) => !value)}
          >
            Why?
          </Button>
        )}
      </div>
      {notice && (
        <p className="agent-change-line-notice" role="status">
          {notice}
        </p>
      )}
      {open && (
        <div id={reasonId} className="agent-change-line-reason">
          <p>{changeReason(action.evidence)}</p>
          {action.evidence.map((item, index) => (
            <p key={index}>
              <q>{item.quote}</q>
              {item.kind === "source" &&
                answerParts(` [${item.sourceId}]`, sources)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentChanges({
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
  onApply?: AgentActionHandlers["onApplyAction"];
  onUndo?: AgentActionHandlers["onUndoAction"];
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
    <Collapsible
      className={`agent-run-change ${applied ? "is-applied" : ""}`}
      defaultOpen={action.type !== "listing_patch" || action.requiresAcceptance}
    >
      <Item className="agent-run-change-heading" size="sm">
        <ItemContent>
          <h3>{title}</h3>
        </ItemContent>
        <ItemActions>
          <Badge variant={applied ? "secondary" : "outline"}>
            {undone ? "Undone" : applied ? "Applied" : "Proposed"}
          </Badge>
          <CollapsibleTrigger
            className="agent-change-toggle"
            aria-label={`Details: ${title}`}
          >
            Details <ChevronDown size={14} />
          </CollapsibleTrigger>
        </ItemActions>
      </Item>
      <CollapsibleContent className="agent-change-panel">
        <div className="agent-run-change-content">
          <p>{action.reason}</p>
          <dl>
            {Object.entries(action.patch).map(([field, value]) => (
              <div key={field}>
                <dt>{fieldLabels[field] || field}</dt>
                <dd>{changedValue(field, value)}</dd>
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
              <Button
                animateIcon
                type="button"
                className="button primary"
                onClick={() => onApply(action.id)}
              >
                {priceProposal ? "Apply this price" : "Apply changes"}
              </Button>
            )}
            {applied && !undone && onUndo && (
              <Button
                type="button"
                className="text-button"
                onClick={() => onUndo(action.id)}
              >
                Undo changes
              </Button>
            )}
            {onEdit && (
              <Button type="button" className="text-button" onClick={onEdit}>
                Edit fields
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
