import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PakoMood } from "./storyTypes";
import "./pako.css";

/** The middle of the box opening, as a fraction of Pako's drawn size. */
export const PAKO_OPENING = { x: 0.5, y: 0.37 } as const;

type Side = "left" | "right";
type Point = { x: number; y: number };

/* Pako is drawn on a 200 × 200 grid; every rotation and squash turns around a point of it. */
const FEET: Point = { x: 100, y: 176 };
const SHADOW: Point = { x: 100, y: 189 };
const EYE_LINE: Point = { x: 100, y: 124 };
const BACK_HINGE: Point = { x: 100, y: 66 };
const EYES: Record<Side, Point> = {
  left: { x: 78, y: 124 },
  right: { x: 122, y: 124 },
};
const FLAP_HINGES: Record<Side, Point> = {
  left: { x: 46, y: 74 },
  right: { x: 154, y: 74 },
};
const FLAP_POINTS: Record<Side, string> = {
  left: "40,82 52,66 26,54 14,70",
  right: "160,82 148,66 174,54 186,70",
};
/** Rotating by this sign lifts a flap like a raised arm. */
const LIFT: Record<Side, number> = { left: 1, right: -1 };
const SIDES: Side[] = ["left", "right"];

/* Every mouth has the same commands, so one morphs into the next. */
const MOUTHS = {
  smile: "M91 141 Q100 149 109 141 Q100 144.5 91 141 Z",
  open: "M90 139.5 Q100 157 110 139.5 Q100 142.5 90 139.5 Z",
  frown: "M92 146 Q100 137.5 108 146 Q100 142 92 146 Z",
  round: "M95 142 Q100 134 105 142 Q100 150 95 142 Z",
  flat: "M93 143.5 Q100 146 107 143.5 Q100 145 93 143.5 Z",
};
type Mouth = keyof typeof MOUTHS;
type EyeSet = "open" | "happy" | "heart" | "spiral" | "closed";
const EYE_SETS: EyeSet[] = ["open", "happy", "heart", "spiral", "closed"];
type Extra =
  "thought" | "magnifier" | "hearts" | "sigh" | "stars" | "trail" | "zzz";

const pivot = ({ x, y }: Point) => ({
  transformBox: "view-box" as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

const SETTLE: Transition = { type: "spring", stiffness: 260, damping: 22 };
const POP: Transition = { type: "spring", stiffness: 420, damping: 24 };
const forever = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  repeat: Infinity,
  ease: "easeInOut",
});
const lift = (side: Side, degrees: number) => degrees * LIFT[side];

/** Crouch, take off, stretch in the air, land with a squash. */
const HOP_TIMES = [0, 0.16, 0.46, 0.8, 1];
const hopTiming = (repeat: boolean): Transition => ({
  duration: 0.72,
  times: HOP_TIMES,
  ease: ["easeOut", "easeOut", "easeIn", "easeOut"],
  ...(repeat ? { repeat: Infinity, repeatDelay: 0.14 } : {}),
});
const hop = (height: number, repeat: boolean): TargetAndTransition => ({
  y: [0, 0, height, 0, 0],
  transition: hopTiming(repeat),
});
const hopSquash = (strength: number, repeat: boolean): TargetAndTransition => {
  const shape = (amounts: number[]) =>
    amounts.map((amount) => 1 + amount * strength);
  return {
    scaleX: shape([0, 0.07, -0.05, 0.06, 0]),
    scaleY: shape([0, -0.1, 0.07, -0.08, 0]),
    transition: hopTiming(repeat),
  };
};
/** The ground shadow shrinks while Pako is in the air. */
const hopShadow = (airborne: number, repeat: boolean): TargetAndTransition => ({
  scaleX: [1, 1.05, airborne, 1.05, 1],
  scaleY: [1, 1, airborne, 1, 1],
  transition: hopTiming(repeat),
});

