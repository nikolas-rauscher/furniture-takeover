import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import "./celebration.css";

const PIECE_COUNT = 36;
const COLORS = [
  "var(--blue)",
  "var(--ob-kraft)",
  "var(--ob-sun)",
  "var(--ob-coral)",
  "var(--ob-sky)",
] as const;
const SHAPES = ["rect", "strip", "dot"] as const;

type Piece = {
  shape: (typeof SHAPES)[number];
  color: (typeof COLORS)[number];
  driftX: number;
  peakY: number;
  landY: number;
  spin: number;
  duration: number;
  delay: number;
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** One paper piece, launched in an upward fan out of the box opening. */
function launchPiece(index: number): Piece {
  const angle = between(-0.85 * Math.PI, -0.15 * Math.PI);
  const power = between(80, 180);
  return {
    shape: SHAPES[index % SHAPES.length],
    color: COLORS[index % COLORS.length],
    driftX: Math.cos(angle) * power * 1.3,
    peakY: Math.sin(angle) * power,
    landY: between(120, 240),
    spin: between(-540, 540),
    duration: between(1.4, 2.2),
    delay: between(0, 0.12),
  };
}

const launchBurst = () =>
  Array.from({ length: PIECE_COUNT }, (_, index) => launchPiece(index));

/** A single burst of paper confetti from Pako's box, played once on mount. */
export default function Confetti() {
  const reduced = useReducedMotion();
  const [pieces] = useState(launchBurst);
  if (reduced) return null;
  return (
    <div className="ob-confetti" aria-hidden="true">
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} />
      ))}
    </div>
  );
}

/** Rises against gravity, then falls, spins and flutters while it fades. */
function ConfettiPiece({ piece }: { piece: Piece }) {
  const { duration, delay } = piece;
  return (
    <motion.span
      className={`ob-confetti-piece ${piece.shape}`}
      style={{ backgroundColor: piece.color }}
      initial={{ x: 0, y: 0, rotate: 0, scale: 0.3, opacity: 1 }}
      animate={{
        x: piece.driftX,
        y: [0, piece.peakY, piece.landY],
        rotate: piece.spin,
        scale: 1,
        scaleY: [1, 0.35, 1, 0.35, 1],
        opacity: [1, 1, 0],
      }}
      transition={{
        x: { duration, delay, ease: [0.22, 0.8, 0.36, 1] },
        y: {
          duration,
          delay,
          times: [0, 0.3, 1],
          ease: ["easeOut", "easeIn"],
        },
        rotate: { duration, delay, ease: "linear" },
        scale: { duration: 0.25, delay, ease: "easeOut" },
        scaleY: { duration, delay, ease: "linear" },
        opacity: { duration, delay, times: [0, 0.72, 1] },
      }}
    />
  );
}
