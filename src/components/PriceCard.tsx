import { useId, useState } from "react";
import { Minus, Plus } from "@/components/icons";
import { money } from "../../shared/marketplace";
import type { AgentRunSource } from "../../shared/runs";
import { niceStep, type PriceSuggestion } from "../listingQuestions";
import { plainPrice, priceText } from "../priceText";
import { answerParts } from "./AgentAnswerContent";
import { plainAnswer } from "./agentAnswer";
import Modal from "./Modal";
import { Button } from "./ui/button";

const MAX_PRICE = 10_000;

/** The amount in the field, or nothing while it is empty or not a valid price. */
function typedPrice(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const value = Number(plainPrice(text));
  return Number.isFinite(value) && value >= 0 && value <= MAX_PRICE
    ? value
    : undefined;
}

const offersCompared = (count: number) =>
  `${count} ${count === 1 ? "offer" : "offers"} compared`;

/** Why Pako suggests no price, and what helps him find one. */
const WITHOUT_SUGGESTION =
  "I couldn't find a clear asking price. Enter yours, or add a detail and ask again.";

/** The facts behind Pako's suggestion, in one line above the amount. */
function suggestionFacts(suggested: number, offerCount: number) {
  const facts = [`${money(suggested)} suggested`];
  if (offerCount > 0) facts.push(offersCompared(offerCount));
  return facts.join(" · ");
}

/** One stepper step up or down, landing on the step's grid: 43 goes to 45 or 40. */
function stepped(price: number, direction: 1 | -1) {
  const step = niceStep(price);
  const next =
    direction > 0
      ? Math.floor(price / step) * step + step
      : Math.ceil(price / step) * step - step;
  return Math.min(MAX_PRICE, Math.max(0, next));
}

/**
 * Pako's reasons for his price in a sheet, so the tray keeps its size: what he wrote
 * about the price, why he suggests it and the offers he quotes, with a way to take it.
 */
function PriceReasons({
  suggestion,
  suggested,
  reasoning,
  sources,
  disabled,
  onUse,
  onClose,
}: {
  suggestion: PriceSuggestion;
  suggested: number;
  reasoning: string;
  sources: AgentRunSource[];
  disabled: boolean;
  onUse: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      sheet
      title={`Why ${money(suggested)}?`}
      description={suggestionFacts(suggested, sources.length)}
      onClose={onClose}
    >
      <div className="price-reasons">
        {reasoning && <p>{answerParts(reasoning, sources)}</p>}
        <p className="price-reasons-summary">
          {plainAnswer(suggestion.reason)}
        </p>
        {suggestion.evidence.length > 0 && (
          <ul aria-label="Offers Pako compared">
            {suggestion.evidence.map((evidence, index) => (
              <li key={index}>
                <q>{evidence.quote}</q>
                {evidence.kind === "source" &&
                  answerParts(` [${evidence.sourceId}]`, sources)}
              </li>
            ))}
          </ul>
        )}
        <Button
          animateIcon
          className="button primary full"
          disabled={disabled}
          onClick={onUse}
        >
          Use {money(suggested)}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Pako's price question as a card: his suggestion with what it rests on, a stepper
 * and a field for another amount, then quieter ways to give it away, read why he
 * suggests it, or decide once the other questions are answered.
 */
export default function PriceCard({
  start,
  suggestion,
  reasoning,
  sources,
  disabled,
  onPrice,
  onLater,
}: {
  /** Where the card starts: Pako's suggestion, or no amount when he has none. */
  start?: number;
  suggestion?: PriceSuggestion;
  /** What Pako wrote about the price beside his question, shown with why he suggests it. */
  reasoning: string;
  sources: AgentRunSource[];
  disabled: boolean;
  onPrice: (price: number) => void;
  onLater: () => void;
}) {
  const [text, setText] = useState(start === undefined ? "" : priceText(start));
  const [whyOpen, setWhyOpen] = useState(false);
  const fieldId = useId();
  const price = typedPrice(text);
  const current = price ?? 0;
  const lower = stepped(current, -1);
  const raise = stepped(current, 1);
  const use = () => {
    if (price !== undefined && !disabled) onPrice(price);
  };
  const suggested = suggestion?.patch.price;
  return (
    <div className="price-card">
      {start === undefined ? (
        <p className="price-card-note">{WITHOUT_SUGGESTION}</p>
      ) : (
        suggested !== undefined && (
          <p className="price-card-facts">
            {suggestionFacts(suggested, sources.length)}
          </p>
        )
      )}
      <div className="price-card-amount">
        <Button
          className="button secondary icon-button price-card-step"
          aria-label={`Lower the price to ${money(lower)}`}
          disabled={disabled || current <= 0}
          onClick={() => setText(priceText(lower))}
        >
          <Minus size={18} aria-hidden="true" />
        </Button>
        <div className="price-card-field">
          <label htmlFor={fieldId} className="sr-only">
            Your price in CHF
          </label>
          <span aria-hidden="true">CHF</span>
          <input
            id={fieldId}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            disabled={disabled}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => price !== undefined && setText(priceText(price))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                use();
              }
            }}
          />
        </div>
        <Button
          className="button secondary icon-button price-card-step"
          aria-label={`Raise the price to ${money(raise)}`}
          disabled={disabled || current >= MAX_PRICE}
          onClick={() => setText(priceText(raise))}
        >
          <Plus size={18} aria-hidden="true" />
        </Button>
        <Button
          animateIcon
          className="button primary price-card-use"
          disabled={disabled || price === undefined}
          onClick={use}
        >
          {price === 0
            ? "List for free"
            : price === undefined
              ? "Use this price"
              : `Use ${money(price)}`}
        </Button>
      </div>
      <div className="price-card-more">
        {price !== 0 && (
          <Button
            className="button quiet small"
            disabled={disabled}
            onClick={() => onPrice(0)}
          >
            List for free
          </Button>
        )}
        {suggestion && suggested !== undefined && (
          <Button
            className="button quiet small"
            aria-haspopup="dialog"
            onClick={() => setWhyOpen(true)}
          >
            Why {money(suggested)}?
          </Button>
        )}
        <Button
          className="button quiet small price-card-later"
          disabled={disabled}
          onClick={onLater}
        >
          Decide later
        </Button>
      </div>
      {suggestion && suggested !== undefined && whyOpen && (
        <PriceReasons
          suggestion={suggestion}
          suggested={suggested}
          reasoning={reasoning}
          sources={sources}
          disabled={disabled}
          onUse={() => {
            setWhyOpen(false);
            onPrice(suggested);
          }}
          onClose={() => setWhyOpen(false)}
        />
      )}
    </div>
  );
}