/** One delivery flight: take off, hover twice on beating flaps, land with a squash, rest. */
export const PAKO_FLIGHT_MS = 2400;
const DELIVER: Transition = {
  duration: PAKO_FLIGHT_MS / 1000,
  times: [0, 0.16, 0.32, 0.48, 0.64, 0.84, 1],
  repeat: Infinity,
  ease: "easeInOut",
};

const REST = {
  body: { y: 0, transition: SETTLE },
  scale: { scaleX: 1, scaleY: 1, transition: SETTLE },
  rotate: { rotate: 0, transition: SETTLE },
  gaze: { x: 0, y: 0, transition: SETTLE },
} satisfies Record<string, TargetAndTransition>;

const BREATHE: TargetAndTransition = {
  scaleX: [1, 0.993, 1],
  scaleY: [1, 1.022, 1],
  transition: forever(2.8),
};
const BLINK: TargetAndTransition = {
  scaleY: [1, 1, 0.08, 1, 1],
  transition: { ...forever(3.6), times: [0, 0.9, 0.93, 0.96, 1] },
};
const BACK_SWAY: TargetAndTransition = {
  rotate: [0, -1.5, 0],
  transition: forever(3),
};
const flapSway = (side: Side): TargetAndTransition => ({
  rotate: [0, lift(side, 2.5), 0],
  transition: forever(side === "left" ? 3.2 : 3.6),
});

/** How one mood moves every part of Pako; parts left out rest. */
type Choreography = {
  /** Travel of the whole box: hops and hovering. */
  body?: TargetAndTransition;
  squash?: TargetAndTransition;
  shadow?: TargetAndTransition;
  /** Tilt of the box on its feet. */
  lean?: TargetAndTransition;
  breathe?: TargetAndTransition;
  /** Resting angle of both flaps in degrees of lift; below zero they droop. */
  raise?: number;
  flap?: (side: Side) => TargetAndTransition | undefined;
  gaze?: TargetAndTransition;
  eyes?: EyeSet;
  /** Happy eyes show for a moment, then the open eyes return. */
  eyeFlash?: boolean;
  brows?: boolean;
  mouth?: Mouth;
  extra?: Extra;
  /** The pose shown instead of the loops when motion is reduced, where the first frame does not tell the mood. */
  rest?: Partial<Record<"body" | "shadow", TargetAndTransition>> & {
    raise?: number;
  };
};

