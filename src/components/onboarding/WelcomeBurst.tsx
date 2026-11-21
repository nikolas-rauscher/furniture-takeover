import { MotionConfig, motion, type Transition } from "motion/react";
import type { ItemId } from "./onboardingContent";
import { itemIcons } from "./onboardingIcons";
import "./pako.css";

type Sticker = {
  item: ItemId;
  /** Resting place relative to the box opening, in px. */
  x: number;
  y: number;
  /** Highest point of the throw out of the box. */
  peak: number;
  tilt: number;
  tone: "sky" | "sand" | "butter";
};

/* Laid out to stay inside a 320px-wide phone around a 168px Pako. */
const STICKERS: Sticker[] = [
  { item: "sofa", x: -118, y: 50, peak: -40, tilt: -8, tone: "sky" },
  { item: "lamp", x: -94, y: -36, peak: -60, tilt: 7, tone: "butter" },
  { item: "chair", x: 0, y: -80, peak: -96, tilt: -4, tone: "sand" },
  { item: "bike", x: 94, y: -36, peak: -60, tilt: 8, tone: "sky" },
  { item: "shelf", x: 118, y: 50, peak: -40, tilt: -6, tone: "butter" },
];

const THROW_DELAY = 0.3;
const THROW_STAGGER = 0.09;

const throwTiming = (index: number): Transition => ({
  duration: 0.8,
  delay: THROW_DELAY + index * THROW_STAGGER,
  times: [0, 0.45, 1],
  ease: ["easeOut", [0.34, 1.4, 0.64, 1]],
});

const bobTiming = (index: number): Transition => ({
  duration: 2.8 + index * 0.35,
  delay: 1.2 + index * 0.15,
  repeat: Infinity,
  ease: "easeInOut",
});

function ThrownSticker({
  sticker,
  index,
}: {
  sticker: Sticker;
  index: number;
}) {
  const Icon = itemIcons[sticker.item];
  return (
    <motion.span
      className="ob-burst-sticker"
      data-tone={sticker.tone}
      initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
      animate={{
        x: [0, sticker.x * 0.55, sticker.x],
        y: [0, sticker.peak, sticker.y],
        scale: [0.2, 1.08, 1],
        opacity: [0, 1, 1],
        rotate: [0, sticker.tilt * 2, sticker.tilt],
      }}
      transition={throwTiming(index)}
    >
      <motion.span
        className="ob-burst-bob"
        animate={{ y: [0, -5, 0] }}
        transition={bobTiming(index)}
      >
        <Icon size={22} strokeWidth={2} />
      </motion.span>
    </motion.span>
  );
}

/** The welcome moment: furniture stickers spring out of Pako's box and keep floating. */
export default function WelcomeBurst() {
  return (
    <MotionConfig reducedMotion="user">
      <span className="ob-burst" aria-hidden="true">
        {STICKERS.map((sticker, index) => (
          <ThrownSticker key={sticker.item} sticker={sticker} index={index} />
        ))}
      </span>
    </MotionConfig>
  );
}
