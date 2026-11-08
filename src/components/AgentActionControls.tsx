import { Input } from "./ui/input";
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
import {
  useId,
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";
import type { AgentRunSource } from "../../shared/runs";
import type { AgentQuestionEvent } from "../../shared/actions";
import type { AgentRunAction } from "../hooks/useAgentRun";
import { motionBehavior } from "../uiMotion";
import { answerParts } from "./AgentAnswerContent";

export type AgentActionHandlers = {
  onAnswer?: (questionId: string, answer: string) => void;
  onSkipQuestion?: (questionId: string) => void;
  onApplyAction?: (actionId: string) => void;
  onUndoAction?: (actionId: string) => void;
  onEditFields?: () => void;
};

export function AgentQuestion({
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
  onAnswer?: AgentActionHandlers["onAnswer"];
  onSkip?: AgentActionHandlers["onSkipQuestion"];
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
    <Item
      render={<section ref={questionElement} />}
      variant="outline"
      className={`agent-run-question${response && externalComposer ? " is-answered" : ""}`}
      style={{ boxSizing: "border-box" }}
    >
      <div className="agent-question-heading">
        <h3>{question.question}</h3>
        {!response && externalComposer && onSkip && (
          <Button
            type="button"
            className="text-button question-skip"
            onClick={skip}
          >
            Skip for now
          </Button>
        )}
      </div>
      {response ? (
        !externalComposer && (
          <p className="agent-run-user-answer">
            <span>Your answer</span>
            {response}
          </p>
        )
      ) : (
        <>
          {question.input?.type === "price" && onAnswer && (
            <div className="agent-run-price-input">
              <label htmlFor={`${inputId}-price`}>
                Your price <strong>CHF {price}</strong>
              </label>
              <Input
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
              <Button
                animateIcon
                type="button"
                className="button primary"
                onClick={() => submit(`CHF ${price}`)}
              >
                {price === 0 ? "Give it away for free" : `Use CHF ${price}`}
              </Button>
            </div>
          )}
          {suggestion}
          {question.input?.type !== "price" && !!question.choices?.length && (
            <Suggestions
              className="agent-run-choices"
              aria-label="Suggested answers"
            >
              {question.choices.map((choice) => (
                <Suggestion
                  type="button"
                  key={choice}
                  disabled={!onAnswer}
                  onClick={() => submit(choice)}
                >
                  {choice}
                </Suggestion>
              ))}
            </Suggestions>
          )}
          {onAnswer && !externalComposer && (
            <div className="agent-run-question-input">
              <label htmlFor={inputId}>Your answer</label>
              <Textarea
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
                <Button
                  animateIcon
                  className="button primary"
                  type="button"
                  disabled={!text.trim()}
                  onClick={() => submit(text)}
                >
                  {compact ? "Send" : "Send answer"}
                </Button>
                {onSkip && (
                  <Button className="text-button" type="button" onClick={skip}>
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
  pickup: "Pickup by",
  query: "Looking for",
  maxPrice: "Maximum price",
  radius: "Distance",
  pickupBy: "Pickup by",
  source: "Platform",
};

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