const CHOREOGRAPHY: Record<PakoMood, Choreography> = {
  idle: {},
  wave: {
    flap: (side) =>
      side === "right"
        ? {
            rotate: [
              null,
              lift(side, 40),
              lift(side, 18),
              lift(side, 40),
              lift(side, 18),
              lift(side, 40),
              0,
            ],
            transition: { duration: 1.7, delay: 0.15, ease: "easeInOut" },
          }
        : undefined,
  },
  happy: {
    body: hop(-13, false),
    squash: hopSquash(0.7, false),
    shadow: hopShadow(0.78, false),
    flap: (side) => ({
      rotate: [null, lift(side, 24), 0],
      transition: { duration: 0.6, ease: "easeOut" },
    }),
    eyeFlash: true,
  },
  work: {
    flap: (side) => ({
      rotate: [0, lift(side, 9), 0],
      transition: forever(0.5, side === "right" ? 0.25 : 0),
    }),
    gaze: {
      x: [0, -4.5, -4.5, 4.5, 4.5, 0],
      y: 0,
      transition: {
        x: { ...forever(1.6), times: [0, 0.14, 0.4, 0.54, 0.86, 1] },
        y: SETTLE,
      },
    },
  },
  cheer: {
    body: hop(-20, true),
    squash: hopSquash(1, true),
    shadow: hopShadow(0.66, true),
    raise: 22,
    flap: (side) => ({
      rotate: [0, lift(side, 16), 0],
      transition: forever(0.36),
    }),
    eyes: "happy",
    mouth: "open",
  },
  listen: {
    lean: { rotate: [4, 6, 4], transition: forever(2.2) },
    gaze: { x: 4, y: 1.5, transition: SETTLE },
    flap: (side) =>
      side === "right"
        ? {
            rotate: [0, lift(side, 18), lift(side, 4), lift(side, 14), 0],
            transition: {
              duration: 0.7,
              repeat: Infinity,
              repeatDelay: 1.6,
              ease: "easeInOut",
            },
          }
        : undefined,
  },
  think: {
    lean: { rotate: -3, transition: SETTLE },
    gaze: { x: -3.5, y: -3.5, transition: SETTLE },
    flap: (side) =>
      side === "left"
        ? {
            rotate: [lift(side, 4), lift(side, 12), lift(side, 4)],
            transition: forever(0.9),
          }
        : undefined,
    mouth: "flat",
    extra: "thought",
  },
  search: {
    squash: { scaleX: 1.01, scaleY: 0.97, transition: SETTLE },
    raise: 8,
    gaze: {
      x: [-3, 3, -3],
      y: -3.5,
      transition: { x: forever(1.7, 0.3), y: SETTLE },
    },
    mouth: "round",
    extra: "magnifier",
  },
  love: {
    lean: { rotate: [-2.5, 2.5, -2.5], transition: forever(1.8) },
    eyes: "heart",
    mouth: "open",
    extra: "hearts",
  },
  sad: {
    squash: { scaleX: 1.02, scaleY: 0.965, transition: SETTLE },
    lean: { rotate: [-2, 2, -2], transition: forever(3.4) },
    raise: -16,
    gaze: { x: 0, y: 2.5, transition: SETTLE },
    brows: true,
    mouth: "frown",
    extra: "sigh",
  },
  dizzy: {
    lean: { rotate: [-7, 7, -7], transition: forever(1.3) },
    flap: (side) => ({
      rotate: [0, lift(side, -12), lift(side, 10), 0],
      transition: forever(1.3, side === "right" ? 0.2 : 0),
    }),
    eyes: "spiral",
    mouth: "round",
    extra: "stars",
  },
  deliver: {
    body: { y: [0, -22, -16, -22, -16, 0, 0], transition: DELIVER },
    squash: {
      scaleX: [1, 0.98, 1, 0.98, 1, 1.06, 1],
      scaleY: [1, 1.04, 1, 1.04, 1, 0.92, 1],
      transition: DELIVER,
    },
    shadow: {
      scaleX: [1, 0.7, 0.76, 0.7, 0.76, 1, 1],
      scaleY: [1, 0.7, 0.76, 0.7, 0.76, 1, 1],
      transition: DELIVER,
    },
    flap: (side) => ({
      rotate: [lift(side, -4), lift(side, 32), lift(side, -4)],
      transition: forever(0.24),
    }),
    eyes: "happy",
    mouth: "open",
    extra: "trail",
    rest: {
      body: { y: -14, transition: SETTLE },
      shadow: { scaleX: 0.76, scaleY: 0.76, transition: SETTLE },
      raise: 26,
    },
  },
  sleep: {
    breathe: {
      scaleX: [1, 0.985, 1],
      scaleY: [1, 1.045, 1],
      transition: forever(4.2),
    },
    lean: { rotate: 3, transition: SETTLE },
    raise: -8,
    eyes: "closed",
    mouth: "round",
    extra: "zzz",
  },
};

/** The first frame of a loop as a still pose, for reduced motion. */
function firstFrame(target: TargetAndTransition): TargetAndTransition {
  const pose = Object.fromEntries(
    Object.entries(target)
      .filter(([key]) => key !== "transition")
      .map(([key, value]) => [
        key,
        Array.isArray(value)
          ? (value.find((frame) => frame !== null) ?? 0)
          : value,
      ]),
  );
  return { ...pose, transition: SETTLE };
}

