import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  LoaderCircle,
  MapPin,
  Sparkles,
  Zap,
} from "@/components/icons";
import { Button } from "../ui/button";
import {
  GUIDE_NAME,
  itemById,
  placeById,
  type Item,
  type ItemId,
} from "./onboardingContent";
import { itemIcons } from "./onboardingIcons";
import type { PakoMood, SceneProps } from "./storyTypes";
import { useTimeline, useTypewriter } from "./useStory";
import "./snap-demo.css";

/** After the shutter the flash peaks, then the photo travels into the listing. */
const AFTER_SHOT_BEATS = [90, 620] as const;
/** A short breath before Pako starts the next field. */
const FIELD_PAUSE_MS = 100;
const PHOTO_TRAVEL = { type: "spring", stiffness: 300, damping: 30 } as const;

const DRAFT_ORDER = [
  "title",
  "price",
  "condition",
  "size",
  "description",
  "pickup",
] as const;
type DraftKey = (typeof DRAFT_ORDER)[number];
type FieldState = "waiting" | "typing" | "done";
type Phase = "camera" | "developing" | "writing" | "review" | "live";

/** Milliseconds per character: short facts type slowly, the description quickly. */
const TYPING_MS: Record<DraftKey, number> = {
  title: 24,
  price: 32,
  condition: 28,
  size: 22,
  description: 10,
  pickup: 22,
};

const MOODS: Record<Phase, PakoMood> = {
  camera: "idle",
  developing: "work",
  writing: "work",
  review: "happy",
  live: "cheer",
};

function draftTexts(
  listing: Item["listing"],
  meetingPoint: string,
): Record<DraftKey, string> {
  return {
    title: listing.title,
    price: `CHF ${listing.price}`,
    condition: listing.condition,
    size: listing.size,
    description: listing.description,
    pickup: meetingPoint,
  };
}

function phaseOf(
  shot: boolean,
  beat: number,
  written: number,
  published: boolean,
): Phase {
  if (!shot) return "camera";
  if (beat < AFTER_SHOT_BEATS.length) return "developing";
  if (written < DRAFT_ORDER.length) return "writing";
  return published ? "live" : "review";
}

function statusText(phase: Phase, thing: string) {
  if (phase === "camera")
    return `Try the example photo of the ${thing}.`;
  if (phase === "review") return "Example draft ready. Check it, then publish.";
  if (phase === "live") return "Example listing published.";
  return `Example photo added. ${GUIDE_NAME} is drafting the listing…`;
}

/** The same snapshot is drawn in the viewfinder and in the listing, so it can travel. */
function Photo({ layoutId, itemId }: { layoutId: string; itemId: ItemId }) {
  const Icon = itemIcons[itemId];
  return (
    <motion.div
      layoutId={layoutId}
      className="ob-snap-photo"
      style={{ borderRadius: 12 }}
      transition={{ layout: PHOTO_TRAVEL }}
      aria-hidden="true"
    >
      <span className="ob-snap-window" />
      <span className="ob-snap-floor" />
      <span className="ob-snap-shadow" />
      <Icon className="ob-snap-item" strokeWidth={1.6} />
    </motion.div>
  );
}

function CameraView({
  photo,
  shot,
  onShoot,
}: {
  photo: ReactNode;
  shot: boolean;
  onShoot: () => void;
}) {
  return (
    <div className="ob-snap-camera">
      <div className="ob-snap-viewfinder">
        <div className="ob-snap-bar" aria-hidden="true">
          <Zap size={15} />
        </div>
        <div className="ob-snap-lens">
          <div className="ob-snap-frame">
            {photo}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <span
                key={corner}
                className={`ob-snap-corner ${corner}`}
                aria-hidden="true"
              />
            ))}
            <motion.span
              className="ob-snap-focus"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 1.35 }}
              animate={{ opacity: [0, 1, 0.5, 1], scale: 1 }}
              transition={{
                scale: {
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                  delay: 0.3,
                },
                opacity: { duration: 0.9, times: [0, 0.3, 0.6, 1], delay: 0.3 },
              }}
            />
          </div>
        </div>
      </div>
      <div className="ob-snap-controls">
        <Button
          className={`ob-snap-shutter${shot ? "" : " ob-tap-hint"}`}
          aria-label="Use example photo"
          disabled={shot}
          onClick={onShoot}
        >
          <span className="ob-snap-shutter-core">
            <Camera size={22} aria-hidden="true" />
          </span>
        </Button>
        <span className="ob-tap-caption" aria-hidden="true">
          Use example photo
        </span>
      </div>
    </div>
  );
}

