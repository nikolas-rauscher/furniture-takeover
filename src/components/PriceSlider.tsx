import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useId, type CSSProperties } from "react";
import { money } from "../../shared/marketplace";
import "./price-slider.css";

/** The francs count towards the new value on a calm spring; reduced motion shows it at once. */
function SpringFrancs({ value }: { value: number }) {
  const reduced = Boolean(useReducedMotion());
  const spring = useSpring(value, { stiffness: 260, damping: 32 });
  const shown = useTransform(spring, (current) => money(Math.round(current)));
  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [reduced, spring, value]);
  return <motion.span>{shown}</motion.span>;
}

/**
 * A price on a chunky track: the filled part in the brand blue up to a thumb
 * that gives under the finger, the value above it in the app's price type and
 * the range's ends below.
 */
export default function PriceSlider({
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const filled = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="price-slider">
      <div className="price-slider-readout">
        <label htmlFor={id}>Your price</label>
        <output htmlFor={id} aria-hidden="true">
          <SpringFrancs value={value} />
        </output>
      </div>
      <input
        id={id}
        className="price-slider-track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={money(value)}
        style={{ "--filled": `${filled}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="price-slider-bounds" aria-hidden="true">
        <span>{money(min)}</span>
        <span>{money(max)}</span>
      </div>
    </div>
  );
}