const motionFor = (
  target: TargetAndTransition | undefined,
  rest: TargetAndTransition,
  reduced: boolean,
) => (target ? (reduced ? firstFrame(target) : target) : rest);

function eyeVisibility(
  set: EyeSet,
  shown: EyeSet,
  flash: boolean,
): TargetAndTransition {
  if (flash && (set === "open" || set === "happy"))
    return {
      opacity: set === "happy" ? [0, 1, 1, 0] : [1, 0, 0, 1],
      transition: { duration: 1.3, times: [0, 0.12, 0.78, 1] },
    };
  return { opacity: set === shown ? 1 : 0, transition: { duration: 0.15 } };
}

function mouthTarget(mouth: Mouth, talking: boolean): TargetAndTransition {
  if (talking)
    return {
      d: [MOUTHS.smile, MOUTHS.open, MOUTHS.smile],
      transition: forever(0.28),
    };
  return { d: MOUTHS[mouth], transition: { duration: 0.18 } };
}

function heartPath({ x, y }: Point, scale: number) {
  const at = (dx: number, dy: number) => `${x + dx * scale} ${y + dy * scale}`;
  return `M${at(0, 7)} C${at(-9, 0)} ${at(-8, -9)} ${at(0, -4.5)} C${at(8, -9)} ${at(9, 0)} ${at(0, 7)} Z`;
}

function Feet() {
  return (
    <g>
      <rect
        className="ob-pako-foot"
        x="66"
        y="168"
        width="22"
        height="16"
        rx="7"
      />
      <rect
        className="ob-pako-foot"
        x="112"
        y="168"
        width="22"
        height="16"
        rx="7"
      />
    </g>
  );
}

function BackFlap({ moving }: { moving: boolean }) {
  return (
    <motion.polygon
      className="ob-pako-back"
      points="56,66 144,66 138,42 62,42"
      style={pivot(BACK_HINGE)}
      animate={moving ? BACK_SWAY : undefined}
    />
  );
}

function Opening() {
  return (
    <g>
      <polygon className="ob-pako-opening" points="40,82 52,66 148,66 160,82" />
      <polygon className="ob-pako-wall" points="52,66 148,66 145,74 55,74" />
    </g>
  );
}

function Flap({
  side,
  choreography,
  moving,
  reduced,
}: {
  side: Side;
  choreography: Choreography;
  moving: boolean;
  reduced: boolean;
}) {
  const origin = pivot(FLAP_HINGES[side]);
  const raise =
    (reduced ? choreography.rest?.raise : undefined) ?? choreography.raise ?? 0;
  return (
    <motion.g
      style={origin}
      animate={{ rotate: lift(side, raise), transition: SETTLE }}
    >
      <motion.g
        style={origin}
        animate={motionFor(choreography.flap?.(side), REST.rotate, reduced)}
      >
        <motion.polygon
          className="ob-pako-flap"
          points={FLAP_POINTS[side]}
          style={origin}
          animate={moving ? flapSway(side) : undefined}
        />
      </motion.g>
    </motion.g>
  );
}

function FrontFace() {
  return (
    <g>
      <path
        className="ob-pako-front"
        d="M40 82 H160 V166 Q160 176 150 176 H50 Q40 176 40 166 Z"
      />
      <rect className="ob-pako-rim" x="40" y="82" width="120" height="5" />
      <path
        className="ob-pako-base"
        d="M40 162 H160 V166 Q160 176 150 176 H50 Q40 176 40 166 Z"
      />
      <path
        className="ob-pako-tape"
        d="M89 82 H111 V104 L107.5 108 L104 104 L100 108 L96 104 L92.5 108 L89 104 Z"
      />
      <rect className="ob-pako-shine" x="92" y="82" width="3" height="20" />
      <rect
        className="ob-pako-label"
        x="122"
        y="150"
        width="26"
        height="17"
        rx="2.5"
      />
      <rect
        className="ob-pako-label-line"
        x="126"
        y="154.5"
        width="14"
        height="2.4"
        rx="1.2"
      />
      <rect
        className="ob-pako-label-line"
        x="126"
        y="159.5"
        width="9"
        height="2.4"
        rx="1.2"
      />
    </g>
  );
}