/** Reserves the finished text's space, so typing never moves the fields below. */
function DraftText({
  field,
  text,
  state,
  onTyped,
}: {
  field: DraftKey;
  text: string;
  state: FieldState;
  onTyped: (field: DraftKey) => void;
}) {
  const { typed, done } = useTypewriter(
    text,
    state !== "waiting",
    TYPING_MS[field],
  );
  useEffect(() => {
    if (state !== "typing" || !done) return;
    const timer = setTimeout(() => onTyped(field), FIELD_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [done, field, onTyped, state]);
  return (
    <span className="ob-snap-field" data-field={field}>
      <span className="ob-snap-ghost" aria-hidden="true">
        {text}
      </span>
      {state === "waiting" ? (
        <span className="ob-snap-skeleton" aria-hidden="true">
          {field === "description" && (
            <>
              <i />
              <i />
              <i />
            </>
          )}
        </span>
      ) : (
        <span className="ob-snap-ink">
          {typed}
          {state === "typing" && (
            <Sparkles
              className="ob-snap-spark"
              size={13}
              animate
              loop
              aria-hidden="true"
            />
          )}
        </span>
      )}
    </span>
  );
}

function Stamp() {
  return (
    <motion.div
      className="ob-snap-stamp"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 1.45, rotate: -15 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{
        type: "spring",
        stiffness: 560,
        damping: 17,
        mass: 0.9,
        opacity: { duration: 0.12 },
      }}
    >
      <Check size={18} strokeWidth={3} animate aria-hidden="true" />
      Published
    </motion.div>
  );
}

function PublishControl({
  phase,
  onPublish,
}: {
  phase: Phase;
  onPublish: () => void;
}) {
  const publishRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  // Keyboard and screen-reader users land on the scene's next control.
  useEffect(() => {
    if (phase === "review") publishRef.current?.focus();
    if (phase === "live") liveRef.current?.focus();
  }, [phase]);
  if (phase === "live")
    return (
      <motion.p
        ref={liveRef}
        tabIndex={-1}
        className="ob-snap-live"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <BadgeCheck size={20} aria-hidden="true" />
        In takeover, publishing shows your listing to other students.
      </motion.p>
    );
  const ready = phase === "review";
  return (
    <Button
      ref={publishRef}
      className={`button primary large ob-snap-publish${ready ? " ob-tap-hint" : ""}`}
      disabled={!ready}
      onClick={onPublish}
    >
      {ready ? (
        "Publish example"
      ) : (
        <>
          <LoaderCircle size={18} animate aria-hidden="true" />
          Drafting the listing…
        </>
      )}
    </Button>
  );
}

function ListingView({
  photo,
  texts,
  written,
  phase,
  onTyped,
  onPublish,
}: {
  photo: ReactNode;
  texts: Record<DraftKey, string>;
  written: number;
  phase: Phase;
  onTyped: (field: DraftKey) => void;
  onPublish: () => void;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  // The shutter disappears with the camera; focus moves on to the draft.
  useEffect(() => {
    regionRef.current?.focus();
  }, []);
  const field = (key: DraftKey) => {
    const index = DRAFT_ORDER.indexOf(key);
    const state: FieldState =
      index < written
        ? "done"
        : index === written && phase === "writing"
          ? "typing"
          : "waiting";
    return (
      <DraftText
        field={key}
        text={texts[key]}
        state={state}
        onTyped={onTyped}
      />
    );
  };
  const reveal = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3, delay },
  });
  return (
    <motion.div
      ref={regionRef}
      tabIndex={-1}
      role="group"
      aria-label="Listing draft"
      className="ob-snap-listing"
      animate={phase === "live" ? { scale: [1, 0.985, 1] } : undefined}
      transition={{ duration: 0.28, delay: 0.08 }}
    >
      <div className="ob-snap-head">
        <div className="ob-snap-thumb">{photo}</div>
        <motion.div className="ob-snap-head-text" {...reveal(0.25)}>
          <p className="ob-snap-title">{field("title")}</p>
          <p className="ob-snap-price">{field("price")}</p>
        </motion.div>
      </div>
      <motion.div className="ob-snap-details" {...reveal(0.32)}>
        <dl className="ob-snap-facts">
          <div>
            <dt>Condition</dt>
            <dd>{field("condition")}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{field("size")}</dd>
          </div>
        </dl>
        <p className="ob-snap-description">{field("description")}</p>
        <dl className="ob-snap-facts">
          <div>
            <dt>Pickup</dt>
            <dd className="ob-snap-pickup">
              <MapPin size={15} aria-hidden="true" />
              {field("pickup")}
            </dd>
          </div>
        </dl>
      </motion.div>
      <div className="ob-snap-footer">
        <PublishControl phase={phase} onPublish={onPublish} />
      </div>
      {phase === "live" && <Stamp />}
    </motion.div>
  );
}

/** "Start with a photo": an example photo becomes a drafted listing the visitor checks and publishes. */
export default function SnapDemo({ answers, onMood, onDone }: SceneProps) {
  const itemId = answers.items[0];
  const { listing } = itemById(itemId);
  const place = placeById(answers.place);
  const reduced = useReducedMotion();
  const photoId = useId();
  const [shot, setShot] = useState(false);
  const beat = useTimeline(AFTER_SHOT_BEATS, shot);
  const [written, setWritten] = useState(0);
  const [published, setPublished] = useState(false);
  const phase = phaseOf(shot, beat, written, published);
  const finishField = useCallback(
    (field: DraftKey) =>
      setWritten((count) => Math.max(count, DRAFT_ORDER.indexOf(field) + 1)),
    [],
  );
  useEffect(() => {
    onMood(MOODS[phase]);
  }, [onMood, phase]);
  function publish() {
    setPublished(true);
    onDone();
  }
  const photo = <Photo layoutId={photoId} itemId={itemId} />;
  const showListing = shot && beat >= 1;
  return (
    <div
      className="ob-stage ob-snap"
      data-view={showListing ? "listing" : "camera"}
    >
      <span className="ob-demo-tag">Example</span>
      {showListing ? (
        <ListingView
          photo={photo}
          texts={draftTexts(listing, place.meetingPoint)}
          written={written}
          phase={phase}
          onTyped={finishField}
          onPublish={publish}
        />
      ) : (
        <CameraView photo={photo} shot={shot} onShoot={() => setShot(true)} />
      )}
      {phase === "developing" && !reduced && (
        <motion.span
          className="ob-snap-flash"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.36, times: [0, 0.25, 1], ease: "easeOut" }}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {statusText(phase, listing.title.toLowerCase())}
      </p>
    </div>
  );
}
