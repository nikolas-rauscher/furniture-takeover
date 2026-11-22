import { useId, type CSSProperties } from "react";
import "../../components/price-slider.css";
import { useTourText } from "../i18n/TourLanguage";
import type { StepContext } from "./stepContext";
import { amountOf, amountOption, type V3AmountStep } from "./v3Script";
import { amountLabel } from "./v3Words";

/**
 * An amount on a native range input. Nothing is preset: until the participant moves
 * it, a muted handle invites dragging, the readout asks for a choice and Continue
 * stays off. The input still needs a value, the middle; a tap on exactly that spot
 * counts as a choice when the pointer is released.
 */
export default function AmountSlider({
  step,
  context,
}: {
  step: V3AmountStep;
  context: StepContext;
}) {
  const words = useTourText().v3.amounts[step.id];
  const id = useId();
  const chosen = context.given[step.id].chosen[0];
  const amount = chosen === undefined ? null : amountOf(chosen);
  const value = amount ?? (step.min + step.max) / 2;
  const readout = amount === null ? words.choose : amountLabel(words, amount);
  const filled =
    amount === null ? 0 : ((amount - step.min) / (step.max - step.min)) * 100;
  const choose = (next: number) =>
    context.answer(step.id, { chosen: [amountOption(next)], text: "" });

  return (
    <div className="tour-amount" data-untouched={amount === null || undefined}>
      {step.card && (
        <h2 className="tour-question" id={id}>
          {words.question}
        </h2>
      )}
      <output className="tour-amount-value" aria-hidden="true">
        {readout}
      </output>
      <div className="tour-amount-track">
        <input
          className="price-slider-track"
          type="range"
          min={step.min}
          max={step.max}
          step={step.increment}
          value={value}
          aria-labelledby={step.card ? id : undefined}
          aria-label={step.card ? undefined : words.question}
          aria-valuetext={readout}
          style={{ "--filled": `${filled}%` } as CSSProperties}
          onChange={(event) => choose(Number(event.target.value))}
          onPointerUp={(event) => {
            if (amount === null) choose(Number(event.currentTarget.value));
          }}
        />
      </div>
      <div className="price-slider-bounds" aria-hidden="true">
        <span>{words.nothing}</span>
        <span>{words.top(String(step.max))}</span>
      </div>
    </div>
  );
}