function OpenEyes() {
  return (
    <g>
      <ellipse className="ob-pako-eye" cx="78" cy="124" rx="7" ry="8.5" />
      <ellipse className="ob-pako-eye" cx="122" cy="124" rx="7" ry="8.5" />
      <circle className="ob-pako-glint" cx="80.6" cy="120.6" r="2.5" />
      <circle className="ob-pako-glint" cx="124.6" cy="120.6" r="2.5" />
    </g>
  );
}

function HappyEyes() {
  return (
    <g>
      <path className="ob-pako-line" d="M70.5 126 Q78 116.5 85.5 126" />
      <path className="ob-pako-line" d="M114.5 126 Q122 116.5 129.5 126" />
    </g>
  );
}

function ClosedEyes() {
  return (
    <g>
      <path className="ob-pako-line" d="M70.5 122 Q78 130 85.5 122" />
      <path className="ob-pako-line" d="M114.5 122 Q122 130 129.5 122" />
    </g>
  );
}

function HeartEyes({ playing }: { playing: boolean }) {
  return (
    <g>
      {SIDES.map((side) => (
        <motion.g
          key={side}
          style={pivot(EYES[side])}
          animate={
            !playing
              ? undefined
              : { scale: [1, 1.18, 1], transition: forever(0.7) }
          }
        >
          <path className="ob-pako-heart" d={heartPath(EYES[side], 1.3)} />
          <circle
            className="ob-pako-glint"
            cx={EYES[side].x - 4}
            cy={EYES[side].y - 3.5}
            r="1.8"
          />
        </motion.g>
      ))}
    </g>
  );
}

/** Half circles that grow around the eye; their middle sits 0.9 to the right. */
function SpiralEyes({ playing }: { playing: boolean }) {
  return (
    <g>
      {SIDES.map((side) => {
        const { x, y } = EYES[side];
        return (
          <motion.path
            key={side}
            className="ob-pako-line ob-pako-spiral"
            d={`M${x} ${y} a1.8 1.8 0 0 1 3.6 0 a3.6 3.6 0 0 1 -7.2 0 a5.4 5.4 0 0 1 10.8 0 a7.2 7.2 0 0 1 -14.4 0`}
            style={pivot({ x: x + 0.9, y })}
            animate={
              !playing
                ? undefined
                : {
                    rotate: 360,
                    transition: {
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }
            }
          />
        );
      })}
    </g>
  );
}

function Brows({ shown }: { shown: boolean }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: shown ? 1 : 0, transition: { duration: 0.2 } }}
    >
      <path className="ob-pako-line ob-pako-brow" d="M69 110 L85 104.5" />
      <path className="ob-pako-line ob-pako-brow" d="M115 104.5 L131 110" />
    </motion.g>
  );
}

