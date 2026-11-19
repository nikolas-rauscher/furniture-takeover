import {
  MotionConfig,
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
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

const CLOSED_MOUTH = "M91 141 Q100 149 109 141 Q100 144.5 91 141 Z";
const OPEN_MOUTH = "M90 139.5 Q100 157 110 139.5 Q100 142.5 90 139.5 Z";

const pivot = ({ x, y }: Point) => ({
  transformBox: "view-box" as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

const SETTLE: Transition = { type: "spring", stiffness: 260, damping: 22 };
const forever = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  repeat: Infinity,
  ease: "easeInOut",
});

/** Crouch, take off, stretch in the air, land with a squash. */
const HOP_TIMES = [0, 0.16, 0.46, 0.8, 1];
const hopTiming = (repeat: boolean): Transition => ({
  duration: 0.72,
  times: HOP_TIMES,
  ease: ["easeOut", "easeOut", "easeIn", "easeOut"],
  ...(repeat ? { repeat: Infinity, repeatDelay: 0.14 } : {}),
});
const hopping = (mood: PakoMood) => mood === "cheer" || mood === "happy";

function hopTarget(mood: PakoMood): TargetAndTransition {
  if (!hopping(mood)) return { y: 0, transition: SETTLE };
  const height = mood === "cheer" ? -20 : -13;
  return {
    y: [0, 0, height, 0, 0],
    transition: hopTiming(mood === "cheer"),
  };
}

function squashTarget(mood: PakoMood): TargetAndTransition {
  if (!hopping(mood)) return { scaleX: 1, scaleY: 1, transition: SETTLE };
  const strength = mood === "cheer" ? 1 : 0.7;
  const shape = (amounts: number[]) =>
    amounts.map((amount) => 1 + amount * strength);
  return {
    scaleX: shape([0, 0.07, -0.05, 0.06, 0]),
    scaleY: shape([0, -0.1, 0.07, -0.08, 0]),
    transition: hopTiming(mood === "cheer"),
  };
}

/** The ground shadow shrinks while Pako is in the air. */
function shadowTarget(mood: PakoMood): TargetAndTransition {
  if (!hopping(mood)) return { scaleX: 1, scaleY: 1, transition: SETTLE };
  const airborne = mood === "cheer" ? 0.66 : 0.78;
  return {
    scaleX: [1, 1.05, airborne, 1.05, 1],
    scaleY: [1, 1, airborne, 1, 1],
    transition: hopTiming(mood === "cheer"),
  };
}

const BREATHE: TargetAndTransition = {
  scaleX: [1, 0.993, 1],
  scaleY: [1, 1.022, 1],
  transition: forever(2.8),
};

/** Both flaps stay up while cheering; gestures play on top of that pose. */
const flapRaise = (mood: PakoMood, side: Side): TargetAndTransition => ({
  rotate: mood === "cheer" ? 22 * LIFT[side] : 0,
  transition: SETTLE,
});

function flapGesture(mood: PakoMood, side: Side): TargetAndTransition {
  const lift = (degrees: number) => degrees * LIFT[side];
  if (mood === "cheer")
    return { rotate: [0, lift(16), 0], transition: forever(0.36) };
  if (mood === "work")
    return {
      rotate: [0, lift(9), 0],
      transition: forever(0.5, side === "right" ? 0.25 : 0),
    };
  if (mood === "happy")
    return {
      rotate: [null, lift(24), 0],
      transition: { duration: 0.6, ease: "easeOut" },
    };
  if (mood === "wave" && side === "right")
    return {
      rotate: [null, lift(40), lift(18), lift(40), lift(18), lift(40), 0],
      transition: { duration: 1.7, delay: 0.15, ease: "easeInOut" },
    };
  return { rotate: 0, transition: SETTLE };
}

const BACK_SWAY: TargetAndTransition = {
  rotate: [0, -1.5, 0],
  transition: forever(3),
};

const flapSway = (side: Side): TargetAndTransition => ({
  rotate: [0, 2.5 * LIFT[side], 0],
  transition: forever(side === "left" ? 3.2 : 3.6),
});

function eyeScan(mood: PakoMood): TargetAndTransition {
  if (mood !== "work") return { x: 0, transition: SETTLE };
  return {
    x: [0, -4.5, -4.5, 4.5, 4.5, 0],
    transition: {
      ...forever(1.6),
      times: [0, 0.14, 0.4, 0.54, 0.86, 1],
    },
  };
}

const BLINK: TargetAndTransition = {
  scaleY: [1, 1, 0.08, 1, 1],
  transition: { ...forever(3.6), times: [0, 0.9, 0.93, 0.96, 1] },
};

/** Happy eyes replace the open ones while cheering, and briefly after a hop. */
function eyeOpacity(mood: PakoMood, happyEyes: boolean): TargetAndTransition {
  const shown = happyEyes ? 1 : 0;
  if (mood === "cheer")
    return { opacity: shown, transition: { duration: 0.15 } };
  if (mood === "happy")
    return {
      opacity: happyEyes ? [0, 1, 1, 0] : [1, 0, 0, 1],
      transition: { duration: 1.3, times: [0, 0.12, 0.78, 1] },
    };
  return { opacity: 1 - shown, transition: { duration: 0.15 } };
}

function mouthTarget(mood: PakoMood, talking: boolean): TargetAndTransition {
  if (talking)
    return {
      d: [CLOSED_MOUTH, OPEN_MOUTH, CLOSED_MOUTH],
      transition: forever(0.28),
    };
  return {
    d: mood === "cheer" ? OPEN_MOUTH : CLOSED_MOUTH,
    transition: { duration: 0.18 },
  };
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

function BackFlap({ still }: { still: boolean }) {
  return (
    <motion.polygon
      className="ob-pako-back"
      points="56,66 144,66 138,42 62,42"
      style={pivot(BACK_HINGE)}
      animate={still ? undefined : BACK_SWAY}
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
  mood,
  still,
}: {
  side: Side;
  mood: PakoMood;
  still: boolean;
}) {
  const origin = pivot(FLAP_HINGES[side]);
  return (
    <motion.g style={origin} animate={flapRaise(mood, side)}>
      <motion.g style={origin} animate={flapGesture(mood, side)}>
        <motion.polygon
          className="ob-pako-flap"
          points={FLAP_POINTS[side]}
          style={origin}
          animate={still ? undefined : flapSway(side)}
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
      <path className="ob-pako-happy-eye" d="M70.5 126 Q78 116.5 85.5 126" />
      <path className="ob-pako-happy-eye" d="M114.5 126 Q122 116.5 129.5 126" />
    </g>
  );
}

function Face({
  mood,
  talking,
  still,
}: {
  mood: PakoMood;
  talking: boolean;
  still: boolean;
}) {
  return (
    <g>
      <motion.g animate={eyeScan(mood)}>
        <motion.g style={pivot(EYE_LINE)} animate={still ? undefined : BLINK}>
          <motion.g animate={eyeOpacity(mood, false)}>
            <OpenEyes />
          </motion.g>
        </motion.g>
        <motion.g initial={{ opacity: 0 }} animate={eyeOpacity(mood, true)}>
          <HappyEyes />
        </motion.g>
      </motion.g>
      <ellipse className="ob-pako-cheek" cx="63" cy="139" rx="8" ry="4.5" />
      <ellipse className="ob-pako-cheek" cx="137" cy="139" rx="8" ry="4.5" />
      <motion.path
        className="ob-pako-mouth"
        initial={{ d: CLOSED_MOUTH }}
        animate={mouthTarget(mood, talking)}
      />
    </g>
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
  const reduced = useReducedMotion();
  const pose = still ? "idle" : mood;
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
          animate={shadowTarget(pose)}
        />
        <motion.g animate={hopTarget(pose)}>
          <Feet />
          <motion.g style={pivot(FEET)} animate={squashTarget(pose)}>
            <motion.g style={pivot(FEET)} animate={still ? undefined : BREATHE}>
              <BackFlap still={still} />
              <Opening />
              <Flap side="left" mood={pose} still={still} />
              <Flap side="right" mood={pose} still={still} />
              <FrontFace />
              <Face
                mood={pose}
                talking={talking && !reduced && !still}
                still={still}
              />
            </motion.g>
          </motion.g>
        </motion.g>
      </svg>
    </MotionConfig>
  );
}
