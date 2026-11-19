import { useId, useState } from "react";
import { ChevronDown, Minus, Plus } from "@/components/icons";
import { money } from "../../shared/marketplace";
import type { AgentRunSource } from "../../shared/runs";
import { niceStep, type PriceSuggestion } from "../listingQuestions";
import { answerParts } from "./AgentAnswerContent";
import { plainAnswer } from "./agentAnswer";
import { Button } from "./ui/button";

const MAX_PRICE = 10_000;
/** "1,250", "1'250" or "1 250": thousands written with a separator, as the app writes them. */
const GROUPED = /^\d{1,3}(?:[,'’ ]\d{3})+(?:\.\d{1,2})?$/;

/** The amount as the rest of the app writes it, such as 1,250. */
const amountText = (price: number) => price.toLocaleString("en-GB");

/** The amount in the field, or nothing while it is empty or not a valid price. */
function typedPrice(text: string): number | undefined {
  const typed = text.trim();
  if (!typed) return undefined;
  const value = Number(
    GROUPED.test(typed) ? typed.replace(/[,'’ ]/g, "") : typed.replace(",", "."),
  );
  return Number.isFinite(value) && value >= 0 && value <= MAX_PRICE
    ? value
    : undefined;
}

/** Why Pako suggests no price, and what helps him find one. */
function withoutSuggestion(offersCompared: number) {
  const compared =
    offersCompared === 0
      ? ""
      : offersCompared === 1
        ? "The one offer I compared showed no clear asking price. "
        : `None of the ${offersCompared} offers I compared showed a clear asking price. `;
  return `${compared}Set your own, or add the brand, model or size and choose Suggest a price under Ask Pako.`;
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
 * Pako's price question as a card: his suggestion to take as it is, a stepper and
 * a field for another amount, giving it away, why he suggests it, and putting the
 * decision off until the other questions are answered.
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
  const [text, setText] = useState(
    start === undefined ? "" : amountText(start),
  );
  const [whyOpen, setWhyOpen] = useState(false);
  const fieldId = useId();
  const whyId = useId();
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
      {start === undefined && (
        <p className="price-card-note">{withoutSuggestion(sources.length)}</p>
      )}
      <div className="price-card-amount">
        <Button
          className="button secondary icon-button price-card-step"
          aria-label={`Lower the price to ${money(lower)}`}
          disabled={disabled || current <= 0}
          onClick={() => setText(amountText(lower))}
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
            onBlur={() => price !== undefined && setText(amountText(price))}
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
          onClick={() => setText(amountText(raise))}
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
            ? "Give it away for free"
            : price === undefined
              ? "Use this price"
              : `Use ${money(price)}`}
        </Button>
      </div>
      <div className="price-card-more">
        {price !== 0 && (
          <Button
            className="button secondary small"
            disabled={disabled}
            onClick={() => onPrice(0)}
          >
            Give it away for free
          </Button>
        )}
        {suggestion && suggested !== undefined && (
          <Button
            className="button quiet small price-card-why"
            aria-expanded={whyOpen}
            aria-controls={whyId}
            onClick={() => setWhyOpen((open) => !open)}
          >
            Why {money(suggested)}?
            <ChevronDown size={14} aria-hidden="true" />
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
      {suggestion && whyOpen && (
        <div id={whyId} className="price-card-why-panel">
          {reasoning && <p>{answerParts(reasoning, sources)}</p>}
          <p>{plainAnswer(suggestion.reason)}</p>
          <ul>
            {suggestion.evidence.map((evidence, index) => (
              <li key={index}>
                <q>{evidence.quote}</q>
                {evidence.kind === "source" &&
                  answerParts(` [${evidence.sourceId}]`, sources)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