function Face({
  choreography,
  talking,
  moving,
  reduced,
}: {
  choreography: Choreography;
  talking: boolean;
  moving: boolean;
  reduced: boolean;
}) {
  const shown = choreography.eyes ?? "open";
  const eyes = {
    open: (
      <motion.g style={pivot(EYE_LINE)} animate={moving ? BLINK : undefined}>
        <OpenEyes />
      </motion.g>
    ),
    happy: <HappyEyes />,
    heart: <HeartEyes playing={moving && shown === "heart"} />,
    spiral: <SpiralEyes playing={moving && shown === "spiral"} />,
    closed: <ClosedEyes />,
  } satisfies Record<EyeSet, ReactNode>;
  return (
    <g>
      <motion.g animate={motionFor(choreography.gaze, REST.gaze, reduced)}>
        {EYE_SETS.map((set) => (
          <motion.g
            key={set}
            initial={{ opacity: set === "open" ? 1 : 0 }}
            animate={eyeVisibility(set, shown, Boolean(choreography.eyeFlash))}
          >
            {eyes[set]}
          </motion.g>
        ))}
      </motion.g>
      <Brows shown={Boolean(choreography.brows)} />
      <ellipse className="ob-pako-cheek" cx="63" cy="139" rx="8" ry="4.5" />
      <ellipse className="ob-pako-cheek" cx="137" cy="139" rx="8" ry="4.5" />
      <motion.path
        className="ob-pako-mouth"
        initial={{ d: MOUTHS.smile }}
        animate={mouthTarget(choreography.mouth ?? "smile", talking)}
      />
    </g>
  );
}

/** A thought cloud above his head; three dots light up in turn. */
function ThoughtBubble({ reduced }: { reduced: boolean }) {
  return (
    <motion.g
      style={pivot({ x: 112, y: 40 })}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1, transition: POP }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
    >
      <circle className="ob-pako-cloud" cx="112" cy="40" r="3" />
      <circle className="ob-pako-cloud" cx="120" cy="31" r="4.5" />
      <rect
        className="ob-pako-cloud"
        x="126"
        y="5"
        width="58"
        height="28"
        rx="14"
      />
      {[141, 155, 169].map((x, index) => (
        <motion.circle
          key={x}
          className="ob-pako-dot"
          cx={x}
          cy="19"
          r="3.6"
          style={pivot({ x, y: 19 })}
          animate={
            reduced
              ? undefined
              : {
                  opacity: [0.3, 1, 0.3],
                  scale: [0.85, 1.2, 0.85],
                  transition: forever(1.2, index * 0.2),
                }
          }
        />
      ))}
    </motion.g>
  );
}

/** A magnifier rises out of the box and sweeps the room. */
function Magnifier({ reduced }: { reduced: boolean }) {
  return (
    <motion.g
      initial={{ y: 52 }}
      animate={{ y: 0, transition: POP }}
      exit={{ y: 52, transition: { duration: 0.2 } }}
    >
      <motion.g
        style={pivot({ x: 100, y: 80 })}
        animate={
          reduced
            ? { rotate: -12 }
            : { rotate: [-20, 20, -20], transition: forever(1.7, 0.3) }
        }
      >
        <rect
          className="ob-pako-handle"
          x="95"
          y="50"
          width="10"
          height="34"
          rx="5"
        />
        <rect
          className="ob-pako-collar"
          x="93"
          y="45"
          width="14"
          height="8"
          rx="3"
        />
        <circle className="ob-pako-lens" cx="100" cy="30" r="15.5" />
        <path className="ob-pako-lens-glint" d="M91 26 Q93 20.5 98.5 19" />
      </motion.g>
    </motion.g>
  );
}

const RISING_HEARTS = [
  { drift: -26, delay: 0 },
  { drift: 6, delay: 0.6 },
  { drift: 28, delay: 1.2 },
];

/** Small hearts float up out of the box. */
function RisingHearts({ reduced }: { reduced: boolean }) {
  const start: Point = { x: 100, y: 72 };
  return (
    <motion.g exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      {RISING_HEARTS.map(({ drift, delay }, index) => (
        <motion.path
          key={drift}
          className="ob-pako-heart"
          d={heartPath(start, 1.05)}
          style={pivot(start)}
          initial={{ opacity: 0 }}
          animate={
            reduced
              ? { opacity: 1, x: drift * 0.8, y: -34 - index * 10 }
              : {
                  opacity: [0, 1, 1, 0],
                  x: [0, drift * 0.35, drift * 0.75, drift],
                  y: [0, -24, -48, -68],
                  scale: [0.5, 1, 1, 0.9],
                  transition: {
                    duration: 1.8,
                    delay,
                    times: [0, 0.2, 0.75, 1],
                    repeat: Infinity,
                    ease: "easeOut",
                  },
                }
          }
        />
      ))}
    </motion.g>
  );
}

