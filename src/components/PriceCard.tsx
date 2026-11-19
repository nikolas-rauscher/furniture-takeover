import { useId, useState } from "react";
import { money } from "../../shared/marketplace";
import type { AgentRunSource } from "../../shared/runs";
import {
  MAX_ASKING_PRICE,
  priceSliderRange,
  type PriceSuggestion,
} from "../listingQuestions";
import { plainPrice, priceText } from "../priceText";
import { answerParts } from "./AgentAnswerContent";
import { plainAnswer } from "./agentAnswer";
import Modal from "./Modal";
import PriceSlider from "./PriceSlider";
import { Button } from "./ui/button";

/** The amount in the field, or nothing while it is empty or not a valid price. */
function typedPrice(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const value = Number(plainPrice(text));
  return Number.isFinite(value) && value >= 0 && value <= MAX_ASKING_PRICE
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

/** The slider's range around Pako's price, widened when a typed amount lies above it. */
function sliderRange(start: number, rangeMax?: number, typed?: number) {
  const range = priceSliderRange(start, rangeMax);
  return typed !== undefined && typed > range.max
    ? priceSliderRange(typed)
    : range;
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
 * Pako's price question as a card: his suggestion with the range of offers it rests
 * on, a slider from free upwards and a field for an exact amount, then quieter ways
 * to give it away, read why he suggests it, or decide once the other questions are
 * answered. Without a suggestion the card asks for an amount and shows no slider.
 */
export default function PriceCard({
  start,
  rangeMax,
  suggestion,
  reasoning,
  sources,
  disabled,
  onPrice,
  onLater,
}: {
  /** Where the card starts: Pako's suggestion, or no amount when he has none. */
  start?: number;
  /** The top of the slider range Pako offered with his question, if any. */
  rangeMax?: number;
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
  const use = () => {
    if (price !== undefined && !disabled) onPrice(price);
  };
  const suggested = suggestion?.patch.price;
  return (
    <div className="price-card">
      {start === undefined ? (
        <p className="price-card-note">{WITHOUT_SUGGESTION}</p>
      ) : (
        <>
          {suggestion && (
            <p className="price-card-facts">{plainAnswer(suggestion.reason)}</p>
          )}
          <PriceSlider
            {...sliderRange(start, rangeMax, price)}
            value={price ?? 0}
            disabled={disabled}
            onChange={(value) => setText(priceText(value))}
          />
        </>
      )}
      <div className="price-card-amount">
        <div className="price-card-field">
          <label htmlFor={fieldId} className="sr-only">
            {start === undefined ? "Your price in CHF" : "Exact price in CHF"}
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