/** A small puff drifts away from the mouth. */
function SighPuff({ reduced }: { reduced: boolean }) {
  return (
    <motion.g
      style={pivot({ x: 124, y: 145 })}
      initial={{ opacity: 0 }}
      animate={
        reduced
          ? { opacity: 0.9, x: 14, y: -6 }
          : {
              opacity: [0, 0.95, 0],
              x: [0, 14, 26],
              y: [0, -4, -9],
              scale: [0.35, 1, 1.15],
              transition: {
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: "easeOut",
              },
            }
      }
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <circle className="ob-pako-puff" cx="118" cy="146" r="4.5" />
      <circle className="ob-pako-puff" cx="125" cy="143" r="5.5" />
      <circle className="ob-pako-puff" cx="131.5" cy="147" r="4" />
    </motion.g>
  );
}

/** Twelve points on a flat ellipse above the head; each star starts a third further on. */
const ORBIT = Array.from({ length: 13 }, (_, index) => {
  const angle = ((index % 12) / 12) * Math.PI * 2;
  return {
    x: 40 * Math.cos(angle),
    y: 8 * Math.sin(angle),
    scale: 1 + 0.25 * Math.sin(angle),
  };
});
const orbitFrom = (offset: number) =>
  Array.from({ length: 13 }, (_, index) => ORBIT[(index + offset) % 12]);

function CirclingStars({ reduced }: { reduced: boolean }) {
  return (
    <motion.g exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      {[0, 4, 8].map((offset) => {
        const path = orbitFrom(offset);
        return (
          <motion.path
            key={offset}
            className="ob-pako-star"
            d="M100 23 L102 28 L107 30 L102 32 L100 37 L98 32 L93 30 L98 28 Z"
            style={pivot({ x: 100, y: 30 })}
            initial={{ x: path[0].x, y: path[0].y }}
            animate={
              reduced
                ? { x: path[0].x, y: path[0].y }
                : {
                    x: path.map((point) => point.x),
                    y: path.map((point) => point.y),
                    scale: path.map((point) => point.scale),
                    transition: {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }
            }
          />
        );
      })}
    </motion.g>
  );
}

/** Air pushed down by the beating flaps while Pako hovers. */
function SpeedTrail({ reduced }: { reduced: boolean }) {
  return (
    <motion.g exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      {[78, 100, 122].map((x, index) => (
        <motion.line
          key={x}
          className="ob-pako-trail"
          x1={x}
          y1="189"
          x2={x}
          y2="199"
          initial={{ opacity: 0 }}
          animate={
            reduced
              ? { opacity: 0.7 }
              : {
                  opacity: [0, 0, 0.75, 0.75, 0, 0],
                  y: [0, 0, 3, 6, 9, 9],
                  transition: {
                    ...DELIVER,
                    times: [0, 0.14, 0.3, 0.68, 0.84, 1],
                    delay: index * 0.05,
                    ease: "linear",
                  },
                }
          }
        />
      ))}
    </motion.g>
  );
}

const SNOOZE = [0.7, 0.9, 1.1];

/** Little z's drift up while he sleeps. */
function Snooze({ reduced }: { reduced: boolean }) {
  return (
    <motion.g exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      {SNOOZE.map((scale, index) => (
        <motion.path
          key={scale}
          className="ob-pako-line ob-pako-z"
          d="M136 50 h9 l-9 9 h9"
          style={pivot({ x: 140.5, y: 54.5 })}
          initial={{ opacity: 0 }}
          animate={
            reduced
              ? { opacity: 1, x: index * 12, y: -index * 16, scale }
              : {
                  opacity: [0, 1, 1, 0],
                  x: [0, 8, 16, 24],
                  y: [0, -14, -30, -44],
                  scale: [scale * 0.6, scale, scale, scale * 1.1],
                  rotate: [0, -8, 6, -4],
                  transition: {
                    duration: 3,
                    delay: index,
                    times: [0, 0.2, 0.7, 1],
                    repeat: Infinity,
                    ease: "easeOut",
                  },
                }
          }
        />
      ))}
    </motion.g>
  );
}

/** Where an extra sits: under the box, coming out of it, or in front of Pako. */
const EXTRAS: Record<
  Extra,
  {
    layer: "under" | "inside" | "over";
    Part: ComponentType<{ reduced: boolean }>;
  }
> = {
  trail: { layer: "under", Part: SpeedTrail },
  magnifier: { layer: "inside", Part: Magnifier },
  hearts: { layer: "inside", Part: RisingHearts },
  thought: { layer: "over", Part: ThoughtBubble },
  sigh: { layer: "over", Part: SighPuff },
  stars: { layer: "over", Part: CirclingStars },
  zzz: { layer: "over", Part: Snooze },
};

function Extras({
  extra,
  layer,
  reduced,
}: {
  extra: Extra | undefined;
  layer: "under" | "inside" | "over";
  reduced: boolean;
}) {
  const shown = extra && EXTRAS[extra].layer === layer ? extra : undefined;
  const Part = shown && EXTRAS[shown].Part;
  return (
    <AnimatePresence>
      {Part && <Part key={shown} reduced={reduced} />}
    </AnimatePresence>
  );
}

/** Pako, the moving box that guides the intro and works as the agent. Purely decorative. */
export default function Pako({
  mood,
  size,
  talking = false,
  still = false,
  className,
}: {
  mood: PakoMood;
  size: number;
  talking?: boolean;
  /** Rests without breathing or blinking, e.g. beside earlier chat turns. */
  still?: boolean;
  className?: string;
}) {
  const reduced = Boolean(useReducedMotion());
  const choreography = CHOREOGRAPHY[still ? "idle" : mood];
  const moving = !still && !reduced;
  const rest = reduced ? choreography.rest : undefined;
  return (
    <MotionConfig reducedMotion="user">
      <svg
        className={cn("ob-pako", className)}
        width={size}
        height={size}
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
      >
        <motion.ellipse
          className="ob-pako-shadow"
          cx="100"
          cy="189"
          rx="46"
          ry="6"
          style={pivot(SHADOW)}
          animate={
            rest?.shadow ?? motionFor(choreography.shadow, REST.scale, reduced)
          }
        />
        <motion.g
          animate={
            rest?.body ?? motionFor(choreography.body, REST.body, reduced)
          }
        >
          <Extras extra={choreography.extra} layer="under" reduced={reduced} />
          <Feet />
          <motion.g
            style={pivot(FEET)}
            animate={motionFor(choreography.lean, REST.rotate, reduced)}
          >
            <motion.g
              style={pivot(FEET)}
              animate={motionFor(choreography.squash, REST.scale, reduced)}
            >
              <motion.g
                style={pivot(FEET)}
                animate={moving ? (choreography.breathe ?? BREATHE) : undefined}
              >
                <BackFlap moving={moving} />
                <Opening />
                <Extras
                  extra={choreography.extra}
                  layer="inside"
                  reduced={reduced}
                />
                {SIDES.map((side) => (
                  <Flap
                    key={side}
                    side={side}
                    choreography={choreography}
                    moving={moving}
                    reduced={reduced}
                  />
                ))}
                <FrontFace />
                <Face
                  choreography={choreography}
                  talking={talking && moving}
                  moving={moving}
                  reduced={reduced}
                />
                <Extras
                  extra={choreography.extra}
                  layer="over"
                  reduced={reduced}
                />
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.g>
      </svg>
    </MotionConfig>
  );
}
